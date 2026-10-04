# 01 - Product Requirements Document

## 1. Product Overview

### Product Name
**AI Inventory Decision Agent**

### One-line Pitch
An Agentic AI layer that connects POS, inventory, purchase, supplier, and GST data to predict demand, detect inventory risks, create festival-specific inventory plans, recommend reorders, and generate purchase orders with manager approval.

### Problem Statement
Retail managers already have large volumes of sales and operational data, but critical inventory decisions still require manual analysis:
- What should be reordered?
- How much should be reordered?
- Which SKUs may run out?
- Which products are overstocked?
- Which products are moving quickly or slowly?
- How will an upcoming Indian festival affect demand?
- Which supplier is appropriate?
- Can an order be generated automatically after approval?

The product solves this by putting an AI decision layer over existing retail data rather than replacing existing POS systems.

---

## 2. Target Users

### Primary User — Store/Inventory Manager
**Needs:**
- Immediate risk visibility (stockouts, overstock).
- Actionable reorder recommendations.
- Explanations for every AI decision.
- Absolute control over financial actions.
- Supplier-aware recommendations.

### Secondary User — Procurement Manager
**Needs:**
- Consolidated reorder list across stores.
- Supplier-wise orders.
- Enforcement of MOQ (Minimum Order Quantity) and lead-time constraints.
- Purchase cost visibility.
- Approval history for auditability.

### Secondary User — Business Owner
**Needs:**
- High-level sales and inventory KPIs.
- Category/product performance tracking.
- Working-capital visibility.
- Stockout/overstock trends over time.

### Secondary User — Finance/GST User
**Needs:**
- Purchase/sales tax data visibility.
- GST-oriented reports.
- Invoice extraction and verification.

---

## 3. Product Principles

1. **AI recommends; humans approve financial actions.**
2. **Forecast models produce numbers; LLM interprets and coordinates.** (LLM is not a forecasting engine).
3. **The system must be India-aware.** (Understanding regional festivals and GST logic).
4. **Every important recommendation must be explainable.**
5. **Low-confidence predictions must be visible to the user.**
6. **The product is an intelligence layer, not a POS replacement.**
7. **Structured data and deterministic business rules must protect against LLM hallucination.**
8. **Every production decision must be auditable.**

---

## 4. Product Goals

### MVP Goals
- Centralize retail data from disjointed sources.
- Forecast SKU demand.
- Identify stockout and overstock risks.
- Use Indian festivals/events as demand context.
- Calculate reorder quantities based on formulas.
- Let an LLM orchestrate analytical tools to serve users.
- Present explainable recommendations.
- Mandate manager approval before PO creation.
- Generate supplier-wise PO drafts.
- Provide sales dashboards.

### Production Goals (Post-MVP)
- Connect directly to real POS/ERP systems.
- Support scheduled data ingestion.
- Support multiple stores and suppliers.
- Maintain ML model versions and monitor drift.
- Support strict role-based access control (RBAC).
- Provide a complete audit history.
- Scale the system horizontally.

---

## 5. Functional Requirements

### FR-01 — Data Ingestion
- Support CSV, XLSX, API ingestion, and scheduled imports.
- **Validation**: Required columns, data types, dates, duplicate records, missing identifiers, negative/invalid quantities, and impossible prices.
- Errors must be shown with actionable messages.

### FR-02 — Unified Product Catalog
- Maintain normalized SKU master: SKU, product name, brand, category, subcategory, unit, MRP, selling price, GST rate, active/inactive status.
- Support mapping of source-specific product IDs.

### FR-03 — Inventory Monitoring
- Display: current stock, reserved stock, available stock, reorder point, max stock, days of inventory, stockout risk, overstock risk.

### FR-04 — Demand Forecasting
- For SKU/store combinations: predict 7-day demand (optionally 14-day/30-day).
- Show historical trends, uncertainty/confidence, and major contributing factors.
- Forecasts must use time-aware validation.

### FR-05 — Stockout Prediction
- Estimate: probability/risk of stockout, expected days to stockout, demand during supplier lead time, and shortage severity.
- UI must explain the risk using verifiable values.

### FR-06 — Overstock Detection
- Identify products with excessive days of inventory relative to expected demand.
- Result includes: current stock, expected demand, days of inventory, threshold, movement class, and recommendation.

### FR-07 — Fast/Slow Moving Analysis
- Classify products using sales velocity and inventory behavior (fast, normal, slow, dead).
- Support ABC-XYZ segmentation in an advanced view.

### FR-08 — Festival Intelligence
- Support an Indian event calendar (e.g., Diwali, Holi).
- Steps: identify event -> identify historical periods -> compare demand with baseline -> calculate uplift -> generate confidence -> adjust inventory recommendation.
- **Rule**: No fabricated festival trend may be shown as factual.

### FR-09 — Supplier Intelligence
- Maintain: supplier, GSTIN, lead time, MOQ, price, reliability, terms, and preferred SKU mappings.
- Reorder engine must respect supplier constraints.

### FR-10 — Smart Reorder Recommendation
- Must include: SKU, Store, Current stock, Forecast demand, Lead-time demand, Safety stock, On-order stock, Festival adjustment, MOQ, Recommended quantity, Estimated cost, Risk level, Confidence, Explanation.

### FR-11 — Agentic Reasoning
- LLM agent shall interpret manager requests, choose tools, call backend tools, synthesize verified outputs, explain recommendations, and prepare action drafts.
- **Rule**: It shall NOT independently invent/mutate core numerical records.

### FR-12 — Human Approval
- Manager can: approve, modify, or reject recommendations.
- System must store the original recommendation and the final manager decision.

### FR-13 — Purchase Order Generation
- After approval, create supplier-wise PO drafts with: PO number, supplier, store, line items, quantities, unit prices, subtotal, taxes, estimated total, requested date, approval reference.

### FR-14 — Bill Scanner (Optional Module)
- Extract from PDF/JPG (scanned, computerized, or kacha bills): supplier, invoice number, date, GSTIN, SKU/product, quantity, price, taxes.
- Uncertain fields sent to human verification.

### FR-15 — GST Module
- Maintain and report: GSTIN, GST rate, taxable value, CGST, SGST, IGST, purchase/sales totals.
- *Note: This is an AI-assisted reporting layer, not professional tax software.*

### FR-16 — Sales Analytics
- Dashboard must support: daily/monthly/yearly sales, SKU/category/regional sales, profit (if available), discount impact, and trend comparisons.

---

## 6. Non-Functional Requirements

### Performance
- Target MVP API p95 < 1.5 seconds for normal queries.
- Cached dashboard queries < 500 ms.
- PO generation < 5 seconds.
- Asynchronous model training and OCR.

### Reliability
- Graceful retries, idempotent ingestion.
- Background jobs for expensive workloads.
- Transactional PO generation.

### Security
- Authentication, RBAC, encrypted transport, secret management, secure file uploads, audit logging.
- LLM Guardrails: Defend against prompt injection, data exfiltration, tool abuse, and unauthorized access.

### Explainability
- Every recommendation must expose numerical evidence, model/version, key inputs, applied business rules, confidence score, and timestamp.

### Privacy
- Use minimum necessary customer information. Customer-level data should not be sent to an external LLM unless specifically required, authorized, and protected.

---

## 7. Success Metrics

### Product Metrics
- Reduction in stockout events and excess inventory.
- Recommendation acceptance rate (and modification rate).
- User time saved.

### ML Metrics
- Mean Absolute Error (MAE), Root Mean Square Error (RMSE), WAPE/SMAPE.
- Stockout precision and recall.
- Calibration of confidence scores.

### Agent Metrics
- Tool-call correctness (valid JSON schema outputs).
- Grounded response rate (no unsupported claims).
- Approval-policy compliance.

---

## 8. Data Quality Requirements
- Systems must detect: duplicate IDs, impossible dates, negative quantities, invalid GST rates, missing suppliers, zero/negative unit prices, broken mappings.
- Bad rows must be quarantined, not silently discarded.

---

## 9. Release Criteria
A release is blocked if:
- Model evaluation is missing.
- Schema migrations are untested.
- Human approval can be bypassed.
- LLM can directly execute purchases.
- Sensitive secrets are committed.
- Production data can be overwritten without audit trails.
- Forecast leakage is detected.
- Generated synthetic data is mislabeled as real data.
