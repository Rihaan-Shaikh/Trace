import sys
import uuid
import os

sys.path.append(os.path.abspath("backend"))
from backend.app.db.session import SessionLocal
from backend.app.models.decision import Decision, InvestigationPlan

db = SessionLocal()
decisions = db.query(Decision).order_by(Decision.created_at.desc()).limit(3).all()
for d in decisions:
    print(f"\nDecision ID: {d.id}")
    plan = db.query(InvestigationPlan).filter_by(decision_id=d.id).first()
    if plan:
        print(f"Plan Sufficiency Verdict: {plan.sufficiency_verdict}")
    else:
        print("Plan: NONE")
