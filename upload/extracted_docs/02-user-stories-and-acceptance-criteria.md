# 02 - User Stories and Acceptance Criteria

## 1. Store/Inventory Manager

### Story 1: Stockout Risk Visibility
> **As a manager, I want to know which products may stock out before the next supplier delivery so that I can avoid lost sales.**

**Acceptance Criteria:**
* The Dashboard displays a dedicated alerts section for "High Stockout Risk" SKUs.
* The risk calculation factors in current stock, lead-time demand (Forecast Daily Demand × Supplier Lead Time), and safety stock.
* For each flagged SKU, the UI shows:
  * Probability/risk of stockout.
  * Expected days to stockout.
  * The verifiable deterministic reason (e.g., "Available stock (50) is less than required coverage (65) for 3-day lead time").

### Story 2: Reorder Recommendations & Explanations
> **As a manager, I want a reorder quantity with a clear explanation so that I can make a confident purchasing decision.**

**Acceptance Criteria:**
* The AI Recommendation UI presents cards/tables for SKUs needing replenishment.
* The card explicitly details: Current stock, Forecast (e.g. next 7 days), Supplier lead time, MOQ, and any Festival effects (e.g. "+12% confidence 0.78").
* The recommended quantity is mathematically derived and matches the `Reorder Optimizer` constraints (e.g. rounding up to meet MOQ or pack sizes).
* A natural-language "Why" section explains the recommendation using the numbers (e.g., "Current stock is unlikely to cover expected demand during lead time...").
* The card provides explicit `[Approve]`, `[Modify]`, and `[Reject]` action buttons.

### Story 3: Approval Workflow
> **As a manager, I want to approve or modify an AI recommendation before an order is created.**

**Acceptance Criteria:**
* If `[Approve]` is clicked, the exact recommended quantity is transitioned to an `APPROVED` state.
* If `[Modify]` is clicked, the user must input the new quantity, and the system logs both the original recommendation and the modified final quantity, transitioning to `APPROVED`.
* If `[Reject]` is clicked, the recommendation is dismissed, state transitions to `REJECTED`, and no PO draft is made.
* An audit trail records the user ID, timestamp, and action for the recommendation.

### Story 4: Conversational Interrogation
> **As a manager, I want to ask the inventory agent natural-language questions instead of manually filtering multiple dashboards.**

**Acceptance Criteria:**
* The user can type queries like "What should I order before Diwali?" into an Agent Chat interface.
* The LLM Agent correctly routes this intent to backend tools (e.g., `get_inventory_snapshot`, `analyze_festival_impact`, `calculate_reorder_quantity`).
* The Agent returns a conversational response grounded entirely in the tool data (e.g., "I found 14 high-risk SKUs...").
* The Agent embeds rich data cards or tables within the chat so the user can see the evidence and take action.

---

## 2. Procurement Manager

### Story 5: Supplier-Wise Purchase Orders
> **As a procurement manager, I want approved recommendations grouped by supplier so that I can create efficient POs.**

**Acceptance Criteria:**
* The system automatically aggregates all `APPROVED` recommendations that share the same `supplier_id`.
* The system drafts a Purchase Order for that supplier, containing all approved line items.
* The system enforces supplier constraints (e.g., if total order value/volume doesn't meet supplier minimums, it flags this).
* The PO preview displays: PO number, supplier details, store details, line items, quantities, unit prices, taxes, and estimated total.

---

## 3. Business Owner

### Story 6: Sales and Inventory Performance
> **As an owner, I want to see sales and inventory trends so that I can understand business performance.**

**Acceptance Criteria:**
* The Analytics Dashboard provides time-series charts for daily, monthly, and yearly sales.
* Displays category and regional/store trends.
* Shows performance indicators such as Top Fast Movers, Stockout Frequency, and Overstock Capital tied up in inventory.

---

## 4. Key UX Screens & Interfaces

### 4.1 Dashboard
* **Elements**: Sales KPIs, Stockout Alerts (High/Medium risk), Overstock Alerts, Top Fast Movers list, Upcoming Festival Impact summaries, and Pending Approvals queue.

### 4.2 Inventory View
* **Elements**: Searchable/filterable SKU table.
* **Columns**: SKU, Name, Stock Level, Days of Inventory, Risk Badges (e.g., `[HIGH RISK]`, `[OVERSTOCK]`), and a sparkline/mini-chart of the demand forecast.

### 4.3 AI Recommendations
* **Elements**: Recommendation cards/table containing:
  * Evidence (Current stock, lead time, forecast).
  * Expected shortage.
  * Suggested quantity & Estimated cost.
  * AI Confidence score.
  * Manager Action buttons: `Approve`, `Modify`, `Reject`.

### 4.4 Agent Chat
* **Elements**: Conversational history log, text input.
* **Behavior**: LLM synthesis text accompanied by embedded structured UI components (e.g. rendering a mini Recommendation Card directly in the chat flow).

### 4.5 Purchase Orders
* **Elements**: Supplier grouping view, PO preview (Line items, quantities, taxes), Approval history references, Export options (PDF/CSV).

### 4.6 Analytics
* **Elements**: Granular charts for Monthly/Yearly sales, Category trends, Store/Region comparisons, and discount impacts.

---

## 5. Decision Recommendation UX (Example Blueprint)
The exact layout for an AI decision card must resemble the following information hierarchy:

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
