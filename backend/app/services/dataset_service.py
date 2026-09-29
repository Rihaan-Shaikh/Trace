"""TRACE Dataset and Data Health Service.

Manages business datasets, table profiling, semantic entities, and Data Health summaries.
"""

from typing import List, Optional, Tuple
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, func
from backend.app.core.errors import EntityNotFoundError
from backend.app.models.dataset import (
    Dataset,
    DatasetFile,
    DatasetTable,
    DatasetColumn,
    DataQualityFinding,
    SemanticEntity,
    SemanticRelationship,
    MetricDefinition,
    SegmentDefinition,
)
from backend.app.models.enums import AuditAction, DataQualitySeverity
from backend.app.schemas.dataset import DatasetCreateRequest, DataHealthSummaryResponse, DataQualityFindingResponse
from backend.app.services.audit_service import AuditService
from backend.app.services.rate_card_service import RateCardService


class DatasetService:
    @staticmethod
    def create_dataset(db: Session, request: DatasetCreateRequest, actor: str = "user") -> Dataset:
        dataset = Dataset(
            name=request.name,
            description=request.description,
            source_type=request.source_type,
            metadata_json=request.metadata_json,
        )
        db.add(dataset)
        db.commit()
        db.refresh(dataset)

        AuditService.log_event(
            db,
            event_type=AuditAction.DATASET_UPLOADED,
            entity_type="dataset",
            entity_id=str(dataset.id),
            actor=actor,
            details={"name": dataset.name, "source_type": dataset.source_type},
        )
        return dataset

    @staticmethod
    def get_dataset(db: Session, dataset_id: uuid.UUID) -> Dataset:
        dataset = db.get(Dataset, dataset_id)
        if not dataset:
            raise EntityNotFoundError("Dataset", dataset_id)
        return dataset

    @staticmethod
    def list_datasets(db: Session, skip: int = 0, limit: int = 50) -> Tuple[List[Dataset], int]:
        total = db.scalar(select(func.count()).select_from(Dataset)) or 0
        items = list(
            db.scalars(
                select(Dataset).order_by(desc(Dataset.created_at)).offset(skip).limit(limit)
            ).all()
        )
        return items, total

    @staticmethod
    def get_data_health_summary(db: Session, dataset_id: uuid.UUID) -> DataHealthSummaryResponse:
        dataset = DatasetService.get_dataset(db, dataset_id)
        table_count = (
            db.scalar(
                select(func.count()).select_from(DatasetTable).where(DatasetTable.dataset_id == dataset_id)
            )
            or 0
        )
        if dataset.file_count == 0 and table_count == 0:
            return DataHealthSummaryResponse(
                dataset_id=dataset_id,
                overall_health_score=None,
                audit_status="awaiting_data",
                total_findings=0,
                findings_by_severity={"info": 0, "warning": 0, "critical": 0},
                findings=[],
                calculated_data_quality_load_weight=0.0,
            )

        findings = list(
            db.scalars(
                select(DataQualityFinding).where(DataQualityFinding.dataset_id == dataset_id)
            ).all()
        )

        counts = {
            DataQualitySeverity.INFO.value: 0,
            DataQualitySeverity.WARNING.value: 0,
            DataQualitySeverity.CRITICAL.value: 0,
        }
        for f in findings:
            counts[f.severity.value] = counts.get(f.severity.value, 0) + 1

        # Deterministic scoring: each critical finding reduces score by 0.15, warning by 0.05
        # If no findings, score is 1.0 (clean)
        penalty = (counts[DataQualitySeverity.CRITICAL.value] * 0.15) + (
            counts[DataQualitySeverity.WARNING.value] * 0.05
        )
        health_score = max(0.0, min(1.0, 1.0 - penalty))

        # Rate card policy calculation
        active_policy = RateCardService.get_active_policy(db)
        # Data-Quality Load weight = (1 - health_score) * weight_data_quality
        dq_load_weight = (1.0 - health_score) * active_policy.weight_data_quality

        return DataHealthSummaryResponse(
            dataset_id=dataset_id,
            overall_health_score=round(health_score, 4),
            total_findings=len(findings),
            findings_by_severity=counts,
            findings=[DataQualityFindingResponse.model_validate(f) for f in findings],
            calculated_data_quality_load_weight=round(dq_load_weight, 4),
        )

    @staticmethod
    def list_tables(db: Session, dataset_id: uuid.UUID) -> List[DatasetTable]:
        DatasetService.get_dataset(db, dataset_id)
        return list(
            db.scalars(select(DatasetTable).where(DatasetTable.dataset_id == dataset_id)).all()
        )

    @staticmethod
    def list_semantic_entities(db: Session, dataset_id: uuid.UUID) -> List[SemanticEntity]:
        DatasetService.get_dataset(db, dataset_id)
        return list(
            db.scalars(select(SemanticEntity).where(SemanticEntity.dataset_id == dataset_id)).all()
        )

    @staticmethod
    def list_files(db: Session, dataset_id: uuid.UUID) -> List[DatasetFile]:
        DatasetService.get_dataset(db, dataset_id)
        return list(
            db.scalars(
                select(DatasetFile).where(DatasetFile.dataset_id == dataset_id).order_by(desc(DatasetFile.created_at))
            ).all()
        )

    @staticmethod
    def list_metrics(db: Session, dataset_id: uuid.UUID) -> List[MetricDefinition]:
        DatasetService.get_dataset(db, dataset_id)
        return list(
            db.scalars(select(MetricDefinition).where(MetricDefinition.dataset_id == dataset_id)).all()
        )

