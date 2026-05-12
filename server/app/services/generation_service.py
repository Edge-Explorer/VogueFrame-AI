"""
Generation service — orchestrates the full pipeline for a single OutfitItem:
1. Downloads outfit image from Cloudinary.
2. Builds the structured prompt via the prompt engine.
3. Calls Imagen 2 via Vertex AI.
4. Uploads results to Cloudinary.
5. Persists GeneratedImage records and updates job counters.
"""
import requests
from sqlalchemy.orm import Session

from app.models.job import OutfitItem, GeneratedImage, JobStatus, ReferenceCategory
from app.services.prompt_engine import build_outfit_prompt
from app.services.imagen_service import generate_fashion_images
from app.services.cloudinary_service import upload_generated_image


import os

def _fetch_image_bytes(url: str) -> bytes:
    # If it's a local URL from our overridden cloudinary service, read it from disk directly
    # to prevent blocking the event loop with an HTTP request to ourselves.
    if url.startswith("http://localhost:8000/uploads/"):
        relative_path = url.replace("http://localhost:8000/uploads/", "")
        local_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../uploads", relative_path))
        with open(local_path, "rb") as f:
            return f.read()

    # Fallback for real URLs (e.g. if we switch back to Cloudinary)
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return response.content


def _build_reference_descriptions(outfit_item: OutfitItem) -> dict[str, str]:
    """Group reference image URLs by category into descriptive strings."""
    grouped: dict[str, list[str]] = {}
    for ref in outfit_item.reference_images:
        cat = ref.category.value
        grouped.setdefault(cat, []).append(ref.url)

    # For now we encode as URL references; in production, these would be
    # passed to Gemini Vision for automatic description extraction.
    return {cat: f"{len(urls)} reference image(s)" for cat, urls in grouped.items()}


def process_outfit_item(outfit_item: OutfitItem, db: Session) -> None:
    """
    Full generation pipeline for one OutfitItem.
    Mutates outfit_item.status and persists results.
    """
    try:
        outfit_item.status = JobStatus.PROCESSING
        db.commit()

        # 1. Download outfit image
        outfit_bytes = _fetch_image_bytes(outfit_item.outfit_image_url)

        # 2. Build structured prompt
        ref_descriptions = _build_reference_descriptions(outfit_item)
        prompt = build_outfit_prompt(
            reference_descriptions=ref_descriptions,
            outfit_description=outfit_item.name,
        )
        outfit_item.prompt_used = prompt
        db.commit()

        # 3. Generate via Imagen 2
        generated_bytes_list = generate_fashion_images(
            prompt=prompt,
            outfit_image_bytes=outfit_bytes,
            count=outfit_item.images_requested,
        )

        # 4. Upload each generated image to Cloudinary and persist record
        for idx, img_bytes in enumerate(generated_bytes_list):
            url = upload_generated_image(
                image_bytes=img_bytes,
                job_id=outfit_item.job_id,
                outfit_id=outfit_item.id,
                img_idx=idx,
            )
            db.add(GeneratedImage(outfit_item_id=outfit_item.id, url=url))

        outfit_item.status = JobStatus.COMPLETED

    except Exception as exc:
        outfit_item.status = JobStatus.FAILED
        outfit_item.error_message = str(exc)

    finally:
        db.commit()
