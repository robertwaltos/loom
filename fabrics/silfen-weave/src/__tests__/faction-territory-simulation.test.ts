import { describe, expect, it } from 'vitest';
import { createFactionTerritorySystem } from '../faction-territory.js';

function makeSystem() {
  return createFactionTerritorySystem({
    clock: { now: () => 1_000_000n },
    idGen: { generate: () => 'conflict-1' },
    logger: { info: () => {}, warn: () => {}, error: () => {} },
  });
}

describe('faction-territory simulation', () => {
  it('resolves contested control and updates faction footprint', () => {
    const system = makeSystem();
    system.registerFaction('f-a');
    system.registerFaction('f-b');
    system.registerWorld('w-1');
    system.addRegion('r-1', 'w-1');

    system.claimRegion('f-a', 'r-1');
    const contested = system.contestRegion('f-b', 'r-1');
    expect(contested.success).toBe(true);
    if (!contested.success) return;

    system.resolveConflict(contested.conflict.conflictId, 'f-b');
    const regions = system.listRegions('w-1', 'f-b');
    expect(regions).toHaveLength(1);
    expect(regions[0]?.status).toBe('CONTROLLED');

    const territory = system.getFactionTerritory('f-b');
    expect(territory?.controlledRegions).toBe(1);
  });
});
