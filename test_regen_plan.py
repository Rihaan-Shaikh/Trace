import sys
import os

sys.path.append(os.path.abspath("backend"))
from backend.app.db.session import SessionLocal
from backend.app.models.decision import Decision, DecisionObjective, InvestigationPlan
from backend.app.services.investigation_service import InvestigationService

db = SessionLocal()
d = db.query(Decision).order_by(Decision.created_at.desc()).first()
if d:
    # ensure objective
    obj = db.query(DecisionObjective).filter_by(decision_id=d.id).first()
    if not obj:
        obj = DecisionObjective(decision_id=d.id, primary_goal="test", target_metric="test", parameters={})
        db.add(obj)
        db.commit()
    # delete plan if exists
    db.query(InvestigationPlan).filter_by(decision_id=d.id).delete()
    db.commit()
    
    plan = InvestigationService.generate_investigation_plan(db, d.id)
    print("Sufficiency:", plan.sufficiency_verdict)
else:
    print("Decision not found")
