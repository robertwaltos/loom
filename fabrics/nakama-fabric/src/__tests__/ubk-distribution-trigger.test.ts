/**
 * Tests for ubk-distribution-trigger.ts
 */

import { describe, it, expect } from 'vitest';
import {
  isDynastyActiveForUbk,
  buildMonthlyUbkTrigger,
  buildDeathWitnessBonusTrigger,
  buildNewDynastyGrantTrigger,
  buildVigilBonusTrigger,
  processMonthlyDistribution,
  NEW_DYNASTY_GRANT_KALON,
  VIGIL_BONUS_KALON,
  DEATH_WITNESS_MULTIPLIER,
  NEW_DYNASTY_GRANT_MICRO,
  VIGIL_BONUS_MICRO,
  type ActivityCheck,
  type UbkTriggerRecord,
} from '../ubk-distribution-trigger.js';
import { kalonToMicro } from '../kalon-constants.js';

const MICRO = (k: bigint) => kalonToMicro(k);

// ─── Constants ───────────────────────────────────────────────────────────────

describe('ubk-distribution-trigger — constants', () => {
  it('NEW_DYNASTY_GRANT_KALON is 100', () => {
    expect(NEW_DYNASTY_GRANT_KALON).toBe(100n);
  });

  it('VIGIL_BONUS_KALON is 25', () => {
    expect(VIGIL_BONUS_KALON).toBe(25n);
  });

  it('DEATH_WITNESS_MULTIPLIER is 2', () => {
    expect(DEATH_WITNESS_MULTIPLIER).toBe(2n);
  });

  it('NEW_DYNASTY_GRANT_MICRO equals 100 KALON in micro', () => {
    expect(NEW_DYNASTY_GRANT_MICRO).toBe(MICRO(100n));
  });

  it('VIGIL_BONUS_MICRO equals 25 KALON in micro', () => {
    expect(VIGIL_BONUS_MICRO).toBe(MICRO(25n));
  });
});

// ─── isDynastyActiveForUbk ────────────────────────────────────────────────────

describe('isDynastyActiveForUbk', () => {
  const now = new Date('2350-06-01T00:00:00Z');
  const recentChronicle = new Date('2350-05-20T00:00:00Z'); // 12 days ago
  const recentVote = new Date('2350-05-15T00:00:00Z');      // 17 days ago
  const oldDate = new Date('2350-03-01T00:00:00Z');          // >60 days ago

  it('active when Chronicle entry is within 30 days', () => {
    const activity: ActivityCheck = { dynastyId: 'd1', lastChronicleEntry: recentChronicle };
    expect(isDynastyActiveForUbk(activity, now)).toBe(true);
  });

  it('active when Assembly vote is within 30 days', () => {
    const activity: ActivityCheck = { dynastyId: 'd1', lastAssemblyVote: recentVote };
    expect(isDynastyActiveForUbk(activity, now)).toBe(true);
  });

  it('active when both dates are recent', () => {
    const activity: ActivityCheck = {
      dynastyId: 'd1',
      lastChronicleEntry: recentChronicle,
      lastAssemblyVote: recentVote,
    };
    expect(isDynastyActiveForUbk(activity, now)).toBe(true);
  });

  it('inactive when Chronicle entry is older than 30 days', () => {
    const activity: ActivityCheck = { dynastyId: 'd1', lastChronicleEntry: oldDate };
    expect(isDynastyActiveForUbk(activity, now)).toBe(false);
  });

  it('inactive when Assembly vote is older than 30 days', () => {
    const activity: ActivityCheck = { dynastyId: 'd1', lastAssemblyVote: oldDate };
    expect(isDynastyActiveForUbk(activity, now)).toBe(false);
  });

  it('active when one date is recent even if the other is old', () => {
    const activity: ActivityCheck = {
      dynastyId: 'd1',
      lastChronicleEntry: oldDate,
      lastAssemblyVote: recentVote,
    };
    expect(isDynastyActiveForUbk(activity, now)).toBe(true);
  });

  it('inactive when no activity dates provided', () => {
    const activity: ActivityCheck = { dynastyId: 'd1' };
    expect(isDynastyActiveForUbk(activity, now)).toBe(false);
  });

  it('active when Chronicle entry is exactly at the 30-day boundary', () => {
    // Exactly 30 days ago should be >= cutoff
    const exactCutoff = new Date(now.getTime() - 30 * 86_400_000);
    const activity: ActivityCheck = { dynastyId: 'd1', lastChronicleEntry: exactCutoff };
    expect(isDynastyActiveForUbk(activity, now)).toBe(true);
  });

  it('inactive when Chronicle entry is one millisecond past 30 days', () => {
    const justOver = new Date(now.getTime() - 30 * 86_400_000 - 1);
    const activity: ActivityCheck = { dynastyId: 'd1', lastChronicleEntry: justOver };
    expect(isDynastyActiveForUbk(activity, now)).toBe(false);
  });
});

// ─── buildMonthlyUbkTrigger ───────────────────────────────────────────────────

describe('buildMonthlyUbkTrigger', () => {
  const triggeredAt = new Date('2350-07-01T00:00:00Z');

  it('sets triggerType to MONTHLY_STANDARD', () => {
    const trigger = buildMonthlyUbkTrigger({
      triggerId: 'trg-1',
      dynastyId: 'dyn-1',
      amountMicro: MICRO(200n),
      triggeredAt,
    });
    expect(trigger.triggerType).toBe('MONTHLY_STANDARD');
  });

  it('preserves triggerId', () => {
    const trigger = buildMonthlyUbkTrigger({
      triggerId: 'trg-abc',
      dynastyId: 'dyn-1',
      amountMicro: MICRO(200n),
      triggeredAt,
    });
    expect(trigger.triggerId).toBe('trg-abc');
  });

  it('preserves dynastyId', () => {
    const trigger = buildMonthlyUbkTrigger({
      triggerId: 'trg-1',
      dynastyId: 'dyn-xyz',
      amountMicro: MICRO(200n),
      triggeredAt,
    });
    expect(trigger.dynastyId).toBe('dyn-xyz');
  });

  it('preserves amountMicro', () => {
    const trigger = buildMonthlyUbkTrigger({
      triggerId: 'trg-1',
      dynastyId: 'dyn-1',
      amountMicro: MICRO(350n),
      triggeredAt,
    });
    expect(trigger.amountMicro).toBe(MICRO(350n));
  });

  it('has no referenceId', () => {
    const trigger = buildMonthlyUbkTrigger({
      triggerId: 'trg-1',
      dynastyId: 'dyn-1',
      amountMicro: MICRO(200n),
      triggeredAt,
    });
    expect(trigger.referenceId).toBeUndefined();
  });

  it('preserves triggeredAt', () => {
    const trigger = buildMonthlyUbkTrigger({
      triggerId: 'trg-1',
      dynastyId: 'dyn-1',
      amountMicro: MICRO(200n),
      triggeredAt,
    });
    expect(trigger.triggeredAt).toBe(triggeredAt);
  });
});

// ─── buildDeathWitnessBonusTrigger ────────────────────────────────────────────

describe('buildDeathWitnessBonusTrigger', () => {
  const triggeredAt = new Date('2350-07-01T00:00:00Z');

  it('sets triggerType to DEATH_WITNESS_BONUS', () => {
    const trigger = buildDeathWitnessBonusTrigger({
      triggerId: 'trg-1',
      dynastyId: 'dyn-1',
      baseMonthlyAmountMicro: MICRO(200n),
      npcId: 'npc-99',
      triggeredAt,
    });
    expect(trigger.triggerType).toBe('DEATH_WITNESS_BONUS');
  });

  it('doubles the base monthly amount', () => {
    const base = MICRO(200n);
    const trigger = buildDeathWitnessBonusTrigger({
      triggerId: 'trg-1',
      dynastyId: 'dyn-1',
      baseMonthlyAmountMicro: base,
      npcId: 'npc-99',
      triggeredAt,
    });
    expect(trigger.amountMicro).toBe(base * DEATH_WITNESS_MULTIPLIER);
    expect(trigger.amountMicro).toBe(MICRO(400n));
  });

  it('stores npcId as referenceId', () => {
    const trigger = buildDeathWitnessBonusTrigger({
      triggerId: 'trg-1',
      dynastyId: 'dyn-1',
      baseMonthlyAmountMicro: MICRO(200n),
      npcId: 'npc-fortuna',
      triggeredAt,
    });
    expect(trigger.referenceId).toBe('npc-fortuna');
  });

  it('works with 0n base amount', () => {
    const trigger = buildDeathWitnessBonusTrigger({
      triggerId: 'trg-1',
      dynastyId: 'dyn-1',
      baseMonthlyAmountMicro: 0n,
      npcId: 'npc-99',
      triggeredAt,
    });
    expect(trigger.amountMicro).toBe(0n);
  });
});

// ─── buildNewDynastyGrantTrigger ──────────────────────────────────────────────

describe('buildNewDynastyGrantTrigger', () => {
  const triggeredAt = new Date('2350-01-01T00:00:00Z');

  it('sets triggerType to NEW_DYNASTY_GRANT', () => {
    const trigger = buildNewDynastyGrantTrigger({
      triggerId: 'trg-1',
      dynastyId: 'dyn-new',
      triggeredAt,
    });
    expect(trigger.triggerType).toBe('NEW_DYNASTY_GRANT');
  });

  it('grants exactly 100 KALON in micro', () => {
    const trigger = buildNewDynastyGrantTrigger({
      triggerId: 'trg-1',
      dynastyId: 'dyn-new',
      triggeredAt,
    });
    expect(trigger.amountMicro).toBe(NEW_DYNASTY_GRANT_MICRO);
    expect(trigger.amountMicro).toBe(MICRO(100n));
  });

  it('has no referenceId', () => {
    const trigger = buildNewDynastyGrantTrigger({
      triggerId: 'trg-1',
      dynastyId: 'dyn-new',
      triggeredAt,
    });
    expect(trigger.referenceId).toBeUndefined();
  });

  it('preserves dynastyId', () => {
    const trigger = buildNewDynastyGrantTrigger({
      triggerId: 'trg-1',
      dynastyId: 'dyn-007',
      triggeredAt,
    });
    expect(trigger.dynastyId).toBe('dyn-007');
  });
});

// ─── buildVigilBonusTrigger ───────────────────────────────────────────────────

describe('buildVigilBonusTrigger', () => {
  const triggeredAt = new Date('2350-03-15T00:00:00Z');

  it('sets triggerType to VIGIL_BONUS', () => {
    const trigger = buildVigilBonusTrigger({
      triggerId: 'trg-1',
      dynastyId: 'dyn-1',
      vigilId: 'vig-10',
      triggeredAt,
    });
    expect(trigger.triggerType).toBe('VIGIL_BONUS');
  });

  it('grants exactly 25 KALON in micro', () => {
    const trigger = buildVigilBonusTrigger({
      triggerId: 'trg-1',
      dynastyId: 'dyn-1',
      vigilId: 'vig-10',
      triggeredAt,
    });
    expect(trigger.amountMicro).toBe(VIGIL_BONUS_MICRO);
    expect(trigger.amountMicro).toBe(MICRO(25n));
  });

  it('stores vigilId as referenceId', () => {
    const trigger = buildVigilBonusTrigger({
      triggerId: 'trg-1',
      dynastyId: 'dyn-1',
      vigilId: 'vig-sentinel-42',
      triggeredAt,
    });
    expect(trigger.referenceId).toBe('vig-sentinel-42');
  });

  it('preserves triggeredAt', () => {
    const trigger = buildVigilBonusTrigger({
      triggerId: 'trg-1',
      dynastyId: 'dyn-1',
      vigilId: 'vig-10',
      triggeredAt,
    });
    expect(trigger.triggeredAt).toBe(triggeredAt);
  });
});

// ─── processMonthlyDistribution ───────────────────────────────────────────────

describe('processMonthlyDistribution — empty input', () => {
  it('returns zero counts for empty dynasty list', () => {
    const now = new Date('2350-06-01T00:00:00Z');
    let seq = 0;
    const result = processMonthlyDistribution({
      distributionId: 'dist-1',
      month: '2350-06',
      dynasties: [],
      baseMonthlyAmountMicro: MICRO(200n),
      now,
      idGenerator: () => `id-${++seq}`,
    });
    expect(result.triggers).toHaveLength(0);
    expect(result.totalActiveDynasties).toBe(0);
    expect(result.totalInactiveDynasties).toBe(0);
    expect(result.totalDistributedMicro).toBe(0n);
    expect(result.deathWitnessBonus).toBe(0);
  });

  it('preserves distributionId and month', () => {
    const now = new Date('2350-06-01T00:00:00Z');
    const result = processMonthlyDistribution({
      distributionId: 'dist-xyz',
      month: '2350-09',
      dynasties: [],
      baseMonthlyAmountMicro: MICRO(200n),
      now,
      idGenerator: () => 'id',
    });
    expect(result.distributionId).toBe('dist-xyz');
    expect(result.month).toBe('2350-09');
  });
});

describe('processMonthlyDistribution — active/inactive dynasties', () => {
  const now = new Date('2350-06-01T00:00:00Z');
  const recentDate = new Date('2350-05-20T00:00:00Z'); // active
  const oldDate = new Date('2350-03-01T00:00:00Z');    // inactive
  const base = MICRO(200n);
  let seq = 0;
  const idGenerator = () => `trg-${++seq}`;

  const dynasties = [
    { dynastyId: 'active-1', activity: { dynastyId: 'active-1', lastChronicleEntry: recentDate } },
    { dynastyId: 'active-2', activity: { dynastyId: 'active-2', lastAssemblyVote: recentDate } },
    { dynastyId: 'inactive-1', activity: { dynastyId: 'inactive-1', lastChronicleEntry: oldDate } },
    { dynastyId: 'inactive-2', activity: { dynastyId: 'inactive-2' } },
  ];

  const result = processMonthlyDistribution({
    distributionId: 'dist-1',
    month: '2350-06',
    dynasties,
    baseMonthlyAmountMicro: base,
    now,
    idGenerator,
  });

  it('counts 2 active and 2 inactive dynasties', () => {
    expect(result.totalActiveDynasties).toBe(2);
    expect(result.totalInactiveDynasties).toBe(2);
  });

  it('generates one MONTHLY_STANDARD trigger per active dynasty', () => {
    const standard = result.triggers.filter((t) => t.triggerType === 'MONTHLY_STANDARD');
    expect(standard).toHaveLength(2);
  });

  it('inactive dynasties receive no triggers', () => {
    const inactiveTriggers = result.triggers.filter(
      (t) => t.dynastyId === 'inactive-1' || t.dynastyId === 'inactive-2',
    );
    expect(inactiveTriggers).toHaveLength(0);
  });

  it('each standard trigger carries the baseMonthlyAmountMicro', () => {
    const standard = result.triggers.filter(
      (t) => t.triggerType === 'MONTHLY_STANDARD' && t.dynastyId === 'active-1',
    );
    expect(standard).toHaveLength(1);
    expect(standard[0]!.amountMicro).toBe(base);
  });

  it('no death witness bonuses when none are set', () => {
    expect(result.deathWitnessBonus).toBe(0);
  });

  it('totalDistributedMicro is sum of all trigger amounts', () => {
    const sumFromTriggers = result.triggers.reduce((s, t) => s + t.amountMicro, 0n);
    expect(result.totalDistributedMicro).toBe(sumFromTriggers);
  });

  it('totalDistributedMicro equals 2 × base for 2 active dynasties with no bonuses', () => {
    expect(result.totalDistributedMicro).toBe(base * 2n);
  });
});

describe('processMonthlyDistribution — death witness bonus', () => {
  const now = new Date('2350-07-01T00:00:00Z');
  const recentDate = new Date('2350-06-25T00:00:00Z');
  const base = MICRO(300n);

  const dynasties = [
    {
      dynastyId: 'witness',
      activity: { dynastyId: 'witness', lastChronicleEntry: recentDate },
      witnessedTier2DeathNpcId: 'npc-88',
    },
    {
      dynastyId: 'standard',
      activity: { dynastyId: 'standard', lastAssemblyVote: recentDate },
    },
  ];

  let seq = 0;
  const result = processMonthlyDistribution({
    distributionId: 'dist-2',
    month: '2350-07',
    dynasties,
    baseMonthlyAmountMicro: base,
    now,
    idGenerator: () => `id-${++seq}`,
  });

  it('deathWitnessBonus count is 1', () => {
    expect(result.deathWitnessBonus).toBe(1);
  });

  it('witnessing dynasty gets both MONTHLY_STANDARD and DEATH_WITNESS_BONUS', () => {
    const standard = result.triggers.filter(
      (t) => t.dynastyId === 'witness' && t.triggerType === 'MONTHLY_STANDARD',
    );
    const bonus = result.triggers.filter(
      (t) => t.dynastyId === 'witness' && t.triggerType === 'DEATH_WITNESS_BONUS',
    );
    expect(standard).toHaveLength(1);
    expect(bonus).toHaveLength(1);
  });

  it('bonus trigger amount is 2× base', () => {
    const bonus = result.triggers.find(
      (t) => t.dynastyId === 'witness' && t.triggerType === 'DEATH_WITNESS_BONUS',
    );
    expect(bonus!.amountMicro).toBe(base * 2n);
  });

  it('bonus trigger referenceId is the npcId', () => {
    const bonus = result.triggers.find(
      (t) => t.dynastyId === 'witness' && t.triggerType === 'DEATH_WITNESS_BONUS',
    );
    expect(bonus!.referenceId).toBe('npc-88');
  });

  it('non-witness dynasty gets only MONTHLY_STANDARD', () => {
    const triggers = result.triggers.filter((t) => t.dynastyId === 'standard');
    expect(triggers).toHaveLength(1);
    expect(triggers[0]!.triggerType).toBe('MONTHLY_STANDARD');
  });

  it('totalDistributedMicro is base (standard) + base (standard) + 2×base (bonus) = 4×base', () => {
    expect(result.totalDistributedMicro).toBe(base * 4n);
  });

  it('triggeredAt is the now passed in', () => {
    result.triggers.forEach((t) => {
      expect(t.triggeredAt).toBe(now);
    });
  });
});

describe('processMonthlyDistribution — idGenerator is called for each trigger', () => {
  it('assigns unique ids from the generator', () => {
    const now = new Date('2350-08-01T00:00:00Z');
    const recentDate = new Date('2350-07-20T00:00:00Z');
    const ids: string[] = [];
    let counter = 0;
    const idGenerator = () => {
      const id = `gen-${counter++}`;
      ids.push(id);
      return id;
    };

    processMonthlyDistribution({
      distributionId: 'dist-3',
      month: '2350-08',
      dynasties: [
        {
          dynastyId: 'dx',
          activity: { dynastyId: 'dx', lastChronicleEntry: recentDate },
          witnessedTier2DeathNpcId: 'npc-5',
        },
      ],
      baseMonthlyAmountMicro: MICRO(100n),
      now,
      idGenerator,
    });

    // Should have called generator twice: once for standard, once for bonus
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });
});
