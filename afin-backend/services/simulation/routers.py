from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from shared.database import get_db
from services.auth.models import User
from services.auth.routers import get_current_user
from services.models.models import ProcessModel
from services.simulation.company_context import COMPANY_CONTEXT
from services.simulation.engine.simulator import run_simulation
from .models import SimulationRun
from .schemas import SimulationOut, SimulationRequest

router = APIRouter()


def _serialize_simulation(run: SimulationRun, process_model: ProcessModel) -> SimulationOut:
    results = run.results or {}
    return SimulationOut(
        id=run.id,
        processModel={"id": process_model.id, "name": process_model.name},
        summary=results.get("summary") or {},
        timeline=results.get("timeline") or [],
        departmentLoad=results.get("departmentLoad") or [],
        riskHeatmap=results.get("riskHeatmap") or [],
        anomalies=results.get("anomalies") or [],
    )


@router.get("/")
@router.get("")
def list_simulations(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    runs = db.query(SimulationRun).order_by(SimulationRun.created_at.desc()).all()
    response = []
    for run in runs:
        process_model = (
            db.query(ProcessModel).filter(ProcessModel.id == run.model_id).first()
        )
        if not process_model:
            continue
        response.append(_serialize_simulation(run, process_model))
    return response


@router.post("/", response_model=SimulationOut)
@router.post("", response_model=SimulationOut)
def start_simulation(
    request: SimulationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    process_model = (
        db.query(ProcessModel)
        .filter(ProcessModel.id == request.processModelId)
        .first()
    )
    if not process_model:
        raise HTTPException(status_code=404, detail="Process model not found")

    model_payload = process_model.data or {}
    results = run_simulation(model_payload, COMPANY_CONTEXT)

    run = SimulationRun(
        model_id=process_model.id,
        results=results,
        duration=results.get("summary", {}).get("totalMinutes", 0),
        status="completed",
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return _serialize_simulation(run, process_model)


@router.get("/{run_id}", response_model=SimulationOut)
def get_result(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    run = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Simulation not found")
    process_model = (
        db.query(ProcessModel).filter(ProcessModel.id == run.model_id).first()
    )
    if not process_model:
        raise HTTPException(status_code=404, detail="Process model not found")
    return _serialize_simulation(run, process_model)
