# 08 - Scoring & Decision Engine Specification

The system uses deterministic calculations for business actions (PO rules, safety stock) layered alongside ML probability models for prediction.

---

## 1. Demand Forecasting Engine

### 1.1 Features Engineered
* **Lags**: 1, 3, 7, 14, 28 days.
* **Rolling Statistics**: Rolling mean (7, 14, 28 days), Rolling standard deviation.
* **Time**: Weekday, month, week-of-year, holiday/festival indicators.
* **Pricing**: Promotions, discounts, current price.
* **Context**: Store ID, category, subcategory.
* **State**: Recent stock-out state, days since stock-out, recent sales velocity.

### 1.2 Forecast Target
* **Primary Target**: `future_quantity_7d` (Total demand over the next 7 days).
* **Evaluation**: A model is only promoted if it beats a naive baseline (`forecast(t+7) = recent 7-day average`) on historical backtesting.

---

## 2. Stock-Out Risk Engine

Stock-out risk is a deterministic business calculation, not a free-form LLM guess.

### 2.1 Formula
```text
LeadTimeDemand = ForecastDailyDemand × SupplierLeadTime
SafetyStock = ServiceFactor × DemandStdDev × sqrt(LeadTime)
RequiredCoverage = LeadTimeDemand + SafetyStock
```

### 2.2 Risk Flags
```text
if AvailableStock < LeadTimeDemand:
    flag = HIGH RISK
else if AvailableStock < RequiredCoverage:
    flag = WATCH / MEDIUM RISK
else:
    flag = SAFE
```
*Note: The ML layer may optionally add a probability estimate `P(stockout within N days)` to augment the deterministic flag.*

---

## 3. Overstock Engine

### 3.1 Formula
```text
DaysOfInventory = AvailableStock / max(ForecastDailyDemand, epsilon)
```

### 3.2 Risk Flags
* Flag as `OVERSTOCK` when `DaysOfInventory > configured_threshold` (threshold varies by category).
* Enhanced by: Expiry risk (perishables), seasonal decline, and historical sell-through.

---

## 4. Movement Classification Intelligence
Classifies products periodically using an **ABC-XYZ framework**.
* Computed factors: `sales_velocity`, `inventory_turnover`, `days_of_inventory`, `revenue_contribution`, `demand_variability`.
* **A-X**: High value, stable demand.
* **A-Z**: High value, unpredictable demand.
* **C-X**: Low value, stable demand.
* **C-Z**: Low value, unpredictable demand.

---

## 5. Festival-Aware Forecasting
Do not hard-code arbitrary uplifts (e.g., "Diwali means +50%"). Must be data-driven.
* **Inputs**: historical festival sales + matched non-festival baseline + current trend + promotion effect + regional relevance.
* **Output**: `festival_uplift_estimate` (multiplier) + `confidence_score` + `evidence_days`.
* *Rule*: Low historical evidence MUST produce low confidence.

---

## 6. Reorder Optimizer Engine

### 6.1 Gross Need Calculation
```text
GrossReorderNeed = ExpectedDemandDuringLeadTime
                   + SafetyStock
                   + ExpectedFestivalBuffer
                   - AvailableStock
                   - OnOrderStock
```

### 6.2 Constraint Application
```text
if GrossReorderNeed <= 0:
    no order recommended

else:
    quantity = max(GrossReorderNeed, supplier_MOQ)
    final_quantity = ceil_to_pack_size(quantity)
```
*Optional optimizations later consider holding costs vs stockout costs.*
