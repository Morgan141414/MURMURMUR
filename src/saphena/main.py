from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from saphena.api.routers import admin, auth, bootstrap, clinics, health, operations
from saphena.core.config import get_settings
from saphena.core.database import create_schema

WEB_DIR = Path(__file__).resolve().parent / "web"


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
    app.include_router(operations.router, prefix="/api/v1")
    app.include_router(bootstrap.router, prefix="/api/v1")

    if WEB_DIR.exists():
        app.mount("/assets", StaticFiles(directory=WEB_DIR), name="assets")

        @app.get("/", include_in_schema=False)
        def index() -> FileResponse:
            return FileResponse(WEB_DIR / "index.html")

        @app.get("/{full_path:path}", include_in_schema=False)
        def spa_fallback(full_path: str) -> FileResponse:
            if full_path.startswith(("api/", "assets/")):
                raise HTTPException(status_code=404, detail="Not found")
            return FileResponse(WEB_DIR / "index.html")

    return app


app = create_app()
