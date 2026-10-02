"""TRACE Decision and Investigation Pydantic Schemas.

Enforces typed API contracts for decisions, objectives, templates, and investigation plans.
"""

from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field
from backend.app.models.enums import DecisionStatus, DataSufficiencyVerdict


class DecisionCreateRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=255, description="Decision headline")
    question_text: str = Field(..., min_length=10, description="The concrete decision to underwrite")
    dataset_id: Optional[uuid.UUID] = Field(default=None, description="Linked business dataset")
    template_id: Optional[uuid.UUID] = Field(default=None, description="Linked decision template")
    primary_metric_name: Optional[str] = Field(default=None, description="Target commercial metric")
    horizon_days: int = Field(default=90, ge=1, le=730, description="Decision impact horizon")
    validity_window_days: int = Field(default=60, ge=1, le=365, description="Underwriting validity period")


class DecisionUpdateRequest(BaseModel):
    title: Optional[str] = Field(default=None, max_length=255)
    question_text: Optional[str] = None
    status: Optional[DecisionStatus] = None
    dataset_id: Optional[uuid.UUID] = None
    primary_metric_name: Optional[str] = None
    horizon_days: Optional[int] = None
    validity_window_days: Optional[int] = None


class DecisionObjectiveCreateRequest(BaseModel):
    primary_goal: str = Field(..., min_length=5)
    target_metric: str = Field(..., min_length=2)
    constraint_description: Optional[str] = None
    baseline_value: Optional[float] = None
    target_value: Optional[float] = None
    parameters: dict = Field(default_factory=dict)


class DecisionObjectiveResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    decision_id: uuid.UUID
    primary_goal: str
    target_metric: str
    constraint_description: Optional[str] = None
    baseline_value: Optional[float] = None
    target_value: Optional[float] = None
    parameters: dict
    created_at: datetime


class DecisionTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    template_code: str
    title: str
    category: str
    description: str
    required_entities: list
    required_metrics: list
    default_assumptions: dict
    is_active: bool


class InvestigationQuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    investigation_plan_id: uuid.UUID
    order_index: int
    question_text: str
    rationale: str
    target_agent: str
    status: str


class InvestigationPlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    decision_id: uuid.UUID
    plan_summary: str
    sufficiency_verdict: DataSufficiencyVerdict
    missing_information_rankings: list
    stages_definition: list
    is_approved: bool
    questions: Optional[List[InvestigationQuestionResponse]] = None


class DecisionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    question_text: str
    status: DecisionStatus
    dataset_id: Optional[uuid.UUID] = None
    template_id: Optional[uuid.UUID] = None
    primary_metric_name: Optional[str] = None
    horizon_days: int
    validity_window_days: int
    created_at: datetime
    updated_at: datetime
    objective: Optional[DecisionObjectiveResponse] = None

