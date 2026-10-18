from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.schemas import HealthResponse
from app.routers import (
    children,
    activities,
    observations,
    attendance,
    activity_logs,
    dashboard,
)

app = FastAPI(
    title="VikasSetu API",
    description="Backend API for VikasSetu — Aamchi Shala preschool observation & learning companion",
    version="1.0.0"
)

# Configure CORS for local development ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "VikasSetu API"
    }

# Register API Routers
app.include_router(children.router)
app.include_router(activities.router)
app.include_router(observations.router)
app.include_router(attendance.router)
app.include_router(activity_logs.router)
app.include_router(dashboard.router)
