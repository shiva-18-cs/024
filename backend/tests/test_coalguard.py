import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.entities import Inspection, Report, CorrectiveAction, User

client = TestClient(app)

def get_auth_token(email="corporate@cil.gov.in", password="Password@123"):
    response = client.post("/api/auth/login", json={
        "username_or_email": email,
        "password": password
    })
    assert response.status_code == 200
    return response.json()["access_token"]

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "OPERATIONAL"

def test_login_success():
    response = client.post("/api/auth/login", json={
        "username_or_email": "corporate@cil.gov.in",
        "password": "Password@123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "CORPORATE MANAGEMENT"

def test_list_mines():
    response = client.get("/api/mines")
    assert response.status_code == 200
    mines = response.json()
    assert len(mines) >= 5
    assert any(m["code"] == "ECL-OCP-01" for m in mines)

def test_list_contractors():
    response = client.get("/api/contractors")
    assert response.status_code == 200
    contractors = response.json()
    assert len(contractors) >= 10
    assert any("ABC Mining" in c["company_name"] for c in contractors)

def test_list_workers():
    token = get_auth_token()
    response = client.get("/api/workers", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    workers = response.json()
    assert len(workers) >= 50

def test_list_inspections():
    token = get_auth_token()
    response = client.get("/api/inspections", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    inspections = response.json()
    assert len(inspections) >= 20

def test_list_violations_and_corrective_actions():
    token = get_auth_token()
    v_res = client.get("/api/violations", headers={"Authorization": f"Bearer {token}"})
    assert v_res.status_code == 200
    assert len(v_res.json()) >= 10

    ca_res = client.get("/api/corrective-actions", headers={"Authorization": f"Bearer {token}"})
    assert ca_res.status_code == 200
    assert len(ca_res.json()) >= 10

def test_ai_predictions():
    ai_res = client.get("/api/ai/predictions")
    assert ai_res.status_code == 200
    preds = ai_res.json()
    assert len(preds) > 0
    assert "risk_score" in preds[0]
    assert "contributing_factors" in preds[0]

def test_gis_features():
    gis_res = client.get("/api/gis/features")
    assert gis_res.status_code == 200
    data = gis_res.json()
    assert "mines" in data
    assert "inspections" in data

def test_dashboard_stats():
    token = get_auth_token()
    dash_res = client.get("/api/dashboard/stats", headers={"Authorization": f"Bearer {token}"})
    assert dash_res.status_code == 200
    stats = dash_res.json()
    assert "kpis" in stats
    assert stats["kpis"]["total_mines"] >= 5

def test_escalations_endpoint():
    token = get_auth_token()
    res = client.get("/api/governance/escalations", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_recurring_problems_endpoint():
    token = get_auth_token()
    res = client.get("/api/governance/recurring-problems", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_worker_training_and_certifications():
    token = get_auth_token()
    train_res = client.get("/api/workers/training", headers={"Authorization": f"Bearer {token}"})
    assert train_res.status_code == 200
    assert isinstance(train_res.json(), list)

    cert_res = client.get("/api/workers/certifications", headers={"Authorization": f"Bearer {token}"})
    assert cert_res.status_code == 200
    assert isinstance(cert_res.json(), list)
