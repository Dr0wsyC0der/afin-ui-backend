from collections import defaultdict
from typing import List

import numpy as np
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sklearn.linear_model import LinearRegression
from sqlalchemy.orm import Session
import json
import csv
import io

from shared.database import get_db
from services.models.models import ProcessModel
from services.simulation.models import SimulationRun
from .schemas import (
    PredictRequest,
    PredictResponse,
    DelayPredictRequest,
    DelayPredictResponse,
    FileProcessResponse,
    ProcessPredictionResult,
    LLMFileExplainRequest,
    LLMFileExplainResponse,
    LLMChatRequest,
    LLMChatResponse,
)
from .ml_model_loader import predict_delay, process_file_data
from .llm_client import explain_single_prediction, explain_with_question

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


@router.post("/predict-delay", response_model=DelayPredictResponse)
def predict_delay_endpoint(payload: DelayPredictRequest):
    """Предсказывает вероятность задержки для одного процесса"""
    try:
        result = predict_delay(
            expected_duration=payload.expected_duration,
            process_name=payload.process_name,
            role=payload.role,
            department=payload.department,
            status=payload.status,
            month=payload.month,
            weekday=payload.weekday,
        )
        return DelayPredictResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка предсказания: {str(e)}")


@router.post("/process-file", response_model=FileProcessResponse)
async def process_file(file: UploadFile = File(...)):
    """Обрабатывает загруженный файл (CSV или JSON) и возвращает предсказания для каждого процесса"""
    try:
        # Читаем содержимое файла
        contents = await file.read()
        file_extension = file.filename.split(".")[-1].lower() if file.filename else ""

        # Парсим файл в зависимости от формата
        if file_extension == "json":
            try:
                data = json.loads(contents.decode("utf-8"))
                # Если это список, используем его, иначе оборачиваем в список
                if not isinstance(data, list):
                    data = [data]
            except json.JSONDecodeError as e:
                raise HTTPException(status_code=400, detail=f"Ошибка парсинга JSON: {str(e)}")
        elif file_extension == "csv":
            try:
                # Парсим CSV
                csv_content = contents.decode("utf-8")
                csv_reader = csv.DictReader(io.StringIO(csv_content))
                data = list(csv_reader)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Ошибка парсинга CSV: {str(e)}")
        else:
            raise HTTPException(status_code=400, detail="Поддерживаются только файлы CSV или JSON")

        # Обрабатываем данные
        results = process_file_data(data)

        # Формируем ответ
        successful = sum(1 for r in results if "error" not in r)
        failed = len(results) - successful

        return FileProcessResponse(
            results=[ProcessPredictionResult(**r) for r in results],
            total_processed=len(results),
            successful=successful,
            failed=failed,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка обработки файла: {str(e)}")


@router.post("/llm/explain-file", response_model=LLMFileExplainResponse)
async def llm_explain_file(payload: LLMFileExplainRequest) -> LLMFileExplainResponse:
    """
    Первичное объяснение результатов после загрузки файла.

    Берём самую «рисковую» запись (максимальная delay_probability) и
    просим LLM объяснить её понятным языком.
    """
    if not payload.results:
        raise HTTPException(status_code=400, detail="Список результатов пуст.")

    # Фильтруем записи без ошибок и без delay_probability
    valid_results = [
        r
        for r in payload.results
        if r.error is None and r.delay_probability is not None and r.prediction is not None
    ]

    if not valid_results:
        return LLMFileExplainResponse(
            explanation="Не удалось сформировать объяснение: в результатах нет валидных предсказаний."
        )

    # Выбираем запись с максимальной вероятностью задержки
    top = max(valid_results, key=lambda r: r.delay_probability or 0.0)

    # Используем текущие дату и время, если не указаны
    import datetime
    current_month = datetime.datetime.now().month
    current_weekday = datetime.datetime.now().weekday()
    
    base_context = {
        "expected_duration": top.expected_duration,
        "process_name": top.process_name,
        "role": top.role,
        "department": top.department,
        "status": "active",
        "month": current_month,
        "weekday": current_weekday,
        "delay_probability": top.delay_probability,
        "prediction": top.prediction,
    }

    try:
        explanation = await explain_single_prediction(base_context)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Ошибка при обращении к LLM-сервису: {exc}",
        )

    return LLMFileExplainResponse(explanation=explanation)


@router.post("/llm/chat", response_model=LLMChatResponse)
async def llm_chat(payload: LLMChatRequest) -> LLMChatResponse:
    """
    Обработка последующих сообщений пользователя в чате.

    Мы даём LLM числовой контекст по одной задаче + вопрос пользователя.
    """
    context = payload.context

    # Используем текущие дату и время, если не указаны
    import datetime
    current_month = datetime.datetime.now().month
    current_weekday = datetime.datetime.now().weekday()
    
    base_context = {
        "expected_duration": context.expected_duration,
        "process_name": context.process_name,
        "role": context.role,
        "department": context.department,
        "status": "active",
        "month": current_month,
        "weekday": current_weekday,
        "delay_probability": context.delay_probability,
        "prediction": context.prediction,
    }

    try:
        answer = await explain_with_question(base_context, payload.message)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Ошибка при обращении к LLM-сервису: {exc}",
        )

    return LLMChatResponse(answer=answer)

