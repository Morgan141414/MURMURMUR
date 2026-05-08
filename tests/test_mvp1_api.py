import os
import tempfile
from datetime import UTC, datetime, timedelta

os.environ["SAPHENA_DATABASE_URL"] = f"sqlite:///{tempfile.NamedTemporaryFile(delete=False).name}"

from fastapi.testclient import TestClient  # noqa: E402

from saphena.core.database import SessionLocal, create_schema  # noqa: E402
from saphena.main import app  # noqa: E402
from saphena.modules.models import Account  # noqa: E402

client = TestClient(app)


def setup_module() -> None:
    create_schema()


def build_valid_iin(prefix11: str) -> str:
    assert len(prefix11) == 11 and prefix11.isdigit()
    digits = [int(char) for char in prefix11]
    base_weights = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    checksum = sum(d * w for d, w in zip(digits, base_weights, strict=False)) % 11
    if checksum == 10:
        fallback_weights = [3, 4, 5, 6, 7, 8, 9, 10, 11, 1, 2]
        checksum = sum(d * w for d, w in zip(digits, fallback_weights, strict=False)) % 11
    if checksum == 10:
        return build_valid_iin(str(int(prefix11) + 1).zfill(11))
    return f"{prefix11}{checksum}"


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
    iin = build_valid_iin("92010100001")
    user = register_user(iin)
    token = login(iin)

    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["id"] == user["id"]
    assert response.json()["person"]["iin"] == iin


def test_clinic_application_approval_creates_clinic_and_founder_membership() -> None:
    founder_iin = build_valid_iin("92010100002")
    moderator_iin = build_valid_iin("92010100003")
    register_user(founder_iin)
    founder_token = login(founder_iin)
    moderator = register_user(moderator_iin)
    make_superuser(moderator["id"])
    moderator_token = login(moderator_iin)

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
    founder_iin = build_valid_iin("92010100004")
    moderator_iin = build_valid_iin("92010100005")
    doctor_iin = build_valid_iin("92010100006")
    register_user(founder_iin)
    founder_token = login(founder_iin)
    moderator = register_user(moderator_iin)
    make_superuser(moderator["id"])
    moderator_token = login(moderator_iin)
    register_user(doctor_iin)

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
            "iin": doctor_iin,
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
    founder_iin = build_valid_iin("92010100007")
    moderator_iin = build_valid_iin("92010100008")
    doctor_iin = build_valid_iin("92010100009")
    patient_iin = build_valid_iin("92010100010")

    register_user(founder_iin)
    founder_token = login(founder_iin)
    moderator = register_user(moderator_iin)
    make_superuser(moderator["id"])
    moderator_token = login(moderator_iin)
    register_user(doctor_iin)

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
            "iin": doctor_iin,
            "role_code": "doctor",
            "department": "Therapy",
            "position": "Doctor",
        },
    )
    assert employee_response.status_code == 201, employee_response.text
    doctor_membership_id = employee_response.json()["id"]

    branch_response = client.post(
        f"/api/v1/clinics/{clinic_id}/branches",
        headers={"Authorization": f"Bearer {founder_token}"},
        json={
            "name": "Main branch",
            "address": "Shymkent, Tauke Khan 5",
            "contacts": "+77000000031",
        },
    )
    assert branch_response.status_code == 201, branch_response.text
    branch_id = branch_response.json()["id"]

    department_response = client.post(
        f"/api/v1/clinics/{clinic_id}/departments",
        headers={"Authorization": f"Bearer {founder_token}"},
        json={
            "branch_id": branch_id,
            "name": "Therapy",
            "description": "General outpatient consultations",
        },
    )
    assert department_response.status_code == 201, department_response.text
    department_id = department_response.json()["id"]

    room_response = client.post(
        f"/api/v1/clinics/{clinic_id}/rooms",
        headers={"Authorization": f"Bearer {founder_token}"},
        json={
            "branch_id": branch_id,
            "department_id": department_id,
            "number": "101",
            "title": "Consultation room",
        },
    )
    assert room_response.status_code == 201, room_response.text
    room_id = room_response.json()["id"]

    service_response = client.post(
        f"/api/v1/clinics/{clinic_id}/services",
        headers={"Authorization": f"Bearer {founder_token}"},
        json={
            "department_id": department_id,
            "code": "therapy_consult",
            "title": "Therapist consultation",
            "duration_minutes": 30,
            "price": 7000,
        },
    )
    assert service_response.status_code == 201, service_response.text
    service_id = service_response.json()["id"]

    patient_response = client.post(
        "/api/v1/patients",
        headers={"Authorization": f"Bearer {founder_token}"},
        json={
            "iin": patient_iin,
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

    starts_at = datetime.now(UTC).replace(tzinfo=None, microsecond=0)
    ends_at = starts_at + timedelta(minutes=30)
    schedule_slot_response = client.post(
        f"/api/v1/clinics/{clinic_id}/schedule/slots",
        headers={"Authorization": f"Bearer {founder_token}"},
        json={
            "doctor_membership_id": doctor_membership_id,
            "room_id": room_id,
            "service_id": service_id,
            "starts_at": starts_at.isoformat(),
            "ends_at": ends_at.isoformat(),
            "note": "Primary consultation window",
        },
    )
    assert schedule_slot_response.status_code == 201, schedule_slot_response.text
    schedule_slot_id = schedule_slot_response.json()["id"]
    assert schedule_slot_response.json()["room_id"] == room_id
    assert schedule_slot_response.json()["service_id"] == service_id

    overlapping_slot_response = client.post(
        f"/api/v1/clinics/{clinic_id}/schedule/slots",
        headers={"Authorization": f"Bearer {founder_token}"},
        json={
            "doctor_membership_id": doctor_membership_id,
            "starts_at": (starts_at + timedelta(minutes=10)).isoformat(),
            "ends_at": (ends_at + timedelta(minutes=10)).isoformat(),
            "note": "Overlapping schedule slot",
        },
    )
    assert overlapping_slot_response.status_code == 409, overlapping_slot_response.text

    schedule_slots_response = client.get(
        f"/api/v1/clinics/{clinic_id}/schedule/slots",
        headers={"Authorization": f"Bearer {founder_token}"},
    )
    assert schedule_slots_response.status_code == 200, schedule_slots_response.text
    assert any(slot["id"] == schedule_slot_id for slot in schedule_slots_response.json())

    appointment_response = client.post(
        f"/api/v1/clinics/{clinic_id}/appointments",
        headers={"Authorization": f"Bearer {founder_token}"},
        json={
            "patient_profile_id": patient_id,
            "doctor_membership_id": doctor_membership_id,
            "room_id": room_id,
            "service_id": service_id,
            "starts_at": starts_at.isoformat(),
            "ends_at": ends_at.isoformat(),
            "reason": "Primary consultation",
        },
    )
    assert appointment_response.status_code == 201, appointment_response.text
    appointment_id = appointment_response.json()["id"]
    assert appointment_response.json()["room_id"] == room_id
    assert appointment_response.json()["service_id"] == service_id

    booked_slots_response = client.get(
        f"/api/v1/clinics/{clinic_id}/schedule/slots",
        headers={"Authorization": f"Bearer {founder_token}"},
    )
    assert booked_slots_response.status_code == 200, booked_slots_response.text
    booked_slot = next(
        slot for slot in booked_slots_response.json() if slot["id"] == schedule_slot_id
    )
    assert booked_slot["status"] == "booked"

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

    template_create_response = client.post(
        f"/api/v1/clinics/{clinic_id}/documents/templates",
        headers={"Authorization": f"Bearer {founder_token}"},
        json={
            "code": "initial_exam",
            "title": "Первичный осмотр",
            "body": "Жалобы: {{complaint}}\\nДиагноз: {{diagnosis}}",
        },
    )
    assert template_create_response.status_code == 201, template_create_response.text
    assert template_create_response.json()["code"] == "initial_exam"

    templates_list_response = client.get(
        f"/api/v1/clinics/{clinic_id}/documents/templates",
        headers={"Authorization": f"Bearer {founder_token}"},
    )
    assert templates_list_response.status_code == 200, templates_list_response.text
    assert any(item["code"] == "initial_exam" for item in templates_list_response.json())

    render_response = client.post(
        f"/api/v1/clinics/{clinic_id}/documents/render",
        headers={"Authorization": f"Bearer {founder_token}"},
        json={
            "template_code": "initial_exam",
            "patient_profile_id": patient_id,
            "appointment_id": appointment_id,
            "medical_record_entry_id": medical_record_response.json()["id"],
            "extras": {"clinic_name": "Clinical Flow Clinic"},
        },
    )
    assert render_response.status_code == 201, render_response.text
    body = render_response.json()["body"]
    assert "Headache" in body
    assert "Tension headache" in body

    generated_list_response = client.get(
        f"/api/v1/clinics/{clinic_id}/documents/generated",
        headers={"Authorization": f"Bearer {founder_token}"},
    )
    assert generated_list_response.status_code == 200, generated_list_response.text
    assert any(item["code"] == "initial_exam" for item in generated_list_response.json())

    invalid_document_response = client.post(
        f"/api/v1/clinics/{clinic_id}/documents/render",
        headers={"Authorization": f"Bearer {founder_token}"},
        json={
            "template_code": "initial_exam",
            "patient_profile_id": patient_id,
            "appointment_id": appointment_id + 9999,
        },
    )
    assert invalid_document_response.status_code == 400, invalid_document_response.text

    patient_token = login(patient_iin, "PatientPass123")
    patient_notifications_response = client.get(
        "/api/v1/notifications",
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert patient_notifications_response.status_code == 200, patient_notifications_response.text
    patient_notification_titles = {item["title"] for item in patient_notifications_response.json()}
    assert "Medical record updated" in patient_notification_titles
    assert "Document generated" in patient_notification_titles

    overlap_response = client.post(
        f"/api/v1/clinics/{clinic_id}/appointments",
        headers={"Authorization": f"Bearer {founder_token}"},
        json={
            "patient_profile_id": patient_id,
            "doctor_membership_id": doctor_membership_id,
            "starts_at": (starts_at + timedelta(minutes=10)).isoformat(),
            "ends_at": (ends_at + timedelta(minutes=10)).isoformat(),
            "reason": "Overbooking check",
        },
    )
    assert overlap_response.status_code == 409, overlap_response.text

    cancel_response = client.patch(
        f"/api/v1/clinics/{clinic_id}/appointments/{appointment_id}",
        headers={"Authorization": f"Bearer {founder_token}"},
        json={"status": "canceled"},
    )
    assert cancel_response.status_code == 200, cancel_response.text
    assert cancel_response.json()["status"] == "canceled"

    released_slots_response = client.get(
        f"/api/v1/clinics/{clinic_id}/schedule/slots",
        headers={"Authorization": f"Bearer {founder_token}"},
    )
    assert released_slots_response.status_code == 200, released_slots_response.text
    released_slot = next(
        slot for slot in released_slots_response.json() if slot["id"] == schedule_slot_id
    )
    assert released_slot["status"] == "available"

    schedule_response = client.get(
        f"/api/v1/clinics/{clinic_id}/schedule",
        headers={"Authorization": f"Bearer {founder_token}"},
    )
    assert schedule_response.status_code == 200, schedule_response.text
    assert any(slot["id"] == appointment_id for slot in schedule_response.json())

    mark_one_notification = client.post(
        "/api/v1/notifications/read-all",
        headers={"Authorization": f"Bearer {founder_token}"},
    )
    assert mark_one_notification.status_code == 200, mark_one_notification.text


def test_invalid_iin_rejected() -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "iin": "123456789012",
            "password": "StrongPass123",
            "first_name": "Invalid",
            "last_name": "IIN",
        },
    )
    assert response.status_code == 422, response.text


def test_support_threads_permissions_and_updates() -> None:
    user_iin = build_valid_iin("92010100011")
    support_iin = build_valid_iin("92010100012")
    outsider_iin = build_valid_iin("92010100013")

    register_user(user_iin)
    user_token = login(user_iin)
    support = register_user(support_iin)
    outsider = register_user(outsider_iin)
    outsider_token = login(outsider_iin)
    make_superuser(support["id"])
    support_token = login(support_iin)

    create_response = client.post(
        "/api/v1/support/threads",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "subject": "Login issue",
            "body": "I cannot log in from mobile app",
            "priority": "high",
            "request_type": "general",
        },
    )
    assert create_response.status_code == 201, create_response.text
    thread_id = create_response.json()["id"]

    own_list = client.get("/api/v1/support/threads", headers={"Authorization": f"Bearer {user_token}"})
    assert own_list.status_code == 200, own_list.text
    assert any(item["id"] == thread_id for item in own_list.json())

    denied_detail = client.get(
        f"/api/v1/support/threads/{thread_id}",
        headers={"Authorization": f"Bearer {outsider_token}"},
    )
    assert denied_detail.status_code == 403, denied_detail.text

    manager_detail = client.get(
        f"/api/v1/support/threads/{thread_id}",
        headers={"Authorization": f"Bearer {support_token}"},
    )
    assert manager_detail.status_code == 200, manager_detail.text
    assert len(manager_detail.json()["messages"]) == 1

    reply_response = client.post(
        f"/api/v1/support/threads/{thread_id}/messages",
        headers={"Authorization": f"Bearer {support_token}"},
        json={"body": "Please try to reset your password."},
    )
    assert reply_response.status_code == 201, reply_response.text

    user_view = client.get(
        f"/api/v1/support/threads/{thread_id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert user_view.status_code == 200, user_view.text
    assert len(user_view.json()["messages"]) == 2

    update_response = client.patch(
        f"/api/v1/support/threads/{thread_id}",
        headers={"Authorization": f"Bearer {support_token}"},
        json={"status": "closed", "priority": "critical"},
    )
    assert update_response.status_code == 200, update_response.text
    assert update_response.json()["status"] == "closed"
    assert update_response.json()["priority"] == "critical"

    audit_response = client.get(
        "/api/v1/admin/audit", headers={"Authorization": f"Bearer {support_token}"}
    )
    assert audit_response.status_code == 200, audit_response.text
    actions = {item["action"] for item in audit_response.json()}
    assert "support_thread.create" in actions
    assert "support_message.create" in actions


def test_support_rejects_blank_messages_and_closed_thread_user_reply() -> None:
    user_iin = build_valid_iin("92010100014")
    support_iin = build_valid_iin("92010100015")

    register_user(user_iin)
    user_token = login(user_iin)
    support = register_user(support_iin)
    make_superuser(support["id"])
    support_token = login(support_iin)

    blank_create = client.post(
        "/api/v1/support/threads",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "subject": "   ",
            "body": "   ",
            "priority": "normal",
            "request_type": "general",
        },
    )
    assert blank_create.status_code == 422, blank_create.text

    create_response = client.post(
        "/api/v1/support/threads",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "subject": "  Need help with schedule  ",
            "body": "  Please check overlapping slots.  ",
            "priority": "high",
            "request_type": "  general  ",
        },
    )
    assert create_response.status_code == 201, create_response.text
    assert create_response.json()["subject"] == "Need help with schedule"
    assert create_response.json()["request_type"] == "general"
    thread_id = create_response.json()["id"]

    close_response = client.patch(
        f"/api/v1/support/threads/{thread_id}",
        headers={"Authorization": f"Bearer {support_token}"},
        json={"status": "closed"},
    )
    assert close_response.status_code == 200, close_response.text

    user_reply_closed = client.post(
        f"/api/v1/support/threads/{thread_id}/messages",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"body": "Any updates?"},
    )
    assert user_reply_closed.status_code == 409, user_reply_closed.text

    support_reply_closed = client.post(
        f"/api/v1/support/threads/{thread_id}/messages",
        headers={"Authorization": f"Bearer {support_token}"},
        json={"body": "Closing summary and resolution."},
    )
    assert support_reply_closed.status_code == 201, support_reply_closed.text


def test_bootstrap_demo_provisions_full_mvp1_dataset() -> None:
    response = client.post("/api/v1/bootstrap/demo")
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["doctor_iin"] == "700101000026"
    assert payload["patient_iin"] == "700101000036"
    assert payload["reception_iin"] == "700101000046"
    assert payload["support_iin"] == "700101000056"

    founder_token = login(payload["founder_iin"], payload["founder_password"])
    clinics_response = client.get(
        "/api/v1/clinics",
        headers={"Authorization": f"Bearer {founder_token}"},
    )
    assert clinics_response.status_code == 200, clinics_response.text
    clinic_id = next(item["id"] for item in clinics_response.json() if item["name"] == "Saphena Demo Clinic")

    for path in (
        "branches",
        "departments",
        "rooms",
        "services",
        "patients",
        "appointments",
        "schedule/slots",
        "medical-records",
        "documents/templates",
        "documents/generated",
    ):
        item_response = client.get(
            f"/api/v1/clinics/{clinic_id}/{path}",
            headers={"Authorization": f"Bearer {founder_token}"},
        )
        assert item_response.status_code == 200, item_response.text
        assert len(item_response.json()) >= 1, path

    support_token = login(payload["support_iin"], payload["support_password"])
    support_threads_response = client.get(
        "/api/v1/support/threads",
        headers={"Authorization": f"Bearer {support_token}"},
    )
    assert support_threads_response.status_code == 200, support_threads_response.text
    assert any(item["assigned_to_account_id"] is not None for item in support_threads_response.json())


def test_tetis_clinic_sync_creates_founder_clinic_and_is_idempotent() -> None:
    moderator_iin = build_valid_iin("92010100016")
    founder_iin = build_valid_iin("92010100017")
    moderator = register_user(moderator_iin)
    make_superuser(moderator["id"])
    moderator_token = login(moderator_iin)

    payload = {
        "external_id": "tetis-mvp-001",
        "status": "approved",
        "name": "Tetis Synced Clinic",
        "legal_name": "Tetis Synced Clinic LLP",
        "bin_iin": "990140000004",
        "address": "Almaty, Tetis 10",
        "contacts": "+77000000444",
        "founder": {
            "iin": founder_iin,
            "first_name": "Tetis",
            "last_name": "Founder",
            "phone": "+77000000445",
            "email": "tetis-founder@example.com",
        },
        "founder_data": "Tetis founder 100%",
        "oked": "86210",
        "activity_description": "Clinic created by Tetis Projects Control",
    }

    denied_response = client.post("/api/v1/integrations/tetis/clinics", json=payload)
    assert denied_response.status_code == 403, denied_response.text

    sync_response = client.post(
        "/api/v1/integrations/tetis/clinics",
        headers={"Authorization": f"Bearer {moderator_token}"},
        json=payload,
    )
    assert sync_response.status_code == 200, sync_response.text
    sync_payload = sync_response.json()
    assert sync_payload["clinic_id"] is not None
    assert sync_payload["founder_membership_id"] is not None
    assert sync_payload["created_clinic"] is True
    assert sync_payload["created_founder_account"] is True
    assert sync_payload["created_founder_membership"] is True

    repeat_response = client.post(
        "/api/v1/integrations/tetis/clinics",
        headers={"Authorization": f"Bearer {moderator_token}"},
        json={**payload, "name": "Tetis Synced Clinic Updated"},
    )
    assert repeat_response.status_code == 200, repeat_response.text
    repeat_payload = repeat_response.json()
    assert repeat_payload["clinic_id"] == sync_payload["clinic_id"]
    assert repeat_payload["application_id"] == sync_payload["application_id"]
    assert repeat_payload["founder_membership_id"] == sync_payload["founder_membership_id"]
    assert repeat_payload["created_clinic"] is False
    assert repeat_payload["created_founder_account"] is False
    assert repeat_payload["created_founder_membership"] is False

    clinics_response = client.get(
        "/api/v1/clinics",
        headers={"Authorization": f"Bearer {moderator_token}"},
    )
    assert clinics_response.status_code == 200, clinics_response.text
    synced_clinics = [item for item in clinics_response.json() if item["bin_iin"] == payload["bin_iin"]]
    assert len(synced_clinics) == 1
    assert synced_clinics[0]["name"] == "Tetis Synced Clinic Updated"

    audit_response = client.get(
        "/api/v1/admin/audit",
        headers={"Authorization": f"Bearer {moderator_token}"},
    )
    assert audit_response.status_code == 200, audit_response.text
    assert any(item["action"] == "tetis.clinic_sync" for item in audit_response.json())


def test_spa_index_no_cache_headers() -> None:
    response = client.get("/")
    assert response.status_code == 200, response.text
    assert response.headers.get("cache-control") == "no-store, no-cache, must-revalidate, max-age=0"
    assert response.headers.get("pragma") == "no-cache"
    assert response.headers.get("expires") == "0"
