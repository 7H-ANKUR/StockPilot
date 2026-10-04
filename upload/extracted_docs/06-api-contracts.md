# 06 - API Contracts

## 1. API Security & Design Principles
* **Authentication**: All endpoints require valid JWT/Session tokens.
* **Authorization**: Endpoints enforce RBAC (e.g., only `MANAGER` or `OWNER` can trigger `POST /api/v1/recommendations/{id}/approve`).
* **Multi-Tenancy**: All requests implicitly operate within the `tenant_id` associated with the authenticated user.
* **Validation**: Input payloads must be strictly validated (e.g., via Pydantic).

---

## 2. Core REST Endpoints (FastAPI)

### Data Ingestion Layer
* `POST /api/v1/data/import`: Accepts CSV/XLSX/JSON. Triggers async processing pipeline.
* `POST /api/v1/data/validate`: Dry-run validation of data schemas without committing to DB.

### Sales & Analytics
* `GET /api/v1/sales/summary`: Returns aggregate KPIs (daily/monthly revenue, top movers) for dashboards.

### Inventory & Risk
* `GET /api/v1/inventory`: Returns paginated, searchable inventory snapshots with current stock levels.
* `GET /api/v1/inventory/risks`: Filters catalog for items flagging deterministic stockout or overstock risks.

### Forecasting & Festivals
* `POST /api/v1/forecast`: Triggers a batch demand forecasting job for a store/SKU subset.
* `GET /api/v1/products/{id}/forecast`: Retrieves the latest 7/14/30-day forecast array, confidence scores, and model metadata for a specific SKU.
* `GET /api/v1/festivals/upcoming`: Lists relevant upcoming regional events from the festival calendar.
* `POST /api/v1/festival/analyze`: Returns calculated demand uplift (`expected_uplift`, `confidence`, `evidence_days`) for a specified event and SKU.

### Recommendations & Agent Interfacing
* `POST /api/v1/reorders/recommend`: Triggers the Reorder Optimizer engine to generate new AI recommendations for high-risk items.
* `GET /api/v1/recommendations`: Lists AI-generated reorder recommendations pending action.
* `POST /api/v1/agent/chat`: Sends user queries to the LLM agent, returning structured explanations and tool invocations.

### Manager Approval State Machine
* `POST /api/v1/recommendations/{id}/approve`: Transitions a recommendation from `DRAFT` to `APPROVED`. Creates an `approvals` audit log entry.
* `POST /api/v1/recommendations/{id}/modify`: Accepts a new `final_qty`, logs the change, and transitions to `MODIFIED` (effectively approved with changes).
* `POST /api/v1/recommendations/{id}/reject`: Transitions to `REJECTED`. Dismisses the recommendation.

### Procurement & POs
* `POST /api/v1/purchase-orders`: Aggregates all `APPROVED` recommendations by `supplier_id` and generates PO drafts.
* `GET /api/v1/purchase-orders`: Lists POs by status (DRAFT, SENT, etc.).

### GST & Bill Scanning
* `POST /api/v1/bills/scan`: Uploads PDF/JPG invoices for async OCR and data extraction.
* `GET /api/v1/gst/reports`: Returns aggregated purchase/sales tax totals for a given period.

---

## 3. Internal Agent Tool Contracts (Schemas)

Tools available to the LLM agent return strictly typed JSON structures.

**Example `get_supplier_constraints` Output:**
```json
{
  "supplier_id": "uuid-1234",
  "supplier_name": "ABC Distributors",
  "lead_time_days": 3,
  "min_order_qty": 50,
  "payment_terms": "Net 30"
}
```

**Example `analyze_festival_impact` Output:**
```json
{
  "event": "Diwali",
  "sku": "SKU-001",
  "expected_uplift": 0.31,
  "forecast_units": 142,
  "confidence": 0.78,
  "evidence_days": 84
}
```

**Example `calculate_reorder_quantity` Output:**
```json
{
  "sku": "SKU-001",
  "recommended_quantity": 250,
  "estimated_cost": 7000,
  "risk_level": "HIGH",
  "confidence": 0.84,
  "limiting_constraint": "MOQ_ENFORCED"
}
```
