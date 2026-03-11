/**
 * Content Moderation AI — Trust & Safety at scale.
 *
 * Real-time classification and escalation pipeline:
 *   - Chat toxicity: transformer-based classification (< 50ms)
 *   - Image moderation: NSFW detection on player-uploaded content
 *   - Behavior detection: griefing, harassment, market manipulation
 *   - Action escalation: warn → mute → suspend → ban with appeal
 *   - Player reporting: structured categories with evidence
 *   - Moderator dashboard: queue, history, audit trail
 *   - False positive monitoring: appeal rates drive accuracy improvements
 *   - Cultural context: region-aware moderation rules
 *
 * "The Dye House maintains the colour. No stain goes unchecked."
 */

import type { LoomEvent } from '@loom/events-contracts';

// ─── Ports ──────────────────────────────────────────────────────────

export interface ModerationClockPort {
  readonly now: () => bigint;
}

export interface ModerationIdPort {
  readonly next: () => string;
}

export interface ModerationLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface ModerationEventPort {
  readonly emit: (event: LoomEvent) => void;
}

export interface ToxicityClassifierPort {
  readonly classify: (text: string, language: string) => Promise<ToxicityResult>;
}

export interface ImageModerationPort {
  readonly scan: (imageUrl: string) => Promise<ImageScanResult>;
}

export interface BehaviorAnalysisPort {
  readonly analyzeActions: (playerId: string, actions: readonly PlayerAction[]) => Promise<BehaviorAnalysis>;
}

export interface ModerationStorePort {
  readonly storeReport: (report: PlayerReport) => Promise<void>;
  readonly getPlayerHistory: (playerId: string) => Promise<ModerationHistory>;
  readonly storeAction: (action: ModerationAction) => Promise<void>;
  readonly getQueue: (status: QueueStatus) => Promise<readonly QueueItem[]>;
  readonly updateQueueItem: (itemId: string, status: QueueStatus, moderatorId: string) => Promise<void>;
  readonly storeAppeal: (appeal: Appeal) => Promise<void>;
  readonly getAppeal: (appealId: string) => Promise<Appeal | undefined>;
}

// ─── Types ──────────────────────────────────────────────────────────

export type ToxicityCategory =
  | 'harassment'
  | 'hate-speech'
  | 'threat'
  | 'sexual'
  | 'self-harm'
  | 'spam'
  | 'scam'
  | 'clean';

export type ActionSeverity = 'warning' | 'mute' | 'suspend' | 'ban';

export type QueueStatus = 'pending' | 'reviewing' | 'resolved' | 'escalated';

export type ContentType = 'chat' | 'image' | 'username' | 'estate-name' | 'dynasty-crest';

export type ReportCategory =
  | 'toxic-chat'
  | 'harassment'
  | 'griefing'
  | 'market-manipulation'
  | 'exploiting'
  | 'inappropriate-content'
  | 'impersonation'
  | 'other';

export type BehaviorPattern =
  | 'griefing'
  | 'harassment-targeting'
  | 'market-manipulation'
  | 'exploit-abuse'
  | 'account-sharing'
  | 'bot-behavior'
  | 'normal';

export type CulturalRegion = 'global' | 'eu' | 'na' | 'jp' | 'kr' | 'cn' | 'sea' | 'latam';

export interface ToxicityResult {
  readonly text: string;
  readonly toxic: boolean;
  readonly category: ToxicityCategory;
  readonly confidence: number;
  readonly inferenceMs: number;
}

export interface ImageScanResult {
  readonly imageUrl: string;
  readonly safe: boolean;
  readonly categories: readonly ImageCategory[];
  readonly confidence: number;
}

export interface ImageCategory {
  readonly category: string;
  readonly score: number;
  readonly flagged: boolean;
}

export interface PlayerAction {
  readonly actionType: string;
  readonly targetId: string | undefined;
  readonly timestamp: bigint;
  readonly metadata: Record<string, unknown>;
}

export interface BehaviorAnalysis {
  readonly playerId: string;
  readonly patterns: readonly DetectedPattern[];
  readonly overallRisk: number;
  readonly analyzedAt: bigint;
}

export interface DetectedPattern {
  readonly pattern: BehaviorPattern;
  readonly confidence: number;
  readonly evidence: readonly string[];
  readonly timespan: number;
}

export interface PlayerReport {
  readonly reportId: string;
  readonly reporterId: string;
  readonly reportedPlayerId: string;
  readonly category: ReportCategory;
  readonly description: string;
  readonly evidence: readonly string[];
  readonly chatLogIds: readonly string[];
  readonly reportedAt: bigint;
}

export interface ModerationAction {
  readonly actionId: string;
  readonly playerId: string;
  readonly severity: ActionSeverity;
  readonly reason: string;
  readonly moderatorId: string;
  readonly expiresAt: bigint | undefined;
  readonly issuedAt: bigint;
  readonly automated: boolean;
}

export interface ModerationHistory {
  readonly playerId: string;
  readonly warnings: number;
  readonly mutes: number;
  readonly suspensions: number;
  readonly bans: number;
  readonly reports: number;
  readonly appeals: number;
  readonly successfulAppeals: number;
  readonly lastActionAt: bigint | undefined;
}

export interface QueueItem {
  readonly itemId: string;
  readonly reportId: string | undefined;
  readonly playerId: string;
  readonly contentType: ContentType;
  readonly content: string;
  readonly autoClassification: ToxicityCategory;
  readonly confidence: number;
  readonly status: QueueStatus;
  readonly assignedModeratorId: string | undefined;
  readonly createdAt: bigint;
}

export interface Appeal {
  readonly appealId: string;
  readonly actionId: string;
  readonly playerId: string;
  readonly reason: string;
  readonly status: 'pending' | 'reviewing' | 'upheld' | 'overturned';
  readonly reviewerId: string | undefined;
  readonly submittedAt: bigint;
  readonly resolvedAt: bigint | undefined;
}

export interface ModeratorStats {
  readonly totalReviewed: number;
  readonly averageReviewTimeMs: number;
  readonly overturned: number;
  readonly escalated: number;
}

export interface CulturalRuleSet {
  readonly region: CulturalRegion;
  readonly blockedTerms: readonly string[];
  readonly sensitiveTopics: readonly string[];
  readonly toxicityThreshold: number;
}

export interface FalsePositiveMetrics {
  readonly totalClassifications: number;
  readonly appealsSubmitted: number;
  readonly appealsOverturned: number;
  readonly falsePositiveRate: number;
  readonly categoryBreakdown: ReadonlyMap<ToxicityCategory, number>;
}

// ─── Config ─────────────────────────────────────────────────────────

export interface ContentModerationConfig {
  readonly toxicityThreshold: number;
  readonly autoActionThreshold: number;
  readonly maxWarningsBeforeMute: number;
  readonly maxMutesBeforeSuspend: number;
  readonly maxSuspendsBeforeBan: number;
  readonly muteDurationMs: number;
  readonly suspendDurationMs: number;
  readonly appealCooldownMs: number;
  readonly queueMaxPending: number;
  readonly culturalRules: readonly CulturalRuleSet[];
}

// ─── Stats ──────────────────────────────────────────────────────────

export interface ContentModerationStats {
  readonly messagesScanned: number;
  readonly messagesBlocked: number;
  readonly imagesScanned: number;
  readonly imagesBlocked: number;
  readonly reportsReceived: number;
  readonly actionsIssued: number;
  readonly appealsTotal: number;
  readonly appealsOverturned: number;
  readonly behaviorAnalyses: number;
  readonly falsePositiveRate: number;
}

// ─── Interface ──────────────────────────────────────────────────────

export interface ContentModerationEngine {
  // Real-time scanning
  readonly scanMessage: (playerId: string, text: string, region: CulturalRegion) => Promise<ToxicityResult>;
  readonly scanImage: (playerId: string, imageUrl: string) => Promise<ImageScanResult>;
  readonly analyzeBehavior: (playerId: string, actions: readonly PlayerAction[]) => Promise<BehaviorAnalysis>;

  // Reporting
  readonly submitReport: (report: Omit<PlayerReport, 'reportId' | 'reportedAt'>) => Promise<PlayerReport>;
  readonly getPlayerHistory: (playerId: string) => Promise<ModerationHistory>;

  // Actions
  readonly issueAction: (playerId: string, severity: ActionSeverity, reason: string, moderatorId: string) => Promise<ModerationAction>;
  readonly autoEscalate: (playerId: string, toxicityResult: ToxicityResult) => Promise<ModerationAction | undefined>;

  // Queue
  readonly getQueue: (status: QueueStatus) => Promise<readonly QueueItem[]>;
  readonly reviewItem: (itemId: string, moderatorId: string, decision: ActionSeverity | 'dismiss') => Promise<void>;

  // Appeals
  readonly submitAppeal: (actionId: string, playerId: string, reason: string) => Promise<Appeal>;
  readonly reviewAppeal: (appealId: string, reviewerId: string, overturn: boolean) => Promise<Appeal>;

  // Cultural
  readonly registerCulturalRules: (rules: CulturalRuleSet) => void;

  // Metrics
  readonly getFalsePositiveMetrics: () => FalsePositiveMetrics;
  readonly getStats: () => ContentModerationStats;
}

// ─── Deps ───────────────────────────────────────────────────────────

export interface ContentModerationDeps {
  readonly clock: ModerationClockPort;
  readonly id: ModerationIdPort;
  readonly log: ModerationLogPort;
  readonly events: ModerationEventPort;
  readonly toxicity: ToxicityClassifierPort;
  readonly imageMod: ImageModerationPort;
  readonly behavior: BehaviorAnalysisPort;
  readonly store: ModerationStorePort;
}

// ─── Defaults ───────────────────────────────────────────────────────

const DEFAULT_CONFIG: ContentModerationConfig = {
  toxicityThreshold: 0.7,
  autoActionThreshold: 0.95,
  maxWarningsBeforeMute: 3,
  maxMutesBeforeSuspend: 2,
  maxSuspendsBeforeBan: 2,
  muteDurationMs: 30 * 60 * 1000,
  suspendDurationMs: 7 * 24 * 60 * 60 * 1000,
  appealCooldownMs: 24 * 60 * 60 * 1000,
  queueMaxPending: 1000,
  culturalRules: [],
};

// ─── Factory ────────────────────────────────────────────────────────

export function createContentModerationEngine(
  deps: ContentModerationDeps,
  config: Partial<ContentModerationConfig> = {},
): ContentModerationEngine {
  const cfg: ContentModerationConfig = { ...DEFAULT_CONFIG, ...config };

  const culturalRules = new Map<CulturalRegion, CulturalRuleSet>();
  for (const rules of cfg.culturalRules) {
    culturalRules.set(rules.region, rules);
  }

  // Stats
  let messagesScanned = 0;
  let messagesBlocked = 0;
  let imagesScanned = 0;
  let imagesBlocked = 0;
  let reportsReceived = 0;
  let actionsIssued = 0;
  let appealsTotal = 0;
  let appealsOverturned = 0;
  let behaviorAnalyses = 0;
  let classifications = 0;

  async function scanMessage(
    playerId: string,
    text: string,
    region: CulturalRegion,
  ): Promise<ToxicityResult> {
    messagesScanned++;
    classifications++;

    // Check cultural rules first
    const rules = culturalRules.get(region) ?? culturalRules.get('global');
    if (rules !== undefined) {
      const lowerText = text.toLowerCase();
      for (const term of rules.blockedTerms) {
        if (lowerText.includes(term.toLowerCase())) {
          messagesBlocked++;
          return {
            text,
            toxic: true,
            category: 'harassment',
            confidence: 1.0,
            inferenceMs: 0,
          };
        }
      }
    }

    const result = await deps.toxicity.classify(text, region);

    const threshold = rules?.toxicityThreshold ?? cfg.toxicityThreshold;
    if (result.toxic && result.confidence >= threshold) {
      messagesBlocked++;
      deps.log.warn('toxic-message-detected', {
        playerId,
        category: result.category,
        confidence: result.confidence,
      });
    }

    return result;
  }

  async function scanImage(playerId: string, imageUrl: string): Promise<ImageScanResult> {
    imagesScanned++;
    const result = await deps.imageMod.scan(imageUrl);

    if (!result.safe) {
      imagesBlocked++;
      deps.log.warn('unsafe-image-detected', { playerId, confidence: result.confidence });
    }

    return result;
  }

  async function analyzeBehavior(
    playerId: string,
    actions: readonly PlayerAction[],
  ): Promise<BehaviorAnalysis> {
    behaviorAnalyses++;
    const analysis = await deps.behavior.analyzeActions(playerId, actions);

    for (const pattern of analysis.patterns) {
      if (pattern.pattern !== 'normal' && pattern.confidence >= cfg.toxicityThreshold) {
        deps.log.warn('suspicious-behavior-detected', {
          playerId,
          pattern: pattern.pattern,
          confidence: pattern.confidence,
        });
      }
    }

    return analysis;
  }

  async function submitReport(
    partial: Omit<PlayerReport, 'reportId' | 'reportedAt'>,
  ): Promise<PlayerReport> {
    const report: PlayerReport = {
      ...partial,
      reportId: deps.id.next(),
      reportedAt: deps.clock.now(),
    };

    await deps.store.storeReport(report);
    reportsReceived++;
    deps.log.info('report-submitted', {
      reportId: report.reportId,
      category: report.category,
      reportedPlayer: report.reportedPlayerId,
    });

    return report;
  }

  async function getPlayerHistory(playerId: string): Promise<ModerationHistory> {
    return deps.store.getPlayerHistory(playerId);
  }

  async function issueAction(
    playerId: string,
    severity: ActionSeverity,
    reason: string,
    moderatorId: string,
  ): Promise<ModerationAction> {
    const now = deps.clock.now();
    let expiresAt: bigint | undefined = undefined;

    if (severity === 'mute') {
      expiresAt = now + BigInt(cfg.muteDurationMs);
    } else if (severity === 'suspend') {
      expiresAt = now + BigInt(cfg.suspendDurationMs);
    }

    const action: ModerationAction = {
      actionId: deps.id.next(),
      playerId,
      severity,
      reason,
      moderatorId,
      expiresAt,
      issuedAt: now,
      automated: false,
    };

    await deps.store.storeAction(action);
    actionsIssued++;
    deps.log.info('moderation-action-issued', {
      actionId: action.actionId,
      playerId,
      severity,
      automated: false,
    });

    return action;
  }

  async function autoEscalate(
    playerId: string,
    toxicityResult: ToxicityResult,
  ): Promise<ModerationAction | undefined> {
    if (!toxicityResult.toxic || toxicityResult.confidence < cfg.autoActionThreshold) {
      return undefined;
    }

    const history = await deps.store.getPlayerHistory(playerId);
    let severity: ActionSeverity;

    if (history.suspensions >= cfg.maxSuspendsBeforeBan) {
      severity = 'ban';
    } else if (history.mutes >= cfg.maxMutesBeforeSuspend) {
      severity = 'suspend';
    } else if (history.warnings >= cfg.maxWarningsBeforeMute) {
      severity = 'mute';
    } else {
      severity = 'warning';
    }

    const now = deps.clock.now();
    let expiresAt: bigint | undefined = undefined;
    if (severity === 'mute') expiresAt = now + BigInt(cfg.muteDurationMs);
    if (severity === 'suspend') expiresAt = now + BigInt(cfg.suspendDurationMs);

    const action: ModerationAction = {
      actionId: deps.id.next(),
      playerId,
      severity,
      reason: `Auto-escalated: ${toxicityResult.category} (confidence: ${toxicityResult.confidence.toFixed(2)})`,
      moderatorId: 'system',
      expiresAt,
      issuedAt: now,
      automated: true,
    };

    await deps.store.storeAction(action);
    actionsIssued++;
    deps.log.info('auto-escalation', {
      actionId: action.actionId,
      playerId,
      severity,
      category: toxicityResult.category,
    });

    return action;
  }

  async function getQueue(status: QueueStatus): Promise<readonly QueueItem[]> {
    return deps.store.getQueue(status);
  }

  async function reviewItem(
    itemId: string,
    moderatorId: string,
    decision: ActionSeverity | 'dismiss',
  ): Promise<void> {
    await deps.store.updateQueueItem(itemId, 'resolved', moderatorId);

    if (decision !== 'dismiss') {
      deps.log.info('queue-item-actioned', { itemId, moderatorId, decision });
    } else {
      deps.log.info('queue-item-dismissed', { itemId, moderatorId });
    }
  }

  async function submitAppeal(
    actionId: string,
    playerId: string,
    reason: string,
  ): Promise<Appeal> {
    const appeal: Appeal = {
      appealId: deps.id.next(),
      actionId,
      playerId,
      reason,
      status: 'pending',
      reviewerId: undefined,
      submittedAt: deps.clock.now(),
      resolvedAt: undefined,
    };

    await deps.store.storeAppeal(appeal);
    appealsTotal++;
    deps.log.info('appeal-submitted', { appealId: appeal.appealId, actionId, playerId });
    return appeal;
  }

  async function reviewAppeal(
    appealId: string,
    reviewerId: string,
    overturn: boolean,
  ): Promise<Appeal> {
    const appeal = await deps.store.getAppeal(appealId);
    if (appeal === undefined) throw new Error(`Appeal ${appealId} not found`);

    const resolved: Appeal = {
      ...appeal,
      status: overturn ? 'overturned' : 'upheld',
      reviewerId,
      resolvedAt: deps.clock.now(),
    };

    await deps.store.storeAppeal(resolved);
    if (overturn) {
      appealsOverturned++;
    }

    deps.log.info('appeal-reviewed', { appealId, overturn, reviewerId });
    return resolved;
  }

  function registerCulturalRules(rules: CulturalRuleSet): void {
    culturalRules.set(rules.region, rules);
    deps.log.info('cultural-rules-registered', { region: rules.region, termCount: rules.blockedTerms.length });
  }

  function getFalsePositiveMetrics(): FalsePositiveMetrics {
    return {
      totalClassifications: classifications,
      appealsSubmitted: appealsTotal,
      appealsOverturned,
      falsePositiveRate: classifications > 0 ? appealsOverturned / classifications : 0,
      categoryBreakdown: new Map(),
    };
  }

  function getStats(): ContentModerationStats {
    return {
      messagesScanned,
      messagesBlocked,
      imagesScanned,
      imagesBlocked,
      reportsReceived,
      actionsIssued,
      appealsTotal,
      appealsOverturned,
      behaviorAnalyses,
      falsePositiveRate: classifications > 0 ? appealsOverturned / classifications : 0,
    };
  }

  deps.log.info('content-moderation-engine-created', {
    toxicityThreshold: cfg.toxicityThreshold,
    autoActionThreshold: cfg.autoActionThreshold,
    culturalRegions: culturalRules.size,
  });

  return {
    scanMessage,
    scanImage,
    analyzeBehavior,
    submitReport,
    getPlayerHistory,
    issueAction,
    autoEscalate,
    getQueue,
    reviewItem,
    submitAppeal,
    reviewAppeal,
    registerCulturalRules,
    getFalsePositiveMetrics,
    getStats,
  };
}
