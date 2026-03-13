import { describe, expect, it } from 'vitest';
import {
  BASE_ISSUANCE,
  INTEGRITY_FLOOR,
  adjustForProductivity,
  calculateAnnualIssuance,
} from '../stellar-standard.js';
import type { WorldPhysicalProperties } from '../stellar-standard.js';

describe('stellar-standard simulation', () => {
  const worlds: ReadonlyArray<readonly [string, WorldPhysicalProperties]> = [
    [
      'forge-prime',
      {
        stellarClass: 'O',
        orbitalZone: 'habitable',
        latticeNodeDensity: 9,
        worldMass: 180,
        latticeIntegrity: 92,
      },
    ],
    [
      'green-hearth',
      {
        stellarClass: 'G',
        orbitalZone: 'habitable',
        latticeNodeDensity: 7,
        worldMass: 110,
        latticeIntegrity: 100,
      },
    ],
    [
      'ash-rim',
      {
        stellarClass: 'M',
        orbitalZone: 'inner',
        latticeNodeDensity: 2,
        worldMass: 70,
        latticeIntegrity: 35,
      },
    ],
  ];

  it('simulates predictable issuance ordering by stellar and zone profile', () => {
    const issuance = new Map(worlds.map(([id, props]) => [id, calculateAnnualIssuance(props)]));

    expect(issuance.get('forge-prime')! > issuance.get('green-hearth')!).toBe(true);
    expect(issuance.get('green-hearth')! > issuance.get('ash-rim')!).toBe(true);
    expect(issuance.get('ash-rim')!).toBeGreaterThanOrEqual(BASE_ISSUANCE / 10n);
  });

  it('simulates integrity floor and ceiling clamping for stressed lattice states', () => {
    const base: WorldPhysicalProperties = {
      stellarClass: 'K',
      orbitalZone: 'outer',
      latticeNodeDensity: 5,
      worldMass: 90,
      latticeIntegrity: 50,
    };

    const belowFloor = calculateAnnualIssuance({ ...base, latticeIntegrity: 0 });
    const atFloor = calculateAnnualIssuance({ ...base, latticeIntegrity: Number(INTEGRITY_FLOOR) });
    const aboveCeil = calculateAnnualIssuance({ ...base, latticeIntegrity: 150 });
    const atCeil = calculateAnnualIssuance({ ...base, latticeIntegrity: 100 });

    expect(belowFloor).toBe(atFloor);
    expect(aboveCeil).toBe(atCeil);
  });

  it('simulates productivity modulation bounds across a yearly cycle', () => {
    const annual = calculateAnnualIssuance({
      stellarClass: 'F',
      orbitalZone: 'habitable',
      latticeNodeDensity: 8,
      worldMass: 120,
      latticeIntegrity: 100,
    });

    expect(adjustForProductivity(annual, 75)).toBe((annual * 80n) / 100n);
    expect(adjustForProductivity(annual, 100)).toBe(annual);
    expect(adjustForProductivity(annual, 140)).toBe((annual * 120n) / 100n);
  });
});
