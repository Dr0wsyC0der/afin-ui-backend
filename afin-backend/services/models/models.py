from sqlalchemy import Column, Integer, String, JSON, Text, DateTime, func
from shared.database import Base


class ProcessModel(Base):
    __tablename__ = "process_models"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="draft", nullable=False)
    version = Column(String, default="1.0", nullable=False)
    bpmn_xml = Column(Text, nullable=True)
    data = Column(JSON, nullable=False, default=dict)
    user_id = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )