import sys
import os

sys.path.append(os.path.abspath("backend"))
from backend.app.db.session import SessionLocal
from backend.app.services.semantic_service import SemanticService

db = SessionLocal()
ds_id = "9c3732aa-b749-4c15-a4d9-71ebfb5ebfe4"
mappings = SemanticService.get_confirmed_mappings(db, ds_id)
print("Mappings:", mappings)
