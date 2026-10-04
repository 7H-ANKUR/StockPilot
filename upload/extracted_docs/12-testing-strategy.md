# 12 - Testing Strategy

## 1. Application Testing
* **Unit Tests**: Ensure individual functions (e.g., safety stock formulas, API request validation) work correctly.
* **Integration Tests**: Verify database migrations, backend services interfacing with PostgreSQL/Redis, and LLM tool execution logic.
* **E2E Tests**: Use Cypress or Playwright to simulate the manager's core workflow: Upload Data -> View Dashboard -> Interrogate Agent -> Approve Recommendation -> Generate PO.

## 2. Data Quality Testing
Errors must be caught at ingestion. Assertions must cover:
* Duplicate sale IDs or SKU mappings.
* Impossible dates (e.g., sales in the future).
* Negative quantities or zero/negative unit prices.
* Invalid GST rates or missing supplier links.
* **Rule**: Bad rows should be quarantined into a dead-letter table, not silently discarded.

## 3. ML & Forecasting Evaluation
Use time-based backtesting (never random split) to evaluate models.
* **Primary Metrics**: 
  * Mean Absolute Error (MAE)
  * Root Mean Square Error (RMSE)
  * Weighted Absolute Percentage Error (WAPE)
  * Stockout Precision & Recall.
* **Rule**: Always compare against a naive baseline (`forecast(t+7) = recent 7-day average`). No model is promoted unless it demonstrably beats the baseline on the validation windows.

## 4. Observability & Agent Metrics
Track the agent's behavior in production:
* Tool call count and tool failure rate.
* Invalid argument generation.
* Unsupported answer rate (LLM hallucinates or cannot answer).
* Response latency.
* Approval-policy violations (Agent attempts to bypass safety logic).

## 5. Release Blockers
A deployment is blocked if:
1. Model evaluation (backtesting) is missing.
2. Schema migrations are untested.
3. The LLM can directly execute purchases bypassing the state machine.
4. Production data can be overwritten without an audit trail.
5. Forecast leakage (training on future data) is detected.
6. Generated synthetic data is mislabeled as real data in the UI.
