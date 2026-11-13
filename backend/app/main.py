import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.session import init_db
from app.api.v1.api import api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("myclinix")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist and demo data is seeded
    logger.info("Starting up MY CLINIX backend...")
    init_db()
    logger.info("Database initialized successfully.")
    yield
    # Shutdown logic if any
    logger.info("Shutting down MY CLINIX backend...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="MY CLINIX - Traceable, Evidentiary Clinical Records and Multi-Document Intelligence Platform",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
# Starlette forbids allow_origins=['*'] when allow_credentials=True
raw_origins = [o for o in settings.CORS_ORIGINS if o and o != "*"]
has_wildcard = "*" in settings.CORS_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=raw_origins if not has_wildcard else ["*"],
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$" if not has_wildcard else None,
    allow_credentials=True if not has_wildcard else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error processing {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred. Please verify backend service logs.",
            "type": type(exc).__name__,
        }
    )

# Include v1 API router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "healthy",
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    logger.info(f"Binding MY CLINIX server on {host}:{port}")
    uvicorn.run("app.main:app", host=host, port=port, reload=False)
