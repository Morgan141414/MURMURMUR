import secrets

from fastapi import APIRouter, Header, HTTPException, status
from sqlalchemy import select

from saphena.api.deps import DbSession
from saphena.api.schemas import TetisClinicSyncRequest, TetisClinicSyncResponse
from saphena.core.config import get_settings
from saphena.core.security import hash_password, utcnow
from saphena.modules.enums import AccountStatus, ClinicApplicationStatus, ClinicStatus
from saphena.modules.models import Account, Clinic, ClinicApplication, ClinicMembership, Person, SessionToken
from saphena.modules.permissions import RoleCode
from saphena.services.audit import audit
from saphena.services.notifications import create_notification

router = APIRouter(prefix="/integrations/tetis", tags=["integrations"])


def _authorize_tetis_sync(
    db: DbSession,
    *,
    authorization: str | None,
    x_tetis_token: str | None,
) -> Account | None:
    settings = get_settings()
    expected_token = settings.tetis_webhook_token
    if expected_token and x_tetis_token and secrets.compare_digest(x_tetis_token, expected_token):
        return None

    if authorization and authorization.lower().startswith("bearer "):
        token_value = authorization.split(" ", 1)[1].strip()
        session_token = db.scalar(
            select(SessionToken).where(
                SessionToken.token == token_value,
                SessionToken.revoked_at.is_(None),
                SessionToken.expires_at > utcnow(),
            )
        )
        if session_token is not None and session_token.account.is_superuser:
            session_token.last_seen_at = utcnow()
            db.add(session_token)
            return session_token.account

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Missing Tetis integration token or superuser bearer session",
    )


def _ensure_founder_account(db: DbSession, payload: TetisClinicSyncRequest) -> tuple[Account, bool]:
    founder = payload.founder
    person = db.scalar(select(Person).where(Person.iin == founder.iin))
    created_account = False
    if person is None:
        person = Person(
            iin=founder.iin,
            first_name=founder.first_name,
            last_name=founder.last_name,
            middle_name=founder.middle_name,
            phone=founder.phone,
            email=str(founder.email) if founder.email else None,
        )
        db.add(person)
        db.flush()
    else:
        person.first_name = founder.first_name
        person.last_name = founder.last_name
        person.middle_name = founder.middle_name
        if founder.phone is not None:
            person.phone = founder.phone
        if founder.email is not None:
            person.email = str(founder.email)
        db.add(person)

    account = db.scalar(select(Account).where(Account.person_id == person.id))
    if account is None:
        account = Account(
            person_id=person.id,
            password_hash=hash_password(secrets.token_urlsafe(24)),
            status=AccountStatus.active,
        )
        db.add(account)
        db.flush()
        created_account = True
    return account, created_account


@router.post("/clinics", response_model=TetisClinicSyncResponse)
def sync_tetis_clinic(
    payload: TetisClinicSyncRequest,
    db: DbSession,
    authorization: str | None = Header(default=None),
    x_tetis_token: str | None = Header(default=None),
) -> TetisClinicSyncResponse:
    actor = _authorize_tetis_sync(db, authorization=authorization, x_tetis_token=x_tetis_token)
    founder_account, created_founder_account = _ensure_founder_account(db, payload)

    clinic = db.scalar(select(Clinic).where(Clinic.bin_iin == payload.bin_iin))
    created_clinic = False
    if payload.status == ClinicApplicationStatus.approved:
        if clinic is None:
            clinic = Clinic(
                name=payload.name,
                legal_name=payload.legal_name,
                bin_iin=payload.bin_iin,
                address=payload.address,
                contacts=payload.contacts,
                status=ClinicStatus.active,
            )
            db.add(clinic)
            db.flush()
            created_clinic = True
        else:
            clinic.name = payload.name
            clinic.legal_name = payload.legal_name
            clinic.address = payload.address
            clinic.contacts = payload.contacts
            clinic.status = ClinicStatus.active
            db.add(clinic)

    application = db.scalar(select(ClinicApplication).where(ClinicApplication.bin_iin == payload.bin_iin))
    if application is None:
        application = ClinicApplication(
            applicant_account_id=founder_account.id,
            clinic_id=clinic.id if clinic else None,
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
            moderator_comment=payload.moderator_comment,
            status=payload.status,
        )
        db.add(application)
        db.flush()
    else:
        application.applicant_account_id = founder_account.id
        application.clinic_id = clinic.id if clinic else application.clinic_id
        application.name = payload.name
        application.legal_name = payload.legal_name
        application.address = payload.address
        application.contacts = payload.contacts
        application.founder_data = payload.founder_data
        application.requisites = payload.requisites
        application.license_info = payload.license_info
        application.oked = payload.oked
        application.activity_description = payload.activity_description
        application.moderator_comment = payload.moderator_comment
        application.status = payload.status
        db.add(application)

    membership = None
    created_founder_membership = False
    if clinic is not None:
        membership = db.scalar(
            select(ClinicMembership).where(
                ClinicMembership.account_id == founder_account.id,
                ClinicMembership.clinic_id == clinic.id,
                ClinicMembership.role_code == RoleCode.clinic_founder,
            )
        )
        if membership is None:
            membership = ClinicMembership(
                account_id=founder_account.id,
                clinic_id=clinic.id,
                role_code=RoleCode.clinic_founder,
                position="Founder",
            )
            db.add(membership)
            db.flush()
            created_founder_membership = True
        else:
            membership.is_active = True
            db.add(membership)

    create_notification(
        db,
        account_id=founder_account.id,
        title="Clinic synced from Tetis",
        body=f"Clinic '{payload.name}' status is {payload.status.value}.",
    )
    audit(
        db,
        action="tetis.clinic_sync",
        entity_type="clinic_application",
        actor=actor,
        entity_id=application.id,
        clinic_id=clinic.id if clinic else None,
        details=f"external_id={payload.external_id or '-'}; status={payload.status.value}",
    )
    db.commit()

    return TetisClinicSyncResponse(
        clinic_id=clinic.id if clinic else None,
        application_id=application.id,
        founder_account_id=founder_account.id,
        founder_membership_id=membership.id if membership else None,
        status=application.status,
        created_clinic=created_clinic,
        created_founder_account=created_founder_account,
        created_founder_membership=created_founder_membership,
    )
