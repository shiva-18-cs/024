# CoalGuard (AI-Based Smart Governance & Compliance Monitoring System)
### Designed for Coal India Limited (CIL) & Ministry of Coal, Government of India

**CoalGuard** is a centralized, AI-enabled smart governance and compliance monitoring web application. It enforces statutory compliance, DGMS regulations, worker safety, contractor accountability, real-time telemetry monitoring, and immutable audit trails across coal mining blocks and subsidiaries.

---

## 🏛️ System Architecture & Workflow Roles

The application implements full role-based governance aligned with the statutory hierarchy:

| Role | Responsibility | Scope of Action |
|---|---|---|
| **ADMIN** | System Administrator | User provisioning, RBAC, global policy configuration, integrity audit |
| **CORPORATE MANAGEMENT** | CIL HQ / Ministry Director | Multi-subsidiary governance, compliance indices, formal report sign-off |
| **MINE MANAGER** | Statutory Agent / Mine Head | Mine-level oversight, inspection review, CAPA validation, penalty approval |
| **FIELD OFFICER** | Safety Inspector / DGMS Liaison | Digital field inspections, GPS geo-stamping, violation logging, evidence upload |
| **CONTRACTOR** | Outsourced Mining Agency | Labor licensing, worker deployment, attendance, CAPA resolution proof |
| **WORKER MANAGEMENT** | Welfare Officer | Medical examinations (IME/PME), statutory benefits, PPE tracking |

---

## 🚀 Key Modules & Capabilities

1. **Governance & Corporate Dashboard**: Real-time KPI summaries, compliance barometers across subsidiaries (BCCL, ECL, SECL, NCL, MCL), active violations, and overdue CAPAs.
2. **GIS Spatial Monitoring**: Interactive geospatial radar with coordinates, geographic datum, compliance heatmaps, and high-risk mine identification.
3. **Field Inspections with GPS**: Geo-tagged inspections with live coordinates, multi-checklist scoring, photographic evidence, and manager review workflow.
4. **Violation Register**: Automated severity classification (Critical, High, Medium, Low), SLA countdowns, and formal show-cause tracking.
5. **Corrective & Preventive Actions (CAPA)**: End-to-end resolution lifecycle (Assigned → In Progress → Submitted with Evidence → Verified by Field Officer).
6. **AI Risk Engine & Anomaly Detection**: Predictive risk scores, contractor failure probability, multi-sensor outlier detection (e.g. Methane/CH4 spikes).
7. **Statutory Document Pipeline & OCR**: Automated ingestion of Form V labor licenses, DGMS permits, and CTO orders with key-value entity extraction.
8. **Alerts & Escalation Center**: Multi-tier escalation (L1 / L2 / L3) with automatic SLA breach alerts.
9. **Cryptographic Audit Trail**: Immutable ledger with SHA-256 block hashing and tamper-evident event verification.

---

## 🔑 Pre-Configured Demo Credentials

Use the **"Quick Role Switcher"** on the login page or enter credentials manually:

| Role | Username | Password | Default Entity / Mine |
|---|---|---|---|
| **System Admin** | `admin` | `admin123` | Ministry Central Root |
| **Corporate Management** | `corp_mgmt` | `corp123` | CIL HQ Safety Directorate |
| **Mine Manager** | `mine_mgr_jh` | `mine123` | Jharia Open Cast Pit 4 (BCCL) |
| **Field Officer** | `field_officer_1` | `field123` | Jharia Open Cast Pit 4 (BCCL) |
| **Contractor** | `contractor_tata` | `contractor123` | Tata Steel Mining Services |
| **Worker Management** | `worker_mgmt_1` | `worker123` | Welfare Cell (BCCL) |

---

## 🛠️ Quick Start & Execution

### Option 1: One-Click Launch (Windows)
Double-click `start-all.bat` in the root folder. This automatically launches both the backend and frontend servers in separate windows.

### Option 2: Manual Terminal Startup

#### 1. Backend Server (FastAPI):
```bash
cd backend
# If using virtualenv:
venv\Scripts\activate
# Start backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **OpenAPI Schema**: [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

#### 2. Frontend Application (React 19 + TypeScript + Vite + Tailwind):
```bash
cd frontend
npm run dev
```
- **Web App URL**: [http://localhost:5173](http://localhost:5173)

---

## 📦 Production Build Verification

The frontend production bundle has been validated:
```bash
cd frontend
npm run build
```
Generates optimized, production-ready static assets in `frontend/dist/`.
