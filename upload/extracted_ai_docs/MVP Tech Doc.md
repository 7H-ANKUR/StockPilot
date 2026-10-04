# AI Inventory Decision Agent — MVP Technical Document

> **Project:** AI Inventory Decision Agent  
> **Target:** Indian supermarkets, mini-supermarkets, organized retail stores, and wholesalers  
> **Document purpose:** Implementation blueprint for a working MVP that can be extended into production.

## 1. Project Definition

The AI Inventory Decision Agent is an intelligence layer placed on top of existing retail systems. It ingests POS, inventory, purchase, supplier, and GST/accounting information and converts the data into proactive inventory decisions.

The core MVP flow is:

```text
Retail Data
   ↓
Data Ingestion + Validation
   ↓
Feature Engineering
   ↓
Demand Forecasting
   ↓
Stock/Risk Analysis
   ↓
Supplier Constraint Analysis
   ↓
Reorder Optimizer
   ↓
LLM Agent Reasoning
   ↓
Explainable Recommendation
   ↓
Manager Approval / Modification / Rejection
   ↓
Supplier-wise Purchase Order
```

The supplied project concept explicitly prioritizes POS + inventory ingestion, stock-out prediction, demand forecasting, festival-aware recommendations, smart reorder quantity, manager approval, PO generation, and sales visualization. GST and bill scanning are supporting modules.

This document adds implementation details needed to make that concept buildable and production-extensible.

---

## 2. MVP Goals

### Functional goals

1. Import retail sales/POS data.
2. Maintain a normalized product, store, inventory, supplier, and purchase model.
3. Train and serve a demand forecasting model.
4. Detect potential stock-outs.
5. Detect overstock.
6. Classify fast/slow movers.
7. Apply an India-specific festival/calendar layer.
8. Calculate reorder quantities using demand + lead time + safety stock + MOQ.
9. Expose forecasting and inventory capabilities as backend tools.
10. Let an LLM agent call those tools and reason over results.
11. Provide explainable recommendations.
12. Require manager approval before purchase-order creation.
13. Generate supplier-wise purchase orders.
14. Show monthly/yearly/product/category sales analytics.

### Non-goals for the first MVP

- Replacing a supermarket POS.
- Fully automated purchasing with no approval.
- Filing statutory GST returns.
- Voice-based sales entry.
- Building a foundation model from scratch.
- Processing millions of raw transactions inside the LLM context window.

---

## 3. Recommended MVP Stack

| Layer | Technology |
|---|---|
| Frontend | React + Tailwind CSS |
| API | Python + FastAPI |
| Agent | LLM API + tool/function calling |
| ML | Pandas, NumPy, Scikit-learn; optional LightGBM/XGBoost for production comparison |
| Forecasting | Feature-based forecasting first; specialized time-series model where justified |
| Database | PostgreSQL |
| Caching/queue | Redis |
| Background jobs | Celery/RQ or equivalent |
| Charts | Recharts or Plotly |
| OCR | OCR + vision model |
| Documents | Python PDF/report generation |
| Containerization | Docker |
| Reverse proxy | Nginx or managed cloud ingress |
| CI/CD | GitHub Actions |
| Observability | Structured logs + metrics + traces |
| Deployment | Managed cloud PostgreSQL + container platform |

---

## 4. Repository Structure

```text
ai-inventory-agent/
├── apps/
│   ├── web/                         # React frontend
│   └── api/                         # FastAPI backend
├── agent/
│   ├── prompts/
│   ├── tools/
│   ├── policies/
│   └── schemas/
├── ml/
│   ├── datasets/
│   ├── preprocessing/
│   ├── features/
│   ├── training/
│   ├── evaluation/
│   ├── inference/
│   └── artifacts/
├── data/
│   ├── raw/
│   ├── processed/
│   ├── synthetic/
│   └── manifests/
├── services/
│   ├── ingestion/
│   ├── forecasting/
│   ├── inventory/
│   ├── procurement/
│   ├── gst/
│   └── document_processing/
├── db/
│   ├── migrations/
│   └── seed/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── ml/
│   └── e2e/
├── infra/
│   ├── docker/
│   ├── github-actions/
│   └── deployment/
├── scripts/
│   ├── download_datasets.py
│   ├── generate_prototype_data.py
│   └── seed_demo.py
├── docs/
├── .env.example
├── docker-compose.yml
└── README.md
```

---

## 5. India-Focused Dataset Plan

Do not depend on a single dataset. Use a layered dataset strategy.

### Dataset A — Supermart Grocery Sales

**Use:** baseline Indian grocery sales, category trends, regional analysis, discount/profit relationships, initial forecasting experiments.

Source:

```text
https://www.kaggle.com/datasets/mohamedharris/supermart-grocery-sales-retail-analytics-dataset
```

Terminal method:

```bash
python -m pip install kaggle
kaggle datasets download \
  -d mohamedharris/supermart-grocery-sales-retail-analytics-dataset \
  -p data/raw/supermart \
  --unzip
```

If Kaggle authentication is unavailable, do not block the build. Generate an equivalent synthetic prototype dataset with `scripts/generate_prototype_data.py` using the expected schema.

---

### Dataset B — Indian Retail Sales Analytics

**Use:** India-wide secondary sales validation and regional/product forecasting.

Source repository:

```text
https://github.com/sachin-as-DA/Indian-Retail-Sales-Analytics
```

Terminal method:

```bash
git clone https://github.com/sachin-as-DA/Indian-Retail-Sales-Analytics.git \
  data/raw/indian-retail-sales
```

Expected source workbook includes the cleaned transaction dataset.

Important: treat it as an India-oriented analytical/benchmark dataset, not unquestioned ground truth. Perform schema and data-quality validation before training.

---

### Dataset C — BigBasket Entire Product List

**Use:** Indian product catalog enrichment, category/brand normalization, product descriptions, price intelligence, and LLM product understanding.

Source:

```text
https://www.kaggle.com/datasets/surajjha101/bigbasket-entire-product-list-28k-datapoints
```

Terminal method:

```bash
kaggle datasets download \
  -d surajjha101/bigbasket-entire-product-list-28k-datapoints \
  -p data/raw/bigbasket \
  --unzip
```

If authentication or download is unavailable, use the Whylogs dataset path below or generate a local product-catalog prototype with the same target fields.

---

### Dataset D — Indian Superstore Sales

**Use:** secondary validation of Indian retail sales patterns and regional/product performance.

Repository:

```text
https://github.com/Kashb-shielah/superstore-sales-analysis
```

Terminal method:

```bash
git clone https://github.com/Kashb-shielah/superstore-sales-analysis.git \
  data/raw/indian-superstore
```

The repository contains `superstore-sales-analysis.xlsx`.

If repository access is unavailable, generate a prototype dataset with the script described below.

---

### Dataset E — SupplyStream

**Use:** supplier, lead-time, inventory, reorder-point, logistics and replenishment simulation.

Repository:

```text
https://github.com/MMathew4788/SupplyStream-Analytics-for-Retail-Logistics
```

Terminal method:

```bash
git clone https://github.com/MMathew4788/SupplyStream-Analytics-for-Retail-Logistics.git \
  data/raw/supplystream

cd data/raw/supplystream
python -m pip install numpy pandas faker
python generate_data.py
cd ../../..
```

This is synthetic by design. Keep that provenance explicit.

If the repository cannot be downloaded, the agent must generate a local supply-chain simulator using the same concepts:

- suppliers
- supplier reliability
- lead time
- stores
- products
- inventory
- daily orders
- reorder point
- safety stock
- returns/logistics

---

### Dataset F — Whylogs Indian Grocery Ecommerce Dataset

**Use:** product intelligence and an India-specific product classification/discount-supporting signal. It is derived from BigBasket data and contains product description, category, market price, user rating and engineered features.

Source:

```text
https://whylogs.readthedocs.io/en/latest/datasets/ecommerce.html
```

Terminal method:

```bash
python -m pip install "whylogs[datasets]"
python - <<'PY'
from whylogs.datasets import Ecommerce
ds = Ecommerce(version="base")
print("Dataset created/loaded in ./whylogs_data")
PY
```

If this fails because of package/version/environment availability, do not block development. Create `scripts/generate_prototype_data.py` and generate a BigBasket-style product table locally.

---

## 6. Prototype Dataset Fallback Policy

Every data source must have a deterministic fallback.

The implementation agent should follow:

```text
Try terminal download
      ↓
Validate file exists + schema
      ↓
Success → use source dataset
      ↓
Failure → record failure reason
      ↓
Run prototype data generator
      ↓
Generate deterministic seed data
      ↓
Continue development
```

The generator must create realistic but explicitly synthetic data. Never present generated values as real-world observations.

Minimum synthetic tables:

```text
products.csv
stores.csv
sales.csv
inventory_snapshots.csv
suppliers.csv
supplier_products.csv
purchase_orders.csv
purchase_order_lines.csv
festivals.csv
gst_transactions.csv
```

Use a configurable random seed so the same environment can reproduce the same dataset.

---

## 7. Unified Data Contract

Normalize all sources to a common retail schema.

### Sales

```text
sale_id
store_id
product_id
sale_timestamp
quantity
unit_price
discount
net_sales
payment_type
source_dataset
```

### Product

```text
product_id
sku
product_name
brand
category
subcategory
unit
gst_rate
mrp
selling_price
```

### Inventory

```text
inventory_id
store_id
product_id
snapshot_date
on_hand_qty
reserved_qty
damaged_qty
reorder_point
max_stock
```

### Supplier

```text
supplier_id
supplier_name
supplier_gstin
lead_time_days
min_order_qty
reliability_score
payment_terms
```

### Purchase

```text
purchase_order_id
supplier_id
store_id
order_date
status
currency
estimated_total
```

### Festival/Event

```text
event_id
name
event_type
start_date
end_date
region
importance
```

---

## 8. ML Pipeline

```text
Raw CSV/Workbook/API
        ↓
Schema validation
        ↓
Deduplication
        ↓
Type/date normalization
        ↓
Missing-value policy
        ↓
Outlier policy
        ↓
Daily SKU-store aggregation
        ↓
Feature engineering
        ↓
Train/validation/test split by time
        ↓
Model training
        ↓
Backtesting
        ↓
Model registry/artifact
        ↓
Inference API
```

### Features

Core features:

- lags: 1, 3, 7, 14, 28 days
- rolling mean: 7, 14, 28 days
- rolling standard deviation
- weekday
- month
- week-of-year
- holiday indicator
- festival indicator
- promotion/discount
- price
- store
- category
- subcategory
- recent stock-out state
- days since stock-out
- recent sales velocity

### Forecast target

Primary MVP target:

```text
future_quantity_7d
```

Add 14-day and 30-day horizons after the 7-day pipeline is stable.

### Evaluation

Use time-based backtesting.

Primary metrics:

- MAE
- RMSE
- MAPE/SMAPE where mathematically appropriate
- WAPE for aggregate retail evaluation

Always compare against a naive baseline:

```text
forecast(t+7) = recent 7-day average
```

No model should be promoted unless it beats the baseline on the agreed validation windows.

---

## 9. Stock-Out Risk Engine

Stock-out risk should be a deterministic business/ML decision layer, not a free-form LLM guess.

Basic calculation:

```text
LeadTimeDemand = ForecastDailyDemand × SupplierLeadTime
SafetyStock = ServiceFactor × DemandStdDev × sqrt(LeadTime)
RequiredCoverage = LeadTimeDemand + SafetyStock

Risk:
    if AvailableStock < LeadTimeDemand:
        HIGH
    if AvailableStock < RequiredCoverage:
        WATCH/HIGH
    else:
        SAFE
```

The exact policy must remain configurable per store/category.

The trained stock-out model may add a probability estimate:

```text
P(stockout within N days)
```

The UI should show both the probability and the deterministic reason.

---

## 10. Overstock Detection

Recommended starting rule:

```text
DaysOfInventory = AvailableStock / max(ForecastDailyDemand, epsilon)
```

Flag overstock when:

```text
DaysOfInventory > configured_threshold
```

Enhance with:

- slow-moving classification
- demand trend
- expiry risk for perishable products
- seasonal decline
- margin
- historical sell-through

---

## 11. Fast/Slow-Moving Intelligence

Compute:

```text
sales_velocity
inventory_turnover
days_of_inventory
revenue_contribution
demand_variability
```

Classify using an ABC-XYZ style framework.

Example:

```text
A-X = high value, stable demand
A-Z = high value, unpredictable demand
C-X = low value, stable demand
C-Z = low value, unpredictable demand
```

This classification should be recomputed periodically.

---

## 12. Festival-Aware Forecasting

Create an India-specific event table.

Examples:

```text
Diwali
Holi
Raksha Bandhan
Eid
Navratri
Dussehra
Christmas
Pongal
Onam
Independence Day
Republic Day
regional/state festivals
```

Do not hard-code an uplift like “Diwali means +50%”.

Instead:

```text
historical festival sales
        +
matched non-festival baseline
        +
current trend
        +
promotion effect
        +
regional relevance
        ↓
festival uplift estimate
```

Return:

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

Low historical evidence must produce low confidence.

---

## 13. Reorder Optimization

Recommended formula:

```text
ExpectedDemandDuringLeadTime
+ SafetyStock
+ ExpectedFestivalBuffer
- AvailableStock
- OnOrderStock
= GrossReorderNeed
```

Then apply supplier constraints:

```text
if reorder_need <= 0:
    no order

else:
    quantity = max(reorder_need, MOQ)

quantity = ceil_to_pack_size(quantity)
```

Optional cost-aware optimization can later consider:

```text
holding_cost
stockout_cost
purchase_cost
supplier discount
MOQ
budget
```

---

## 14. LLM Agent Design

The LLM is not the forecasting model.

The LLM is the:

- reasoning layer
- planner
- tool selector
- explanation generator
- workflow coordinator

### Tool contract

Suggested tools:

```text
get_sales_summary()
get_inventory_snapshot()
forecast_demand()
get_stockout_risk()
get_overstock_risk()
get_movement_classification()
analyze_festival_impact()
get_supplier_constraints()
calculate_reorder_quantity()
create_purchase_order_draft()
validate_purchase_order()
```

### Example agent loop

```text
User: "What should I reorder before Diwali?"

LLM
 ↓
get_inventory_snapshot()
 ↓
forecast_demand()
 ↓
analyze_festival_impact()
 ↓
get_supplier_constraints()
 ↓
calculate_reorder_quantity()
 ↓
LLM synthesizes recommendation
 ↓
Manager approval
 ↓
create_purchase_order_draft()
```

### LLM guardrails

- Never invent numerical facts.
- All quantities must come from tools/calculations.
- Never directly execute purchasing without approval.
- Do not expose raw database credentials.
- Do not accept arbitrary SQL from user input.
- Return structured JSON for important decisions.
- Include confidence and evidence references where available.
- Refuse to create a PO when mandatory supplier fields are missing.
- Log every tool call and decision.

---

## 15. Core API Endpoints

```text
POST /api/v1/data/import
POST /api/v1/data/validate
GET  /api/v1/sales/summary
GET  /api/v1/inventory
GET  /api/v1/inventory/risks
POST /api/v1/forecast
GET  /api/v1/products/{id}/forecast
GET  /api/v1/festivals/upcoming
POST /api/v1/festival/analyze
POST /api/v1/reorders/recommend
GET  /api/v1/recommendations
POST /api/v1/recommendations/{id}/approve
POST /api/v1/recommendations/{id}/modify
POST /api/v1/recommendations/{id}/reject
POST /api/v1/purchase-orders
GET  /api/v1/purchase-orders
POST /api/v1/bills/scan
GET  /api/v1/gst/reports
```

All write APIs should be authenticated and authorized.

---

## 16. Manager Approval State Machine

```text
DRAFT
  ↓
PENDING_REVIEW
  ├──→ MODIFIED
  │       ↓
  │   PENDING_REVIEW
  ├──→ REJECTED
  └──→ APPROVED
           ↓
       PO_GENERATED
```

A recommendation must retain:

- original AI recommendation
- manager modification
- approving user
- timestamp
- reason/comment
- resulting PO reference

---

## 17. Bill Scanner Pipeline

```text
Upload image/PDF
      ↓
Virus/type validation
      ↓
OCR/Vision
      ↓
Field extraction
      ↓
Schema normalization
      ↓
Confidence validation
      ↓
Human verification when uncertain
      ↓
Inventory/Purchase update
```

Never silently post low-confidence OCR output into financial records.

---

## 18. Local Development

### Prerequisites

```text
Python
Node.js
PostgreSQL
Redis
Docker
Git
```

### Setup

```bash
git clone <project-repository>
cd ai-inventory-agent

cp .env.example .env

docker compose up -d postgres redis

python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux/macOS
source .venv/bin/activate

pip install -r apps/api/requirements.txt

cd apps/web
npm install
cd ../..

python scripts/download_datasets.py
python scripts/generate_prototype_data.py
python scripts/seed_demo.py
```

Run:

```bash
uvicorn apps.api.main:app --reload
npm --prefix apps/web run dev
```

---

## 19. Testing Strategy

### Unit

- feature calculations
- reorder formula
- safety stock
- MOQ rounding
- GST calculations
- risk thresholds

### ML

- time split correctness
- leakage tests
- baseline comparison
- model metric thresholds
- inference schema compatibility

### Agent

- tool selection
- tool argument validation
- hallucination resistance
- approval enforcement
- missing-data behavior

### Integration

```text
CSV → database → feature pipeline → forecast API → agent → recommendation → approval → PO
```

### E2E

At least one complete scenario:

```text
Import sales
→ inventory drops
→ festival is upcoming
→ forecast increases
→ stockout risk becomes high
→ reorder recommendation generated
→ manager modifies quantity
→ PO generated
```

---

## 20. MVP Acceptance Criteria

The MVP is considered functional when:

- A dataset can be imported from CSV/XLSX.
- Data validation reports errors without crashing.
- The forecasting endpoint returns a forecast for a SKU/store.
- Stockout risk is calculated.
- Festival context changes the recommendation only when supported by data/configuration.
- Reorder quantity respects MOQ.
- Agent can call the necessary tools.
- Every financial recommendation requires approval.
- Approved recommendations create supplier-wise PO drafts.
- Dashboard can show monthly/yearly sales.
- Prototype data generation works without any external dataset.
- The application runs locally using documented commands.

---

## 21. Production Readiness Gate

Before production:

1. Add authentication and RBAC.
2. Move secrets to managed secret storage.
3. Add managed PostgreSQL backups.
4. Add Redis persistence/HA where needed.
5. Add structured audit logs.
6. Add model/version tracking.
7. Add data-quality checks.
8. Add PII minimization and retention rules.
9. Add rate limiting and API validation.
10. Add monitoring/alerting.
11. Add CI/CD with staging gates.
12. Run security and dependency scans.
13. Add disaster-recovery procedures.
14. Validate model drift.
15. Load-test the APIs and background jobs.

---

## 22. Demo Scenario

Use a simple Indian retail scenario:

```text
Product: Milk 500ml
Current Stock: 80
Daily Demand: ~65
Supplier Lead Time: 2 days
Upcoming Event: Diwali
Festival Uplift: model-derived
MOQ: 100
```

Expected agent behavior:

```text
Analyze current stock
→ forecast demand
→ evaluate festival effect
→ check lead time
→ calculate safety stock
→ respect MOQ
→ explain recommendation
→ ask manager
→ generate PO only after approval
```

---

## 23. Engineering Principle

The system should follow this rule throughout implementation:

> **Numbers are computed by deterministic systems and ML models. The LLM reasons over verified results and coordinates actions.**

That separation is the foundation for an explainable, testable, and production-oriented agent.
