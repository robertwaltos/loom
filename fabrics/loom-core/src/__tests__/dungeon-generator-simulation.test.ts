import { describe, expect, it } from 'vitest';
import { createDungeonGeneratorState, generateLayout, validateConnectivity } from '../dungeon-generator.js';

describe('dungeon-generator simulation', () => {
  it('simulates generating and validating a mid-tier dungeon layout', () => {
    let now = 1_000_000n;
    let id = 0;
    const state = createDungeonGeneratorState(
      { nowMicros: () => (now += 1_000n) },
      { nextId: () => `room-${++id}` },
      { info: () => undefined, warn: () => undefined, error: () => undefined },
    );

    const layout = generateLayout(state, {
      minRooms: 5,
      maxRooms: 8,
      difficultyTier: 2,
      minRoomArea: 100,
      maxRoomArea: 400,
      connectionDensity: 0.5,
      secretRoomChance: 0.1,
      treasureRoomCount: 1,
    });

    expect(typeof layout).toBe('object');
    if (typeof layout === 'object') {
      const validation = validateConnectivity(state, layout.layoutId);
      expect(typeof validation).toBe('object');
      expect(layout.rooms.size).toBeGreaterThanOrEqual(5);
    }
  });
});
