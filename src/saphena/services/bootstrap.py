import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from saphena.modules.models import RoleDefinition
from saphena.modules.permissions import ROLE_PERMISSIONS, ROLE_TITLES, RoleCode


def ensure_role_definitions(db: Session) -> None:
    existing = {
        item.code: item
        for item in db.scalars(select(RoleDefinition)).all()
    }

    for role_code in RoleCode:
        is_platform_role = (
            role_code.value.startswith("platform_")
            or role_code == RoleCode.support_agent
        )
        scope = "platform" if is_platform_role else "clinic"
        payload = json.dumps(
            sorted(permission.value for permission in ROLE_PERMISSIONS[role_code]),
            ensure_ascii=True,
        )
        item = existing.get(role_code.value)
        if item is None:
            db.add(
                RoleDefinition(
                    code=role_code.value,
                    scope=scope,
                    title=ROLE_TITLES[role_code],
                    permissions=payload,
                    is_system=True,
                )
            )
            continue

        item.scope = scope
        item.title = ROLE_TITLES[role_code]
        item.permissions = payload
        item.is_system = True
        db.add(item)

    db.commit()
