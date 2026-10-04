# 05 - Database Schema

*Database: PostgreSQL*

## 1. Database Strategy & Guidelines
* **Migrations**: Use migrations (e.g., Alembic) for all schema changes. Migrations must be versioned and backward-compatible where practical.
* **Indexes**: Based on actual query plans.
* **Constraints**: Mandatory use of unique constraints, foreign keys, and check constraints to protect data integrity at the lowest level.
  * *Critical Check Constraints examples:* `quantity > 0`, `price >= 0`, `gst_rate >= 0`, `MOQ > 0`.
* **Multi-Tenancy**: All core tables should include a `tenant_id` for SaaS deployments.

---

## 2. Core Entity Relationships
* `store` (1 --- N) `sale`
* `product` (1 --- N) `sale`
* `store` (1 --- N) `inventory_snapshot`
* `product` (1 --- N) `inventory_snapshot`
* `supplier` (1 --- N) `supplier_product`
* `product` (1 --- N) `supplier_product`
* `purchase_order` (1 --- N) `purchase_order_line`
* `supplier` (1 --- N) `purchase_order`
* `recommendation` (1 --- N) `recommendation_evidence`
* `recommendation` (1 --- N) `approval`
* `model_version` (1 --- N) `forecast`

---

## 3. Core Tables Definition

### `products`
```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
sku TEXT NOT NULL
name TEXT NOT NULL
brand TEXT
category TEXT
subcategory TEXT
unit TEXT
gst_rate NUMERIC CHECK (gst_rate >= 0)
mrp NUMERIC CHECK (mrp >= 0)
selling_price NUMERIC CHECK (selling_price >= 0)
is_active BOOLEAN DEFAULT TRUE
created_at TIMESTAMP
updated_at TIMESTAMP
UNIQUE(tenant_id, sku)
```

### `inventory_snapshots`
```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
store_id UUID NOT NULL
product_id UUID NOT NULL
snapshot_date DATE NOT NULL
on_hand_qty NUMERIC NOT NULL CHECK (on_hand_qty >= 0)
reserved_qty NUMERIC DEFAULT 0 CHECK (reserved_qty >= 0)
damaged_qty NUMERIC DEFAULT 0 CHECK (damaged_qty >= 0)
reorder_point NUMERIC
max_stock NUMERIC
UNIQUE(tenant_id, store_id, product_id, snapshot_date)
```

### `forecasts`
```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
store_id UUID
product_id UUID NOT NULL
forecast_date DATE NOT NULL
horizon_days INT NOT NULL
predicted_qty NUMERIC NOT NULL CHECK (predicted_qty >= 0)
lower_bound NUMERIC
upper_bound NUMERIC
confidence NUMERIC
model_version_id UUID NOT NULL
created_at TIMESTAMP NOT NULL
```

### `recommendations`
```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
store_id UUID
product_id UUID NOT NULL
supplier_id UUID
recommended_qty NUMERIC NOT NULL CHECK (recommended_qty > 0)
estimated_cost NUMERIC CHECK (estimated_cost >= 0)
risk_level TEXT -- (e.g., 'HIGH', 'MEDIUM', 'OVERSTOCK')
confidence NUMERIC
reasoning_summary TEXT
status TEXT NOT NULL -- (e.g., 'DRAFT', 'APPROVED', 'REJECTED', 'MODIFIED')
model_version_id UUID
created_at TIMESTAMP NOT NULL
```

### `approvals`
```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
recommendation_id UUID NOT NULL REFERENCES recommendations(id)
user_id UUID NOT NULL
action TEXT NOT NULL -- ('APPROVE', 'REJECT', 'MODIFY')
original_qty NUMERIC
final_qty NUMERIC
comment TEXT
created_at TIMESTAMP NOT NULL
```

### `purchase_orders`
```sql
id UUID PRIMARY KEY
tenant_id UUID NOT NULL
supplier_id UUID NOT NULL
store_id UUID NOT NULL
order_date TIMESTAMP NOT NULL
status TEXT NOT NULL -- ('DRAFT', 'SENT', 'ACKNOWLEDGED', 'FULFILLED', 'CANCELLED')
currency TEXT DEFAULT 'INR'
estimated_total NUMERIC CHECK (estimated_total >= 0)
approval_reference_id UUID -- Link to batch approvals
created_at TIMESTAMP NOT NULL
updated_at TIMESTAMP
```

### `purchase_order_lines`
```sql
id UUID PRIMARY KEY
po_id UUID NOT NULL REFERENCES purchase_orders(id)
product_id UUID NOT NULL
quantity NUMERIC NOT NULL CHECK (quantity > 0)
unit_price NUMERIC NOT NULL CHECK (unit_price >= 0)
subtotal NUMERIC NOT NULL
tax_amount NUMERIC DEFAULT 0
```
