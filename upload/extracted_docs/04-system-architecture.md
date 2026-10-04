# 04 - System Architecture

## 1. Architecture Vision
Build an India-focused, production-ready Agentic AI inventory platform that sits above existing retail/POS systems.

**The architecture separates four concerns:**
1. **DATA**: Canonical storage and ingestion of facts.
2. **ANALYTICS / ML**: Feature engineering, forecasting models, and risk computations.
3. **DECISION ENGINE**: Deterministic inventory rules (MOQ, lead times, safety stocks).
4. **AGENTIC ORCHESTRATION**: LLM reasoning, workflow coordination, and explanation generation.

*The central architectural rule is: Deterministic services and ML models own numerical truth; the LLM owns orchestration, interpretation, explanation, and controlled workflow coordination. The LLM does NOT replace the forecasting engine.*

---

## 2. Logical Components

### 2.1 Frontend (React + Tailwind)
**Responsibilities:** Authentication UI, dashboards, inventory views, forecast visualizations, recommendation reviews, conversational agent chat, PO review, analytics, and bill verification.
*The frontend never communicates directly with the database.*

### 2.2 API Gateway / Backend (FastAPI)
**Responsibilities:** User session/auth verification, RBAC (Role-Based Access Control) enforcement, request validation, API routing, rate limiting, and response normalization.

### 2.3 Domain Services (Python)
* **Data Ingestion Service**: File upload, source connectors, batch imports, schema validation, deduplication, and data-quality reporting.
* **Data Processing Service**: Cleaning, normalization, feature engineering, aggregation, and stockout-aware transformations.
* **Forecasting Service**: Feature retrieval, model selection, inference, confidence interval estimation, forecast persistence, and model version tracking.
* **Inventory Decision Engine**: Stock coverage, days of inventory, stockout/overstock rules, safety stock calculation, reorder points, and movement classification (ABC-XYZ). *Owns deterministic inventory calculations.*
* **Festival Intelligence Service**: Event catalog matching, historical comparison, uplift calculation, and confidence scoring based on regional relevance.
* **Supplier/Procurement Service**: Enforces supplier constraints (MOQ, lead time, pricing), manages order grouping, and drafts Purchase Orders.

### 2.4 Agent Service
**Responsibilities:** Conversation state management, intent recognition, tool selection, tool invocation, structured reasoning, answer generation, and approval workflow coordination.
*The agent should never bypass domain services or mutate data directly.*

---

## 3. Data Flow

### 3.1 Sales to Forecast Flow
`POS transaction` -> `Validation` -> `Canonical sale` -> `Daily SKU-store aggregation` -> `Feature computation` -> `Forecast model` -> `Forecast table`

### 3.2 Forecast to Recommendation Flow
`Forecast` + `current stock` + `lead time` + `safety stock` + `on-order qty` + `festival uplift` + `MOQ` -> `Reorder optimizer` -> `Recommendation`

### 3.3 Recommendation to Agent Flow
`Recommendation facts` -> `Tool response` -> `LLM explanation` -> `Manager-facing decision`

---

## 4. Agent Architecture & State Machine

### 4.1 Tool Architecture
Tools are explicit backend functions. The Agent Gateway routes to:
* `sales_summary`
* `inventory_snapshot`
* `forecast_demand`
* `stockout_risk` & `overstock_risk`
* `festival_analysis`
* `supplier_constraints`
* `reorder_calculation`
* `po_draft`

**Tool Rules:** Each tool validates arguments, checks user permissions, reads only required data, returns strictly typed outputs (schemas), and logs request metadata.

### 4.2 Agent State Machine
1. **USER_REQUEST**: Receives natural language input.
2. **INTENT_DETECTION**: Parses the user goal.
3. **PLAN**: Determines which tools to use.
4. **TOOL_EXECUTION**: Invokes backend functions.
5. **RESULT_VALIDATION**: Ensures tool outputs meet schema requirements.
6. **REASONING**: Synthesizes the results.
7. **RECOMMENDATION**: Presents the finding to the user.
8. **WAIT_FOR_APPROVAL**: Pauses for human interaction (Approve/Reject/Modify).
9. **PO_DRAFT** (If approved): Triggers procurement downstream.
10. **DONE**.

---

## 5. Multi-Tenancy & Security
* **Tenant Boundary**: Every business-owned entity carries a `tenant_id`. All queries must be tenant-scoped.
* **Cost Architecture**: LLM spend is controlled by using structured tool outputs (not sending raw tables), caching repeated analytics, using smaller models for routing, and performing numerical work in Python/SQL.
