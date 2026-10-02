import sys
import uuid
import os

sys.path.append(os.path.abspath("backend"))
from backend.app.db.session import SessionLocal
from backend.app.models.decision import Decision, DecisionObjective, InvestigationPlan

db = SessionLocal()
decisions = db.query(Decision).order_by(Decision.created_at.desc()).limit(3).all()
for d in decisions:
    print(f"\nDecision ID: {d.id}")
    print(f"Title: {d.title}")
    obj = db.query(DecisionObjective).filter_by(decision_id=d.id).first()
    if obj:
        print(f"Objective: {obj.primary_goal} ({obj.target_metric})")
    else:
        print("Objective: NONE")
    
    plan = db.query(InvestigationPlan).filter_by(decision_id=d.id).first()
    if plan:
        print("Plan: YES")
    else:
        print("Plan: NONE")
