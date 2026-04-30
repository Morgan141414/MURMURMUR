import os
import tempfile
from datetime import datetime, timedelta

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


def test_founder_can_assign_employee_and_view_role_catalog() -> None:
    register_user("123456789015")
    founder_token = login("123456789015")
    moderator = register_user("123456789016")
    make_superuser(moderator["id"])
    moderator_token = login("123456789016")
    register_user("123456789017")

    application_response = client.post(
        "/api/v1/clinics/applications",
        headers={"Authorization": f"Bearer {founder_token}"},
        json={
            "name": "MVP Staff Clinic",
            "legal_name": "MVP Staff Clinic LLP",
            "bin_iin": "990140000002",
            "address": "Astana, Kunaeva 2",
            "submit": True,
        },
    )
    assert application_response.status_code == 201, application_response.text
    application_id = application_response.json()["id"]

    approval_response = client.patch(
        f"/api/v1/clinics/applications/{application_id}",
        headers={"Authorization": f"Bearer {moderator_token}"},
        json={"status": "approved"},
    )
    assert approval_response.status_code == 200, approval_response.text
    clinic_id = approval_response.json()["clinic_id"]
    assert clinic_id is not None

    role_catalog_response = client.get(
        "/api/v1/clinics/roles/catalog",
        headers={"Authorization": f"Bearer {founder_token}"},
    )
    assert role_catalog_response.status_code == 200, role_catalog_response.text
    assert any(item["code"] == "doctor" for item in role_catalog_response.json())

    assign_response = client.post(
        f"/api/v1/clinics/{clinic_id}/employees",
        headers={"Authorization": f"Bearer {founder_token}"},
        json={
            "iin": "123456789017",
            "role_code": "doctor",
            "department": "Therapy",
            "position": "Doctor",
        },
    )
    assert assign_response.status_code == 201, assign_response.text
    assert assign_response.json()["role_code"] == "doctor"
    assert assign_response.json()["department"] == "Therapy"

    employees_response = client.get(
        f"/api/v1/clinics/{clinic_id}/employees",
        headers={"Authorization": f"Bearer {founder_token}"},
    )
    assert employees_response.status_code == 200, employees_response.text
    assert any(
        item["account_id"] != moderator["id"] and item["role_code"] == "doctor"
        for item in employees_response.json()
    )


def test_clinic_patient_appointment_and_medical_record_flow() -> None:
    register_user("123456789018")
    founder_token = login("123456789018")
    moderator = register_user("123456789019")
    make_superuser(moderator["id"])
    moderator_token = login("123456789019")
    register_user("123456789020")

    application_response = client.post(
        "/api/v1/clinics/applications",
        headers={"Authorization": f"Bearer {founder_token}"},
        json={
            "name": "Clinical Flow Clinic",
            "legal_name": "Clinical Flow Clinic LLP",
            "bin_iin": "990140000003",
            "address": "Shymkent, Tauke Khan 5",
            "submit": True,
        },
    )
    assert application_response.status_code == 201, application_response.text
    application_id = application_response.json()["id"]

    approval_response = client.patch(
        f"/api/v1/clinics/applications/{application_id}",
        headers={"Authorization": f"Bearer {moderator_token}"},
        json={"status": "approved"},
    )
    assert approval_response.status_code == 200, approval_response.text
    clinic_id = approval_response.json()["clinic_id"]
    assert clinic_id is not None

    employee_response = client.post(
        f"/api/v1/clinics/{clinic_id}/employees",
        headers={"Authorization": f"Bearer {founder_token}"},
        json={
            "iin": "123456789020",
            "role_code": "doctor",
            "department": "Therapy",
            "position": "Doctor",
        },
    )
    assert employee_response.status_code == 201, employee_response.text
    doctor_membership_id = employee_response.json()["id"]

    patient_response = client.post(
        "/api/v1/patients",
        headers={"Authorization": f"Bearer {founder_token}"},
        json={
            "iin": "123456789021",
            "first_name": "Patient",
            "last_name": "One",
            "phone": "+77000000021",
            "notes": "Initial card",
        },
    )
    assert patient_response.status_code == 201, patient_response.text
    patient_id = patient_response.json()["id"]

    attach_response = client.post(
        f"/api/v1/clinics/{clinic_id}/patients/{patient_id}",
        headers={"Authorization": f"Bearer {founder_token}"},
    )
    assert attach_response.status_code == 201, attach_response.text

    starts_at = datetime.utcnow().replace(microsecond=0)
    ends_at = starts_at + timedelta(minutes=30)
    appointment_response = client.post(
        f"/api/v1/clinics/{clinic_id}/appointments",
        headers={"Authorization": f"Bearer {founder_token}"},
        json={
            "patient_profile_id": patient_id,
            "doctor_membership_id": doctor_membership_id,
            "starts_at": starts_at.isoformat(),
            "ends_at": ends_at.isoformat(),
            "reason": "Primary consultation",
        },
    )
    assert appointment_response.status_code == 201, appointment_response.text
    appointment_id = appointment_response.json()["id"]

    medical_record_response = client.post(
        f"/api/v1/clinics/{clinic_id}/medical-records",
        headers={"Authorization": f"Bearer {founder_token}"},
        json={
            "patient_profile_id": patient_id,
            "author_membership_id": doctor_membership_id,
            "appointment_id": appointment_id,
            "complaint": "Headache",
            "anamnesis": "No chronic conditions",
            "diagnosis": "Tension headache",
            "prescription": "Hydration and rest",
            "conclusion": "Follow-up in 7 days",
        },
    )
    assert medical_record_response.status_code == 201, medical_record_response.text

    list_records_response = client.get(
        f"/api/v1/clinics/{clinic_id}/medical-records",
        headers={"Authorization": f"Bearer {founder_token}"},
    )
    assert list_records_response.status_code == 200, list_records_response.text
    assert any(
        item["appointment_id"] == appointment_id and item["diagnosis"] == "Tension headache"
        for item in list_records_response.json()
    )
