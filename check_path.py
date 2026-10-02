import os
current_dir = os.path.dirname(os.path.abspath("backend/app/services/investigation_service.py"))
print("Current dir:", current_dir)
fixture_dir = os.path.abspath(os.path.join(current_dir, "../../../data/novamart"))
print("Fixture dir:", fixture_dir)
print("Exists:", os.path.exists(os.path.join(fixture_dir, "transactions.csv")))
