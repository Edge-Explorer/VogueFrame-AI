"""
Google GenAI service — integrates the high-speed Nano Banana engine
(Gemini 2.5 Flash / Imagen 3 family via Google GenAI SDK)
using the GEMINI_API_KEY from Google AI Studio.
"""
import base64
from google import genai
from google.genai import types

from app.core.config import settings

# Initialize GenAI Client using GEMINI_API_KEY
# If GEMINI_API_KEY is not set, it defaults to checking standard environment locations
client = genai.Client(api_key=settings.GEMINI_API_KEY if settings.GEMINI_API_KEY else None)

# We map to the current stable recommended image generation endpoint under the GenAI API
MODEL_ID = "imagen-3.0-generate-001"


def generate_fashion_images(
    prompt: str,
    outfit_image_bytes: bytes,
    count: int = 1,
) -> list[bytes]:
    """
    Call Google GenAI image generation engine using the full structured prompt.
    Returns a list of raw PNG bytes for each generated image.

    Args:
        prompt: Full structured prompt from the prompt engine.
        outfit_image_bytes: Raw bytes of the uploaded outfit image (can be used for multimodal referencing if supported, currently embedded/described via prompt).
        count: Number of images to generate (1-4).
    """
    # Create generation request via google-genai client
    result = client.models.generate_images(
        model=MODEL_ID,
        prompt=prompt,
        config=types.GenerateImagesConfig(
            number_of_images=min(count, 4),
            aspect_ratio="3:4",
            output_mime_type="image/png",
            person_generation="ALLOW_ADULT",
            safety_filter_level="BLOCK_MEDIUM_AND_ABOVE",
        ),
    )

    results: list[bytes] = []
    for generated_image in result.generated_images:
        results.append(generated_image.image.image_bytes)
    return results
