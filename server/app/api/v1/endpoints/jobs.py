"""
Jobs endpoints — create batch generation jobs, check status, list jobs.
"""
import zipfile
import io
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

router = APIRouter()


async def _run_job(job_id: int, db: Session) -> None:
    """Background task: process all outfit items in the job sequentially."""
    job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
    if not job:
        return
    job.status = JobStatus.PROCESSING
    db.commit()

    for outfit_item in job.outfits:
        process_outfit_item(outfit_item, db)
        if outfit_item.status == JobStatus.COMPLETED:
            job.completed_outfits += 1
        else:
            job.failed_outfits += 1
        db.commit()

    job.status = (
        JobStatus.COMPLETED if job.failed_outfits == 0 else JobStatus.FAILED
    )
    db.commit()


@router.post("/", response_model=JobCreateResponse, status_code=201)
async def create_job(
    background_tasks: BackgroundTasks,
    outfit_images: List[UploadFile] = File(..., description="One or more outfit images"),
    reference_images: Optional[List[UploadFile]] = File(None, description="Reference images"),
    reference_categories: Optional[str] = Form(
        None,
        description='Comma-separated categories for each reference image: model,background,pose,lighting,vibe,general'
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
    # Parse optional metadata
    names = [n.strip() for n in outfit_names.split(",")] if outfit_names else []
    categories_raw = [c.strip() for c in reference_categories.split(",")] if reference_categories else []

    # Create the job
    job = GenerationJob(
        user_id=current_user.id,
        status=JobStatus.PENDING,
        total_outfits=len(outfit_images),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Upload outfit images and create OutfitItem records
    for idx, outfit_file in enumerate(outfit_images):
        outfit_url = await upload_outfit_image(outfit_file, job.id, idx)
        item = OutfitItem(
            job_id=job.id,
            name=names[idx] if idx < len(names) else None,
            outfit_image_url=outfit_url,
            images_requested=images_per_outfit,
        )
        db.add(item)
        db.flush()  # get item.id

        # Associate reference images with this item
        if reference_images:
            for ref_idx, ref_file in enumerate(reference_images):
                ref_url = await upload_reference_image(ref_file, job.id, ref_idx)
                cat_raw = categories_raw[ref_idx] if ref_idx < len(categories_raw) else "general"
                try:
                    cat = ReferenceCategory(cat_raw)
                except ValueError:
                    cat = ReferenceCategory.GENERAL
                db.add(ReferenceImage(outfit_item_id=item.id, url=ref_url, category=cat))

    db.commit()

    # Kick off background processing
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
        raise HTTPException(status_code=400, detail="No valid image files found in ZIP")

    categories_raw = [c.strip() for c in reference_categories.split(",")] if reference_categories else []

    job = GenerationJob(
        user_id=current_user.id,
        status=JobStatus.PENDING,
        total_outfits=len(extracted),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    import cloudinary.uploader
    for idx, (filename, img_bytes) in enumerate(extracted):
        result = cloudinary.uploader.upload(
            img_bytes,
            folder=f"vogueframe/jobs/{job.id}/outfits",
            public_id=f"outfit_{idx}",
            resource_type="image",
        )
        outfit_url = result["secure_url"]
        item = OutfitItem(
            job_id=job.id,
            name=filename,
            outfit_image_url=outfit_url,
            images_requested=images_per_outfit,
        )
        db.add(item)
        db.flush()

        if reference_images:
            for ref_idx, ref_file in enumerate(reference_images):
                ref_url = await upload_reference_image(ref_file, job.id, ref_idx)
                cat_raw = categories_raw[ref_idx] if ref_idx < len(categories_raw) else "general"
                try:
                    cat = ReferenceCategory(cat_raw)
                except ValueError:
                    cat = ReferenceCategory.GENERAL
                db.add(ReferenceImage(outfit_item_id=item.id, url=ref_url, category=cat))

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
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/", response_model=List[JobStatusOut])
def list_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all generation jobs for the current user."""
    return (
        db.query(GenerationJob)
        .filter(GenerationJob.user_id == current_user.id)
        .order_by(GenerationJob.created_at.desc())
        .all()
    )
