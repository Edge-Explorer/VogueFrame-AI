"""
Google GenAI image generation service.

Uses the confirmed-available image generation models from this API key:
  - gemini-2.5-flash-image (primary)
  - gemini-3.1-flash-image-preview (fallback)
  - nano-banana-pro-preview (final fallback)

These are confirmed via ListModels and support generateContent with IMAGE modality.
"""
import time
from google import genai
from google.genai import types

from app.core.config import settings

# Initialize GenAI Client using GEMINI_API_KEY from AI Studio
client = genai.Client(api_key=settings.GEMINI_API_KEY)

# Confirmed image-capable models from this API key (ordered by preference)
IMAGE_MODELS = [
    "gemini-2.5-flash-image",
    "gemini-3.1-flash-image-preview",
    "nano-banana-pro-preview",
    "gemini-3-pro-image-preview",
]

MAX_RETRIES = 2
RETRY_DELAY_SECONDS = 3


def generate_fashion_images(
    prompt: str,
    outfit_image_bytes: bytes,
    count: int = 1,
    reference_images_bytes: list[bytes] | None = None,
) -> list[bytes]:
    """
    Generate fashion images using Gemini image generation models.

    Returns a list of raw image bytes for each generated image.
    Tries models in order, retrying on transient errors.

    Args:
        prompt: Full structured prompt from the prompt engine.
        outfit_image_bytes: Raw bytes of the source outfit image.
        count: Number of images to generate (1-4).
        reference_images_bytes: Optional raw bytes of reference images (background, lighting, etc).

    Raises:
        RuntimeError: On permanent failure across all models.
    """
    last_error: Exception | None = None

    for model_id in IMAGE_MODELS:
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                print(f"[Imagen] Trying model={model_id}, attempt={attempt} for batch of {count} image(s)")
                
                # Pass the source outfit image as inline data so the model can visually preserve/replicate it exactly
                contents = [
                    types.Part.from_bytes(data=outfit_image_bytes, mime_type="image/png"),
                    "CRITICAL VISUAL INPUT (Image 1): The uploaded image depicts the exact clothing item. "
                    "You MUST generate an image of a model wearing this exact garment. The cut, color, texture, material, "
                    "zippers, buttons, stitching, collar, and overall silhouette must be 100% IDENTICAL to the visual features "
                    "seen in the clothing reference image."
                ]

                if reference_images_bytes:
                    for i, ref_bytes in enumerate(reference_images_bytes):
                        contents.append(types.Part.from_bytes(data=ref_bytes, mime_type="image/png"))
                        contents.append(
                            f"REFERENCE IMAGE {i+2} (Background & Atmosphere): You MUST place the model directly inside this exact environment/setting. "
                            "CRITICAL QUALITY INSTRUCTION: Ensure seamless, hyper-realistic compositing. The model must NOT look pasted or edited in. "
                            "Accurately simulate ambient light bounce from the background onto the model's skin and clothing. "
                            "Match the exact color grading, cinematic atmosphere, black levels, and depth of field of this reference image. "
                            "Render realistic contact shadows on the ground and soft rim lighting from the scene's light sources."
                        )

                contents.append("\n\nFINAL INSTRUCTIONS: " + prompt)

                image_bytes_list: list[bytes] = []
                for img_idx in range(count):
                    print(f"[Imagen] Generating image {img_idx + 1} of {count}...")
                    result = client.models.generate_content(
                        model=model_id,
                        contents=contents,
                        config=types.GenerateContentConfig(
                            response_modalities=["TEXT", "IMAGE"],
                            temperature=0.7 + (img_idx * 0.05),  # vary temperature slightly for distinct creative output shots
                        ),
                    )

                    if result.candidates:
                        for part in result.candidates[0].content.parts:
                            if part.inline_data is not None and part.inline_data.data:
                                image_bytes_list.append(part.inline_data.data)
                                break

                if not image_bytes_list:
                    raise RuntimeError(
                        "API returned 0 images — prompt may be safety-filtered or model "
                        "does not support image output modality with this configuration."
                    )

                print(f"[Imagen] ✅ Success with {model_id}: {len(image_bytes_list)} image(s) generated.")
                return image_bytes_list

            except RuntimeError:
                raise  # Don't retry safety filter errors

            except Exception as exc:
                last_error = exc
                err_str = str(exc)

                # Model doesn't exist or isn't accessible — skip immediately
                if any(code in err_str for code in ("404", "NOT_FOUND")):
                    print(f"[Imagen] ⚠ Model {model_id} returned 404. Skipping to next model.")
                    break  # inner retry loop → try next model

                # Transient error — retry with backoff
                if attempt < MAX_RETRIES and any(
                    code in err_str for code in ("503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED")
                ):
                    wait = RETRY_DELAY_SECONDS * attempt
                    print(f"[Imagen] ⚠ Transient error on attempt {attempt}: {err_str[:100]}. Retrying in {wait}s…")
                    time.sleep(wait)
                    continue

                # Permanent failure on this model
                print(f"[Imagen] ✗ Model {model_id} failed: {err_str[:150]}")
                break  # try next model

    raise RuntimeError(
        f"Image generation failed across all {len(IMAGE_MODELS)} models. "
        f"Last error: {last_error}"
    )
