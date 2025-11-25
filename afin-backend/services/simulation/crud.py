from sqlalchemy.orm import Session
from .models import SimulationRun
from .engine.simulator import run_simulation
import time

def create_run(db: Session, model_id: int):
    run = SimulationRun(model_id=model_id, results={}, duration=0, status="running")
    db.add(run)
    db.commit()
    db.refresh(run)
    return run

def get_run(db: Session, run_id: int):
    return db.query(SimulationRun).filter(SimulationRun.id == run_id).first()

def get_runs(db: Session, skip: int = 0, limit: int = 100):
    return db.query(SimulationRun).offset(skip).limit(limit).all()

def run_and_save(db: Session, run_id: int, model_data: dict):
    run = get_run(db, run_id)
    if not run:
        return
    start = time.time()
    results = run_simulation(model_data)
    run.results = results
    run.duration = time.time() - start
    run.status = "completed"
    db.commit()