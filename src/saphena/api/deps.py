from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from saphena.core.database import get_db
from saphena.core.security import utcnow
from saphena.modules.models import Account, SessionToken

DbSession = Annotated[Session, Depends(get_db)]


def get_current_account(
    db: DbSession,
    authorization: Annotated[str | None, Header()] = None,
) -> Account:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    token_value = authorization.split(" ", 1)[1].strip()
    session_token = db.scalar(
        select(SessionToken).where(
            SessionToken.token == token_value,
            SessionToken.revoked_at.is_(None),
            SessionToken.expires_at > utcnow(),
        )
    )
    if session_token is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")

    session_token.last_seen_at = utcnow()
    db.add(session_token)
    db.commit()
    db.refresh(session_token)
    return session_token.account


CurrentAccount = Annotated[Account, Depends(get_current_account)]
