from sqlalchemy import Column, String, Integer, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
import enum

from app.models.base import Base


class JobStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class GenerationJob(Base):
    """
    Represents one batch generation request.
    One job contains multiple outfit items.
    """
    __tablename__ = "generation_jobs"

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    status = Column(Enum(JobStatus), default=JobStatus.PENDING, nullable=False)
    total_outfits = Column(Integer, default=0)
    completed_outfits = Column(Integer, default=0)
    failed_outfits = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)

    user = relationship("User", backref="jobs")
    outfits = relationship("OutfitItem", back_populates="job", cascade="all, delete-orphan")


class OutfitItem(Base):
    """
    Represents a single outfit processed within a GenerationJob.
    """
    __tablename__ = "outfit_items"

    job_id = Column(Integer, ForeignKey("generation_jobs.id"), nullable=False, index=True)
    name = Column(String(255), nullable=True)                  # optional SKU / label
    outfit_image_url = Column(String(1024), nullable=False)    # Cloudinary URL
    status = Column(Enum(JobStatus), default=JobStatus.PENDING, nullable=False)
    prompt_used = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    images_requested = Column(Integer, default=1)

    job = relationship("GenerationJob", back_populates="outfits")
    generated_images = relationship(
        "GeneratedImage", back_populates="outfit_item", cascade="all, delete-orphan"
    )
    reference_images = relationship(
        "ReferenceImage", back_populates="outfit_item", cascade="all, delete-orphan"
    )


class ReferenceCategory(str, enum.Enum):
    MODEL = "model"
    BACKGROUND = "background"
    POSE = "pose"
    LIGHTING = "lighting"
    VIBE = "vibe"
    GENERAL = "general"


class ReferenceImage(Base):
    """Reference image associated with an outfit item."""
    __tablename__ = "reference_images"

    outfit_item_id = Column(Integer, ForeignKey("outfit_items.id"), nullable=False, index=True)
    url = Column(String(1024), nullable=False)
    category = Column(Enum(ReferenceCategory), default=ReferenceCategory.GENERAL)

    outfit_item = relationship("OutfitItem", back_populates="reference_images")


class GeneratedImage(Base):
    """A single AI-generated image output for an outfit item."""
    __tablename__ = "generated_images"

    outfit_item_id = Column(Integer, ForeignKey("outfit_items.id"), nullable=False, index=True)
    url = Column(String(1024), nullable=False)       # Cloudinary URL of generated output
    consistency_score = Column(Integer, nullable=True)  # optional reviewer score 0-100

    outfit_item = relationship("OutfitItem", back_populates="generated_images")
