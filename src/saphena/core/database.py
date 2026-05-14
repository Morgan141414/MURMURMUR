from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from saphena.core.config import get_settings


class Base(DeclarativeBase):
    pass


def _connect_args(database_url: str) -> dict[str, object]:
    if database_url.startswith("sqlite"):
        return {"check_same_thread": False}
    return {}


settings = get_settings()
engine = create_engine(settings.database_url, connect_args=_connect_args(settings.database_url))
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_schema() -> None:
    from saphena.modules import models  # noqa: F401
    from saphena.services.bootstrap import ensure_role_definitions

    Base.metadata.create_all(bind=engine)
    if settings.database_url.startswith("sqlite"):
        with engine.begin() as conn:
            support_ticket_columns = {
                row[1]
                for row in conn.exec_driver_sql("PRAGMA table_info(support_tickets)").fetchall()
            }
            if "support_thread_id" not in support_ticket_columns:
                conn.exec_driver_sql(
                    "ALTER TABLE support_tickets ADD COLUMN support_thread_id INTEGER"
                )

            support_thread_columns = {
                row[1]
                for row in conn.exec_driver_sql("PRAGMA table_info(support_threads)").fetchall()
            }
            if "request_meta" not in support_thread_columns:
                conn.exec_driver_sql(
                    "ALTER TABLE support_threads ADD COLUMN request_meta JSON"
                )

            schema_additions = {
                "persons": {"qtrix_user_id": "ALTER TABLE persons ADD COLUMN qtrix_user_id VARCHAR(120)"},
                "clinics": {
                    "qtrix_org_id": "ALTER TABLE clinics ADD COLUMN qtrix_org_id VARCHAR(120)",
                    "qtrix_sync_status": "ALTER TABLE clinics ADD COLUMN qtrix_sync_status VARCHAR(64)",
                    "qtrix_last_synced_at": "ALTER TABLE clinics ADD COLUMN qtrix_last_synced_at DATETIME",
                },
                "clinic_memberships": {
                    "qtrix_membership_id": "ALTER TABLE clinic_memberships ADD COLUMN qtrix_membership_id VARCHAR(160)",
                    "qtrix_user_id": "ALTER TABLE clinic_memberships ADD COLUMN qtrix_user_id VARCHAR(120)",
                    "qtrix_org_id": "ALTER TABLE clinic_memberships ADD COLUMN qtrix_org_id VARCHAR(120)",
                    "qtrix_role": "ALTER TABLE clinic_memberships ADD COLUMN qtrix_role VARCHAR(128)",
                },
                "appointments": {
                    "google_event_id": "ALTER TABLE appointments ADD COLUMN google_event_id VARCHAR(256)",
                },
            }
            for table_name, additions in schema_additions.items():
                existing_columns = {
                    row[1] for row in conn.exec_driver_sql(f"PRAGMA table_info({table_name})").fetchall()
                }
                for column_name, ddl in additions.items():
                    if column_name not in existing_columns:
                        conn.exec_driver_sql(ddl)
    with SessionLocal() as db:
        ensure_role_definitions(db)
