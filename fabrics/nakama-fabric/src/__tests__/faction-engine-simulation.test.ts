import { describe, expect, it } from 'vitest';
import { createFactionEngine } from '../faction-engine.js';

describe('faction-engine simulation', () => {
  const make = () => {
    let now = 1_000_000;
    let id = 0;
    const events: string[] = [];

    const engine = createFactionEngine({
      clock: { nowMicroseconds: () => (now += 1_000_000) },
      idGenerator: { generate: () => `conf-${++id}` },
      notifications: {
        notify: (_dynastyId, event) => {
          events.push(event.kind);
        },
      },
    });

    return { engine, events };
  };

  it('simulates member progression, contribution flow, and benefit unlocks', () => {
    const { engine, events } = make();

    engine.registerBenefit({
      id: 'b-init',
      name: 'Tooling stipend',
      description: 'small build credit',
      requiredRank: 'INITIATE',
      factionId: 'ARCHITECTS',
    });
    engine.registerBenefit({
      id: 'b-vet',
      name: 'Prime permit',
      description: 'advanced build permit',
      requiredRank: 'VETERAN',
      factionId: 'ARCHITECTS',
    });

    engine.joinFaction('d1', 'ARCHITECTS');
    engine.contribute('d1', 2_500n);
    engine.addReputation('d1', 600);

    const membership = engine.getMembership('d1');
    expect(membership?.rank).toBe('VETERAN');
    expect(membership?.totalContributions).toBe(2_500n);

    const available = engine.getAvailableBenefits('d1').map((b) => b.id).sort();
    expect(available).toEqual(['b-init', 'b-vet']);
    expect(events.includes('PROMOTED')).toBe(true);
  });

  it('simulates conflict declaration/resolution with faction-level stats updates', () => {
    const { engine } = make();

    engine.joinFaction('a1', 'ARCHITECTS');
    engine.joinFaction('a2', 'ARCHITECTS');
    engine.joinFaction('w1', 'WARDENS');

    engine.contribute('a1', 100n);
    engine.contribute('a2', 300n);
    engine.addReputation('a1', 120);
    engine.addReputation('w1', 80);

    const conflict = engine.declareConflict('ARCHITECTS', 'WARDENS', 'trade-corridor dispute');
    expect(engine.getActiveConflicts()).toHaveLength(1);

    const archInfo = engine.getFactionInfo('ARCHITECTS');
    expect(archInfo.memberCount).toBe(2);
    expect(archInfo.totalContributions).toBe(400n);
    expect(archInfo.activeConflicts).toBe(1);

    engine.resolveConflict(conflict.conflictId);

    const stats = engine.getStats();
    expect(stats.totalMembers).toBe(3);
    expect(stats.activeConflicts).toBe(0);
    expect(stats.membersByFaction.ARCHITECTS).toBe(2);
  });
});
