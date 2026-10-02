import sys
import os

sys.path.append(os.path.abspath("backend"))
from backend.app.db.session import SessionLocal
from backend.app.models.decision import Decision, InvestigationPlan

db = SessionLocal()
d = db.query(Decision).order_by(Decision.created_at.desc()).first()
print("Latest Decision:", d.question_text)
plan = db.query(InvestigationPlan).filter_by(decision_id=d.id).first()
if plan:
    print("Sufficiency Verdict:", plan.sufficiency_verdict)
else:
    print("No plan")
