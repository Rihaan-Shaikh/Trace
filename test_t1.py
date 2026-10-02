import sys
import os

sys.path.append(os.path.abspath("backend"))
from backend.app.analytics.t1_discount_policy import T1DiscountPolicyTemplate

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
reqs, verdict, limitations = T1DiscountPolicyTemplate.evaluate_concept_availability(confirmed_mappings)
print("Verdict:", verdict)
