"""
Модуль для загрузки ML модели предсказания задержек
"""
import json
import os
from pathlib import Path
from typing import Dict, List, Optional

import joblib
import lightgbm as lgb
import pandas as pd

# Путь к директории с моделью (относительно этого файла)
BASE_DIR = Path(__file__).parent
MODEL_DIR = BASE_DIR / "ml_model"

MODEL_PATH = MODEL_DIR / "delay_predictor.txt"
SCALER_PATH = MODEL_DIR / "scaler.pkl"
FEATURES_PATH = MODEL_DIR / "feature_names.json"

# Глобальные переменные для модели
_model: Optional[lgb.Booster] = None
_scaler: Optional[object] = None
_model_features: Optional[List[str]] = None


def load_model():
    """Загружает модель, scaler и список признаков"""
    global _model, _scaler, _model_features

    if _model is not None:
        return _model, _scaler, _model_features

    # Проверяем наличие файлов
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Модель не найдена: {MODEL_PATH}. "
            f"Скопируйте файлы из 'Проект_AI_ассистент/best_model_LightGBM' в '{MODEL_DIR}'"
        )

    if not SCALER_PATH.exists():
        raise FileNotFoundError(
            f"Scaler не найден: {SCALER_PATH}. "
            f"Скопируйте файлы из 'Проект_AI_ассистент/best_model_LightGBM' в '{MODEL_DIR}'"
        )

    # Загружаем модель
    _model = lgb.Booster(model_file=str(MODEL_PATH))

    # Загружаем scaler
    _scaler = joblib.load(str(SCALER_PATH))

    # Загружаем имена признаков
    if FEATURES_PATH.exists():
        with open(FEATURES_PATH, "r", encoding="utf-8") as f:
            _model_features = json.load(f)
    else:
        # Если файла нет, используем имена из модели
        _model_features = _model.feature_name()

    return _model, _scaler, _model_features


def predict_delay(
    expected_duration: float,
    process_name: str,
    role: str,
    department: str,
    status: str = "active",
    month: Optional[int] = None,
    weekday: Optional[int] = None,
) -> Dict[str, any]:
    """
    Предсказывает вероятность задержки для задачи

    Args:
        expected_duration: Ожидаемая длительность в минутах
        process_name: Название процесса
        role: Роль исполнителя
        department: Департамент
        status: Статус задачи (active, completed, blocked, in_progress)
        month: Месяц (1-12), если None - берется текущий
        weekday: День недели (0-6), если None - берется текущий

    Returns:
        Словарь с вероятностью задержки и предсказанием
    """
    import datetime

    if month is None:
        month = datetime.datetime.now().month
    if weekday is None:
        weekday = datetime.datetime.now().weekday()

    model, scaler, model_features = load_model()

    # Формируем DataFrame с одной строкой
    data = {
        "expected_duration": expected_duration,
        "process_name": process_name,
        "role": role,
        "department": department,
        "status": status,
        "month": month,
        "weekday": weekday,
    }

    df = pd.DataFrame([data])

    # Преобразуем категориальные признаки
    cat_cols = ["status", "process_name", "role", "department"]
    for col in cat_cols:
        if col in df.columns:
            df[col] = df[col].astype("category")

    # Создаем one-hot encoding для категориальных признаков
    # Формируем признаки вручную на основе feature_names.json
    feature_dict = {}

    # Числовые признаки
    feature_dict["expected_duration"] = expected_duration
    feature_dict["month"] = month
    feature_dict["weekday"] = weekday

    # Статус (one-hot)
    feature_dict["status_blocked"] = 1 if status == "blocked" else 0
    feature_dict["status_completed"] = 1 if status == "completed" else 0
    feature_dict["status_in_progress"] = 1 if status == "in_progress" else 0

    # Название процесса (one-hot)
    for feature in model_features:
        if feature.startswith("process_name_"):
            expected_name = feature.replace("process_name_", "")
            feature_dict[feature] = 1 if process_name == expected_name else 0

    # Роль (one-hot)
    for feature in model_features:
        if feature.startswith("role_"):
            expected_role = feature.replace("role_", "")
            feature_dict[feature] = 1 if role == expected_role else 0

    # Департамент (one-hot)
    for feature in model_features:
        if feature.startswith("department_"):
            expected_dept = feature.replace("department_", "")
            feature_dict[feature] = 1 if department == expected_dept else 0

    # Создаем DataFrame с правильным порядком признаков
    feature_list = []
    for feat_name in model_features:
        feature_list.append(feature_dict.get(feat_name, 0))

    df_features = pd.DataFrame([feature_list], columns=model_features)

    # Масштабирование (только тех колонок, на которых scaler обучен)
    numeric_cols = ["expected_duration", "month", "weekday"]
    if hasattr(scaler, "feature_names_in_"):
        common_cols = [col for col in numeric_cols if col in scaler.feature_names_in_]
        if common_cols:
            df_features[common_cols] = scaler.transform(df_features[common_cols])

    # Предсказание
    prob = float(model.predict(df_features)[0])
    label = int(prob > 0.5)

    return {
        "delay_probability": round(prob, 3),
        "prediction": "Delayed" if label == 1 else "On time",
        "will_be_delayed": label == 1,
    }


def process_file_data(file_data: List[Dict]) -> List[Dict]:
    """
    Обрабатывает данные из файла и возвращает предсказания для каждого процесса

    Args:
        file_data: Список словарей с данными о процессах

    Returns:
        Список словарей с предсказаниями
    """
    results = []

    for item in file_data:
        # Извлекаем необходимые поля
        expected_duration = item.get("expected_duration") or item.get("duration") or item.get("expectedDuration")
        process_name = item.get("process_name") or item.get("processName") or item.get("name") or "Неизвестный процесс"
        role = item.get("role") or item.get("assignedTo") or "Director"
        department = item.get("department") or item.get("dept") or "Management"
        status = item.get("status") or "active"
        month = item.get("month")
        weekday = item.get("weekday")

        if expected_duration is None:
            results.append({
                "process_name": process_name,
                "error": "Отсутствует поле expected_duration (или duration, expectedDuration)",
            })
            continue

        try:
            prediction = predict_delay(
                expected_duration=float(expected_duration),
                process_name=str(process_name),
                role=str(role),
                department=str(department),
                status=str(status),
                month=month,
                weekday=weekday,
            )

            results.append({
                "process_name": process_name,
                "expected_duration": expected_duration,
                "role": role,
                "department": department,
                **prediction,
            })
        except Exception as e:
            results.append({
                "process_name": process_name,
                "error": str(e),
            })

    return results

