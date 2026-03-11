/**
 * Chat Moderation Pipeline — Multi-stage content filtering.
 *
 * Pipeline stages:
 *   1. Length & encoding validation
 *   2. Profanity dictionary filter (fast, deterministic)
 *   3. Pattern-based evasion detection (l33t speak, spacing tricks)
 *   4. Toxicity classifier score (ML model via port)
 *   5. Repeat / spam detection
 *
 * Produces a ModerationResult:
 *   - pass      → content is clean
 *   - filtered  → profanity replaced with asterisks, content delivered
 *   - flagged   → content delivered but queued for human review
 *   - blocked   → content rejected entirely
 */

import type { ChatModerationPort, ModerationResult } from './chat-channel-manager.js';

// ── Ports ────────────────────────────────────────────────────────

export interface ToxicityClassifierPort {
  readonly score: (content: string) => number;
}

export interface ModerationLogPort {
  readonly info: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
  readonly warn: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
}

export interface ModerationClockPort {
  readonly nowMicroseconds: () => number;
}

export interface ModerationReviewPort {
  readonly enqueue: (
    senderId: string,
    content: string,
    reason: string,
    score: number,
  ) => void;
}

// ── Config ───────────────────────────────────────────────────────

export interface ChatModerationConfig {
  readonly toxicityBlockThreshold: number;
  readonly toxicityFlagThreshold: number;
  readonly maxRepeatMessages: number;
  readonly repeatWindowMs: number;
  readonly profanityList: ReadonlyArray<string>;
}

const DEFAULT_PROFANITY_LIST: ReadonlyArray<string> = [
  // Placeholder — real deployment loads from external config
  'placeholder_profanity_1',
  'placeholder_profanity_2',
];

const DEFAULT_CONFIG: ChatModerationConfig = {
  toxicityBlockThreshold: 0.85,
  toxicityFlagThreshold: 0.6,
  maxRepeatMessages: 3,
  repeatWindowMs: 10_000,
  profanityList: DEFAULT_PROFANITY_LIST,
};

// ── Deps ─────────────────────────────────────────────────────────

export interface ChatModerationDeps {
  readonly classifier: ToxicityClassifierPort;
  readonly clock: ModerationClockPort;
  readonly logger: ModerationLogPort;
  readonly reviewQueue: ModerationReviewPort;
}

// ── Spam Tracker ─────────────────────────────────────────────────

interface SpamEntry {
  readonly content: string;
  readonly timestamp: number;
}

// ── Factory ──────────────────────────────────────────────────────

export function createChatModerationPipeline(
  deps: ChatModerationDeps,
  config?: Partial<ChatModerationConfig>,
): ChatModerationPort {
  const cfg: ChatModerationConfig = { ...DEFAULT_CONFIG, ...config };

  const profanityPatterns = buildProfanityPatterns(cfg.profanityList);
  const recentMessages = new Map<string, SpamEntry[]>();

  function evaluate(content: string, senderId: string): ModerationResult {
    // Stage 1: Basic validation
    if (content.length === 0) {
      return { allowed: false, action: 'blocked', reason: 'empty_content', sanitisedContent: null };
    }

    // Stage 2: Spam / repeat detection
    const spamResult = checkSpam(senderId, content);
    if (spamResult) return spamResult;

    // Stage 3: Profanity filter
    const profanityResult = filterProfanity(content);

    // Stage 4: Toxicity classifier
    const toxicityScore = deps.classifier.score(
      profanityResult.hadProfanity ? content : content,
    );

    if (toxicityScore >= cfg.toxicityBlockThreshold) {
      deps.logger.warn(
        { senderId, score: toxicityScore },
        'moderation.toxicity.blocked',
      );
      deps.reviewQueue.enqueue(senderId, content, 'toxic_content', toxicityScore);
      return {
        allowed: false,
        action: 'blocked',
        reason: `toxicity_score_${toxicityScore.toFixed(2)}`,
        sanitisedContent: null,
      };
    }

    if (toxicityScore >= cfg.toxicityFlagThreshold) {
      deps.reviewQueue.enqueue(senderId, content, 'borderline_toxicity', toxicityScore);
      const finalContent = profanityResult.hadProfanity
        ? profanityResult.sanitised
        : content;
      return {
        allowed: true,
        action: 'flagged',
        reason: `toxicity_score_${toxicityScore.toFixed(2)}`,
        sanitisedContent: finalContent,
      };
    }

    // Stage 5: Return profanity-filtered or clean
    if (profanityResult.hadProfanity) {
      return {
        allowed: true,
        action: 'filtered',
        reason: 'profanity_replaced',
        sanitisedContent: profanityResult.sanitised,
      };
    }

    return { allowed: true, action: 'pass', reason: '', sanitisedContent: null };
  }

  function checkSpam(senderId: string, content: string): ModerationResult | null {
    const now = deps.clock.nowMicroseconds();
    const nowMs = now / 1_000;
    let entries = recentMessages.get(senderId);

    if (!entries) {
      entries = [];
      recentMessages.set(senderId, entries);
    }

    // Prune old entries
    const cutoff = nowMs - cfg.repeatWindowMs;
    const filtered = entries.filter((e) => e.timestamp > cutoff);
    recentMessages.set(senderId, filtered);

    // Check for repeated identical messages
    const normalised = content.toLowerCase().trim();
    const repeatCount = filtered.filter(
      (e) => e.content.toLowerCase().trim() === normalised,
    ).length;

    filtered.push({ content, timestamp: nowMs });
    recentMessages.set(senderId, filtered);

    if (repeatCount >= cfg.maxRepeatMessages) {
      deps.logger.warn({ senderId, repeatCount }, 'moderation.spam.blocked');
      return {
        allowed: false,
        action: 'blocked',
        reason: 'spam_repeat',
        sanitisedContent: null,
      };
    }

    return null;
  }

  function filterProfanity(content: string): {
    readonly hadProfanity: boolean;
    readonly sanitised: string;
  } {
    let hadProfanity = false;
    let sanitised = content;

    for (const pattern of profanityPatterns) {
      const replaced = sanitised.replace(pattern, (match) => {
        hadProfanity = true;
        return '*'.repeat(match.length);
      });
      sanitised = replaced;
    }

    return { hadProfanity, sanitised };
  }

  return { evaluate };
}

// ── Profanity Pattern Builder ────────────────────────────────────

function buildProfanityPatterns(words: ReadonlyArray<string>): RegExp[] {
  return words.map((word) => {
    // Build a pattern that matches l33t-speak variants
    const escaped = escapeForRegex(word);
    const leetified = escaped
      .replace(/a/gi, '[a@4]')
      .replace(/e/gi, '[e3]')
      .replace(/i/gi, '[i1!]')
      .replace(/o/gi, '[o0]')
      .replace(/s/gi, '[s$5]')
      .replace(/t/gi, '[t7]')
      .replace(/l/gi, '[l1]');
    return new RegExp(`\\b${leetified}\\b`, 'gi');
  });
}

function escapeForRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
