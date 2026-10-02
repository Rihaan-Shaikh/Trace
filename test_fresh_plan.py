import sys
import os

sys.path.append(os.path.abspath("backend"))
from backend.app.db.session import SessionLocal
from backend.app.models.decision import Decision
from backend.app.services.decision_service import DecisionService
from backend.app.services.investigation_service import InvestigationService
from backend.app.schemas.decision import DecisionCreate

db = SessionLocal()
req = DecisionCreate(
    title="Stop blanket discounts for low-margin customers - fresh test",
    question_text="Stop blanket discounts for low-margin customers",
    status="draft",
    horizon_days=90,
)
d = DecisionService.create_decision(db, req)
d_id = d.id

plan = InvestigationService.generate_investigation_plan(db, d_id)
print("Plan Sufficiency Verdict:", plan.sufficiency_verdict)
