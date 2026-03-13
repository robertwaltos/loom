import { describe, expect, it } from 'vitest';
import { createFactionPolitics } from '../faction-politics.js';

describe('faction-politics simulation', () => {
  const make = () => {
    let now = 1_000_000n;
    let id = 0;
    return {
      politics: createFactionPolitics({
        clock: { nowMicroseconds: () => (now += 1_000_000n) },
        idGen: { next: () => `id-${++id}` },
      }),
    };
  };

  it('simulates diplomatic action chains with score clamping and tier shifts', () => {
    const { politics } = make();

    politics.setRelationship('ARCHITECTS', 'WARDENS', 20);
    politics.recordAction({
      actingFaction: 'ARCHITECTS',
      targetFaction: 'WARDENS',
      actionType: 'EXTEND_AID',
      scoreDelta: 30,
    });
    politics.recordAction({
      actingFaction: 'WARDENS',
      targetFaction: 'ARCHITECTS',
      actionType: 'DENOUNCE',
      scoreDelta: -140,
    });

    const relation = politics.getRelationship('ARCHITECTS', 'WARDENS');
    expect(relation).not.toBe('not-found');
    if (relation === 'not-found') return;

    expect(relation.score).toBe(-90);
    expect(relation.tier).toBe('WAR');

    const history = politics.getActionHistory('ARCHITECTS');
    expect(history).toHaveLength(2);
  });

  it('simulates embargo and power ranking snapshots during geopolitical shifts', () => {
    const { politics } = make();

    politics.setRelationship('ARCHITECTS', 'PIONEERS', 40);
    politics.setRelationship('WARDENS', 'PIONEERS', -10);

    politics.applyEmbargo('WARDENS', 'WARDENS', 'PIONEERS');
    expect(politics.getActiveEmbargoes()).toHaveLength(1);

    politics.setFactionMetrics('ARCHITECTS', {
      memberCount: 18,
      treasury: 9_000n * 1_000_000n,
      influenceScore: 12,
    });
    politics.setFactionMetrics('WARDENS', {
      memberCount: 22,
      treasury: 5_000n * 1_000_000n,
      influenceScore: 10,
    });

    const ranking = politics.getPowerRanking();
    expect(ranking).toHaveLength(2);
    expect(ranking[0]?.rank).toBe(1);

    const eventId = politics.recordPoliticalEvent('treaty-summit', ['ARCHITECTS', 'WARDENS'], 'ceasefire terms debated');
    expect(eventId).toContain('event-');
    expect(politics.getPoliticalEvents('ARCHITECTS')).toHaveLength(1);

    politics.removeEmbargo('WARDENS', 'PIONEERS');
    expect(politics.getActiveEmbargoes()).toHaveLength(0);
  });
});
