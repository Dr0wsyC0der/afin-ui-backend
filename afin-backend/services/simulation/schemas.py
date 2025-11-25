from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class SimulationRequest(BaseModel):
    processModelId: int


class TimelineEntry(BaseModel):
    stepId: str
    label: Optional[str]
    role: str
    employee: str
    department: Optional[str]
    expectedDuration: float
    actualDuration: float
    cost: float
    usedML: bool
    riskScore: Optional[float]
    recommendation: Optional[str]


class SimulationSummary(BaseModel):
    totalMinutes: float
    totalCost: float
    mlCalls: int
    anomalyCount: int
    overloadedEmployees: List[Dict[str, Any]]


class SimulationOut(BaseModel):
    id: int
    processModel: Dict[str, Any]
    summary: SimulationSummary
    timeline: List[TimelineEntry]
    departmentLoad: List[Dict[str, Any]]
    riskHeatmap: List[Dict[str, Any]]
    anomalies: List[Dict[str, Any]]