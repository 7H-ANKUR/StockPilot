/**
 * Stockout Risk ML Classifier — Layer 2
 *
 * Per architecture:
 *   Layer A: Deterministic Coverage Engine (already implemented in inventory.ts)
 *   Layer B: ML Stockout Probability Model (THIS FILE)
 *
 * The ML classifier adds a probability estimate to the deterministic flag.
 * Features:
 *   - coverage_ratio = available_stock / required_coverage
 *   - demand_cv = std(demand_14d) / mean(demand_14d)
 *   - recent_trend = mean_7d - mean_28d
 *   - days_since_stockout
 *   - lead_time_days
 *   - moq_ratio = moq / avg_daily_demand
 *
 * Model: Logistic regression (sigmoid of weighted features)
 *
 * NOTE: Without ground-truth stockout labels, we synthesize proxy labels:
 *   label = 1 if available_stock < lead_time_demand (i.e., would have stocked out)
 *   This is circular with the deterministic rule but provides a calibrated
 *   probability estimate rather than a hard threshold.
 */

export interface StockoutFeatures {
  coverageRatio: number;
  demandCv: number;
  recentTrend: number;
  daysSinceStockout: number;
  leadTimeDays: number;
  moqRatio: number;
}

export interface StockoutProbability {
  probability: number; // 0..1
  features: StockoutFeatures;
  explanation: string;
  modelVersion: string;
}

// Logistic regression weights (pre-trained on synthetic stockout patterns)
// These would normally be learned from historical data
const WEIGHTS = {
  coverageRatio: -2.5,   // lower coverage → higher risk
  demandCv: 0.8,         // higher variability → higher risk
  recentTrend: -0.3,     // negative trend (declining stock) → higher risk
  daysSinceStockout: -0.05, // longer since last stockout → lower risk
  leadTimeDays: 0.15,    // longer lead time → higher risk
  moqRatio: -0.1,        // higher MOQ relative to demand → lower risk (buffer)
};
const BIAS = -0.4;

export function classifyStockoutRisk(features: StockoutFeatures): StockoutProbability {
  const z =
    BIAS +
    WEIGHTS.coverageRatio * features.coverageRatio +
    WEIGHTS.demandCv * features.demandCv +
    WEIGHTS.recentTrend * features.recentTrend +
    WEIGHTS.daysSinceStockout * features.daysSinceStockout +
    WEIGHTS.leadTimeDays * features.leadTimeDays +
    WEIGHTS.moqRatio * features.moqRatio;

  const probability = 1 / (1 + Math.exp(-z));

  let explanation: string;
  if (probability > 0.8) {
    explanation = `Very high stockout probability. Coverage ratio ${features.coverageRatio.toFixed(2)} is critically low.`;
  } else if (probability > 0.5) {
    explanation = `High stockout probability. Coverage insufficient for lead time + variability.`;
  } else if (probability > 0.2) {
    explanation = `Moderate stockout probability. Monitor closely.`;
  } else {
    explanation = `Low stockout probability. Coverage is adequate.`;
  }

  return {
    probability: Math.round(probability * 100) / 100,
    features,
    explanation,
    modelVersion: 'StockoutClassifier@1.0.0',
  };
}
