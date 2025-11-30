from fastapi import FastAPI
from pydantic import BaseModel
import json
import pandas as pd
from model_and_scaler import model, scaler, model_features

import traceback
import logging
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="AI Delay Predictor")

# -----------------------------
# 3️⃣ Описание входных данных
# -----------------------------
class TaskFeatures(BaseModel):
    expected_duration: float
    process_name: str
    role: str
    department: str
    status: str = "active"
    month: int
    weekday: int

# -----------------------------
# 4️⃣ Обработка запроса
# -----------------------------
@app.get("/")
def root():
    return {"message": "API is running", "routes": [r.path for r in app.routes]}

@app.post("/test_json")
def work_json(payload: dict):
    print("✅ Получен JSON:", payload)
    return {"received": True, "payload": payload}

@app.post("/predict_delay")
def predict_delay(task: TaskFeatures):
    try:
        # Формируем DataFrame
        df = pd.DataFrame([task.model_dump()])  # ✅ заменили .dict() на .model_dump()

        # Преобразуем категориальные признаки
        cat_cols = ["status", "process_name", "role", "department"]
        for c in cat_cols:
            if c in df.columns:
                df[c] = df[c].astype("category")

        # Масштабируем числовые признаки
        numeric_cols = [c for c in df.columns if df[c].dtype in ["int64", "float64"]]
        for col in numeric_cols:
            if col not in model_features:
                df.drop(columns=[col], inplace=True, errors="ignore")

        # добавляем отсутствующие признаки из обучающего набора
        for col in model_features:
            if col not in df.columns:
                df[col] = 0

        df = df[model_features]  # выравниваем порядок

        # Масштабирование (только тех колонок, на которых scaler обучен)
        common_cols = list(set(model_features) & set(scaler.feature_names_in_))
        df[common_cols] = scaler.transform(df[common_cols])

        # Предсказание
        prob = float(model.predict(df)[0])
        label = int(prob > 0.5)

        return {
            "delay_probability": round(prob, 3),
            "prediction": "Delayed" if label == 1 else "On time"
        }
    except Exception as e:
        import traceback
        logging.error("❌ Ошибка при обработке запроса:")
        traceback.print_exc()
        return {"error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("FastAPI_server:app", host="127.0.0.1", port=8000, reload=False)