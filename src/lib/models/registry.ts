/**
 * Model Registry — 4 Intelligence Layers
 *
 * ARCHITECTURE (per spec correction):
 *
 *                ┌─────────────────────────┐
 *                │   LLM Orchestration     │  ← sits ABOVE the 4 layers
 *                │   (Agent + 12 Tools)    │
 *                └───────────┬─────────────┘
 *                            │
 *       ┌────────────────────┼────────────────────┐
 *       │                    │                    │
 *       ▼                    ▼                    ▼
 *  ┌──────────┐      ┌──────────────┐      ┌──────────────┐
 *  │ Layer 1  │      │   Layer 2    │      │   Layer 3    │
 *  │ Demand   │      │  Stockout    │      │  Movement    │
 *  │ Forecast │      │  Risk        │      │  ABC-XYZ     │
 *  └──────────┘      └──────────────┘      └──────────────┘
 *
 *       ┌────────────────────┐
 *       │      Layer 4       │
 *       │ Festival Intel     │
 *       └────────────────────┘
 *
 * Layer 1 — Demand Forecasting
 *   Naive → Ridge → RandomForest → GradientBoosting → LightGBM-style
 *   Best model selected by time-aware backtest (lowest MAE that beats baseline)
 *
 * Layer 2 — Stockout Risk
 *   Deterministic Coverage (LeadTimeDemand + SafetyStock) +
 *   ML Classifier (logistic regression on coverage ratio, variability, trend)
 *
 * Layer 3 — Inventory Movement
 *   ABC-XYZ segmentation (sales velocity × demand variability)
 *
 * Layer 4 — Festival Intelligence
 *   Historical uplift + trend + confidence (data-driven, no fabricated trends)
 */

import { db } from '@/lib/db';

// ============================================================
// MODEL REGISTRY
// ============================================================

export type IntelligenceLayer =
  | 'DEMAND_FORECAST'
  | 'STOCKOUT_RISK'
  | 'INVENTORY_MOVEMENT'
  | 'FESTIVAL_INTELLIGENCE';

export interface ModelDescriptor {
  id: string;
  layer: IntelligenceLayer;
  modelName: string;
  variant: string; // e.g., 'naive', 'ridge', 'rf', 'gb', 'lightgbm'
  version: string;
  featureVersion: string;
  description: string;
  status: 'ACTIVE' | 'CANDIDATE' | 'DEPRECATED' | 'BASELINE';
  metrics?: ModelMetrics;
  isSelected?: boolean; // true if this is the currently-selected model for its layer
}

export interface ModelMetrics {
  mae?: number;
  rmse?: number;
  wape?: number;
  baselineMae?: number;
  beatsBaseline?: boolean;
  // Stockout classifier metrics
  precision?: number;
  recall?: number;
  f1?: number;
  // Common
  sampleSize?: number;
  evaluationValid?: boolean; // FALSE if metrics are 0/0/0 (insufficient data)
  evaluationNote?: string;
}

// ============================================================
// LAYER 1: DEMAND FORECASTING (5 model variants)
// ============================================================

export const DEMAND_MODEL_VARIANTS = [
  {
    variant: 'naive',
    modelName: 'NaiveBaseline',
    description: '7-day rolling average × horizon. The minimum bar — every other model must beat this.',
    status: 'BASELINE' as const,
  },
  {
    variant: 'ridge',
    modelName: 'RidgeRegression',
    description: 'Linear regression with L2 regularization. Closed-form via gradient descent on standardized features.',
    status: 'CANDIDATE' as const,
  },
  {
    variant: 'rf',
    modelName: 'RandomForest',
    description: 'Ensemble of decision trees with bootstrap sampling + feature bagging. Averages predictions to reduce variance.',
    status: 'CANDIDATE' as const,
  },
  {
    variant: 'gb',
    modelName: 'GradientBoosting',
    description: 'Sequential additive model. Each tree fits residuals of the previous ensemble. Higher accuracy, more sensitive to hyperparameters.',
    status: 'CANDIDATE' as const,
  },
  {
    variant: 'lightgbm',
    modelName: 'LightGBMStyle',
    description: 'Histogram-based gradient boosting. Leaf-wise growth + binning for speed. Reserved for larger datasets.',
    status: 'CANDIDATE' as const,
  },
];

// ============================================================
// LAYER 2: STOCKOUT RISK
// ============================================================

export const STOCKOUT_MODEL_VARIANTS = [
  {
    variant: 'deterministic',
    modelName: 'DeterministicCoverage',
    description: 'LeadTimeDemand + SafetyStock vs AvailableStock. Hard business rule — never bypassed.',
    status: 'ACTIVE' as const,
  },
  {
    variant: 'ml_classifier',
    modelName: 'StockoutClassifier',
    description: 'Logistic regression on coverage ratio, demand CV, recent trend, days-since-stockout. Adds probability estimate to deterministic flag.',
    status: 'CANDIDATE' as const,
  },
];

// ============================================================
// LAYER 3: INVENTORY MOVEMENT
// ============================================================

export const MOVEMENT_MODEL_VARIANTS = [
  {
    variant: 'abc_xyz',
    modelName: 'ABCXYZSegmentation',
    description: 'ABC (revenue contribution: A/B/C) × XYZ (demand variability: X/Y/Z). 9-cell classification recomputed periodically.',
    status: 'ACTIVE' as const,
  },
];

// ============================================================
// LAYER 4: FESTIVAL INTELLIGENCE
// ============================================================

export const FESTIVAL_MODEL_VARIANTS = [
  {
    variant: 'historical_uplift',
    modelName: 'HistoricalUpliftEngine',
    description: 'Compares festival-window demand vs matched baseline. Confidence scaled by evidence_days. Never fabricates uplift.',
    status: 'ACTIVE' as const,
  },
];

// ============================================================
// REGISTRY PERSISTENCE
// ============================================================

const REGISTRY_VERSION = 'registry-v2';

/**
 * Persist all model descriptors to DB and return the full registry.
 * Selected model per layer = the one with lowest MAE that beats baseline
 * (or the deterministic/baseline model if no candidate beats it).
 */
export async function buildAndPersistRegistry(): Promise<ModelDescriptor[]> {
  const descriptors: ModelDescriptor[] = [];

  // Layer 1: Demand Forecasting
  const demandMetrics = await evaluateDemandModels();
  let bestDemandVariant = 'naive';
  let bestDemandMae = Infinity;
  for (const v of DEMAND_MODEL_VARIANTS) {
    const m = demandMetrics[v.variant];
    const isValid = m && m.evaluationValid && (m.mae !== undefined);
    const beatsBaseline = isValid && (m.beatsBaseline === true);
    const isSelected = v.variant === 'naive'
      ? (!demandMetrics.ridge?.evaluationValid || !demandMetrics.ridge?.beatsBaseline) // naive selected if no candidate beats it
      : (beatsBaseline && (m!.mae! < bestDemandMae));
    if (isSelected && v.variant !== 'naive') {
      bestDemandMae = m!.mae!;
      bestDemandVariant = v.variant;
    }
    descriptors.push({
      id: `mdl-demand-${v.variant}`,
      layer: 'DEMAND_FORECAST',
      modelName: v.modelName,
      variant: v.variant,
      version: '1.0.0',
      featureVersion: '1.0',
      description: v.description,
      status: isSelected ? 'ACTIVE' : v.status,
      metrics: m,
      isSelected: v.variant === bestDemandVariant,
    });
  }
  // Mark the selected one
  for (const d of descriptors) {
    if (d.layer === 'DEMAND_FORECAST') {
      d.isSelected = (d.variant === bestDemandVariant);
      d.status = d.isSelected ? 'ACTIVE' : (d.variant === 'naive' ? 'BASELINE' : 'CANDIDATE');
    }
  }

  // Layer 2: Stockout Risk
  for (const v of STOCKOUT_MODEL_VARIANTS) {
    descriptors.push({
      id: `mdl-stockout-${v.variant}`,
      layer: 'STOCKOUT_RISK',
      modelName: v.modelName,
      variant: v.variant,
      version: '1.0.0',
      featureVersion: '1.0',
      description: v.description,
      status: v.status,
      isSelected: v.variant === 'deterministic', // deterministic always selected (hard rule)
      metrics: v.variant === 'deterministic'
        ? { evaluationValid: true, evaluationNote: 'Business rule — always enforced' }
        : await evaluateStockoutClassifier(),
    });
  }

  // Layer 3: Inventory Movement
  for (const v of MOVEMENT_MODEL_VARIANTS) {
    descriptors.push({
      id: `mdl-movement-${v.variant}`,
      layer: 'INVENTORY_MOVEMENT',
      modelName: v.modelName,
      variant: v.variant,
      version: '1.0.0',
      featureVersion: '1.0',
      description: v.description,
      status: v.status,
      isSelected: true,
      metrics: { evaluationValid: true, evaluationNote: 'Deterministic segmentation' },
    });
  }

  // Layer 4: Festival Intelligence
  for (const v of FESTIVAL_MODEL_VARIANTS) {
    descriptors.push({
      id: `mdl-festival-${v.variant}`,
      layer: 'FESTIVAL_INTELLIGENCE',
      modelName: v.modelName,
      variant: v.variant,
      version: '1.0.0',
      featureVersion: '1.0',
      description: v.description,
      status: v.status,
      isSelected: true,
      metrics: { evaluationValid: true, evaluationNote: 'Historical evidence-based' },
    });
  }

  // Persist to DB
  for (const d of descriptors) {
    await db.modelVersion.upsert({
      where: { id: d.id },
      update: {
        modelName: d.modelName,
        version: d.version,
        featureVersion: d.featureVersion,
        trainingDataset: `${d.layer}:${d.variant}`,
        metricsJson: JSON.stringify({ ...d.metrics, layer: d.layer, variant: d.variant, isSelected: d.isSelected, description: d.description, status: d.status }),
        status: d.isSelected ? 'ACTIVE' : 'CANDIDATE',
      },
      create: {
        id: d.id,
        modelName: d.modelName,
        version: d.version,
        featureVersion: d.featureVersion,
        trainingDataset: `${d.layer}:${d.variant}`,
        metricsJson: JSON.stringify({ ...d.metrics, layer: d.layer, variant: d.variant, isSelected: d.isSelected, description: d.description, status: d.status }),
        status: d.isSelected ? 'ACTIVE' : 'CANDIDATE',
      },
    });
  }

  return descriptors;
}

// ============================================================
// DEMAND MODEL EVALUATION
// Train + backtest all 5 variants, return metrics for each
// ============================================================

async function evaluateDemandModels(): Promise<Record<string, ModelMetrics>> {
  // Get a sample of products with sufficient sales history.
  // Use products that have actual sales (group by productId, take top 5 by count).
  const salesCounts = await db.sale.groupBy({
    by: ['productId'],
    _count: { _all: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5,
  });
  const products = await db.product.findMany({
    where: { id: { in: salesCounts.map(s => s.productId) } },
  });

  const allMetrics: Record<string, { mae: number; rmse: number; wape: number; baselineMae: number; n: number }> = {
    naive: { mae: 0, rmse: 0, wape: 0, baselineMae: 0, n: 0 },
    ridge: { mae: 0, rmse: 0, wape: 0, baselineMae: 0, n: 0 },
    rf: { mae: 0, rmse: 0, wape: 0, baselineMae: 0, n: 0 },
    gb: { mae: 0, rmse: 0, wape: 0, baselineMae: 0, n: 0 },
    lightgbm: { mae: 0, rmse: 0, wape: 0, baselineMae: 0, n: 0 },
  };

  // Dynamically import forecast module to avoid circular dep
  const { getDailySalesSeries, buildFeatures } = await import('@/lib/forecast');
  const { NaiveBaseline, RidgeRegression, RandomForest, GradientBoosting, LightGBMStyle } = await import('./algorithms');

  let totalSamples = 0;

  for (const product of products) {
    const series = await getDailySalesSeries(product.id, undefined, 90);
    if (series.length < 35) continue;

    const horizon = 7;
    const trainX: number[][] = [];
    const trainY: number[] = [];
    for (let i = 28; i < series.length - horizon; i++) {
      const subSeries = series.slice(0, i + 1);
      const { features } = buildFeatures(subSeries, 1);
      let target = 0;
      for (let h = 1; h <= horizon; h++) {
        if (i + h < series.length) target += series[i + h].qty;
      }
      trainX.push(features);
      trainY.push(target);
    }

    if (trainX.length < 14) continue;

    const testSize = Math.min(7, Math.floor(trainX.length * 0.2));
    const trainSize = trainX.length - testSize;

    // Train each model on the train slice
    const naive = new NaiveBaseline();
    naive.fit(trainX.slice(0, trainSize), trainY.slice(0, trainSize));

    const ridge = new RidgeRegression();
    ridge.fit(trainX.slice(0, trainSize), trainY.slice(0, trainSize), 1.0, 300, 0.01);

    const rf = new RandomForest();
    rf.fit(trainX.slice(0, trainSize), trainY.slice(0, trainSize));

    const gb = new GradientBoosting();
    gb.fit(trainX.slice(0, trainSize), trainY.slice(0, trainSize));

    const lgbm = new LightGBMStyle();
    lgbm.fit(trainX.slice(0, trainSize), trainY.slice(0, trainSize));

    // Evaluate on test slice
    const models = { naive, ridge, rf, gb, lightgbm: lgbm };
    for (const [variant, model] of Object.entries(models)) {
      let absErrSum = 0, sqErrSum = 0, absActualSum = 0, absBaselineErrSum = 0;
      for (let i = trainSize; i < trainX.length; i++) {
        const pred = model.predict(trainX[i]);
        const actual = trainY[i];
        absErrSum += Math.abs(pred - actual);
        sqErrSum += (pred - actual) ** 2;
        absActualSum += Math.abs(actual);
      }
      // Baseline (7-day mean) for comparison
      const recent7 = series.slice(-7).map(s => s.qty);
      const baseline = recent7.reduce((a, b) => a + b, 0) / Math.max(recent7.length, 1) * horizon;
      for (let i = trainSize; i < trainX.length; i++) {
        absBaselineErrSum += Math.abs(baseline - trainY[i]);
      }

      allMetrics[variant].mae += absErrSum / testSize;
      allMetrics[variant].rmse += Math.sqrt(sqErrSum / testSize);
      allMetrics[variant].wape += absActualSum > 0 ? (absErrSum / absActualSum) : 0;
      allMetrics[variant].baselineMae += absBaselineErrSum / testSize;
    }
    totalSamples++;
  }

  // Average across products
  const result: Record<string, ModelMetrics> = {};
  if (totalSamples === 0) {
    // No data to evaluate — all models invalid
    for (const v of ['naive', 'ridge', 'rf', 'gb', 'lightgbm']) {
      result[v] = {
        evaluationValid: false,
        evaluationNote: 'No products with sufficient history for evaluation',
      };
    }
    return result;
  }

  // The "baseline" is the naive variant's MAE — all other variants are
  // compared against THIS, not their own baseline field.
  const naiveMae = allMetrics.naive.mae / totalSamples;

  for (const v of ['naive', 'ridge', 'rf', 'gb', 'lightgbm']) {
    const m = allMetrics[v];
    const mae = m.mae / totalSamples;
    const rmse = m.rmse / totalSamples;
    const wape = m.wape / totalSamples;
    // baselineMae is the same for all variants = naive MAE
    const baselineMae = naiveMae;

    // Edge case: 0/0/0 = invalid evaluation (per spec)
    const allZero = mae === 0 && rmse === 0 && baselineMae === 0;
    // Naive IS the baseline — it doesn't "beat" itself
    const beatsBaseline = v === 'naive' ? false : (!allZero && mae < baselineMae);

    result[v] = {
      mae: round(mae, 3),
      rmse: round(rmse, 3),
      wape: round(wape, 3),
      baselineMae: round(baselineMae, 3),
      beatsBaseline,
      sampleSize: totalSamples,
      evaluationValid: !allZero,
      evaluationNote: allZero
        ? 'Evaluation failed: all metrics are 0 (insufficient data or constant target)'
        : v === 'naive'
          ? `Baseline model — ${naiveMae.toFixed(2)} MAE. Other variants must beat this.`
          : beatsBaseline
            ? `Beats naive baseline by ${(((baselineMae - mae) / Math.max(baselineMae, 0.001)) * 100).toFixed(1)}%`
            : `Does not beat naive baseline (MAE ${mae.toFixed(2)} ≥ baseline ${baselineMae.toFixed(2)})`,
    };
  }

  return result;
}

// ============================================================
// STOCKOUT CLASSIFIER EVALUATION
// ============================================================

async function evaluateStockoutClassifier(): Promise<ModelMetrics> {
  // We don't have ground-truth stockout labels, so we synthesize them from
  // historical zero-stock + zero-sales days.
  // For now, return "not yet calibrated" — classifier is candidate only.
  return {
    evaluationValid: false,
    evaluationNote: 'No ground-truth stockout labels available for calibration. Candidate only — deterministic engine is enforced.',
  };
}

function round(n: number, decimals: number = 2): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}
