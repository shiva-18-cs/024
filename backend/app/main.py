import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.seed.seed_data import seed_database

# Import routers
from app.api.auth import router as auth_router
from app.api.dashboard import router as dashboard_router
from app.api.mines import router as mines_router
from app.api.contractors import router as contractors_router
from app.api.workers import router as workers_router
from app.api.inspections import router as inspections_router
from app.api.violations import router as violations_router
from app.api.corrective_actions import router as corrective_actions_router
from app.api.ai_insights import router as ai_insights_router
from app.api.documents import router as documents_router
from app.api.reports import router as reports_router
from app.api.alerts import router as alerts_router
from app.api.gis import router as gis_router
from app.api.audit_logs import router as audit_logs_router
from app.api.users import router as users_router
from app.api.governance import router as governance_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables
    Base.metadata.create_all(bind=engine)
    # Seed default governance demo data
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="CoalGuard - Centralized Smart Governance & Compliance Monitoring System for Coal India Limited / Ministry of Coal",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file mounts for uploads and generated reports
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.REPORTS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.mount("/reports-files", StaticFiles(directory=settings.REPORTS_DIR), name="reports-files")

# Register API Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(dashboard_router, prefix=settings.API_V1_STR)
app.include_router(mines_router, prefix=settings.API_V1_STR)
app.include_router(contractors_router, prefix=settings.API_V1_STR)
app.include_router(workers_router, prefix=settings.API_V1_STR)
app.include_router(inspections_router, prefix=settings.API_V1_STR)
app.include_router(violations_router, prefix=settings.API_V1_STR)
app.include_router(corrective_actions_router, prefix=settings.API_V1_STR)
app.include_router(ai_insights_router, prefix=settings.API_V1_STR)
app.include_router(documents_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(alerts_router, prefix=settings.API_V1_STR)
app.include_router(gis_router, prefix=settings.API_V1_STR)
app.include_router(audit_logs_router, prefix=settings.API_V1_STR)
app.include_router(users_router, prefix=settings.API_V1_STR)
app.include_router(governance_router, prefix=settings.API_V1_STR)


@app.get("/")
@app.get("/health")
@app.get("/api/health")
def root():
    return {
        "system": "CoalGuard AI-Based Smart Governance & Compliance System",
        "ministry": "Ministry of Coal / Coal India Limited",
        "status": "OPERATIONAL",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
