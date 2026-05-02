from datetime import timedelta

from fastapi import APIRouter
from sqlalchemy import select

from saphena.api.deps import DbSession
from saphena.api.schemas import BootstrapDemoResponse
from saphena.core.security import hash_password, utcnow
from saphena.modules.enums import AppointmentStatus, ClinicApplicationStatus, LeadStatus
from saphena.modules.models import (
    Account,
    Appointment,
    Clinic,
    ClinicApplication,
    ClinicMembership,
    ClinicPatient,
    CrmLead,
    Notification,
    PatientProfile,
    Person,
    SupportTicket,
)
from saphena.modules.permissions import RoleCode

router = APIRouter(prefix="/bootstrap", tags=["bootstrap"])

SUPERADMIN_IIN = "700101000006"
FOUNDER_IIN = "700101000016"
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
        iin="700101000026",
        first_name="Dana",
        last_name="Doctor",
        phone="+77010000003",
        email="doctor@saphena.test",
    )
    _, patient_account, patient_profile = _ensure_person_account(
        db,
        iin="700101000036",
        first_name="Alina",
        last_name="Patient",
        phone="+77010000004",
        email="patient@saphena.test",
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
    for account_id, role_code, position in (
        (founder_account.id, RoleCode.clinic_founder, "Founder"),
        (doctor_account.id, RoleCode.doctor, "Therapist"),
        (superadmin_account.id, RoleCode.platform_superadmin, "Superadmin"),
    ):
        key = (account_id, clinic.id, role_code)
        if key not in memberships and role_code != RoleCode.platform_superadmin:
            db.add(
                ClinicMembership(
                    account_id=account_id,
                    clinic_id=clinic.id,
                    role_code=role_code,
                    position=position,
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
                starts_at=starts_at,
                ends_at=starts_at + timedelta(minutes=30),
                status=AppointmentStatus.confirmed,
                reason="Primary consultation",
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

    founder_ticket = db.scalar(
        select(SupportTicket).where(SupportTicket.requester_account_id == founder_account.id)
    )
    if founder_ticket is None:
        db.add(
            SupportTicket(
                requester_account_id=founder_account.id,
                clinic_id=clinic.id,
                topic="Need help with onboarding",
                message="Please help configure clinic roles and initial schedules.",
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
    )
