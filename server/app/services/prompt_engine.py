"""
Prompt Engine — builds structured generation prompts for Vertex AI Imagen 2.

The prompt is split into four blocks:
1. OUTFIT PRESERVATION BLOCK  — strict instructions to never alter the garment.
2. REFERENCE INTERPRETATION BLOCK — creative direction from reference images.
3. NEGATIVE INSTRUCTION BLOCK — what the model must not do.
4. OUTPUT INSTRUCTION BLOCK — format, realism, framing, commercial goal.
"""
from typing import Optional


OUTFIT_LOCK_BLOCK = (
    "OUTFIT PRESERVATION RULE — CRITICAL: "
    "The garment shown in the outfit reference image must remain completely unchanged. "
    "Do NOT alter the design, color scheme, fabric texture, pattern, print, embroidery, stitching, "
    "pleats, seams, lining, collar, neckline, sleeves, cuffs, hemline, buttons, zippers, or any "
    "other structural detail of the outfit. "
    "The outfit must appear exactly as uploaded — same silhouette, same proportions, same details. "
    "Any hallucination, simplification, enhancement, or redesign of the garment is strictly forbidden."
)

NEGATIVE_BLOCK = (
    "NEGATIVE INSTRUCTIONS: "
    "Do not change the outfit color. Do not change the outfit pattern or print. "
    "Do not remove any design element from the outfit. Do not add new design elements. "
    "Do not alter garment proportions. Do not change fabric type. "
    "Do not add extra logos, embellishments, or accessories. "
    "Do not blur or obscure any part of the outfit."
)

OUTPUT_BLOCK = (
    "OUTPUT SPECIFICATION: "
    "Generate a high-resolution, photorealistic fashion editorial photograph. "
    "Aspect ratio 3:4 (portrait). Studio or location shoot quality. "
    "Commercially viable, suitable for e-commerce and campaign usage. "
    "Sharp focus on the outfit with professional color grading."
)


def build_outfit_prompt(
    reference_descriptions: dict[str, str],
    outfit_description: str | None = None,
) -> str:
    """
    Build the full generation prompt.

    Args:
        reference_descriptions: Mapping of category -> description extracted from references.
            Keys: 'model', 'background', 'pose', 'lighting', 'vibe', 'general'.
        outfit_description: Optional textual description of the outfit (from metadata).

    Returns:
        Complete prompt string ready for Imagen 2.
    """
    ref_parts = []
    if reference_descriptions.get("model"):
        ref_parts.append(f"Model: {reference_descriptions['model']}")
    if reference_descriptions.get("pose"):
        ref_parts.append(f"Pose: {reference_descriptions['pose']}")
    if reference_descriptions.get("background"):
        ref_parts.append(f"Background: {reference_descriptions['background']}")
    if reference_descriptions.get("lighting"):
        ref_parts.append(f"Lighting: {reference_descriptions['lighting']}")
    if reference_descriptions.get("vibe"):
        ref_parts.append(f"Overall aesthetic and vibe: {reference_descriptions['vibe']}")
    if reference_descriptions.get("general"):
        ref_parts.append(f"Additional direction: {reference_descriptions['general']}")

    reference_block = (
        "CREATIVE DIRECTION (apply to model/background/pose/lighting only — NOT the outfit): "
        + "; ".join(ref_parts)
        if ref_parts
        else "CREATIVE DIRECTION: fashion editorial style, clean background, professional lighting"
    )

    outfit_block = (
        f"OUTFIT BEING STYLED: {outfit_description}. "
        if outfit_description
        else ""
    )

    return "\n\n".join([
        OUTFIT_LOCK_BLOCK,
        outfit_block + reference_block,
        NEGATIVE_BLOCK,
        OUTPUT_BLOCK,
    ])
