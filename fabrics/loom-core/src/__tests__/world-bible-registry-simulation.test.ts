import { describe, expect, it } from 'vitest';
import {
  getAllWorlds,
  getWorldById,
  getWorldsByStellarClass,
  getWorldsBySovereignty,
  STELLAR_ISSUANCE_MULTIPLIER,
} from '../world-bible-registry.js';

describe('world-bible-registry simulation', () => {
  it('simulates strategic lookup and classification of canonical launch worlds', () => {
    const worlds = getAllWorlds();
    const alkahest = getWorldById('alkahest');
    const gWorlds = getWorldsByStellarClass('G');
    const contested = getWorldsBySovereignty('contested');

    const totalIssuance = worlds.reduce((sum, w) => {
      const mult = STELLAR_ISSUANCE_MULTIPLIER[w.stellarClass] ?? 1;
      return sum + w.kalonIssuanceMillions * mult;
    }, 0);

    expect(worlds).toHaveLength(8);
    expect(alkahest?.name).toBe('Alkahest');
    expect(gWorlds.length).toBeGreaterThan(0);
    expect(contested.length).toBeGreaterThanOrEqual(1);
    expect(totalIssuance).toBeGreaterThan(0);
  });
});
