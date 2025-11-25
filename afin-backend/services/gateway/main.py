# services/gateway/main.py
from collections import defaultdict
from fastapi import APIRouter, Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from shared.database import Base, engine, get_db
from services.auth.routers import auth_router, users_router
from services.models.routers import router as models_router
from services.simulation.routers import router as simulation_router
from services.analytics.routers import router as analytics_router
from services.models.models import ProcessModel
from services.simulation.models import SimulationRun

app = FastAPI(title="AFIN API Gateway", docs_url="/docs")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_origin_regex=r"http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ui_router = APIRouter()


@ui_router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    models = db.query(ProcessModel).all()
    runs = db.query(SimulationRun).all()
    active = sum(1 for m in models if m.status == "active")
    drafts = sum(1 for m in models if m.status == "draft")
    archived = sum(1 for m in models if m.status == "archived")
    total_completed = sum((run.results or {}).get("completedProcesses", 0) for run in runs)
    avg_cycle = (
        sum((run.results or {}).get("averageCycleTime", 0) for run in runs) / len(runs)
        if runs
        else 0
    )
    monthly = defaultdict(int)
    for run in runs:
        created = run.created_at
        if created:
            key = created.strftime("%Y-%m")
            monthly[key] += (run.results or {}).get("completedProcesses", 1)

    return {
        "metrics": {
            "activeProcesses": active,
            "pendingApproval": drafts,
            "completedTasks": total_completed,
            "averageCycleTime": round(avg_cycle, 2),
        },
        "monthlyExecution": dict(monthly) or {"2025-01": 0},
        "modelsOverview": {
            "active": active,
            "draft": drafts,
            "archived": archived,
        },
    }


# Подключение роутеров с правильными префиксами
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(users_router, prefix="/api", tags=["users"])
app.include_router(models_router, prefix="/api/processModels", tags=["models"])
app.include_router(models_router, prefix="/api/process-models", tags=["models"])
app.include_router(simulation_router, prefix="/api/simulations", tags=["simulations"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["analytics"])
app.include_router(ui_router, prefix="/api", tags=["dashboard"])


@app.on_event("startup")
async def create_tables():
    Base.metadata.create_all(bind=engine)
    print("Таблицы в SQLite созданы автоматически")


@app.get("/health")
def health():
    return {"status": "ok", "service": "gateway"}