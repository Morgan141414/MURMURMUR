import re

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from saphena.api.deps import CurrentAccount, DbSession
from saphena.api.schemas import (
    AppointmentCreate,
    AppointmentRead,
    DocumentRenderRequest,
    DocumentTemplateCreate,
    DocumentTemplateRead,
    GeneratedDocumentRead,
    LeadCreate,
    LeadRead,
    MedicalRecordEntryCreate,
    MedicalRecordEntryRead,
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
    DocumentTemplate,
    GeneratedDocument,
    MedicalRecordEntry,
    Notification,
    PatientProfile,
    Person,
    SupportTicket,
)
from saphena.modules.permissions import PermissionCode
from saphena.services.access import has_permission
from saphena.services.audit import audit

router = APIRouter(tags=["operations"])

PLACEHOLDER_PATTERN = re.compile(r"{{\s*([a-zA-Z0-9_.-]+)\s*}}")


def _render_template(content: str, context: dict[str, str]) -> str:
    def replacer(match: re.Match[str]) -> str:
        key = match.group(1)
        return context.get(key, "")

    return PLACEHOLDER_PATTERN.sub(replacer, content)


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


@router.get(
    "/clinics/{clinic_id}/medical-records",
    response_model=list[MedicalRecordEntryRead],
)
def list_medical_records(
    clinic_id: int, db: DbSession, current_account: CurrentAccount
) -> list[MedicalRecordEntry]:
    if not (
        current_account.is_superuser
        or has_permission(db, current_account, PermissionCode.medical_record_read, clinic_id)
        or has_permission(db, current_account, PermissionCode.patient_manage, clinic_id)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing medical record access",
        )
    stmt = (
        select(MedicalRecordEntry)
        .where(MedicalRecordEntry.clinic_id == clinic_id)
        .order_by(MedicalRecordEntry.created_at.desc())
    )
    return list(db.scalars(stmt).all())


@router.post(
    "/clinics/{clinic_id}/medical-records",
    response_model=MedicalRecordEntryRead,
    status_code=status.HTTP_201_CREATED,
)
def create_medical_record(
    clinic_id: int,
    payload: MedicalRecordEntryCreate,
    db: DbSession,
    current_account: CurrentAccount,
) -> MedicalRecordEntry:
    if not (
        current_account.is_superuser
        or has_permission(db, current_account, PermissionCode.medical_record_read, clinic_id)
        or has_permission(db, current_account, PermissionCode.patient_manage, clinic_id)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing medical record rights",
        )
    item = MedicalRecordEntry(
        clinic_id=clinic_id,
        patient_profile_id=payload.patient_profile_id,
        author_membership_id=payload.author_membership_id,
        appointment_id=payload.appointment_id,
        complaint=payload.complaint,
        anamnesis=payload.anamnesis,
        diagnosis=payload.diagnosis,
        prescription=payload.prescription,
        conclusion=payload.conclusion,
    )
    db.add(item)
    db.flush()
    audit(
        db,
        action="medical_record.create",
        entity_type="medical_record_entry",
        actor=current_account,
        clinic_id=clinic_id,
        entity_id=item.id,
    )
    db.commit()
    db.refresh(item)
    return item


@router.get(
    "/clinics/{clinic_id}/documents/templates",
    response_model=list[DocumentTemplateRead],
)
def list_document_templates(
    clinic_id: int, db: DbSession, current_account: CurrentAccount
) -> list[DocumentTemplate]:
    if not (
        current_account.is_superuser
        or has_permission(db, current_account, PermissionCode.document_manage, clinic_id)
        or has_permission(db, current_account, PermissionCode.clinic_read, clinic_id)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing document template access",
        )
    stmt = (
        select(DocumentTemplate)
        .where(DocumentTemplate.clinic_id == clinic_id)
        .order_by(DocumentTemplate.updated_at.desc())
    )
    return list(db.scalars(stmt).all())


@router.post(
    "/clinics/{clinic_id}/documents/templates",
    response_model=DocumentTemplateRead,
    status_code=status.HTTP_201_CREATED,
)
def create_document_template(
    clinic_id: int,
    payload: DocumentTemplateCreate,
    db: DbSession,
    current_account: CurrentAccount,
) -> DocumentTemplate:
    if not (
        current_account.is_superuser
        or has_permission(db, current_account, PermissionCode.document_manage, clinic_id)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing document template rights",
        )
    existing = db.scalar(
        select(DocumentTemplate).where(
            DocumentTemplate.clinic_id == clinic_id,
            DocumentTemplate.code == payload.code,
        )
    )
    if existing is not None:
        existing.title = payload.title
        existing.body = payload.body
        db.add(existing)
        db.flush()
        item = existing
        action = "document_template.updated"
    else:
        item = DocumentTemplate(
            clinic_id=clinic_id,
            code=payload.code,
            title=payload.title,
            body=payload.body,
        )
        db.add(item)
        db.flush()
        action = "document_template.created"

    audit(
        db,
        action=action,
        entity_type="document_template",
        actor=current_account,
        clinic_id=clinic_id,
        entity_id=item.id,
    )
    db.commit()
    db.refresh(item)
    return item


@router.get(
    "/clinics/{clinic_id}/documents/generated",
    response_model=list[GeneratedDocumentRead],
)
def list_generated_documents(
    clinic_id: int, db: DbSession, current_account: CurrentAccount
) -> list[GeneratedDocument]:
    if not (
        current_account.is_superuser
        or has_permission(db, current_account, PermissionCode.document_manage, clinic_id)
        or has_permission(db, current_account, PermissionCode.clinic_read, clinic_id)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing generated document access",
        )
    stmt = (
        select(GeneratedDocument)
        .where(GeneratedDocument.clinic_id == clinic_id)
        .order_by(GeneratedDocument.created_at.desc())
    )
    return list(db.scalars(stmt).all())


@router.post(
    "/clinics/{clinic_id}/documents/render",
    response_model=GeneratedDocumentRead,
    status_code=status.HTTP_201_CREATED,
)
def render_document_from_template(
    clinic_id: int,
    payload: DocumentRenderRequest,
    db: DbSession,
    current_account: CurrentAccount,
) -> GeneratedDocument:
    if not (
        current_account.is_superuser
        or has_permission(db, current_account, PermissionCode.document_manage, clinic_id)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing document render rights",
        )

    if payload.template_id is None and not payload.template_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide template_id or template_code",
        )

    template_stmt = select(DocumentTemplate).where(DocumentTemplate.clinic_id == clinic_id)
    if payload.template_id is not None:
        template_stmt = template_stmt.where(DocumentTemplate.id == payload.template_id)
    else:
        template_stmt = template_stmt.where(DocumentTemplate.code == payload.template_code)

    template = db.scalar(template_stmt)
    if template is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    context: dict[str, str] = {}
    if payload.extras:
        context.update({str(k): str(v) for k, v in payload.extras.items()})

    if payload.patient_profile_id is not None:
        patient = db.get(PatientProfile, payload.patient_profile_id)
        if patient is not None and patient.person is not None:
            context.update(
                {
                    "patient.id": str(patient.id),
                    "patient.iin": patient.person.iin or "",
                    "patient.first_name": patient.person.first_name or "",
                    "patient.last_name": patient.person.last_name or "",
                    "patient.middle_name": patient.person.middle_name or "",
                    "patient.phone": patient.person.phone or "",
                    "patient.email": patient.person.email or "",
                    "patient.notes": patient.notes or "",
                    "iin": patient.person.iin or "",
                    "first_name": patient.person.first_name or "",
                    "last_name": patient.person.last_name or "",
                    "middle_name": patient.person.middle_name or "",
                    "phone": patient.person.phone or "",
                    "email": patient.person.email or "",
                    "patient_notes": patient.notes or "",
                }
            )

    if payload.appointment_id is not None:
        appointment = db.get(Appointment, payload.appointment_id)
        if appointment is not None:
            context.update(
                {
                    "appointment.id": str(appointment.id),
                    "appointment.starts_at": appointment.starts_at.isoformat(),
                    "appointment.ends_at": appointment.ends_at.isoformat(),
                    "appointment.reason": appointment.reason or "",
                    "appointment.status": appointment.status.value,
                    "starts_at": appointment.starts_at.isoformat(),
                    "ends_at": appointment.ends_at.isoformat(),
                    "appointment_reason": appointment.reason or "",
                    "appointment_status": appointment.status.value,
                }
            )

    if payload.medical_record_entry_id is not None:
        record = db.get(MedicalRecordEntry, payload.medical_record_entry_id)
        if record is not None:
            context.update(
                {
                    "record.id": str(record.id),
                    "record.complaint": record.complaint or "",
                    "record.anamnesis": record.anamnesis or "",
                    "record.diagnosis": record.diagnosis or "",
                    "record.prescription": record.prescription or "",
                    "record.conclusion": record.conclusion or "",
                    "complaint": record.complaint or "",
                    "anamnesis": record.anamnesis or "",
                    "diagnosis": record.diagnosis or "",
                    "prescription": record.prescription or "",
                    "conclusion": record.conclusion or "",
                }
            )

    rendered_title = payload.title or template.title
    rendered_body = _render_template(template.body, context)

    item = GeneratedDocument(
        clinic_id=clinic_id,
        template_id=template.id,
        patient_profile_id=payload.patient_profile_id,
        appointment_id=payload.appointment_id,
        medical_record_entry_id=payload.medical_record_entry_id,
        code=template.code,
        title=rendered_title,
        body=rendered_body,
    )
    db.add(item)
    db.flush()
    audit(
        db,
        action="document.rendered",
        entity_type="generated_document",
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
