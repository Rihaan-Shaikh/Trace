import sys
import os

sys.path.append(os.path.abspath("backend"))
from backend.app.db.session import SessionLocal
from backend.app.models.decision import Decision, DecisionObjective, InvestigationPlan
from backend.app.services.investigation_service import InvestigationService
from backend.app.analytics.t1_discount_policy import T1DiscountPolicyTemplate

db = SessionLocal()
d = db.query(Decision).order_by(Decision.created_at.desc()).first()

# 1. Check mapping
dataset_id = d.dataset_id
print("Dataset ID:", dataset_id)

current = os.path.dirname(os.path.abspath("backend/app/services/investigation_service.py"))
while os.path.basename(current) != "backend" and current != os.path.dirname(current):
    current = os.path.dirname(current)
fixture_dir = os.path.join(os.path.dirname(current), "data", "novamart")

print("Fixture:", fixture_dir)
print("Exists:", os.path.exists(os.path.join(fixture_dir, "transactions.csv")))

confirmed_mappings = {}
if os.path.exists(os.path.join(fixture_dir, "transactions.csv")):
    confirmed_mappings = {
        "customer_id": "customer_id",
        "product_id": "product_id",
        "transaction_id": "transaction_id",
        "net_sales": "net_sales",
        "unit_price": "unit_price",
        "quantity": "quantity",
        "margin": "margin",
        "discount_depth": "discount_pct",
    }
print("Mappings len:", len(confirmed_mappings))

reqs, verdict, limit = T1DiscountPolicyTemplate.evaluate_concept_availability(confirmed_mappings)
print("Verdict from T1:", verdict)

