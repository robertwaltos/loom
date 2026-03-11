"""
Character T2I Service — HTTP API

Wraps the Fal.ai adapter as a FastAPI microservice.
The Shuttle fabric calls this over HTTP to generate
character portraits for NPCs.

Endpoints:
  POST /generate          — Generate character portrait(s)
  GET  /health            — Health check
  GET  /presets            — List available style presets

Thread: shuttle/character-t2i
Tier: 2
"""

from __future__ import annotations

import os
import sys
from contextlib import asynccontextmanager
from typing import Any

import structlog
import uvicorn
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

from character_prompt_builder import (
    STYLE_PRESETS,
    AttireDescription,
    CharacterAppearance,
    FacialFeatures,
    HairDescription,
)
from fal_ai_adapter import (
    FalAiAdapter,
    FalAiConfig,
    FalAiGenerationError,
    ModerationStatus,
)

logger = structlog.get_logger(__name__)

# ── Pydantic Request/Response Models ─────────────────────────────


class HairModel(BaseModel):
    color: str = "dark brown"
    style: str = "cropped"
    length: str = "short"
    facial_hair: str | None = None


class FacialFeaturesModel(BaseModel):
    eyes: str = "dark eyes"
    nose: str = "straight nose"
    jaw: str = "strong jaw"
    expression_tendency: str = "neutral expression"


class AttireModel(BaseModel):
    primary_garment: str = "roughspun tunic"
    accessories: list[str] = Field(default_factory=list)
    color_palette: str = "earth tones"
    condition: str = "worn"


class AppearanceModel(BaseModel):
    entity_id: str
    display_name: str
    apparent_sex: str = "masculine"
    age_range: str = "young-adult"
    body_build: str = "average"
    skin_tone: str = "warm bronze"
    hair: HairModel = Field(default_factory=HairModel)
    facial_features: FacialFeaturesModel = Field(
        default_factory=FacialFeaturesModel
    )
    distinguishing_marks: list[str] = Field(default_factory=list)
    attire: AttireModel = Field(default_factory=AttireModel)
    archetype: str = "commoner"
    cultural_style: str = "medieval european"
    visual_mood: str = "neutral"


class GenerateRequest(BaseModel):
    appearance: AppearanceModel
    model: str = "fal-ai/flux-pro/v1.1"
    image_size: str = "portrait_4_3"
    style_preset: str = "fantasy_portrait"
    num_images: int = Field(default=1, ge=1, le=4)
    seed: int | None = None
    guidance_scale: float = Field(default=3.5, ge=1.0, le=20.0)
    num_inference_steps: int = Field(default=28, ge=1, le=50)
    negative_prompt: str | None = None
    npc_tier: int = Field(default=3, ge=1, le=4)
    correlation_id: str | None = None


class ImageResultModel(BaseModel):
    entity_id: str
    content_hash: str
    image_url: str
    width: int
    height: int
    resolved_prompt: str
    seed: int
    latency_ms: int
    nsfw_score: float
    moderation_status: str
    correlation_id: str
    fal_request_id: str


class GenerateResponse(BaseModel):
    images: list[ImageResultModel]
    total_latency_ms: int


class HealthResponse(BaseModel):
    status: str
    fal_ai_reachable: bool


class PresetsResponse(BaseModel):
    presets: dict[str, str]


# ── Application ──────────────────────────────────────────────────

adapter: FalAiAdapter | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global adapter
    api_key = os.environ.get("FAL_AI_API_KEY", "")
    if not api_key:
        logger.warning("fal_ai_no_api_key",
                       msg="FAL_AI_API_KEY not set — service will fail on generate calls")

    adapter = FalAiAdapter(FalAiConfig(
        api_key=api_key,
        max_concurrent_requests=int(
            os.environ.get("FAL_AI_MAX_CONCURRENT", "10")
        ),
        nsfw_threshold=float(
            os.environ.get("FAL_AI_NSFW_THRESHOLD", "0.5")
        ),
    ))
    logger.info("character_t2i_service_started")
    yield
    await adapter.close()
    logger.info("character_t2i_service_stopped")


app = FastAPI(
    title="Loom Character T2I Service",
    description="Generates character portraits via Fal.ai FLUX models",
    version="0.1.0",
    lifespan=lifespan,
)


# ── Endpoints ────────────────────────────────────────────────────


@app.post("/generate", response_model=GenerateResponse)
async def generate_portrait(request: GenerateRequest) -> GenerateResponse:
    """Generate character portrait(s) from structured appearance data."""
    if adapter is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service not initialized",
        )

    # Convert Pydantic models to domain dataclasses
    appearance = _to_domain(request.appearance)

    try:
        results = await adapter.generate(
            appearance,
            model=request.model,
            image_size=request.image_size,
            style_preset=request.style_preset,
            num_images=request.num_images,
            seed=request.seed,
            guidance_scale=request.guidance_scale,
            num_inference_steps=request.num_inference_steps,
            negative_prompt=request.negative_prompt,
            npc_tier=request.npc_tier,
            correlation_id=request.correlation_id,
        )
    except FalAiGenerationError as exc:
        logger.error("character_t2i_generation_failed",
                     error=str(exc), request_id=exc.request_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Fal.ai generation failed: {exc}",
        ) from exc

    total_latency = max((r.latency_ms for r in results), default=0)

    return GenerateResponse(
        images=[
            ImageResultModel(
                entity_id=r.entity_id,
                content_hash=r.content_hash,
                image_url=r.image_url,
                width=r.width,
                height=r.height,
                resolved_prompt=r.resolved_prompt,
                seed=r.seed,
                latency_ms=r.latency_ms,
                nsfw_score=r.nsfw_score,
                moderation_status=r.moderation_status.value,
                correlation_id=r.correlation_id,
                fal_request_id=r.fal_request_id,
            )
            for r in results
            if r.moderation_status != ModerationStatus.REJECTED
        ],
        total_latency_ms=total_latency,
    )


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Check service and Fal.ai API health."""
    fal_ok = False
    if adapter is not None:
        fal_ok = await adapter.health_check()

    return HealthResponse(
        status="ok" if fal_ok else "degraded",
        fal_ai_reachable=fal_ok,
    )


@app.get("/presets", response_model=PresetsResponse)
async def list_presets() -> PresetsResponse:
    """Return available style presets and their prompt templates."""
    return PresetsResponse(presets=STYLE_PRESETS)


# ── Helpers ──────────────────────────────────────────────────────


def _to_domain(model: AppearanceModel) -> CharacterAppearance:
    """Convert Pydantic request model to domain dataclass."""
    return CharacterAppearance(
        entity_id=model.entity_id,
        display_name=model.display_name,
        apparent_sex=model.apparent_sex,
        age_range=model.age_range,
        body_build=model.body_build,
        skin_tone=model.skin_tone,
        hair=HairDescription(
            color=model.hair.color,
            style=model.hair.style,
            length=model.hair.length,
            facial_hair=model.hair.facial_hair,
        ),
        facial_features=FacialFeatures(
            eyes=model.facial_features.eyes,
            nose=model.facial_features.nose,
            jaw=model.facial_features.jaw,
            expression_tendency=model.facial_features.expression_tendency,
        ),
        distinguishing_marks=tuple(model.distinguishing_marks),
        attire=AttireDescription(
            primary_garment=model.attire.primary_garment,
            accessories=tuple(model.attire.accessories),
            color_palette=model.attire.color_palette,
            condition=model.attire.condition,
        ),
        archetype=model.archetype,
        cultural_style=model.cultural_style,
        visual_mood=model.visual_mood,
    )


# ── Entrypoint ───────────────────────────────────────────────────


def main() -> None:
    """Run the service."""
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8100"))
    uvicorn.run(
        "character_t2i_service:app",
        host=host,
        port=port,
        log_level="info",
        reload=False,
    )


if __name__ == "__main__":
    main()
