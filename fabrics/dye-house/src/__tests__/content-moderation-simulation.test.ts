import { describe, it, expect, vi } from 'vitest';
import { createContentModerationEngine } from '../content-moderation.js';
import type {
  ContentModerationDeps,
  CulturalRegion,
  ModerationAction,
  ModerationHistory,
  PlayerReport,
  QueueItem,
  QueueStatus,
  ToxicityResult,
} from '../content-moderation.js';

function makeClock(start = 1_000n) {
  let nowValue = start;
  return {
    now: () => nowValue,
    advance: (delta: bigint) => {
      nowValue += delta;
    },
  };
}

function makeIdPort(prefix = 'id') {
  let index = 0;
  return {
    next: () => `${prefix}-${++index}`,
  };
}

function makeHistory(overrides: Partial<ModerationHistory> = {}): ModerationHistory {
  return {
    playerId: 'player-a',
    warnings: 0,
    mutes: 0,
    suspensions: 0,
    bans: 0,
    reports: 0,
    appeals: 0,
    successfulAppeals: 0,
    lastActionAt: undefined,
    ...overrides,
  };
}

function makeDeps() {
  const clock = makeClock();
  const reports: PlayerReport[] = [];
  const actions: ModerationAction[] = [];
  const appeals = new Map<string, {
    appealId: string;
    actionId: string;
    playerId: string;
    reason: string;
    status: 'pending' | 'reviewing' | 'upheld' | 'overturned';
    reviewerId: string | undefined;
    submittedAt: bigint;
    resolvedAt: bigint | undefined;
  }>();
  const queueUpdates: Array<{ itemId: string; status: QueueStatus; moderatorId: string }> = [];
  const histories = new Map<string, ModerationHistory>();

  const log = {
    info: vi.fn<(msg: string, ctx?: Record<string, unknown>) => void>(),
    warn: vi.fn<(msg: string, ctx?: Record<string, unknown>) => void>(),
    error: vi.fn<(msg: string, ctx?: Record<string, unknown>) => void>(),
  };

  const deps: ContentModerationDeps = {
    clock,
    id: makeIdPort('mod'),
    log,
    events: {
      emit: () => undefined,
    },
    toxicity: {
      classify: vi.fn(async (text: string, _language: string): Promise<ToxicityResult> => ({
        text,
        toxic: false,
        category: 'clean',
        confidence: 0.1,
        inferenceMs: 4,
      })),
    },
    imageMod: {
      scan: vi.fn(async (imageUrl: string) => ({
        imageUrl,
        safe: true,
        categories: [],
        confidence: 0.1,
      })),
    },
    behavior: {
      analyzeActions: vi.fn(async (playerId: string, _actions) => ({
        playerId,
        patterns: [{ pattern: 'normal', confidence: 0.2, evidence: [], timespan: 60 }],
        overallRisk: 0.2,
        analyzedAt: clock.now(),
      })),
    },
    store: {
      storeReport: vi.fn(async (report: PlayerReport) => {
        reports.push(report);
      }),
      getPlayerHistory: vi.fn(async (playerId: string) => histories.get(playerId) ?? makeHistory({ playerId })),
      storeAction: vi.fn(async (action: ModerationAction) => {
        actions.push(action);
      }),
      getQueue: vi.fn(async (_status: QueueStatus): Promise<readonly QueueItem[]> => []),
      updateQueueItem: vi.fn(async (itemId: string, status: QueueStatus, moderatorId: string) => {
        queueUpdates.push({ itemId, status, moderatorId });
      }),
      storeAppeal: vi.fn(async (appeal) => {
        appeals.set(appeal.appealId, appeal);
      }),
      getAppeal: vi.fn(async (appealId: string) => appeals.get(appealId)),
    },
  };

  return { deps, clock, log, reports, actions, appeals, queueUpdates, histories };
}

describe('Content Moderation Simulation', () => {
  it('blocks messages immediately when cultural blocked term matches', async () => {
    const { deps } = makeDeps();
    const engine = createContentModerationEngine(deps, {
      culturalRules: [{ region: 'global', blockedTerms: ['forbidden'], sensitiveTopics: [], toxicityThreshold: 0.7 }],
    });

    const result = await engine.scanMessage('player-a', 'This is FORBIDDEN text', 'na');

    expect(result.toxic).toBe(true);
    expect(result.category).toBe('harassment');
    expect(result.confidence).toBe(1);
    expect(deps.toxicity.classify).not.toHaveBeenCalled();
    expect(engine.getStats().messagesBlocked).toBe(1);
  });

  it('uses toxicity classifier when no cultural term blocks the message', async () => {
    const { deps } = makeDeps();
    deps.toxicity.classify = vi.fn(async () => ({
      text: 'hello',
      toxic: true,
      category: 'harassment',
      confidence: 0.8,
      inferenceMs: 12,
    }));

    const engine = createContentModerationEngine(deps, {
      toxicityThreshold: 0.75,
    });

    const result = await engine.scanMessage('player-a', 'hello', 'eu');

    expect(result.toxic).toBe(true);
    expect(deps.log.warn).toHaveBeenCalledWith(
      'toxic-message-detected',
      expect.objectContaining({ playerId: 'player-a', category: 'harassment' }),
    );
    expect(engine.getStats().messagesBlocked).toBe(1);
  });

  it('registers new cultural rules at runtime and applies their regional threshold', async () => {
    const { deps } = makeDeps();
    deps.toxicity.classify = vi.fn(async () => ({
      text: 'contextual text',
      toxic: true,
      category: 'hate-speech',
      confidence: 0.6,
      inferenceMs: 20,
    }));

    const engine = createContentModerationEngine(deps, { toxicityThreshold: 0.7 });
    engine.registerCulturalRules({
      region: 'kr',
      blockedTerms: [],
      sensitiveTopics: ['topic-a'],
      toxicityThreshold: 0.55,
    });

    await engine.scanMessage('player-a', 'contextual text', 'kr');

    expect(engine.getStats().messagesBlocked).toBe(1);
    expect(deps.log.info).toHaveBeenCalledWith(
      'cultural-rules-registered',
      expect.objectContaining({ region: 'kr' }),
    );
  });

  it('records unsafe image scans and increments blocked image stat', async () => {
    const { deps } = makeDeps();
    deps.imageMod.scan = vi.fn(async (imageUrl: string) => ({
      imageUrl,
      safe: false,
      categories: [{ category: 'nsfw', score: 0.97, flagged: true }],
      confidence: 0.97,
    }));

    const engine = createContentModerationEngine(deps);
    const scan = await engine.scanImage('player-a', 'https://img.example/pic.png');

    expect(scan.safe).toBe(false);
    expect(deps.log.warn).toHaveBeenCalledWith(
      'unsafe-image-detected',
      expect.objectContaining({ playerId: 'player-a' }),
    );
    expect(engine.getStats().imagesBlocked).toBe(1);
  });

  it('flags suspicious non-normal behavior patterns above threshold', async () => {
    const { deps } = makeDeps();
    deps.behavior.analyzeActions = vi.fn(async (playerId: string) => ({
      playerId,
      patterns: [
        { pattern: 'market-manipulation', confidence: 0.93, evidence: ['pattern-1'], timespan: 120 },
        { pattern: 'normal', confidence: 0.2, evidence: [], timespan: 10 },
      ],
      overallRisk: 0.7,
      analyzedAt: 2_000n,
    }));

    const engine = createContentModerationEngine(deps, { toxicityThreshold: 0.7 });
    const analysis = await engine.analyzeBehavior('player-z', []);

    expect(analysis.patterns[0]?.pattern).toBe('market-manipulation');
    expect(deps.log.warn).toHaveBeenCalledWith(
      'suspicious-behavior-detected',
      expect.objectContaining({ playerId: 'player-z', pattern: 'market-manipulation' }),
    );
    expect(engine.getStats().behaviorAnalyses).toBe(1);
  });

  it('stores reports with generated id and clock timestamp', async () => {
    const { deps, reports } = makeDeps();
    const engine = createContentModerationEngine(deps);

    const stored = await engine.submitReport({
      reporterId: 'reporter-1',
      reportedPlayerId: 'target-1',
      category: 'harassment',
      description: 'target repeated abuse',
      evidence: ['clip-1'],
      chatLogIds: ['chat-1'],
    });

    expect(stored.reportId).toBe('mod-1');
    expect(stored.reportedAt).toBe(1_000n);
    expect(reports).toHaveLength(1);
    expect(engine.getStats().reportsReceived).toBe(1);
  });

  it('issues timed mute actions with deterministic expiry', async () => {
    const { deps, actions } = makeDeps();
    const engine = createContentModerationEngine(deps, { muteDurationMs: 60_000 });

    const action = await engine.issueAction('player-1', 'mute', 'spam', 'mod-operator');

    expect(action.expiresAt).toBe(61_000n);
    expect(action.automated).toBe(false);
    expect(actions).toHaveLength(1);
    expect(engine.getStats().actionsIssued).toBe(1);
  });

  it('returns undefined for autoEscalate when confidence is below auto-action threshold', async () => {
    const { deps } = makeDeps();
    const engine = createContentModerationEngine(deps, { autoActionThreshold: 0.95 });

    const result = await engine.autoEscalate('player-a', {
      text: 'borderline',
      toxic: true,
      category: 'spam',
      confidence: 0.9,
      inferenceMs: 7,
    });

    expect(result).toBeUndefined();
    expect(engine.getStats().actionsIssued).toBe(0);
  });

  it('auto-escalates to ban when prior suspensions exceed configured threshold', async () => {
    const { deps, actions, histories } = makeDeps();
    histories.set('player-risk', makeHistory({ playerId: 'player-risk', suspensions: 3 }));

    const engine = createContentModerationEngine(deps, {
      autoActionThreshold: 0.9,
      maxSuspendsBeforeBan: 2,
    });

    const action = await engine.autoEscalate('player-risk', {
      text: 'extreme abuse',
      toxic: true,
      category: 'threat',
      confidence: 0.99,
      inferenceMs: 8,
    });

    expect(action?.severity).toBe('ban');
    expect(action?.moderatorId).toBe('system');
    expect(action?.automated).toBe(true);
    expect(actions).toHaveLength(1);
  });

  it('reviews queue items as resolved with moderator id', async () => {
    const { deps, queueUpdates } = makeDeps();
    const engine = createContentModerationEngine(deps);

    await engine.reviewItem('queue-1', 'moderator-7', 'dismiss');

    expect(queueUpdates).toEqual([{ itemId: 'queue-1', status: 'resolved', moderatorId: 'moderator-7' }]);
    expect(deps.log.info).toHaveBeenCalledWith(
      'queue-item-dismissed',
      expect.objectContaining({ itemId: 'queue-1' }),
    );
  });

  it('throws on reviewAppeal when appeal does not exist', async () => {
    const { deps } = makeDeps();
    const engine = createContentModerationEngine(deps);

    await expect(engine.reviewAppeal('missing-appeal', 'reviewer-1', true)).rejects.toThrow(
      'Appeal missing-appeal not found',
    );
  });

  it('tracks appeal metrics and false-positive rate from overturned appeals', async () => {
    const { deps, clock } = makeDeps();
    deps.toxicity.classify = vi.fn(async () => ({
      text: 'classified',
      toxic: true,
      category: 'harassment',
      confidence: 0.99,
      inferenceMs: 2,
    }));

    const engine = createContentModerationEngine(deps);

    await engine.scanMessage('player-a', 'classified', 'global' as CulturalRegion);
    const appeal = await engine.submitAppeal('action-1', 'player-a', 'this was context');
    clock.advance(50n);
    const reviewed = await engine.reviewAppeal(appeal.appealId, 'reviewer-2', true);

    expect(reviewed.status).toBe('overturned');
    expect(reviewed.resolvedAt).toBe(1_050n);

    const fp = engine.getFalsePositiveMetrics();
    expect(fp.appealsOverturned).toBe(1);
    expect(fp.totalClassifications).toBe(1);
    expect(fp.falsePositiveRate).toBe(1);

    expect(engine.getStats().appealsOverturned).toBe(1);
  });
});
