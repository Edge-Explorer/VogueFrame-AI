"""
Pydantic schemas for generation jobs and outfit items.
"""
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional
from app.models.job import JobStatus, ReferenceCategory


# ── Reference Image ───────────────────────────────────────────────────────────

class ReferenceImageOut(BaseModel):
    id: int
    url: str
    category: ReferenceCategory
    model_config = {"from_attributes": True}


# ── Generated Image ───────────────────────────────────────────────────────────

class GeneratedImageOut(BaseModel):
    id: int
    url: str
    consistency_score: Optional[int] = None
    model_config = {"from_attributes": True}


# ── Outfit Item ───────────────────────────────────────────────────────────────

class OutfitItemOut(BaseModel):
    id: int
    name: Optional[str]
    outfit_image_url: str
    status: JobStatus
    prompt_used: Optional[str]
    images_requested: int
    error_message: Optional[str]
    created_at: Optional[datetime] = None
    reference_images: List[ReferenceImageOut] = []
    generated_images: List[GeneratedImageOut] = []
    model_config = {"from_attributes": True}



# ── Generation Job ────────────────────────────────────────────────────────────

class JobCreateResponse(BaseModel):
    job_id: int
    status: JobStatus
    message: str


class JobSummaryOut(BaseModel):
    id: int
    status: JobStatus
    total_outfits: int
    completed_outfits: int
    failed_outfits: int
    created_at: datetime
    error_message: Optional[str] = None
    model_config = {"from_attributes": True}


class JobStatusOut(BaseModel):
    id: int
    status: JobStatus
    total_outfits: int
    completed_outfits: int
    failed_outfits: int
    created_at: datetime
    error_message: Optional[str]
    outfits: List[OutfitItemOut] = []
    model_config = {"from_attributes": True}


# ── Regeneration ──────────────────────────────────────────────────────────────

class RegenerateRequest(BaseModel):
    outfit_item_id: int
    images_count: int = 1
