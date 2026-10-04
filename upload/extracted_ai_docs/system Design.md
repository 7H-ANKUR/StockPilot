# AI Inventory Decision Agent — System Design

## 1. System Context

The system is designed as an AI intelligence layer over retail operational systems.

```text
+-----------------------+
| POS / Retail Systems  |
+----------+------------+
           |
           v
+-----------------------+
| Data Ingestion Layer  |
+----------+------------+
           |
           v
+-----------------------+
| Validation + ETL      |
+----------+------------+
           |
           v
+-----------------------+
| PostgreSQL Data Layer |
+----------+------------+
           |
     +-----+-----+----------------------+
     |           |                      |
     v           v                      v
 Forecasting  Inventory Engine    Analytics Engine
     |           |                      |
     +-----------+-----------+----------+
                             |
                             v
                      Reorder Optimizer
                             |
                             v
                       LLM Agent Layer
                             |
                             v
                    Recommendation Service
                             |
                    +--------+--------+
                    |                 |
                    v                 v
               Manager UI       Audit Service
                    |
                    v
              Approval Service
                    |
                    v
             Purchase Order Service
                    |
                    v
                Supplier
```

---

## 2. Logical Components

### Frontend

React + Tailwind.

Responsibilities:

- authentication UI
- dashboard
- inventory
- forecast views
- recommendation review
- agent chat
- PO review
- analytics
- bill verification

The frontend never talks directly to PostgreSQL.

---

### API Gateway / FastAPI

Responsibilities:

- auth verification
- RBAC enforcement
- request validation
- API routing
- rate limiting
- response normalization

---

### Data Ingestion Service

Responsibilities:

- file upload
- source connectors
- batch imports
- incremental imports
- schema validation
- deduplication
- data-quality reports

---

### Data Processing Service

Responsibilities:

- cleaning
- normalization
- feature engineering
- aggregation
- stockout-aware transformations

Heavy processing should run asynchronously.

---

### Forecasting Service

Responsibilities:

- feature retrieval
- model selection
- inference
- confidence interval estimation
- forecast persistence
- model version tracking

---

### Inventory Decision Engine

Responsibilities:

- stock coverage
- days of inventory
- stockout rules
- overstock rules
- safety stock
- reorder point
- movement classification

This service owns deterministic inventory calculations.

---

### Festival Intelligence Service

Responsibilities:

- event catalog
- event/date matching
- historical comparison
- uplift calculation
- confidence
- region relevance

---

### Supplier/Procurement Service

Responsibilities:

- supplier constraints
- MOQ
- lead time
- preferred supplier
- pricing
- order grouping
- PO drafts

---

### Agent Service

Responsibilities:

- conversation state
- intent recognition
- tool selection
- tool invocation
- structured reasoning
- answer generation
- approval workflow coordination

The agent should never bypass domain services.

---

## 3. Agent Tool Architecture

Tools should be explicit backend functions.

```text
LLM Agent
   |
   +--> Sales Tool
   +--> Forecast Tool
   +--> Inventory Risk Tool
   +--> Festival Tool
   +--> Supplier Tool
   +--> Reorder Tool
   +--> Purchase Order Draft Tool
```

Each tool:

1. validates arguments
2. checks user permissions
3. reads only required data
4. returns typed output
5. logs request and result metadata

---

## 4. Agent State Machine

```text
USER_REQUEST
     |
     v
INTENT_DETECTION
     |
     v
PLAN
     |
     v
TOOL_EXECUTION
     |
     v
RESULT_VALIDATION
     |
     v
REASONING
     |
     v
RECOMMENDATION
     |
     +------> NEEDS_CLARIFICATION
     |
     v
WAIT_FOR_APPROVAL
     |
  +--+---------+
  |            |
REJECT       APPROVE
  |            |
  v            v
DONE       PO_DRAFT
               |
               v
             DONE
```

---

## 5. Database Design

### Core entities

```text
tenant
user
role
store
product
supplier
supplier_product
sale
inventory_snapshot
purchase_order
purchase_order_line
festival
forecast
recommendation
recommendation_evidence
approval
invoice
invoice_line
gst_transaction
audit_event
model_version
data_source
data_quality_run
```

### Key relationships

```text
store 1---N sale
product 1---N sale
store 1---N inventory_snapshot
product 1---N inventory_snapshot

supplier 1---N supplier_product
product 1---N supplier_product

purchase_order 1---N purchase_order_line
supplier 1---N purchase_order

recommendation 1---N recommendation_evidence
recommendation 1---N approval

model_version 1---N forecast
data_source 1---N data_quality_run
```

---

## 6. Recommended PostgreSQL Tables

### products

```sql
id UUID PRIMARY KEY
sku TEXT UNIQUE NOT NULL
name TEXT NOT NULL
brand TEXT
category TEXT
subcategory TEXT
unit TEXT
gst_rate NUMERIC
mrp NUMERIC
selling_price NUMERIC
is_active BOOLEAN DEFAULT TRUE
created_at TIMESTAMP
updated_at TIMESTAMP
```

### inventory_snapshots

```sql
id UUID PRIMARY KEY
store_id UUID NOT NULL
product_id UUID NOT NULL
snapshot_date DATE NOT NULL
on_hand_qty NUMERIC NOT NULL
reserved_qty NUMERIC DEFAULT 0
damaged_qty NUMERIC DEFAULT 0
reorder_point NUMERIC
max_stock NUMERIC
```

### forecasts

```sql
id UUID PRIMARY KEY
store_id UUID
product_id UUID NOT NULL
forecast_date DATE NOT NULL
horizon_days INT NOT NULL
predicted_qty NUMERIC NOT NULL
lower_bound NUMERIC
upper_bound NUMERIC
confidence NUMERIC
model_version_id UUID NOT NULL
created_at TIMESTAMP NOT NULL
```

### recommendations

```sql
id UUID PRIMARY KEY
store_id UUID
product_id UUID NOT NULL
supplier_id UUID
recommended_qty NUMERIC NOT NULL
estimated_cost NUMERIC
risk_level TEXT
confidence NUMERIC
reasoning_summary TEXT
status TEXT NOT NULL
model_version_id UUID
created_at TIMESTAMP NOT NULL
```

### approvals

```sql
id UUID PRIMARY KEY
recommendation_id UUID NOT NULL
user_id UUID NOT NULL
action TEXT NOT NULL
original_qty NUMERIC
final_qty NUMERIC
comment TEXT
created_at TIMESTAMP NOT NULL
```

---

## 7. Data Pipeline Design

```text
SOURCE FILE/API
    |
    v
Landing Storage
    |
    v
Schema Validator
    |
    +--> errors → quarantine
    |
    v
Normalizer
    |
    v
Canonical Tables
    |
    v
Feature Pipeline
    |
    v
ML Feature Store / Feature Tables
    |
    +--> Forecast model
    +--> Stockout model
    +--> Movement model
```

Do not train directly from uncontrolled raw files.

---

## 8. Forecasting Architecture

### Baseline

Start with:

```text
7-day rolling average
```

### Model

Create an experiment set of:

- linear regression baseline
- random forest
- gradient boosted trees
- optional LightGBM/XGBoost

Selection is based on time-series backtesting, not training accuracy.

### Model artifact

Store:

```text
model.pkl / model.bin
feature_schema.json
metrics.json
training_metadata.json
data_version.txt
```

The inference service loads a validated model version.

---

## 9. Stock-Out Model

Two-layer approach:

### Layer A — Deterministic coverage engine

Uses:

- current stock
- forecast
- lead time
- safety stock

### Layer B — ML risk model

Optional classifier:

```text
features → probability of stockout within N days
```

Labels should come from actual stockout observations where available.

This separation ensures the system remains operationally interpretable.

---

## 10. Festival Design

The festival service should have:

```text
festival_id
name
region
start_date
end_date
category_relevance
historical_match_rule
```

Historical matching should consider:

- same event
- same category
- same store/region
- equivalent period length
- comparable promotion conditions

Result:

```json
{
  "event": "Diwali",
  "uplift": 0.31,
  "confidence": 0.78,
  "sample_size": 84,
  "reason": "Historical event-window demand exceeded matched baseline."
}
```

---

## 11. Reorder Optimizer

Inputs:

```text
forecast
forecast_uncertainty
current_stock
on_order
lead_time
safety_stock
MOQ
pack_size
festival_buffer
budget
```

Output:

```json
{
  "sku": "SKU-001",
  "quantity": 250,
  "estimated_cost": 7000,
  "risk": "HIGH",
  "confidence": 0.84
}
```

Hard constraints must be enforced by code.

The LLM may explain the output but cannot override constraints.

---

## 12. Purchase Order System

### PO generation rules

- only APPROVED recommendations may generate a PO
- supplier must exist
- supplier SKU mapping must exist
- quantity must satisfy MOQ
- quantities must be positive
- price must come from approved supplier data
- tax calculation must be deterministic
- PO number must be unique
- generation must be idempotent

### PO lifecycle

```text
DRAFT
→ APPROVED
→ SENT
→ ACKNOWLEDGED
→ PARTIALLY_FULFILLED
→ FULFILLED
```

Optional:

```text
CANCELLED
REJECTED
```

---

## 13. Bill Scanner

### Pipeline

```text
File Upload
   ↓
Security Validation
   ↓
OCR/Vision
   ↓
Extraction Schema
   ↓
Confidence Check
   ↓
Human Verification
   ↓
Persist
```

### Extraction schema

```json
{
  "invoice_number": null,
  "invoice_date": null,
  "supplier_name": null,
  "supplier_gstin": null,
  "items": [],
  "subtotal": null,
  "cgst": null,
  "sgst": null,
  "igst": null,
  "total": null,
  "confidence": 0.0
}
```

---

## 14. LLM Context Strategy

Do not place entire transaction tables in the prompt.

Use:

```text
Raw data
  ↓
SQL/Pandas aggregation
  ↓
Relevant structured facts
  ↓
LLM tool output
```

For example:

```json
{
  "sku": "MILK500",
  "avg_daily_sales_28d": 65,
  "forecast_7d": 455,
  "stock": 80,
  "lead_time": 2,
  "moq": 100,
  "festival_uplift": 0.12
}
```

This gives the agent high-value context without wasting tokens.

---

## 15. RAG / Knowledge Layer

Use RAG for:

- supplier policies
- store procurement rules
- product documentation
- festival policy
- internal SOPs
- purchase policies

Do not use RAG as a replacement for transactional queries.

Transactional facts belong in SQL/tools.

---

## 16. Security Architecture

### Authentication

Use secure session/JWT/OIDC depending on deployment.

### Authorization

Roles:

```text
OWNER
MANAGER
PROCUREMENT
FINANCE
ANALYST
ADMIN
```

### Critical permissions

Only authorized users can:

- approve recommendations
- modify approved quantities
- create/send POs
- change supplier constraints
- change model/configuration

---

## 17. Multi-Tenancy

Production design should include a tenant boundary.

Every business-owned entity should carry:

```text
tenant_id
```

Queries must be tenant-scoped.

Recommended protections:

- application-level tenant filters
- database row-level security for higher assurance
- tenant-aware cache keys
- tenant-aware audit logs

---

## 18. Observability

### Logs

Structured JSON logs:

```text
request_id
tenant_id
user_id
service
event
latency_ms
status
```

### Metrics

Track:

```text
forecast_requests_total
forecast_latency
agent_requests_total
tool_errors_total
recommendations_generated
recommendations_approved
recommendations_rejected
po_generation_failures
ocr_failures
data_quality_failures
```

### Tracing

Trace:

```text
user request
→ API
→ agent
→ tool calls
→ DB/model
→ response
```

---

## 19. Failure Handling

### Forecast unavailable

Fallback:

```text
model forecast
→ cached/latest forecast
→ rolling-average baseline
```

### LLM unavailable

The deterministic inventory dashboard must still work.

### Supplier data unavailable

Do not create an executable PO.

### OCR low confidence

Require verification.

### Database unavailable

Read-only cached dashboard where possible; all writes fail safely.

---

## 20. Background Jobs

Use background workers for:

- model training
- nightly feature generation
- daily forecast refresh
- stockout scan
- festival scan
- OCR
- report generation
- data quality checks
- supplier performance aggregation

Example:

```text
00:30  data quality
01:00  feature generation
02:00  forecast
03:00  risk calculation
04:00  recommendation refresh
```

Schedules are examples and should be configurable.

---

## 21. Deployment Architecture

### MVP

```text
Browser
   ↓
Managed frontend
   ↓
FastAPI container
   ↓
PostgreSQL
Redis
Object storage
LLM provider
```

### Production

```text
             Internet
                 |
          Load Balancer
                 |
        +--------+--------+
        |                 |
     Web App           API/App
                          |
             +------------+-------------+
             |            |             |
          PostgreSQL    Redis        Workers
             |                          |
             +----------+---------------+
                        |
                 Object Storage
                        |
             +----------+----------+
             |                     |
        ML artifacts           Documents
             |
         Model Registry
```

Use managed services where available rather than operating databases manually.

---

## 22. Backup / Recovery

Production minimum:

- daily database backups
- point-in-time recovery where available
- object storage versioning
- model artifact versioning
- migration history
- documented restoration procedure

Define:

```text
RPO = acceptable data loss window
RTO = acceptable recovery window
```

The actual values must be selected based on business requirements.

---

## 23. Data Governance

Track provenance:

```text
source_dataset
source_file
ingestion_run
ingestion_timestamp
synthetic_flag
data_version
```

For benchmark/prototype data, distinguish:

```text
REAL_PUBLIC
SYNTHETIC
USER_UPLOADED
CONNECTED_SYSTEM
```

The application must not describe synthetic demo data as real supermarket activity.

---

## 24. ML Lifecycle

```text
Data
 ↓
Validation
 ↓
Training
 ↓
Evaluation
 ↓
Review
 ↓
Version
 ↓
Staging
 ↓
Canary
 ↓
Production
 ↓
Monitor
 ↓
Retrain
```

Track:

- training dataset version
- features
- model hyperparameters
- metrics
- model owner
- approval
- deployment timestamp

---

## 25. CI/CD

Pipeline:

```text
Pull Request
   ↓
Lint
   ↓
Unit Tests
   ↓
Type Checks
   ↓
Security Scan
   ↓
ML Tests
   ↓
Build Docker Images
   ↓
Integration Tests
   ↓
Deploy Staging
   ↓
Smoke Tests
   ↓
Production Approval
```

Never deploy directly from a developer laptop.

---

## 26. System-Level Invariants

These must never be violated:

1. LLM cannot purchase inventory directly.
2. Unapproved recommendations cannot generate POs.
3. Quantities cannot be negative.
4. Supplier MOQ must be honored.
5. Tenant boundaries cannot be bypassed.
6. Numerical outputs must have a source/model.
7. Synthetic data must be labeled.
8. Financial records must be auditable.
9. Low-confidence OCR cannot silently update financial data.
10. Forecast training must be time-aware.

---

## 27. Production Expansion Path

### Phase 1

Prototype + core ML + agent.

### Phase 2

Real POS/ERP integration.

### Phase 3

Multi-store and supplier integrations.

### Phase 4

Advanced demand forecasting and model monitoring.

### Phase 5

Closed-loop procurement with enterprise approval workflows.

The production system should keep the manager approval boundary unless an organization explicitly enables a different policy.
