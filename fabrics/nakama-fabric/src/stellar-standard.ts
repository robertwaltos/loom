/**
 * The Stellar Standard — World-based KALON issuance.
 *
 * Bible v1.2: KALON is not issued by any entity. It is discovered
 * through Survey. Each world produces a fixed annual issuance
 * derived from physical properties. Total supply grows as worlds
 * are unlocked — organically, predictably, by a public formula.
 *
 * All values are whole KALON (not micro-KALON). Convert with
 * kalonToMicro() before passing to the ledger.
 */

export type StellarClass = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';

export type OrbitalZone = 'inner' | 'habitable' | 'outer';

export interface WorldPhysicalProperties {
  readonly stellarClass: StellarClass;
  readonly orbitalZone: OrbitalZone;
  readonly latticeNodeDensity: number;
  readonly worldMass: number;
  readonly latticeIntegrity: number;
}

export const BASE_ISSUANCE = 1_000_000n;

export const INTEGRITY_FLOOR = 10n;

const STELLAR_MULTIPLIERS: Readonly<Record<StellarClass, bigint>> = {
  O: 8n,
  B: 7n,
  A: 5n,
  F: 4n,
  G: 3n,
  K: 2n,
  M: 1n,
};

const ZONE_MULTIPLIERS: Readonly<Record<OrbitalZone, bigint>> = {
  inner: 1n,
  habitable: 3n,
  outer: 2n,
};

export function calculateAnnualIssuance(world: WorldPhysicalProperties): bigint {
  const stellar = STELLAR_MULTIPLIERS[world.stellarClass];
  const zone = ZONE_MULTIPLIERS[world.orbitalZone];
  const nodeFactor = BigInt(world.latticeNodeDensity);
  const integrity = clampIntegrity(BigInt(world.latticeIntegrity));

  return (BASE_ISSUANCE * stellar * zone * nodeFactor * integrity) / 100n;
}

function clampIntegrity(integrity: bigint): bigint {
  if (integrity < INTEGRITY_FLOOR) return INTEGRITY_FLOOR;
  if (integrity > 100n) return 100n;
  return integrity;
}

export function adjustForProductivity(baseIssuance: bigint, productivityIndex: number): bigint {
  const factor = clampProductivity(productivityIndex);
  return (baseIssuance * BigInt(factor)) / 100n;
}

function clampProductivity(index: number): number {
  if (index < 80) return 80;
  if (index > 120) return 120;
  return index;
}
