# Data Provenance Document

## Overview
This document traces the origin, lineage, and transformation of the datasets used to train the AI Inventory Decision Agent. As per the architectural guidelines, existing real-world datasets are preserved as the foundation, while synthetic data is carefully layered on top *only* to fill missing dimensions.

## 1. Existing Real-World Data (The Foundation)
The following fields and datasets represent un-altered, real historical truths. They were **not** synthetically generated:

- **Sales History (`datasets/fmcg dataset.xlsx`)**
  - **Provenance:** `units_sold`, `date`, `sku`, `region`, `price_unit`, `pack_type`.
  - **Role:** Ground truth for all demand forecasting.
- **Product Catalog (`datasets/BigBasket Products.csv`)**
  - **Provenance:** `category`, `sub_category`, `brand`, `sale_price`.
  - **Role:** Exogenous categorical features for product embeddings.
- **Promotions (`datasets/C9_Input_Files/...`)**
  - **Provenance:** Exact historical discounts, campaigns, and promo periods.

## 2. Derived Data
The following fields were mathematically derived from the base data:
- **Lags and Rolling Windows:** Derived using Pandas `shift()` and `rolling()` on `units_sold`.
- **Date Features:** `DayOfWeek`, `Month`, `Quarter`, `IsWeekend` derived directly from `date`.
- **GST Information:** Derived by mapping standard Indian GST brackets to the historical `category` strings.

## 3. Synthetically Generated Data
The following fields are strictly synthetic. They were generated to provide a complete ML environment because the underlying dataset lacked physical inventory tracking:

- **Suppliers (`data/enriched/suppliers.csv`)**
  - Generated to create realistic `lead_time_days` and `reliability_score` features. Connected deterministically to the real `sku` via a 1:1 mapping.
- **Inventory Flow (`data/enriched/ml_daily_panel.parquet`)**
  - `opening_stock`, `closing_stock`, `received_qty`, `on_order_qty`.
  - **How it connects:** A Python simulator stepped chronologically through the real `units_sold`. It depleted `current_stock` by the real `units_sold`, triggering a synthetic purchase order (with supplier lead times) whenever stock dropped below 50.
- **Stockouts (`stockout_flag`)**
  - Generated organically when simulated `current_stock` hit 0 due to real `units_sold` outpacing simulated supplier lead times.
- **Holidays Calendar (`is_festival`)**
  - Sourced from a real 2026 Indian calendar, but joined "synthetically" across the historical date range to provide uplift context.

## Summary
By isolating the synthetic layer to strictly physical inventory constraints (which act as boundaries on the true historical sales data), the resulting dataset is causally valid, mathematically sound, and ready for production ML training.
