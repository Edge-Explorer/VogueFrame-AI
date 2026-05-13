"""
Jobs endpoints — create batch generation jobs, check status, list jobs.

Route ordering is important in FastAPI:
  GET /       must come before GET /{job_id} to avoid shadowing.
"""
import zipfile
import io
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.job import GenerationJob, OutfitItem, ReferenceImage, JobStatus, ReferenceCategory
from app.schemas.job import JobCreateResponse, JobStatusOut
from app.services.cloudinary_service import upload_outfit_image, upload_reference_image
from app.services.generation_service import process_outfit_item

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Background worker ──────────────────────────────────────────────────────────

async def _run_job(job_id: int, db: Session) -> None:
    """Background task: process all outfit items in the job sequentially."""
    job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
    if not job:
        logger.error(f"[Job {job_id}] Not found in DB — skipping background run.")
        return

    logger.info(f"[Job {job_id}] Starting background processing for {len(job.outfits)} outfit(s).")
    job.status = JobStatus.PROCESSING
    db.commit()

    for outfit_item in job.outfits:
        try:
            process_outfit_item(outfit_item, db)
            if outfit_item.status == JobStatus.COMPLETED:
                job.completed_outfits += 1
                logger.info(f"[Job {job_id}] Outfit {outfit_item.id} completed.")
            else:
                job.failed_outfits += 1
                logger.warning(f"[Job {job_id}] Outfit {outfit_item.id} failed: {outfit_item.error_message}")
        except Exception as exc:
            job.failed_outfits += 1
            outfit_item.status = JobStatus.FAILED
            outfit_item.error_message = str(exc)
            logger.exception(f"[Job {job_id}] Uncaught error processing outfit {outfit_item.id}: {exc}")
        finally:
            db.commit()

    job.status = (
        JobStatus.COMPLETED if job.failed_outfits == 0 else JobStatus.FAILED
    )
    db.commit()
    logger.info(f"[Job {job_id}] Finished. Status: {job.status.value}. "
                f"Completed: {job.completed_outfits}, Failed: {job.failed_outfits}")


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[JobStatusOut])
def list_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all generation jobs for the current user, newest first."""
    return (
        db.query(GenerationJob)
        .filter(GenerationJob.user_id == current_user.id)
        .order_by(GenerationJob.created_at.desc())
        .all()
    )


@router.post("/", response_model=JobCreateResponse, status_code=201)
async def create_job(
    background_tasks: BackgroundTasks,
    outfit_images: List[UploadFile] = File(..., description="One or more outfit images"),
    reference_images: Optional[List[UploadFile]] = File(None, description="Optional reference images"),
    reference_categories: Optional[str] = Form(
        None,
        description="Comma-separated categories per reference image: model,background,pose,lighting,vibe,general"
    ),
    outfit_names: Optional[str] = Form(None, description="Comma-separated outfit labels or SKUs"),
    images_per_outfit: int = Form(1, ge=1, le=4),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new batch generation job.
    Accepts multiple outfit images and optional reference images.
    Processing runs asynchronously in the background.
    """
    names = [n.strip() for n in outfit_names.split(",")] if outfit_names else []
    categories_raw = [c.strip() for c in reference_categories.split(",")] if reference_categories else []

    job = GenerationJob(
        user_id=current_user.id,
        status=JobStatus.PENDING,
        total_outfits=len(outfit_images),
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    logger.info(f"[Job {job.id}] Created for user {current_user.id} with {len(outfit_images)} outfit(s).")

    # Pre-upload reference images once per job to avoid stream exhaustion and redundant network calls
    uploaded_refs = []
    if reference_images:
        for ref_idx, ref_file in enumerate(reference_images):
            ref_url = await upload_reference_image(ref_file, job.id, ref_idx)
            cat_raw = categories_raw[ref_idx] if ref_idx < len(categories_raw) else "general"
            try:
                cat = ReferenceCategory(cat_raw)
            except ValueError:
                cat = ReferenceCategory.GENERAL
            uploaded_refs.append({"url": ref_url, "category": cat})

    for idx, outfit_file in enumerate(outfit_images):
        outfit_url = await upload_outfit_image(outfit_file, job.id, idx)
        item = OutfitItem(
            job_id=job.id,
            name=names[idx] if idx < len(names) else None,
            outfit_image_url=outfit_url,
            images_requested=images_per_outfit,
        )
        db.add(item)
        db.flush()

        for ref_data in uploaded_refs:
            db.add(ReferenceImage(outfit_item_id=item.id, url=ref_data["url"], category=ref_data["category"]))

    db.commit()
    background_tasks.add_task(_run_job, job.id, db)

    return JobCreateResponse(
        job_id=job.id,
        status=JobStatus.PENDING,
        message=f"Job created with {len(outfit_images)} outfit(s). Processing started.",
    )


@router.post("/upload-zip", response_model=JobCreateResponse, status_code=201)
async def create_job_from_zip(
    background_tasks: BackgroundTasks,
    zip_file: UploadFile = File(..., description="ZIP archive containing outfit images"),
    reference_images: Optional[List[UploadFile]] = File(None),
    reference_categories: Optional[str] = Form(None),
    images_per_outfit: int = Form(1, ge=1, le=4),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a generation job from a ZIP file of outfit images.
    Automatically extracts all images and creates outfit items.
    """
    zip_bytes = await zip_file.read()
    extracted: list[tuple[str, bytes]] = []

    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        for name in zf.namelist():
            if name.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                extracted.append((name, zf.read(name)))

    if not extracted:
        raise HTTPException(status_code=400, detail="No valid image files found in ZIP.")

    categories_raw = [c.strip() for c in reference_categories.split(",")] if reference_categories else []

    job = GenerationJob(
        user_id=current_user.id,
        status=JobStatus.PENDING,
        total_outfits=len(extracted),
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    logger.info(f"[Job {job.id}] ZIP upload: {len(extracted)} outfit(s) extracted.")

    # Pre-upload reference images once per job to avoid stream exhaustion and redundant network calls
    uploaded_refs = []
    if reference_images:
        for ref_idx, ref_file in enumerate(reference_images):
            ref_url = await upload_reference_image(ref_file, job.id, ref_idx)
            cat_raw = categories_raw[ref_idx] if ref_idx < len(categories_raw) else "general"
            try:
                cat = ReferenceCategory(cat_raw)
            except ValueError:
                cat = ReferenceCategory.GENERAL
            uploaded_refs.append({"url": ref_url, "category": cat})

    # Use local file storage (same as regular upload)
    for idx, (filename, img_bytes) in enumerate(extracted):
        # Write bytes to a temp-like UploadFile wrapper for reuse
        import io as _io
        from fastapi.datastructures import UploadFile as _UF
        fake_file = UploadFile(filename=filename, file=_io.BytesIO(img_bytes))
        outfit_url = await upload_outfit_image(fake_file, job.id, idx)

        item = OutfitItem(
            job_id=job.id,
            name=filename,
            outfit_image_url=outfit_url,
            images_requested=images_per_outfit,
        )
        db.add(item)
        db.flush()

        for ref_data in uploaded_refs:
            db.add(ReferenceImage(outfit_item_id=item.id, url=ref_data["url"], category=ref_data["category"]))

    db.commit()
    background_tasks.add_task(_run_job, job.id, db)

    return JobCreateResponse(
        job_id=job.id,
        status=JobStatus.PENDING,
        message=f"ZIP extracted: {len(extracted)} outfit(s) queued for generation.",
    )


@router.get("/{job_id}", response_model=JobStatusOut)
def get_job_status(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve the current status and full details of a generation job."""
    job = db.query(GenerationJob).filter(
        GenerationJob.id == job_id,
        GenerationJob.user_id == current_user.id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found.")
    return job
