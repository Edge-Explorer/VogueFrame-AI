"""
Outfit item endpoints — regenerate, get details, update consistency score.
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.job import OutfitItem, JobStatus
from app.schemas.job import OutfitItemOut, RegenerateRequest
from app.services.generation_service import process_outfit_item

router = APIRouter()


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
    item.status = JobStatus.PENDING
    item.error_message = None
    item.images_requested = payload.images_count
    db.commit()

    background_tasks.add_task(process_outfit_item, item, db)

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
