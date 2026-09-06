"""
===============================================================================
Unit Tests: FastAPI Backend Endpoints
===============================================================================
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "Online"


def test_get_projects():
    response = client.get("/projects?limit=10")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_dashboard_summary():
    response = client.get("/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_projects" in data
    assert "risk_band_counts" in data


def test_get_project_benchmark():
    # Test with PRJ_0001
    response = client.get("/projects/PRJ_0001/benchmark")
    assert response.status_code == 200
    data = response.json()
    assert data["project_id"] == "PRJ_0001"
    assert "cost_overrun_percentile" in data


def test_chat_endpoint():
    response = client.post("/chat", json={"question": "Which highway projects in Maharashtra are at risk?"})
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
