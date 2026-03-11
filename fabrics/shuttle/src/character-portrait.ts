/**
 * Character Portrait Generator — Shuttle Fabric
 *
 * Calls the Character T2I microservice (Python/Fal.ai) to generate
 * NPC portraits from structured appearance descriptions.
 *
 * This is the TypeScript side of the T2I pipeline:
 *   Shuttle (this) → HTTP → character_t2i_service.py → Fal.ai API
 *
 * The Shuttle owns NPC identity and personality. When an NPC needs
 * a portrait (spawn, promotion, asset creation), this service
 * builds the appearance from NPC data and requests generation.
 *
 * Thread: shuttle/character-t2i
 * Tier: 2
 */

import type {
  CharacterAppearance,
  CharacterImageRequest,
  CharacterImageResult,
  T2IModel,
  ImageSize,
  ImageFormat,
} from '@loom/entities-contracts';

// ── Port Interface ──────────────────────────────────────────────

export interface CharacterPortraitPort {
  readonly generate: (
    request: CharacterPortraitRequest,
  ) => Promise<CharacterPortraitResponse>;
  readonly healthCheck: () => Promise<boolean>;
  readonly listPresets: () => Promise<ReadonlyMap<string, string>>;
}

export interface CharacterPortraitRequest {
  readonly appearance: CharacterAppearance;
  readonly model?: T2IModel;
  readonly imageSize?: ImageSize;
  readonly stylePreset?: string;
  readonly numImages?: number;
  readonly seed?: number;
  readonly guidanceScale?: number;
  readonly inferenceSteps?: number;
  readonly negativePrompt?: string;
  readonly npcTier: number;
  readonly correlationId?: string;
}

export interface CharacterPortraitResponse {
  readonly images: ReadonlyArray<CharacterImageResult>;
  readonly totalLatencyMs: number;
}

// ── Dependencies ────────────────────────────────────────────────

export interface CharacterPortraitDeps {
  /** Base URL of the Character T2I service */
  readonly t2iServiceUrl: string;
  /** HTTP fetch function (injectable for testing) */
  readonly fetch: typeof globalThis.fetch;
  /** Structured logger */
  readonly log: {
    readonly info: (msg: string, data?: Record<string, unknown>) => void;
    readonly warn: (msg: string, data?: Record<string, unknown>) => void;
    readonly error: (msg: string, data?: Record<string, unknown>) => void;
  };
}

// ── Factory ─────────────────────────────────────────────────────

export function createCharacterPortraitService(
  deps: CharacterPortraitDeps,
): CharacterPortraitPort {
  const { t2iServiceUrl, log } = deps;

  const generate = async (
    request: CharacterPortraitRequest,
  ): Promise<CharacterPortraitResponse> => {
    const correlationId =
      request.correlationId ?? crypto.randomUUID();

    log.info('character_portrait_request', {
      entityId: request.appearance.entityId,
      correlationId,
      tier: request.npcTier,
      style: request.stylePreset ?? 'fantasy_portrait',
    });

    const body = {
      appearance: request.appearance,
      model: request.model ?? 'fal-ai/flux-pro/v1.1',
      image_size: request.imageSize ?? 'portrait_4_3',
      style_preset: request.stylePreset ?? 'fantasy_portrait',
      num_images: request.numImages ?? 1,
      seed: request.seed ?? null,
      guidance_scale: request.guidanceScale ?? 3.5,
      num_inference_steps: request.inferenceSteps ?? 28,
      negative_prompt: request.negativePrompt ?? null,
      npc_tier: request.npcTier,
      correlation_id: correlationId,
    };

    const response = await deps.fetch(`${t2iServiceUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error('character_portrait_failed', {
        status: response.status,
        error: errorText,
        correlationId,
      });
      throw new CharacterPortraitError(
        `T2I service returned ${response.status}: ${errorText}`,
        correlationId,
      );
    }

    const data = (await response.json()) as {
      images: ReadonlyArray<{
        entity_id: string;
        content_hash: string;
        image_url: string;
        width: number;
        height: number;
        resolved_prompt: string;
        seed: number;
        latency_ms: number;
        nsfw_score: number;
        moderation_status: string;
        correlation_id: string;
        fal_request_id: string;
      }>;
      total_latency_ms: number;
    };

    const images: CharacterImageResult[] = data.images.map((img) => ({
      entityId: img.entity_id,
      contentHash: img.content_hash,
      imageUrl: img.image_url,
      width: img.width,
      height: img.height,
      resolvedPrompt: img.resolved_prompt,
      seed: img.seed,
      latencyMs: img.latency_ms,
      nsfwScore: img.nsfw_score,
      moderationStatus: img.moderation_status as
        | 'approved'
        | 'flagged'
        | 'rejected',
      correlationId: img.correlation_id,
      falRequestId: img.fal_request_id,
    }));

    log.info('character_portrait_complete', {
      entityId: request.appearance.entityId,
      correlationId,
      count: images.length,
      totalLatencyMs: data.total_latency_ms,
    });

    return {
      images,
      totalLatencyMs: data.total_latency_ms,
    };
  };

  const healthCheck = async (): Promise<boolean> => {
    try {
      const response = await deps.fetch(`${t2iServiceUrl}/health`);
      if (!response.ok) return false;
      const data = (await response.json()) as { status: string };
      return data.status === 'ok';
    } catch {
      return false;
    }
  };

  const listPresets = async (): Promise<ReadonlyMap<string, string>> => {
    const response = await deps.fetch(`${t2iServiceUrl}/presets`);
    if (!response.ok) {
      throw new CharacterPortraitError(
        `Failed to fetch presets: ${response.status}`,
      );
    }
    const data = (await response.json()) as {
      presets: Record<string, string>;
    };
    return new Map(Object.entries(data.presets));
  };

  return { generate, healthCheck, listPresets };
}

// ── Error ───────────────────────────────────────────────────────

export class CharacterPortraitError extends Error {
  readonly correlationId: string;

  constructor(message: string, correlationId: string = '') {
    super(message);
    this.name = 'CharacterPortraitError';
    this.correlationId = correlationId;
  }
}
