/**
 * Guide Routes — Character system prompts for AI conversations.
 *
 * GET /v1/guide/:characterId — Get the AI system prompt for a guide character,
 *   adapted to the requesting Kindler's age tier and learning progress.
 *
 * GET /v1/guide — List all available guides with their world assignments.
 *
 * This is the bridge between the learning platform and the AI provider
 * (OpenAI, Anthropic, etc.). The client sends the system prompt to the AI,
 * then streams the conversation directly — never through this server.
 *
 * Thread: silk/game-characters
 * Tier: 1
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { CharactersEngine } from '../../universe/characters/engine.js';
import type { KindlerRepository } from '../../universe/kindler/repository.js';
import type { AdaptivePromptLayer } from '../../universe/characters/types.js';
import { CHARACTER_ROSTER } from '../../universe/characters/types.js';
import type { AnalyticsEmitter } from '../../universe/analytics/pg-repository.js';

// ─── Response shapes ──────────────────────────────────────────────

interface GuidePromptResponse {
  readonly ok: true;
  readonly characterId: string;
  readonly systemPrompt: string;
  readonly subjectKnowledge: readonly string[];
  readonly adaptedFor: {
    readonly childAge: number;
    readonly difficultyTier: 1 | 2 | 3;
    readonly completedEntries: number;
    readonly vocabularyLevel: string;
  };
}

interface GuideListResponse {
  readonly ok: true;
  readonly guides: readonly {
    readonly characterId: string;
    readonly worldId: string;
    readonly subject: string;
    readonly available: boolean;
  }[];
}

interface ErrorResponse {
  readonly ok: false;
  readonly error: string;
  readonly code: string;
}

// ─── Helpers ──────────────────────────────────────────────────────

/** Map age tier (1|2|3) to a representative child age for prompt building */
const AGE_TIER_MAP: Record<1 | 2 | 3, number> = {
  1: 6,   // ages 5-6
  2: 8,   // ages 7-8
  3: 10,  // ages 9-10
};

/** Map spark level + completedEntries to difficulty tier */
function inferDifficultyTier(
  sparkLevel: number,
  completedEntryCount: number,
): 1 | 2 | 3 {
  if (sparkLevel > 0.6 || completedEntryCount > 20) return 3;
  if (sparkLevel > 0.3 || completedEntryCount > 5) return 2;
  return 1;
}

/** Map difficulty tier to vocabulary level */
function inferVocabularyLevel(tier: 1 | 2 | 3): 'simple' | 'intermediate' | 'advanced' {
  if (tier === 3) return 'advanced';
  if (tier === 2) return 'intermediate';
  return 'simple';
}

// ─── Route Registration ───────────────────────────────────────────

export interface GuideRoutesDeps {
  readonly charactersEngine: CharactersEngine;
  readonly kindlerRepo: KindlerRepository;
  /** Optional: fire-and-forget analytics emitter. */
  readonly analyticsEmitter?: AnalyticsEmitter;
}

export function registerGuideRoutes(app: FastifyAppLike, deps: GuideRoutesDeps): void {
  const { charactersEngine, kindlerRepo, analyticsEmitter } = deps;

  // GET /v1/guide — list all available guides
  app.get('/v1/guide', (_req, reply) => {
    const roster = Object.entries(CHARACTER_ROSTER) as [string, { world: string; subject: string }][];
    const guides: GuideListResponse['guides'] = roster.map(([id, info]) => ({
      characterId: id,
      worldId: info.world,
      subject: info.subject,
      available: charactersEngine.supportsCharacter(id),
    }));
    const res: GuideListResponse = { ok: true, guides };
    return reply.send(res);
  });

  // GET /v1/guide/:characterId?kindlerId=<id>
  app.get('/v1/guide/:characterId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const query = (req as unknown as { query: Record<string, unknown> }).query;

    const characterId = typeof params['characterId'] === 'string' ? params['characterId'] : null;
    if (characterId === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid characterId', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    if (!charactersEngine.supportsCharacter(characterId)) {
      const err: ErrorResponse = { ok: false, error: 'Character not found', code: 'NOT_FOUND' };
      return reply.code(404).send(err);
    }

    // Build adaptive layer — defaults if no kindlerId provided
    let layer: AdaptivePromptLayer = {
      childAge: 7,
      difficultyTier: 1,
      completedEntryIds: [],
      vocabularyLevel: 'simple',
    };

    const kindlerId = typeof query['kindlerId'] === 'string' ? query['kindlerId'] : null;
    if (kindlerId !== null) {
      const profile = await kindlerRepo.findById(kindlerId);
      if (profile !== null) {
        const progressList = await kindlerRepo.loadProgress(kindlerId);
        const completedIds = progressList.map((p) => p.entryId);
        const tier = inferDifficultyTier(profile.sparkLevel, completedIds.length);
        const childAge = AGE_TIER_MAP[profile.ageTier];
        layer = {
          childAge,
          difficultyTier: tier,
          completedEntryIds: completedIds,
          vocabularyLevel: inferVocabularyLevel(tier),
        };
      }
    }

    const sysPrompt = charactersEngine.buildSystemPrompt(characterId, layer);
    analyticsEmitter?.emit({
      eventType: 'guide_accessed',
      playerId: kindlerId,
      properties: { characterId },
    });
    const res: GuidePromptResponse = {
      ok: true,
      characterId,
      systemPrompt: sysPrompt.basePersonality,
      subjectKnowledge: sysPrompt.subjectKnowledge,
      adaptedFor: {
        childAge: layer.childAge,
        difficultyTier: layer.difficultyTier,
        completedEntries: layer.completedEntryIds.length,
        vocabularyLevel: layer.vocabularyLevel,
      },
    };
    return reply.send(res);
  });
}
