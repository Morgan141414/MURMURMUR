from fastapi import APIRouter, Header, HTTPException, Request, status
from sqlalchemy import select, text

from saphena.api.deps import CurrentAccount, DbSession
from saphena.api.schemas import AccountRead, LoginRequest, LoginResponse, RegisterRequest, TetisTransitionLoginRequest, TetisTransitionLoginResponse
from saphena.core.config import get_settings
from saphena.core.security import (
    expires_in,
    hash_password,
    new_session_token,
    utcnow,
    verify_password,
)
from saphena.modules.enums import AccountStatus
from saphena.modules.models import Account, Clinic, ClinicMembership, PatientProfile, Person, SessionToken
from saphena.services.audit import audit

import base64
import hashlib
import hmac
import json

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/health", response_model=dict)
def auth_health(db: DbSession) -> dict:
    settings = get_settings()
    checks: dict[str, str | int | bool] = {
        "database": "ok",
        "token_mode": settings.auth_token_mode,
        "session_ttl_minutes": settings.session_ttl_minutes,
        "refresh_token_supported": False,
    }
    warnings: list[str] = []

    try:
        db.execute(text("select 1"))
    except Exception:
        checks["database"] = "error"
        warnings.append("Database health check failed")

    if settings.session_ttl_minutes < 30:
        warnings.append("Session TTL is very short for clinic workflows")

    return {
        "status": "ok" if checks["database"] == "ok" else "degraded",
        "checks": checks,
        "warnings": warnings,
    }


@router.post("/register", response_model=AccountRead, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: DbSession) -> Account:
    existing_person = db.scalar(select(Person).where(Person.iin == payload.iin))
    if existing_person is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="IIN already registered")

    person = Person(
        iin=payload.iin,
        first_name=payload.first_name,
        last_name=payload.last_name,
        middle_name=payload.middle_name,
        phone=payload.phone,
        email=str(payload.email) if payload.email else None,
    )
    account = Account(person=person, password_hash=hash_password(payload.password))
    patient_profile = PatientProfile(person=person)

    db.add_all([person, account, patient_profile])
    db.flush()
    audit(db, action="auth.register", entity_type="account", actor=account)
    db.commit()
    db.refresh(account)
    return account


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, request: Request, db: DbSession) -> LoginResponse:
    account = db.scalar(select(Account).join(Person).where(Person.iin == payload.iin))
    if account is None or not verify_password(payload.password, account.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = SessionToken(
        account=account,
        token=new_session_token(),
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
        expires_at=expires_in(get_settings().session_ttl_minutes),
    )
    db.add(token)
    audit(db, action="auth.login", entity_type="account", actor=account, entity_id=account.id)
    db.commit()
    db.refresh(account)
    return LoginResponse(access_token=token.token, account=account)


@router.get("/me", response_model=AccountRead)
def me(current_account: CurrentAccount) -> Account:
    return current_account


@router.post("/logout", response_model=dict[str, bool])
def logout(
    db: DbSession,
    current_account: CurrentAccount,
    authorization: str | None = Header(default=None),
) -> dict[str, bool]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing bearer token")
    token_value = authorization.split(" ", 1)[1].strip()
    session_token = db.scalar(
        select(SessionToken).where(
            SessionToken.token == token_value,
            SessionToken.account_id == current_account.id,
            SessionToken.revoked_at.is_(None),
        )
    )
    if session_token is None:
        return {"ok": True}
    session_token.revoked_at = utcnow()
    db.add(session_token)
    audit(db, action="auth.logout", entity_type="session_token", actor=current_account)
    db.commit()
    return {"ok": True}



def _decode_transition_token(token: str) -> dict:
    settings = get_settings()
    secret = settings.tetis_transition_secret or settings.tetis_webhook_token
    if not secret:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Transition login is not configured")
    try:
        encoded_payload, signature = token.split(".", 1)
        expected = hmac.new(secret.encode("utf-8"), encoded_payload.encode("ascii"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError("bad signature")
        padded = encoded_payload + "=" * (-len(encoded_payload) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid transition token") from exc
    if int(payload.get("exp") or 0) < int(utcnow().timestamp()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Transition token expired")
    return payload


@router.post("/transition/qtrix", response_model=TetisTransitionLoginResponse)
def login_from_qtrix(payload: TetisTransitionLoginRequest, request: Request, db: DbSession) -> TetisTransitionLoginResponse:
    data = _decode_transition_token(payload.token)
    qtrix_user_id = str(data.get("qtrix_user_id") or "")
    qtrix_org_id = str(data.get("qtrix_org_id") or "")
    if not qtrix_user_id or not qtrix_org_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Transition token is incomplete")

    membership = db.scalar(
        select(ClinicMembership)
        .join(Clinic, Clinic.id == ClinicMembership.clinic_id)
        .where(
            ClinicMembership.qtrix_user_id == qtrix_user_id,
            Clinic.qtrix_org_id == qtrix_org_id,
            ClinicMembership.is_active.is_(True),
        )
    )
    if membership is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No active QorMed access for this Qtrix user")

    account = db.get(Account, membership.account_id)
    if account is None or account.status != AccountStatus.active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="QorMed account is inactive")

    session = SessionToken(
        account=account,
        token=new_session_token(),
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
        expires_at=expires_in(get_settings().session_ttl_minutes),
    )
    db.add(session)
    audit(db, action="auth.transition_qtrix", entity_type="account", actor=account, entity_id=account.id)
    db.commit()
    db.refresh(account)
    return TetisTransitionLoginResponse(access_token=session.token, account=account)
