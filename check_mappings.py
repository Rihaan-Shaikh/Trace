import sys
import uuid
import os

sys.path.append(os.path.abspath("backend"))
from backend.app.db.session import SessionLocal
from backend.app.models.dataset import Dataset
from backend.app.services.semantic_service import SemanticService

db = SessionLocal()
dataset = db.query(Dataset).first()
if dataset:
    mappings = SemanticService.get_confirmed_mappings(db, dataset.id)
    print("Mappings found:", mappings)
else:
    print("No dataset")
