"""TRACE File Ingestion and Processing Service.

Coordinates:
- Safe file uploads with path traversal protection
- Checksum hashing (SHA-256) for deterministic provenance
- Duplicate file detection by SHA-256 hash
- Hard Ground-Truth Firewall: evaluation artifacts can NEVER enter TRACE ingestion
- Parsing of CSV and XLSX files
- Creation of DatasetTable and DatasetColumn records
- Invocation of Data Health Audit and Semantic Mapping
- State management across ingestion lifecycle
"""

import hashlib
import os
import re
from typing import Any, Dict, List, Optional
import uuid
from fastapi import UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import select, delete

from backend.app.models.dataset import (
    Dataset,
    DatasetFile,
    DatasetTable,
    DatasetColumn,
)
from backend.app.models.enums import AuditAction
from backend.app.services.audit_service import AuditService
from backend.app.services.data_profiler import DataProfiler
from backend.app.services.data_health_audit import DataHealthAuditService
from backend.app.services.semantic_service import SemanticLayerService

UPLOAD_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data/uploads"))
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB
ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}


class IngestionService:
    """Manages file ingestion, storage safety, and parsing pipelines."""

    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Removes directory traversal sequences and special characters from filenames."""
        clean = os.path.basename(filename)
        clean = re.sub(r"[^\w\.-]", "_", clean)
        if not clean or clean.startswith("."):
            clean = f"upload_{uuid.uuid4().hex[:8]}{clean}"
        return clean

    @staticmethod
    def save_uploaded_file(db: Session, dataset_id: uuid.UUID, upload_file: UploadFile) -> DatasetFile:
        """Validates and persists uploaded file to safe local storage with SHA-256 provenance."""
        dataset = db.get(Dataset, dataset_id)
        if not dataset:
            raise ValueError(f"Dataset {dataset_id} not found")

        # 1. Ground Truth Hard Firewall Check
        norm_name = upload_file.filename.lower()
        if "ground_truth" in norm_name:
            raise ValueError(
                "Ground truth files belong strictly to the evaluation harness and cannot be ingested into the TRACE underwriting pipeline."
            )

        # 2. Extension Check
        ext = os.path.splitext(upload_file.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise ValueError(f"Unsupported file format '{ext}'. Only {sorted(list(ALLOWED_EXTENSIONS))} are supported.")

        safe_name = IngestionService.sanitize_filename(upload_file.filename)
        dest_dir = os.path.join(UPLOAD_BASE_DIR, str(dataset_id))
        os.makedirs(dest_dir, exist_ok=True)
        dest_path = os.path.join(dest_dir, safe_name)

        hasher = hashlib.sha256()
        total_bytes = 0

        with open(dest_path, "wb") as f:
            while chunk := upload_file.file.read(65536):
                total_bytes += len(chunk)
                if total_bytes > MAX_FILE_SIZE_BYTES:
                    f.close()
                    if os.path.exists(dest_path):
                        os.remove(dest_path)
                    raise ValueError(f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB")
                hasher.update(chunk)
                f.write(chunk)

        sha256_hash = hasher.hexdigest()

        # 3. Duplicate File Check by SHA-256
        existing_files = db.scalars(
            select(DatasetFile).where(DatasetFile.dataset_id == dataset_id)
        ).all()
        for ef in existing_files:
            if ef.parse_metadata and ef.parse_metadata.get("sha256") == sha256_hash:
                # Remove newly written redundant file
                if os.path.exists(dest_path):
                    os.remove(dest_path)
                raise ValueError(
                    f"Duplicate file detected: identical content (SHA-256: {sha256_hash[:16]}...) already exists as '{ef.filename}' in this dataset."
                )

        dataset_file = DatasetFile(
            dataset_id=dataset_id,
            filename=safe_name,
            file_path=dest_path,
            file_size_bytes=total_bytes,
            mime_type=upload_file.content_type or "application/octet-stream",
            status="uploaded",
            parse_metadata={
                "original_filename": upload_file.filename,
                "sha256": sha256_hash,
                "size_bytes": total_bytes,
            },
        )
        db.add(dataset_file)
        dataset.file_count += 1
        db.commit()
        db.refresh(dataset_file)

        AuditService.log_event(
            db,
            event_type=AuditAction.DATASET_UPLOADED,
            entity_type="dataset_file",
            entity_id=str(dataset_file.id),
            actor="user",
            details={
                "dataset_id": str(dataset_id),
                "filename": safe_name,
                "sha256": sha256_hash,
                "bytes": total_bytes,
            },
        )

        return dataset_file

    @staticmethod
    def process_file_pipeline(db: Session, dataset_file_id: uuid.UUID) -> Dict[str, Any]:
        """Runs end-to-end deterministic parsing, profiling, data health audit, and semantic inference."""
        dataset_file = db.get(DatasetFile, dataset_file_id)
        if not dataset_file:
            raise ValueError(f"DatasetFile {dataset_file_id} not found")

        dataset = db.get(Dataset, dataset_file.dataset_id)
        if not dataset:
            raise ValueError(f"Dataset {dataset_file.dataset_id} not found")

        dataset_file.status = "parsing"
        db.commit()

        try:
            # 1. Parse File to DataFrames
            dfs = DataProfiler.parse_file_to_dataframes(
                file_path=dataset_file.file_path,
                original_filename=dataset_file.filename,
            )

            created_tables: List[DatasetTable] = []
            total_added_rows = 0

            # 2. Profile each DataFrame and persist Table + Columns
            for table_name, df in dfs.items():
                profile = DataProfiler.profile_dataframe(df, table_name)

                # Delete existing table with same name in dataset if re-ingesting
                existing = db.scalars(
                    select(DatasetTable).where(
                        DatasetTable.dataset_id == dataset.id,
                        DatasetTable.name == table_name,
                    )
                ).all()
                for e in existing:
                    db.delete(e)
                db.commit()

                table_row = DatasetTable(
                    dataset_id=dataset.id,
                    dataset_file_id=dataset_file.id,
                    name=table_name,
                    row_count=profile["row_count"],
                    column_count=profile["column_count"],
                    raw_properties={"shape": [profile["row_count"], profile["column_count"]]},
                )
                db.add(table_row)
                db.commit()
                db.refresh(table_row)
                created_tables.append(table_row)
                total_added_rows += profile["row_count"]

                for col_data in profile["columns"]:
                    col_row = DatasetColumn(
                        dataset_table_id=table_row.id,
                        name=col_data["name"],
                        data_type=col_data["data_type"],
                        is_nullable=col_data["is_nullable"],
                        is_unique=col_data["is_unique"],
                        null_count=col_data["null_count"],
                        distinct_count=col_data["distinct_count"],
                        sample_values=col_data["sample_values"],
                        stats=col_data["stats"],
                    )
                    db.add(col_row)

            dataset.total_rows += total_added_rows
            dataset_file.status = "processed"
            db.commit()

            # 3. Deterministic Data Health Audit
            health_summary = DataHealthAuditService.audit_dataset(db, dataset.id, loaded_dfs=dfs)

            # 4. Deterministic Semantic Layer Inference
            mappings = SemanticLayerService.infer_and_apply_mappings(db, dataset.id)

            return {
                "dataset_file_id": str(dataset_file.id),
                "status": "processed",
                "tables_created": [t.name for t in created_tables],
                "rows_ingested": total_added_rows,
                "health_score": health_summary.overall_health_score,
                "total_findings": health_summary.total_findings,
                "semantic_mappings_count": len(mappings),
                "readiness_status": dataset.metadata_json.get("readiness_status", "semantic_confirmation_required"),
            }

        except Exception as e:
            dataset_file.status = "failed"
            dataset_file.parse_metadata = {
                **dataset_file.parse_metadata,
                "error": str(e),
            }
            db.commit()
            raise e
