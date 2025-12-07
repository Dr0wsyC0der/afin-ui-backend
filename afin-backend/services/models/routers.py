from datetime import datetime
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response, Query
from sqlalchemy.orm import Session

from shared.database import get_db
from services.auth.models import User
from services.auth.routers import get_current_user
from . import crud, schemas
from .models import ProcessModel
from .utils.bpmn import bpmn_to_json, json_to_bpmn

router = APIRouter()


def _owner_payload(user: User | None) -> Dict[str, str]:
    if not user:
        return {
            "firstName": "Аналитик",
            "lastName": "",
            "email": "unknown@example.com",
        }
    return {
        "firstName": user.first_name or user.email.split("@")[0].title(),
        "lastName": user.last_name or "",
        "email": user.email,
    }


def serialize_model(db: Session, model: ProcessModel) -> dict:
    owner = db.query(User).filter(User.id == model.user_id).first()
    updated_at = model.updated_at.isoformat() if model.updated_at else datetime.utcnow().isoformat()
    return {
        "id": str(model.id),
        "name": model.name,
        "description": model.description,
        "status": model.status,
        "version": model.version,
        "bpmnXml": model.bpmn_xml,
        "updatedAt": updated_at,
        "owner": _owner_payload(owner),
    }


@router.post("/")
@router.post("")
def create_model(
    model_in: schemas.ModelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payload = schemas.ModelCreate(
        name=model_in.name,
        description=model_in.description,
        status=model_in.status or "draft",
        version=model_in.version or "1.0",
        bpmnXml=model_in.bpmnXml,
        data=model_in.data or {},
    )
    created = crud.create_model(db, payload, current_user.id)
    return serialize_model(db, created)


@router.get("/")
@router.get("")
def list_models(
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(ProcessModel)
    if search:
        like = f"%{search}%"
        query = query.filter(ProcessModel.name.ilike(like))
    if status and status != "all":
        query = query.filter(ProcessModel.status == status)
    models = query.order_by(ProcessModel.updated_at.desc()).all()
    return [serialize_model(db, model) for model in models]


@router.get("/{model_id}")
def get_model(model_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    model = crud.get_model(db, model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    response = serialize_model(db, model)
    response["data"] = model.data
    return response


@router.put("/{model_id}")
def update_model(
    model_id: int,
    model_in: schemas.ModelUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updated = crud.update_model(db, model_id, model_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Model not found")
    if model_in.data is not None:
        updated.data = model_in.data
        db.commit()
        db.refresh(updated)
    return serialize_model(db, updated)


@router.delete("/{model_id}")
def delete_model(model_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    deleted = crud.delete_model(db, model_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Model not found")
    return {"detail": "Deleted"}


@router.post("/{model_id}/copy")
def copy_model(model_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    model = crud.get_model(db, model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    clone = ProcessModel(
        name=f"{model.name} (копия)",
        description=model.description,
        status="draft",
        version=model.version,
        bpmn_xml=model.bpmn_xml,
        data=model.data or {},
        user_id=current_user.id,
    )
    db.add(clone)
    db.commit()
    db.refresh(clone)
    return serialize_model(db, clone)


@router.post("/import/bpmn")
async def import_bpmn(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = await file.read()
    try:
        json_data = bpmn_to_json(content.decode())
        model_in = schemas.ModelCreate(
            name=file.filename,
            data=json_data,
        )
        created = crud.create_model(db, model_in, current_user.id)
        return serialize_model(db, created)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=400, detail=f"BPMN parse error: {exc}") from exc


@router.post("/import/json")
async def import_json(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Импорт модели из JSON файла (массив задач)"""
    import json
    content = await file.read()
    try:
        json_data = json.loads(content.decode())
        items = json_data if isinstance(json_data, list) else [json_data]
        
        # Создаем структуру модели с пулами и задачами
        departments = set(item.get("department", "Procurement") for item in items)
        
        # Создаем пулы
        pools = []
        pool_positions = {}
        for idx, dept in enumerate(sorted(departments)):
            pool_id = f"pool-{idx}"
            pools.append({
                "id": pool_id,
                "type": "pool",
                "position": {"x": 100, "y": 100 + idx * 300},
                "data": {
                    "label": dept,
                    "type": "pool",
                    "department": dept,
                }
            })
            pool_positions[dept] = {"x": 100, "y": 100 + idx * 300}
        
        # Создаем задачи
        tasks = []
        task_counts = {}
        for idx, item in enumerate(items):
            dept = item.get("department", "Procurement")
            if dept not in task_counts:
                task_counts[dept] = 0
            
            pool_pos = pool_positions.get(dept, {"x": 100, "y": 100})
            task_id = f"task-{idx}"
            tasks.append({
                "id": task_id,
                "type": "task",
                "position": {
                    "x": pool_pos["x"] + 50,
                    "y": pool_pos["y"] + 100 + task_counts[dept] * 120,
                },
                "data": {
                    "label": item.get("process_name", "Задача"),
                    "type": "task",
                    "process_name": item.get("process_name", ""),
                    "comment": item.get("comment", ""),
                    "expected_duration": item.get("expected_duration", 60),
                    "month": item.get("month"),
                    "weekday": item.get("weekday"),
                    "status": item.get("status", "active"),
                    "department": dept,
                    "role": item.get("role", "specialist"),
                }
            })
            task_counts[dept] += 1
        
        model_data = {
            "nodes": pools + tasks,
            "edges": []
        }
        
        model_in = schemas.ModelCreate(
            name=file.filename or "Импортированная модель",
            data=model_data,
        )
        created = crud.create_model(db, model_in, current_user.id)
        return serialize_model(db, created)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"JSON parse error: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Import error: {exc}") from exc


@router.get("/{model_id}/export/bpmn")
def export_bpmn(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    model = crud.get_model(db, model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    xml = json_to_bpmn(model.data)
    return Response(
        content=xml,
        media_type="application/xml",
        headers={"Content-Disposition": f"attachment; filename=model_{model_id}.bpmn"},
    )