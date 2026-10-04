# AI Inventory Decision Agent — Architecture

## 1. Architecture Vision

Build an **India-focused, production-ready Agentic AI inventory platform** that sits above existing retail/POS systems.

The architecture separates four concerns:

```text
DATA
  ↓
ANALYTICS / ML
  ↓
DECISION ENGINE
  ↓
AGENTIC ORCHESTRATION
```

The LLM does not replace the data or ML layers.

The central architectural rule is:

> **Deterministic services and ML models own numerical truth; the LLM owns orchestration, interpretation, explanation, and controlled workflow coordination.**

---

## 2. High-Level Architecture

```text
                    ┌─────────────────────────────┐
                    │          USERS              │
                    │ Manager / Procurement /     │
                    │ Owner / Finance / Analyst   │
                    └──────────────┬──────────────┘
                                   │
                                   v
                    ┌─────────────────────────────┐
                    │      React Web Application   │
                    │  Dashboard / Inventory /     │
                    │  Agent / Recommendations /  │
                    │  POs / Analytics             │
                    └──────────────┬──────────────┘
                                   │ HTTPS
                                   v
                    ┌─────────────────────────────┐
                    │       API / BFF Layer        │
                    │ FastAPI + Auth + RBAC +      │
                    │ Validation + Rate Limiting   │
                    └──────────────┬──────────────┘
                                   │
          ┌────────────────────────┼─────────────────────────┐
          │                        │                         │
          v                        v                         v
┌──────────────────┐    ┌────────────────────┐    ┌──────────────────┐
│ Data Ingestion   │    │ Inventory / ML     │    │ Procurement      │
│ CSV/XLSX/API     │    │ Forecast/Risk      │    │ Suppliers/PO     │
└────────┬─────────┘    └──────────┬─────────┘    └────────┬─────────┘
         │                          │                       │
         └──────────────┬───────────┴──────────────┬────────┘
                        v                          v
              ┌──────────────────┐       ┌──────────────────┐
              │ PostgreSQL       │       │ Redis / Workers  │
              │ Transaction Data │       │ Async Processing │
              └────────┬─────────┘       └──────────────────┘
                       │
                       v
              ┌──────────────────┐
              │ Feature / Model  │
              │ Artifacts        │
              └────────┬─────────┘
                       │
                       v
              ┌──────────────────┐
              │     LLM Agent    │
              │ Tool Calling +   │
              │ Reasoning        │
              └────────┬─────────┘
                       │
                       v
              ┌──────────────────┐
              │ Recommendation   │
              │ + Explanation    │
              └────────┬─────────┘
                       │
                       v
              ┌──────────────────┐
              │ Human Approval   │
              └────────┬─────────┘
                       │
                       v
              ┌──────────────────┐
              │ Purchase Order   │
              └──────────────────┘
```

---

## 3. Architectural Layers

### Layer 1 — Experience

React + Tailwind frontend.

Responsibilities:

- dashboards
- tables
- charts
- agent chat
- recommendation review
- approval
- PO workflow
- bill verification

---

### Layer 2 — Application/API

FastAPI.

Responsibilities:

- user session/auth
- request validation
- routing
- orchestration entry points
- API versioning
- authorization

---

### Layer 3 — Domain Services

Separate domain services for:

- Sales
- Inventory
- Forecasting
- Festival Intelligence
- Suppliers
- Procurement
- GST
- Documents

These services own business logic.

---

### Layer 4 — Agentic Intelligence

LLM + tools.

The agent may:

- determine which tools are necessary
- retrieve relevant aggregates
- compare outputs
- explain risk
- prepare recommendations
- request human action

The agent may not:

- directly write raw inventory quantities
- bypass validation
- generate an executable purchase without approval
- invent missing supplier information

---

### Layer 5 — Data

PostgreSQL stores canonical application data.

Object storage stores:

- raw datasets
- imported documents
- generated reports
- model artifacts, where appropriate

Redis supports:

- caching
- rate limiting
- background-job coordination

---

## 4. Data Flow

### Sales → forecast

```text
POS transaction
   ↓
Validation
   ↓
Canonical sale
   ↓
Daily SKU-store aggregation
   ↓
Feature computation
   ↓
Forecast model
   ↓
Forecast table
```

### Forecast → recommendation

```text
Forecast
 + current stock
 + lead time
 + safety stock
 + on-order quantity
 + festival uplift
 + MOQ
        ↓
Reorder optimizer
        ↓
Recommendation
```

### Recommendation → agent

```text
Recommendation facts
        ↓
Tool response
        ↓
LLM explanation
        ↓
Manager-facing decision
```

---

## 5. Agent Architecture

### Agent components

```text
Agent Gateway
      ↓
Intent Parser
      ↓
Planner
      ↓
Tool Registry
      ↓
Tool Execution
      ↓
Result Validator
      ↓
Response Composer
```

### Tool registry

```text
sales_summary
inventory_snapshot
forecast_demand
stockout_risk
overstock_risk
movement_classification
festival_analysis
supplier_constraints
reorder_calculation
po_draft
```

All tools return typed schemas.

---

## 6. Model Architecture

### Forecasting

Recommended progression:

```text
Naive baseline
      ↓
Scikit-learn baseline
      ↓
Gradient boosted model
      ↓
Specialized time-series model if justified
```

Inputs:

- historical sales
- rolling statistics
- seasonality
- holiday/festival
- promotion
- price
- store
- category
- inventory availability

### Stockout

Use:

```text
Deterministic coverage engine
+
ML stockout probability
```

### Product intelligence

Use:

- structured catalog fields
- embeddings/search when needed
- LLM for natural-language understanding

---

## 7. India-Centric Data Architecture

Core public/benchmark inputs:

```text
Supermart Grocery Sales
        +
Indian Retail Sales Analytics
        +
BigBasket product catalog
        +
Indian Superstore Sales
        +
SupplyStream synthetic supply chain
        +
Whylogs Indian grocery dataset
```

### Intended use

| Source | Intended use |
|---|---|
| Supermart Grocery Sales | Indian grocery sales/forecasting baseline |
| Indian Retail Sales Analytics | secondary India-wide validation |
| BigBasket | Indian product catalog enrichment |
| Indian Superstore Sales | secondary sales validation |
| SupplyStream | inventory/supplier/logistics simulation |
| Whylogs Ecommerce | product intelligence/classification |

### Dataset provenance rule

Each imported row should carry a source/provenance indicator whenever practical.

---

## 8. Terminal-First Dataset Provisioning

The project must be buildable by an autonomous coding agent from a terminal.

### Provisioning sequence

```bash
mkdir -p data/raw
python -m pip install kaggle
```

### Supermart Grocery Sales

```bash
kaggle datasets download \
  -d mohamedharris/supermart-grocery-sales-retail-analytics-dataset \
  -p data/raw/supermart \
  --unzip
```

### Indian Retail Sales Analytics

```bash
git clone \
  https://github.com/sachin-as-DA/Indian-Retail-Sales-Analytics.git \
  data/raw/indian-retail-sales
```

### Indian Superstore Sales

```bash
git clone \
  https://github.com/Kashb-shielah/superstore-sales-analysis.git \
  data/raw/indian-superstore
```

### SupplyStream

```bash
git clone \
  https://github.com/MMathew4788/SupplyStream-Analytics-for-Retail-Logistics.git \
  data/raw/supplystream

cd data/raw/supplystream
python -m pip install numpy pandas faker
python generate_data.py
cd ../../..
```

### BigBasket

```bash
kaggle datasets download \
  -d surajjha101/bigbasket-entire-product-list-28k-datapoints \
  -p data/raw/bigbasket \
  --unzip
```

### Whylogs

```bash
python -m pip install "whylogs[datasets]"
python - <<'PY'
from whylogs.datasets import Ecommerce
Ecommerce(version="base")
print("Whylogs Ecommerce data is available under ./whylogs_data")
PY
```

---

## 9. Autonomous-Agent Dataset Fallback

A build agent must never stop because an external dataset cannot be downloaded.

Required policy:

```text
1. Try terminal acquisition.
2. Validate download.
3. Validate expected schema.
4. Record source and failure reason.
5. If unavailable, generate synthetic prototype data.
6. Continue implementation.
```

Create:

```text
scripts/generate_prototype_data.py
```

The generator should produce deterministic data for:

- products
- stores
- daily sales
- inventory snapshots
- suppliers
- supplier-product mappings
- purchase history
- festivals
- GST transactions

Set:

```text
SYNTHETIC_DATA=true
SYNTHETIC_SEED=42
```

This allows demos and CI to run offline.

---

## 10. Production Infrastructure

Recommended deployment pattern:

```text
CDN / Frontend Hosting
          |
          v
      Load Balancer
          |
     +----+----+
     |         |
 API Service  Worker Service
     |         |
     +----+----+
          |
    PostgreSQL
          |
        Redis
          |
    Object Storage
          |
    Model Registry
          |
     LLM Provider
```

### Compute separation

Keep:

- web serving
- API
- worker/async tasks
- model training

as separate workloads when scale requires it.

---

## 11. Environments

### Development

Local Docker Compose.

### Staging

Production-like services with isolated data.

### Production

Managed:

- PostgreSQL
- Redis
- object storage
- secrets
- container deployment
- monitoring

Never share production credentials with local development.

---

## 12. Security

### Authentication

Use an established identity mechanism.

### Authorization

RBAC:

```text
ADMIN
OWNER
MANAGER
PROCUREMENT
FINANCE
ANALYST
```

### Data security

- TLS everywhere
- encrypted storage
- managed secrets
- secure file upload scanning
- input validation
- output encoding
- rate limiting

### LLM security

Defend against:

- prompt injection
- data exfiltration
- tool abuse
- unauthorized actions
- tenant-data leakage

Tool access must be permission-aware.

---

## 13. Audit Architecture

Audit events should record:

```text
event_id
tenant_id
user_id
action
resource_type
resource_id
request_id
old_value
new_value
timestamp
source
```

Log all:

- recommendation approvals
- modifications
- rejections
- PO creations
- supplier changes
- model deployments
- configuration changes

---

## 14. Observability

### Application

Track:

- request volume
- latency
- errors
- active jobs

### ML

Track:

- forecast accuracy
- feature drift
- prediction drift
- model version
- stockout precision/recall

### Agent

Track:

- tool call count
- tool failures
- invalid arguments
- unsupported answer rate
- response latency
- approval-policy violations

---

## 15. Reliability and Degradation

The app must remain useful when individual services fail.

### LLM unavailable

Fallback to normal dashboard + deterministic recommendation engine.

### Forecast model unavailable

Fallback to approved baseline forecast.

### Redis unavailable

Background jobs can be paused/retried safely.

### Supplier API unavailable

Show saved supplier data and prevent external PO transmission.

### OCR unavailable

Allow manual invoice entry.

---

## 16. Scalability Strategy

### Early scale

One API deployment + one worker + managed database.

### Growing scale

- horizontal API replicas
- worker pool
- PostgreSQL read replicas if needed
- partition large fact tables
- caching for dashboards
- object storage for large documents
- scheduled batch inference

### Large-scale retail

Partition by:

```text
tenant
store
date
```

and use aggregate tables/materialized views for dashboard workloads.

---

## 17. Production Database Strategy

Use migrations for all schema changes.

Requirements:

- migration versioning
- backward-compatible releases where practical
- indexes based on actual query plans
- unique constraints
- foreign keys
- check constraints
- transaction boundaries

Critical examples:

```text
quantity > 0
price >= 0
gst_rate >= 0
MOQ > 0
```

---

## 18. Cost Architecture

Control LLM spend by:

1. using structured tool outputs
2. not sending raw transaction tables to the LLM
3. caching repeated analytics
4. using smaller models for classification/routing
5. reserving stronger models for complex decisions
6. performing numerical work in Python/SQL
7. truncating unnecessary conversation history

---

## 19. Deployment Pipeline

```text
Developer
   ↓
Pull Request
   ↓
CI
 ├─ lint
 ├─ tests
 ├─ security scan
 ├─ ML validation
 └─ Docker build
   ↓
Staging
   ↓
Integration + E2E
   ↓
Approval
   ↓
Production
```

Production database migrations must be reviewed.

---

## 20. Disaster Recovery

Minimum production plan:

```text
PostgreSQL
  → automated backups
  → point-in-time recovery

Object storage
  → versioning
  → lifecycle policies

Models
  → immutable versions
  → rollback

Configuration
  → version-controlled
  → secrets in managed store
```

Define and document RPO/RTO before production launch.

---

## 21. Architecture Decision Records

### ADR-001 — LLM is not the forecasting engine

**Decision:** Use specialized numerical/ML services for forecasting and deterministic calculations.

**Reason:** Better accuracy, testability, reproducibility, lower token cost, and lower hallucination risk.

---

### ADR-002 — Human approval before purchasing

**Decision:** Purchase actions remain human-in-the-loop.

**Reason:** Financial and operational consequences require explicit authorization.

---

### ADR-003 — India-first benchmark data

**Decision:** Prefer Indian retail datasets and an Indian festival/calendar layer.

**Reason:** Project target is Indian retail; local product, seasonality, categories and events are more relevant than foreign supermarket datasets.

---

### ADR-004 — Synthetic supply-chain layer

**Decision:** Use explicitly synthetic supplier/inventory data when public Indian datasets do not contain sufficient lead-time/MOQ/purchase information.

**Reason:** Avoid inventing provenance while still enabling end-to-end prototype testing.

---

### ADR-005 — Offline-capable prototype

**Decision:** Maintain a deterministic synthetic dataset generator.

**Reason:** Autonomous development and CI should not depend on external dataset availability or credentials.

---

## 22. Production Readiness Checklist

### Product

- [ ] all critical user flows implemented
- [ ] manager approval enforced
- [ ] recommendation explanations visible
- [ ] PO lifecycle complete

### Data

- [ ] schema validation
- [ ] provenance
- [ ] data-quality jobs
- [ ] backups
- [ ] retention policy

### ML

- [ ] baseline
- [ ] time-based validation
- [ ] model registry/versioning
- [ ] drift monitoring
- [ ] rollback

### Agent

- [ ] tool schemas
- [ ] permission-aware tools
- [ ] prompt injection protection
- [ ] numerical grounding
- [ ] audit trail

### Security

- [ ] RBAC
- [ ] encrypted transport
- [ ] secrets management
- [ ] secure uploads
- [ ] dependency scanning
- [ ] tenant isolation

### Operations

- [ ] CI/CD
- [ ] staging
- [ ] monitoring
- [ ] alerting
- [ ] backups
- [ ] disaster recovery
- [ ] runbooks

---

## 23. Final Architecture Summary

The production-ready design is:

```text
Indian Retail Data
       ↓
Canonical Data Platform
       ↓
ML + Inventory Intelligence
       ↓
Deterministic Reorder Engine
       ↓
Agentic LLM Orchestration
       ↓
Explainable Recommendation
       ↓
Human Approval
       ↓
Supplier-aware Purchase Order
       ↓
Audit + Monitoring
```

The system is therefore not "a chatbot for inventory."

It is a **decision intelligence platform** where:

- data provides evidence
- ML predicts
- deterministic rules constrain
- the LLM reasons and coordinates
- the manager authorizes
- the procurement service executes the approved workflow
- monitoring and audit make the complete process production-operable.
