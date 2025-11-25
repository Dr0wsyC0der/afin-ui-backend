from collections import defaultdict
from typing import List

import numpy as np
from fastapi import APIRouter, Depends
from sklearn.linear_model import LinearRegression
from sqlalchemy.orm import Session

from shared.database import get_db
from services.models.models import ProcessModel
from services.simulation.models import SimulationRun
from .schemas import PredictRequest, PredictResponse

router = APIRouter()

_reg_model: LinearRegression | None = None


def _serialize_analytics_entry(run: SimulationRun, model: ProcessModel) -> dict:
    results = run.results or {}
    summary = results.get("summary", {})
    return {
        "id": str(run.id),
        "completedProcesses": summary.get("completedTasks", 0),
        "averageCycleTime": summary.get("totalMinutes", 0),
        "averageCost": summary.get("totalCost", 0),
        "bottlenecks": summary.get("anomalyCount", 0),
        "processModel": {
            "id": str(model.id),
            "name": model.name,
        },
    }


def _ensure_model() -> LinearRegression:
    global _reg_model
    if _reg_model is not None:
        return _reg_model

    rng_load = [0.1, 0.3, 0.6, 0.9, 1.2]
    dept_values = {
        None: 1.0,
        "dept_procurement": 1.05,
        "dept_finance": 1.1,
        "dept_itops": 0.95,
    }
    X: List[List[float]] = []
    y: List[float] = []
    for duration in range(30, 301, 30):
        for load in rng_load:
            for dept, factor in dept_values.items():
                X.append([duration, load, factor])
                y.append(duration * (1 + load * 0.25) * factor)
    _reg_model = LinearRegression().fit(np.array(X), np.array(y))
    return _reg_model


@router.post("/predict", response_model=PredictResponse)
def predict(payload: PredictRequest):
    model = _ensure_model()
    dept_factor = {
        None: 1.0,
        "dept_procurement": 1.03,
        "dept_finance": 1.08,
        "dept_itops": 0.97,
    }.get(payload.department, 1.0)
    features = np.array([[payload.expected_duration, payload.current_load or 0.1, dept_factor]])
    predicted_duration = float(model.predict(features)[0])
    baseline_cost = payload.financial_context.get("cost_per_hour") if payload.financial_context else 500
    predicted_cost = (predicted_duration / 60) * baseline_cost
    risk = min(0.95, max(0.05, (payload.current_load or 0.1) * 0.6 + (dept_factor - 1) * 0.4))
    recommendation = (
        "Распараллелить задачу и перераспределить нагрузку"
        if risk > 0.7
        else "Продолжать выполнение по текущему сценарию"
    )
    return PredictResponse(
        predicted_duration=round(predicted_duration, 2),
        predicted_cost=round(predicted_cost, 2),
        risk_score=round(risk, 2),
        recommendation=recommendation,
    )


@router.get("/")
@router.get("")
def list_analytics(db: Session = Depends(get_db)):
    runs = db.query(SimulationRun).order_by(SimulationRun.created_at.desc()).all()
    data = []
    for run in runs:
        model = db.query(ProcessModel).filter(ProcessModel.id == run.model_id).first()
        if not model:
            continue
        data.append(_serialize_analytics_entry(run, model))
    return data


@router.get("/summary")
def analytics_summary(db: Session = Depends(get_db)):
    runs = db.query(SimulationRun).all()
    if not runs:
        return {
            "totalCompleted": 0,
            "averageCycleTime": 0,
            "averageCost": 0,
            "bottlenecksCount": 0,
        }
    total_completed = sum((run.results or {}).get("summary", {}).get("completedTasks", 0) for run in runs)
    avg_cycle = sum((run.results or {}).get("summary", {}).get("totalMinutes", 0) for run in runs) / len(runs)
    avg_cost = sum((run.results or {}).get("summary", {}).get("totalCost", 0) for run in runs) / len(runs)
    bottlenecks = sum((run.results or {}).get("summary", {}).get("anomalyCount", 0) for run in runs)
    return {
        "totalCompleted": total_completed,
        "averageCycleTime": round(avg_cycle, 2),
        "averageCost": round(avg_cost, 2),
        "bottlenecksCount": bottlenecks,
    }
