from fastapi import APIRouter
from app.api.v1.endpoints import health, auth, patients, admin, records, normalization

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(patients.router, prefix="/patients", tags=["Patients"])
api_router.include_router(records.router, prefix="/patients", tags=["Patient Clinical Records"])
api_router.include_router(admin.router, prefix="/admin", tags=["Administrator Governance"])
api_router.include_router(normalization.router, prefix="/normalization", tags=["Universal Medical Normalization Engine"])
