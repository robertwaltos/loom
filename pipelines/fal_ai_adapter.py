"""
Fal.ai T2I Adapter — Infrastructure Layer

Calls the Fal.ai API (fal-ai/flux-pro) to generate character portraits.
This is a port adapter — business logic never imports this directly.

Architecture (Hexagonal):
  Port:    CharacterImagePort (abstract interface)
  Adapter: FalAiAdapter (this file — implements the port)

Wire protocol:
  1. Build prompt from CharacterAppearance (via prompt_builder)
  2. Submit to Fal.ai queue endpoint
  3. Poll for completion
  4. Download image, compute content hash
  5. Return CharacterImageResult

Thread: shuttle/character-t2i
Tier: 2
"""

from __future__ import annotations

import asyncio
import hashlib
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Protocol

import httpx
import structlog

from character_prompt_builder import (
    CharacterAppearance,
    build_negative_prompt,
    build_prompt,
)

logger = structlog.get_logger(__name__)

# ── Port Interface ───────────────────────────────────────────────


class CharacterImagePort(Protocol):
    """Port that any T2I adapter must implement."""

    async def generate(
        self,
        appearance: CharacterAppearance,
        *,
        model: str = "fal-ai/flux-pro/v1.1",
        image_size: str = "portrait_4_3",
        style_preset: str = "fantasy_portrait",
        num_images: int = 1,
        seed: int | None = None,
        guidance_scale: float = 3.5,
        num_inference_steps: int = 28,
        negative_prompt: str | None = None,
        npc_tier: int = 3,
        correlation_id: str | None = None,
    ) -> list[CharacterImageResult]: ...

    async def health_check(self) -> bool: ...


# ── Result Types ─────────────────────────────────────────────────


class ModerationStatus(str, Enum):
    APPROVED = "approved"
    FLAGGED = "flagged"
    REJECTED = "rejected"


@dataclass(frozen=True)
class CharacterImageResult:
    entity_id: str
    content_hash: str
    image_url: str
    width: int
    height: int
    resolved_prompt: str
    seed: int
    latency_ms: int
    nsfw_score: float
    moderation_status: ModerationStatus
    correlation_id: str
    fal_request_id: str
    image_bytes: bytes = field(repr=False)


# ── Image Size Mapping ───────────────────────────────────────────

FAL_IMAGE_SIZES: dict[str, dict[str, int]] = {
    "portrait_4_3": {"width": 768, "height": 1024},
    "portrait_3_4": {"width": 1024, "height": 768},
    "square_hd": {"width": 1024, "height": 1024},
    "square": {"width": 512, "height": 512},
}

# ── Tier-Based Quality Limits ────────────────────────────────────

TIER_QUALITY: dict[int, dict[str, object]] = {
    1: {"model": "fal-ai/flux/dev", "steps": 20, "size": "square"},
    2: {"model": "fal-ai/flux/dev", "steps": 25, "size": "portrait_4_3"},
    3: {"model": "fal-ai/flux-pro/v1.1", "steps": 28, "size": "portrait_4_3"},
    4: {"model": "fal-ai/flux-pro/v1.1-ultra", "steps": 40, "size": "portrait_4_3"},
}

# ── Configuration ────────────────────────────────────────────────


@dataclass(frozen=True)
class FalAiConfig:
    """Configuration for the Fal.ai adapter."""
    api_key: str
    base_url: str = "https://queue.fal.run"
    timeout_seconds: float = 120.0
    poll_interval_seconds: float = 1.0
    max_poll_attempts: int = 120
    max_concurrent_requests: int = 10
    nsfw_threshold: float = 0.5


# ── Adapter Implementation ──────────────────────────────────────


class FalAiAdapter:
    """
    Fal.ai T2I adapter.

    Uses the Fal.ai queue API:
      POST /fal-ai/flux-pro/v1.1    → submit
      GET  /fal-ai/flux-pro/v1.1/requests/{id}/status  → poll
      GET  /fal-ai/flux-pro/v1.1/requests/{id}         → result
    """

    def __init__(self, config: FalAiConfig) -> None:
        self._config = config
        self._semaphore = asyncio.Semaphore(config.max_concurrent_requests)
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(self._config.timeout_seconds),
                headers={
                    "Authorization": f"Key {self._config.api_key}",
                    "Content-Type": "application/json",
                },
            )
        return self._client

    async def close(self) -> None:
        """Shut down the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def health_check(self) -> bool:
        """Verify Fal.ai API is reachable."""
        try:
            client = await self._get_client()
            resp = await client.get(
                "https://fal.run/health",
                timeout=10.0,
            )
            return resp.status_code == 200
        except httpx.HTTPError:
            return False

    async def generate(
        self,
        appearance: CharacterAppearance,
        *,
        model: str = "fal-ai/flux-pro/v1.1",
        image_size: str = "portrait_4_3",
        style_preset: str = "fantasy_portrait",
        num_images: int = 1,
        seed: int | None = None,
        guidance_scale: float = 3.5,
        num_inference_steps: int = 28,
        negative_prompt: str | None = None,
        npc_tier: int = 3,
        correlation_id: str | None = None,
    ) -> list[CharacterImageResult]:
        """Generate character portrait(s) from structured appearance."""
        correlation_id = correlation_id or str(uuid.uuid4())
        start_time = time.monotonic()

        # Apply tier-based quality caps
        tier_config = TIER_QUALITY.get(npc_tier, TIER_QUALITY[3])
        effective_model = str(tier_config.get("model", model))
        effective_steps = min(
            num_inference_steps, int(tier_config.get("steps", 28)))
        effective_size = image_size or str(tier_config.get("size", "portrait_4_3"))

        # Build prompts
        prompt = build_prompt(appearance, style_preset)
        neg_prompt = build_negative_prompt(negative_prompt)

        # Resolve image dimensions
        dimensions = FAL_IMAGE_SIZES.get(effective_size, FAL_IMAGE_SIZES["portrait_4_3"])

        log = logger.bind(
            entity_id=appearance.entity_id,
            correlation_id=correlation_id,
            model=effective_model,
            tier=npc_tier,
        )
        log.info("character_t2i_submit", prompt_length=len(prompt))

        async with self._semaphore:
            # 1. Submit to queue
            request_id = await self._submit(
                model=effective_model,
                prompt=prompt,
                negative_prompt=neg_prompt,
                width=dimensions["width"],
                height=dimensions["height"],
                num_images=num_images,
                seed=seed,
                guidance_scale=guidance_scale,
                num_inference_steps=effective_steps,
            )

            log.info("character_t2i_queued", fal_request_id=request_id)

            # 2. Poll for completion
            result_data = await self._poll_until_complete(
                effective_model, request_id
            )

            # 3. Process results
            results: list[CharacterImageResult] = []
            images = result_data.get("images", [])

            for img_data in images:
                image_url = img_data.get("url", "")
                img_width = img_data.get("width", dimensions["width"])
                img_height = img_data.get("height", dimensions["height"])
                img_seed = result_data.get("seed", seed or 0)

                # Download image bytes for content hashing
                image_bytes = await self._download_image(image_url)
                c_hash = hashlib.sha256(image_bytes).hexdigest()

                # NSFW check
                nsfw_score = float(
                    result_data.get("has_nsfw_concepts", [False])[0]
                    if isinstance(result_data.get("has_nsfw_concepts"), list)
                    else 0.0
                )

                if nsfw_score > self._config.nsfw_threshold:
                    moderation = ModerationStatus.REJECTED
                    log.warning(
                        "character_t2i_nsfw_rejected",
                        nsfw_score=nsfw_score,
                    )
                else:
                    moderation = ModerationStatus.APPROVED

                latency_ms = int((time.monotonic() - start_time) * 1000)

                results.append(CharacterImageResult(
                    entity_id=appearance.entity_id,
                    content_hash=c_hash,
                    image_url=image_url,
                    width=img_width,
                    height=img_height,
                    resolved_prompt=prompt,
                    seed=img_seed,
                    latency_ms=latency_ms,
                    nsfw_score=nsfw_score,
                    moderation_status=moderation,
                    correlation_id=correlation_id,
                    fal_request_id=request_id,
                    image_bytes=image_bytes,
                ))

            log.info(
                "character_t2i_complete",
                count=len(results),
                latency_ms=int((time.monotonic() - start_time) * 1000),
                fal_request_id=request_id,
            )
            return results

    # ── Private Fal.ai API methods ───────────────────────────────

    async def _submit(
        self,
        *,
        model: str,
        prompt: str,
        negative_prompt: str,
        width: int,
        height: int,
        num_images: int,
        seed: int | None,
        guidance_scale: float,
        num_inference_steps: int,
    ) -> str:
        """Submit a generation request to the Fal.ai queue."""
        client = await self._get_client()
        payload: dict[str, object] = {
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "image_size": {"width": width, "height": height},
            "num_images": num_images,
            "guidance_scale": guidance_scale,
            "num_inference_steps": num_inference_steps,
            "enable_safety_checker": True,
            "output_format": "png",
        }
        if seed is not None:
            payload["seed"] = seed

        url = f"{self._config.base_url}/{model}"
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        request_id: str = data["request_id"]
        return request_id

    async def _poll_until_complete(
        self, model: str, request_id: str
    ) -> dict:
        """Poll the queue until the request completes or times out."""
        client = await self._get_client()
        status_url = (
            f"{self._config.base_url}/{model}/requests/{request_id}/status"
        )
        result_url = (
            f"{self._config.base_url}/{model}/requests/{request_id}"
        )

        for attempt in range(self._config.max_poll_attempts):
            resp = await client.get(status_url)
            resp.raise_for_status()
            status = resp.json()

            current_status = status.get("status", "UNKNOWN")
            if current_status == "COMPLETED":
                result_resp = await client.get(result_url)
                result_resp.raise_for_status()
                return result_resp.json()

            if current_status in ("FAILED", "CANCELLED"):
                error_msg = status.get("error", "Unknown error")
                raise FalAiGenerationError(
                    f"Generation {current_status}: {error_msg}",
                    request_id=request_id,
                )

            await asyncio.sleep(self._config.poll_interval_seconds)

        raise FalAiGenerationError(
            f"Generation timed out after {self._config.max_poll_attempts} polls",
            request_id=request_id,
        )

    async def _download_image(self, url: str) -> bytes:
        """Download generated image bytes for content hashing."""
        client = await self._get_client()
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.content


# ── Errors ───────────────────────────────────────────────────────


class FalAiGenerationError(Exception):
    """Raised when Fal.ai generation fails."""

    def __init__(self, message: str, *, request_id: str = "") -> None:
        super().__init__(message)
        self.request_id = request_id
