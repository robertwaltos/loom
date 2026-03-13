/**
 * Koydo Worlds — Database Row Mappers
 *
 * Bidirectional mappers between database row types (snake_case) and
 * domain types (camelCase). All I/O with Supabase passes through here.
 *
 * rowToDomain — after SELECT: convert DB row → app domain type
 * domainToRow — before INSERT/UPDATE: convert domain type → DB row
 */

import type {
  RealWorldEntry,
  EntryConnection,
  EntryCurriculumMap,
  EntryMediaAsset,
  EntryQuizQuestion,
  DifficultyTier,
  GeoLocation,
} from '../content/types.js';

import type {
  WorldLuminance,
  WorldLuminanceLogEntry,
  FadingStage,
} from '../worlds/types.js';

import type {
  KindlerProfile,
  KindlerProgress,
  SparkLogEntry,
  KindlerSession,
  SessionReport,
  Chapter,
  AgeTier,
  SparkCause,
} from '../kindler/types.js';

import type { AiConversationSession } from '../safety/types.js';

import type {
  RevenueEvent,
  RoyaltyLedgerEntry,
  RevenueEventType,
  RevenuePlatform,
  PaymentProcessor,
  RoyaltyPaymentStatus,
} from '../revenue/types.js';

import type {
  RealWorldEntryRow,
  EntryConnectionRow,
  EntryCurriculumMapRow,
  EntryMediaAssetRow,
  EntryQuizQuestionRow,
  WorldLuminanceRow,
  WorldLuminanceLogRow,
  KindlerProfileRow,
  KindlerProgressRow,
  KindlerSparkLogRow,
  KindlerSessionRow,
  SessionReportRow,
  AiConversationSessionRow,
  RevenueEventRow,
  RoyaltyLedgerRow,
} from './row-types.js';

// ─── Content Mappers ───────────────────────────────────────────────

export function realWorldEntryFromRow(row: RealWorldEntryRow): RealWorldEntry {
  return {
    id: row.id,
    type: row.type as RealWorldEntry['type'],
    title: row.title,
    year: row.year,
    yearDisplay: row.year_display,
    era: row.era as RealWorldEntry['era'],
    descriptionChild: row.description_child,
    descriptionOlder: row.description_older,
    descriptionParent: row.description_parent,
    realPeople: row.real_people,
    quote: row.quote,
    quoteAttribution: row.quote_attribution,
    geographicLocation: row.geographic_location as GeoLocation | null,
    continent: row.continent,
    subjectTags: row.subject_tags,
    worldId: row.world_id,
    guideId: row.guide_id,
    adventureType: row.adventure_type as RealWorldEntry['adventureType'],
    difficultyTier: row.difficulty_tier as DifficultyTier,
    prerequisites: row.prerequisites,
    unlocks: row.unlocks,
    funFact: row.fun_fact,
    imagePrompt: row.image_prompt,
    status: row.status as RealWorldEntry['status'],
  };
}

export function realWorldEntryToRow(entry: RealWorldEntry): RealWorldEntryRow {
  return {
    id: entry.id,
    type: entry.type,
    title: entry.title,
    year: entry.year,
    year_display: entry.yearDisplay,
    era: entry.era,
    description_child: entry.descriptionChild,
    description_older: entry.descriptionOlder,
    description_parent: entry.descriptionParent,
    real_people: entry.realPeople,
    quote: entry.quote,
    quote_attribution: entry.quoteAttribution,
    geographic_location: entry.geographicLocation,
    continent: entry.continent,
    subject_tags: entry.subjectTags,
    world_id: entry.worldId,
    guide_id: entry.guideId,
    adventure_type: entry.adventureType,
    difficulty_tier: entry.difficultyTier,
    prerequisites: entry.prerequisites,
    unlocks: entry.unlocks,
    fun_fact: entry.funFact,
    image_prompt: entry.imagePrompt,
    status: entry.status,
  };
}

export function entryConnectionFromRow(row: EntryConnectionRow): EntryConnection {
  return {
    id: row.id,
    fromEntryId: row.from_entry_id,
    toEntryId: row.to_entry_id,
    connectionType: row.connection_type,
  };
}

export function entryConnectionToRow(conn: EntryConnection): EntryConnectionRow {
  return {
    id: conn.id,
    from_entry_id: conn.fromEntryId,
    to_entry_id: conn.toEntryId,
    connection_type: conn.connectionType,
  };
}

export function entryCurriculumMapFromRow(row: EntryCurriculumMapRow): EntryCurriculumMap {
  return {
    id: row.id,
    entryId: row.entry_id,
    standard: row.standard,
    standardCode: row.standard_code,
    description: row.description,
  };
}

export function entryCurriculumMapToRow(map: EntryCurriculumMap): EntryCurriculumMapRow {
  return {
    id: map.id,
    entry_id: map.entryId,
    standard: map.standard,
    standard_code: map.standardCode,
    description: map.description,
  };
}

export function entryMediaAssetFromRow(row: EntryMediaAssetRow): EntryMediaAsset {
  return {
    id: row.id,
    entryId: row.entry_id,
    assetType: row.asset_type,
    url: row.url,
    generatedAt: row.generated_at,
    provider: row.provider,
  };
}

export function entryMediaAssetToRow(asset: EntryMediaAsset): EntryMediaAssetRow {
  return {
    id: asset.id,
    entry_id: asset.entryId,
    asset_type: asset.assetType,
    url: asset.url,
    generated_at: asset.generatedAt,
    provider: asset.provider,
  };
}

export function entryQuizQuestionFromRow(row: EntryQuizQuestionRow): EntryQuizQuestion {
  return {
    id: row.id,
    entryId: row.entry_id,
    difficultyTier: row.difficulty_tier as DifficultyTier,
    question: row.question,
    options: row.options,
    correctIndex: row.correct_index,
    explanation: row.explanation,
  };
}

export function entryQuizQuestionToRow(q: EntryQuizQuestion): EntryQuizQuestionRow {
  return {
    id: q.id,
    entry_id: q.entryId,
    difficulty_tier: q.difficultyTier,
    question: q.question,
    options: q.options,
    correct_index: q.correctIndex,
    explanation: q.explanation,
  };
}

// ─── World State Mappers ───────────────────────────────────────────

export function worldLuminanceFromRow(row: WorldLuminanceRow): WorldLuminance {
  return {
    worldId: row.world_id,
    luminance: row.luminance,
    stage: row.stage as FadingStage,
    lastRestoredAt: row.last_restored_at,
    totalKindlersContributed: row.total_kindlers_contributed,
    activeKindlerCount: row.active_kindler_count,
  };
}

export function worldLuminanceToRow(lum: WorldLuminance): WorldLuminanceRow {
  return {
    world_id: lum.worldId,
    luminance: lum.luminance,
    stage: lum.stage,
    last_restored_at: lum.lastRestoredAt,
    total_kindlers_contributed: lum.totalKindlersContributed,
    active_kindler_count: lum.activeKindlerCount,
  };
}

export function worldLuminanceLogFromRow(row: WorldLuminanceLogRow): WorldLuminanceLogEntry {
  return {
    id: row.id,
    worldId: row.world_id,
    luminance: row.luminance,
    stage: row.stage as FadingStage,
    delta: row.delta,
    cause: row.cause,
    timestamp: row.timestamp,
  };
}

export function worldLuminanceLogToRow(entry: WorldLuminanceLogEntry): WorldLuminanceLogRow {
  return {
    id: entry.id,
    world_id: entry.worldId,
    luminance: entry.luminance,
    stage: entry.stage,
    delta: entry.delta,
    cause: entry.cause,
    timestamp: entry.timestamp,
  };
}

// ─── Player Mappers ────────────────────────────────────────────────

/**
 * Maps KindlerProfileRow to the parts of KindlerProfile that are stored in
 * the kindler_profiles table. email / hashedPassword / childProfiles are
 * Supabase Auth or derived data — not in this row.
 */
export function kindlerProfileFromRow(row: KindlerProfileRow): KindlerProfile {
  return {
    id: row.id,
    parentAccountId: row.parent_account_id,
    displayName: row.display_name,
    ageTier: row.age_tier as AgeTier,
    avatarId: row.avatar_id,
    sparkLevel: row.spark_level,
    currentChapter: row.current_chapter as Chapter,
    worldsVisited: row.worlds_visited,
    worldsRestored: row.worlds_restored,
    guidesMetCount: row.guides_met_count,
    createdAt: row.created_at,
  };
}

export function kindlerProfileToRow(profile: KindlerProfile): KindlerProfileRow {
  return {
    id: profile.id,
    parent_account_id: profile.parentAccountId,
    display_name: profile.displayName,
    age_tier: profile.ageTier,
    avatar_id: profile.avatarId,
    spark_level: profile.sparkLevel,
    current_chapter: profile.currentChapter,
    worlds_visited: profile.worldsVisited,
    worlds_restored: profile.worldsRestored,
    guides_met_count: profile.guidesMetCount,
    created_at: profile.createdAt,
  };
}

export function kindlerProgressFromRow(row: KindlerProgressRow): KindlerProgress {
  return {
    id: row.id,
    kindlerId: row.kindler_id,
    entryId: row.entry_id,
    completedAt: row.completed_at,
    adventureType: row.adventure_type,
    score: row.score,
  };
}

export function kindlerProgressToRow(progress: KindlerProgress): KindlerProgressRow {
  return {
    id: progress.id,
    kindler_id: progress.kindlerId,
    entry_id: progress.entryId,
    completed_at: progress.completedAt,
    adventure_type: progress.adventureType,
    score: progress.score,
  };
}

export function sparkLogFromRow(row: KindlerSparkLogRow): SparkLogEntry {
  return {
    id: row.id,
    kindlerId: row.kindler_id,
    sparkLevel: row.spark_level,
    delta: row.delta,
    cause: row.cause as SparkCause,
    timestamp: row.timestamp,
  };
}

export function sparkLogToRow(entry: SparkLogEntry): KindlerSparkLogRow {
  return {
    id: entry.id,
    kindler_id: entry.kindlerId,
    spark_level: entry.sparkLevel,
    delta: entry.delta,
    cause: entry.cause,
    timestamp: entry.timestamp,
  };
}

export function kindlerSessionFromRow(row: KindlerSessionRow): KindlerSession {
  return {
    id: row.id,
    kindlerId: row.kindler_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    worldsVisited: row.worlds_visited,
    guidesInteracted: row.guides_interacted,
    entriesCompleted: row.entries_completed,
    sparkDelta: row.spark_delta,
  };
}

export function kindlerSessionToRow(session: KindlerSession): KindlerSessionRow {
  return {
    id: session.id,
    kindler_id: session.kindlerId,
    started_at: session.startedAt,
    ended_at: session.endedAt,
    worlds_visited: session.worldsVisited,
    guides_interacted: session.guidesInteracted,
    entries_completed: session.entriesCompleted,
    spark_delta: session.sparkDelta,
  };
}

export function sessionReportFromRow(row: SessionReportRow): SessionReport {
  return {
    id: row.id,
    sessionId: row.session_id,
    kindlerId: row.kindler_id,
    summary: row.summary,
    worldsExplored: row.worlds_explored,
    subjectsAddressed: row.subjects_addressed,
    generatedAt: row.generated_at,
  };
}

export function sessionReportToRow(report: SessionReport): SessionReportRow {
  return {
    id: report.id,
    session_id: report.sessionId,
    kindler_id: report.kindlerId,
    summary: report.summary,
    worlds_explored: report.worldsExplored,
    subjects_addressed: report.subjectsAddressed,
    generated_at: report.generatedAt,
  };
}

// ─── Safety Mapper ─────────────────────────────────────────────────

export function aiSessionFromRow(row: AiConversationSessionRow): AiConversationSession {
  return {
    id: row.id,
    kindlerId: row.kindler_id,
    characterId: row.character_id,
    worldId: row.world_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    turnCount: row.turn_count,
    autoDeleteAt: row.auto_delete_at,
  };
}

export function aiSessionToRow(session: AiConversationSession): AiConversationSessionRow {
  return {
    id: session.id,
    kindler_id: session.kindlerId,
    character_id: session.characterId,
    world_id: session.worldId,
    started_at: session.startedAt,
    ended_at: session.endedAt,
    turn_count: session.turnCount,
    auto_delete_at: session.autoDeleteAt,
  };
}

// ─── Revenue Mappers ───────────────────────────────────────────────

export function revenueEventFromRow(row: RevenueEventRow): RevenueEvent {
  return {
    id: row.id,
    eventType: row.event_type as RevenueEventType,
    grossAmountUsd: row.gross_amount_usd,
    netAmountUsd: row.net_amount_usd,
    platform: row.platform as RevenuePlatform,
    paymentProcessor: row.payment_processor as PaymentProcessor,
    userId: row.user_id,
    transactionId: row.transaction_id,
    createdAt: row.created_at,
  };
}

export function revenueEventToRow(event: RevenueEvent): RevenueEventRow {
  return {
    id: event.id,
    event_type: event.eventType,
    gross_amount_usd: event.grossAmountUsd,
    net_amount_usd: event.netAmountUsd,
    platform: event.platform,
    payment_processor: event.paymentProcessor,
    user_id: event.userId,
    transaction_id: event.transactionId,
    created_at: event.createdAt,
  };
}

export function royaltyLedgerFromRow(row: RoyaltyLedgerRow): RoyaltyLedgerEntry {
  return {
    id: row.id,
    quarter: row.quarter,
    totalGrossRevenue: row.total_gross_revenue,
    epicStoreRevenue: row.epic_store_revenue,
    royaltyEligibleRevenue: row.royalty_eligible_revenue,
    cumulativeLifetimeGross: row.cumulative_lifetime_gross,
    royaltyRate: row.royalty_rate,
    royaltyOwed: row.royalty_owed,
    thresholdNote: row.threshold_note,
    reportSubmitted: row.report_submitted,
    reportSubmittedAt: row.report_submitted_at,
    paymentStatus: row.payment_status as RoyaltyPaymentStatus,
    createdAt: row.created_at,
  };
}

export function royaltyLedgerToRow(entry: RoyaltyLedgerEntry): RoyaltyLedgerRow {
  return {
    id: entry.id,
    quarter: entry.quarter,
    total_gross_revenue: entry.totalGrossRevenue,
    epic_store_revenue: entry.epicStoreRevenue,
    royalty_eligible_revenue: entry.royaltyEligibleRevenue,
    cumulative_lifetime_gross: entry.cumulativeLifetimeGross,
    royalty_rate: entry.royaltyRate,
    royalty_owed: entry.royaltyOwed,
    threshold_note: entry.thresholdNote,
    report_submitted: entry.reportSubmitted,
    report_submitted_at: entry.reportSubmittedAt,
    payment_status: entry.paymentStatus,
    created_at: entry.createdAt,
  };
}
