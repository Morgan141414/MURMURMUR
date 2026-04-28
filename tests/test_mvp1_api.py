import os
import tempfile

os.environ["SAPHENA_DATABASE_URL"] = f"sqlite:///{tempfile.NamedTemporaryFile(delete=False).name}"

from fastapi.testclient import TestClient  # noqa: E402

from saphena.core.database import SessionLocal, create_schema  # noqa: E402
from saphena.main import app  # noqa: E402
from saphena.modules.models import Account  # noqa: E402

client = TestClient(app)


def setup_module() -> None:
    create_schema()


def register_user(iin: str, password: str = "StrongPass123") -> dict:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "iin": iin,
            "password": password,
            "first_name": "Amanat",
            "last_name": "Founder",
            "phone": "+77000000000",
            "email": f"{iin}@example.com",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def login(iin: str, password: str = "StrongPass123") -> str:
    response = client.post("/api/v1/auth/login", json={"iin": iin, "password": password})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def make_superuser(account_id: int) -> None:
    with SessionLocal() as db:
        account = db.get(Account, account_id)
        assert account is not None
        account.is_superuser = True
        db.add(account)
        db.commit()


def test_register_login_and_me() -> None:
    user = register_user("123456789012")
    token = login("123456789012")

    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["id"] == user["id"]
    assert response.json()["person"]["iin"] == "123456789012"


def test_clinic_application_approval_creates_clinic_and_founder_membership() -> None:
    register_user("123456789013")
    founder_token = login("123456789013")
    moderator = register_user("123456789014")
    make_superuser(moderator["id"])
    moderator_token = login("123456789014")

    create_response = client.post(
        "/api/v1/clinics/applications",
        headers={"Authorization": f"Bearer {founder_token}"},
        json={
            "name": "Saphena Clinic",
            "legal_name": "Saphena Clinic LLP",
            "bin_iin": "990140000001",
            "address": "Almaty, Abay 1",
            "contacts": "+77000000001",
            "founder_data": "Amanat 100%",
            "requisites": "KZ TEST",
            "license_info": "License MVP-1",
            "oked": "86210",
            "activity_description": "Medical outpatient clinic",
            "submit": True,
        },
    )
    assert create_response.status_code == 201, create_response.text
    application_id = create_response.json()["id"]

    moderate_response = client.patch(
        f"/api/v1/clinics/applications/{application_id}",
        headers={"Authorization": f"Bearer {moderator_token}"},
        json={"status": "approved", "moderator_comment": "Documents accepted"},
    )

    assert moderate_response.status_code == 200, moderate_response.text
    clinic_id = moderate_response.json()["clinic_id"]
    assert moderate_response.json()["status"] == "approved"
    assert clinic_id is not None

    clinics_response = client.get(
        "/api/v1/clinics", headers={"Authorization": f"Bearer {founder_token}"}
    )
    assert clinics_response.status_code == 200
    assert clinics_response.json()[0]["id"] == clinic_id

    employees_response = client.get(
        f"/api/v1/clinics/{clinic_id}/employees",
        headers={"Authorization": f"Bearer {founder_token}"},
    )
    assert employees_response.status_code == 200
    assert employees_response.json()[0]["role_code"] == "clinic_founder"

    audit_response = client.get(
        "/api/v1/admin/audit", headers={"Authorization": f"Bearer {moderator_token}"}
    )
    assert audit_response.status_code == 200
    assert any(item["action"] == "clinic_application.approved" for item in audit_response.json())
