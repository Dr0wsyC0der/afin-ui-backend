import lightgbm as lgb
import joblib
import json

# Пути к файлам (если файлы лежат рядом с app.py)
MODEL_PATH = "best_model_LightGBM/delay_predictor.txt"
SCALER_PATH = "best_model_LightGBM/scaler.pkl"
FEATURES_PATH = "best_model_LightGBM/feature_names.json"  # если есть

# Загружаем модель
model = lgb.Booster(model_file=MODEL_PATH)

# Загружаем scaler
scaler = joblib.load(SCALER_PATH)

# Загружаем имена признаков (если есть)
try:
    with open(FEATURES_PATH, "r", encoding="utf-8") as f:
        model_features = json.load(f)
except FileNotFoundError:
    print("⚠️ feature_names.json не найден, но это не критично.")
    model_features = model.feature_name()

# print("✅ Модель и scaler успешно загружены!")
# print(f"   Всего признаков: {len(model_features)}")

