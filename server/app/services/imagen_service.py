"""
Google GenAI service — integrates the Imagen 3 engine (Gemini AI Studio API).
Uses GEMINI_API_KEY from Google AI Studio.
"""
import time
import base64
from google import genai
from google.genai import types

from app.core.config import settings

# Initialize GenAI Client
client = genai.Client(api_key=settings.GEMINI_API_KEY if settings.GEMINI_API_KEY else None)

# Imagen 3 — stable, broadly available via AI Studio
MODEL_ID = "imagen-3.0-generate-002"

MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 5


def generate_fashion_images(
    prompt: str,
    outfit_image_bytes: bytes,
    count: int = 1,
) -> list[bytes]:
    """
    Call Google GenAI Imagen 3 image generation engine.
    Returns a list of raw PNG bytes for each generated image.
    Retries up to MAX_RETRIES times on transient 503 errors.

    Args:
        prompt: Full structured prompt from the prompt engine.
        outfit_image_bytes: Raw bytes of the uploaded outfit image.
        count: Number of images to generate (1-4).
    
    Raises:
        RuntimeError: On permanent API failure after all retries exhausted.
    """
    last_error: Exception | None = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            result = client.models.generate_images(
                model=MODEL_ID,
                prompt=prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=min(count, 4),
                    aspect_ratio="3:4",
                    output_mime_type="image/png",
                    person_generation="ALLOW_ADULT",
                    safety_filter_level="BLOCK_LOW_AND_ABOVE",
                ),
            )

            results: list[bytes] = []
            for generated_image in result.generated_images:
                results.append(generated_image.image.image_bytes)

            if not results:
                raise RuntimeError("Imagen API returned 0 images. The prompt may have been filtered.")

            return results

        except Exception as exc:
            last_error = exc
            err_str = str(exc)
            # Only retry on transient errors (503, UNAVAILABLE, rate limit)
            if attempt < MAX_RETRIES and any(
                code in err_str for code in ("503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED")
            ):
                wait = RETRY_DELAY_SECONDS * attempt
                print(f"[Imagen] Attempt {attempt} failed ({err_str[:120]}). Retrying in {wait}s…")
                time.sleep(wait)
                continue
            break

    raise RuntimeError(f"Image generation failed after {MAX_RETRIES} attempts: {last_error}")
