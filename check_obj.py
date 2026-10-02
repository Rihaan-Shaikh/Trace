import sys
import uuid
import os

sys.path.append(os.path.abspath("backend"))
from backend.app.db.session import SessionLocal
from backend.app.models.decision import Decision, DecisionObjective, InvestigationPlan

db = SessionLocal()
d_id = "b6da654d-1b2b-4c95-8f20-2f9fc0f5ed7f"
d = db.query(Decision).filter_by(id=d_id).first()
print("Question text:", d.question_text)
obj = db.query(DecisionObjective).filter_by(decision_id=d.id).first()
print("Objective parameters:", obj.parameters)
plan = db.query(InvestigationPlan).filter_by(decision_id=d.id).first()
print("Plan sufficiency:", plan.sufficiency_verdict)
