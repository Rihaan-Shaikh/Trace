"""TRACE Future Agent Boundaries and Role Protocols.

Establishes structural boundaries and type contracts for future specialist agents
as specified in Project Bible Section 15:
- Data Agent
- Analytics Agent
- Verification Agent
- Reasoning Agent
- Scenario Agent
- Counter-Decision Underwriter
- Decision Agent

Phase 1 establishes clean architectural interfaces without implementing fake AI.
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, Field


class AgentRole(str, Enum):
    DATA_AGENT = "data_agent"
    ANALYTICS_AGENT = "analytics_agent"
    VERIFICATION_AGENT = "verification_agent"
    REASONING_AGENT = "reasoning_agent"
    SCENARIO_AGENT = "scenario_agent"
    COUNTER_DECISION_UNDERWRITER = "counter_decision_underwriter"
    DECISION_AGENT = "decision_agent"


class AgentExecutionContext(BaseModel):
    decision_id: uuid.UUID
    dataset_id: Optional[uuid.UUID] = None
    parameters: Dict[str, Any] = Field(default_factory=dict)
    active_rate_card_version: Optional[str] = None


class AgentOutput(BaseModel):
    role: AgentRole
    status: str = Field(default="completed")
    summary: str
    data_findings: List[Dict[str, Any]] = Field(default_factory=list)
    contradictions_raised: List[Dict[str, Any]] = Field(default_factory=list)
    provenance_metadata: Dict[str, Any] = Field(default_factory=dict)


class BaseSpecialistAgent(ABC):
    """Abstract interface for all TRACE specialist agent roles."""

    def __init__(self, role: AgentRole):
        self.role = role

    @abstractmethod
    async def execute(self, context: AgentExecutionContext) -> AgentOutput:
        """Execute agent analysis stage."""
        pass


class IDataAgent(BaseSpecialistAgent):
    """Audits data health, detects outliers, infers relationships."""
    def __init__(self):
        super().__init__(AgentRole.DATA_AGENT)


class IAnalyticsAgent(BaseSpecialistAgent):
    """Computes deterministic metrics and segment summaries."""
    def __init__(self):
        super().__init__(AgentRole.ANALYTICS_AGENT)


class IVerificationAgent(BaseSpecialistAgent):
    """Independently verifies key numbers by a secondary calculation method."""
    def __init__(self):
        super().__init__(AgentRole.VERIFICATION_AGENT)


class IReasoningAgent(BaseSpecialistAgent):
    """Links verified evidence to decision questions without inventing numbers."""
    def __init__(self):
        super().__init__(AgentRole.REASONING_AGENT)


class IScenarioAgent(BaseSpecialistAgent):
    """Generates Monte Carlo scenario outcome distributions."""
    def __init__(self):
        super().__init__(AgentRole.SCENARIO_AGENT)


class ICounterDecisionUnderwriter(BaseSpecialistAgent):
    """Dedicated agent arguing against the recommendation; quantifies adverse findings."""
    def __init__(self):
        super().__init__(AgentRole.COUNTER_DECISION_UNDERWRITER)


class IDecisionAgent(BaseSpecialistAgent):
    """Computes Decision Premium, Exposure Report, Coverage Lapse Conditions, and Brief."""
    def __init__(self):
        super().__init__(AgentRole.DECISION_AGENT)
