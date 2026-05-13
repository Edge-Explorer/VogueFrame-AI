"""
Cloudinary service — seamlessly saves outfit images, reference images,
and generated AI outputs to a production Cloudinary bucket.
"""
import asyncio
import uuid
from fastapi import UploadFile

import cloudinary
import cloudinary.uploader
from app.core.config import settings

# Initialize Cloudinary using settings from .env
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True
)

async def upload_outfit_image(file: UploadFile, job_id: int, outfit_idx: int) -> str:
    content = await file.read()
    
    def _upload():
        resp = cloudinary.uploader.upload(
            content,
            folder=f"vogueframe/jobs/{job_id}/outfits",
            public_id=f"outfit_{outfit_idx}_{uuid.uuid4().hex[:6]}"
        )
        return resp["secure_url"]

    return await asyncio.to_thread(_upload)


async def upload_reference_image(file: UploadFile, job_id: int, ref_idx: int) -> str:
    content = await file.read()
    
    def _upload():
        resp = cloudinary.uploader.upload(
            content,
            folder=f"vogueframe/jobs/{job_id}/references",
            public_id=f"ref_{ref_idx}_{uuid.uuid4().hex[:6]}"
        )
        return resp["secure_url"]

    return await asyncio.to_thread(_upload)


def upload_generated_image(image_bytes: bytes, job_id: int, outfit_id: int, img_idx: int) -> str:
    resp = cloudinary.uploader.upload(
        image_bytes,
        folder=f"vogueframe/jobs/{job_id}/generated",
        public_id=f"outfit_{outfit_id}_gen_{img_idx}_{uuid.uuid4().hex[:6]}"
    )
    return resp["secure_url"]
