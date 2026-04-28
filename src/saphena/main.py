from fastapi import FastAPI

from saphena.api.routers import admin, auth, clinics, health
from saphena.core.config import get_settings
from saphena.core.database import create_schema


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description="API-first backend for Saphena 2.0 MVP1.",
    )

    @app.on_event("startup")
    def on_startup() -> None:
        create_schema()

    app.include_router(health.router)
    app.include_router(auth.router, prefix="/api/v1")
    app.include_router(clinics.router, prefix="/api/v1")
    app.include_router(admin.router, prefix="/api/v1")
    return app


app = create_app()
