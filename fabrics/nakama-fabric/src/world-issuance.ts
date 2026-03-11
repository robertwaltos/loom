/**
 * World Issuance Service — Annual KALON minting per world.
 *
 * Bible v1.2: Each world produces a fixed annual issuance derived from
 * physical properties via the Stellar Standard. The issuance cycle runs
 * once per in-game year. KALON is minted into the world's treasury
 * account on the ledger, then distributed:
 *
 *   90% → World Treasury (dynasty taxes, public works)
 *    9% → Commons Fund (UBK, Genesis Vault replenishment)
 *    1% → Genesis Vault
 *
 * NPC productivity adjusts the base issuance ±20%.
 * Lattice integrity affects issuance via the Stellar Standard formula.
 */

import type { KalonLedger } from './kalon-ledger.js';
import type { LatticeIntegrityService } from './lattice-integrity.js';
import type { GenesisVault } from './genesis-vault.js';
import type { WorldPhysicalProperties } from './stellar-standard.js';
import { calculateAnnualIssuance, adjustForProductivity } from './stellar-standard.js';
import { kalonToMicro } from './kalon-constants.js';
import { worldNotRegistered, worldAlreadyRegistered } from './kalon-errors.js';

export interface IssuanceResult {
  readonly worldId: string;
  readonly baseIssuance: bigint;
  readonly adjustedIssuance: bigint;
  readonly treasuryAmount: bigint;
  readonly commonsAmount: bigint;
  readonly vaultAmount: bigint;
  readonly productivityIndex: number;
  readonly latticeIntegrity: number;
  readonly timestamp: number;
}

export interface IssuanceSummary {
  readonly totalWorlds: number;
  readonly totalIssuance: bigint;
  readonly worldResults: ReadonlyArray<IssuanceResult>;
}

export interface WorldIssuanceService {
  registerWorld(worldId: string, properties: WorldPhysicalProperties): void;
  unregisterWorld(worldId: string): void;
  setProductivity(worldId: string, index: number): void;
  getProductivity(worldId: string): number;
  processWorldIssuance(worldId: string): IssuanceResult;
  processAllIssuance(): IssuanceSummary;
  previewIssuance(worldId: string): bigint;
  isRegistered(worldId: string): boolean;
  listRegisteredWorlds(): ReadonlyArray<string>;
}

/** Distribution ratios in basis points (10000 = 100%) */
const DISTRIBUTION = {
  treasuryBps: 9000n,
  commonsBps: 900n,
  vaultBps: 100n,
  scale: 10000n,
} as const;

interface WorldEconomyState {
  readonly worldId: string;
  readonly treasuryAccountId: string;
  productivityIndex: number;
}

interface ServiceState {
  readonly worlds: Map<string, WorldEconomyState>;
  readonly ledger: KalonLedger;
  readonly integrityService: LatticeIntegrityService;
  readonly vault: GenesisVault;
  readonly clock: { nowMicroseconds(): number };
}

export interface WorldIssuanceDeps {
  readonly ledger: KalonLedger;
  readonly integrityService: LatticeIntegrityService;
  readonly vault: GenesisVault;
  readonly clock: { nowMicroseconds(): number };
}

export function createWorldIssuanceService(deps: WorldIssuanceDeps): WorldIssuanceService {
  const state: ServiceState = { ...deps, worlds: new Map() };

  return {
    registerWorld: (id, props) => {
      registerWorldImpl(state, id, props);
    },
    unregisterWorld: (id) => {
      unregisterWorldImpl(state, id);
    },
    setProductivity: (id, index) => {
      setProductivityImpl(state, id, index);
    },
    getProductivity: (id) => getProductivityImpl(state, id),
    processWorldIssuance: (id) => processWorldImpl(state, id),
    processAllIssuance: () => processAllImpl(state),
    previewIssuance: (id) => previewImpl(state, id),
    isRegistered: (id) => state.worlds.has(id),
    listRegisteredWorlds: () => [...state.worlds.keys()],
  };
}

function registerWorldImpl(
  state: ServiceState,
  worldId: string,
  properties: WorldPhysicalProperties,
): void {
  if (state.worlds.has(worldId)) throw worldAlreadyRegistered(worldId);

  const treasuryAccountId = `treasury:${worldId}`;
  state.integrityService.registerWorld(worldId, properties);

  if (!state.ledger.accountExists(treasuryAccountId)) {
    state.ledger.createAccount(treasuryAccountId);
  }
  state.worlds.set(worldId, { worldId, treasuryAccountId, productivityIndex: 100 });
}

function unregisterWorldImpl(state: ServiceState, worldId: string): void {
  if (!state.worlds.has(worldId)) throw worldNotRegistered(worldId);
  state.worlds.delete(worldId);
}

function setProductivityImpl(state: ServiceState, worldId: string, index: number): void {
  const ws = getWorldEconomy(state, worldId);
  ws.productivityIndex = index;
}

function getProductivityImpl(state: ServiceState, worldId: string): number {
  return getWorldEconomy(state, worldId).productivityIndex;
}

function processWorldImpl(state: ServiceState, worldId: string): IssuanceResult {
  const ws = getWorldEconomy(state, worldId);
  const properties = state.integrityService.getProperties(worldId);
  const baseIssuance = calculateAnnualIssuance(properties);
  const adjustedIssuance = adjustForProductivity(baseIssuance, ws.productivityIndex);

  const microIssuance = kalonToMicro(adjustedIssuance);
  const distribution = distributeIssuance(microIssuance);

  state.ledger.mint(ws.treasuryAccountId, distribution.treasury);
  state.vault.replenish(adjustedIssuance);

  return {
    worldId,
    baseIssuance,
    adjustedIssuance,
    treasuryAmount: distribution.treasury,
    commonsAmount: distribution.commons,
    vaultAmount: distribution.vault,
    productivityIndex: ws.productivityIndex,
    latticeIntegrity: properties.latticeIntegrity,
    timestamp: state.clock.nowMicroseconds(),
  };
}

function processAllImpl(state: ServiceState): IssuanceSummary {
  const results: IssuanceResult[] = [];
  let totalIssuance = 0n;

  for (const worldId of state.worlds.keys()) {
    const result = processWorldImpl(state, worldId);
    results.push(result);
    totalIssuance += result.adjustedIssuance;
  }

  return { totalWorlds: results.length, totalIssuance, worldResults: results };
}

function previewImpl(state: ServiceState, worldId: string): bigint {
  const ws = getWorldEconomy(state, worldId);
  const properties = state.integrityService.getProperties(worldId);
  return adjustForProductivity(calculateAnnualIssuance(properties), ws.productivityIndex);
}

function distributeIssuance(total: bigint): {
  readonly treasury: bigint;
  readonly commons: bigint;
  readonly vault: bigint;
} {
  const treasury = (total * DISTRIBUTION.treasuryBps) / DISTRIBUTION.scale;
  const commons = (total * DISTRIBUTION.commonsBps) / DISTRIBUTION.scale;
  const vault = total - treasury - commons;
  return { treasury, commons, vault };
}

function getWorldEconomy(state: ServiceState, worldId: string): WorldEconomyState {
  const ws = state.worlds.get(worldId);
  if (ws === undefined) throw worldNotRegistered(worldId);
  return ws;
}
