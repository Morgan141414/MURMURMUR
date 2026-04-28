from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from saphena.api.deps import CurrentAccount, DbSession
from saphena.api.schemas import (
    ClinicApplicationCreate,
    ClinicApplicationModerate,
    ClinicApplicationRead,
    ClinicRead,
    MembershipRead,
)
from saphena.modules.enums import ClinicApplicationStatus
from saphena.modules.models import Clinic, ClinicApplication, ClinicMembership
from saphena.modules.permissions import PermissionCode, RoleCode
from saphena.services.access import has_permission
from saphena.services.audit import audit

router = APIRouter(prefix="/clinics", tags=["clinics"])


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
    clinic_id: int, db: DbSession, current_account: CurrentAccount
) -> list[ClinicMembership]:
    if not (
        current_account.is_superuser
        or has_permission(db, current_account, PermissionCode.employee_manage, clinic_id)
        or has_permission(db, current_account, PermissionCode.clinic_read, clinic_id)
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing clinic rights")
    return list(
        db.scalars(
            select(ClinicMembership).where(ClinicMembership.clinic_id == clinic_id)
        ).all()
    )
