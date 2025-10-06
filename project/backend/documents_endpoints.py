"""FastAPI router for document upload and decentralized storage tasks."""
from __future__ import annotations

import logging
import mimetypes
import os
import uuid as uuid_lib
from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from models import PdfUploads, Base
from extended_models import ExtendedPdfUploads  # type: ignore
from wallet_auth import get_current_user  # authentication dependency
from celery_worker import celery_app
from .main import get_db  # reuse DB dependency
from storage.arweave_ipfs_handler import ArweaveIPFSHandler

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_MIME = {
    "application/pdf": ".pdf",
    "text/csv": ".csv",
    "application/vnd.ms-excel": ".csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
}


def _detect_extension(file: UploadFile) -> str:
    """Return a suitable extension for the uploaded file or raise."""
    mime = file.content_type
    if mime in ALLOWED_MIME:
        return ALLOWED_MIME[mime]
    # fallback using filename
    ext = Path(file.filename or "").suffix.lower()
    if ext in {".pdf", ".csv", ".xlsx"}:
        return ext
    raise HTTPException(status_code=400, detail="Unsupported file type")


@router.post("/upload", response_class=JSONResponse)
async def upload_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Accept a PDF/CSV upload, create DB rows, and dispatch Celery task."""
    ext = _detect_extension(file)

    upload_id = uuid_lib.uuid4()

    # persist temp file
    try:
        with NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name
    except Exception as exc:
        logger.error("Error saving uploaded file: %s", exc)
        raise HTTPException(status_code=500, detail="Error saving file")

    # Initialize storage handler
    storage_handler = ArweaveIPFSHandler()

    # Upload to Arweave/IPFS
    try:
        arweave_tx_id = storage_handler.upload_to_arweave(tmp_path)
        ipfs_hash = storage_handler.upload_to_ipfs(tmp_path)
    except Exception as exc:
        logger.error("Error uploading to Arweave/IPFS: %s", exc)
        raise HTTPException(status_code=500, detail="Error uploading to storage")

    # DB rows
    upload_row = PdfUploads(
        id=upload_id,
        filename=file.filename,
        status="UPLOADING",
        user_id=current_user.get("id"),
        total_chunks=0,
        processed_chunks=0,
    )
    extended_row = ExtendedPdfUploads(
        id=upload_id,
        arweave_tx=arweave_tx_id,
        ipfs_hash=ipfs_hash,
        is_public=False,
        tags=[],
        file_size_bytes=os.path.getsize(tmp_path),
        mime_type=file.content_type,
    )
    db.add(upload_row)
    db.add(extended_row)
    db.commit()

    # dispatch async task
    celery_app.send_task(
        "tasks_storage.upload_to_storage",
        args=[str(upload_id), tmp_path, file.content_type],
    )

    return {
        "upload_id": str(upload_id),
        "status": "UPLOADING",
        "message": "File accepted and processing scheduled",
    }
