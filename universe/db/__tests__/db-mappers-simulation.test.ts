/**
 * DB Mappers — Round-trip Simulation Tests
 *
 * Each mapper pair is tested for bidirectional fidelity:
 *   fromRow(toRow(domain))  deep-equals  domain
 *   toRow(fromRow(row))     deep-equals  row
 *
 * Thread: silk/universe/db-mappers-sim
 * Tier: 1
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
  aiSessionFromRow,
  aiSessionToRow,
  revenueEventFromRow,
  revenueEventToRow,
  royaltyLedgerFromRow,
  royaltyLedgerToRow,
} from '../mappers.js';

import type {
  RealWorldEntryRow,
  EntryConnectionRow,
  EntryCurriculumMapRow,
  EntryMediaAssetRow,
  EntryQuizQuestionRow,
  WorldLuminanceRow,
  AiConversationSessionRow,
  RevenueEventRow,
  RoyaltyLedgerRow,
} from '../row-types.js';

// ─── realWorldEntry ────────────────────────────────────────────────

describe('realWorldEntry mappers', () => {
  const row: RealWorldEntryRow = {
    id: 'printing-press',
    type: 'event',
    title: 'The Printing Press',
    year: 1440,
    year_display: 'c. 1440 CE',
    era: 'early_modern',
    description_child: 'Words for everyone!',
    description_older: 'Gutenberg changed everything.',
    description_parent: 'The democratization of knowledge.',
    real_people: ['Johannes Gutenberg'],
    quote: 'A mine of gold.',
    quote_attribution: 'Erasmus',
    geographic_location: null,
    continent: 'europe',
    subject_tags: ['history', 'literacy'],
    world_id: 'story-tree',
    guide_id: 'grandmother-anaya',
    adventure_type: 'guided_expedition',
    difficulty_tier: 2,
    prerequisites: ['cave-paintings'],
    unlocks: ['newspaper-age'],
    fun_fact: 'Gutenberg printed 180 bibles.',
    image_prompt: 'A medieval workshop with a wooden press.',
    status: 'published',
  };

  it('fromRow produces correct camelCase domain object', () => {
    const entry = realWorldEntryFromRow(row);
    expect(entry.id).toBe('printing-press');
    expect(entry.yearDisplay).toBe('c. 1440 CE');
    expect(entry.descriptionChild).toBe('Words for everyone!');
    expect(entry.descriptionOlder).toBe('Gutenberg changed everything.');
    expect(entry.descriptionParent).toBe('The democratization of knowledge.');
    expect(entry.worldId).toBe('story-tree');
    expect(entry.adventureType).toBe('guided_expedition');
    expect(entry.difficultyTier).toBe(2);
    expect(entry.prerequisites).toEqual(['cave-paintings']);
    expect(entry.unlocks).toEqual(['newspaper-age']);
  });

  it('round-trips: fromRow(toRow(domain)) deep-equals original domain', () => {
    const domain = realWorldEntryFromRow(row);
    expect(realWorldEntryFromRow(realWorldEntryToRow(domain))).toEqual(domain);
  });

  it('round-trips: toRow(fromRow(row)) deep-equals original row', () => {
    const entry = realWorldEntryFromRow(row);
    expect(realWorldEntryToRow(entry)).toEqual(row);
  });
});

// ─── entryConnection ───────────────────────────────────────────────

describe('entryConnection mappers', () => {
  const row: EntryConnectionRow = {
    id: 'conn-1',
    from_entry_id: 'cave-paintings',
    to_entry_id: 'printing-press',
    connection_type: 'precedes',
  };

  it('fromRow maps snake_case to camelCase', () => {
    const conn = entryConnectionFromRow(row);
    expect(conn.fromEntryId).toBe('cave-paintings');
    expect(conn.toEntryId).toBe('printing-press');
    expect(conn.connectionType).toBe('precedes');
  });

  it('round-trips correctly', () => {
    const domain = entryConnectionFromRow(row);
    expect(entryConnectionFromRow(entryConnectionToRow(domain))).toEqual(domain);
    expect(entryConnectionToRow(domain)).toEqual(row);
  });
});

// ─── entryCurriculumMap ────────────────────────────────────────────

describe('entryCurriculumMap mappers', () => {
  const row: EntryCurriculumMapRow = {
    id: 'map-1',
    entry_id: 'printing-press',
    standard: 'common_core',
    standard_code: 'CCSS.ELA-LITERACY.RI.5.3',
    description: 'Cause and effect relationships in history.',
  };

  it('fromRow maps entry_id to entryId and standard_code to standardCode', () => {
    const map = entryCurriculumMapFromRow(row);
    expect(map.entryId).toBe('printing-press');
    expect(map.standardCode).toBe('CCSS.ELA-LITERACY.RI.5.3');
    expect(map.standard).toBe('common_core');
  });

  it('round-trips correctly', () => {
    const domain = entryCurriculumMapFromRow(row);
    expect(entryCurriculumMapFromRow(entryCurriculumMapToRow(domain))).toEqual(domain);
    expect(entryCurriculumMapToRow(domain)).toEqual(row);
  });
});

// ─── entryMediaAsset ───────────────────────────────────────────────

describe('entryMediaAsset mappers', () => {
  const row: EntryMediaAssetRow = {
    id: 'asset-grandmother-anaya-portrait_3_4-1700000000000',
    entry_id: 'printing-press',
    asset_type: 'artifact_visual',
    url: 'https://storage.example.com/art/anaya.png',
    generated_at: 1700000000000,
    provider: 'fal_ai',
  };

  it('fromRow maps entry_id and asset_type correctly', () => {
    const asset = entryMediaAssetFromRow(row);
    expect(asset.entryId).toBe('printing-press');
    expect(asset.assetType).toBe('artifact_visual');
    expect(asset.provider).toBe('fal_ai');
    expect(asset.generatedAt).toBe(1700000000000);
  });

  it('round-trips correctly', () => {
    const domain = entryMediaAssetFromRow(row);
    expect(entryMediaAssetFromRow(entryMediaAssetToRow(domain))).toEqual(domain);
    expect(entryMediaAssetToRow(domain)).toEqual(row);
  });
});

// ─── entryQuizQuestion ─────────────────────────────────────────────

describe('entryQuizQuestion mappers', () => {
  const row: EntryQuizQuestionRow = {
    id: 'quiz-1',
    entry_id: 'printing-press',
    difficulty_tier: 2,
    question: 'Who invented the printing press?',
    options: ['Marco Polo', 'Gutenberg', 'Columbus', 'Da Vinci'],
    correct_index: 1,
    explanation: 'Johannes Gutenberg invented it around 1440.',
  };

  it('fromRow maps entry_id, difficulty_tier, and correct_index', () => {
    const q = entryQuizQuestionFromRow(row);
    expect(q.entryId).toBe('printing-press');
    expect(q.difficultyTier).toBe(2);
    expect(q.correctIndex).toBe(1);
    expect(q.options).toHaveLength(4);
  });

  it('round-trips correctly', () => {
    const domain = entryQuizQuestionFromRow(row);
    expect(entryQuizQuestionFromRow(entryQuizQuestionToRow(domain))).toEqual(domain);
    expect(entryQuizQuestionToRow(domain)).toEqual(row);
  });
});

// ─── worldLuminance ────────────────────────────────────────────────

describe('worldLuminance mappers', () => {
  const row: WorldLuminanceRow = {
    world_id: 'story-tree',
    luminance: 0.72,
    stage: 'fading',
    last_restored_at: '2024-03-01T12:00:00Z',
    total_kindlers_contributed: 284,
    active_kindler_count: 41,
  };

  it('fromRow maps world_id and total_kindlers_contributed', () => {
    const lum = worldLuminanceFromRow(row);
    expect(lum.worldId).toBe('story-tree');
    expect(lum.luminance).toBe(0.72);
    expect(lum.stage).toBe('fading');
    expect(lum.lastRestoredAt).toBe('2024-03-01T12:00:00Z');
    expect(lum.totalKindlersContributed).toBe(284);
    expect(lum.activeKindlerCount).toBe(41);
  });

  it('round-trips correctly', () => {
    const domain = worldLuminanceFromRow(row);
    expect(worldLuminanceFromRow(worldLuminanceToRow(domain))).toEqual(domain);
    expect(worldLuminanceToRow(domain)).toEqual(row);
  });
});

// ─── aiSession ─────────────────────────────────────────────────────

describe('aiSession mappers', () => {
  const row: AiConversationSessionRow = {
    id: 'sess-abc123',
    kindler_id: 'kindler-xyz',
    character_id: 'grandmother-anaya',
    world_id: 'story-tree',
    started_at: '2024-01-15T10:00:00Z',
    ended_at: '2024-01-15T10:22:00Z',
    turn_count: 18,
    auto_delete_at: '2024-07-15T10:00:00Z',
  };

  it('fromRow maps kindler_id, character_id, turn_count, and auto_delete_at', () => {
    const session = aiSessionFromRow(row);
    expect(session.kindlerId).toBe('kindler-xyz');
    expect(session.characterId).toBe('grandmother-anaya');
    expect(session.worldId).toBe('story-tree');
    expect(session.turnCount).toBe(18);
    expect(session.autoDeleteAt).toBe('2024-07-15T10:00:00Z');
  });

  it('round-trips correctly', () => {
    const domain = aiSessionFromRow(row);
    expect(aiSessionFromRow(aiSessionToRow(domain))).toEqual(domain);
    expect(aiSessionToRow(domain)).toEqual(row);
  });
});

// ─── revenueEvent ──────────────────────────────────────────────────

describe('revenueEvent mappers', () => {
  const row: RevenueEventRow = {
    id: 'rev-001',
    event_type: 'subscription',
    gross_amount_usd: 9.99,
    net_amount_usd: 8.49,
    platform: 'epic_games_store',
    payment_processor: 'stripe',
    user_id: 'user-99',
    transaction_id: 'txn-stripe-001',
    created_at: '2024-03-15T00:00:00Z',
  };

  it('fromRow maps gross_amount_usd, net_amount_usd, payment_processor, user_id', () => {
    const event = revenueEventFromRow(row);
    expect(event.eventType).toBe('subscription');
    expect(event.grossAmountUsd).toBe(9.99);
    expect(event.netAmountUsd).toBe(8.49);
    expect(event.platform).toBe('epic_games_store');
    expect(event.paymentProcessor).toBe('stripe');
    expect(event.userId).toBe('user-99');
    expect(event.transactionId).toBe('txn-stripe-001');
  });

  it('round-trips correctly', () => {
    const domain = revenueEventFromRow(row);
    expect(revenueEventFromRow(revenueEventToRow(domain))).toEqual(domain);
    expect(revenueEventToRow(domain)).toEqual(row);
  });
});

// ─── royaltyLedger ─────────────────────────────────────────────────

describe('royaltyLedger mappers', () => {
  const row: RoyaltyLedgerRow = {
    id: 'ledger-q1-2024',
    quarter: '2024-Q1',
    total_gross_revenue: 12000.00,
    epic_store_revenue: 11500.00,
    royalty_eligible_revenue: 5000.00,
    cumulative_lifetime_gross: 45000.00,
    royalty_rate: 0.05,
    royalty_owed: 250.00,
    threshold_note: 'Below $1M threshold — 5% rate.',
    report_submitted: true,
    report_submitted_at: '2024-04-15T00:00:00Z',
    payment_status: 'paid',
    created_at: '2024-04-01T00:00:00Z',
  };

  it('fromRow maps all royalty-specific compound field names', () => {
    const entry = royaltyLedgerFromRow(row);
    expect(entry.quarter).toBe('2024-Q1');
    expect(entry.totalGrossRevenue).toBe(12000.00);
    expect(entry.epicStoreRevenue).toBe(11500.00);
    expect(entry.royaltyEligibleRevenue).toBe(5000.00);
    expect(entry.cumulativeLifetimeGross).toBe(45000.00);
    expect(entry.royaltyRate).toBe(0.05);
    expect(entry.royaltyOwed).toBe(250.00);
    expect(entry.reportSubmitted).toBe(true);
    expect(entry.reportSubmittedAt).toBe('2024-04-15T00:00:00Z');
    expect(entry.paymentStatus).toBe('paid');
  });

  it('round-trips correctly', () => {
    const domain = royaltyLedgerFromRow(row);
    expect(royaltyLedgerFromRow(royaltyLedgerToRow(domain))).toEqual(domain);
    expect(royaltyLedgerToRow(domain)).toEqual(row);
  });
});
