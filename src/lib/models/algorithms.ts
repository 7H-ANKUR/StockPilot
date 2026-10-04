/**
 * Demand Forecasting Algorithms
 *
 * Five model variants, ordered by sophistication:
 *   1. NaiveBaseline — 7-day rolling average × horizon (the minimum bar)
 *   2. RidgeRegression — linear, L2-regularized (closed-form via GD)
 *   3. RandomForest — bootstrap + feature-bagged decision trees
 *   4. GradientBoosting — sequential additive trees fitting residuals
 *   5. LightGBMStyle — histogram-binned gradient boosting (leaf-wise)
 *
 * All models share the same interface:
 *   fit(X, y) → void
 *   predict(x) → number (non-negative)
 */

// ============================================================
// HELPERS
// ============================================================

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function roundNonNeg(n: number): number {
  return Math.max(0, n);
}

// ============================================================
// 1. NAIVE BASELINE
// ============================================================

export class NaiveBaseline {
  private recentAvg = 0;
  private horizonScale = 1;

  fit(X: number[][], y: number[]) {
    // The "prediction" for each horizon is just mean(recent 7 lags) × horizon
    // We approximate this by averaging the first 5 lag features (positions 0-4)
    // and scaling to match y.
    if (X.length === 0) {
      this.recentAvg = 0;
      this.horizonScale = 1;
      return;
    }
    // Use lag_7 (feature index 2) as the recent 7-day mean proxy
    const lag7Vals = X.map(r => r[2] || 0);
    const avgLag = mean(lag7Vals);
    const avgY = mean(y);
    this.recentAvg = avgLag;
    this.horizonScale = avgLag > 0 ? avgY / avgLag : 1;
  }

  predict(x: number[]): number {
    const lag7 = x[2] || 0;
    return roundNonNeg(lag7 * this.horizonScale);
  }
}

// ============================================================
// 2. RIDGE REGRESSION (existing)
// ============================================================

export class RidgeRegression {
  weights: number[] = [];
  bias = 0;
  private nFeatures = 0;
  private _means: number[] = [];
  private _stds: number[] = [];
  private _yMean = 0;

  fit(X: number[][], y: number[], lambda = 1.0, epochs = 200, lr = 0.01) {
    if (X.length === 0) return;
    this.nFeatures = X[0].length;
    this.weights = new Array(this.nFeatures).fill(0);
    this.bias = 0;

    const means = new Array(this.nFeatures).fill(0);
    const stds = new Array(this.nFeatures).fill(1);
    for (let j = 0; j < this.nFeatures; j++) {
      const col = X.map(r => r[j]);
      means[j] = mean(col);
      stds[j] = std(col) || 1;
    }

    const Xn = X.map(r => r.map((v, j) => (v - means[j]) / stds[j]));
    const yMean = mean(y);
    const yc = y.map(v => v - yMean);

    for (let epoch = 0; epoch < epochs; epoch++) {
      const grads = new Array(this.nFeatures).fill(0);
      let gradBias = 0;
      for (let i = 0; i < Xn.length; i++) {
        let pred = this.bias;
        for (let j = 0; j < this.nFeatures; j++) {
          pred += this.weights[j] * Xn[i][j];
        }
        const err = pred - yc[i];
        gradBias += err;
        for (let j = 0; j < this.nFeatures; j++) {
          grads[j] += err * Xn[i][j];
        }
      }
      const m = Xn.length;
      this.bias -= lr * gradBias / m;
      for (let j = 0; j < this.nFeatures; j++) {
        this.weights[j] -= lr * (grads[j] / m + lambda * this.weights[j] / m);
      }
    }

    this._means = means;
    this._stds = stds;
    this._yMean = yMean;
  }

  predict(x: number[]): number {
    let pred = this.bias + this._yMean;
    for (let j = 0; j < x.length; j++) {
      pred += this.weights[j] * ((x[j] - this._means[j]) / this._stds[j]);
    }
    return roundNonNeg(pred);
  }
}

// ============================================================
// 3. RANDOM FOREST (simplified)
// ============================================================

interface TreeNode {
  isLeaf: boolean;
  value?: number;
  feature?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}

export class RandomForest {
  private trees: TreeNode[] = [];
  private nTrees = 8;
  private maxDepth = 5;
  private minSamples = 3;

  fit(X: number[][], y: number[]) {
    this.trees = [];
    if (X.length === 0) return;
    const nFeatures = X[0].length;
    const nSamples = X.length;

    // Use seeded RNG for determinism
    let seed = 42;
    const rng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let t = 0; t < this.nTrees; t++) {
      // Bootstrap sample
      const indices: number[] = [];
      for (let i = 0; i < nSamples; i++) {
        indices.push(Math.floor(rng() * nSamples));
      }
      const Xb = indices.map(i => X[i]);
      const yb = indices.map(i => y[i]);
      // Feature bagging (use ~70% features)
      const featureCount = Math.max(1, Math.floor(nFeatures * 0.7));
      const features: number[] = [];
      const allFeatures = Array.from({ length: nFeatures }, (_, i) => i);
      for (let i = 0; i < featureCount; i++) {
        const idx = Math.floor(rng() * allFeatures.length);
        features.push(allFeatures.splice(idx, 1)[0]);
      }
      this.trees.push(this.buildTree(Xb, yb, features, 0));
    }
  }

  private buildTree(X: number[][], y: number[], features: number[], depth: number): TreeNode {
    if (depth >= this.maxDepth || X.length < this.minSamples || features.length === 0) {
      return { isLeaf: true, value: mean(y) };
    }
    // Find best split
    let bestFeature = -1;
    let bestThreshold = 0;
    let bestSse = Infinity;
    const Xl: number[][] = [];
    const yl: number[] = [];
    const Xr: number[][] = [];
    const yr: number[] = [];

    for (const f of features) {
      const vals = X.map(r => r[f]).sort((a, b) => a - b);
      const thresholds = [vals[Math.floor(vals.length * 0.33)], vals[Math.floor(vals.length * 0.67)]];
      for (const th of thresholds) {
        const ly: number[] = [];
        const ry: number[] = [];
        for (let i = 0; i < X.length; i++) {
          if (X[i][f] <= th) ly.push(y[i]);
          else ry.push(y[i]);
        }
        if (ly.length === 0 || ry.length === 0) continue;
        const sse = ly.length * Math.pow(std(ly), 2) + ry.length * Math.pow(std(ry), 2);
        if (sse < bestSse) {
          bestSse = sse;
          bestFeature = f;
          bestThreshold = th;
        }
      }
    }

    if (bestFeature === -1) {
      return { isLeaf: true, value: mean(y) };
    }

    for (let i = 0; i < X.length; i++) {
      if (X[i][bestFeature] <= bestThreshold) {
        Xl.push(X[i]);
        yl.push(y[i]);
      } else {
        Xr.push(X[i]);
        yr.push(y[i]);
      }
    }

    return {
      isLeaf: false,
      feature: bestFeature,
      threshold: bestThreshold,
      left: this.buildTree(Xl, yl, features, depth + 1),
      right: this.buildTree(Xr, yr, features, depth + 1),
    };
  }

  private predictTree(node: TreeNode, x: number[]): number {
    if (node.isLeaf) return node.value || 0;
    if (x[node.feature!] <= node.threshold!) return this.predictTree(node.left!, x);
    return this.predictTree(node.right!, x);
  }

  predict(x: number[]): number {
    if (this.trees.length === 0) return 0;
    let sum = 0;
    for (const t of this.trees) {
      sum += this.predictTree(t, x);
    }
    return roundNonNeg(sum / this.trees.length);
  }
}

// ============================================================
// 4. GRADIENT BOOSTING (simplified)
// ============================================================

export class GradientBoosting {
  private trees: TreeNode[] = [];
  private initialPred = 0;
  private learningRate = 0.1;
  private nEstimators = 10;
  private maxDepth = 3;

  fit(X: number[][], y: number[]) {
    this.trees = [];
    if (X.length === 0) return;
    this.initialPred = mean(y);
    let seed = 42;
    const rng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    let currentPreds = new Array(y.length).fill(this.initialPred);

    for (let est = 0; est < this.nEstimators; est++) {
      // Compute residuals
      const residuals = y.map((yi, i) => yi - currentPreds[i]);
      // Build a tree to fit residuals
      const tree = this.buildTree(X, residuals, 0, rng);
      this.trees.push(tree);
      // Update predictions
      for (let i = 0; i < X.length; i++) {
        currentPreds[i] += this.learningRate * this.predictTree(tree, X[i]);
      }
    }
  }

  private buildTree(X: number[][], y: number[], depth: number, rng: () => number): TreeNode {
    if (depth >= this.maxDepth || X.length < 3) {
      return { isLeaf: true, value: mean(y) };
    }
    const nFeatures = X[0].length;
    // Random feature subset
    const fIdx = Math.floor(rng() * nFeatures);
    const vals = X.map(r => r[fIdx]).sort((a, b) => a - b);
    const threshold = vals[Math.floor(vals.length * 0.5)];
    const Xl: number[][] = [], yl: number[] = [];
    const Xr: number[][] = [], yr: number[] = [];
    for (let i = 0; i < X.length; i++) {
      if (X[i][fIdx] <= threshold) { Xl.push(X[i]); yl.push(y[i]); }
      else { Xr.push(X[i]); yr.push(y[i]); }
    }
    if (Xl.length === 0 || Xr.length === 0) {
      return { isLeaf: true, value: mean(y) };
    }
    return {
      isLeaf: false,
      feature: fIdx,
      threshold,
      left: this.buildTree(Xl, yl, depth + 1, rng),
      right: this.buildTree(Xr, yr, depth + 1, rng),
    };
  }

  private predictTree(node: TreeNode, x: number[]): number {
    if (node.isLeaf) return node.value || 0;
    if (x[node.feature!] <= node.threshold!) return this.predictTree(node.left!, x);
    return this.predictTree(node.right!, x);
  }

  predict(x: number[]): number {
    let pred = this.initialPred;
    for (const t of this.trees) {
      pred += this.learningRate * this.predictTree(t, x);
    }
    return roundNonNeg(pred);
  }
}

// ============================================================
// 5. LIGHTGBM-STYLE (histogram-binned gradient boosting)
// ============================================================

export class LightGBMStyle {
  private trees: TreeNode[] = [];
  private bins: number[][] = []; // per-feature bin edges
  private initialPred = 0;
  private learningRate = 0.1;
  private nEstimators = 12;
  private maxDepth = 4;
  private nBins = 16;

  fit(X: number[][], y: number[]) {
    this.trees = [];
    if (X.length === 0) return;
    this.initialPred = mean(y);

    // Build histograms per feature
    const nFeatures = X[0].length;
    this.bins = [];
    for (let f = 0; f < nFeatures; f++) {
      const col = X.map(r => r[f]).sort((a, b) => a - b);
      const edges: number[] = [];
      for (let b = 1; b < this.nBins; b++) {
        edges.push(col[Math.floor((col.length * b) / this.nBins)]);
      }
      this.bins.push(edges);
    }

    let seed = 42;
    const rng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    let currentPreds = new Array(y.length).fill(this.initialPred);
    for (let est = 0; est < this.nEstimators; est++) {
      const residuals = y.map((yi, i) => yi - currentPreds[i]);
      // Bin features
      const Xb = X.map(r => r.map((v, f) => this.bin(v, f)));
      const tree = this.buildLeafWise(Xb, residuals, 0, rng);
      this.trees.push(tree);
      for (let i = 0; i < X.length; i++) {
        currentPreds[i] += this.learningRate * this.predictTree(tree, Xb[i]);
      }
    }
  }

  private bin(v: number, f: number): number {
    const edges = this.bins[f];
    let lo = 0, hi = edges.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (v <= edges[mid]) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  }

  private buildLeafWise(X: number[][], y: number[], depth: number, rng: () => number): TreeNode {
    if (depth >= this.maxDepth || X.length < 3) {
      return { isLeaf: true, value: mean(y) };
    }
    const nFeatures = X[0].length;
    // LightGBM-style: pick feature with highest variance reduction
    let bestFeature = 0;
    let bestThreshold = 0;
    let bestGain = -Infinity;
    for (let f = 0; f < nFeatures; f++) {
      // Try a few bin thresholds
      for (let th = 0; th < this.nBins; th += 4) {
        const ly: number[] = [];
        const ry: number[] = [];
        for (let i = 0; i < X.length; i++) {
          if (X[i][f] <= th) ly.push(y[i]);
          else ry.push(y[i]);
        }
        if (ly.length === 0 || ry.length === 0) continue;
        const gain = ly.length * Math.pow(std(ly), 2) + ry.length * Math.pow(std(ry), 2);
        if (-gain > bestGain) {
          bestGain = -gain;
          bestFeature = f;
          bestThreshold = th;
        }
      }
    }
    const Xl: number[][] = [], yl: number[] = [];
    const Xr: number[][] = [], yr: number[] = [];
    for (let i = 0; i < X.length; i++) {
      if (X[i][bestFeature] <= bestThreshold) { Xl.push(X[i]); yl.push(y[i]); }
      else { Xr.push(X[i]); yr.push(y[i]); }
    }
    if (Xl.length === 0 || Xr.length === 0) {
      return { isLeaf: true, value: mean(y) };
    }
    return {
      isLeaf: false,
      feature: bestFeature,
      threshold: bestThreshold,
      left: this.buildLeafWise(Xl, yl, depth + 1, rng),
      right: this.buildLeafWise(Xr, yr, depth + 1, rng),
    };
  }

  private predictTree(node: TreeNode, x: number[]): number {
    if (node.isLeaf) return node.value || 0;
    if (x[node.feature!] <= node.threshold!) return this.predictTree(node.left!, x);
    return this.predictTree(node.right!, x);
  }

  predict(x: number[]): number {
    if (this.trees.length === 0) return this.initialPred;
    // Bin input
    const xb = x.map((v, f) => this.bin(v, f));
    let pred = this.initialPred;
    for (const t of this.trees) {
      pred += this.learningRate * this.predictTree(t, xb);
    }
    return roundNonNeg(pred);
  }
}
