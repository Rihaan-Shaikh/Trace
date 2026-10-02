import os
current = os.path.dirname(os.path.abspath("backend/app/services/investigation_service.py"))
while os.path.basename(current) != "backend" and current != os.path.dirname(current):
    current = os.path.dirname(current)
fixture_dir = os.path.join(os.path.dirname(current), "data", "novamart")
print("Fixture dir:", fixture_dir)
print("Exists?", os.path.exists(os.path.join(fixture_dir, "transactions.csv")))
