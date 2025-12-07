"""
Клиент для обращения к LLM-сервису
"""
import os
import httpx
import logging
import asyncio
from typing import Dict, Optional

logger = logging.getLogger(__name__)

# URL сервиса LLM (по умолчанию http://ai-assistant:8000 для Docker)
LLM_SERVICE_URL = os.getenv("LLM_SERVICE_URL", "http://ai-assistant:8000")

# Количество попыток подключения
MAX_RETRIES = 5
# Начальная задержка между попытками (секунды)
INITIAL_RETRY_DELAY = 2


async def explain_single_prediction(context: Dict) -> str:
    """
    Получить объяснение для одного предсказания задержки.

    Args:
        context: Словарь с данными о процессе (expected_duration, process_name, role, 
                 department, status, month, weekday, delay_probability, prediction)

    Returns:
        Текстовое объяснение от LLM
    """
    url = f"{LLM_SERVICE_URL}/explain_delay"
    
    last_error = None
    for attempt in range(MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, json=context)
                response.raise_for_status()
                data = response.json()
                
                if data.get("success") and data.get("explanation"):
                    return data["explanation"]
                else:
                    error_msg = data.get("error", "Неизвестная ошибка LLM")
                    logger.error(f"LLM вернул ошибку: {error_msg}")
                    raise Exception(f"LLM вернул ошибку: {error_msg}")
                    
        except (httpx.ConnectError, httpx.TimeoutException) as e:
            last_error = e
            if attempt < MAX_RETRIES - 1:
                delay = INITIAL_RETRY_DELAY * (2 ** attempt)
                logger.warning(
                    f"Попытка {attempt + 1}/{MAX_RETRIES} не удалась. "
                    f"Повтор через {delay} сек... Ошибка: {e}"
                )
                await asyncio.sleep(delay)
            else:
                logger.error(f"Все {MAX_RETRIES} попыток подключения к LLM-сервису исчерпаны")
                raise Exception(f"Не удалось подключиться к LLM-сервису после {MAX_RETRIES} попыток: {e}")
        except httpx.HTTPStatusError as e:
            logger.error(f"Ошибка HTTP при обращении к LLM: {e.response.status_code} - {e.response.text}")
            raise Exception(f"Ошибка HTTP {e.response.status_code}: {e.response.text}")
        except Exception as e:
            logger.error(f"Ошибка при обращении к LLM-сервису: {e}")
            raise


async def explain_with_question(context: Dict, question: str) -> str:
    """
    Получить ответ на вопрос пользователя с учётом контекста предсказания.

    Args:
        context: Словарь с данными о процессе
        question: Вопрос пользователя

    Returns:
        Ответ от LLM
    """
    # Пока используем тот же эндпоинт, но добавляем вопрос в контекст
    # В будущем можно добавить отдельный эндпоинт /chat в LLM-сервисе
    enhanced_context = context.copy()
    enhanced_context["user_question"] = question
    
    url = f"{LLM_SERVICE_URL}/explain_delay"
    
    last_error = None
    for attempt in range(MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, json=enhanced_context)
                response.raise_for_status()
                data = response.json()
                
                if data.get("success") and data.get("explanation"):
                    return data["explanation"]
                else:
                    error_msg = data.get("error", "Неизвестная ошибка LLM")
                    logger.error(f"LLM вернул ошибку: {error_msg}")
                    raise Exception(f"LLM вернул ошибку: {error_msg}")
                    
        except (httpx.ConnectError, httpx.TimeoutException) as e:
            last_error = e
            if attempt < MAX_RETRIES - 1:
                delay = INITIAL_RETRY_DELAY * (2 ** attempt)
                logger.warning(
                    f"Попытка {attempt + 1}/{MAX_RETRIES} не удалась. "
                    f"Повтор через {delay} сек... Ошибка: {e}"
                )
                await asyncio.sleep(delay)
            else:
                logger.error(f"Все {MAX_RETRIES} попыток подключения к LLM-сервису исчерпаны")
                raise Exception(f"Не удалось подключиться к LLM-сервису после {MAX_RETRIES} попыток: {e}")
        except httpx.HTTPStatusError as e:
            logger.error(f"Ошибка HTTP при обращении к LLM: {e.response.status_code} - {e.response.text}")
            raise Exception(f"Ошибка HTTP {e.response.status_code}: {e.response.text}")
        except Exception as e:
            logger.error(f"Ошибка при обращении к LLM-сервису: {e}")
            raise

