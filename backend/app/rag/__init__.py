"""TRACE Retrieval-Augmented Generation (RAG) Architecture Scaffolding.

Retrieval, document chunking, prompt injection protection, and provenance
tracking are canonically implemented in backend.app.services.document_service.DocumentService.
This package re-exports DocumentService for architectural convenience.
"""

from backend.app.services.document_service import DocumentService

__all__ = ["DocumentService"]
