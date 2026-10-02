import sys
import os

sys.path.append(os.path.abspath("backend"))
from backend.app.analytics.t1_discount_policy import T1DiscountPolicyTemplate

confirmed_mappings = {'signup_date': 'signup_date', 'customer_name': 'customer_name', 'is_key_account': 'is_key_account', 'customer_id': 'customer_id', 'industry': 'industry', 'region_id': 'region_id', 'last_updated': 'last_updated', 'customer_segment': 'segment', 'product_id': 'product_id', 'unit_cost': 'unit_cost', 'launch_date': 'launch_date', 'list_price': 'list_price', 'category': 'category', 'product_name': 'product_name', 'transaction_date': 'transaction_date', 'unit_price': 'unit_price', 'gross_margin': 'gross_margin', 'discount_pct': 'discount_pct', 'quantity': 'quantity', 'transaction_id': 'transaction_id', 'net_sales': 'net_sales', 'quarterly_spend': 'quarterly_spend', 'region_name': 'region_name', 'start_date': 'start_date', 'end_date': 'end_date', 'discount_id': 'discount_id'}

reqs, verdict, limit = T1DiscountPolicyTemplate.evaluate_concept_availability(confirmed_mappings)
missing = [c for c in T1DiscountPolicyTemplate.REQUIRED_CONCEPTS if c not in confirmed_mappings]
print("Missing Required:", missing)
