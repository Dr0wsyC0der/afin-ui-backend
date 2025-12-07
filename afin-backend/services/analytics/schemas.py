from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    step_id: str
    role: str
    expected_duration: float = Field(gt=0)
    current_load: float = Field(default=0, ge=0)
    department: Optional[str] = None
    financial_context: Optional[Dict[str, Any]] = None


class PredictResponse(BaseModel):
    predicted_duration: float
    predicted_cost: float
    risk_score: float
    recommendation: str


class DelayPredictRequest(BaseModel):
    expected_duration: float
    process_name: str
    role: str
    department: str
    status: str = "active"
    month: Optional[int] = None
    weekday: Optional[int] = None


class DelayPredictResponse(BaseModel):
    delay_probability: float
    prediction: str
    will_be_delayed: bool


class ProcessPredictionResult(BaseModel):
    process_name: str
    expected_duration: Optional[float] = None
    role: Optional[str] = None
    department: Optional[str] = None
    delay_probability: Optional[float] = None
    prediction: Optional[str] = None
    will_be_delayed: Optional[bool] = None
    error: Optional[str] = None


class FileProcessResponse(BaseModel):
    results: List[ProcessPredictionResult]
    total_processed: int
    successful: int
    failed: int


class LLMFileExplainRequest(BaseModel):
    """
    Запрос на первичное объяснение результатов после загрузки файла.

    На фронтэнде после обработки файла мы отправляем список предсказаний
    (минимум одного) и хотим получить от LLM человеко‑понятное резюме.
    """

    results: List[ProcessPredictionResult]


class LLMFileExplainResponse(BaseModel):
    explanation: str


class LLMChatRequest(BaseModel):
    """
    Запрос для последующих сообщений пользователя в чате.

    Мы передаём:
    - message: текст вопроса пользователя
    - context: один «репрезентативный» ProcessPredictionResult
      (например, с максимальной вероятностью задержки), чтобы
      LLM имел числовой контекст о рисках.
    """

    message: str
    context: ProcessPredictionResult


class LLMChatResponse(BaseModel):
    answer: str



