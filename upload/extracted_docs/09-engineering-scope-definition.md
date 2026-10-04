# 09 - Engineering Scope Definition

## 1. MVP Scope vs Production Scope Matrix

| Capability | MVP Phase | Production Phase (Post-MVP) |
|---|---|---|
| **Data Ingestion** | CSV/XLSX file ingestion. | Real-time POS integration & APIs. |
| **Demand Forecast**| Single baseline model (e.g. Scikit-learn). | Multi-model registry, A/B testing, drift monitoring. |
| **Stockout Detection** | Deterministic business rules + heuristic logic. | Calibrated ML probability + dynamic business rules. |
| **Festival Logic** | Static mapping of events. | Regional/event-aware dynamic mapping. |
| **Suppliers** | Simulated/seeded local datasets. | Direct ERP/supplier vendor integrations (EDI). |
| **LLM Agent** | Guarded multi-tool agent for chatting and basic PO drafting. | Advanced multi-step orchestration. |
| **Purchasing (PO)**| Draft POs pending human approval. | Approved workflow linked directly to Supplier APIs. |
| **GST / Tax** | Basic calculation of IGST/SGST/CGST. | Integrated statutory reporting module. |
| **OCR / Bill Scan**| Optional/demo implementation for static PDFs. | Production document processing pipeline (Vision models). |
| **Security/Auth** | Basic JWT/Session Auth. | Enterprise RBAC, LDAP, Multi-Tenancy. |
| **Monitoring** | Basic structured logs. | Full observability (Metrics, Traces, APM). |
| **Deployment** | Single Docker Compose instance. | Multi-tenant capable distributed cloud architecture. |

---

## 2. Explicit Non-Goals for the MVP
To ensure the MVP ships on time, the following are explicitly out of scope:
1. Replacing a supermarket's core POS system (we are an intelligence layer, not a cashier till).
2. Fully automated purchasing with no human approval.
3. Filing statutory GST returns with the government.
4. Voice-based sales entry.
5. Building a foundational LLM model from scratch.
6. Passing millions of raw transactional rows into an LLM context window.

---

## 3. Product & Engineering Risks

### Risk 1 — LLM Hallucination
* **Mitigation**: LLM is strictly used as an orchestration and explanation layer. All numerical facts and forecasts must originate from typed JSON tools. The LLM cannot mutate database rows directly.

### Risk 2 — Poor Forecasting During Stockouts
* **Mitigation**: Model must explicitly encode stockout states as features so the algorithm understands that zero sales were due to lack of inventory, not lack of demand.

### Risk 3 — Insufficient Historical Festival Data
* **Mitigation**: Enforce confidence scores. Fallback to generic seasonality if historical events lack sufficient data. Never invent artificial uplift.

### Risk 4 — Synthetic Data Mistaken for Real Data
* **Mitigation**: All generated prototype data must carry a provenance field and visual metadata ("Synthetic/Prototype") in the UI. Separate demo datasets from benchmark datasets.

### Risk 5 — Purchase Errors (Financial Impact)
* **Mitigation**: Strict enforcement of the Manager Approval State Machine. Transactional database locks during PO creation. Complete, immutable audit trails of all approvals.
