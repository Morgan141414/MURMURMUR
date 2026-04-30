from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from saphena.api.deps import CurrentAccount, DbSession
from saphena.api.schemas import AccountRead, AuditLogRead, ClinicApplicationRead, ClinicRead
from saphena.modules.models import Account, AuditLog, Clinic, ClinicApplication, SupportTicket
from saphena.modules.permissions import PermissionCode
from saphena.services.access import has_permission

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/audit", response_model=list[AuditLogRead])
def list_audit(db: DbSession, current_account: CurrentAccount) -> list[AuditLog]:
    if not (
        current_account.is_superuser
        or has_permission(db, current_account, PermissionCode.audit_read)
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return list(db.scalars(select(AuditLog).order_by(AuditLog.id.desc()).limit(200)).all())


@router.get("/users", response_model=list[AccountRead])
def list_users(db: DbSession, current_account: CurrentAccount) -> list[Account]:
    if not current_account.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return list(db.scalars(select(Account).order_by(Account.id.desc()).limit(300)).all())


@router.get("/clinics", response_model=list[ClinicRead])
def list_all_clinics(db: DbSession, current_account: CurrentAccount) -> list[Clinic]:
    if not current_account.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return list(db.scalars(select(Clinic).order_by(Clinic.id.desc()).limit(300)).all())


@router.get("/clinic-applications", response_model=list[ClinicApplicationRead])
def list_all_clinic_applications(
    db: DbSession, current_account: CurrentAccount
) -> list[ClinicApplication]:
    if not current_account.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    stmt = select(ClinicApplication).order_by(ClinicApplication.id.desc()).limit(300)
    return list(db.scalars(stmt).all())


@router.get("/dashboard", response_model=dict[str, int])
def admin_dashboard(db: DbSession, current_account: CurrentAccount) -> dict[str, int]:
    if not current_account.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return {
        "users": len(list(db.scalars(select(Account.id)).all())),
        "clinics": len(list(db.scalars(select(Clinic.id)).all())),
        "applications": len(list(db.scalars(select(ClinicApplication.id)).all())),
        "open_support_tickets": len(list(db.scalars(select(SupportTicket.id)).all())),
        "audit_events": len(list(db.scalars(select(AuditLog.id)).all())),
    }
