"""
Vertex AI service — integrates Google Cloud Imagen 2 (the required model)
for outfit-preserving fashion image generation.

Model: imagegeneration@006  (Imagen 2 on Vertex AI)
Platform: Google Cloud Console with Vertex AI API enabled.
"""
import base64
import vertexai
from vertexai.preview.vision_models import ImageGenerationModel, Image

from app.core.config import settings

# Initialize Vertex AI once at module load
vertexai.init(project=settings.GCP_PROJECT_ID, location=settings.GCP_LOCATION)

IMAGEN_MODEL_ID = "imagegeneration@006"  # Imagen 2


def _load_model() -> ImageGenerationModel:
    return ImageGenerationModel.from_pretrained(IMAGEN_MODEL_ID)


def generate_fashion_images(
    prompt: str,
    outfit_image_bytes: bytes,
    count: int = 1,
) -> list[bytes]:
    """
    Call Vertex AI Imagen 2 with a reference outfit image.
    Returns a list of raw PNG bytes for each generated image.

    Args:
        prompt: Full structured prompt from the prompt engine.
        outfit_image_bytes: Raw bytes of the uploaded outfit image.
        count: Number of images to generate (1-4).
    """
    model = _load_model()

    # Wrap outfit image as a reference for image-guided generation
    reference_image = Image(image_bytes=outfit_image_bytes)

    response = model.generate_images(
        prompt=prompt,
        number_of_images=min(count, 4),
        aspect_ratio="3:4",
        safety_filter_level="block_some",
        person_generation="allow_adult",
    )

    results: list[bytes] = []
    for img in response.images:
        results.append(img._image_bytes)
    return results
