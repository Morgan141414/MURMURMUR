"""Qtrix CRM integration — proxy endpoint that fetches appointments from Qtrix
and returns them normalized for the Saphena calendar.

Requires in .env:
    SAPHENA_QTRIX_API_URL=https://<qtrix-host>
    SAPHENA_QTRIX_SERVICE_TOKEN=<shared secret matching Qtrix INTERNAL_SERVICE_TOKEN>
"""

from __future__ import annotations

import logging
from datetime import datetime

import httpx
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from saphena.api.deps import CurrentAccount, DbSession
from saphena.api.schemas import CrmAppointmentRead, CrmServiceRead
from saphena.core.config import get_settings
from saphena.modules.models import Clinic, ClinicMembership, ClinicService
from saphena.modules.permissions import PermissionCode
from saphena.services.access import has_permission

logger = logging.getLogger(__name__)

router = APIRouter(tags=["qtrix"])


def _qtrix_configured() -> bool:
    s = get_settings()
    return bool(s.qtrix_api_url and s.qtrix_service_token)


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


@router.get("/clinics/{clinic_id}/appointments/crm", response_model=list[CrmAppointmentRead])
async def list_crm_appointments(
    clinic_id: int,
    db: DbSession,
    current_account: CurrentAccount,
) -> list[CrmAppointmentRead]:
    """Fetch appointments from Qtrix CRM for this clinic, normalized for calendar display."""
    if not _qtrix_configured():
        return []

    if not (
        current_account.is_superuser
        or has_permission(db, current_account, PermissionCode.appointment_manage, clinic_id)
        or has_permission(db, current_account, PermissionCode.clinic_read, clinic_id)
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing appointment access")

    clinic = db.get(Clinic, clinic_id)
    if clinic is None or not clinic.qtrix_org_id:
        return []  # clinic not linked to Qtrix

    settings = get_settings()

    # Build a qtrix_user_id → membership_id lookup for this clinic
    memberships = list(db.scalars(
        select(ClinicMembership).where(
            ClinicMembership.clinic_id == clinic_id,
            ClinicMembership.is_active.is_(True),
            ClinicMembership.qtrix_user_id.is_not(None),
        )
    ).all())
    qtrix_to_membership: dict[str, int] = {m.qtrix_user_id: m.id for m in memberships if m.qtrix_user_id}

    url = f"{settings.qtrix_api_url.rstrip('/')}/api/v1/internal/orgs/{clinic.qtrix_org_id}/appointments"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                url,
                headers={"X-Service-Token": settings.qtrix_service_token},
            )
    except Exception:
        logger.exception("Failed to reach Qtrix API at %s", url)
        return []

    if resp.status_code != 200:
        logger.error("Qtrix internal API returned %s: %s", resp.status_code, resp.text[:200])
        return []

    results: list[CrmAppointmentRead] = []
    for item in resp.json():
        starts_at = _parse_dt(item.get("start_at"))
        ends_at = _parse_dt(item.get("end_at"))
        if starts_at is None or ends_at is None:
            continue

        doctor_qtrix_id: str | None = item.get("doctor_id")
        membership_id = qtrix_to_membership.get(doctor_qtrix_id) if doctor_qtrix_id else None

        first = item.get("lead_first_name") or ""
        last = item.get("lead_last_name") or ""
        lead_name = f"{first} {last}".strip() or None

        results.append(CrmAppointmentRead(
            id=item["id"],
            doctor_membership_id=membership_id,
            doctor_qtrix_id=doctor_qtrix_id,
            lead_name=lead_name,
            lead_mobile=item.get("lead_mobile"),
            starts_at=starts_at,
            ends_at=ends_at,
            status=item.get("status") or "scheduled",
            title=item.get("title") or lead_name or "CRM Appointment",
            notes=item.get("notes"),
        ))

    return results


@router.get("/clinics/{clinic_id}/services/crm", response_model=list[CrmServiceRead])
async def list_crm_services(
    clinic_id: int,
    db: DbSession,
    current_account: CurrentAccount,
) -> list[CrmServiceRead]:
    """Return Qtrix CRM price-list services for this clinic (read-only, no sync)."""
    if not _qtrix_configured():
        return []

    if not (
        current_account.is_superuser
        or has_permission(db, current_account, PermissionCode.schedule_manage, clinic_id)
        or has_permission(db, current_account, PermissionCode.clinic_read, clinic_id)
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing clinic access")

    clinic = db.get(Clinic, clinic_id)
    if clinic is None or not clinic.qtrix_org_id:
        return []

    s = get_settings()
    url = f"{s.qtrix_api_url.rstrip('/')}/api/v1/internal/orgs/{clinic.qtrix_org_id}/services"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers={"X-Service-Token": s.qtrix_service_token})
    except Exception:
        logger.exception("Failed to reach Qtrix services API at %s", url)
        return []

    if resp.status_code != 200:
        logger.error("Qtrix services API returned %s: %s", resp.status_code, resp.text[:200])
        return []

    return [
        CrmServiceRead(
            qtrix_id=item["id"],
            name=item["name"],
            category=item.get("category"),
            price_type=item.get("price_type", "not_set"),
            exact_price=item.get("exact_price"),
            min_price=item.get("min_price"),
            max_price=item.get("max_price"),
            currency=item.get("currency", "KZT"),
        )
        for item in resp.json()
    ]


@router.post("/clinics/{clinic_id}/services/sync-from-crm", status_code=200)
async def sync_services_from_crm(
    clinic_id: int,
    db: DbSession,
    current_account: CurrentAccount,
) -> dict:
    """Sync Qtrix CRM price-list services into this clinic's local service catalog."""
    if not _qtrix_configured():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Qtrix not configured")

    if not (
        current_account.is_superuser
        or has_permission(db, current_account, PermissionCode.schedule_manage, clinic_id)
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing schedule access")

    clinic = db.get(Clinic, clinic_id)
    if clinic is None or not clinic.qtrix_org_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Clinic not linked to Qtrix")

    s = get_settings()
    url = f"{s.qtrix_api_url.rstrip('/')}/api/v1/internal/orgs/{clinic.qtrix_org_id}/services"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers={"X-Service-Token": s.qtrix_service_token})
    except Exception:
        logger.exception("Failed to reach Qtrix services API at %s", url)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Qtrix API unreachable")

    if resp.status_code != 200:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Qtrix API error {resp.status_code}")

    items = resp.json()
    created = 0
    updated = 0

    for item in items:
        code = f"crm_{item['id']}"
        price = int(item["exact_price"]) if item.get("exact_price") is not None else None
        existing = db.scalar(
            select(ClinicService).where(
                ClinicService.clinic_id == clinic_id,
                ClinicService.code == code,
            )
        )
        if existing:
            existing.title = item["name"]
            existing.price = price
            existing.is_active = True
            updated += 1
        else:
            db.add(ClinicService(
                clinic_id=clinic_id,
                code=code,
                title=item["name"],
                duration_minutes=30,
                price=price,
                is_active=True,
            ))
            created += 1

    db.commit()
    return {"created": created, "updated": updated, "total": len(items)}
