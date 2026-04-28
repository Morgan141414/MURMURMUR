from sqlalchemy import select
from sqlalchemy.orm import Session

from saphena.modules.models import Account, ClinicMembership
from saphena.modules.permissions import ROLE_PERMISSIONS, PermissionCode


def account_permissions(db: Session, account: Account, clinic_id: int | None = None) -> set[str]:
    if account.is_superuser:
        return {permission.value for permission in PermissionCode}

    stmt = select(ClinicMembership).where(
        ClinicMembership.account_id == account.id,
        ClinicMembership.is_active.is_(True),
    )
    if clinic_id is not None:
        stmt = stmt.where(ClinicMembership.clinic_id == clinic_id)

    permissions: set[str] = set()
    for membership in db.scalars(stmt).all():
        role_permissions = ROLE_PERMISSIONS[membership.role_code]
        permissions.update(permission.value for permission in role_permissions)
    return permissions


def has_permission(
    db: Session, account: Account, permission: PermissionCode, clinic_id: int | None = None
) -> bool:
    return permission.value in account_permissions(db, account, clinic_id)
