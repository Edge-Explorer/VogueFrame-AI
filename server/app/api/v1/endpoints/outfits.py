"""
Outfit item endpoints — regenerate, get details, update consistency score.
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db, SessionLocal
from app.models.user import User
from app.models.job import OutfitItem, JobStatus, GenerationJob
from app.schemas.job import OutfitItemOut, RegenerateRequest
from app.services.generation_service import process_outfit_item

router = APIRouter()


def _run_regenerate(outfit_id: int) -> None:
    """Thread-safe background worker for regenerating a single outfit."""
    db = SessionLocal()
    try:
        item = db.query(OutfitItem).filter(OutfitItem.id == outfit_id).first()
        if not item:
            return

        job = item.job
        if job and job.status != JobStatus.PROCESSING:
            job.status = JobStatus.PROCESSING
            db.commit()

        print(f"[Regenerate] Starting background generation for outfit {outfit_id}...")
        process_outfit_item(item, db)
        print(f"[Regenerate] Finished generation for outfit {outfit_id}. Status: {item.status.value}")

        # Recalculate parent job overall status and counts
        if job:
            completed = sum(1 for o in job.outfits if o.status == JobStatus.COMPLETED)
            failed = sum(1 for o in job.outfits if o.status == JobStatus.FAILED)
            job.completed_outfits = completed
            job.failed_outfits = failed

            # If all outfits are done processing
            if all(o.status in (JobStatus.COMPLETED, JobStatus.FAILED) for o in job.outfits):
                job.status = JobStatus.COMPLETED if failed == 0 else JobStatus.FAILED
            db.commit()

    except Exception as e:
        print(f"[Regenerate] Uncaught error worker outfit {outfit_id}: {e}")
    finally:
        db.close()


@router.get("/", response_model=list[OutfitItemOut])
def list_user_outfits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all outfit items across all jobs for the current user, newest first."""
    items = (
        db.query(OutfitItem)
        .join(GenerationJob)
        .filter(GenerationJob.user_id == current_user.id)
        .order_by(OutfitItem.created_at.desc())
        .all()
    )
    return items


@router.get("/{outfit_id}", response_model=OutfitItemOut)
def get_outfit_item(
    outfit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get full details of a single outfit item including generated images."""
    item = db.query(OutfitItem).filter(OutfitItem.id == outfit_id).first()
    if not item or item.job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Outfit item not found")
    return item


@router.post("/{outfit_id}/regenerate", response_model=OutfitItemOut)
def regenerate_outfit(
    outfit_id: int,
    payload: RegenerateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Re-trigger image generation for a specific outfit item.
    Useful after failures or when the user wants alternative outputs.
    """
    item = db.query(OutfitItem).filter(OutfitItem.id == outfit_id).first()
    if not item or item.job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Outfit item not found")

    # Reset state for regeneration
    item.status = JobStatus.PROCESSING
    item.error_message = None
    item.images_requested = payload.images_count
    db.commit()

    # Pass the ID instead of the SQLAlchemy object to avoid detached instance errors across threads
    background_tasks.add_task(_run_regenerate, item.id)

    return item


@router.patch("/{outfit_id}/score")
def set_consistency_score(
    outfit_id: int,
    generated_image_id: int,
    score: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually assign an outfit consistency score (0-100) to a generated image."""
    item = db.query(OutfitItem).filter(OutfitItem.id == outfit_id).first()
    if not item or item.job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Outfit item not found")

    gen_img = next((img for img in item.generated_images if img.id == generated_image_id), None)
    if not gen_img:
        raise HTTPException(status_code=404, detail="Generated image not found")

    gen_img.consistency_score = max(0, min(100, score))
    db.commit()
    return {"message": "Consistency score updated", "score": gen_img.consistency_score}
