import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from saphena.modules.models import Account, ClinicMembership, RoleDefinition
from saphena.modules.permissions import ROLE_PERMISSIONS, PermissionCode, RoleCode


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
    role_rows = {
        item.code: item
        for item in db.scalars(select(RoleDefinition)).all()
    }
    for membership in db.scalars(stmt).all():
        role_item = role_rows.get(membership.role_code.value)
        if role_item is not None:
            permissions.update(json.loads(role_item.permissions))
            continue

        role_permissions = ROLE_PERMISSIONS[membership.role_code]
        permissions.update(permission.value for permission in role_permissions)
    return permissions


def has_permission(
    db: Session, account: Account, permission: PermissionCode, clinic_id: int | None = None
) -> bool:
    return permission.value in account_permissions(db, account, clinic_id)


def can_assign_role(
    db: Session,
    account: Account,
    *,
    clinic_id: int,
    target_role: RoleCode,
) -> bool:
    if account.is_superuser:
        return True

    memberships = list(
        db.scalars(
            select(ClinicMembership).where(
                ClinicMembership.account_id == account.id,
                ClinicMembership.clinic_id == clinic_id,
                ClinicMembership.is_active.is_(True),
            )
        ).all()
    )
    caller_roles = {membership.role_code for membership in memberships}

    if RoleCode.clinic_founder in caller_roles:
        return True
    if RoleCode.clinic_ceo in caller_roles:
        return target_role in {
            RoleCode.chief_doctor,
            RoleCode.doctor,
            RoleCode.reception_admin,
            RoleCode.call_center,
        }
    return False
