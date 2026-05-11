"""
Cloudinary service — handles upload of outfit images, reference images,
and generated AI outputs to Cloudinary.
"""
import cloudinary
import cloudinary.uploader
from fastapi import UploadFile

from app.core.config import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)


def _upload(file_bytes: bytes, folder: str, public_id: str | None = None) -> str:
    result = cloudinary.uploader.upload(
        file_bytes,
        folder=folder,
        public_id=public_id,
        overwrite=True,
        resource_type="image",
    )
    return result["secure_url"]


async def upload_outfit_image(file: UploadFile, job_id: int, outfit_idx: int) -> str:
    contents = await file.read()
    folder = f"vogueframe/jobs/{job_id}/outfits"
    return _upload(contents, folder, public_id=f"outfit_{outfit_idx}")


async def upload_reference_image(file: UploadFile, job_id: int, ref_idx: int) -> str:
    contents = await file.read()
    folder = f"vogueframe/jobs/{job_id}/references"
    return _upload(contents, folder, public_id=f"ref_{ref_idx}")


def upload_generated_image(image_bytes: bytes, job_id: int, outfit_id: int, img_idx: int) -> str:
    folder = f"vogueframe/jobs/{job_id}/generated"
    return _upload(image_bytes, folder, public_id=f"outfit_{outfit_id}_gen_{img_idx}")
