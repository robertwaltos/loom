/**
 * Tests — Database Row Mappers
 *
 * Verifies every rowToDomain and domainToRow function round-trips
 * correctly, with special attention to snake_case↔camelCase fields
 * and nullable/optional column handling.
 */

import { describe, it, expect } from 'vitest';
import {
  realWorldEntryFromRow,
  realWorldEntryToRow,
  entryConnectionFromRow,
  entryConnectionToRow,
  entryCurriculumMapFromRow,
  entryCurriculumMapToRow,
  entryMediaAssetFromRow,
  entryMediaAssetToRow,
  entryQuizQuestionFromRow,
  entryQuizQuestionToRow,
  worldLuminanceFromRow,
  worldLuminanceToRow,
  worldLuminanceLogFromRow,
  worldLuminanceLogToRow,
  kindlerProfileFromRow,
  kindlerProfileToRow,
  kindlerProgressFromRow,
  kindlerProgressToRow,
  sparkLogFromRow,
  sparkLogToRow,
  kindlerSessionFromRow,
  kindlerSessionToRow,
  sessionReportFromRow,
  sessionReportToRow,
  aiSessionFromRow,
  aiSessionToRow,
  revenueEventFromRow,
  revenueEventToRow,
  royaltyLedgerFromRow,
  royaltyLedgerToRow,
} from '../universe/db/mappers.js';

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
} from '../universe/db/row-types.js';

// ─── Fixture Factories ─────────────────────────────────────────────

function entryRow(overrides: Partial<RealWorldEntryRow> = {}): RealWorldEntryRow {
  return {
    id: 'entry-fibonacci',
    type: 'event',
    title: 'Fibonacci Rabbit Problem',
    year: 1202,
    year_display: 'c. 1202 CE',
    era: 'medieval',
    description_child: 'A rabbit story about numbers.',
    description_older: 'Leonardo Fibonacci introduced a famous sequence.',
    description_parent: 'The Fibonacci sequence has applications in nature.',
    real_people: ['Leonardo Fibonacci'],
    quote: 'How many pairs of rabbits?',
    quote_attribution: 'Liber Abaci',
    geographic_location: { lat: 43.72, lng: 10.40, name: 'Pisa, Italy' },
    continent: 'Europe',
    subject_tags: ['math', 'sequences'],
    world_id: 'number-garden',
    guide_id: 'professor-nimbus',
    adventure_type: 'remembrance_wall',
    difficulty_tier: 2,
    prerequisites: ['entry-arabic-numerals'],
    unlocks: ['entry-golden-ratio'],
    fun_fact: 'Sunflowers grow in Fibonacci spirals.',
    image_prompt: 'Medieval scholar with rabbits and spiral patterns',
    status: 'published',
    ...overrides,
  };
}

// ─── RealWorldEntry ────────────────────────────────────────────────

describe('realWorldEntryFromRow', () => {
  const row = entryRow();
  const domain = realWorldEntryFromRow(row);

  it('maps snake_case fields to camelCase', () => {
    expect(domain.yearDisplay).toBe(row.year_display);
    expect(domain.descriptionChild).toBe(row.description_child);
    expect(domain.descriptionOlder).toBe(row.description_older);
    expect(domain.descriptionParent).toBe(row.description_parent);
    expect(domain.realPeople).toEqual(row.real_people);
    expect(domain.quoteAttribution).toBe(row.quote_attribution);
    expect(domain.geographicLocation).toEqual(row.geographic_location);
    expect(domain.subjectTags).toEqual(row.subject_tags);
    expect(domain.worldId).toBe(row.world_id);
    expect(domain.guideId).toBe(row.guide_id);
    expect(domain.adventureType).toBe(row.adventure_type);
    expect(domain.difficultyTier).toBe(row.difficulty_tier);
    expect(domain.funFact).toBe(row.fun_fact);
    expect(domain.imagePrompt).toBe(row.image_prompt);
  });

  it('preserves passthrough fields', () => {
    expect(domain.id).toBe(row.id);
    expect(domain.year).toBe(row.year);
    expect(domain.quote).toBe(row.quote);
    expect(domain.continent).toBe(row.continent);
    expect(domain.status).toBe(row.status);
  });

  it('handles null geographicLocation', () => {
    const r = realWorldEntryFromRow(entryRow({ geographic_location: null }));
    expect(r.geographicLocation).toBeNull();
  });

  it('handles null year', () => {
    const r = realWorldEntryFromRow(entryRow({ year: null }));
    expect(r.year).toBeNull();
  });
});

describe('realWorldEntryToRow round-trip', () => {
  it('rowToDomain → domainToRow produces identical row', () => {
    const row = entryRow();
    expect(realWorldEntryToRow(realWorldEntryFromRow(row))).toEqual(row);
  });
});

// ─── EntryConnection ───────────────────────────────────────────────

describe('entryConnectionFromRow', () => {
  const row: EntryConnectionRow = {
    id: 'conn-1',
    from_entry_id: 'entry-a',
    to_entry_id: 'entry-b',
    connection_type: 'prerequisite',
  };

  it('maps snake_case to camelCase', () => {
    const domain = entryConnectionFromRow(row);
    expect(domain.fromEntryId).toBe('entry-a');
    expect(domain.toEntryId).toBe('entry-b');
    expect(domain.connectionType).toBe('prerequisite');
  });

  it('round-trips', () => {
    expect(entryConnectionToRow(entryConnectionFromRow(row))).toEqual(row);
  });
});

// ─── EntryCurriculumMap ────────────────────────────────────────────

describe('entryCurriculumMapFromRow', () => {
  const row: EntryCurriculumMapRow = {
    id: 'map-1',
    entry_id: 'entry-fibonacci',
    standard: 'common_core',
    standard_code: '4.OA.C.5',
    description: 'Generate a number pattern.',
  };

  it('maps snake_case to camelCase', () => {
    const domain = entryCurriculumMapFromRow(row);
    expect(domain.entryId).toBe('entry-fibonacci');
    expect(domain.standardCode).toBe('4.OA.C.5');
  });

  it('round-trips', () => {
    expect(entryCurriculumMapToRow(entryCurriculumMapFromRow(row))).toEqual(row);
  });
});

// ─── EntryMediaAsset ───────────────────────────────────────────────

describe('entryMediaAssetFromRow', () => {
  const row: EntryMediaAssetRow = {
    id: 'asset-1',
    entry_id: 'entry-fibonacci',
    asset_type: 'remembrance_art',
    url: 'https://storage.example.com/art.jpg',
    generated_at: 1700000000000,
    provider: 'fal_ai',
  };

  it('maps snake_case to camelCase', () => {
    const domain = entryMediaAssetFromRow(row);
    expect(domain.entryId).toBe('entry-fibonacci');
    expect(domain.assetType).toBe('remembrance_art');
    expect(domain.generatedAt).toBe(1700000000000);
  });

  it('round-trips', () => {
    expect(entryMediaAssetToRow(entryMediaAssetFromRow(row))).toEqual(row);
  });
});

// ─── EntryQuizQuestion ─────────────────────────────────────────────

describe('entryQuizQuestionFromRow', () => {
  const row: EntryQuizQuestionRow = {
    id: 'q-1',
    entry_id: 'entry-fibonacci',
    difficulty_tier: 1,
    question: 'What comes after 1, 1, 2, 3, 5?',
    options: ['6', '7', '8', '9'],
    correct_index: 2,
    explanation: 'Each number is the sum of the two before it.',
  };

  it('maps snake_case to camelCase', () => {
    const domain = entryQuizQuestionFromRow(row);
    expect(domain.entryId).toBe('entry-fibonacci');
    expect(domain.difficultyTier).toBe(1);
    expect(domain.correctIndex).toBe(2);
  });

  it('round-trips', () => {
    expect(entryQuizQuestionToRow(entryQuizQuestionFromRow(row))).toEqual(row);
  });
});

// ─── WorldLuminance ────────────────────────────────────────────────

describe('worldLuminanceFromRow', () => {
  const row: WorldLuminanceRow = {
    world_id: 'cloud-kingdom',
    luminance: 0.72,
    stage: 'glowing',
    last_restored_at: 1700000000000,
    total_kindlers_contributed: 142,
    active_kindler_count: 17,
  };

  it('maps all snake_case fields', () => {
    const domain = worldLuminanceFromRow(row);
    expect(domain.worldId).toBe('cloud-kingdom');
    expect(domain.lastRestoredAt).toBe(1700000000000);
    expect(domain.totalKindlersContributed).toBe(142);
    expect(domain.activeKindlerCount).toBe(17);
  });

  it('round-trips', () => {
    expect(worldLuminanceToRow(worldLuminanceFromRow(row))).toEqual(row);
  });
});

// ─── WorldLuminanceLog ─────────────────────────────────────────────

describe('worldLuminanceLogFromRow', () => {
  const row: WorldLuminanceLogRow = {
    id: 'log-1',
    world_id: 'cloud-kingdom',
    luminance: 0.65,
    stage: 'glowing',
    delta: 0.05,
    cause: 'kindler_progress',
    timestamp: 1700000000000,
  };

  it('maps worldId', () => {
    expect(worldLuminanceLogFromRow(row).worldId).toBe('cloud-kingdom');
  });

  it('round-trips', () => {
    expect(worldLuminanceLogToRow(worldLuminanceLogFromRow(row))).toEqual(row);
  });
});

// ─── KindlerProfile ────────────────────────────────────────────────

describe('kindlerProfileFromRow', () => {
  const row: KindlerProfileRow = {
    id: 'uuid-kindler-1',
    parent_account_id: 'uuid-parent-1',
    display_name: 'StarSeeker42',
    age_tier: 2,
    avatar_id: 'compass-hat',
    spark_level: 0.55,
    current_chapter: 'threadways_open',
    worlds_visited: ['cloud-kingdom', 'number-garden'],
    worlds_restored: ['number-garden'],
    guides_met_count: 3,
    created_at: 1700000000000,
  };

  it('maps all snake_case fields', () => {
    const domain = kindlerProfileFromRow(row);
    expect(domain.parentAccountId).toBe('uuid-parent-1');
    expect(domain.displayName).toBe('StarSeeker42');
    expect(domain.ageTier).toBe(2);
    expect(domain.avatarId).toBe('compass-hat');
    expect(domain.sparkLevel).toBe(0.55);
    expect(domain.currentChapter).toBe('threadways_open');
    expect(domain.worldsVisited).toEqual(['cloud-kingdom', 'number-garden']);
    expect(domain.worldsRestored).toEqual(['number-garden']);
    expect(domain.guidesMetCount).toBe(3);
    expect(domain.createdAt).toBe(1700000000000);
  });

  it('round-trips', () => {
    expect(kindlerProfileToRow(kindlerProfileFromRow(row))).toEqual(row);
  });
});

// ─── KindlerProgress ───────────────────────────────────────────────

describe('kindlerProgressFromRow', () => {
  const row: KindlerProgressRow = {
    id: 'prog-1',
    kindler_id: 'uuid-kindler-1',
    entry_id: 'entry-fibonacci',
    completed_at: 1700000000000,
    adventure_type: 'remembrance_wall',
    score: 0.9,
  };

  it('maps snake_case fields', () => {
    const domain = kindlerProgressFromRow(row);
    expect(domain.kindlerId).toBe('uuid-kindler-1');
    expect(domain.entryId).toBe('entry-fibonacci');
    expect(domain.completedAt).toBe(1700000000000);
    expect(domain.adventureType).toBe('remembrance_wall');
    expect(domain.score).toBe(0.9);
  });

  it('handles null score', () => {
    const r = kindlerProgressFromRow({ ...row, score: null });
    expect(r.score).toBeNull();
  });

  it('round-trips', () => {
    expect(kindlerProgressToRow(kindlerProgressFromRow(row))).toEqual(row);
  });
});

// ─── SparkLog ──────────────────────────────────────────────────────

describe('sparkLogFromRow', () => {
  const row: KindlerSparkLogRow = {
    id: 'spark-1',
    kindler_id: 'uuid-kindler-1',
    spark_level: 0.6,
    delta: 0.05,
    cause: 'lesson_completed',
    timestamp: 1700000000000,
  };

  it('maps snake_case fields', () => {
    const domain = sparkLogFromRow(row);
    expect(domain.kindlerId).toBe('uuid-kindler-1');
    expect(domain.sparkLevel).toBe(0.6);
  });

  it('round-trips', () => {
    expect(sparkLogToRow(sparkLogFromRow(row))).toEqual(row);
  });
});

// ─── KindlerSession ────────────────────────────────────────────────

describe('kindlerSessionFromRow', () => {
  const row: KindlerSessionRow = {
    id: 'sess-1',
    kindler_id: 'uuid-kindler-1',
    started_at: 1700000000000,
    ended_at: 1700000003600,
    worlds_visited: ['cloud-kingdom'],
    guides_interacted: ['professor-nimbus'],
    entries_completed: ['entry-fibonacci'],
    spark_delta: 0.07,
  };

  it('maps all snake_case fields', () => {
    const domain = kindlerSessionFromRow(row);
    expect(domain.kindlerId).toBe('uuid-kindler-1');
    expect(domain.startedAt).toBe(1700000000000);
    expect(domain.endedAt).toBe(1700000003600);
    expect(domain.worldsVisited).toEqual(['cloud-kingdom']);
    expect(domain.guidesInteracted).toEqual(['professor-nimbus']);
    expect(domain.entriesCompleted).toEqual(['entry-fibonacci']);
    expect(domain.sparkDelta).toBe(0.07);
  });

  it('handles null endedAt (active session)', () => {
    const r = kindlerSessionFromRow({ ...row, ended_at: null });
    expect(r.endedAt).toBeNull();
  });

  it('round-trips', () => {
    expect(kindlerSessionToRow(kindlerSessionFromRow(row))).toEqual(row);
  });
});

// ─── SessionReport ─────────────────────────────────────────────────

describe('sessionReportFromRow', () => {
  const row: SessionReportRow = {
    id: 'report-1',
    session_id: 'sess-1',
    kindler_id: 'uuid-kindler-1',
    summary: 'Today Kindler explored the Cloud Kingdom and learned about weather.',
    worlds_explored: ['cloud-kingdom'],
    subjects_addressed: ['earth-science', 'weather'],
    generated_at: 1700000005000,
  };

  it('maps snake_case fields', () => {
    const domain = sessionReportFromRow(row);
    expect(domain.sessionId).toBe('sess-1');
    expect(domain.kindlerId).toBe('uuid-kindler-1');
    expect(domain.worldsExplored).toEqual(['cloud-kingdom']);
    expect(domain.subjectsAddressed).toEqual(['earth-science', 'weather']);
    expect(domain.generatedAt).toBe(1700000005000);
  });

  it('round-trips', () => {
    expect(sessionReportToRow(sessionReportFromRow(row))).toEqual(row);
  });
});

// ─── AiConversationSession ─────────────────────────────────────────

describe('aiSessionFromRow', () => {
  const row: AiConversationSessionRow = {
    id: 'ai-sess-1',
    kindler_id: 'uuid-kindler-1',
    character_id: 'professor-nimbus',
    world_id: 'cloud-kingdom',
    started_at: 1700000000000,
    ended_at: 1700000001800,
    turn_count: 12,
    auto_delete_at: 1700086400000,
  };

  it('maps all snake_case fields', () => {
    const domain = aiSessionFromRow(row);
    expect(domain.kindlerId).toBe('uuid-kindler-1');
    expect(domain.characterId).toBe('professor-nimbus');
    expect(domain.worldId).toBe('cloud-kingdom');
    expect(domain.startedAt).toBe(1700000000000);
    expect(domain.endedAt).toBe(1700000001800);
    expect(domain.turnCount).toBe(12);
    expect(domain.autoDeleteAt).toBe(1700086400000);
  });

  it('handles null endedAt (active session)', () => {
    const r = aiSessionFromRow({ ...row, ended_at: null });
    expect(r.endedAt).toBeNull();
  });

  it('round-trips', () => {
    expect(aiSessionToRow(aiSessionFromRow(row))).toEqual(row);
  });
});

// ─── RevenueEvent ──────────────────────────────────────────────────

describe('revenueEventFromRow', () => {
  const row: RevenueEventRow = {
    id: 'rev-1',
    event_type: 'subscription',
    gross_amount_usd: 9.99,
    net_amount_usd: 8.49,
    platform: 'ios',
    payment_processor: 'apple',
    user_id: 'uuid-parent-1',
    transaction_id: 'txn-abc123',
    created_at: 1700000000000,
  };

  it('maps snake_case fields', () => {
    const domain = revenueEventFromRow(row);
    expect(domain.eventType).toBe('subscription');
    expect(domain.grossAmountUsd).toBe(9.99);
    expect(domain.netAmountUsd).toBe(8.49);
    expect(domain.paymentProcessor).toBe('apple');
    expect(domain.userId).toBe('uuid-parent-1');
    expect(domain.transactionId).toBe('txn-abc123');
    expect(domain.createdAt).toBe(1700000000000);
  });

  it('round-trips', () => {
    expect(revenueEventToRow(revenueEventFromRow(row))).toEqual(row);
  });
});

// ─── RoyaltyLedger ─────────────────────────────────────────────────

describe('royaltyLedgerFromRow', () => {
  const row: RoyaltyLedgerRow = {
    id: 'ledger-2027-Q1',
    quarter: '2027-Q1',
    total_gross_revenue: 250000.0,
    epic_store_revenue: 30000.0,
    royalty_eligible_revenue: 220000.0,
    cumulative_lifetime_gross: 1100000.0,
    royalty_rate: 0.05,
    royalty_owed: 11000.0,
    threshold_note: 'Over $1M lifetime',
    report_submitted: true,
    report_submitted_at: 1711900000000,
    payment_status: 'paid',
    created_at: 1711800000000,
  };

  it('maps all snake_case fields', () => {
    const domain = royaltyLedgerFromRow(row);
    expect(domain.totalGrossRevenue).toBe(250000.0);
    expect(domain.epicStoreRevenue).toBe(30000.0);
    expect(domain.royaltyEligibleRevenue).toBe(220000.0);
    expect(domain.cumulativeLifetimeGross).toBe(1100000.0);
    expect(domain.royaltyRate).toBe(0.05);
    expect(domain.royaltyOwed).toBe(11000.0);
    expect(domain.thresholdNote).toBe('Over $1M lifetime');
    expect(domain.reportSubmitted).toBe(true);
    expect(domain.reportSubmittedAt).toBe(1711900000000);
    expect(domain.paymentStatus).toBe('paid');
  });

  it('handles null reportSubmittedAt', () => {
    const r = royaltyLedgerFromRow({ ...row, report_submitted_at: null });
    expect(r.reportSubmittedAt).toBeNull();
  });

  it('round-trips', () => {
    expect(royaltyLedgerToRow(royaltyLedgerFromRow(row))).toEqual(row);
  });
});
