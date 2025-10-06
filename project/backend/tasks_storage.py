"""Celery tasks that interact with decentralized storage services.

Separate from heavy text-processing tasks so that uploading large files does
not block embedding pipelines.
"""
from __future__ import annotations

import logging
import os
import uuid as uuid_lib
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from celery_worker import celery_app
from models import PdfUploads
from extended_models import ExtendedPdfUploads  # type: ignore
from storage.dec_storage import upload_to_arweave, upload_to_ipfs

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

logger = logging.getLogger(__name__)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=10,
    max_overflow=20,
    echo=False,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@celery_app.task(name="tasks_storage.upload_to_storage")
def upload_to_storage(upload_id: str, file_path: str, mime: str | None = None):
    """Upload the given file to Arweave (primary) and IPFS (fallback).

    After upload completes, update `ExtendedPdfUploads` with transaction IDs and
    mark `PdfUploads.status` as `COMPLETED`.
    """
    logger.info("📤 Starting storage upload for %s", upload_id)
    db: Session | None = None
    path = Path(file_path)
    try:
        db = SessionLocal()
        ar_tx = upload_to_arweave(path, content_type=mime)
        ipfs_cid = upload_to_ipfs(path)

        # Update DB rows
        uid = uuid_lib.UUID(upload_id)
        ext_row = db.query(ExtendedPdfUploads).filter(ExtendedPdfUploads.id == uid).first()
        if ext_row:
            ext_row.arweave_tx = ar_tx
            ext_row.ipfs_hash = ipfs_cid
        upload_row = db.query(PdfUploads).filter(PdfUploads.id == uid).first()
        if upload_row:
            upload_row.status = "COMPLETED"
        db.commit()
        logger.info("✅ Storage upload complete for %s", upload_id)

    except Exception as exc:
        logger.error("❌ Storage upload failed for %s: %s", upload_id, exc)
        if db:
            db.rollback()
        # mark error status
        try:
            if db:
                uid = uuid_lib.UUID(upload_id)
                upload_row = db.query(PdfUploads).filter(PdfUploads.id == uid).first()
                if upload_row:
                    upload_row.status = "ERROR"
                    db.commit()
        except Exception:  # pragma: no cover
            logger.exception("Could not mark upload error in DB")
    finally:
        try:
            if db:
                db.close()
        finally:
            # remove temp file to free disk
            try:
                path.unlink(missing_ok=True)  # Python 3.8+: ignore errors
            except Exception as _e:
                logger.warning("Could not remove temp file %s", path)
