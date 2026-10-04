# 03 - Information Architecture

## 1. Unified Data Contract

All disparate data sources (CSV, XLSX, APIs) must be normalized into a common retail schema before features are engineered or forecasts run.

### 1.1 Sales Schema
Records every canonical sale transaction.
* `sale_id`: Unique identifier.
* `store_id`: Associated store.
* `product_id`: Mapped to normalized catalog.
* `sale_timestamp`: Datetime of transaction.
* `quantity`: Number of units sold.
* `unit_price`: Price per unit at time of sale.
* `discount`: Any discount applied.
* `net_sales`: Final revenue.
* `payment_type`: Method of payment.
* `source_dataset`: Provenance tracking.

### 1.2 Product Schema
The unified product catalog (SKU Master).
* `product_id`: Internal UUID.
* `sku`: External/Store SKU.
* `product_name`: Full description.
* `brand`, `category`, `subcategory`: Classification hierarchy.
* `unit`: e.g., kg, pieces.
* `gst_rate`: Tax classification.
* `mrp`: Maximum Retail Price.
* `selling_price`: Current store price.

### 1.3 Inventory Schema
Periodic snapshots of stock availability.
* `inventory_id`: Unique snapshot ID.
* `store_id`, `product_id`: Relationships.
* `snapshot_date`: Date of record.
* `on_hand_qty`: Physical stock.
* `reserved_qty`: Stock allocated but not sold.
* `damaged_qty`: Unsellable stock.
* `reorder_point`: Threshold to trigger reorder.
* `max_stock`: Capacity limit for product.

### 1.4 Supplier Schema
Supplier constraints and metadata.
* `supplier_id`, `supplier_name`: Identity.
* `supplier_gstin`: Tax identity.
* `lead_time_days`: Time from PO sent to delivery.
* `min_order_qty` (MOQ): Minimum units supplier will ship.
* `reliability_score`: Historical performance.
* `payment_terms`: Financial terms.

### 1.5 Purchase Order Schema
Tracks procurement actions.
* `purchase_order_id`, `supplier_id`, `store_id`: Relationships.
* `order_date`: Date generated.
* `status`: State machine (DRAFT, APPROVED, SENT, FULFILLED).
* `currency`: Transaction currency.
* `estimated_total`: Financial value.

### 1.6 Festival / Event Schema
India-specific event calendar for demand intelligence.
* `event_id`, `name`: e.g., "Diwali", "Holi".
* `event_type`: Cultural, national, promotional.
* `start_date`, `end_date`: Time bounds.
* `region`: Geographical applicability.
* `importance`: Weight factor for demand impact.

---

## 2. LLM Context Strategy (Information Flow)

**Rule: Do not place entire transaction tables in the LLM prompt.**

Information must be aggregated and summarized before presentation to the LLM to save tokens and prevent hallucination. 

**Data Flow:**
`Raw data -> SQL/Pandas aggregation -> Relevant structured facts -> LLM Tool Output`

**Example of Context provided to the LLM:**
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
*The LLM uses this dense context to synthesize natural language explanations ("Why") for the user, rather than calculating the 455 forecast itself.*

---

## 3. Prototype Dataset Fallback Policy
Every data source must have a deterministic fallback to allow autonomous agents and local environments to function if external downloads fail.

**Pipeline Policy:**
1. Try terminal download.
2. Validate file exists + schema matches.
3. Success -> Use source dataset.
4. Failure -> Record failure reason.
5. Run prototype data generator (`scripts/generate_prototype_data.py`).
6. Generate deterministic seed data using a fixed seed (`SYNTHETIC_SEED=42`).
7. Continue development.

**Mandatory Synthetic Tables to Generate:**
`products.csv`, `stores.csv`, `sales.csv`, `inventory_snapshots.csv`, `suppliers.csv`, `supplier_products.csv`, `purchase_orders.csv`, `purchase_order_lines.csv`, `festivals.csv`, `gst_transactions.csv`.

*Note: Generated data must be explicitly labeled as synthetic to prevent misrepresentation as real-world observations.*
