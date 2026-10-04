# Data Gap Report
**Project:** AI Inventory Decision Agent (Prototype)
**Date:** 2026-10-04

## 1. Executive Summary
An automated inspection of the `datasets/` directory was performed. The inspection revealed that the project already possesses extremely high-quality historical sales data, detailed product catalogs, and precise promotional campaign histories.

However, for a robust Retail Supply Chain and ML Replenishment model, **Inventory flow (stock levels, receipts, stockouts)** and **Supplier dynamics (lead times, POs, delays)** are fundamentally missing and must be synthetically generated using the existing sales data as the baseline.

## 2. Dataset Inventory (Existing Data)
The following datasets were successfully inspected:

1. **BigBasket Products.csv**
   - **Rows:** 27,555 | **Cols:** 10
   - **Type:** Product Catalog
   - **Status:** EXISTING_REAL
2. **fmcg dataset.xlsx**
   - **Rows:** 190,757 | **Cols:** 14
   - **Type:** Historical Sales/Movement
   - **Status:** EXISTING_REAL
3. **Supermart Grocery Sales - Retail Analytics Dataset.csv**
   - **Rows:** 9,994 | **Cols:** 11
   - **Type:** Historical Sales (Transaction level)
   - **Status:** EXISTING_REAL
4. **dim_campaigns.csv** & **fact_events.csv**
   - **Rows:** 2 (Campaigns), 1,500 (Events)
   - **Type:** Promotional History (BOGO, 50% Off, etc.)
   - **Status:** EXISTING_REAL
5. **dim_stores.csv**
   - **Rows:** 50
   - **Type:** Store Topology
   - **Status:** EXISTING_REAL

## 3. Gap Analysis Table

| Requirement | Existing Data | Missing Data | Action |
|---|---|---|---|
| Demand history | `fmcg dataset.xlsx`, `Supermart` | None | USE EXISTING |
| Product catalog | `BigBasket Products.csv`, `dim_products` | None | USE EXISTING |
| Store information | `dim_stores.csv` | None | USE EXISTING |
| Inventory history | None | Stock levels (opening/closing), Received Qty | REQUIRES_SYNTHETIC_GENERATION |
| Stockout history | None | Stockout flags, duration | REQUIRES_SYNTHETIC_GENERATION |
| Festival calendar | None (Image provided) | 2026 Indian holidays | ENRICH (from provided calendar) |
| Promotions | `fact_events.csv`, `dim_campaigns.csv` | None | USE EXISTING |
| Supplier lead time | None | Supplier catalog, historical lead times, reliability | REQUIRES_SYNTHETIC_GENERATION |
| Purchase orders | None | PO generation, delays, received quantities | REQUIRES_SYNTHETIC_GENERATION |
| GST Information | None | HSN Codes, GST brackets | DERIVABLE (from Product Category) |

## 4. Next Steps
The next step is to create a Python script (`scripts/generate_missing_data.py`) that strictly adheres to **Phase 4-13** of the Master Prompt. It will load the existing sales data, step through it chronologically, and simulate realistic inventory depletion, reorders, stockouts, and supplier delays without modifying the underlying demand history.
