"""Google Calendar OAuth2 integration router — ported from Qtrix pattern.

Flow:
  1. GET  /auth-url       → returns Google OAuth URL (requires auth)
  2. GET  /callback       → exchanges code for tokens, stores encrypted in DB
  3. GET  /status         → returns connection status for current user
  4. DELETE /disconnect   → revokes and removes stored tokens
"""

from __future__ import annotations

import logging
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlencode

import httpx
from cryptography.fernet import Fernet, InvalidToken
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select

from saphena.api.deps import CurrentAccount, DbSession
from saphena.core.config import get_settings
from saphena.modules.models import Appointment, ClinicMembership, ClinicService, GoogleCalendarToken

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/google-calendar", tags=["google-calendar"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3"
SCOPES = "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email"


# ── token encryption ──────────────────────────────────────────────────────────

def _get_cipher() -> Fernet | None:
    key = get_settings().google_token_encryption_key
    if not key:
        return None
    try:
        return Fernet(key.encode())
    except Exception:
        return None


def _encrypt(value: str) -> str:
    cipher = _get_cipher()
    if cipher and value:
        return cipher.encrypt(value.encode()).decode()
    return value


def _decrypt(value: str) -> str:
    cipher = _get_cipher()
    if cipher and value:
        try:
            return cipher.decrypt(value.encode()).decode()
        except (InvalidToken, Exception):
            return value
    return value


# ── helpers ───────────────────────────────────────────────────────────────────

def _settings_or_error() -> Any:
    s = get_settings()
    if not s.google_client_id or not s.google_client_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google Calendar integration is not configured on this server.",
        )
    return s


def _utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


async def _refresh_token_row(token_row: GoogleCalendarToken, settings: Any) -> str:
    """Refresh the access token. Updates token_row in-place, does NOT commit."""
    refresh_token = _decrypt(token_row.refresh_token or "")
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token stored.")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "refresh_token": refresh_token,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "grant_type": "refresh_token",
            },
            timeout=15.0,
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to refresh Google access token. Please reconnect your Google Calendar.",
        )

    data = resp.json()
    token_row.access_token = _encrypt(data["access_token"])
    token_row.token_expiry = _utcnow() + timedelta(seconds=data.get("expires_in", 3600))
    if "refresh_token" in data:
        token_row.refresh_token = _encrypt(data["refresh_token"])
    return data["access_token"]  # return plaintext


async def _get_valid_access_token(token_row: GoogleCalendarToken, settings: Any, db: Any) -> str:
    """Return a valid plaintext access token, refreshing if expired."""
    if token_row.token_expiry and token_row.token_expiry <= _utcnow() + timedelta(minutes=2):
        plaintext = await _refresh_token_row(token_row, settings)
        db.add(token_row)
        db.commit()
        return plaintext
    return _decrypt(token_row.access_token)


async def _get_token_for_account(account_id: int, db: Any) -> str | None:
    """Return a valid access token for an account, or None if not connected."""
    settings = get_settings()
    if not settings.google_client_id:
        return None
    token_row = db.scalar(
        select(GoogleCalendarToken).where(
            GoogleCalendarToken.account_id == account_id,
            GoogleCalendarToken.oauth_state.is_(None),
        )
    )
    if not token_row or not token_row.access_token:
        return None
    try:
        return await _get_valid_access_token(token_row, settings, db)
    except Exception:
        return None


# ── Google Calendar API calls ─────────────────────────────────────────────────

async def create_calendar_event(
    access_token: str,
    summary: str,
    starts_at: datetime,
    ends_at: datetime,
    description: str = "",
) -> dict | None:
    def to_dt(dt: datetime) -> str:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.isoformat()

    body: dict[str, Any] = {
        "summary": summary,
        "start": {"dateTime": to_dt(starts_at), "timeZone": "UTC"},
        "end": {"dateTime": to_dt(ends_at), "timeZone": "UTC"},
        "reminders": {"useDefault": False, "overrides": [{"method": "popup", "minutes": 30}]},
    }
    if description:
        body["description"] = description

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{GOOGLE_CALENDAR_API}/calendars/primary/events",
            headers={"Authorization": f"Bearer {access_token}"},
            json=body,
            timeout=15.0,
        )
        if resp.status_code in (200, 201):
            return resp.json()
        logger.error("Failed to create calendar event: %s %s", resp.status_code, resp.text[:200])
    return None


async def update_calendar_event(
    access_token: str,
    event_id: str,
    summary: str,
    starts_at: datetime,
    ends_at: datetime,
    description: str = "",
) -> dict | None:
    def to_dt(dt: datetime) -> str:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.isoformat()

    body: dict[str, Any] = {
        "summary": summary,
        "start": {"dateTime": to_dt(starts_at), "timeZone": "UTC"},
        "end": {"dateTime": to_dt(ends_at), "timeZone": "UTC"},
    }
    if description:
        body["description"] = description

    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            f"{GOOGLE_CALENDAR_API}/calendars/primary/events/{event_id}",
            headers={"Authorization": f"Bearer {access_token}"},
            json=body,
            timeout=15.0,
        )
        if resp.status_code == 200:
            return resp.json()
        logger.error("Failed to update calendar event: %s %s", resp.status_code, resp.text[:200])
    return None


async def delete_calendar_event(access_token: str, event_id: str) -> bool:
    async with httpx.AsyncClient() as client:
        resp = await client.delete(
            f"{GOOGLE_CALENDAR_API}/calendars/primary/events/{event_id}",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=15.0,
        )
        return resp.status_code in (200, 204)


# ── auto-sync helper (called from operations router) ──────────────────────────

async def auto_sync_appointment_to_google(appointment: Appointment, db: Any) -> None:
    """Push appointment to the assigned doctor's Google Calendar. Best-effort, never raises."""
    if appointment.doctor_membership_id is None:
        return

    try:
        membership = db.get(ClinicMembership, appointment.doctor_membership_id)
        if membership is None:
            return

        access_token = await _get_token_for_account(membership.account_id, db)
        if not access_token:
            return

        svc = db.get(ClinicService, appointment.service_id) if appointment.service_id else None
        summary = f"Прием — {svc.title}" if svc else "Медицинский прием"
        description = appointment.reason or ""

        if appointment.google_event_id:
            result = await update_calendar_event(
                access_token, appointment.google_event_id,
                summary, appointment.starts_at, appointment.ends_at, description,
            )
            if result is None:
                # Event deleted on Google side — recreate
                result = await create_calendar_event(
                    access_token, summary, appointment.starts_at, appointment.ends_at, description
                )
        else:
            result = await create_calendar_event(
                access_token, summary, appointment.starts_at, appointment.ends_at, description
            )

        if result:
            appointment.google_event_id = result["id"]
            db.add(appointment)
            db.commit()
    except Exception:
        logger.exception("auto_sync_appointment_to_google failed for appointment %s", appointment.id)


async def delete_appointment_from_google(appointment: Appointment, db: Any) -> None:
    """Remove appointment from doctor's Google Calendar. Best-effort, never raises."""
    if not appointment.google_event_id or appointment.doctor_membership_id is None:
        return
    try:
        membership = db.get(ClinicMembership, appointment.doctor_membership_id)
        if membership is None:
            return
        access_token = await _get_token_for_account(membership.account_id, db)
        if access_token:
            await delete_calendar_event(access_token, appointment.google_event_id)
    except Exception:
        logger.exception("delete_appointment_from_google failed for appointment %s", appointment.id)


# ── schemas ───────────────────────────────────────────────────────────────────

class GoogleCalendarStatusResponse(BaseModel):
    connected: bool
    google_email: str | None = None


# ── endpoints ─────────────────────────────────────────────────────────────────

@router.get("/auth-url", summary="Get Google OAuth2 authorization URL")
def get_auth_url(current_account: CurrentAccount, db: DbSession) -> dict[str, str]:
    settings = _settings_or_error()
    state = secrets.token_urlsafe(32)
    token_row = db.scalar(
        select(GoogleCalendarToken).where(GoogleCalendarToken.account_id == current_account.id)
    )
    if token_row is None:
        token_row = GoogleCalendarToken(account_id=current_account.id, access_token="", oauth_state=state)
    else:
        token_row.oauth_state = state
    db.add(token_row)
    db.commit()

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": SCOPES,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return {"auth_url": f"{GOOGLE_AUTH_URL}?{urlencode(params)}"}


@router.get("/callback", include_in_schema=False)
async def oauth_callback(
    db: DbSession,
    code: str = Query(...),
    state: str = Query(...),
    error: str | None = Query(default=None),
) -> RedirectResponse:
    frontend_base = "/"

    if error:
        return RedirectResponse(url=f"{frontend_base}settings?google_calendar=error&reason={error}")

    settings = _settings_or_error()

    token_row = db.scalar(
        select(GoogleCalendarToken).where(GoogleCalendarToken.oauth_state == state)
    )
    if token_row is None:
        return RedirectResponse(url=f"{frontend_base}settings?google_calendar=error&reason=invalid_state")

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": settings.google_redirect_uri,
                "grant_type": "authorization_code",
            },
            timeout=15.0,
        )

    if token_resp.status_code != 200:
        return RedirectResponse(url=f"{frontend_base}settings?google_calendar=error&reason=token_exchange_failed")

    token_data = token_resp.json()
    access_token: str = token_data["access_token"]
    refresh_token: str | None = token_data.get("refresh_token")
    expires_in: int = token_data.get("expires_in", 3600)

    async with httpx.AsyncClient() as client:
        userinfo_resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10.0,
        )
    google_email = userinfo_resp.json().get("email") if userinfo_resp.status_code == 200 else None

    token_row.access_token = _encrypt(access_token)
    if refresh_token:
        token_row.refresh_token = _encrypt(refresh_token)
    token_row.token_expiry = _utcnow() + timedelta(seconds=expires_in)
    token_row.google_email = google_email
    token_row.oauth_state = None
    db.add(token_row)
    db.commit()

    # Bulk-sync upcoming appointments for this doctor
    membership_ids = [
        row[0] for row in db.execute(
            select(ClinicMembership.id).where(
                ClinicMembership.account_id == token_row.account_id,
                ClinicMembership.is_active.is_(True),
            )
        ).all()
    ]
    if membership_ids:
        upcoming = list(db.scalars(
            select(Appointment).where(
                Appointment.doctor_membership_id.in_(membership_ids),
                Appointment.ends_at >= _utcnow(),
            )
        ).all())
        for appt in upcoming:
            try:
                await auto_sync_appointment_to_google(appt, db)
            except Exception:
                pass

    return RedirectResponse(url=f"{frontend_base}settings?google_calendar=connected")


@router.get("/status", response_model=GoogleCalendarStatusResponse)
def get_status(current_account: CurrentAccount, db: DbSession) -> GoogleCalendarStatusResponse:
    token_row = db.scalar(
        select(GoogleCalendarToken).where(GoogleCalendarToken.account_id == current_account.id)
    )
    connected = (
        token_row is not None
        and bool(token_row.access_token)
        and token_row.oauth_state is None
    )
    return GoogleCalendarStatusResponse(
        connected=connected,
        google_email=token_row.google_email if connected else None,
    )


@router.delete("/disconnect", response_model=dict[str, bool])
async def disconnect(current_account: CurrentAccount, db: DbSession) -> dict[str, bool]:
    token_row = db.scalar(
        select(GoogleCalendarToken).where(GoogleCalendarToken.account_id == current_account.id)
    )
    if token_row is None:
        return {"disconnected": True}

    if token_row.refresh_token or token_row.access_token:
        token_to_revoke = _decrypt(token_row.refresh_token or token_row.access_token)
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    "https://oauth2.googleapis.com/revoke",
                    params={"token": token_to_revoke},
                    timeout=5,
                )
        except Exception:
            pass

    db.delete(token_row)
    db.commit()
    return {"disconnected": True}
