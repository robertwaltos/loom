import { describe, expect, it } from 'vitest';
import { createWorldResourceMap } from '../world-resource-map.js';

function makeMap() {
  let now = 1_000_000;
  let id = 0;
  return createWorldResourceMap({
    clock: { nowMicroseconds: () => now++ },
    idGenerator: { next: () => `dep-${++id}` },
  });
}

describe('world-resource-map simulation', () => {
  it('models extraction and depletion across multiple deposits', () => {
    const map = makeMap();
    const iron = map.register({ worldId: 'terra', resourceType: 'mineral', name: 'iron', quantity: 100 });
    map.register({ worldId: 'terra', resourceType: 'water', name: 'aquifer', quantity: 500 });

    const pull1 = map.extract(iron.depositId, 40);
    const pull2 = map.extract(iron.depositId, 1000);
    expect(pull1?.remaining).toBe(60);
    expect(pull2?.depleted).toBe(true);

    expect(map.getAvailable('terra')).toHaveLength(1);
    expect(map.getStats().depletedDeposits).toBe(1);
  });
});
