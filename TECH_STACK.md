# CoalGuard — Comprehensive Technology Stack, Architecture & Deployment Specification

> **System Name:** CoalGuard — AI-Based Smart Governance and Compliance Monitoring System for Coal Mines  
> **Authority:** Ministry of Coal • Coal India Limited (CIL)  
> **Platform Version:** 2.0 (Light Enterprise Edition)  
> **Classification:** Statutory Regulatory Governance & Mine Safety Platform  
> **Target Deployment:** Vercel (Frontend Client) + Render (Backend API Service)

---

## 1. System Overview & Executive Summary

**CoalGuard** is a digital governance and safety compliance monitoring platform designed to enforce statutory mine safety regulations across all subsidiaries of Coal India Limited (CIL) — including ECL, BCCL, CCL, WCL, SECL, NCL, and MCL.

The platform provides unified oversight of:
1. **Statutory Safety Standards:** Rigorous adherence to Coal Mines Regulations (CMR) 2017, Mines Act 1952, DGMS Circulars, and Mines Vocational Training Rules (MVTR) 1966.
2. **Workforce & Contractor Governance:** DGMS Rule 29B Periodic Medical Examination (Form O PME), vocational safety credentials, and biometric attendance records.
3. **Closed-Loop CAPA Remediation:** 4-stage non-negotiable remediation chain:
   $$\text{Issue Directive} \longrightarrow \text{Contractor Rectification \& Proof} \longrightarrow \text{Field Physical Verification} \longrightarrow \text{Mine Manager Formal Closure}$$
4. **Geospatial Hotspot & Hazard Surveillance:** Real-time GIS radar mapping highwall stability, haul road berms, dump slopes, and active hazard coordinates.
5. **AI-Assisted Predictive Compliance Scoring:** Automated risk profiling, repeat offender detection, and early warnings for non-compliance escalation.

---

## 2. System Architecture & Component Interaction

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND CLIENT (Hosted on Vercel)                              │
│                                                                                        │
│   React 19 (SPA) + TypeScript + Tailwind CSS (Light Enterprise Institutional Theme)    │
│                                                                                        │
│   ├── Client Routing & RBAC: React Router v7 with RoleRouteGuard & AuthContext         │
│   ├── Dedicated Role Workspaces:                                                       │
│   │   ├── Corporate Management Dashboard (CIL HQ Multi-Subsidiary Radar)               │
│   │   ├── Mine Manager Operations Dashboard (Pit & Statutory Approvals)                │
│   │   ├── Field Safety Officer Dashboard (On-Site Audits & Checklists)                 │
│   │   ├── Worker Management & PME Dashboard (DGMS Form O & Certifications)             │
│   │   └── Registered Contractor Portal (Directives & Proof Submissions)                │
│   ├── Analytics & Visualizations: Recharts Interactive Telemetry                       │
│   └── Geospatial Interface: Leaflet / React-Leaflet GIS Hazard Mapping                 │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            │ HTTPS REST / Multipart / JSON (Bearer JWT)
                                            │ Environment: VITE_API_BASE
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        BACKEND API SERVICE (Hosted on Render)                          │
│                                                                                        │
│   Node.js (v20+) + Express 5 + tsx (TypeScript Runtime)                                │
│                                                                                        │
│   ├── REST API Routers:                                                                │
│   │   ├── /api/auth (JWT authentication & 5-tier role switching)                       │
│   │   ├── /api/dashboard (Aggregated KPI metrics & subsidiary status)                 │
│   │   ├── /api/inspections (Checklists, geotagged audits & observations)               │
│   │   ├── /api/violations & /api/corrective-actions (CAPA state machine)                │
│   │   ├── /api/workers & /api/contractors (Form O, MVTR, active rosters)               │
│   │   ├── /api/gis (Geo-coordinates, hazard overlays & safety radar)                   │
│   │   ├── /api/reports (Statutory monthly dossiers & approval workflows)               │
│   │   ├── /api/ai (Predictive risk scores, anomaly factor decomposition)               │
│   │   └── /api/governance, /api/alerts, /api/audit-logs                                │
│   ├── Middleware: CORS (Cross-Origin Protection), Multer (Geotagged Photo Uploads)     │
│   └── In-Memory Seeded Relational Store: Backed by db_dump.json (25 statutory tables)  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Comprehensive Frontend Technology Stack

| Layer | Component | Specification | Description & Strategic Rationale |
| :--- | :--- | :--- | :--- |
| **Core Framework** | React | `^19.2.8` | Component-driven declarative UI architecture utilizing modern concurrent features. |
| **Language / Typing** | TypeScript | `~6.0.2` | End-to-end static type safety preventing runtime state and contract mismatches. |
| **Build Tooling** | Vite | `^8.3.1` | Ultra-fast development server with ES modules and optimized Rollup production bundling. |
| **Client Routing** | React Router DOM | `^7.18.4` | Client-side routing with nested layouts and `RoleRouteGuard` enforcing strict RBAC. |
| **Styling Engine** | Tailwind CSS | `^3.4.19` | Utility-first CSS tailored with an institutional light palette (`#F5F7FA` canvas, clean card surfaces, `#1D4ED8` primary corporate blue). |
| **PostCSS Pipeline** | PostCSS & Autoprefixer | `^8.5.28` / `^10.6.1` | Automated CSS vendor prefixing and CSS optimization. |
| **Design System Tokens** | Vanilla CSS Tokens | `src/index.css` | Standardized institutional tokens for borders (`#E2E8F0`), muted labels (`#64748B`), and text (`#0F172A`). |
| **Class Merging** | `clsx` + `tailwind-merge` | `^2.1.1` / `^3.7.0` | Safe dynamic class concatenation without CSS specificity collisions. |
| **Iconography** | Lucide React | `^1.48.0` | Crisp, scalable SVG icons for statutory compliance, safety badges, and workflow states. |
| **Data Analytics** | Recharts | `^3.10.1` | Declarative SVG charting library powering monthly compliance graphs, violation distributions, and risk curves. |
| **Geospatial Mapping** | Leaflet & React-Leaflet | `^1.9.4` / `^5.0.0` | High-performance interactive cartographic rendering of open-cast pits, haul roads, and hazard hotspots. |

---

## 4. Comprehensive Backend Technology Stack

| Layer | Component | Specification | Description & Strategic Rationale |
| :--- | :--- | :--- | :--- |
| **Runtime Engine** | Node.js | `>=20.x` | High-throughput asynchronous event-driven JavaScript/TypeScript server runtime. |
| **API Framework** | Express | `^5.2.1` | Minimalist HTTP routing framework with native promise error handling and robust middleware. |
| **Execution Engine** | `tsx` | `^4.23.15` | Native TypeScript runtime execution without requiring preliminary transpile steps. |
| **Cross-Origin Policy** | `cors` | `^2.8.6` | Whitelists Vercel client domains for REST API communication. |
| **Evidence Storage** | `multer` | `^2.4.0` | Streaming multipart form parser handling physical inspection photos, Form O scans, and CAPA proofs. |
| **Static File Delivery** | `express.static` | Native | Serves static assets, uploaded geotagged evidence, and compiled compliance PDF exports. |
| **Data Persistence** | In-Memory JSON Store | Seeded `db_dump.json` | Ultra-fast transactional store pre-seeded with 25 realistic statutory tables representing CIL subsidiaries. |
| **AI Scoring Engine** | Heuristic Risk Engine | Native Algorithm | Multi-variable weighted scoring engine quantifying safety hazard vectors, repeat violations, and missing certifications. |

---

## 5. Security Architecture & Role-Based Access Control (RBAC)

The platform implements 5 distinct operational security tiers:

```
                            ┌────────────────────────────────────┐
                            │    Corporate Management (CIL HQ)   │
                            │  Cross-subsidiary governance & KPI │
                            └─────────────────┬──────────────────┘
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    ▼                                                   ▼
       ┌────────────────────────┐                          ┌────────────────────────┐
       │      Mine Manager      │                          │   Worker Management    │
       │ Pit oversight & CAPA   │                          │ DGMS Form O, MVTR,     │
       │ formal closure signoff │                          │ Contractor worker KYC  │
       └────────────┬───────────┘                          └────────────────────────┘
                    │
                    ▼
       ┌────────────────────────┐
       │  Field Safety Officer  │
       │ Geotagged inspections, │
       │ CAPA field validation  │
       └────────────┬───────────┘
                    │
                    ▼
       ┌────────────────────────┐
       │ Registered Contractor  │
       │ Directives remediation │
       │ & photographic proof   │
       └────────────────────────┘
```

1. **Corporate Management (CIL HQ):**
   - High-level multi-subsidiary telemetry (ECL, BCCL, CCL, WCL, SECL, NCL, MCL).
   - Monthly statutory compliance report sign-off and final executive rejection/approval.
   - Systemic escalation discovery and cross-mine incident heatmaps.
2. **Mine Manager:**
   - Operational jurisdiction over designated pit operations and safety supervisors.
   - Compiles statutory compliance reports; receives corporate feedback.
   - Holds exclusive legal authority to formally **Close** verified CAPAs.
3. **Field Safety Officer:**
   - Performs physical audits on active haul roads, bench slopes, and machinery.
   - Records geotagged non-compliances and triggers AI hazard severity calculations.
   - Re-inspects contractor rectifications to issue **FIXED** or **NOT FIXED** determinations.
4. **Worker Management (Labour & PME Officer):**
   - Enforces DGMS Rule 29B Periodic Medical Examinations (Form O).
   - Validates Mines Vocational Training Rules 1966 certifications.
   - Monitors contractor worker deployment quotas and certification expiry dates.
5. **Registered Contractor:**
   - Isolated view restricted to assigned operational contracts and active workers.
   - Receives non-compliance violation notices.
   - Uploads date-stamped photographic proof of physical rectification.

---

## 6. Statutory Data Schema Catalog (25 Entities)

The data model reflects Indian mining law requirements:

1. `subsidiaries` — CIL operating companies (ECL, BCCL, CCL, etc.)
2. `mines` — Opencast and underground mines with DGMS identification codes
3. `users` — Role-assigned system personnel with credentials and subsidiary mappings
4. `contractors` — Registered commercial mining service partners
5. `contracts` — Active mining tenders, SLAs, safety clauses, and validity dates
6. `workers` — Mine personnel, statutory designations, and national ID mappings
7. `compliance_records` — Daily statutory checklists and DGMS rule mappings
8. `alerts` — Real-time automated safety warnings and escalation signals
9. `documents` — SOPs, DGMS circulars, statutory permission letters, and bylaws
10. `attendance` — Biometric shift logs, overtime checks, and rest interval records
11. `medical_records` — Form O PME certificates, audiology, lung function, and visual tests
12. `inspections` — Scheduled and unannounced field inspection audit dossiers
13. `contract_requirements` — Obligatory safety equipment and worker ratios per contract
14. `inspection_checklists` — Statutory itemized questions (berm height, bench slope, PPE)
15. `inspection_observations` — Field findings, observed severities, and notes
16. `geo_evidence` — Geotagged photographic records with latitude, longitude, and timestamps
17. `violations` — Categorized statutory breaches (Critical, High, Medium, Low)
18. `corrective_actions` (CAPA) — 4-stage remediation records with assigned accountability
19. `reports` — Monthly composite statutory reports submitted for executive review
20. `report_reviews` — Corporate feedback, revision mandates, and approval audit logs
21. `training_records` — MVTR 1966 mandatory vocational safety modules completed
22. `certification_records` — Blasting licenses, gas testing tickets, heavy machinery credentials
23. `escalation_logs` — Automatic escalation logs when CAPAs exceed statutory deadlines
24. `ai_predictions` — Predictive risk probability scores and root-cause factor breakdowns
25. `audit_logs` — Immutable chronological tracking of all user actions across the platform

---

## 7. Step-by-Step Deployment Guide

### Deployment Architecture Matrix

| Platform | Role | Build Command | Start / Output | Environment Variables |
| :--- | :--- | :--- | :--- | :--- |
| **Render** | Backend API Service | `npm install` | `npm start` | `NODE_ENV=production`, `PORT=10000` |
| **Vercel** | Frontend Client (SPA) | `npm run build` | `dist` directory | `VITE_API_BASE=https://<your-render-url>/api` |

---

### Phase 1: Deploy Backend to Render

1. Log in to [render.com](https://render.com).
2. On your dashboard, select **New +** &rarr; **Web Service**.
3. Connect your GitHub repository (`024` or your repository name).
4. Configure the service parameters:
   - **Name:** `coalguard-backend` (or your preferred name)
   - **Region:** Nearest to your users (e.g., Singapore or Frankfurt)
   - **Branch:** `main`
   - **Root Directory:** *(leave blank for root)*
   - **Runtime:** `Node`
   - **Build Command:**
     ```bash
     npm install
     ```
   - **Start Command:**
     ```bash
     npm start
     ```
   - **Plan:** Free
5. Open **Environment Variables** and add:
   - `NODE_ENV` = `production`
   - `PORT` = `10000`
6. Under **Advanced Settings**, set **Health Check Path** to:
   ```
   /health
   ```
7. Click **Create Web Service**.
8. Once the build completes, Render will provide your public backend URL:
   ```
   https://coalguard-backend.onrender.com
   ```
9. Verify the backend in your browser by visiting `https://coalguard-backend.onrender.com/health`. It will return:
   ```json
   {
     "system": "CoalGuard AI-Based Smart Governance & Compliance System",
     "ministry": "Ministry of Coal / Coal India Limited",
     "status": "OPERATIONAL",
     "docs_url": "/docs"
   }
   ```

---

### Phase 2: Deploy Frontend to Vercel

1. Log in to [vercel.com](https://vercel.com) using your GitHub account.
2. Click **Add New...** &rarr; **Project**.
3. Import your repository (`024`).
4. Configure Project Settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Expand the **Environment Variables** section and configure:
   - **Key:** `VITE_API_BASE`
   - **Value:** `https://coalguard-backend.onrender.com/api`  
     *(Ensure this matches your actual Render service URL, followed by `/api`)*
6. Click **Deploy**.
7. Vercel will install dependencies, run `tsc -b && vite build`, and publish your application.
8. Your frontend will be live at:
   ```
   https://coalguard.vercel.app
   ```

---

### Phase 3: Post-Deployment Verification Checklist

| Checkpoint | Target | Expected Verification Result |
| :--- | :--- | :--- |
| **Backend Health** | `https://<render-url>/health` | HTTP 200 with status `"OPERATIONAL"` |
| **Backend Root** | `https://<render-url>/` | HTTP 200 JSON confirmation that API service is active |
| **Frontend Root** | `https://<vercel-url>/` | Renders the official Ministry of Coal / CIL login page |
| **Cross-Origin REST** | Browser Network Tab | Successful preflight OPTIONS and 200 OK responses on `/api/*` |
| **Role Authentication** | One-Click Demo Badges | Instant login and role redirection for all 5 statutory roles |
| **GIS Hazard Radar** | `/gis` & `/field-gis` | Leaflet tiles load with interactive pit markers and hazard overlays |
| **Closed-Loop CAPA** | `/corrective-actions` | 4-stage stepper reflects accurate statutory status transitions |
| **Monthly Reports** | `/reports` | Tabular display of subsidiary compliance reports with review workflows |

---

## 8. Maintenance & Operational Runbook

- **Cold Starts on Render Free Tier:** Render free tier services spin down after 15 minutes of inactivity. The first request after a idle period may take 30–50 seconds to warm up. For production deployments requiring 100% instantaneous uptime, upgrade to the Render Starter plan or configure an external uptime monitor (e.g., UptimeRobot) pinging `/health` every 10 minutes.
- **Data Persistence:** The current system operates with an in-memory transactional store seeded from `db_dump.json`. For multi-instance persistent production, bind a PostgreSQL database instance and update the persistence adapter in `server.ts`.
- **Environment Updates:** Whenever you update `VITE_API_BASE` in Vercel, trigger a redeployment from the Vercel dashboard so Vite embeds the new API base URL into the client bundle.
