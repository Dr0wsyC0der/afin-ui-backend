from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel, PeftConfig
import torch
import os

# Настройки
BASE_MODEL = "Qwen/Qwen2-1.5B-Instruct"
LORA_MODEL = "SpaWn03/fixed-qwen2-1.5b-instruct-business-assistant"
LOCAL_PATH = "./models/qwen2-1.5b-lora"

# Создаем папку если нет
os.makedirs(LOCAL_PATH, exist_ok=True)

print("📥 1/4 Скачиваем базовую модель...")
tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
base_model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL,
    torch_dtype=torch.float32,
    low_cpu_mem_usage=True
)

print("📥 2/4 Скачиваем LoRA адаптер...")
model = PeftModel.from_pretrained(base_model, LORA_MODEL)

print("🔗 3/4 Объединяем модель с LoRA...")
model = model.merge_and_unload()  # Важно: объединяем адаптер с моделью

print(f"💾 4/4 Сохраняем объединенную модель в {LOCAL_PATH}...")
tokenizer.save_pretrained(LOCAL_PATH)
model.save_pretrained(LOCAL_PATH)

print("✅ Объединенная модель с LoRA сохранена локально!")