# Current System Audit — AI Inventory Decision Agent

## Audit Date: 2026-10-04

## 1. Critical Data-Flow Issues

### 1.1 Analytics shows ₹0 despite transactions existing
- **Current implementation**: `GET /api/v1/sales/summary` filters sales by `saleTimestamp >= (today - N days)`.
- **Problem**: The retail datasets (Supermart 2014-2018, Indian Superstore 2018) have historical dates. Filtering by "last 30 days from 2026" returns zero rows.
- **Root cause**: Date filtering anchors on `new Date()` (current system time) instead of the actual data range.
- **Severity**: CRITICAL
- **Required fix**: Anchor analytics queries on the latest available sale date in the database, not on `now()`.
- **Affected files**: `src/app/api/v1/sales/summary/route.ts`, `src/app/api/v1/dashboard/route.ts`, `src/app/api/v1/gst/reports/route.ts`
- **Verification**: Analytics page should show non-zero revenue for 7D/30D/90D/1Y filters.

### 1.2 Risk Monitor shows 999 days coverage for unknown demand
- **Current implementation**: `computeStockoutRisk` returns `daysOfInventory = 999` when `forecastDailyDemand < 0.1`.
- **Problem**: 999 is a sentinel value that looks like real data. It implies "infinite coverage" which is misleading when demand is genuinely unknown.
- **Root cause**: No distinction between "zero demand" and "unknown demand".
- **Severity**: HIGH
- **Required fix**: Use `null` internally. UI shows "Forecast unavailable" instead of "999 days".
- **Affected files**: `src/lib/inventory.ts`, `src/components/pages/risks.tsx`, `src/components/pages/inventory.tsx`
- **Verification**: Risk Monitor shows "Forecast unavailable" for items with no sales history.

### 1.3 Overstock flags items with NO_DEMAND_SIGNAL as overstock
- **Current implementation**: `computeOverstock` computes `daysOfInventory = onHandQty / forecastDailyDemand`. When demand is 0, it returns 999 days → flagged as overstock.
- **Problem**: An item with no sales is NOT overstocked — it has NO_DEMAND_SIGNAL.
- **Root cause**: Same as 1.2 — no distinction between zero and unknown.
- **Severity**: HIGH
- **Required fix**: Return `NO_DEMAND_SIGNAL` classification when demand is unavailable.
- **Affected files**: `src/lib/inventory.ts`
- **Verification**: Items with no sales show "No demand signal" not "Overstock".

### 1.4 Recommendations generated when forecast unavailable
- **Current implementation**: `calculateReorder` recommends MOQ when `availableStock <= 0 && forecastDailyDemand < 0.1`.
- **Problem**: This generates financial recommendations without forecast evidence, violating the spec: "Financial recommendations need evidence."
- **Root cause**: The MOQ fallback was added to generate demo recommendations but contradicts the spec.
- **Severity**: CRITICAL
- **Required fix**: Return `FORECAST_REQUIRED` status. Don't auto-recommend MOQ.
- **Affected files**: `src/lib/inventory.ts`, `src/lib/workflow.ts`
- **Verification**: No recommendations generated for products without forecast evidence.

### 1.5 Data source duplication
- **Current implementation**: Each ingestion run creates a new `DataSource` row.
- **Problem**: Running "Load Demo Data" twice creates duplicate entries.
- **Root cause**: No idempotency check on `sourceName`.
- **Severity**: MEDIUM
- **Required fix**: Upsert by `sourceName`. Update `rowCount` and `downloadTime` if exists.
- **Affected files**: `src/lib/ingestion.ts`
- **Verification**: Data Sources page shows each source exactly once.

### 1.6 Model metrics showing 0.00 (already fixed)
- **Status**: FIXED in previous iteration. 0/0/0 metrics now show "Evaluation Invalid".

### 1.7 0 tool calls → 100% success (already fixed)
- **Status**: FIXED in previous iteration. Now shows "N/A" when total calls = 0.

## 2. Landing Page Issues

### 2.1 Fake business numbers
- **Current implementation**: Landing page shows ₹51.2L, 18.4K units, 13 high-risk, Diwali +37%, ↓31% stockout.
- **Problem**: These are hardcoded and presented as real business outcomes.
- **Severity**: HIGH
- **Required fix**: Label as "Demo Scenario" or pull from live backend.
- **Verification**: Numbers either come from `/api/v1/health` or are explicitly labeled as demo.

## 3. Dashboard Issues

### 3.1 Card-heavy, not decision-focused
- **Current implementation**: Dashboard shows KPI cards + charts + alerts.
- **Problem**: No action center, no AI daily brief, no clear next steps.
- **Severity**: MEDIUM
- **Required fix**: Add Action Center with "Review" buttons, AI Daily Brief from real tool outputs.

## 4. Missing Pages

### 4.1 Product Detail page
- **Status**: NOT IMPLEMENTED. Clicking an inventory row does nothing.
- **Required**: Comprehensive product view with all sections.

## 5. Architecture (already corrected)
- **Status**: FIXED. 4 intelligence layers + LLM above. 5 model variants with selection.

## 6. Items Already Working
- Multi-model forecasting (Naive → Ridge → RF → GB → LightGBM)
- Model selection (best variant that beats baseline)
- Tool-calling LLM agent (12 tools, grounded responses)
- Approval workflow (PENDING_REVIEW → APPROVED/MODIFIED/REJECTED → PO_GENERATED)
- Transactional PO generation with GST breakdown
- Audit logging for all critical actions
- Festival intelligence (evidence-based uplift)
- ABC-XYZ movement classification
