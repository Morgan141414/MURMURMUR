from datetime import timedelta

from fastapi import APIRouter
from sqlalchemy import select

from saphena.api.deps import DbSession
from saphena.api.schemas import BootstrapDemoResponse
from saphena.core.security import hash_password, utcnow
from saphena.modules.enums import (
    AppointmentStatus,
    ClinicApplicationStatus,
    LeadStatus,
    ScheduleSlotStatus,
    SupportPriority,
    SupportThreadStatus,
)
from saphena.modules.models import (
    Account,
    Appointment,
    Clinic,
    ClinicApplication,
    ClinicBranch,
    ClinicDepartment,
    ClinicMembership,
    ClinicPatient,
    ClinicRoom,
    ClinicService,
    CrmLead,
    DocumentTemplate,
    GeneratedDocument,
    MedicalRecordEntry,
    Notification,
    PatientProfile,
    Person,
    ScheduleSlot,
    SupportMessage,
    SupportThread,
    SupportTicket,
)
from saphena.modules.permissions import RoleCode

router = APIRouter(prefix="/bootstrap", tags=["bootstrap"])

SUPERADMIN_IIN = "700101000006"
FOUNDER_IIN = "700101000016"
DOCTOR_IIN = "700101000026"
PATIENT_IIN = "700101000036"
RECEPTION_IIN = "700101000046"
SUPPORT_IIN = "700101000056"
DEFAULT_PASSWORD = "DemoPass123"


def _ensure_person_account(
    db: DbSession,
    *,
    iin: str,
    first_name: str,
    last_name: str,
    phone: str,
    email: str,
    is_superuser: bool = False,
) -> tuple[Person, Account, PatientProfile]:
    person = db.scalar(select(Person).where(Person.iin == iin))
    if person is None:
        person = Person(
            iin=iin,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            email=email,
        )
        db.add(person)
        db.flush()
    account = db.scalar(select(Account).where(Account.person_id == person.id))
    if account is None:
        account = Account(person_id=person.id, password_hash=hash_password(DEFAULT_PASSWORD))
        db.add(account)
        db.flush()
    else:
        account.password_hash = hash_password(DEFAULT_PASSWORD)
    account.is_superuser = is_superuser
    db.add(account)
    patient = db.scalar(select(PatientProfile).where(PatientProfile.person_id == person.id))
    if patient is None:
        patient = PatientProfile(person_id=person.id)
        db.add(patient)
        db.flush()
    return person, account, patient


@router.post("/demo", response_model=BootstrapDemoResponse)
def bootstrap_demo(db: DbSession) -> BootstrapDemoResponse:
    _, superadmin_account, _ = _ensure_person_account(
        db,
        iin=SUPERADMIN_IIN,
        first_name="Platform",
        last_name="Admin",
        phone="+77010000001",
        email="superadmin@saphena.test",
        is_superuser=True,
    )
    _, founder_account, founder_patient = _ensure_person_account(
        db,
        iin=FOUNDER_IIN,
        first_name="Amanat",
        last_name="Founder",
        phone="+77010000002",
        email="founder@saphena.test",
    )
    _, doctor_account, doctor_patient = _ensure_person_account(
        db,
        iin=DOCTOR_IIN,
        first_name="Dana",
        last_name="Doctor",
        phone="+77010000003",
        email="doctor@saphena.test",
    )
    _, patient_account, patient_profile = _ensure_person_account(
        db,
        iin=PATIENT_IIN,
        first_name="Alina",
        last_name="Patient",
        phone="+77010000004",
        email="patient@saphena.test",
    )
    _, reception_account, _ = _ensure_person_account(
        db,
        iin=RECEPTION_IIN,
        first_name="Raya",
        last_name="Reception",
        phone="+77010000005",
        email="reception@saphena.test",
    )
    _, support_account, _ = _ensure_person_account(
        db,
        iin=SUPPORT_IIN,
        first_name="Samal",
        last_name="Support",
        phone="+77010000006",
        email="support@saphena.test",
    )

    clinic = db.scalar(select(Clinic).where(Clinic.bin_iin == "990140009999"))
    if clinic is None:
        clinic = Clinic(
            name="Saphena Demo Clinic",
            legal_name="Saphena Demo Clinic LLP",
            bin_iin="990140009999",
            address="Almaty, Abay avenue 12",
            contacts="+77010000999",
        )
        db.add(clinic)
        db.flush()

    application = db.scalar(
        select(ClinicApplication).where(ClinicApplication.bin_iin == clinic.bin_iin)
    )
    if application is None:
        application = ClinicApplication(
            applicant_account_id=founder_account.id,
            clinic_id=clinic.id,
            name=clinic.name,
            legal_name=clinic.legal_name,
            bin_iin=clinic.bin_iin,
            address=clinic.address,
            contacts=clinic.contacts,
            founder_data="Amanat 100%",
            status=ClinicApplicationStatus.approved,
        )
        db.add(application)

    memberships = {
        (item.account_id, item.clinic_id, item.role_code)
        for item in db.scalars(select(ClinicMembership)).all()
    }
    for account_id, role_code, position, department in (
        (founder_account.id, RoleCode.clinic_founder, "Founder", "Management"),
        (doctor_account.id, RoleCode.doctor, "Therapist", "Therapy"),
        (reception_account.id, RoleCode.reception_admin, "Reception administrator", "Front desk"),
        (support_account.id, RoleCode.support_agent, "Support agent", "Support"),
    ):
        key = (account_id, clinic.id, role_code)
        if key not in memberships:
            db.add(
                ClinicMembership(
                    account_id=account_id,
                    clinic_id=clinic.id,
                    role_code=role_code,
                    position=position,
                    department=department,
                )
            )

    clinic_patient = db.scalar(
        select(ClinicPatient).where(
            ClinicPatient.clinic_id == clinic.id,
            ClinicPatient.patient_profile_id == patient_profile.id,
        )
    )
    if clinic_patient is None:
        db.add(ClinicPatient(clinic_id=clinic.id, patient_profile_id=patient_profile.id))

    branch = db.scalar(select(ClinicBranch).where(ClinicBranch.clinic_id == clinic.id))
    if branch is None:
        branch = ClinicBranch(
            clinic_id=clinic.id,
            name="Main branch",
            address=clinic.address,
            contacts=clinic.contacts,
        )
        db.add(branch)
        db.flush()

    department = db.scalar(select(ClinicDepartment).where(ClinicDepartment.clinic_id == clinic.id))
    if department is None:
        department = ClinicDepartment(
            clinic_id=clinic.id,
            branch_id=branch.id,
            name="Therapy",
            description="General outpatient consultations",
        )
        db.add(department)
        db.flush()

    room = db.scalar(select(ClinicRoom).where(ClinicRoom.clinic_id == clinic.id))
    if room is None:
        room = ClinicRoom(
            clinic_id=clinic.id,
            branch_id=branch.id,
            department_id=department.id,
            number="101",
            title="Therapy room",
        )
        db.add(room)
        db.flush()

    service = db.scalar(select(ClinicService).where(ClinicService.clinic_id == clinic.id))
    if service is None:
        service = ClinicService(
            clinic_id=clinic.id,
            department_id=department.id,
            code="therapy_consult",
            title="Therapist consultation",
            duration_minutes=30,
            price=7000,
        )
        db.add(service)
        db.flush()

    appointment = db.scalar(select(Appointment).where(Appointment.clinic_id == clinic.id))
    if appointment is None:
        doctor_membership = db.scalar(
            select(ClinicMembership).where(
                ClinicMembership.clinic_id == clinic.id,
                ClinicMembership.account_id == doctor_account.id,
            )
        )
        starts_at = utcnow() + timedelta(days=1)
        db.add(
            Appointment(
                clinic_id=clinic.id,
                patient_profile_id=patient_profile.id,
                doctor_membership_id=doctor_membership.id if doctor_membership else None,
                room_id=room.id,
                service_id=service.id,
                starts_at=starts_at,
                ends_at=starts_at + timedelta(minutes=30),
                status=AppointmentStatus.confirmed,
                reason="Primary consultation",
            )
        )
        db.flush()
        if doctor_membership is not None:
            db.add(
                ScheduleSlot(
                    clinic_id=clinic.id,
                    doctor_membership_id=doctor_membership.id,
                    room_id=room.id,
                    service_id=service.id,
                    starts_at=starts_at,
                    ends_at=starts_at + timedelta(minutes=30),
                    status=ScheduleSlotStatus.booked,
                    note="Demo booked consultation",
                )
            )

    if db.scalar(select(ScheduleSlot).where(ScheduleSlot.clinic_id == clinic.id)) is None:
        doctor_membership = db.scalar(
            select(ClinicMembership).where(
                ClinicMembership.clinic_id == clinic.id,
                ClinicMembership.account_id == doctor_account.id,
            )
        )
        starts_at = (appointment.starts_at if appointment is not None else utcnow() + timedelta(days=1))
        ends_at = (appointment.ends_at if appointment is not None else starts_at + timedelta(minutes=30))
        if doctor_membership is not None:
            db.add(
                ScheduleSlot(
                    clinic_id=clinic.id,
                    doctor_membership_id=doctor_membership.id,
                    room_id=room.id,
                    service_id=service.id,
                    starts_at=starts_at,
                    ends_at=ends_at,
                    status=ScheduleSlotStatus.booked,
                    note="Demo booked consultation",
                )
            )

    if db.scalar(select(CrmLead).where(CrmLead.clinic_id == clinic.id)) is None:
        db.add(
            CrmLead(
                clinic_id=clinic.id,
                full_name="Lead from Instagram",
                phone="+77070000007",
                source="Instagram",
                status=LeadStatus.new,
                note="Interested in cardiology consultation",
            )
        )

    support_thread = db.scalar(
        select(SupportThread).where(SupportThread.requester_account_id == founder_account.id)
    )
    if support_thread is None:
        support_thread = SupportThread(
            requester_account_id=founder_account.id,
            clinic_id=clinic.id,
            subject="Need help with onboarding",
            request_type="onboarding",
            status=SupportThreadStatus.in_progress,
            priority=SupportPriority.high,
            assigned_to_account_id=support_account.id,
            last_message_at=utcnow(),
        )
        db.add(support_thread)
        db.flush()
        db.add(
            SupportMessage(
                thread_id=support_thread.id,
                author_account_id=founder_account.id,
                body="Please help configure clinic roles and initial schedules.",
            )
        )

    founder_ticket = db.scalar(
        select(SupportTicket).where(SupportTicket.requester_account_id == founder_account.id)
    )
    if founder_ticket is None:
        db.add(
            SupportTicket(
                support_thread_id=support_thread.id,
                requester_account_id=founder_account.id,
                clinic_id=clinic.id,
                topic="Need help with onboarding",
                message="Please help configure clinic roles and initial schedules.",
            )
        )
    elif founder_ticket.support_thread_id is None:
        founder_ticket.support_thread_id = support_thread.id
        db.add(founder_ticket)

    doctor_membership = db.scalar(
        select(ClinicMembership).where(
            ClinicMembership.clinic_id == clinic.id,
            ClinicMembership.account_id == doctor_account.id,
        )
    )
    appointment = db.scalar(select(Appointment).where(Appointment.clinic_id == clinic.id))
    record = db.scalar(select(MedicalRecordEntry).where(MedicalRecordEntry.clinic_id == clinic.id))
    if record is None:
        record = MedicalRecordEntry(
            clinic_id=clinic.id,
            patient_profile_id=patient_profile.id,
            author_membership_id=doctor_membership.id if doctor_membership else None,
            appointment_id=appointment.id if appointment else None,
            complaint="Headache",
            diagnosis="Tension headache",
            prescription="Hydration and rest",
            conclusion="Follow-up in 7 days",
        )
        db.add(record)
        db.flush()

    template = db.scalar(
        select(DocumentTemplate).where(
            DocumentTemplate.clinic_id == clinic.id,
            DocumentTemplate.code == "initial_exam",
        )
    )
    if template is None:
        template = DocumentTemplate(
            clinic_id=clinic.id,
            code="initial_exam",
            title="Initial exam protocol",
            body="Patient: {{patient.last_name}} {{patient.first_name}}\nDiagnosis: {{diagnosis}}\nConclusion: {{conclusion}}",
        )
        db.add(template)
        db.flush()

    if db.scalar(select(GeneratedDocument).where(GeneratedDocument.clinic_id == clinic.id)) is None:
        db.add(
            GeneratedDocument(
                clinic_id=clinic.id,
                template_id=template.id,
                patient_profile_id=patient_profile.id,
                appointment_id=appointment.id if appointment else None,
                medical_record_entry_id=record.id,
                code=template.code,
                title=template.title,
                body=f"Patient: {patient_profile.person.last_name} {patient_profile.person.first_name}\nDiagnosis: {record.diagnosis}\nConclusion: {record.conclusion}",
            )
        )

    if db.scalar(select(Notification).where(Notification.account_id == founder_account.id)) is None:
        db.add(
            Notification(
                account_id=founder_account.id,
                title="Demo clinic approved",
                body="Your demo clinic is ready for review and first employee assignment.",
            )
        )

    db.commit()
    return BootstrapDemoResponse(
        message="Demo data is ready",
        superadmin_iin=SUPERADMIN_IIN,
        superadmin_password=DEFAULT_PASSWORD,
        founder_iin=FOUNDER_IIN,
        founder_password=DEFAULT_PASSWORD,
        doctor_iin=DOCTOR_IIN,
        doctor_password=DEFAULT_PASSWORD,
        patient_iin=PATIENT_IIN,
        patient_password=DEFAULT_PASSWORD,
        reception_iin=RECEPTION_IIN,
        reception_password=DEFAULT_PASSWORD,
        support_iin=SUPPORT_IIN,
        support_password=DEFAULT_PASSWORD,
    )
