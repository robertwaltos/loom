import { describe, expect, it } from 'vitest';
import { createExplorationTrackerSystem } from '../exploration-tracker.js';

function makeSystem() {
  return createExplorationTrackerSystem({
    clock: { now: () => 1_000_000n },
    idGen: { generate: () => 'exp-1' },
    logger: { info: () => {}, warn: () => {}, error: () => {} },
  });
}

describe('exploration-tracker simulation', () => {
  it('tracks exploration progression from scouting to settlement', () => {
    const system = makeSystem();
    system.registerEntity('scout-1');
    system.registerWorld('world-a');
    system.registerRegion('region-a1', 'world-a');

    system.discoverWorld('scout-1', 'world-a', 'SCOUTED');
    system.upgradeWorldStatus('scout-1', 'world-a', 'CHARTED');
    system.upgradeWorldStatus('scout-1', 'world-a', 'SETTLED');
    system.discoverRegion('scout-1', 'region-a1');

    const profile = system.getExplorationProfile('scout-1');
    expect(profile?.worldsDiscovered).toBe(1);
    expect(profile?.regionsDiscovered).toBe(1);
    expect(profile?.settledWorlds).toBe(1);
  });
});
