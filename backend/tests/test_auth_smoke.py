"""Smoke tests for auth endpoints using the live application stack."""
from uuid import uuid4
from pathlib import Path
import sys

from fastapi.testclient import TestClient


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.main import app


client = TestClient(app)


def test_login_succeeds_with_default_admin():
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "admin@moveinsync.com", "password": "123"},
        headers={"content-type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str) and body["access_token"]


def test_register_creates_new_user():
    unique_email = f"autotest+{uuid4().hex}@moveinsync.com"
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": unique_email,
            "password": "testpass",
            "full_name": "Automation User",
            "role": "admin",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == unique_email
    assert body["full_name"] == "Automation User"
