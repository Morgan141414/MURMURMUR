from fastapi import APIRouter, Header, HTTPException, Request, status
from sqlalchemy import select

from saphena.api.deps import CurrentAccount, DbSession
from saphena.api.schemas import AccountRead, LoginRequest, LoginResponse, RegisterRequest
from saphena.core.config import get_settings
from saphena.core.security import (
    expires_in,
    hash_password,
    new_session_token,
    utcnow,
    verify_password,
)
from saphena.modules.models import Account, PatientProfile, Person, SessionToken
from saphena.services.audit import audit

router = APIRouter(prefix="/auth", tags=["auth"])


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
