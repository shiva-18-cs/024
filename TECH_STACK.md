# CoalGuard — Technology Stack & Deployment Architecture Document

> **System Name:** CoalGuard — AI-Based Smart Governance and Compliance Monitoring System for Coal Mines  
> **Authority:** Ministry of Coal • Coal India Limited (CIL)  
> **Platform Version:** 2.0 (Light Enterprise Edition)  
> **Classification:** Government & Enterprise Regulatory Compliance Platform  

---

## 1. Executive Summary

**CoalGuard** is a centralized, digital governance platform designed to enforce statutory mine safety, regulatory compliance, workforce qualifications, contractor accountability, and environmental safeguards across Coal India Limited (CIL) subsidiaries (ECL, BCCL, CCL, WCL, SECL, NCL, MCL).

The system integrates:
- **Role-Based Workspaces:** Dedicated operational interfaces for Corporate Management, Mine Managers, Field Safety Officers, Worker Management & PME Officers, and Registered Contractors.
- **DGMS & CMR Statutory Rule Enforcement:** Coal Mines Regulations (CMR) 2017, Mines Act 1952, Mines Rules 1955 (Form O PME), and Vocational Training Rules 1966.
- **Closed-Loop CAPA Remediation:** 4-stage strict accountability chain: *Issue Directive &rarr; Contractor Remedy & Proof Submission &rarr; Field Officer Physical Verification &rarr; Mine Manager Formal Closure*.
- **GIS Geospatial Radar & Hotspot Surveillance:** Real-time spatial tracking of mine hazards, highwall stability, bench violations, and haul road berm statuses.
- **AI-Assisted Predictive Compliance:** Dynamic anomaly detection, risk factor breakdown, and compliance posture scoring.

---

## 2. Architecture & System Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Deployed on Vercel)                   │
│                                                                        │
│   React 19 (SPA) + TypeScript + Tailwind CSS (Light Enterprise Theme)  │
│   ├── RoleRouteGuard & AuthContext (RBAC: 5 Distinct User Roles)       │
│   ├── Dashboards: Corporate, Contractor, Mine Mgr, Field, Worker       │
│   ├── Modules: Inspections, CAPAs, Violations, GIS Radar, Reports      │
│   └── Visuals: Recharts Analytics + Leaflet GIS Hotspot Map            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS REST Requests
                                    │ (Bearer Token / JSON)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Deployed on Render)                    │
│                                                                        │
│   Node.js (v20+) + Express 5 + TypeScript (tsx)                        │
│   ├── REST API Router (/api/auth, /api/dashboard, /api/inspections...) │
│   ├── Middleware: CORS (Cross-Origin), Multer (File & Proof Uploads)   │
│   ├── AI Analytics Engine (Risk scoring, anomaly & factor analysis)    │
│   ├── Closed-Loop CAPA State Machine                                   │
│   └── Data Persistence Engine (JSON Seed Store / db_dump.json)         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Comprehensive Frontend Technology Stack

| Layer | Technology | Version | Purpose & Rationale |
| :--- | :--- | :--- | :--- |
| **Core Framework** | React | `^19.2.8` | Declarative, component-based user interface architecture with modern concurrent rendering. |
| **Runtime / Typing** | TypeScript | `~6.0.2` | Strong static type checking across all data models, API contracts, and UI components. |
| **Build Tool & Bundler** | Vite | `^8.3.1` | Instant HMR in development and lightning-fast Rollup-based production builds. |
| **Client-Side Routing** | React Router DOM | `^7.18.4` | Declarative nested routing with `RoleRouteGuard` enforcing role-specific URL restrictions. |
| **Styling & Design Tokens** | Tailwind CSS | `^3.4.19` | Utility-first CSS configured with custom institutional light theme (`#F5F7FA` canvas, `#FFFFFF` cards, `#1D4ED8` deep brand blue, and accessible semantic status borders). |
| **Icons & Visual Language** | Lucide React | `^1.48.0` | Comprehensive, consistent SVG icon set for statutory indicators, safety badges, and workflows. |
| **Analytics & Data Charts** | Recharts | `^3.10.1` | Composable charting library powering monthly compliance trends, violation breakdowns, and risk matrices. |
| **Geospatial & Mapping** | Leaflet & React-Leaflet | `^1.9.4` / `^5.0.0` | High-performance interactive geospatial mapping for pit faces, haul roads, and hazard hotspots. |
| **CSS Utilities** | `clsx` & `tailwind-merge` | `^2.1.1` / `^3.7.0` | Dynamic class combination and conflict resolution for conditional UI styling. |

---

## 4. Comprehensive Backend Technology Stack

| Layer | Technology | Version | Purpose & Rationale |
| :--- | :--- | :--- | :--- |
| **Runtime Environment** | Node.js | `>=20.x` | High-performance asynchronous event-driven JavaScript/TypeScript execution environment. |
| **Web Server Framework** | Express | `^5.2.1` | Robust, minimalist web server handling statutory API routes, middleware, and request dispatching. |
| **TypeScript Execution** | `tsx` | `^4.23.15` | Native TypeScript execution engine enabling seamless Node.js TypeScript execution without pre-compilation delays. |
| **Cross-Origin Handling** | `cors` | `^2.8.6` | Enables secure Cross-Origin Resource Sharing for requests originating from the Vercel frontend domain. |
| **Multipart File Uploads** | `multer` | `^2.4.0` | Handles multipart form uploads for geotagged inspection evidence, Form O medical scans, and CAPA resolution photos. |
| **Data Persistence Engine** | In-Memory JSON Store | Native | Backed by `db_dump.json`, providing atomic persistence and pre-seeded realistic data across 25 statutory tables. |
| **AI Assessment Engine** | Proprietary Heuristic Engine | Built-in | Analyzes non-compliance vectors, repeat violations, and missing certifications to generate real-time AI risk scores (0-100). |

---

## 5. Security & Role-Based Access Control (RBAC)

The system enforces strict multi-tier permissions:

1. **Corporate Management (CIL HQ)**
   - Cross-subsidiary governance and compliance radar.
   - Statutory monthly report sign-off and approval/rejection authority.
   - Systemic escalations, recurring pattern discovery, and audit trail oversight.

2. **Mine Manager (Station Level)**
   - Oversight of assigned mine pits and direct operations.
   - Reviews Field Officer inspection submissions.
   - Compiles statutory compliance reports and manages corporate revision feedback.
   - Issues directives/CAPAs and holds exclusive authority to formally **Close** verified CAPAs.

3. **Field Officer (Inspector)**
   - On-site audits with geotagged checklist items.
   - Logs observations, attaches physical evidence photos, and triggers AI risk evaluations.
   - Conducts physical verification of contractor CAPAs, issuing verdicts of **FIXED** or **NOT FIXED**.

4. **Worker Management (Labour & PME Officer)**
   - Enforces DGMS Rule 29B Periodic Medical Examinations (Form O).
   - Validates Mines Vocational Training Rules 1966 certifications.
   - Verifies contractor worker onboardings and tracks expiring medical fitness.

5. **Contractor (ABC Mining & Registered Entities)**
   - Tracks assigned statutory obligations, active contracts, and deployed worker rosters.
   - Views assigned violations and executes remediation directives.
   - Submits photographic proof of physical rectification for Field Officer verification.

---

## 6. Step-by-Step Deployment Guide

### PART A: Deploying Backend to Render

1. **Log in to Render:**  
   Navigate to [render.com](https://render.com) and create an account or sign in.
2. **Create New Web Service:**  
   - Click **New +** &rarr; **Web Service**.
   - Connect your GitHub repository (`024` or your repository name).
3. **Configure Service Settings:**
   - **Name:** `coalguard-backend` (or your choice)
   - **Region:** Choose the region closest to your users (e.g., Singapore, Frankfurt, or Oregon).
   - **Branch:** `main`
   - **Root Directory:** Leave blank (defaults to repository root).
   - **Runtime:** `Node`
   - **Build Command:**
     ```bash
     npm install
     ```
   - **Start Command:**
     ```bash
     npm start
     ```
4. **Environment Variables:**
   Under **Environment Variables**, add:
   - `NODE_ENV` = `production`
   - `PORT` = `10000` *(Render will automatically map this)*
5. **Health Check Path:**
   - Set **Health Check Path** to `/health`.
6. **Deploy:**
   - Click **Create Web Service**.
   - Once deployed, Render will provide a public URL: `https://coalguard-backend.onrender.com`.

---

### PART B: Deploying Frontend to Vercel

1. **Log in to Vercel:**  
   Navigate to [vercel.com](https://vercel.com) and sign in with GitHub.
2. **Import Project:**  
   - Click **Add New...** &rarr; **Project**.
   - Select your repository.
3. **Configure Build Settings:**
   - **Framework Preset:** `Vite`
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. **Configure Environment Variables:**
   Under **Environment Variables**, add:
   - **Name:** `VITE_API_BASE`
   - **Value:** `https://coalguard-backend.onrender.com/api`  
     *(Replace with your actual Render backend URL followed by `/api`)*
5. **Deploy:**
   - Click **Deploy**.
   - Vercel will build the frontend with Rollup/Vite and apply the `vercel.json` SPA rewrite rules.
   - Your frontend will be live at `https://coalguard-app.vercel.app`.

---

### PART C: Verifying the Production Deployment

1. **Health Check:** Open `https://coalguard-backend.onrender.com/health` in a browser. It should return:
   ```json
   {
     "system": "CoalGuard AI-Based Smart Governance & Compliance System",
     "ministry": "Ministry of Coal / Coal India Limited",
     "status": "OPERATIONAL"
   }
   ```
2. **Frontend Login:** Open your Vercel URL. The official government login page will render in light enterprise styling.
3. **Demo Role Quick Login:** Click any of the 5 demo role buttons (*Corporate Management*, *Contractor*, *Field Officer*, *Mine Manager*, *Worker Management*) to verify role-based routing and seamless API data delivery.
