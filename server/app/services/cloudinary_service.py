"""
Cloudinary service (temporarily overridden) — saves outfit images, reference images,
and generated AI outputs to the local file system instead of Cloudinary.
"""
import os
import aiofiles
from fastapi import UploadFile
import uuid

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../uploads"))


def _ensure_dir(folder: str):
    target = os.path.join(UPLOAD_DIR, folder)
    os.makedirs(target, exist_ok=True)
    return target


async def upload_outfit_image(file: UploadFile, job_id: int, outfit_idx: int) -> str:
    folder = f"jobs/{job_id}/outfits"
    target_dir = _ensure_dir(folder)
    
    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "jpg"
    filename = f"outfit_{outfit_idx}_{uuid.uuid4().hex[:6]}.{ext}"
    filepath = os.path.join(target_dir, filename)
    
    async with aiofiles.open(filepath, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
        
    return f"http://localhost:8000/uploads/{folder}/{filename}"


async def upload_reference_image(file: UploadFile, job_id: int, ref_idx: int) -> str:
    folder = f"jobs/{job_id}/references"
    target_dir = _ensure_dir(folder)
    
    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "jpg"
    filename = f"ref_{ref_idx}_{uuid.uuid4().hex[:6]}.{ext}"
    filepath = os.path.join(target_dir, filename)
    
    async with aiofiles.open(filepath, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
        
    return f"http://localhost:8000/uploads/{folder}/{filename}"


def upload_generated_image(image_bytes: bytes, job_id: int, outfit_id: int, img_idx: int) -> str:
    folder = f"jobs/{job_id}/generated"
    target_dir = _ensure_dir(folder)
    
    filename = f"outfit_{outfit_id}_gen_{img_idx}_{uuid.uuid4().hex[:6]}.png"
    filepath = os.path.join(target_dir, filename)
    
    with open(filepath, 'wb') as out_file:
        out_file.write(image_bytes)
        
    return f"http://localhost:8000/uploads/{folder}/{filename}"
