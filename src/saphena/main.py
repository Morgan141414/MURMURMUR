from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse

from saphena.api.routers import admin, auth, bootstrap, clinics, google_calendar, health, integrations, operations
from saphena.core.config import get_settings
from saphena.core.database import create_schema

WEB_DIR = Path(__file__).resolve().parent / "web"
HTML_NO_CACHE_HEADERS = {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
}


def create_app() -> FastAPI:
    settings = get_settings()

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        create_schema()
        yield

    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description="API-first backend for Saphena 2.0 MVP1.",
        lifespan=lifespan,
    )

    app.include_router(health.router)
    app.include_router(auth.router, prefix="/api/v1")
    app.include_router(clinics.router, prefix="/api/v1")
    app.include_router(admin.router, prefix="/api/v1")
    app.include_router(operations.router, prefix="/api/v1")
    app.include_router(integrations.router, prefix="/api/v1")
    app.include_router(bootstrap.router, prefix="/api/v1")
    app.include_router(google_calendar.router, prefix="/api/v1")

    if WEB_DIR.exists():
        @app.get("/", include_in_schema=False)
        def index() -> FileResponse:
            return FileResponse(WEB_DIR / "index.html", headers=HTML_NO_CACHE_HEADERS)

        @app.get("/{full_path:path}", include_in_schema=False)
        def spa_fallback(full_path: str) -> FileResponse:
            if full_path.startswith("api/"):
                raise HTTPException(status_code=404, detail="Not found")

            candidate = (WEB_DIR / full_path).resolve()
            try:
                candidate.relative_to(WEB_DIR.resolve())
            except ValueError:
                raise HTTPException(status_code=404, detail="Not found") from None

            if candidate.is_file():
                return FileResponse(candidate)

            return FileResponse(WEB_DIR / "index.html", headers=HTML_NO_CACHE_HEADERS)

    return app


app = create_app()
