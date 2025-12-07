from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import torch
import logging
import os

logging.basicConfig(level=logging.INFO)

# Используем модель с Hugging Face Hub
MODEL_BASE = "Qwen/Qwen2-1.5B-Instruct"
# Если у вас есть дообученная модель с LoRA, раскомментируйте следующую строку:
# MODEL_LORA = "SpaWn03/fixed-qwen2-1.5b-instruct-business-assistant"

# Можно использовать переменную окружения для указания модели
HF_MODEL_NAME = os.getenv("HF_MODEL_NAME", MODEL_BASE)
HF_TOKEN = os.getenv("HF_TOKEN", None)  # Для приватных моделей

print(f"🔄 Загружаем модель с Hugging Face: {HF_MODEL_NAME}...")
tokenizer = AutoTokenizer.from_pretrained(
    HF_MODEL_NAME,
    token=HF_TOKEN
)

model_llm = AutoModelForCausalLM.from_pretrained(
    HF_MODEL_NAME,
    torch_dtype=torch.bfloat16,
    device_map=None,
    low_cpu_mem_usage=True,
    token=HF_TOKEN
)

# Если используете LoRA, раскомментируйте:
# if MODEL_LORA:
#     print(f"🔄 Подключаем LoRA: {MODEL_LORA}...")
#     model_llm = PeftModel.from_pretrained(model_llm, MODEL_LORA)

model_llm.eval()
model_llm = model_llm.to("cpu")
print("✅ Модель загружена и готова!")

__all__ = ['model_llm', 'tokenizer']