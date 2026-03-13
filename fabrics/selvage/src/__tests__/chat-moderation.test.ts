import { describe, it, expect, beforeEach } from 'vitest';
import { createChatModerationPipeline } from '../chat-moderation.js';
import type { ChatModerationPort } from '../chat-channel-manager.js';

// ── Helpers ───────────────────────────────────────────────────────────

function makePipeline(toxicityScore = 0.0, profanityList: string[] = []) {
  let now = 10_000_000;
  const queued: Array<{ senderId: string; reason: string }> = [];
  const pipeline: ChatModerationPort = createChatModerationPipeline(
    {
      classifier: { score: () => toxicityScore },
      clock: { nowMicroseconds: () => now },
      logger: { info: () => undefined, warn: () => undefined },
      reviewQueue: {
        enqueue: (senderId, _c, reason) => { queued.push({ senderId, reason }); },
      },
    },
    { profanityList },
  );
  return {
    pipeline,
    queued,
    advance: (ms: number) => { now += ms * 1_000; },
  };
}

// ── Basic pass ────────────────────────────────────────────────────────

describe('createChatModerationPipeline — pass', () => {
  it('passes clean content with low toxicity score', () => {
    const { pipeline } = makePipeline(0.1);
    const result = pipeline.evaluate('Hello there', 'p1');
    expect(result.allowed).toBe(true);
    expect(result.action).toBe('pass');
    expect(result.sanitisedContent).toBeNull();
  });
});

// ── Blocked by toxicity ───────────────────────────────────────────────

describe('toxicity blocking', () => {
  it('blocks content above toxicity block threshold (0.85)', () => {
    const { pipeline } = makePipeline(0.9);
    const result = pipeline.evaluate('toxic message', 'p1');
    expect(result.allowed).toBe(false);
    expect(result.action).toBe('blocked');
  });

  it('flags content between flag (0.6) and block (0.85) thresholds', () => {
    const { pipeline, queued } = makePipeline(0.7);
    const result = pipeline.evaluate('borderline message', 'p1');
    expect(result.allowed).toBe(true);
    expect(result.action).toBe('flagged');
    expect(queued.some((q) => q.reason === 'borderline_toxicity')).toBe(true);
  });

  it('enqueues flagged messages for review', () => {
    const { pipeline, queued } = makePipeline(0.95);
    pipeline.evaluate('bad content', 'p1');
    expect(queued.some((q) => q.senderId === 'p1')).toBe(true);
  });
});

// ── Profanity filtering ───────────────────────────────────────────────

describe('profanity filtering', () => {
  let pipeline: ChatModerationPort;

  beforeEach(() => {
    ({ pipeline } = makePipeline(0.0, ['badword']));
  });

  it('replaces profanity with asterisks', () => {
    const result = pipeline.evaluate('this is a badword in text', 'p1');
    expect(result.allowed).toBe(true);
    expect(result.action).toBe('filtered');
    expect(result.sanitisedContent).toContain('*');
    expect(result.sanitisedContent).not.toContain('badword');
  });

  it('passes clean text without triggering filter', () => {
    const result = pipeline.evaluate('this is clean text', 'p1');
    expect(result.action).toBe('pass');
  });

  it('handles l33t-speak variants of profanity', () => {
    const result = pipeline.evaluate('b@dword appears here', 'p1');
    // The pattern replaces 'a' with [a@4], so 'b@dword' should match
    expect(result.sanitisedContent).not.toContain('b@dword');
  });
});

// ── Spam / repeat detection ───────────────────────────────────────────

describe('spam detection', () => {
  it('blocks after exceeding maxRepeatMessages (3)', () => {
    const { pipeline } = makePipeline(0.0);
    const msg = 'same message';
    // First 3 are fine
    pipeline.evaluate(msg, 'spammer');
    pipeline.evaluate(msg, 'spammer');
    pipeline.evaluate(msg, 'spammer');
    // 4th should be blocked
    const result = pipeline.evaluate(msg, 'spammer');
    expect(result.allowed).toBe(false);
    expect(result.action).toBe('blocked');
    expect(result.reason).toBe('spam_repeat');
  });

  it('does not penalise different messages from the same sender', () => {
    const { pipeline } = makePipeline(0.0);
    pipeline.evaluate('message one', 'p1');
    pipeline.evaluate('message two', 'p1');
    pipeline.evaluate('message three', 'p1');
    const result = pipeline.evaluate('message four', 'p1');
    expect(result.allowed).toBe(true);
  });

  it('resets spam window after repeatWindowMs', () => {
    const { pipeline, advance } = makePipeline(0.0);
    const msg = 'same';
    pipeline.evaluate(msg, 'p1');
    pipeline.evaluate(msg, 'p1');
    pipeline.evaluate(msg, 'p1');
    // Advance past the 10 000ms repeat window
    advance(11_000);
    const result = pipeline.evaluate(msg, 'p1');
    expect(result.allowed).toBe(true);
  });
});
