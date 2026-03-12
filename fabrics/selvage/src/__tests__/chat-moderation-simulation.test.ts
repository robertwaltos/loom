/**
 * Chat Moderation Pipeline — Simulation Tests
 *
 * Exercises the multi-stage content filtering: empty content blocking,
 * profanity replacement, toxicity scoring (block/flag/pass), spam detection,
 * and l33t-speak evasion patterns.
 */

import { describe, it, expect } from 'vitest';
import { createChatModerationPipeline } from '../chat-moderation.js';
import type {
  ChatModerationDeps,
  ChatModerationConfig,
} from '../chat-moderation.js';

// ── Helpers ──────────────────────────────────────────────────────

function makeDeps(overrides: {
  toxicityScore?: number;
} = {}) {
  let time = 10_000_000;
  const reviewQueue: Array<{ senderId: string; content: string; reason: string; score: number }> = [];
  const logs: Array<{ level: string; msg: string }> = [];

  const deps: ChatModerationDeps = {
    classifier: {
      score: () => overrides.toxicityScore ?? 0.1,
    },
    clock: { nowMicroseconds: () => time },
    logger: {
      info: (_ctx, msg) => logs.push({ level: 'info', msg }),
      warn: (_ctx, msg) => logs.push({ level: 'warn', msg }),
    },
    reviewQueue: {
      enqueue: (senderId, content, reason, score) => {
        reviewQueue.push({ senderId, content, reason, score });
      },
    },
  };

  return {
    deps,
    reviewQueue,
    logs,
    advance: (us: number) => { time += us; },
  };
}

const CUSTOM_PROFANITY: ReadonlyArray<string> = ['badword', 'nastything', 'swearword'];

function makeConfig(overrides: Partial<ChatModerationConfig> = {}): Partial<ChatModerationConfig> {
  const cfg: Record<string, unknown> = {
    profanityList: overrides.profanityList ?? CUSTOM_PROFANITY,
  };
  if (overrides.toxicityBlockThreshold !== undefined) cfg['toxicityBlockThreshold'] = overrides.toxicityBlockThreshold;
  if (overrides.toxicityFlagThreshold !== undefined) cfg['toxicityFlagThreshold'] = overrides.toxicityFlagThreshold;
  if (overrides.maxRepeatMessages !== undefined) cfg['maxRepeatMessages'] = overrides.maxRepeatMessages;
  if (overrides.repeatWindowMs !== undefined) cfg['repeatWindowMs'] = overrides.repeatWindowMs;
  return cfg as Partial<ChatModerationConfig>;
}

// ── Tests ────────────────────────────────────────────────────────

describe('Chat Moderation Pipeline', () => {
  // ── Stage 1: Basic Validation ─────────────────────────────────

  describe('empty content', () => {
    it('blocks empty messages', () => {
      const { deps } = makeDeps();
      const pipeline = createChatModerationPipeline(deps, makeConfig());
      const result = pipeline.evaluate('', 'user-1');
      expect(result.allowed).toBe(false);
      expect(result.action).toBe('blocked');
      expect(result.reason).toBe('empty_content');
    });
  });

  // ── Stage 2: Spam Detection ───────────────────────────────────

  describe('spam detection', () => {
    it('allows first few identical messages', () => {
      const { deps } = makeDeps();
      const pipeline = createChatModerationPipeline(deps, makeConfig({ maxRepeatMessages: 3 }));
      const r1 = pipeline.evaluate('hello', 'user-1');
      const r2 = pipeline.evaluate('hello', 'user-1');
      const r3 = pipeline.evaluate('hello', 'user-1');
      expect(r1.action).toBe('pass');
      expect(r2.action).toBe('pass');
      expect(r3.action).toBe('pass');
    });

    it('blocks after exceeding repeat limit', () => {
      const { deps } = makeDeps();
      const pipeline = createChatModerationPipeline(deps, makeConfig({ maxRepeatMessages: 3 }));
      pipeline.evaluate('spam', 'user-1');
      pipeline.evaluate('spam', 'user-1');
      pipeline.evaluate('spam', 'user-1');
      const r4 = pipeline.evaluate('spam', 'user-1');
      expect(r4.allowed).toBe(false);
      expect(r4.action).toBe('blocked');
      expect(r4.reason).toBe('spam_repeat');
    });

    it('different messages do not trigger spam', () => {
      const { deps } = makeDeps();
      const pipeline = createChatModerationPipeline(deps, makeConfig({ maxRepeatMessages: 2 }));
      pipeline.evaluate('hello', 'user-1');
      pipeline.evaluate('world', 'user-1');
      pipeline.evaluate('test', 'user-1');
      const r = pipeline.evaluate('again', 'user-1');
      expect(r.action).toBe('pass');
    });

    it('spam detection is per-sender', () => {
      const { deps } = makeDeps();
      const pipeline = createChatModerationPipeline(deps, makeConfig({ maxRepeatMessages: 2 }));
      pipeline.evaluate('hello', 'user-1');
      pipeline.evaluate('hello', 'user-1');
      // User-2 start fresh
      const r = pipeline.evaluate('hello', 'user-2');
      expect(r.action).toBe('pass');
    });

    it('spam window resets after time passes', () => {
      const { deps, advance } = makeDeps();
      const pipeline = createChatModerationPipeline(deps, makeConfig({
        maxRepeatMessages: 2,
        repeatWindowMs: 5_000,
      }));
      pipeline.evaluate('hello', 'user-1');
      pipeline.evaluate('hello', 'user-1');
      // Advance past window (5s = 5_000_000 microseconds)
      advance(6_000_000);
      const r = pipeline.evaluate('hello', 'user-1');
      expect(r.action).toBe('pass');
    });
  });

  // ── Stage 3: Profanity Filter ─────────────────────────────────

  describe('profanity filter', () => {
    it('replaces profanity with asterisks', () => {
      const { deps } = makeDeps();
      const pipeline = createChatModerationPipeline(deps, makeConfig());
      const result = pipeline.evaluate('This is a badword right here', 'user-1');
      expect(result.action).toBe('filtered');
      expect(result.sanitisedContent).toContain('*******');
      expect(result.sanitisedContent).not.toContain('badword');
      expect(result.allowed).toBe(true);
    });

    it('passes clean content unchanged', () => {
      const { deps } = makeDeps();
      const pipeline = createChatModerationPipeline(deps, makeConfig());
      const result = pipeline.evaluate('This is perfectly fine', 'user-1');
      expect(result.action).toBe('pass');
      expect(result.sanitisedContent).toBeNull();
    });

    it('detects l33t-speak evasion', () => {
      const { deps } = makeDeps();
      const pipeline = createChatModerationPipeline(deps, makeConfig({ profanityList: ['badword'] }));
      const result = pipeline.evaluate('This is a b@dw0rd right here', 'user-1');
      expect(result.action).toBe('filtered');
      expect(result.allowed).toBe(true);
    });
  });

  // ── Stage 4: Toxicity Classifier ──────────────────────────────

  describe('toxicity scoring', () => {
    it('blocks content above block threshold', () => {
      const { deps, reviewQueue } = makeDeps({ toxicityScore: 0.9 });
      const pipeline = createChatModerationPipeline(deps, makeConfig());
      const result = pipeline.evaluate('toxic message', 'user-1');
      expect(result.allowed).toBe(false);
      expect(result.action).toBe('blocked');
      expect(result.reason).toContain('toxicity_score');
      // Should enqueue for review
      expect(reviewQueue.length).toBe(1);
      expect(reviewQueue[0].reason).toBe('toxic_content');
    });

    it('flags content above flag threshold but below block', () => {
      const { deps, reviewQueue } = makeDeps({ toxicityScore: 0.7 });
      const pipeline = createChatModerationPipeline(deps, makeConfig());
      const result = pipeline.evaluate('borderline message', 'user-1');
      expect(result.allowed).toBe(true);
      expect(result.action).toBe('flagged');
      expect(reviewQueue.length).toBe(1);
      expect(reviewQueue[0].reason).toBe('borderline_toxicity');
    });

    it('passes content below flag threshold', () => {
      const { deps } = makeDeps({ toxicityScore: 0.2 });
      const pipeline = createChatModerationPipeline(deps, makeConfig());
      const result = pipeline.evaluate('clean message', 'user-1');
      expect(result.action).toBe('pass');
    });

    it('respects custom thresholds', () => {
      const { deps } = makeDeps({ toxicityScore: 0.5 });
      const pipeline = createChatModerationPipeline(deps, makeConfig({
        toxicityBlockThreshold: 0.4,
      }));
      const result = pipeline.evaluate('some message', 'user-1');
      expect(result.allowed).toBe(false);
      expect(result.action).toBe('blocked');
    });
  });

  // ── Combined Stages ───────────────────────────────────────────

  describe('combined pipeline', () => {
    it('profanity + flagged toxicity returns flagged with sanitised content', () => {
      const { deps } = makeDeps({ toxicityScore: 0.65 });
      const pipeline = createChatModerationPipeline(deps, makeConfig());
      const result = pipeline.evaluate('you are a badword', 'user-1');
      expect(result.action).toBe('flagged');
      expect(result.allowed).toBe(true);
      // Sanitised content should have profanity replaced
      expect(result.sanitisedContent).not.toContain('badword');
    });

    it('empty content is blocked before any other stage', () => {
      // Even with low toxicity
      const { deps } = makeDeps({ toxicityScore: 0 });
      const pipeline = createChatModerationPipeline(deps, makeConfig());
      const result = pipeline.evaluate('', 'user-1');
      expect(result.action).toBe('blocked');
      expect(result.reason).toBe('empty_content');
    });
  });

  // ── Pipeline returns ChatModerationPort interface ─────────────

  describe('interface conformance', () => {
    it('implements evaluate function', () => {
      const { deps } = makeDeps();
      const pipeline = createChatModerationPipeline(deps, makeConfig());
      expect(typeof pipeline.evaluate).toBe('function');
    });

    it('result has all required fields', () => {
      const { deps } = makeDeps();
      const pipeline = createChatModerationPipeline(deps, makeConfig());
      const result = pipeline.evaluate('test', 'user-1');
      expect('allowed' in result).toBe(true);
      expect('action' in result).toBe(true);
      expect('reason' in result).toBe(true);
      expect('sanitisedContent' in result).toBe(true);
    });
  });
});
