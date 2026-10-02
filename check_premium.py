import sys
import uuid
import os

sys.path.append(os.path.abspath("backend"))
from backend.app.db.session import SessionLocal
from backend.app.services.investigation_service import InvestigationService
from backend.app.models.decision import Decision, DecisionObjective, InvestigationPlan
from backend.app.services.decision_service import DecisionService
from backend.app.models.enums import DecisionStatus

db = SessionLocal()
d = DecisionService.create_decision(db, "Stop blanket discounts for low-margin customers", "Stop blanket discounts for low-margin customers")
d_id = d.id
print("Created decision:", d_id)

InvestigationService.generate_investigation_plan(db, d_id)
result = InvestigationService.execute_investigation(db, d_id)
print("Decision Premium:", result.get("decision_premium", {}).get("total_decision_premium"))
print("Sufficiency Verdict:", result.get("exposure_report", {}).get("data_sufficiency_verdict"))
