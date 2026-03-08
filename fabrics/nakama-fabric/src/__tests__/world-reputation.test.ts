import { describe, it, expect } from 'vitest';
import { createWorldReputationService } from '../world-reputation.js';
import type { WorldReputationDeps } from '../world-reputation.js';

function makeDeps(): WorldReputationDeps {
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
  };
}

describe('WorldReputation — get and change', () => {
  it('returns neutral for unknown dynasty-world pair', () => {
    const svc = createWorldReputationService(makeDeps());
    const rep = svc.getReputation('dyn-1', 'world-1');
    expect(rep.score).toBe(0);
    expect(rep.tier).toBe('neutral');
  });

  it('increases reputation', () => {
    const svc = createWorldReputationService(makeDeps());
    const change = svc.change({
      dynastyId: 'dyn-1',
      worldId: 'world-1',
      delta: 250,
      reason: 'quest completed',
    });
    expect(change.newScore).toBe(250);
    expect(change.newTier).toBe('respected');
    expect(change.previousTier).toBe('neutral');
  });

  it('decreases reputation', () => {
    const svc = createWorldReputationService(makeDeps());
    svc.change({ dynastyId: 'dyn-1', worldId: 'world-1', delta: -600, reason: 'betrayal' });
    const rep = svc.getReputation('dyn-1', 'world-1');
    expect(rep.tier).toBe('reviled');
  });

  it('clamps to min/max bounds', () => {
    const svc = createWorldReputationService(makeDeps());
    svc.change({ dynastyId: 'dyn-1', worldId: 'w1', delta: 5000, reason: 'overflow' });
    expect(svc.getReputation('dyn-1', 'w1').score).toBe(1000);
    svc.change({ dynastyId: 'dyn-2', worldId: 'w1', delta: -5000, reason: 'underflow' });
    expect(svc.getReputation('dyn-2', 'w1').score).toBe(-1000);
  });
});

describe('WorldReputation — tier classification', () => {
  it('classifies reviled', () => {
    const svc = createWorldReputationService(makeDeps());
    svc.change({ dynastyId: 'd', worldId: 'w', delta: -600, reason: '' });
    expect(svc.getReputation('d', 'w').tier).toBe('reviled');
  });

  it('classifies distrusted', () => {
    const svc = createWorldReputationService(makeDeps());
    svc.change({ dynastyId: 'd', worldId: 'w', delta: -300, reason: '' });
    expect(svc.getReputation('d', 'w').tier).toBe('distrusted');
  });

  it('classifies honoured', () => {
    const svc = createWorldReputationService(makeDeps());
    svc.change({ dynastyId: 'd', worldId: 'w', delta: 600, reason: '' });
    expect(svc.getReputation('d', 'w').tier).toBe('honoured');
  });

  it('classifies exalted', () => {
    const svc = createWorldReputationService(makeDeps());
    svc.change({ dynastyId: 'd', worldId: 'w', delta: 900, reason: '' });
    expect(svc.getReputation('d', 'w').tier).toBe('exalted');
  });
});

describe('WorldReputation — list queries', () => {
  it('lists by dynasty', () => {
    const svc = createWorldReputationService(makeDeps());
    svc.change({ dynastyId: 'dyn-1', worldId: 'w1', delta: 100, reason: '' });
    svc.change({ dynastyId: 'dyn-1', worldId: 'w2', delta: 200, reason: '' });
    expect(svc.listByDynasty('dyn-1')).toHaveLength(2);
  });

  it('lists by world', () => {
    const svc = createWorldReputationService(makeDeps());
    svc.change({ dynastyId: 'dyn-1', worldId: 'w1', delta: 100, reason: '' });
    svc.change({ dynastyId: 'dyn-2', worldId: 'w1', delta: 200, reason: '' });
    expect(svc.listByWorld('w1')).toHaveLength(2);
  });

  it('returns empty for unknown dynasty', () => {
    const svc = createWorldReputationService(makeDeps());
    expect(svc.listByDynasty('nobody')).toHaveLength(0);
  });
});

describe('WorldReputation — stats', () => {
  it('starts with zero stats', () => {
    const svc = createWorldReputationService(makeDeps());
    const stats = svc.getStats();
    expect(stats.trackedPairs).toBe(0);
    expect(stats.averageScore).toBe(0);
  });

  it('tracks aggregate stats', () => {
    const svc = createWorldReputationService(makeDeps());
    svc.change({ dynastyId: 'dyn-1', worldId: 'w1', delta: 100, reason: '' });
    svc.change({ dynastyId: 'dyn-2', worldId: 'w1', delta: 300, reason: '' });
    const stats = svc.getStats();
    expect(stats.trackedPairs).toBe(2);
    expect(stats.averageScore).toBe(200);
  });
});
