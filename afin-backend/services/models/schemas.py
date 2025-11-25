from pydantic import BaseModel
from typing import Any, Dict


class ModelCreate(BaseModel):
    name: str
    description: str | None = None
    status: str | None = None
    version: str | None = None
    bpmnXml: str | None = None
    data: Dict[str, Any] | None = None


class ModelUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None
    version: str | None = None
    bpmnXml: str | None = None
    data: Dict[str, Any] | None = None