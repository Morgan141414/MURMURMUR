from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from saphena.api.deps import CurrentAccount, DbSession
from saphena.api.schemas import (
    AppointmentCreate,
    AppointmentRead,
    LeadCreate,
    LeadRead,
    NotificationRead,
    PatientCreate,
    PatientRead,
    SupportTicketCreate,
    SupportTicketRead,
)
from saphena.core.security import hash_password
from saphena.modules.models import (
    Account,
    Appointment,
    ClinicPatient,
    CrmLead,
    Notification,
    PatientProfile,
    Person,
    SupportTicket,
)
from saphena.modules.permissions import PermissionCode
from saphena.services.access import has_permission
from saphena.services.audit import audit

router = APIRouter(tags=["operations"])


@router.get("/patients", response_model=list[PatientRead])
def list_patients(db: DbSession, current_account: CurrentAccount) -> list[PatientProfile]:
    if current_account.is_superuser:
        return list(db.scalars(select(PatientProfile).order_by(PatientProfile.id.desc())).all())
    if not has_permission(db, current_account, PermissionCode.patient_manage):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing patient access")
    return list(db.scalars(select(PatientProfile).order_by(PatientProfile.id.desc())).all())


@router.post("/patients", response_model=PatientRead, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: PatientCreate, db: DbSession, current_account: CurrentAccount
) -> PatientProfile:
    if not current_account.is_superuser and not has_permission(
        db, current_account, PermissionCode.patient_manage
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing patient access")

    person = db.scalar(select(Person).where(Person.iin == payload.iin))
    if person is None:
        person = Person(
            iin=payload.iin,
            first_name=payload.first_name,
            last_name=payload.last_name,
            middle_name=payload.middle_name,
            phone=payload.phone,
            email=str(payload.email) if payload.email else None,
        )
        account = Account(person=person, password_hash=hash_password("PatientPass123"))
        db.add_all([person, account])
        db.flush()
    patient = db.scalar(select(PatientProfile).where(PatientProfile.person_id == person.id))
    if patient is None:
        patient = PatientProfile(person_id=person.id, notes=payload.notes)
        db.add(patient)
        db.flush()
    else:
        patient.notes = payload.notes or patient.notes
        db.add(patient)
    audit(
        db,
        action="patient.create",
        entity_type="patient_profile",
        actor=current_account,
        entity_id=patient.id,
    )
    db.commit()
    db.refresh(patient)
    return patient


@router.get("/clinics/{clinic_id}/patients", response_model=list[PatientRead])
def list_clinic_patients(
    clinic_id: int, db: DbSession, current_account: CurrentAccount
) -> list[PatientProfile]:
    if not (
        current_account.is_superuser
        or has_permission(db, current_account, PermissionCode.patient_manage, clinic_id)
        or has_permission(db, current_account, PermissionCode.clinic_read, clinic_id)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing clinic patient access",
        )
    stmt = (
        select(PatientProfile)
        .join(ClinicPatient, ClinicPatient.patient_profile_id == PatientProfile.id)
        .where(ClinicPatient.clinic_id == clinic_id)
        .order_by(PatientProfile.id.desc())
    )
    return list(db.scalars(stmt).all())


@router.post(
    "/clinics/{clinic_id}/patients/{patient_profile_id}",
    status_code=status.HTTP_201_CREATED,
)
def attach_patient_to_clinic(
    clinic_id: int,
    patient_profile_id: int,
    db: DbSession,
    current_account: CurrentAccount,
) -> dict[str, int]:
    if not (
        current_account.is_superuser
        or has_permission(db, current_account, PermissionCode.patient_manage, clinic_id)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing patient manage rights",
        )
    existing = db.scalar(
        select(ClinicPatient).where(
            ClinicPatient.clinic_id == clinic_id,
            ClinicPatient.patient_profile_id == patient_profile_id,
        )
    )
    if existing is None:
        item = ClinicPatient(clinic_id=clinic_id, patient_profile_id=patient_profile_id)
        db.add(item)
        audit(
            db,
            action="clinic_patient.attach",
            entity_type="clinic_patient",
            actor=current_account,
            clinic_id=clinic_id,
            entity_id=patient_profile_id,
        )
        db.commit()
    return {"clinic_id": clinic_id, "patient_profile_id": patient_profile_id}


@router.get("/clinics/{clinic_id}/appointments", response_model=list[AppointmentRead])
def list_appointments(
    clinic_id: int, db: DbSession, current_account: CurrentAccount
) -> list[Appointment]:
    if not (
        current_account.is_superuser
        or has_permission(db, current_account, PermissionCode.appointment_manage, clinic_id)
        or has_permission(db, current_account, PermissionCode.clinic_read, clinic_id)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing appointment access",
        )
    stmt = (
        select(Appointment)
        .where(Appointment.clinic_id == clinic_id)
        .order_by(Appointment.starts_at.desc())
    )
    return list(db.scalars(stmt).all())


@router.post(
    "/clinics/{clinic_id}/appointments",
    response_model=AppointmentRead,
    status_code=status.HTTP_201_CREATED,
)
def create_appointment(
    clinic_id: int,
    payload: AppointmentCreate,
    db: DbSession,
    current_account: CurrentAccount,
) -> Appointment:
    if not (
        current_account.is_superuser
        or has_permission(db, current_account, PermissionCode.appointment_manage, clinic_id)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing appointment rights",
        )
    item = Appointment(
        clinic_id=clinic_id,
        patient_profile_id=payload.patient_profile_id,
        doctor_membership_id=payload.doctor_membership_id,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        status=payload.status,
        reason=payload.reason,
    )
    db.add(item)
    db.flush()
    audit(
        db,
        action="appointment.create",
        entity_type="appointment",
        actor=current_account,
        clinic_id=clinic_id,
        entity_id=item.id,
    )
    db.commit()
    db.refresh(item)
    return item


@router.get("/crm/leads", response_model=list[LeadRead])
def list_leads(db: DbSession, current_account: CurrentAccount) -> list[CrmLead]:
    if not current_account.is_superuser and not has_permission(
        db, current_account, PermissionCode.crm_manage
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing CRM access")
    return list(db.scalars(select(CrmLead).order_by(CrmLead.id.desc())).all())


@router.post("/crm/leads", response_model=LeadRead, status_code=status.HTTP_201_CREATED)
def create_lead(payload: LeadCreate, db: DbSession, current_account: CurrentAccount) -> CrmLead:
    if not current_account.is_superuser and not has_permission(
        db, current_account, PermissionCode.crm_manage, payload.clinic_id
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing CRM rights")
    item = CrmLead(
        clinic_id=payload.clinic_id,
        full_name=payload.full_name,
        phone=payload.phone,
        source=payload.source,
        status=payload.status,
        note=payload.note,
    )
    db.add(item)
    db.flush()
    audit(
        db,
        action="crm_lead.create",
        entity_type="crm_lead",
        actor=current_account,
        clinic_id=payload.clinic_id,
        entity_id=item.id,
    )
    db.commit()
    db.refresh(item)
    return item


@router.get("/support/tickets", response_model=list[SupportTicketRead])
def list_support_tickets(db: DbSession, current_account: CurrentAccount) -> list[SupportTicket]:
    if current_account.is_superuser or has_permission(
        db, current_account, PermissionCode.support_manage
    ):
        return list(db.scalars(select(SupportTicket).order_by(SupportTicket.id.desc())).all())
    stmt = (
        select(SupportTicket)
        .where(SupportTicket.requester_account_id == current_account.id)
        .order_by(SupportTicket.id.desc())
    )
    return list(db.scalars(stmt).all())


@router.post(
    "/support/tickets",
    response_model=SupportTicketRead,
    status_code=status.HTTP_201_CREATED,
)
def create_support_ticket(
    payload: SupportTicketCreate, db: DbSession, current_account: CurrentAccount
) -> SupportTicket:
    item = SupportTicket(
        requester_account_id=current_account.id,
        clinic_id=payload.clinic_id,
        topic=payload.topic,
        message=payload.message,
    )
    db.add(item)
    db.flush()
    audit(
        db,
        action="support_ticket.create",
        entity_type="support_ticket",
        actor=current_account,
        clinic_id=payload.clinic_id,
        entity_id=item.id,
    )
    db.commit()
    db.refresh(item)
    return item


@router.get("/notifications", response_model=list[NotificationRead])
def list_notifications(db: DbSession, current_account: CurrentAccount) -> list[Notification]:
    stmt = (
        select(Notification)
        .where(Notification.account_id == current_account.id)
        .order_by(Notification.id.desc())
    )
    return list(db.scalars(stmt).all())
