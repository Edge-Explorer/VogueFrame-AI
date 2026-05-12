"""
Google GenAI image generation service.

Uses Gemini 2.0 Flash image generation (gemini-2.0-flash-preview-image-generation)
which is available on all standard Gemini API keys — unlike Imagen which requires
special allowlist access.

Falls back to gemini-2.0-flash-exp if the preview model is unavailable.
"""
import time
import base64
from google import genai
from google.genai import types

from app.core.config import settings

# Initialize GenAI Client using GEMINI_API_KEY from AI Studio
client = genai.Client(api_key=settings.GEMINI_API_KEY)

# Gemini 2.0 Flash with native image generation — works on all standard API keys
PRIMARY_MODEL = "gemini-2.0-flash-preview-image-generation"
FALLBACK_MODEL = "gemini-2.0-flash-exp"

MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 4


def generate_fashion_images(
    prompt: str,
    outfit_image_bytes: bytes,
    count: int = 1,
) -> list[bytes]:
    """
    Generate fashion images using Gemini 2.0 Flash image generation.
    
    Returns a list of raw PNG bytes for each generated image.
    Retries on transient 503 / 429 errors up to MAX_RETRIES times.

    Args:
        prompt: Full structured prompt from the prompt engine.
        outfit_image_bytes: Raw bytes of the source outfit image.
        count: Number of images to generate (1-4).

    Raises:
        RuntimeError: On permanent API failure after all retries exhausted.
    """
    models_to_try = [PRIMARY_MODEL, FALLBACK_MODEL]
    last_error: Exception | None = None

    for model_id in models_to_try:
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                print(f"[Imagen] Attempting generation with model={model_id}, attempt={attempt}")

                result = client.models.generate_content(
                    model=model_id,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_modalities=["TEXT", "IMAGE"],
                        temperature=1.0,
                    ),
                )

                image_bytes_list: list[bytes] = []
                for part in result.candidates[0].content.parts:
                    if part.inline_data is not None and part.inline_data.data:
                        image_bytes_list.append(part.inline_data.data)
                        if len(image_bytes_list) >= count:
                            break

                if not image_bytes_list:
                    raise RuntimeError(
                        "API returned 0 images. The prompt may have been safety-filtered. "
                        "Try a more descriptive, clothing-focused prompt."
                    )

                print(f"[Imagen] Success: generated {len(image_bytes_list)} image(s) with {model_id}.")
                return image_bytes_list

            except RuntimeError:
                raise  # safety filter — don't retry

            except Exception as exc:
                last_error = exc
                err_str = str(exc)

                # Check if this model doesn't exist — skip to fallback immediately
                if any(code in err_str for code in ("404", "NOT_FOUND")):
                    print(f"[Imagen] Model {model_id} not available (404). Trying fallback…")
                    break  # break inner retry loop → try next model

                # Retry on transient errors
                if attempt < MAX_RETRIES and any(
                    code in err_str for code in ("503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED")
                ):
                    wait = RETRY_DELAY_SECONDS * attempt
                    print(f"[Imagen] Attempt {attempt} failed ({err_str[:100]}). Retrying in {wait}s…")
                    time.sleep(wait)
                    continue

                # Permanent error on this model
                print(f"[Imagen] Model {model_id} failed permanently: {err_str[:200]}")
                break  # try fallback model

    raise RuntimeError(
        f"Image generation failed with all models after {MAX_RETRIES} attempts per model. "
        f"Last error: {last_error}"
    )
