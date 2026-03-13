import { describe, it, expect, vi } from 'vitest';
import {
  createCharacterPortraitService,
  CharacterPortraitError,
} from '../character-portrait.js';
import type { CharacterPortraitRequest } from '../character-portrait.js';

// ── Shared helpers ────────────────────────────────────────────────

function makeDeps(fetchImpl?: typeof globalThis.fetch) {
  return {
    t2iServiceUrl: 'http://t2i-service:8080',
    fetch: fetchImpl ?? vi.fn(),
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
}

function makeAppearance(partial?: Partial<{ entityId: string }>) {
  return {
    entityId: partial?.entityId ?? 'npc-001',
    race: 'human',
    gender: 'female',
    age: 30,
    build: 'average',
    skin: { tone: 'tan' },
    hair: { color: 'brown', style: 'long' },
    eyes: { color: 'blue' },
    clothing: [],
    accessories: [],
  } as unknown as import('@loom/entities-contracts').CharacterAppearance;
}

const BASE_REQUEST: CharacterPortraitRequest = {
  appearance: makeAppearance(),
  npcTier: 1,
  correlationId: 'test-corr-id',
};

function makeSuccessResponse(partial?: Partial<{ imageUrl: string }>) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      images: [
        {
          entity_id: 'npc-001',
          content_hash: 'sha256-abc',
          image_url: partial?.imageUrl ?? 'https://cdn.example.com/npc-001.png',
          width: 768,
          height: 1024,
          resolved_prompt: 'a human female adventurer',
          seed: 42,
          latency_ms: 1500,
          nsfw_score: 0.01,
          moderation_status: 'approved',
          correlation_id: 'test-corr-id',
          fal_request_id: 'fal-req-001',
        },
      ],
      total_latency_ms: 2000,
    }),
    text: async () => '',
  } as unknown as Response;
}

// ── Tests ─────────────────────────────────────────────────────────

describe('character-portrait simulation', () => {
  // ── createCharacterPortraitService factory ────────────────────

  describe('createCharacterPortraitService', () => {
    it('returns a port with generate, healthCheck, listPresets methods', () => {
      const service = createCharacterPortraitService(makeDeps());
      expect(typeof service.generate).toBe('function');
      expect(typeof service.healthCheck).toBe('function');
      expect(typeof service.listPresets).toBe('function');
    });
  });

  // ── generate() ───────────────────────────────────────────────

  describe('generate()', () => {
    it('resolves with mapped images and totalLatencyMs on success', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeSuccessResponse());
      const service = createCharacterPortraitService(makeDeps(fetchMock));

      const result = await service.generate(BASE_REQUEST);

      expect(result.images).toHaveLength(1);
      expect(result.totalLatencyMs).toBe(2000);
    });

    it('maps image fields from snake_case to camelCase', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        makeSuccessResponse({ imageUrl: 'https://cdn.example.com/portrait.webp' }),
      );
      const service = createCharacterPortraitService(makeDeps(fetchMock));

      const result = await service.generate(BASE_REQUEST);
      const img = result.images[0];

      expect(img.entityId).toBe('npc-001');
      expect(img.contentHash).toBe('sha256-abc');
      expect(img.imageUrl).toBe('https://cdn.example.com/portrait.webp');
      expect(img.width).toBe(768);
      expect(img.height).toBe(1024);
      expect(img.latencyMs).toBe(1500);
      expect(img.nsfwScore).toBe(0.01);
      expect(img.moderationStatus).toBe('approved');
    });

    it('calls the /generate endpoint with POST and JSON body', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeSuccessResponse());
      const service = createCharacterPortraitService(makeDeps(fetchMock));

      await service.generate(BASE_REQUEST);

      expect(fetchMock).toHaveBeenCalledWith(
        'http://t2i-service:8080/generate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    it('throws CharacterPortraitError when the service returns non-ok status', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable',
      } as unknown as Response);
      const service = createCharacterPortraitService(makeDeps(fetchMock));

      await expect(service.generate(BASE_REQUEST)).rejects.toThrow(CharacterPortraitError);
    });

    it('CharacterPortraitError carries the correlationId', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      } as unknown as Response);
      const service = createCharacterPortraitService(makeDeps(fetchMock));

      let caught: CharacterPortraitError | undefined;
      try {
        await service.generate({ ...BASE_REQUEST, correlationId: 'corr-123' });
      } catch (err) {
        caught = err as CharacterPortraitError;
      }

      expect(caught).toBeInstanceOf(CharacterPortraitError);
      expect(caught!.correlationId).toBe('corr-123');
    });

    it('uses default values for optional fields (model, imageSize, stylePreset)', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeSuccessResponse());
      const service = createCharacterPortraitService(makeDeps(fetchMock));

      await service.generate({ appearance: makeAppearance(), npcTier: 2 });

      const [, { body }] = fetchMock.mock.calls[0] as [string, { body: string }];
      const parsed = JSON.parse(body);
      expect(parsed.model).toBe('fal-ai/flux-pro/v1.1');
      expect(parsed.image_size).toBe('portrait_4_3');
      expect(parsed.style_preset).toBe('fantasy_portrait');
      expect(parsed.num_images).toBe(1);
    });

    it('logs info on start and completion', async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeSuccessResponse());
      const deps = makeDeps(fetchMock);
      const service = createCharacterPortraitService(deps);

      await service.generate(BASE_REQUEST);

      expect(deps.log.info).toHaveBeenCalledTimes(2);
    });
  });

  // ── healthCheck() ─────────────────────────────────────────────

  describe('healthCheck()', () => {
    it('returns true when /health responds status=ok', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' }),
      } as unknown as Response);
      const service = createCharacterPortraitService(makeDeps(fetchMock));

      await expect(service.healthCheck()).resolves.toBe(true);
    });

    it('returns false when /health responds ok=false', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({}),
      } as unknown as Response);
      const service = createCharacterPortraitService(makeDeps(fetchMock));

      await expect(service.healthCheck()).resolves.toBe(false);
    });

    it('returns false when /health responds with status=degraded', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'degraded' }),
      } as unknown as Response);
      const service = createCharacterPortraitService(makeDeps(fetchMock));

      await expect(service.healthCheck()).resolves.toBe(false);
    });

    it('returns false when fetch throws', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('connect refused'));
      const service = createCharacterPortraitService(makeDeps(fetchMock));

      await expect(service.healthCheck()).resolves.toBe(false);
    });

    it('calls the /health endpoint', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' }),
      } as unknown as Response);
      const service = createCharacterPortraitService(makeDeps(fetchMock));

      await service.healthCheck();

      expect(fetchMock).toHaveBeenCalledWith('http://t2i-service:8080/health');
    });
  });

  // ── listPresets() ─────────────────────────────────────────────

  describe('listPresets()', () => {
    it('returns a Map with preset name → description entries', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          presets: {
            fantasy_portrait: 'Fantasy RPG character portrait',
            realistic: 'Photorealistic rendering',
            anime: 'Anime-style illustration',
          },
        }),
      } as unknown as Response);
      const service = createCharacterPortraitService(makeDeps(fetchMock));

      const presets = await service.listPresets();

      expect(presets).toBeInstanceOf(Map);
      expect(presets.size).toBe(3);
      expect(presets.get('fantasy_portrait')).toBe('Fantasy RPG character portrait');
      expect(presets.get('anime')).toBe('Anime-style illustration');
    });

    it('throws CharacterPortraitError when /presets returns non-ok status', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      } as unknown as Response);
      const service = createCharacterPortraitService(makeDeps(fetchMock));

      await expect(service.listPresets()).rejects.toThrow(CharacterPortraitError);
    });

    it('calls the /presets endpoint', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ presets: {} }),
      } as unknown as Response);
      const service = createCharacterPortraitService(makeDeps(fetchMock));

      await service.listPresets();

      expect(fetchMock).toHaveBeenCalledWith('http://t2i-service:8080/presets');
    });
  });

  // ── CharacterPortraitError ────────────────────────────────────

  describe('CharacterPortraitError', () => {
    it('is an instance of Error', () => {
      const err = new CharacterPortraitError('test error', 'corr-42');
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(CharacterPortraitError);
    });

    it('stores correlationId', () => {
      const err = new CharacterPortraitError('oops', 'corr-99');
      expect(err.correlationId).toBe('corr-99');
    });

    it('has name CharacterPortraitError', () => {
      const err = new CharacterPortraitError('oops');
      expect(err.name).toBe('CharacterPortraitError');
    });

    it('defaults correlationId to empty string when not provided', () => {
      const err = new CharacterPortraitError('no corr');
      expect(err.correlationId).toBe('');
    });
  });
});
