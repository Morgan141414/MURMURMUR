import re
from datetime import datetime

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from saphena.api.deps import CurrentAccount, DbSession
from saphena.api.routers import google_calendar as _gcal  # noqa: E402
from saphena.api.schemas import (
    AppointmentCreate,
    AppointmentRead,
    AppointmentUpdate,
    ClinicBranchCreate,
    ClinicBranchRead,
    ClinicDepartmentCreate,
    ClinicDepartmentRead,
    ClinicRoomCreate,
    ClinicRoomRead,
    ClinicServiceCreate,
    ClinicServiceRead,
    DoctorScheduleSlotCreate,
    DoctorScheduleSlotRead,
    DoctorScheduleSlotUpdate,
    DocumentRenderRequest,
    DocumentTemplateCreate,
    DocumentTemplateRead,
    GeneratedDocumentRead,
    LeadCreate,
    LeadRead,
    LeadUpdate,
    MedicalRecordEntryCreate,
    MedicalRecordEntryRead,
    NotificationMarkReadResponse,
    NotificationRead,
    PatientCreate,
    PatientRead,
    ScheduleSlotRead,
    SupportMessageCreate,
    SupportMessageRead,
    SupportTicketCreate,
    SupportTicketRead,
    SupportTicketUpdate,
    SupportThreadCreate,
    SupportThreadDetailRead,
    SupportThreadRead,
    SupportThreadUpdate,
)
from saphena.core.security import hash_password, utcnow
from saphena.modules.enums import (
    AppointmentStatus,
    ScheduleSlotStatus,
    SupportTicketStatus,
    SupportThreadStatus,
)
from saphena.modules.models import (
    Account,
    Appointment,
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
    SupportTicket,
    SupportThread,
)
from saphena.modules.permissions import PermissionCode, RoleCode
from saphena.services.access import has_permission
from saphena.services.audit import audit
from saphena.services.notifications import create_notification

router = APIRouter(tags=["operations"])

PLACEHOLDER_PATTERN = re.compile(r"{{\s*([a-zA-Z0-9_.-]+)\s*}}")


def _render_template(content: str, context: dict[str, str]) -> str:
    def replacer(match: re.Match[str]) -> str:
        key = match.group(1)
        return context.get(key, "")

    return PLACEHOLDER_PATTERN.sub(replacer, content)


def _ensure_clinic_structure_access(
    db: DbSession, current_account: CurrentAccount, clinic_id: int, *, write: bool = False
) -> None:
    permission = PermissionCode.org_structure_manage if write else PermissionCode.clinic_read
    if not (
        current_account.is_superuser
        or has_permission(db, current_account, permission, clinic_id)
        or (
            not write
            and has_permission(db, current_account, PermissionCode.org_structure_manage, clinic_id)
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing clinic structure access",
        )


def _ensure_branch(db: DbSession, *, clinic_id: int, branch_id: int) -> ClinicBranch:
    branch = db.get(ClinicBranch, branch_id)
    if branch is None or branch.clinic_id != clinic_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid branch_id")
    return branch


def _ensure_department(
    db: DbSession, *, clinic_id: int, department_id: int | None
) -> ClinicDepartment | None:
    if department_id is None:
        return None
    department = db.get(ClinicDepartment, department_id)
    if department is None or department.clinic_id != clinic_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid department_id")
    return department


def _ensure_room(db: DbSession, *, clinic_id: int, room_id: int | None) -> ClinicRoom | None:
    if room_id is None:
        return None
    room = db.get(ClinicRoom, room_id)
    if room is None or room.clinic_id != clinic_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid room_id")
    return room


def _ensure_service(
    db: DbSession, *, clinic_id: int, service_id: int | None
) -> ClinicService | None:
    if service_id is None:
        return None
    service = db.get(ClinicService, service_id)
    if service is None or service.clinic_id != clinic_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid service_id")
    return service


def _account_id_for_patient(db: DbSession, patient_profile_id: int) -> int | None:
    patient = db.get(PatientProfile, patient_profile_id)
    if patient is None:
        return None
    account = db.scalar(select(Account).where(Account.person_id == patient.person_id))
    return account.id if account else None


def _notify_clinic_members(
    db: DbSession,
    *,
    clinic_id: int,
    title: str,
    body: str,
    permission_roles: set[RoleCode] | None = None,
    exclude_account_ids: set[int] | None = None,
) -> None:
    excluded = exclude_account_ids or set()
    stmt = select(ClinicMembership).where(
        ClinicMembership.clinic_id == clinic_id,
        ClinicMembership.is_active.is_(True),
    )
    for membership in db.scalars(stmt).all():
        if permission_roles is not None and membership.role_code not in permission_roles:
            continue
        if membership.account_id in excluded:
            continue
        create_notification(db, account_id=membership.account_id, title=title, body=body)


def _notify_appointment_participants(
    db: DbSession,
    *,
    appointment: Appointment,
    title: str,
    body: str,
    actor_account_id: int | None = None,
) -> None:
    recipients: set[int] = set()
    patient_account_id = _account_id_for_patient(db, appointment.patient_profile_id)
    if patient_account_id is not None:
        recipients.add(patient_account_id)
    if appointment.doctor_membership_id is not None:
        doctor = db.get(ClinicMembership, appointment.doctor_membership_id)
        if doctor is not None:
            recipients.add(doctor.account_id)
    if actor_account_id is not None:
        recipients.discard(actor_account_id)
    for account_id in recipients:
        create_notification(db, account_id=account_id, title=title, body=body)


@router.get("/clinics/{clinic_id}/branches", response_model=list[ClinicBranchRead])
def list_clinic_branches(
    clinic_id: int, db: DbSession, current_account: CurrentAccount
) -> list[ClinicBranch]:
    _ensure_clinic_structure_access(db, current_account, clinic_id)
    stmt = select(ClinicBranch).where(ClinicBranch.clinic_id == clinic_id).order_by(ClinicBranch.id)
    return list(db.scalars(stmt).all())


@router.post(
    "/clinics/{clinic_id}/branches",
    response_model=ClinicBranchRead,
    status_code=status.HTTP_201_CREATED,
)
def create_clinic_branch(
    clinic_id: int,
    payload: ClinicBranchCreate,
    db: DbSession,
    current_account: CurrentAccount,
) -> ClinicBranch:
    _ensure_clinic_structure_access(db, current_account, clinic_id, write=True)
    item = ClinicBranch(
        clinic_id=clinic_id,
        name=payload.name,
        address=payload.address,
        contacts=payload.contacts,
    )
    db.add(item)
    db.flush()
    audit(
        db,
        action="clinic_branch.create",
        entity_type="clinic_branch",
        actor=current_account,
        clinic_id=clinic_id,
        entity_id=item.id,
    )
    db.commit()
    db.refresh(item)
    return item


@router.get("/clinics/{clinic_id}/departments", response_model=list[ClinicDepartmentRead])
def list_clinic_departments(
    clinic_id: int, db: DbSession, current_account: CurrentAccount
) -> list[ClinicDepartment]:
    _ensure_clinic_structure_access(db, current_account, clinic_id)
    stmt = (
        select(ClinicDepartment)
        .where(ClinicDepartment.clinic_id == clinic_id)
        .order_by(ClinicDepartment.id)
    )
    return list(db.scalars(stmt).all())


@router.post(
    "/clinics/{clinic_id}/departments",
    response_model=ClinicDepartmentRead,
    status_code=status.HTTP_201_CREATED,
)
def create_clinic_department(
    clinic_id: int,
    payload: ClinicDepartmentCreate,
    db: DbSession,
    current_account: CurrentAccount,
) -> ClinicDepartment:
    _ensure_clinic_structure_access(db, current_account, clinic_id, write=True)
    _ensure_branch(db, clinic_id=clinic_id, branch_id=payload.branch_id)
    item = ClinicDepartment(
        clinic_id=clinic_id,
        branch_id=payload.branch_id,
        name=payload.name,
        description=payload.description,
    )
    db.add(item)
    db.flush()
    audit(
        db,
        action="clinic_department.create",
        entity_type="clinic_department",
        actor=current_account,
        clinic_id=clinic_id,
        entity_id=item.id,
    )
    db.commit()
    db.refresh(item)
    return item


@router.get("/clinics/{clinic_id}/rooms", response_model=list[ClinicRoomRead])
def list_clinic_rooms(
    clinic_id: int, db: DbSession, current_account: CurrentAccount
) -> list[ClinicRoom]:
    _ensure_clinic_structure_access(db, current_account, clinic_id)
    stmt = select(ClinicRoom).where(ClinicRoom.clinic_id == clinic_id).order_by(ClinicRoom.id)
    return list(db.scalars(stmt).all())


@router.post(
    "/clinics/{clinic_id}/rooms",
    response_model=ClinicRoomRead,
    status_code=status.HTTP_201_CREATED,
)
def create_clinic_room(
    clinic_id: int,
    payload: ClinicRoomCreate,
    db: DbSession,
    current_account: CurrentAccount,
) -> ClinicRoom:
    _ensure_clinic_structure_access(db, current_account, clinic_id, write=True)
    branch = _ensure_branch(db, clinic_id=clinic_id, branch_id=payload.branch_id)
    department = _ensure_department(db, clinic_id=clinic_id, department_id=payload.department_id)
    if department is not None and department.branch_id != branch.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="department_id does not belong to selected branch",
        )
    item = ClinicRoom(
        clinic_id=clinic_id,
        branch_id=payload.branch_id,
        department_id=payload.department_id,
        number=payload.number,
        title=payload.title,
    )
    db.add(item)
    db.flush()
    audit(
        db,
        action="clinic_room.create",
        entity_type="clinic_room",
        actor=current_account,
        clinic_id=clinic_id,
        entity_id=item.id,
    )
    db.commit()
    db.refresh(item)
    return item


@router.get("/clinics/{clinic_id}/services", response_model=list[ClinicServiceRead])
def list_clinic_services(
    clinic_id: int, db: DbSession, current_account: CurrentAccount
) -> list[ClinicService]:
    _ensure_clinic_structure_access(db, current_account, clinic_id)
    stmt = (
        select(ClinicService).where(ClinicService.clinic_id == clinic_id).order_by(ClinicService.id)
    )
    return list(db.scalars(stmt).all())


@router.post(
    "/clinics/{clinic_id}/services",
    response_model=ClinicServiceRead,
    status_code=status.HTTP_201_CREATED,
)
def create_clinic_service(
    clinic_id: int,
    payload: ClinicServiceCreate,
    db: DbSession,
    current_account: CurrentAccount,
) -> ClinicService:
    _ensure_clinic_structure_access(db, current_account, clinic_id, write=True)
    _ensure_department(db, clinic_id=clinic_id, department_id=payload.department_id)
    item = ClinicService(
        clinic_id=clinic_id,
        department_id=payload.department_id,
        code=payload.code,
        title=payload.title,
        duration_minutes=payload.duration_minutes,
        price=payload.price,
    )
    db.add(item)
    db.flush()
    audit(
        db,
        action="clinic_service.create",
        entity_type="clinic_service",
        actor=current_account,
        clinic_id=clinic_id,
        entity_id=item.id,
    )
    db.commit()
    db.refresh(item)
    return item


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


def _ensure_patient_attached(db: DbSession, *, clinic_id: int, patient_profile_id: int) -> None:
    linked = db.scalar(
        select(ClinicPatient).where(
            ClinicPatient.clinic_id == clinic_id,
            ClinicPatient.patient_profile_id == patient_profile_id,
            ClinicPatient.is_active.is_(True),
        )
    )
    if linked is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Patient is not attached to this clinic",
        )


def _ensure_doctor_membership(
    db: DbSession, *, clinic_id: int, doctor_membership_id: int
) -> ClinicMembership:
    doctor_membership = db.get(ClinicMembership, doctor_membership_id)
    if doctor_membership is None or doctor_membership.clinic_id != clinic_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="doctor_membership_id is not valid for selected clinic",
        )
    return doctor_membership


def _ensure_slot_window_is_free(
    db: DbSession,
    *,
    clinic_id: int,
    doctor_membership_id: int,
    room_id: int | None = None,
    service_id: int | None = None,
    starts_at: datetime,
    ends_at: datetime,
    exclude_slot_id: int | None = None,
) -> None:
    stmt = select(ScheduleSlot).where(
        ScheduleSlot.clinic_id == clinic_id,
        ScheduleSlot.doctor_membership_id == doctor_membership_id,
        ScheduleSlot.starts_at < ends_at,
        ScheduleSlot.ends_at > starts_at,
        ScheduleSlot.status.notin_(["canceled"]),
    )
    if exclude_slot_id is not None:
        stmt = stmt.where(ScheduleSlot.id != exclude_slot_id)
    if db.scalar(stmt) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Schedule slot overlaps existing doctor's slot",
        )
    if room_id is None:
        return
    room_stmt = select(ScheduleSlot).where(
        ScheduleSlot.clinic_id == clinic_id,
        ScheduleSlot.room_id == room_id,
        ScheduleSlot.starts_at < ends_at,
        ScheduleSlot.ends_at > starts_at,
        ScheduleSlot.status.notin_(["canceled"]),
    )
    if exclude_slot_id is not None:
        room_stmt = room_stmt.where(ScheduleSlot.id != exclude_slot_id)
    if db.scalar(room_stmt) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Schedule slot overlaps existing room slot",
        )


def _find_covering_schedule_slot(
    db: DbSession,
    *,
    clinic_id: int,
    doctor_membership_id: int,
    starts_at: datetime,
    ends_at: datetime,
    status: ScheduleSlotStatus,
) -> ScheduleSlot | None:
    return db.scalar(
        select(ScheduleSlot).where(
            ScheduleSlot.clinic_id == clinic_id,
            ScheduleSlot.doctor_membership_id == doctor_membership_id,
            ScheduleSlot.starts_at <= starts_at,
            ScheduleSlot.ends_at >= ends_at,
            ScheduleSlot.status == status,
        )
    )


def _sync_schedule_slot_for_appointment(
    db: DbSession,
    *,
    clinic_id: int,
    doctor_membership_id: int | None,
    starts_at: datetime,
    ends_at: datetime,
    appointment_status: AppointmentStatus,
) -> None:
    if doctor_membership_id is None:
        return
    if appointment_status in {
        AppointmentStatus.canceled,
        AppointmentStatus.no_show,
        AppointmentStatus.rescheduled,
    }:
        booked_slot = _find_covering_schedule_slot(
            db,
            clinic_id=clinic_id,
            doctor_membership_id=doctor_membership_id,
            starts_at=starts_at,
            ends_at=ends_at,
            status=ScheduleSlotStatus.booked,
        )
        if booked_slot is not None:
            booked_slot.status = ScheduleSlotStatus.available
            db.add(booked_slot)
        return

    available_slot = _find_covering_schedule_slot(
        db,
        clinic_id=clinic_id,
        doctor_membership_id=doctor_membership_id,
        starts_at=starts_at,
        ends_at=ends_at,
        status=ScheduleSlotStatus.available,
    )
    if available_slot is not None:
        available_slot.status = ScheduleSlotStatus.booked
        db.add(available_slot)


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


@router.get(
    "/clinics/{clinic_id}/schedule/slots",
    response_model=list[DoctorScheduleSlotRead],
)
def list_doctor_schedule_slots(
    clinic_id: int,
    db: DbSession,
    current_account: CurrentAccount,
    starts_at: datetime | None = None,
    ends_at: datetime | None = None,
) -> list[ScheduleSlot]:
    if not (
        current_account.is_superuser
        or has_permission(db, current_account, PermissionCode.schedule_manage, clinic_id)
        or has_permission(db, current_account, PermissionCode.appointment_manage, clinic_id)
        or has_permission(db, current_account, PermissionCode.clinic_read, clinic_id)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing schedule access",
        )
    stmt = select(ScheduleSlot).where(ScheduleSlot.clinic_id == clinic_id)
    if starts_at is not None:
        stmt = stmt.where(ScheduleSlot.ends_at >= starts_at)
    if ends_at is not None:
        stmt = stmt.where(ScheduleSlot.starts_at <= ends_at)
    stmt = stmt.order_by(ScheduleSlot.starts_at.asc())
    return list(db.scalars(stmt).all())


@router.post(
    "/clinics/{clinic_id}/schedule/slots",
    response_model=DoctorScheduleSlotRead,
    status_code=status.HTTP_201_CREATED,
)
def create_doctor_schedule_slot(
    clinic_id: int,
    payload: DoctorScheduleSlotCreate,
    db: DbSession,
    current_account: CurrentAccount,
) -> ScheduleSlot:
    if not (
        current_account.is_superuser
        or has_permission(db, current_account, PermissionCode.schedule_manage, clinic_id)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing schedule rights",
        )
    _ensure_doctor_membership(
        db,
        clinic_id=clinic_id,
        doctor_membership_id=payload.doctor_membership_id,
    )
    _ensure_room(db, clinic_id=clinic_id, room_id=payload.room_id)
    _ensure_service(db, clinic_id=clinic_id, service_id=payload.service_id)
    _ensure_slot_window_is_free(
        db,
        clinic_id=clinic_id,
        doctor_membership_id=payload.doctor_membership_id,
        room_id=payload.room_id,
        service_id=payload.service_id,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
    )
    item = ScheduleSlot(
        clinic_id=clinic_id,
        doctor_membership_id=payload.doctor_membership_id,
        room_id=payload.room_id,
        service_id=payload.service_id,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        status=payload.status,
        note=payload.note,
    )
    db.add(item)
    db.flush()
    audit(
        db,
        action="schedule_slot.create",
        entity_type="schedule_slot",
        actor=current_account,
        clinic_id=clinic_id,
        entity_id=item.id,
    )
    db.commit()
    db.refresh(item)
    return item


@router.patch(
    "/clinics/{clinic_id}/schedule/slots/{slot_id}",
    response_model=DoctorScheduleSlotRead,
)
def update_doctor_schedule_slot(
    clinic_id: int,
    slot_id: int,
    payload: DoctorScheduleSlotUpdate,
    db: DbSession,
    current_account: CurrentAccount,
) -> ScheduleSlot:
    if not (
        current_account.is_superuser
        or has_permission(db, current_account, PermissionCode.schedule_manage, clinic_id)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing schedule rights",
        )
    item = db.get(ScheduleSlot, slot_id)
    if item is None or item.clinic_id != clinic_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule slot not found")
    starts_at = payload.starts_at or item.starts_at
    ends_at = payload.ends_at or item.ends_at
    if ends_at <= starts_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ends_at must be greater than starts_at",
        )
    _ensure_slot_window_is_free(
        db,
        clinic_id=clinic_id,
        doctor_membership_id=item.doctor_membership_id,
        starts_at=starts_at,
        ends_at=ends_at,
        exclude_slot_id=item.id,
    )
    item.starts_at = starts_at
    item.ends_at = ends_at
    if payload.room_id is not None:
        _ensure_room(db, clinic_id=clinic_id, room_id=payload.room_id)
        item.room_id = payload.room_id
    if payload.service_id is not None:
        _ensure_service(db, clinic_id=clinic_id, service_id=payload.service_id)
        item.service_id = payload.service_id
    if payload.status is not None:
        item.status = payload.status
    if payload.note is not None:
        item.note = payload.note
    db.add(item)
    audit(
        db,
        action="schedule_slot.update",
        entity_type="schedule_slot",
        actor=current_account,
        clinic_id=clinic_id,
        entity_id=item.id,
    )
    db.commit()
    db.refresh(item)
    return item


@router.delete(
    "/clinics/{clinic_id}/schedule/slots/{slot_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_doctor_schedule_slot(
    clinic_id: int,
    slot_id: int,
    db: DbSession,
    current_account: CurrentAccount,
) -> None:
    if not (
        current_account.is_superuser
        or has_permission(db, current_account, PermissionCode.schedule_manage, clinic_id)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing schedule rights",
        )
    item = db.get(ScheduleSlot, slot_id)
    if item is None or item.clinic_id != clinic_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule slot not found")
    audit(
        db,
        action="schedule_slot.delete",
        entity_type="schedule_slot",
        actor=current_account,
        clinic_id=clinic_id,
        entity_id=item.id,
    )
    db.delete(item)
    db.commit()


@router.post(
    "/clinics/{clinic_id}/appointments",
    response_model=AppointmentRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_appointment(
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
    _ensure_patient_attached(db, clinic_id=clinic_id, patient_profile_id=payload.patient_profile_id)

    if payload.doctor_membership_id is not None:
        doctor_membership = db.get(ClinicMembership, payload.doctor_membership_id)
        if doctor_membership is None or doctor_membership.clinic_id != clinic_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="doctor_membership_id is not valid for selected clinic",
            )
    _ensure_room(db, clinic_id=clinic_id, room_id=payload.room_id)
    _ensure_service(db, clinic_id=clinic_id, service_id=payload.service_id)

    if payload.doctor_membership_id is not None:
        overlap_stmt = select(Appointment).where(
            Appointment.clinic_id == clinic_id,
            Appointment.doctor_membership_id == payload.doctor_membership_id,
            Appointment.starts_at < payload.ends_at,
            Appointment.ends_at > payload.starts_at,
            Appointment.status.notin_([AppointmentStatus.canceled, AppointmentStatus.no_show]),
        )
        if db.scalar(overlap_stmt) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Appointment overlaps existing doctor's slot",
            )
    if payload.room_id is not None:
        room_overlap_stmt = select(Appointment).where(
            Appointment.clinic_id == clinic_id,
            Appointment.room_id == payload.room_id,
            Appointment.starts_at < payload.ends_at,
            Appointment.ends_at > payload.starts_at,
            Appointment.status.notin_([AppointmentStatus.canceled, AppointmentStatus.no_show]),
        )
        if db.scalar(room_overlap_stmt) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Appointment overlaps existing room slot",
            )

    item = Appointment(
        clinic_id=clinic_id,
        patient_profile_id=payload.patient_profile_id,
        doctor_membership_id=payload.doctor_membership_id,
        room_id=payload.room_id,
        service_id=payload.service_id,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        status=payload.status,
        reason=payload.reason,
    )
    db.add(item)
    db.flush()
    _sync_schedule_slot_for_appointment(
        db,
        clinic_id=clinic_id,
        doctor_membership_id=payload.doctor_membership_id,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        appointment_status=item.status,
    )
    _notify_appointment_participants(
        db,
        appointment=item,
        title="Appointment created",
        body=f"Appointment #{item.id} starts at {item.starts_at.isoformat()}",
        actor_account_id=current_account.id,
    )
    _notify_clinic_members(
        db,
        clinic_id=clinic_id,
        title="Appointment created",
        body=f"Appointment #{item.id} was created for clinic #{clinic_id}",
        permission_roles={RoleCode.clinic_founder, RoleCode.clinic_ceo, RoleCode.reception_admin},
        exclude_account_ids={current_account.id},
    )
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
    await _gcal.auto_sync_appointment_to_google(item, db)
    return item


@router.patch(
    "/clinics/{clinic_id}/appointments/{appointment_id}",
    response_model=AppointmentRead,
)
async def update_appointment(
    clinic_id: int,
    appointment_id: int,
    payload: AppointmentUpdate,
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
    item = db.get(Appointment, appointment_id)
    if item is None or item.clinic_id != clinic_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    previous_starts_at = item.starts_at
    previous_ends_at = item.ends_at
    previous_status = item.status
    previous_doctor_membership_id = item.doctor_membership_id

    starts_at = payload.starts_at or item.starts_at
    ends_at = payload.ends_at or item.ends_at
    next_status = payload.status or item.status
    next_doctor_membership_id = item.doctor_membership_id
    next_room_id = item.room_id

    if payload.doctor_membership_id is not None:
        if payload.doctor_membership_id <= 0:
            next_doctor_membership_id = None
        else:
            _ensure_doctor_membership(
                db,
                clinic_id=clinic_id,
                doctor_membership_id=payload.doctor_membership_id,
            )
            next_doctor_membership_id = payload.doctor_membership_id

    if payload.room_id is not None:
        if payload.room_id <= 0:
            next_room_id = None
        else:
            _ensure_room(db, clinic_id=clinic_id, room_id=payload.room_id)
            next_room_id = payload.room_id

    if payload.service_id is not None:
        if payload.service_id <= 0:
            item.service_id = None
        else:
            _ensure_service(db, clinic_id=clinic_id, service_id=payload.service_id)
            item.service_id = payload.service_id

    if ends_at <= starts_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ends_at must be greater than starts_at",
        )

    excluded_statuses = [AppointmentStatus.canceled, AppointmentStatus.no_show]
    if next_doctor_membership_id is not None and next_status not in {
        AppointmentStatus.canceled,
        AppointmentStatus.no_show,
        AppointmentStatus.rescheduled,
    }:
        overlap_stmt = select(Appointment).where(
            Appointment.id != item.id,
            Appointment.clinic_id == clinic_id,
            Appointment.doctor_membership_id == next_doctor_membership_id,
            Appointment.starts_at < ends_at,
            Appointment.ends_at > starts_at,
            Appointment.status.notin_(excluded_statuses),
        )
        if db.scalar(overlap_stmt) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Appointment overlaps existing doctor's slot",
            )

    if next_room_id is not None and next_status not in {
        AppointmentStatus.canceled,
        AppointmentStatus.no_show,
        AppointmentStatus.rescheduled,
    }:
        room_overlap_stmt = select(Appointment).where(
            Appointment.id != item.id,
            Appointment.clinic_id == clinic_id,
            Appointment.room_id == next_room_id,
            Appointment.starts_at < ends_at,
            Appointment.ends_at > starts_at,
            Appointment.status.notin_(excluded_statuses),
        )
        if db.scalar(room_overlap_stmt) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Appointment overlaps existing room slot",
            )

    if (
        previous_doctor_membership_id is not None
        and previous_status
        not in {
            AppointmentStatus.canceled,
            AppointmentStatus.no_show,
            AppointmentStatus.rescheduled,
        }
        and (
            previous_starts_at != starts_at
            or previous_ends_at != ends_at
            or previous_doctor_membership_id != next_doctor_membership_id
            or next_status
            in {
                AppointmentStatus.canceled,
                AppointmentStatus.no_show,
                AppointmentStatus.rescheduled,
            }
        )
    ):
        _sync_schedule_slot_for_appointment(
            db,
            clinic_id=clinic_id,
            doctor_membership_id=previous_doctor_membership_id,
            starts_at=previous_starts_at,
            ends_at=previous_ends_at,
            appointment_status=AppointmentStatus.canceled,
        )

    item.starts_at = starts_at
    item.ends_at = ends_at
    item.status = next_status
    item.doctor_membership_id = next_doctor_membership_id
    item.room_id = next_room_id

    if payload.reason is not None:
        item.reason = payload.reason

    db.add(item)
    _sync_schedule_slot_for_appointment(
        db,
        clinic_id=clinic_id,
        doctor_membership_id=item.doctor_membership_id,
        starts_at=item.starts_at,
        ends_at=item.ends_at,
        appointment_status=item.status,
    )
    if payload.status is not None and payload.status != previous_status:
        _notify_appointment_participants(
            db,
            appointment=item,
            title="Appointment status updated",
            body=f"Appointment #{item.id} status changed to {item.status.value}",
            actor_account_id=current_account.id,
        )
        _notify_clinic_members(
            db,
            clinic_id=clinic_id,
            title="Appointment status updated",
            body=f"Appointment #{item.id} status changed to {item.status.value}",
            permission_roles={RoleCode.clinic_founder, RoleCode.clinic_ceo, RoleCode.reception_admin},
            exclude_account_ids={current_account.id},
        )
    audit(
        db,
        action="appointment.update",
        entity_type="appointment",
        actor=current_account,
        clinic_id=clinic_id,
        entity_id=item.id,
    )
    doctor_changed = (
        payload.doctor_membership_id is not None
        and payload.doctor_membership_id != previous_doctor_membership_id
    )
    if doctor_changed and previous_doctor_membership_id and item.google_event_id:
        # Delete from old doctor's calendar before reassigning
        old_item_copy = type('_A', (), {
            'id': item.id,
            'google_event_id': item.google_event_id,
            'doctor_membership_id': previous_doctor_membership_id,
        })()
        await _gcal.delete_appointment_from_google(old_item_copy, db)  # type: ignore[arg-type]
        item.google_event_id = None

    db.commit()
    db.refresh(item)
    await _gcal.auto_sync_appointment_to_google(item, db)
    return item


@router.get("/clinics/{clinic_id}/schedule", response_model=list[ScheduleSlotRead])
def clinic_schedule(
    clinic_id: int,
    db: DbSession,
    current_account: CurrentAccount,
    starts_at: datetime | None = None,
    ends_at: datetime | None = None,
) -> list[Appointment]:
    if not (
        current_account.is_superuser
        or has_permission(db, current_account, PermissionCode.schedule_manage, clinic_id)
        or has_permission(db, current_account, PermissionCode.appointment_manage, clinic_id)
        or has_permission(db, current_account, PermissionCode.clinic_read, clinic_id)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing schedule access",
        )
    stmt = select(Appointment).where(Appointment.clinic_id == clinic_id)
    if starts_at is not None:
        stmt = stmt.where(Appointment.ends_at >= starts_at)
    if ends_at is not None:
        stmt = stmt.where(Appointment.starts_at <= ends_at)
    stmt = stmt.order_by(Appointment.starts_at.asc())
    return list(db.scalars(stmt).all())


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
    _ensure_patient_attached(db, clinic_id=clinic_id, patient_profile_id=payload.patient_profile_id)
    if payload.appointment_id is not None:
        appointment = db.get(Appointment, payload.appointment_id)
        if appointment is None or appointment.clinic_id != clinic_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="appointment_id is not valid for selected clinic",
            )
        if appointment.patient_profile_id != payload.patient_profile_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="appointment_id does not belong to this patient",
            )
    if payload.author_membership_id is not None:
        author_membership = db.get(ClinicMembership, payload.author_membership_id)
        if author_membership is None or author_membership.clinic_id != clinic_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="author_membership_id is not valid for selected clinic",
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
    patient_account_id = _account_id_for_patient(db, payload.patient_profile_id)
    if patient_account_id is not None and patient_account_id != current_account.id:
        create_notification(
            db,
            account_id=patient_account_id,
            title="Medical record updated",
            body=f"A new medical record entry was added in clinic #{clinic_id}",
        )
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
        _ensure_patient_attached(db, clinic_id=clinic_id, patient_profile_id=payload.patient_profile_id)
        patient = db.get(PatientProfile, payload.patient_profile_id)
        if patient is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid patient_profile_id")
        if patient.person is not None:
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
        if appointment is None or appointment.clinic_id != clinic_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid appointment_id")
        if payload.patient_profile_id is not None and appointment.patient_profile_id != payload.patient_profile_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="appointment_id does not belong to this patient")
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
        if record is None or record.clinic_id != clinic_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid medical_record_entry_id")
        if payload.patient_profile_id is not None and record.patient_profile_id != payload.patient_profile_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="medical_record_entry_id does not belong to this patient")
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
    if item.patient_profile_id is not None:
        patient_account_id = _account_id_for_patient(db, item.patient_profile_id)
        if patient_account_id is not None and patient_account_id != current_account.id:
            create_notification(
                db,
                account_id=patient_account_id,
                title="Document generated",
                body=f"Document '{item.title}' was generated in clinic #{clinic_id}",
            )
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
    if current_account.is_superuser:
        return list(db.scalars(select(CrmLead).order_by(CrmLead.id.desc())).all())
    clinic_ids = [
        row[0]
        for row in db.execute(
            select(ClinicMembership.clinic_id).where(
                ClinicMembership.account_id == current_account.id,
                ClinicMembership.is_active.is_(True),
            )
        ).all()
    ]
    if not clinic_ids:
        return []
    stmt = select(CrmLead).where(CrmLead.clinic_id.in_(clinic_ids)).order_by(CrmLead.id.desc())
    return list(db.scalars(stmt).all())


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


@router.patch("/crm/leads/{lead_id}", response_model=LeadRead)
def update_lead(
    lead_id: int, payload: LeadUpdate, db: DbSession, current_account: CurrentAccount
) -> CrmLead:
    item = db.get(CrmLead, lead_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    if not current_account.is_superuser and not has_permission(
        db, current_account, PermissionCode.crm_manage, item.clinic_id
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing CRM rights")
    if payload.status is not None:
        item.status = payload.status
    if payload.note is not None:
        item.note = payload.note
    db.add(item)
    audit(
        db,
        action="crm_lead.update",
        entity_type="crm_lead",
        actor=current_account,
        clinic_id=item.clinic_id,
        entity_id=item.id,
    )
    db.commit()
    db.refresh(item)
    return item


def _is_support_manager(db: DbSession, current_account: CurrentAccount) -> bool:
    return current_account.is_superuser or has_permission(
        db, current_account, PermissionCode.support_manage
    )


def _thread_visible_to_user(db: DbSession, thread: SupportThread, current_account: CurrentAccount) -> bool:
    if _is_support_manager(db, current_account):
        return True
    return thread.requester_account_id == current_account.id


def _sync_legacy_tickets_to_threads(db: DbSession) -> None:
    legacy_without_thread = db.scalars(
        select(SupportTicket).where(SupportTicket.support_thread_id.is_(None))
    ).all()
    changed = False
    for ticket in legacy_without_thread:
        thread = SupportThread(
            requester_account_id=ticket.requester_account_id,
            clinic_id=ticket.clinic_id,
            subject=ticket.topic,
            status=SupportThreadStatus(ticket.status.value)
            if ticket.status.value in {item.value for item in SupportThreadStatus}
            else SupportThreadStatus.open,
            last_message_at=ticket.created_at,
        )
        db.add(thread)
        db.flush()
        first_message = SupportMessage(
            thread_id=thread.id,
            author_account_id=ticket.requester_account_id,
            body=ticket.message,
        )
        db.add(first_message)
        ticket.support_thread_id = thread.id
        db.add(ticket)
        changed = True
    if changed:
        db.commit()


def _serialize_thread_detail(db: DbSession, thread: SupportThread) -> SupportThreadDetailRead:
    messages = list(
        db.scalars(
            select(SupportMessage)
            .where(SupportMessage.thread_id == thread.id)
            .order_by(SupportMessage.created_at.asc())
        ).all()
    )
    return SupportThreadDetailRead.model_validate(
        {
            **SupportThreadRead.model_validate(thread).model_dump(),
            "messages": [SupportMessageRead.model_validate(item).model_dump() for item in messages],
        }
    )


@router.get("/support/threads", response_model=list[SupportThreadRead])
def list_support_threads(db: DbSession, current_account: CurrentAccount) -> list[SupportThread]:
    _sync_legacy_tickets_to_threads(db)
    stmt = select(SupportThread).order_by(SupportThread.last_message_at.desc(), SupportThread.id.desc())
    if not _is_support_manager(db, current_account):
        stmt = stmt.where(SupportThread.requester_account_id == current_account.id)
    return list(db.scalars(stmt).all())


@router.post(
    "/support/threads",
    response_model=SupportThreadRead,
    status_code=status.HTTP_201_CREATED,
)
def create_support_thread(
    payload: SupportThreadCreate,
    db: DbSession,
    current_account: CurrentAccount,
) -> SupportThread:
    item = SupportThread(
        requester_account_id=current_account.id,
        clinic_id=payload.clinic_id,
        subject=payload.subject,
        request_type=payload.request_type,
        status=SupportThreadStatus.open,
        priority=payload.priority,
        last_message_at=utcnow(),
        request_meta=payload.request_meta,
    )
    db.add(item)
    db.flush()
    db.add(
        SupportMessage(
            thread_id=item.id,
            author_account_id=current_account.id,
            body=payload.body,
        )
    )
    legacy_ticket = SupportTicket(
        support_thread_id=item.id,
        requester_account_id=current_account.id,
        clinic_id=payload.clinic_id,
        topic=payload.subject,
        message=payload.body,
    )
    db.add(legacy_ticket)
    db.flush()
    item.last_message_at = legacy_ticket.created_at
    recipients: set[int] = set()
    if payload.clinic_id is not None:
        recipients.update(
            db.scalars(
                select(ClinicMembership.account_id).where(
                    ClinicMembership.clinic_id == payload.clinic_id,
                    ClinicMembership.is_active.is_(True),
                )
            ).all()
        )

    if _is_support_manager(db, current_account):
        recipients.add(current_account.id)

    # Notify support queue managers (superusers + support managers).
    support_manager_ids = {
        row[0]
        for row in db.execute(
            select(Account.id).where(Account.is_superuser.is_(True))
        ).all()
    }
    memberships = db.scalars(
        select(ClinicMembership).where(ClinicMembership.is_active.is_(True))
    ).all()
    for membership in memberships:
        if membership.role_code == RoleCode.support_agent:
            support_manager_ids.add(membership.account_id)
    recipients.update(support_manager_ids)

    for recipient_account_id in recipients:
        if recipient_account_id != current_account.id:
            create_notification(
                db,
                account_id=recipient_account_id,
                title="New support thread",
                body=f"Thread #{item.id}: {payload.subject}",
            )
    audit(
        db,
        action="support_thread.create",
        entity_type="support_thread",
        actor=current_account,
        clinic_id=payload.clinic_id,
        entity_id=item.id,
    )
    db.commit()
    db.refresh(item)
    return item


@router.get("/support/threads/{thread_id}", response_model=SupportThreadDetailRead)
def get_support_thread(
    thread_id: int,
    db: DbSession,
    current_account: CurrentAccount,
) -> SupportThreadDetailRead:
    _sync_legacy_tickets_to_threads(db)
    item = db.get(SupportThread, thread_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
    if not _thread_visible_to_user(db, item, current_account):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing support rights")
    return _serialize_thread_detail(db, item)


@router.post(
    "/support/threads/{thread_id}/messages",
    response_model=SupportMessageRead,
    status_code=status.HTTP_201_CREATED,
)
def create_support_thread_message(
    thread_id: int,
    payload: SupportMessageCreate,
    db: DbSession,
    current_account: CurrentAccount,
) -> SupportMessage:
    item = db.get(SupportThread, thread_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
    if not _thread_visible_to_user(db, item, current_account):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing support rights")
    if item.status == SupportThreadStatus.closed and not _is_support_manager(db, current_account):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Thread is closed")
    message = SupportMessage(
        thread_id=item.id,
        author_account_id=current_account.id,
        body=payload.body,
    )
    db.add(message)
    db.flush()
    item.last_message_at = message.created_at
    if _is_support_manager(db, current_account):
        if item.status != SupportThreadStatus.closed:
            item.status = SupportThreadStatus.answered
        create_notification(
            db,
            account_id=item.requester_account_id,
            title="Support replied",
            body=f"Thread #{item.id} has a new reply",
        )
    else:
        if item.status == SupportThreadStatus.answered:
            item.status = SupportThreadStatus.in_progress
        if item.assigned_to_account_id is not None and item.assigned_to_account_id != current_account.id:
            create_notification(
                db,
                account_id=item.assigned_to_account_id,
                title="New message in assigned support thread",
                body=f"Thread #{item.id} has a new user message",
            )
    db.add(item)
    audit(
        db,
        action="support_message.create",
        entity_type="support_message",
        actor=current_account,
        clinic_id=item.clinic_id,
        entity_id=message.id,
    )
    db.commit()
    db.refresh(message)
    return message


@router.patch("/support/threads/{thread_id}", response_model=SupportThreadRead)
def update_support_thread(
    thread_id: int,
    payload: SupportThreadUpdate,
    db: DbSession,
    current_account: CurrentAccount,
) -> SupportThread:
    if not _is_support_manager(db, current_account):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing support rights")
    item = db.get(SupportThread, thread_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
    previous_status = item.status
    previous_assignee = item.assigned_to_account_id
    if payload.status is not None:
        item.status = payload.status
    if payload.priority is not None:
        item.priority = payload.priority
    if payload.assigned_to_account_id is not None:
        item.assigned_to_account_id = payload.assigned_to_account_id
    if previous_assignee != item.assigned_to_account_id:
        audit(
            db,
            action="support_thread.assign",
            entity_type="support_thread",
            actor=current_account,
            clinic_id=item.clinic_id,
            entity_id=item.id,
            details=f"assigned_to={item.assigned_to_account_id}",
        )
        if item.assigned_to_account_id is not None and item.assigned_to_account_id != current_account.id:
            create_notification(
                db,
                account_id=item.assigned_to_account_id,
                title="Support thread assigned",
                body=f"Thread #{item.id} assigned to you",
            )
    if previous_status != item.status:
        create_notification(
            db,
            account_id=item.requester_account_id,
            title="Support thread status updated",
            body=f"Thread #{item.id} status changed to {item.status.value}",
        )
        audit(
            db,
            action="support_thread.status_update",
            entity_type="support_thread",
            actor=current_account,
            clinic_id=item.clinic_id,
            entity_id=item.id,
            details=f"status={item.status.value}",
        )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/support/tickets", response_model=list[SupportTicketRead])
def list_support_tickets(db: DbSession, current_account: CurrentAccount) -> list[SupportTicket]:
    _sync_legacy_tickets_to_threads(db)
    stmt = select(SupportTicket).order_by(SupportTicket.id.desc())
    if not _is_support_manager(db, current_account):
        stmt = stmt.where(SupportTicket.requester_account_id == current_account.id)
    return list(db.scalars(stmt).all())


@router.post(
    "/support/tickets",
    response_model=SupportTicketRead,
    status_code=status.HTTP_201_CREATED,
)
def create_support_ticket(
    payload: SupportTicketCreate, db: DbSession, current_account: CurrentAccount
) -> SupportTicket:
    thread = create_support_thread(
        SupportThreadCreate(
            clinic_id=payload.clinic_id,
            subject=payload.topic,
            body=payload.message,
            request_type="general",
        ),
        db,
        current_account,
    )
    item = db.scalar(select(SupportTicket).where(SupportTicket.support_thread_id == thread.id))
    if item is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Ticket sync failed")
    return item


@router.patch("/support/tickets/{ticket_id}", response_model=SupportTicketRead)
def update_support_ticket(
    ticket_id: int,
    payload: SupportTicketUpdate,
    db: DbSession,
    current_account: CurrentAccount,
) -> SupportTicket:
    _sync_legacy_tickets_to_threads(db)
    item = db.get(SupportTicket, ticket_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    can_moderate = _is_support_manager(db, current_account)
    if not can_moderate and item.requester_account_id != current_account.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing support rights")
    if item.support_thread_id is not None and can_moderate:
        thread_status = (
            SupportThreadStatus.in_progress
            if payload.status == SupportTicketStatus.in_progress
            else SupportThreadStatus.closed
            if payload.status in {SupportTicketStatus.closed, SupportTicketStatus.resolved}
            else SupportThreadStatus.answered
        )
        update_support_thread(
            item.support_thread_id,
            SupportThreadUpdate(status=thread_status),
            db,
            current_account,
        )
    if payload.message:
        item.message = payload.message
    item.status = payload.status
    db.add(item)
    audit(
        db,
        action="support_ticket.update",
        entity_type="support_ticket",
        actor=current_account,
        clinic_id=item.clinic_id,
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


@router.post(
    "/notifications/{notification_id}/read",
    response_model=NotificationMarkReadResponse,
)
def mark_notification_read(
    notification_id: int, db: DbSession, current_account: CurrentAccount
) -> NotificationMarkReadResponse:
    item = db.get(Notification, notification_id)
    if item is None or item.account_id != current_account.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    if item.read_at is None:
        item.read_at = utcnow()
        db.add(item)
        db.commit()
        db.refresh(item)
    return NotificationMarkReadResponse(id=item.id, read_at=item.read_at)


@router.post("/notifications/read-all", response_model=dict[str, int])
def mark_all_notifications_read(db: DbSession, current_account: CurrentAccount) -> dict[str, int]:
    updated = 0
    for item in db.scalars(
        select(Notification).where(
            Notification.account_id == current_account.id,
            Notification.read_at.is_(None),
        )
    ).all():
        item.read_at = utcnow()
        db.add(item)
        updated += 1
    db.commit()
    return {"updated": updated}
