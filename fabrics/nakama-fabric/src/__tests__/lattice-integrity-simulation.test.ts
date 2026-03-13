import { describe, expect, it } from 'vitest';
import { createLatticeIntegrityService } from '../lattice-integrity.js';

describe('lattice-integrity simulation', () => {
  it('simulates degradation and partial recovery across worlds', () => {
    const service = createLatticeIntegrityService();
    service.registerWorld('earth', {
      stellarClass: 'G',
      orbitalZone: 'habitable',
      latticeNodeDensity: 7,
      worldMass: 100,
      latticeIntegrity: 100,
    });
    service.registerWorld('mars', {
      stellarClass: 'K',
      orbitalZone: 'inner',
      latticeNodeDensity: 4,
      worldMass: 60,
      latticeIntegrity: 85,
    });

    service.degrade('earth', 35, 'ascendancy-strike');
    service.degrade('mars', 20, 'supply-chain-collapse');
    service.restore('mars', 10, 'repair-crews');

    expect(service.getIntegrity('earth')).toBe(65);
    expect(service.getIntegrity('mars')).toBe(75);
    expect(service.listWorlds().sort()).toEqual(['earth', 'mars']);
  });
});
