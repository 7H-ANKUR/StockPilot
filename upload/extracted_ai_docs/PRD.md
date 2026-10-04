# AI Inventory Decision Agent — Product Requirements Document

## 1. Product Overview

### Product name

**AI Inventory Decision Agent**

### One-line pitch

An Agentic AI layer that connects POS, inventory, purchase, supplier and GST data to predict demand, detect inventory risks, create festival-specific inventory plans, recommend reorders and generate purchase orders with manager approval.

### Problem

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

### Primary user — Store/Inventory Manager

Needs:

- immediate risk visibility
- actionable reorder recommendations
- explanations
- control over financial actions
- supplier-aware recommendations

### Secondary user — Procurement Manager

Needs:

- consolidated reorder list
- supplier-wise orders
- MOQ/lead-time constraints
- purchase cost visibility
- approval history

### Secondary user — Business Owner

Needs:

- sales and inventory KPIs
- category/product performance
- working-capital visibility
- stockout/overstock trends

### Secondary user — Finance/GST User

Needs:

- purchase/sales tax data
- GST-oriented reports
- invoice extraction and verification

---

## 3. Product Principles

1. **AI recommends; humans approve financial actions.**
2. **Forecast models produce numbers; LLM interprets and coordinates.**
3. **The system must be India-aware.**
4. **Every important recommendation must be explainable.**
5. **Low-confidence predictions must be visible.**
6. **The product is an intelligence layer, not a POS replacement.**
7. **Structured data and deterministic business rules must protect against LLM hallucination.**
8. **Every production decision must be auditable.**

---

## 4. Product Goals

### MVP goals

- Centralize retail data.
- Forecast SKU demand.
- Identify stockout and overstock risks.
- Use Indian festivals/events as demand context.
- Calculate reorder quantities.
- Let an LLM orchestrate analytical tools.
- Present explainable recommendations.
- Get manager approval before PO creation.
- Generate supplier-wise PO drafts.
- Provide sales dashboards.

### Production goals

- Connect to real POS/ERP systems.
- Support scheduled data ingestion.
- Support multiple stores.
- Support multiple suppliers.
- Maintain model versions.
- Monitor data/model drift.
- Support role-based access.
- Provide complete audit history.
- Scale the system horizontally.

---

## 5. Functional Requirements

### FR-01 — Data ingestion

The platform must support:

- CSV
- XLSX
- API ingestion
- scheduled imports

The ingestion layer must validate:

- required columns
- data types
- dates
- duplicate records
- missing identifiers
- negative/invalid quantities
- impossible prices

Errors must be shown with actionable messages.

---

### FR-02 — Unified product catalog

The system must maintain a normalized SKU/product master with:

- SKU
- product name
- brand
- category
- subcategory
- unit
- MRP
- selling price
- GST rate
- active/inactive status

Product mapping should support source-specific product IDs.

---

### FR-03 — Inventory monitoring

Display:

- current stock
- reserved stock
- available stock
- reorder point
- maximum stock
- days of inventory
- stockout risk
- overstock risk

---

### FR-04 — Demand forecasting

For selected SKU/store combinations:

- predict 7-day demand
- optionally predict 14-day and 30-day demand
- show historical trend
- show uncertainty/confidence
- show major contributing factors

Forecasts must use time-aware validation.

---

### FR-05 — Stockout prediction

The system should estimate:

- probability/risk of stockout
- expected days to stockout
- demand during supplier lead time
- shortage severity

The UI must explain the risk using verifiable values.

---

### FR-06 — Overstock detection

Identify products with excessive days of inventory relative to expected demand.

The result should include:

- current stock
- expected demand
- days of inventory
- threshold
- movement class
- recommendation

---

### FR-07 — Fast/slow moving analysis

Classify products using sales velocity and inventory behavior.

Support:

- fast
- normal
- slow
- dead/very slow, if configured

Support ABC-XYZ segmentation in an advanced view.

---

### FR-08 — Festival intelligence

The system must support an Indian event calendar.

For an upcoming festival/event:

1. identify the event
2. identify relevant historical periods
3. compare demand with baseline
4. calculate uplift
5. generate confidence
6. adjust inventory recommendation if justified

No fabricated festival trend may be shown as factual.

---

### FR-09 — Supplier intelligence

Maintain:

- supplier
- GSTIN
- lead time
- MOQ
- price
- reliability
- terms
- preferred SKU mappings

The reorder engine must respect supplier constraints.

---

### FR-10 — Smart reorder recommendation

Each recommendation should include:

```text
SKU
Store
Current stock
Forecast demand
Lead-time demand
Safety stock
On-order stock
Festival adjustment
MOQ
Recommended quantity
Estimated cost
Risk level
Confidence
Explanation
```

---

### FR-11 — Agentic reasoning

The LLM agent shall:

- interpret manager requests
- choose tools
- call forecasting/inventory tools
- synthesize verified outputs
- explain recommendations
- answer inventory questions
- prepare action drafts

It shall not independently invent or mutate core numerical records.

---

### FR-12 — Human approval

Manager can:

- approve
- modify
- reject

The system must store the original recommendation and the final manager decision.

---

### FR-13 — Purchase order generation

After approval, create supplier-wise PO drafts with:

- PO number
- supplier
- store
- line items
- quantities
- unit prices
- subtotal
- taxes
- estimated total
- requested date
- approval reference

---

### FR-14 — Bill scanner

Optional module.

Input:

- PDF
- JPG/PNG
- scanned invoice
- computerized bill
- handwritten/kacha bill

Extract where possible:

- supplier
- invoice number
- date
- GSTIN
- SKU/product
- quantity
- price
- taxes

Uncertain fields must be sent to verification.

---

### FR-15 — GST module

Maintain and report:

- GSTIN
- GST rate
- taxable value
- CGST
- SGST
- IGST
- purchase/sales totals

The application is an AI-assisted retail/accounting layer and is not a replacement for professional tax software.

---

### FR-16 — Sales analytics

Dashboard must support:

- daily sales
- monthly sales
- yearly sales
- SKU sales
- category sales
- regional/store sales
- profit if available
- discount impact
- trend comparisons

---

## 6. Non-Functional Requirements

### Performance

Target MVP:

- API p95 < 1.5 seconds for normal dashboard queries
- cached dashboard queries < 500 ms where practical
- asynchronous model training and OCR
- PO generation < 5 seconds for normal order sizes

### Reliability

- graceful retries
- idempotent ingestion
- background jobs for expensive work
- transactional PO generation
- database backups

### Security

- authentication
- RBAC
- encrypted transport
- secret management
- secure file uploads
- audit logging
- request validation
- least-privilege service access

### Explainability

Every recommendation must expose:

- numerical evidence
- model/version
- key inputs
- business rules applied
- confidence
- timestamp

### Privacy

Use minimum necessary customer information. Customer-level data should not be sent to an external LLM unless specifically required, authorized, and protected.

---

## 7. User Stories

### Manager

> As a manager, I want to know which products may stock out before the next supplier delivery so that I can avoid lost sales.

> As a manager, I want a reorder quantity with a clear explanation so that I can make a confident purchasing decision.

> As a manager, I want to approve or modify an AI recommendation before an order is created.

> As a manager, I want to ask the inventory agent natural-language questions instead of manually filtering multiple dashboards.

### Procurement

> As a procurement manager, I want approved recommendations grouped by supplier so that I can create efficient POs.

### Owner

> As an owner, I want to see sales and inventory trends so that I can understand business performance.

---

## 8. Key UX Screens

### Dashboard

- sales KPIs
- stockout alerts
- overstock alerts
- top fast movers
- upcoming festival impact
- pending approvals

### Inventory

- searchable SKU table
- stock level
- days of inventory
- risk badges
- forecast mini-chart

### AI Recommendations

- recommendation cards/table
- evidence
- expected shortage
- suggested quantity
- confidence
- approve/modify/reject

### Agent Chat

Example:

```text
Manager:
"What should I order before Diwali?"

Agent:
"I found 14 high-risk SKUs...
```

The response should show the underlying recommendation evidence.

### Purchase Orders

- supplier grouping
- PO preview
- taxes
- approval history
- export

### Analytics

- monthly/yearly sales
- category trends
- store/region trends

---

## 9. Decision Recommendation UX

Example:

```text
Milk 500ml
────────────────────────────────
Risk: HIGH
Current stock: 80
Forecast (next 7 days): 455
Supplier lead time: 2 days
MOQ: 100
Festival effect: +12% (confidence 0.78)

Recommended quantity: 250

Why:
Current stock is unlikely to cover expected demand during lead time
and the forecast indicates elevated demand.

[Approve] [Modify] [Reject]
```

---

## 10. Success Metrics

### Product metrics

- reduction in stockout events
- reduction in excess inventory
- recommendation acceptance rate
- recommendation modification rate
- PO generation time
- user time saved
- forecast accuracy
- false-positive stockout alerts

### ML metrics

Track:

- MAE
- RMSE
- WAPE/SMAPE
- stockout precision
- stockout recall
- calibration of confidence scores

### Agent metrics

- tool-call correctness
- grounded response rate
- unsupported-claim rate
- approval-policy compliance
- task completion rate

---

## 11. Data Quality Requirements

Data quality checks must cover:

- duplicate sale IDs
- duplicate SKU mappings
- impossible dates
- negative quantities
- invalid GST rates
- missing supplier
- zero/negative unit price
- broken store-product mappings
- missing inventory snapshots

Bad rows should be quarantined, not silently discarded.

---

## 12. Risks

### Risk — LLM hallucination

Mitigation:

- tool-only numerical answers
- structured schemas
- citations to tool results
- guardrails
- no direct database mutation

### Risk — poor forecasting during stockouts

Mitigation:

- explicitly model stockout states
- exclude or correct censored demand where possible
- include stock availability as a feature

### Risk — insufficient historical festival data

Mitigation:

- confidence score
- fallback to generic seasonality
- never invent uplift

### Risk — synthetic data mistaken for real data

Mitigation:

- provenance field
- visible "synthetic/prototype" metadata
- separate benchmark and demo datasets

### Risk — purchase errors

Mitigation:

- manager approval
- transactional PO creation
- audit trail

---

## 13. MVP Scope vs Production Scope

| Capability | MVP | Production |
|---|---|---|
| CSV/XLSX ingestion | Yes | Yes + APIs |
| Demand forecast | Yes | Multi-model registry |
| Stockout | Yes | Calibrated model + business rules |
| Festival | Yes | Regional/event-aware |
| Supplier | Simulated/seeded | ERP/supplier integration |
| LLM agent | Yes | Guarded multi-tool agent |
| PO | Draft | Approved workflow/integration |
| GST | Basic | Integrated reporting |
| OCR | Optional | Production document pipeline |
| Auth | Basic | Enterprise RBAC |
| Monitoring | Basic logs | Full observability |
| Scale | Single deployment | Multi-tenant capable |

---

## 14. Release Criteria

A release is blocked if:

- model evaluation is missing
- schema migrations are untested
- approval can be bypassed
- LLM can directly execute purchases
- sensitive secrets are committed
- production data can be overwritten without audit trail
- forecast leakage is detected
- generated synthetic data is mislabeled as real
