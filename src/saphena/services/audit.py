from sqlalchemy.orm import Session

from saphena.modules.models import Account, AuditLog


def audit(
    db: Session,
    *,
    action: str,
    entity_type: str,
    actor: Account | None = None,
    entity_id: int | str | None = None,
    clinic_id: int | None = None,
    details: str | None = None,
) -> AuditLog:
    item = AuditLog(
        actor_account_id=actor.id if actor else None,
        clinic_id=clinic_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        details=details,
    )
    db.add(item)
    return item
