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
            columns = {
                row[1]
                for row in conn.exec_driver_sql("PRAGMA table_info(support_tickets)").fetchall()
            }
            if "support_thread_id" not in columns:
                conn.exec_driver_sql(
                    "ALTER TABLE support_tickets ADD COLUMN support_thread_id INTEGER"
                )
    with SessionLocal() as db:
        ensure_role_definitions(db)
