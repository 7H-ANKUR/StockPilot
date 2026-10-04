# 11 - Environment & DevOps

## 1. Terminal-First Dataset Provisioning
The project must be buildable by an autonomous coding agent from a terminal.
* Developers use Kaggle CLI and Git to fetch real benchmark datasets (Supermart, Indian Retail Sales, BigBasket, SupplyStream).
* **Rule**: A build agent must never stop because an external dataset cannot be downloaded. If downloading fails, the system executes `generate_prototype_data.py` to create a deterministic synthetic fallback.

## 2. Environments
* **Development**: Local Docker Compose running API, Frontend, PostgreSQL, and Redis.
* **Staging**: Production-like services with completely isolated data. Used for Integration and E2E testing.
* **Production**: 
  * Cloud Native.
  * Managed PostgreSQL.
  * Managed Redis.
  * Object Storage (S3 equivalent) for raw files/reports.
  * Secrets Manager.
  * Container Orchestration (e.g., ECS, EKS, or AppRunner).
  * Load Balancer & CDN/Frontend Hosting.

## 3. Compute Separation Strategy
As scale increases, workload separation is mandatory:
* Web serving (Frontend).
* API (FastAPI routes).
* Worker/Async tasks (Celery processing CSVs or sending POs).
* Model training pipelines.

## 4. CI/CD Deployment Pipeline
```text
Developer
   ↓
Pull Request
   ↓
CI
 ├─ Linting
 ├─ Unit & Integration Tests
 ├─ Security Scan
 ├─ ML Validation (Backtesting)
 └─ Docker Build
   ↓
Staging
   ↓
Integration + E2E Tests
   ↓
Approval
   ↓
Production
```
*Note: Production database migrations must always be reviewed manually before applying.*

## 5. Disaster Recovery
Minimum production recovery plan:
* **PostgreSQL**: Automated backups and point-in-time recovery.
* **Object Storage**: File versioning and lifecycle policies.
* **Models**: Immutable versions stored in a Model Registry allowing instant rollback.
* **Configuration**: Version-controlled with secrets stored in a managed vault. RPO (Recovery Point Objective) and RTO (Recovery Time Objective) must be documented before launch.
