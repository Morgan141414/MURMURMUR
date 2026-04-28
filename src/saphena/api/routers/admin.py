from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from saphena.api.deps import CurrentAccount, DbSession
from saphena.api.schemas import AuditLogRead
from saphena.modules.models import AuditLog

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/audit", response_model=list[AuditLogRead])
def list_audit(db: DbSession, current_account: CurrentAccount) -> list[AuditLog]:
    if not current_account.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return list(db.scalars(select(AuditLog).order_by(AuditLog.id.desc()).limit(200)).all())
