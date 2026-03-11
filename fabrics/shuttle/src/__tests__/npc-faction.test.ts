import { describe, it, expect } from 'vitest';
import { createNpcFactionTracker } from '../npc-faction.js';

describe('NpcFactionTracker — set affinity', () => {
  it('sets faction affinity', () => {
    const tracker = createNpcFactionTracker();
    const result = tracker.setAffinity('npc-1', 'foundation', 50);
    expect(result.value).toBe(50);
    expect(tracker.getAffinity('npc-1', 'foundation')).toBe(50);
  });

  it('clamps to range [-100, 100]', () => {
    const tracker = createNpcFactionTracker();
    tracker.setAffinity('npc-1', 'a', 200);
    expect(tracker.getAffinity('npc-1', 'a')).toBe(100);
    tracker.setAffinity('npc-1', 'b', -200);
    expect(tracker.getAffinity('npc-1', 'b')).toBe(-100);
  });

  it('returns 0 for unset affinity', () => {
    const tracker = createNpcFactionTracker();
    expect(tracker.getAffinity('npc-1', 'unknown')).toBe(0);
  });
});

describe('NpcFactionTracker — adjust affinity', () => {
  it('adjusts affinity by delta', () => {
    const tracker = createNpcFactionTracker();
    tracker.setAffinity('npc-1', 'foundation', 30);
    const result = tracker.adjustAffinity({
      entityId: 'npc-1',
      factionId: 'foundation',
      delta: 20,
    });
    expect(result.value).toBe(50);
  });

  it('clamps on adjustment', () => {
    const tracker = createNpcFactionTracker();
    tracker.setAffinity('npc-1', 'ascendancy', 90);
    tracker.adjustAffinity({
      entityId: 'npc-1',
      factionId: 'ascendancy',
      delta: 50,
    });
    expect(tracker.getAffinity('npc-1', 'ascendancy')).toBe(100);
  });

  it('adjusts from zero for unset faction', () => {
    const tracker = createNpcFactionTracker();
    tracker.adjustAffinity({
      entityId: 'npc-1',
      factionId: 'drift',
      delta: -30,
    });
    expect(tracker.getAffinity('npc-1', 'drift')).toBe(-30);
  });
});

describe('NpcFactionTracker — affinity levels', () => {
  it('classifies hostile', () => {
    const tracker = createNpcFactionTracker();
    tracker.setAffinity('npc-1', 'f', -75);
    expect(tracker.getAffinityLevel('npc-1', 'f')).toBe('hostile');
  });

  it('classifies unfriendly', () => {
    const tracker = createNpcFactionTracker();
    tracker.setAffinity('npc-1', 'f', -30);
    expect(tracker.getAffinityLevel('npc-1', 'f')).toBe('unfriendly');
  });

  it('classifies neutral', () => {
    const tracker = createNpcFactionTracker();
    expect(tracker.getAffinityLevel('npc-1', 'f')).toBe('neutral');
  });

  it('classifies friendly', () => {
    const tracker = createNpcFactionTracker();
    tracker.setAffinity('npc-1', 'f', 30);
    expect(tracker.getAffinityLevel('npc-1', 'f')).toBe('friendly');
  });

  it('classifies allied', () => {
    const tracker = createNpcFactionTracker();
    tracker.setAffinity('npc-1', 'f', 75);
    expect(tracker.getAffinityLevel('npc-1', 'f')).toBe('allied');
  });
});

describe('NpcFactionTracker — queries', () => {
  it('gets all affinities for entity', () => {
    const tracker = createNpcFactionTracker();
    tracker.setAffinity('npc-1', 'foundation', 50);
    tracker.setAffinity('npc-1', 'ascendancy', -20);
    const all = tracker.getAllAffinities('npc-1');
    expect(all).toHaveLength(2);
  });

  it('returns empty for unknown entity', () => {
    const tracker = createNpcFactionTracker();
    expect(tracker.getAllAffinities('unknown')).toHaveLength(0);
  });

  it('gets dominant faction', () => {
    const tracker = createNpcFactionTracker();
    tracker.setAffinity('npc-1', 'foundation', 50);
    tracker.setAffinity('npc-1', 'ascendancy', 80);
    tracker.setAffinity('npc-1', 'drift', 10);
    expect(tracker.getDominantFaction('npc-1')).toBe('ascendancy');
  });

  it('returns undefined when no factions', () => {
    const tracker = createNpcFactionTracker();
    expect(tracker.getDominantFaction('npc-1')).toBeUndefined();
  });
});

describe('NpcFactionTracker — entity removal', () => {
  it('removes an entity', () => {
    const tracker = createNpcFactionTracker();
    tracker.setAffinity('npc-1', 'f', 50);
    expect(tracker.removeEntity('npc-1')).toBe(true);
    expect(tracker.getAllAffinities('npc-1')).toHaveLength(0);
  });

  it('returns false for unknown entity', () => {
    const tracker = createNpcFactionTracker();
    expect(tracker.removeEntity('unknown')).toBe(false);
  });
});

describe('NpcFactionTracker — stats', () => {
  it('tracks aggregate statistics', () => {
    const tracker = createNpcFactionTracker();
    tracker.setAffinity('npc-1', 'f', 50);
    tracker.adjustAffinity({ entityId: 'npc-1', factionId: 'f', delta: 10 });
    const stats = tracker.getStats();
    expect(stats.trackedEntities).toBe(1);
    expect(stats.totalAdjustments).toBe(1);
  });

  it('starts with zero stats', () => {
    const tracker = createNpcFactionTracker();
    const stats = tracker.getStats();
    expect(stats.trackedEntities).toBe(0);
    expect(stats.totalAdjustments).toBe(0);
  });
});
