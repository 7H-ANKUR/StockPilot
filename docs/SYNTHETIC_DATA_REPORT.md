# Synthetic Data Limitations Report

**WARNING: DO NOT TREAT THE SYNTHETIC INVENTORY AS REAL HISTORICAL FACT.**

## 1. Context
This prototype system uses a hybrid dataset (Real Sales + Synthetic Inventory). Because physical stock levels were missing from the raw transactional data, we built a chronological inventory simulator to emulate realistic stockouts, supplier deliveries, and reorder cycles.

## 2. Limitations

1. **Synthetic Inventory is NOT Real Inventory:**
   - The `opening_stock` and `closing_stock` values were generated using a strict periodic-review inventory policy (Reorder Point = 50 units). Real-world supply chains are far messier (human error, lost inventory, irregular ordering).
2. **Synthetic Stockouts are NOT Real Stockouts:**
   - A `stockout_flag = 1` in this dataset implies the simulated supplier failed to deliver before the real historical demand depleted the simulated safety stock. It does not mean the actual store ran out of stock on that historical day.
3. **Supplier Behavior is Idealized:**
   - Supplier `reliability_score` and `lead_time_days` are fixed normal distributions. Real suppliers experience macro-level shocks (e.g., strikes, weather events) that affect all deliveries simultaneously.
4. **Demand Truncation:**
   - In the real world, if stock is 0, sales are 0. In our simulator, because we treat the historical dataset as the ground-truth "Latent Demand", a simulated stockout truncates the simulated sales.

## 3. Allowable Claims
You **may** claim:
- "This system demonstrates a robust architecture capable of handling full-lifecycle retail replenishment."
- "The ML models are trained on real Indian FMCG demand patterns."
- "The stockout-prediction algorithms are validated on causally consistent simulated environments."

You **MUST NOT** claim:
- "The model achieved 98% accuracy on historical stockouts." (The stockouts are synthetic).
- "This model proves we can reduce actual holding costs by 20%." (Holding costs in the simulation are arbitrary).

## 4. Path to Production
Because the synthetic data is entirely modular (contained strictly within the `closing_stock` and `received_qty` columns), migrating to production requires **zero code changes** to the ML architecture. 
You only need to drop the real ERP inventory tables into the database, replacing the `ml_daily_panel.parquet` generation step, and retrain the model.
