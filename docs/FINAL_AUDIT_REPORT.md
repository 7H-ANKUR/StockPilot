# Final Audit Report — AI Inventory Decision Agent

## Audit Date: 2026-10-04

## 1. Original Problems → Fixes

### 1.1 Analytics showing ₹0 despite transactions existing
- **Root cause**: Date filtering anchored on `new Date()` (2026) instead of actual data range (2014-2018).
- **Fix**: Created centralized date utility (`src/lib/dates.ts`) that anchors on latest sale in DB. Applied to `/api/v1/sales/summary` and `/api/v1/dashboard`.
- **Verification**: Analytics now shows Revenue ₹1.62L, AOV ₹1,171 for 30-day filter. ✅

### 1.2 Risk Monitor showing 999 days for unknown demand
- **Root cause**: No distinction between "zero demand" and "unknown demand". Used 999 as sentinel.
- **Fix**: `daysOfInventory` and `expectedDaysToStockout` now return `null` when forecast unavailable. UI shows "N/A" instead of "999".
- **Verification**: Risk Monitor shows "N/A" and "Forecast unavailable" for items with no sales history. ✅

### 1.3 Overstock flagging NO_DEMAND_SIGNAL items as overstock
- **Root cause**: Same as 1.2 — 999 days > threshold → flagged as overstock.
- **Fix**: New `classification` field: `OVERSTOCK` | `VERY_SLOW` | `NO_DEMAND_SIGNAL` | `HEALTHY`.
- **Verification**: Items with no sales show "NO_DEMAND_SIGNAL" not "OVERSTOCK". ✅

### 1.4 Recommendations generated when forecast unavailable
- **Root cause**: MOQ fallback (`MOQ_ENFORCED_OOS`) generated recommendations without forecast evidence.
- **Fix**: Returns `FORECAST_REQUIRED` constraint. Recommendation engine skips these items.
- **Verification**: No recommendations generated for products without forecast evidence. ✅

### 1.5 Data source duplication
- **Root cause**: Each ingestion run created a new `DataSource` row.
- **Fix**: New `upsertDataSource()` helper — upserts by `sourceName`.
- **Verification**: Running ingestion twice produces 3 sources (not 6). ✅

### 1.6 Model metrics showing 0.00 (already fixed in prior iteration)
- **Status**: ✅ FIXED. 0/0/0 metrics show "Evaluation Invalid".

### 1.7 0 tool calls → 100% success (already fixed in prior iteration)
- **Status**: ✅ FIXED. Shows "N/A" when total calls = 0.

### 1.8 Landing page fake business numbers
- **Root cause**: Hardcoded ₹51.2L, 18.4K units, etc. presented as real outcomes.
- **Fix**: Trust strip now pulls live data from `/api/v1/health`. Dashboard mockup labeled "Demo Scenario". Floating cards labeled "Example".
- **Verification**: Landing page shows "Demo Scenario" badge and live counts where data exists. ✅

### 1.9 Dashboard too card-heavy, not decision-focused
- **Root cause**: No action center, no AI brief, no clear next steps.
- **Fix**: Added Action Center (with Review/Approve/Plan buttons that navigate) and AI Daily Brief (generated from real tool outputs).
- **Verification**: Dashboard now has "Action Center" with actionable items and "AI Daily Brief" with real numbers. ✅

## 2. Architecture (corrected in prior iteration)
- 4 intelligence layers: Demand Forecast | Stockout Risk | Inventory Movement | Festival Intelligence
- LLM sits ABOVE the 4 layers (not as one of them)
- 5 model variants for demand forecasting: Naive → Ridge → RF → GB → LightGBM
- Model selection: best variant that beats naive baseline

## 3. Models Trained
- **Demand Forecasting**: 5 variants trained + backtested on real Supermart sales data
  - Naive: MAE 47.857 (baseline)
  - Ridge: MAE 36.478 ✓ (SELECTED — beats baseline by 23.7%)
  - RF: MAE 36.858 ✓
  - GB: MAE 40.570 ✓
  - LightGBM: MAE 39.372 ✓
- **Stockout Risk**: Deterministic coverage engine (ACTIVE) + ML classifier (CANDIDATE — no ground-truth labels)
- **Inventory Movement**: ABC-XYZ segmentation (ACTIVE)
- **Festival Intelligence**: Historical uplift engine (ACTIVE)

## 4. Datasets Used
- Supermart Grocery Sales: 4,042 sales transactions (REAL_PUBLIC)
- BigBasket Products: 2,000 products (REAL_PUBLIC, capped at 2000 for demo)
- Indian Superstore Sales: 1,500 order details (REAL_PUBLIC)
- 8 Indian suppliers with GSTIN, lead time, MOQ (SYNTHETIC seed)
- 11 Indian festivals (DiWali, Holi, Eid, etc.)
- 1,000 inventory snapshots (SYNTHETIC seed with realistic risk scenarios)

## 5. Agent Tools (12 tools, grounded)
- get_sales_summary, get_inventory_snapshot, forecast_demand
- get_stockout_risk, get_overstock_risk, get_movement_classification
- analyze_festival_impact, get_supplier_constraints, calculate_reorder_quantity
- get_product_details, create_purchase_order_draft, validate_purchase_order
- Every LLM response grounded in tool outputs — never invents numbers
- Tool calls audit-logged

## 6. Workflow
- Risk → Forecast → Recommendation → Manager Review → Approve/Modify/Reject → Group By Supplier → PO Draft → PO Generated
- PO never generated from PENDING/REJECTED/FORECAST_REQUIRED
- Transactional + idempotent PO creation
- Full audit trail

## 7. Security
- RBAC roles: ADMIN, OWNER, MANAGER, PROCUREMENT, FINANCE, ANALYST
- All write APIs require authorization (demo uses MANAGER role)
- Audit logging for all critical actions

## 8. Known Limitations
- SQLite (demo) — production should use PostgreSQL
- No real authentication (demo user) — production should use NextAuth/JWT
- Stockout ML classifier is candidate only (no ground-truth labels for calibration)
- BigBasket ingestion capped at 2000 products for demo performance
- Sales data is historical (2014-2018) — analytics anchored on data range, not today

## 9. Definition of Done
- ✅ Landing page works (shows first, CTA enters dashboard)
- ✅ Dashboard uses real data (revenue, transactions, AOV all non-zero)
- ✅ Analytics uses real data (date-anchored queries)
- ✅ Date filters work (7D/30D/90D/1Y)
- ✅ Inventory works (with null handling for unknown demand)
- ✅ Risk works (N/A instead of 999)
- ✅ Forecast works (5 model variants, best selected)
- ✅ Model registry works (4 layers, proper selection)
- ✅ Overstock works (NO_DEMAND_SIGNAL vs VERY_SLOW vs OVERSTOCK)
- ✅ Festivals work (evidence-based uplift)
- ✅ Suppliers work (8 Indian suppliers with constraints)
- ✅ Reorder optimization works (FORECAST_REQUIRED when no evidence)
- ✅ LLM tool calling works (12 tools, grounded responses)
- ✅ Recommendation workflow works (with decision trail)
- ✅ Human approval works (Approve/Modify/Reject)
- ✅ PO generation works (transactional, idempotent)
- ✅ GST works (CGST/SGST/IGST breakdown)
- ✅ Audit works (all actions logged)
- ✅ Data sources deduplicated (idempotent ingestion)
- ✅ Model metrics edge cases fixed (0/0/0 = invalid, 0 calls = N/A)
