from typing import Any, Dict, Optional

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


