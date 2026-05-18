from fastapi import APIRouter, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from saphena.api.deps import CurrentAccount, CurrentAccountOptional, DbSession
from saphena.core.config import get_settings
from saphena.api.schemas import (
    ClinicApplicationCreate,
    ClinicApplicationModerate,
    ClinicApplicationRead,
    ClinicEmployeeAssign,
    ClinicRead,
    MembershipRead,
    RoleDefinitionRead,
)
from saphena.modules.enums import ClinicApplicationStatus
from saphena.modules.models import (
    Account,
    Clinic,
    ClinicApplication,
    ClinicMembership,
    Person,
    RoleDefinition,
)
from saphena.modules.permissions import PermissionCode, RoleCode
from saphena.services.access import can_assign_role, has_permission
from saphena.services.audit import audit
from saphena.services.notifications import create_notification

router = APIRouter(prefix="/clinics", tags=["clinics"])

ALLOWED_APPLICATION_TRANSITIONS: dict[ClinicApplicationStatus, set[ClinicApplicationStatus]] = {
    ClinicApplicationStatus.draft: {
        ClinicApplicationStatus.submitted,
        ClinicApplicationStatus.blocked,
    },
    ClinicApplicationStatus.submitted: {
        ClinicApplicationStatus.in_review,
        ClinicApplicationStatus.needs_changes,
        ClinicApplicationStatus.approved,
        ClinicApplicationStatus.rejected,
        ClinicApplicationStatus.blocked,
    },
    ClinicApplicationStatus.in_review: {
        ClinicApplicationStatus.needs_changes,
        ClinicApplicationStatus.approved,
        ClinicApplicationStatus.rejected,
        ClinicApplicationStatus.blocked,
    },
    ClinicApplicationStatus.needs_changes: {
        ClinicApplicationStatus.submitted,
        ClinicApplicationStatus.blocked,
    },
    ClinicApplicationStatus.approved: {
        ClinicApplicationStatus.blocked,
    },
    ClinicApplicationStatus.rejected: {
        ClinicApplicationStatus.blocked,
    },
    ClinicApplicationStatus.blocked: set(),
}


@router.post(
    "/applications",
    response_model=ClinicApplicationRead,
    status_code=status.HTTP_201_CREATED,
)
def create_application(
    payload: ClinicApplicationCreate, db: DbSession, current_account: CurrentAccount
) -> ClinicApplication:
    item = ClinicApplication(
        applicant_account_id=current_account.id,
        name=payload.name,
        legal_name=payload.legal_name,
        bin_iin=payload.bin_iin,
        address=payload.address,
        contacts=payload.contacts,
        founder_data=payload.founder_data,
        requisites=payload.requisites,
        license_info=payload.license_info,
        oked=payload.oked,
        activity_description=payload.activity_description,
        status=(
            ClinicApplicationStatus.submitted if payload.submit else ClinicApplicationStatus.draft
        ),
    )
    db.add(item)
    db.flush()
    audit(
        db,
        action="clinic_application.create",
        entity_type="clinic_application",
        entity_id=item.id,
        actor=current_account,
    )
    db.commit()
    db.refresh(item)
    return item


@router.get("/applications", response_model=list[ClinicApplicationRead])
def list_applications(db: DbSession, current_account: CurrentAccount) -> list[ClinicApplication]:
    if current_account.is_superuser or has_permission(
        db, current_account, PermissionCode.clinic_application_moderate
    ):
        stmt = select(ClinicApplication).order_by(ClinicApplication.id.desc())
        return list(db.scalars(stmt).all())
    return list(
        db.scalars(
            select(ClinicApplication)
            .where(ClinicApplication.applicant_account_id == current_account.id)
            .order_by(ClinicApplication.id.desc())
        ).all()
    )


@router.patch("/applications/{application_id}", response_model=ClinicApplicationRead)
def moderate_application(
    application_id: int,
    payload: ClinicApplicationModerate,
    db: DbSession,
    current_account: CurrentAccount,
) -> ClinicApplication:
    if not (
        current_account.is_superuser
        or has_permission(db, current_account, PermissionCode.clinic_application_moderate)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing moderation rights",
        )

    item = db.get(ClinicApplication, application_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    allowed = ALLOWED_APPLICATION_TRANSITIONS.get(item.status, set())
    if payload.status not in allowed and payload.status != item.status:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Status transition {item.status.value}->{payload.status.value} is not allowed",
        )

    if payload.status == ClinicApplicationStatus.approved and item.clinic_id is None:
        clinic = Clinic(
            name=item.name,
            legal_name=item.legal_name,
            bin_iin=item.bin_iin,
            address=item.address,
            contacts=item.contacts,
        )
        db.add(clinic)
        db.flush()
        membership = ClinicMembership(
            account_id=item.applicant_account_id,
            clinic_id=clinic.id,
            role_code=RoleCode.clinic_founder,
            position="Founder",
        )
        db.add(membership)
        item.clinic_id = clinic.id

    item.status = payload.status
    item.moderator_comment = payload.moderator_comment
    create_notification(
        db,
        account_id=item.applicant_account_id,
        title="Clinic application status updated",
        body=(
            f"Application '{item.name}' is now {payload.status.value}. "
            f"Comment: {payload.moderator_comment or '-'}"
        ),
    )
    audit(
        db,
        action=f"clinic_application.{payload.status.value}",
        entity_type="clinic_application",
        entity_id=item.id,
        actor=current_account,
        clinic_id=item.clinic_id,
        details=payload.moderator_comment,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("", response_model=list[ClinicRead])
def list_clinics(db: DbSession, current_account: CurrentAccount) -> list[Clinic]:
    if current_account.is_superuser:
        return list(db.scalars(select(Clinic).order_by(Clinic.name)).all())

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
    return list(db.scalars(select(Clinic).where(Clinic.id.in_(clinic_ids))).all())


@router.get("/{clinic_id}/employees", response_model=list[MembershipRead])
def list_employees(
    clinic_id: int,
    db: DbSession,
    current_account: CurrentAccountOptional,
    x_service_key: str | None = Header(default=None),
) -> list[ClinicMembership]:
    cfg = get_settings()
    _service_ok = bool(cfg.service_api_key and x_service_key and x_service_key == cfg.service_api_key)
    if not _service_ok:
        if current_account is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
        if not (
            current_account.is_superuser
            or has_permission(db, current_account, PermissionCode.employee_manage, clinic_id)
            or has_permission(db, current_account, PermissionCode.clinic_read, clinic_id)
        ):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing clinic rights")
    memberships = list(
        db.scalars(
            select(ClinicMembership)
            .where(ClinicMembership.clinic_id == clinic_id)
            .options(joinedload(ClinicMembership.account).joinedload(Account.person))
        ).all()
    )
    # Attach person data so MembershipRead can serialize it
    for m in memberships:
        try:
            m.person = m.account.person  # type: ignore[attr-defined]
        except Exception:
            m.person = None  # type: ignore[attr-defined]
    return memberships


@router.get("/roles/catalog", response_model=list[RoleDefinitionRead])
def role_catalog(db: DbSession, current_account: CurrentAccount) -> list[RoleDefinition]:
    if not current_account.is_superuser:
        clinic_level_access = any(
            has_permission(db, current_account, permission)
            for permission in (
                PermissionCode.employee_manage,
                PermissionCode.clinic_read,
                PermissionCode.clinic_application_moderate,
            )
        )
        if not clinic_level_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Missing role access",
            )
    stmt = select(RoleDefinition).order_by(RoleDefinition.scope, RoleDefinition.code)
    return list(db.scalars(stmt).all())


@router.post(
    "/{clinic_id}/employees",
    response_model=MembershipRead,
    status_code=status.HTTP_201_CREATED,
)
def assign_employee(
    clinic_id: int,
    payload: ClinicEmployeeAssign,
    db: DbSession,
    current_account: CurrentAccount,
) -> ClinicMembership:
    clinic = db.get(Clinic, clinic_id)
    if clinic is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clinic not found")

    if not can_assign_role(db, current_account, clinic_id=clinic_id, target_role=payload.role_code):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot assign this role in the selected clinic",
        )

    person = db.scalar(select(Person).where(Person.iin == payload.iin))
    if person is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Person with this IIN not found",
        )

    account = db.scalar(select(Account).where(Account.person_id == person.id))
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account for this person not found",
        )

    existing = db.scalar(
        select(ClinicMembership).where(
            ClinicMembership.clinic_id == clinic_id,
            ClinicMembership.account_id == account.id,
            ClinicMembership.role_code == payload.role_code,
            ClinicMembership.is_active.is_(True),
        )
    )
    if existing is not None:
        return existing

    membership = ClinicMembership(
        account_id=account.id,
        clinic_id=clinic_id,
        role_code=payload.role_code,
        department=payload.department,
        position=payload.position,
    )
    db.add(membership)
    db.flush()
    audit(
        db,
        action="employee.assign",
        entity_type="clinic_membership",
        entity_id=membership.id,
        actor=current_account,
        clinic_id=clinic_id,
        details=f"{payload.iin}:{payload.role_code.value}",
    )
    db.commit()
    db.refresh(membership)
    return membership
