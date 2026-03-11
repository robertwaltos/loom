/**
 * Lattice Integrity Service — Tracks and modifies world lattice integrity.
 *
 * Bible v1.2: Lattice integrity directly affects KALON issuance via
 * the Stellar Standard formula. Ascendancy action degrades integrity,
 * reducing a world's economic output. Restoration requires coordinated
 * effort and time. Range: [0, 100]. Floor for issuance purposes: 10%.
 *
 * This service is the single source of truth for integrity values.
 * The WorldIssuanceService reads from here when computing issuance.
 */

import { worldNotRegistered, integrityOutOfRange } from './kalon-errors.js';
import { calculateAnnualIssuance } from './stellar-standard.js';
import type { WorldPhysicalProperties } from './stellar-standard.js';

export interface IntegrityChangeResult {
  readonly worldId: string;
  readonly previousIntegrity: number;
  readonly newIntegrity: number;
  readonly previousAnnualIssuance: bigint;
  readonly newAnnualIssuance: bigint;
  readonly reason: string;
}

export interface LatticeIntegrityService {
  registerWorld(worldId: string, properties: WorldPhysicalProperties): void;
  getIntegrity(worldId: string): number;
  getProperties(worldId: string): WorldPhysicalProperties;
  degrade(worldId: string, amount: number, reason: string): IntegrityChangeResult;
  restore(worldId: string, amount: number, reason: string): IntegrityChangeResult;
  setIntegrity(worldId: string, value: number, reason: string): IntegrityChangeResult;
  isRegistered(worldId: string): boolean;
  listWorlds(): ReadonlyArray<string>;
}

interface WorldIntegrityState {
  readonly worldId: string;
  readonly baseProperties: Omit<WorldPhysicalProperties, 'latticeIntegrity'>;
  integrity: number;
}

interface ServiceState {
  readonly worlds: Map<string, WorldIntegrityState>;
}

export function createLatticeIntegrityService(): LatticeIntegrityService {
  const state: ServiceState = { worlds: new Map() };

  return {
    registerWorld: (id, props) => {
      registerWorldImpl(state, id, props);
    },
    getIntegrity: (id) => getIntegrityImpl(state, id),
    getProperties: (id) => getPropertiesImpl(state, id),
    degrade: (id, amount, reason) => degradeImpl(state, id, amount, reason),
    restore: (id, amount, reason) => restoreImpl(state, id, amount, reason),
    setIntegrity: (id, value, reason) => setIntegrityImpl(state, id, value, reason),
    isRegistered: (id) => state.worlds.has(id),
    listWorlds: () => [...state.worlds.keys()],
  };
}

function registerWorldImpl(
  state: ServiceState,
  worldId: string,
  properties: WorldPhysicalProperties,
): void {
  const existing = state.worlds.get(worldId);
  if (existing !== undefined) {
    existing.integrity = properties.latticeIntegrity;
    return;
  }
  state.worlds.set(worldId, {
    worldId,
    baseProperties: {
      stellarClass: properties.stellarClass,
      orbitalZone: properties.orbitalZone,
      latticeNodeDensity: properties.latticeNodeDensity,
      worldMass: properties.worldMass,
    },
    integrity: properties.latticeIntegrity,
  });
}

function getIntegrityImpl(state: ServiceState, worldId: string): number {
  return getWorldState(state, worldId).integrity;
}

function getPropertiesImpl(state: ServiceState, worldId: string): WorldPhysicalProperties {
  const ws = getWorldState(state, worldId);
  return { ...ws.baseProperties, latticeIntegrity: ws.integrity };
}

function degradeImpl(
  state: ServiceState,
  worldId: string,
  amount: number,
  reason: string,
): IntegrityChangeResult {
  validateIntegrityDelta(worldId, amount);
  const ws = getWorldState(state, worldId);
  const previous = ws.integrity;
  ws.integrity = clampIntegrityValue(previous - amount);
  return buildChangeResult(ws, previous, reason);
}

function restoreImpl(
  state: ServiceState,
  worldId: string,
  amount: number,
  reason: string,
): IntegrityChangeResult {
  validateIntegrityDelta(worldId, amount);
  const ws = getWorldState(state, worldId);
  const previous = ws.integrity;
  ws.integrity = clampIntegrityValue(previous + amount);
  return buildChangeResult(ws, previous, reason);
}

function setIntegrityImpl(
  state: ServiceState,
  worldId: string,
  value: number,
  reason: string,
): IntegrityChangeResult {
  if (value < 0 || value > 100) throw integrityOutOfRange(worldId, value);
  const ws = getWorldState(state, worldId);
  const previous = ws.integrity;
  ws.integrity = value;
  return buildChangeResult(ws, previous, reason);
}

function getWorldState(state: ServiceState, worldId: string): WorldIntegrityState {
  const ws = state.worlds.get(worldId);
  if (ws === undefined) throw worldNotRegistered(worldId);
  return ws;
}

function validateIntegrityDelta(worldId: string, amount: number): void {
  if (amount < 0) throw integrityOutOfRange(worldId, amount);
}

function clampIntegrityValue(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function buildChangeResult(
  ws: WorldIntegrityState,
  previousIntegrity: number,
  reason: string,
): IntegrityChangeResult {
  const previousProps: WorldPhysicalProperties = {
    ...ws.baseProperties,
    latticeIntegrity: previousIntegrity,
  };
  const currentProps: WorldPhysicalProperties = {
    ...ws.baseProperties,
    latticeIntegrity: ws.integrity,
  };
  return {
    worldId: ws.worldId,
    previousIntegrity,
    newIntegrity: ws.integrity,
    previousAnnualIssuance: calculateAnnualIssuance(previousProps),
    newAnnualIssuance: calculateAnnualIssuance(currentProps),
    reason,
  };
}
