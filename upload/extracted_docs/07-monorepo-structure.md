# 07 - Monorepo Structure

The project is structured as a single comprehensive monorepo containing frontend applications, backend APIs, ML pipelines, data processing jobs, and agent tooling.

```text
ai-inventory-agent/
├── apps/
│   ├── web/                         # React + Tailwind frontend application
│   └── api/                         # FastAPI backend service
├── agent/
│   ├── prompts/                     # LLM system prompts and context templates
│   ├── tools/                       # Tool implementations (Python functions)
│   ├── policies/                    # Agent guardrails and access logic
│   └── schemas/                     # Pydantic input/output schemas for tools
├── ml/
│   ├── datasets/                    # Local dev subsets of data
│   ├── preprocessing/               # Cleaning and normalization scripts
│   ├── features/                    # Feature engineering pipelines
│   ├── training/                    # Model training jobs
│   ├── evaluation/                  # Backtesting and scoring logic
│   ├── inference/                   # Code that loads models and predicts
│   └── artifacts/                   # Saved .pkl/.bin model binaries (ignored in git)
├── data/
│   ├── raw/                         # Raw ingested datasets (gitignored)
│   ├── processed/                   # Cleaned files (gitignored)
│   ├── synthetic/                   # Prototype data generators
│   └── manifests/                   # Data versioning tracking
├── services/
│   ├── ingestion/                   # Data upload and ETL logic
│   ├── forecasting/                 # Integrates with ML inference
│   ├── inventory/                   # Stockout/overstock rules engines
│   ├── procurement/                 # Supplier and PO generation logic
│   ├── gst/                         # Tax calculation modules
│   └── document_processing/         # PDF and OCR parsing utilities
├── db/
│   ├── migrations/                  # Alembic/SQL schema migrations
│   └── seed/                        # SQL seed data for local dev
├── tests/
│   ├── unit/                        # Isolated function testing
│   ├── integration/                 # DB and cross-module testing
│   ├── ml/                          # Tests for feature pipelines
│   └── e2e/                         # End-to-end Cypress/Playwright workflows
├── infra/
│   ├── docker/                      # Dockerfiles and compose setups
│   ├── github-actions/              # CI/CD pipeline definitions
│   └── deployment/                  # Cloud infrastructure templates (Terraform/CDK)
├── scripts/
│   ├── download_datasets.py         # Automated dataset fetching from Kaggle/Git
│   ├── generate_prototype_data.py   # Fallback synthetic data generator
│   └── seed_demo.py                 # Seeds DB for demonstrations
├── docs/                            # Internal architecture ADRs and docs
├── .env.example                     # Environment variable definitions
├── docker-compose.yml               # Local development stack orchestration
└── README.md
```
