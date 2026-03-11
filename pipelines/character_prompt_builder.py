"""
Character T2I Prompt Builder

Converts structured CharacterAppearance data into optimized
text prompts for Fal.ai FLUX models.

Architecture:
  CharacterAppearance (structured) → prompt_builder → text prompt
  The prompt builder encodes appearance semantics into
  T2I-optimal language: emphasizes distinctive features,
  applies style presets, and structures for FLUX attention.

Thread: shuttle/character-t2i
Tier: 2
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field


@dataclass(frozen=True)
class HairDescription:
    color: str
    style: str
    length: str  # short | medium | long | bald
    facial_hair: str | None = None


@dataclass(frozen=True)
class FacialFeatures:
    eyes: str
    nose: str
    jaw: str
    expression_tendency: str


@dataclass(frozen=True)
class AttireDescription:
    primary_garment: str
    accessories: tuple[str, ...] = ()
    color_palette: str = "earth tones"
    condition: str = "worn"  # pristine | well-kept | worn | battle-worn | tattered


@dataclass(frozen=True)
class CharacterAppearance:
    entity_id: str
    display_name: str
    apparent_sex: str  # masculine | feminine | androgynous
    age_range: str  # child | adolescent | young-adult | middle-aged | elder | ancient
    body_build: str  # slight | lean | average | athletic | stocky | heavy | towering
    skin_tone: str
    hair: HairDescription
    facial_features: FacialFeatures
    distinguishing_marks: tuple[str, ...] = ()
    attire: AttireDescription = field(default_factory=lambda: AttireDescription(
        primary_garment="roughspun tunic"))
    archetype: str = "commoner"
    cultural_style: str = "medieval european"
    visual_mood: str = "neutral"


# ── Style Presets ────────────────────────────────────────────────

STYLE_PRESETS: dict[str, str] = {
    "fantasy_portrait": (
        "high fantasy character portrait, detailed face, "
        "dramatic lighting, painterly style, rich colors, "
        "fine art quality, 4K, masterpiece"
    ),
    "concept_art": (
        "character concept art, full body, neutral pose, "
        "clean lines, professional illustration, "
        "reference sheet style, white background"
    ),
    "cinematic": (
        "cinematic character portrait, volumetric lighting, "
        "depth of field, film grain, dramatic atmosphere, "
        "photorealistic rendering, unreal engine 5"
    ),
    "painterly": (
        "oil painting character portrait, impasto technique, "
        "warm palette, museum quality, classical portraiture, "
        "Rembrandt lighting"
    ),
    "game_icon": (
        "game character portrait icon, stylized, "
        "clean edges, vibrant colors, square crop, "
        "character select screen style"
    ),
}

# ── Negative Prompt Defaults ────────────────────────────────────

DEFAULT_NEGATIVE_PROMPT = (
    "deformed, disfigured, bad anatomy, extra limbs, "
    "blurry, low quality, watermark, text, signature, "
    "extra fingers, mutated hands, poorly drawn face, "
    "duplicate, morbid, out of frame, cropped"
)

# ── Age Descriptors ─────────────────────────────────────────────

AGE_DESCRIPTORS: dict[str, str] = {
    "child": "young child, approximately 8-12 years old",
    "adolescent": "teenager, approximately 14-17 years old",
    "young-adult": "young adult in their twenties",
    "middle-aged": "middle-aged, in their forties with subtle lines",
    "elder": "elderly, weathered face with deep wrinkles, silver hair",
    "ancient": "ancient, deeply lined face, wise eyes, venerable",
}

# ── Build Descriptors ───────────────────────────────────────────

BUILD_DESCRIPTORS: dict[str, str] = {
    "slight": "slight, delicate build",
    "lean": "lean, wiry build",
    "average": "average build",
    "athletic": "athletic, muscular build",
    "stocky": "stocky, broad-shouldered build",
    "heavy": "heavy, imposing build",
    "towering": "towering, massive frame",
}


def build_prompt(
    appearance: CharacterAppearance,
    style_preset: str = "fantasy_portrait",
) -> str:
    """
    Convert structured CharacterAppearance into an optimized T2I prompt.

    Prompt structure (FLUX-optimized):
      1. Style/quality prefix
      2. Subject (age, sex, build)
      3. Face and expression
      4. Hair
      5. Attire and accessories
      6. Distinguishing marks
      7. Mood and atmosphere
      8. Cultural context
    """
    parts: list[str] = []

    # 1. Style prefix
    style = STYLE_PRESETS.get(style_preset, style_preset)
    parts.append(style)

    # 2. Subject description
    age_desc = AGE_DESCRIPTORS.get(appearance.age_range, appearance.age_range)
    build_desc = BUILD_DESCRIPTORS.get(appearance.body_build, appearance.body_build)
    sex_desc = _sex_descriptor(appearance.apparent_sex)
    parts.append(f"{sex_desc}, {age_desc}, {build_desc}")

    # 3. Skin tone
    parts.append(f"{appearance.skin_tone} skin")

    # 4. Face and expression
    ff = appearance.facial_features
    parts.append(
        f"{ff.eyes}, {ff.nose}, {ff.jaw}, "
        f"{ff.expression_tendency}"
    )

    # 5. Hair
    hair = appearance.hair
    if hair.length == "bald":
        parts.append("bald head, clean-shaven scalp")
    else:
        parts.append(f"{hair.color} {hair.length} {hair.style} hair")
    if hair.facial_hair:
        parts.append(hair.facial_hair)

    # 6. Attire
    attire = appearance.attire
    condition_map = {
        "pristine": "pristine, immaculate",
        "well-kept": "well-maintained",
        "worn": "worn, lived-in",
        "battle-worn": "battle-damaged, scarred",
        "tattered": "tattered, ragged",
    }
    condition_desc = condition_map.get(attire.condition, attire.condition)
    parts.append(
        f"wearing {condition_desc} {attire.primary_garment} "
        f"in {attire.color_palette}"
    )
    if attire.accessories:
        parts.append(", ".join(attire.accessories))

    # 7. Distinguishing marks
    if appearance.distinguishing_marks:
        parts.append(", ".join(appearance.distinguishing_marks))

    # 8. Mood and cultural context
    parts.append(f"{appearance.visual_mood} mood")
    parts.append(f"{appearance.cultural_style} inspired setting")

    # 9. Archetype flavor (subtle — guides composition)
    archetype_hints = _archetype_flavor(appearance.archetype)
    if archetype_hints:
        parts.append(archetype_hints)

    return ", ".join(parts)


def build_negative_prompt(custom: str | None = None) -> str:
    """Build the negative prompt, merging custom additions."""
    if not custom:
        return DEFAULT_NEGATIVE_PROMPT
    return f"{DEFAULT_NEGATIVE_PROMPT}, {custom}"


def content_hash(image_bytes: bytes) -> str:
    """Compute content-addressed SHA-256 hash for an image."""
    return hashlib.sha256(image_bytes).hexdigest()


def _sex_descriptor(apparent_sex: str) -> str:
    match apparent_sex:
        case "masculine":
            return "male character"
        case "feminine":
            return "female character"
        case "androgynous":
            return "androgynous character"
        case _:
            return "character"


def _archetype_flavor(archetype: str) -> str:
    """Map archetypes to subtle compositional hints."""
    flavors: dict[str, str] = {
        "warrior": "battle-ready stance, weapon visible",
        "merchant": "surrounded by wares, shrewd expression",
        "mystic": "ethereal glow, mystical symbols",
        "scholar": "books and scrolls nearby, intellectual bearing",
        "priest": "religious iconography, serene presence",
        "farmer": "agricultural setting, practical bearing",
        "recluse": "isolated setting, wary expression",
        "diplomat": "regal bearing, diplomatic attire",
        "guard": "vigilant stance, armored",
        "adventurer": "travel gear, weathered appearance",
        "blacksmith": "forge environment, soot-stained",
        "healer": "herbs and remedies, compassionate expression",
        "thief": "shadowy, hooded, alert eyes",
        "noble": "aristocratic bearing, fine jewelry",
        "bard": "musical instrument, expressive gestures",
    }
    return flavors.get(archetype, "")
