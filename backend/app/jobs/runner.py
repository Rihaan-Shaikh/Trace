"""TRACE Background Job Execution Runner.

Provides asynchronous job execution wrappers using SQLAlchemy sessions.
"""

import asyncio
from typing import Callable, Coroutine, Any, Optional
import uuid
from backend.app.db.session import SessionLocal
from backend.app.models.enums import JobStatus
from backend.app.services.job_service import JobService
from backend.app.core.logging import logger


from sqlalchemy.orm import Session


class JobRunner:
    @staticmethod
    async def run_async_task(
        job_id: uuid.UUID,
        task_func: Callable[[Session], Coroutine[Any, Any, Optional[dict]]],
        session_factory: Optional[Callable[[], Session]] = None,
    ):
        """Executes an async task under a persistent Job lifecycle."""
        maker = session_factory or SessionLocal
        with maker() as db:
            try:
                JobService.start_job(db, job_id, stage="initializing")
            except Exception as e:
                logger.error(f"Failed to start job {job_id}: {e}")
                return

        try:
            with maker() as db:
                result_metadata = await task_func(db)
                JobService.complete_job(db, job_id, metadata_update=result_metadata)
        except Exception as e:
            logger.exception(f"Job {job_id} encountered execution error: {e}")
            with maker() as db:
                JobService.fail_job(db, job_id, error_message=str(e))
