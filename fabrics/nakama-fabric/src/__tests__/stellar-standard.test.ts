import { describe, it, expect } from 'vitest';
import {
  calculateAnnualIssuance,
  adjustForProductivity,
  BASE_ISSUANCE,
  INTEGRITY_FLOOR,
} from '../stellar-standard.js';
import type { WorldPhysicalProperties } from '../stellar-standard.js';

function earthlike(): WorldPhysicalProperties {
  return {
    stellarClass: 'G',
    orbitalZone: 'habitable',
    latticeNodeDensity: 7,
    worldMass: 100,
    latticeIntegrity: 100,
  };
}

describe('Stellar Standard issuance', () => {
  it('calculates earth-equivalent world issuance', () => {
    const issuance = calculateAnnualIssuance(earthlike());
    // 1,000,000 × 3(G) × 3(habitable) × 7(nodes) × 100(integrity) / 100
    expect(issuance).toBe(63_000_000n);
  });

  it('produces minimum issuance for M-class outer zone', () => {
    const minimum = calculateAnnualIssuance({
      stellarClass: 'M',
      orbitalZone: 'inner',
      latticeNodeDensity: 1,
      worldMass: 50,
      latticeIntegrity: 100,
    });
    // 1,000,000 × 1(M) × 1(inner) × 1(node) × 100(integrity) / 100
    expect(minimum).toBe(BASE_ISSUANCE);
  });

  it('produces maximum issuance for O-class habitable zone', () => {
    const maximum = calculateAnnualIssuance({
      stellarClass: 'O',
      orbitalZone: 'habitable',
      latticeNodeDensity: 10,
      worldMass: 200,
      latticeIntegrity: 100,
    });
    // 1,000,000 × 8(O) × 3(habitable) × 10(nodes) × 100(integrity) / 100
    expect(maximum).toBe(240_000_000n);
  });

  it('reduces issuance when lattice integrity degrades', () => {
    const full = calculateAnnualIssuance(earthlike());
    const degraded = calculateAnnualIssuance({ ...earthlike(), latticeIntegrity: 50 });
    expect(degraded).toBe(full / 2n);
  });

  it('clamps integrity to floor of 10%', () => {
    const floored = calculateAnnualIssuance({ ...earthlike(), latticeIntegrity: 0 });
    const atFloor = calculateAnnualIssuance({
      ...earthlike(),
      latticeIntegrity: Number(INTEGRITY_FLOOR),
    });
    expect(floored).toBe(atFloor);
    expect(floored).toBeGreaterThan(0n);
  });

  it('clamps integrity to ceiling of 100%', () => {
    const capped = calculateAnnualIssuance({ ...earthlike(), latticeIntegrity: 150 });
    const normal = calculateAnnualIssuance(earthlike());
    expect(capped).toBe(normal);
  });
});

describe('NPC productivity adjustment', () => {
  it('applies 120% bonus for thriving NPCs', () => {
    const base = 63_000_000n;
    const adjusted = adjustForProductivity(base, 120);
    expect(adjusted).toBe((base * 120n) / 100n);
  });

  it('applies 80% penalty for uncooperative NPCs', () => {
    const base = 63_000_000n;
    const adjusted = adjustForProductivity(base, 80);
    expect(adjusted).toBe((base * 80n) / 100n);
  });

  it('clamps productivity to floor of 80', () => {
    const base = 63_000_000n;
    const floored = adjustForProductivity(base, 50);
    expect(floored).toBe((base * 80n) / 100n);
  });

  it('clamps productivity to ceiling of 120', () => {
    const base = 63_000_000n;
    const capped = adjustForProductivity(base, 200);
    expect(capped).toBe((base * 120n) / 100n);
  });
});
