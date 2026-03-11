/**
 * Estate System — Player-owned property with progression and production.
 *
 *   - Estate tiers: plot → homestead → manor → keep → citadel
 *   - Specialization: farming, mining, crafting, trading, military, research
 *   - Defense systems: walls, towers, guards, siege preparation
 *   - Workers: assignable NPCs with skill progression
 *   - Production chains: raw materials → processed goods → finished items
 *   - Marketplace: automated selling of produced goods
 *   - Dynasty networks: shared resources, coordinated production
 *   - Architecture styles: world culture defines visual + gameplay effects
 *
 * "Every dynasty begins with a single plot."
 */

import type { LoomEvent } from '@loom/events-contracts';

// ─── Ports ──────────────────────────────────────────────────────────

export interface EstateClockPort {
  readonly now: () => bigint;
}

export interface EstateIdPort {
  readonly next: () => string;
}

export interface EstateLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface EstateEventPort {
  readonly emit: (event: LoomEvent) => void;
}

export interface EstateStorePort {
  readonly save: (estate: Estate) => Promise<void>;
  readonly getById: (estateId: string) => Promise<Estate | undefined>;
  readonly getByOwner: (ownerId: string) => Promise<readonly Estate[]>;
  readonly getByWorld: (worldId: string) => Promise<readonly Estate[]>;
  readonly getByDynasty: (dynastyId: string) => Promise<readonly Estate[]>;
}

export interface EstateEconomyPort {
  readonly getResourcePrice: (resourceId: string, worldId: string) => Promise<number>;
  readonly sellGoods: (estateId: string, itemId: string, quantity: number, pricePerUnit: number) => Promise<number>;
}

// ─── Types ──────────────────────────────────────────────────────────

export type EstateTier = 'plot' | 'homestead' | 'manor' | 'keep' | 'citadel';

export type EstateSpecialization =
  | 'farming'
  | 'mining'
  | 'crafting'
  | 'trading'
  | 'military'
  | 'research'
  | 'mixed';

export type ArchitecturalStyle =
  | 'nordic-timber'
  | 'mediterranean-stone'
  | 'jungle-canopy'
  | 'steppe-yurt'
  | 'archipelago-stilts'
  | 'desert-adobe'
  | 'tundra-ice'
  | 'volcanic-obsidian'
  | 'floating-crystal'
  | 'undersea-coral';

export type DefenseType = 'wall' | 'tower' | 'gate' | 'moat' | 'guard-post' | 'ballista' | 'ward';

export type ProductionState = 'idle' | 'producing' | 'blocked' | 'upgrading';

export interface Estate {
  readonly estateId: string;
  readonly ownerId: string;
  readonly dynastyId: string | undefined;
  readonly worldId: string;
  readonly name: string;
  readonly tier: EstateTier;
  readonly specialization: EstateSpecialization;
  readonly architecturalStyle: ArchitecturalStyle;
  readonly workers: readonly EstateWorker[];
  readonly defenses: readonly DefenseInstallation[];
  readonly productionChains: readonly ProductionChain[];
  readonly storageCapacity: number;
  readonly storedResources: ReadonlyMap<string, number>;
  readonly totalInvestmentKalon: number;
  readonly weeklyRevenueKalon: number;
  readonly createdAt: bigint;
  readonly upgradedAt: bigint | undefined;
}

export interface EstateWorker {
  readonly workerId: string;
  readonly npcId: string;
  readonly name: string;
  readonly role: string;
  readonly skillLevel: number;
  readonly maxSkillLevel: number;
  readonly assignedChainId: string | undefined;
  readonly morale: number;
  readonly hiredAt: bigint;
}

export interface DefenseInstallation {
  readonly defenseId: string;
  readonly type: DefenseType;
  readonly level: number;
  readonly maxLevel: number;
  readonly hitPoints: number;
  readonly maxHitPoints: number;
  readonly maintenanceCostKalon: number;
}

export interface ProductionChain {
  readonly chainId: string;
  readonly name: string;
  readonly inputs: readonly ProductionInput[];
  readonly output: ProductionOutput;
  readonly state: ProductionState;
  readonly cycleTimeMs: number;
  readonly efficiency: number;
  readonly assignedWorkerIds: readonly string[];
  readonly completedCycles: number;
}

export interface ProductionInput {
  readonly resourceId: string;
  readonly quantityPerCycle: number;
}

export interface ProductionOutput {
  readonly resourceId: string;
  readonly quantityPerCycle: number;
  readonly qualityModifier: number;
}

export interface UpgradeRequirement {
  readonly targetTier: EstateTier;
  readonly kalonCost: number;
  readonly resourceRequirements: ReadonlyMap<string, number>;
  readonly timeMs: number;
  readonly prerequisiteSpecialization: EstateSpecialization | undefined;
  readonly prerequisiteWorkerCount: number;
}

export interface DynastyEstateNetwork {
  readonly dynastyId: string;
  readonly estates: readonly string[];
  readonly sharedResourcePool: ReadonlyMap<string, number>;
  readonly coordinatedProduction: readonly CoordinatedChain[];
  readonly networkBonus: number;
}

export interface CoordinatedChain {
  readonly sourceEstateId: string;
  readonly targetEstateId: string;
  readonly resourceId: string;
  readonly quantityPerCycle: number;
}

export interface SiegeState {
  readonly estateId: string;
  readonly attackerDynastyId: string;
  readonly phase: 'preparing' | 'active' | 'breach' | 'repelled' | 'fallen';
  readonly defenseIntegrity: number;
  readonly startedAt: bigint;
  readonly resolvedAt: bigint | undefined;
}

// ─── Config ─────────────────────────────────────────────────────────

export interface EstateSystemConfig {
  readonly maxWorkersPerTier: Record<EstateTier, number>;
  readonly maxDefensesPerTier: Record<EstateTier, number>;
  readonly maxProductionChainsPerTier: Record<EstateTier, number>;
  readonly storagePerTier: Record<EstateTier, number>;
  readonly upgradeTimeMs: Record<EstateTier, number>;
  readonly workerSkillGainPerCycle: number;
  readonly networkBonusPerEstate: number;
}

// ─── Stats ──────────────────────────────────────────────────────────

export interface EstateSystemStats {
  readonly totalEstates: number;
  readonly estatesByTier: Record<EstateTier, number>;
  readonly totalWorkers: number;
  readonly totalProductionCycles: number;
  readonly totalRevenueGenerated: number;
  readonly siegesInitiated: number;
  readonly dynastyNetworks: number;
}

// ─── Interface ──────────────────────────────────────────────────────

export interface EstateSystemEngine {
  // Estate CRUD
  readonly claimPlot: (ownerId: string, worldId: string, name: string, style: ArchitecturalStyle) => Promise<Estate>;
  readonly getEstate: (estateId: string) => Promise<Estate | undefined>;
  readonly getPlayerEstates: (ownerId: string) => Promise<readonly Estate[]>;
  readonly getWorldEstates: (worldId: string) => Promise<readonly Estate[]>;

  // Upgrades
  readonly getUpgradeRequirements: (estateId: string) => Promise<UpgradeRequirement | undefined>;
  readonly upgradeEstate: (estateId: string) => Promise<Estate>;
  readonly specialize: (estateId: string, specialization: EstateSpecialization) => Promise<Estate>;

  // Workers
  readonly hireWorker: (estateId: string, npcId: string, name: string, role: string) => Promise<EstateWorker>;
  readonly assignWorker: (estateId: string, workerId: string, chainId: string) => Promise<void>;
  readonly trainWorker: (estateId: string, workerId: string) => Promise<EstateWorker>;

  // Defenses
  readonly buildDefense: (estateId: string, type: DefenseType) => Promise<DefenseInstallation>;
  readonly upgradeDefense: (estateId: string, defenseId: string) => Promise<DefenseInstallation>;

  // Production
  readonly addProductionChain: (estateId: string, chain: Omit<ProductionChain, 'chainId' | 'state' | 'efficiency' | 'completedCycles'>) => Promise<ProductionChain>;
  readonly runProductionCycle: (estateId: string, chainId: string) => Promise<ProductionOutput>;
  readonly sellProduction: (estateId: string, resourceId: string, quantity: number) => Promise<number>;

  // Dynasty networks
  readonly createDynastyNetwork: (dynastyId: string) => Promise<DynastyEstateNetwork>;
  readonly coordinateProduction: (dynastyId: string, chain: CoordinatedChain) => Promise<DynastyEstateNetwork>;

  // Siege
  readonly initiateSiege: (estateId: string, attackerDynastyId: string) => Promise<SiegeState>;
  readonly advanceSiege: (estateId: string) => Promise<SiegeState>;

  readonly getStats: () => EstateSystemStats;
}

// ─── Deps ───────────────────────────────────────────────────────────

export interface EstateSystemDeps {
  readonly clock: EstateClockPort;
  readonly id: EstateIdPort;
  readonly log: EstateLogPort;
  readonly events: EstateEventPort;
  readonly store: EstateStorePort;
  readonly economy: EstateEconomyPort;
}

// ─── Defaults ───────────────────────────────────────────────────────

const DEFAULT_CONFIG: EstateSystemConfig = {
  maxWorkersPerTier: { plot: 0, homestead: 2, manor: 5, keep: 12, citadel: 30 },
  maxDefensesPerTier: { plot: 0, homestead: 1, manor: 3, keep: 8, citadel: 20 },
  maxProductionChainsPerTier: { plot: 1, homestead: 2, manor: 4, keep: 8, citadel: 16 },
  storagePerTier: { plot: 100, homestead: 500, manor: 2000, keep: 10000, citadel: 50000 },
  upgradeTimeMs: { plot: 0, homestead: 3600000, manor: 86400000, keep: 604800000, citadel: 2592000000 },
  workerSkillGainPerCycle: 0.01,
  networkBonusPerEstate: 0.05,
};

const TIER_ORDER: readonly EstateTier[] = ['plot', 'homestead', 'manor', 'keep', 'citadel'] as const;

const UPGRADE_COSTS: Record<EstateTier, number> = {
  plot: 0,
  homestead: 1000,
  manor: 10000,
  keep: 100000,
  citadel: 1000000,
};

// ─── Factory ────────────────────────────────────────────────────────

export function createEstateSystemEngine(
  deps: EstateSystemDeps,
  config: Partial<EstateSystemConfig> = {},
): EstateSystemEngine {
  const cfg: EstateSystemConfig = { ...DEFAULT_CONFIG, ...config };

  const dynastyNetworks = new Map<string, DynastyEstateNetwork>();
  const sieges = new Map<string, SiegeState>();

  let totalEstates = 0;
  const tierCounts: Record<EstateTier, number> = { plot: 0, homestead: 0, manor: 0, keep: 0, citadel: 0 };
  let totalWorkers = 0;
  let totalProductionCycles = 0;
  let totalRevenueGenerated = 0;
  let siegesInitiated = 0;

  async function claimPlot(
    ownerId: string,
    worldId: string,
    name: string,
    style: ArchitecturalStyle,
  ): Promise<Estate> {
    const estate: Estate = {
      estateId: deps.id.next(),
      ownerId,
      dynastyId: undefined,
      worldId,
      name,
      tier: 'plot',
      specialization: 'mixed',
      architecturalStyle: style,
      workers: [],
      defenses: [],
      productionChains: [],
      storageCapacity: cfg.storagePerTier.plot,
      storedResources: new Map(),
      totalInvestmentKalon: 0,
      weeklyRevenueKalon: 0,
      createdAt: deps.clock.now(),
      upgradedAt: undefined,
    };

    await deps.store.save(estate);
    totalEstates++;
    tierCounts.plot++;
    deps.log.info('plot-claimed', { estateId: estate.estateId, ownerId, worldId });
    return estate;
  }

  async function getEstate(estateId: string): Promise<Estate | undefined> {
    return deps.store.getById(estateId);
  }

  async function getPlayerEstates(ownerId: string): Promise<readonly Estate[]> {
    return deps.store.getByOwner(ownerId);
  }

  async function getWorldEstates(worldId: string): Promise<readonly Estate[]> {
    return deps.store.getByWorld(worldId);
  }

  async function getUpgradeRequirements(estateId: string): Promise<UpgradeRequirement | undefined> {
    const estate = await deps.store.getById(estateId);
    if (estate === undefined) return undefined;

    const currentIndex = TIER_ORDER.indexOf(estate.tier);
    if (currentIndex >= TIER_ORDER.length - 1) return undefined;

    const targetTier = TIER_ORDER[currentIndex + 1]!;
    return {
      targetTier,
      kalonCost: UPGRADE_COSTS[targetTier],
      resourceRequirements: new Map(),
      timeMs: cfg.upgradeTimeMs[targetTier],
      prerequisiteSpecialization: undefined,
      prerequisiteWorkerCount: currentIndex,
    };
  }

  async function upgradeEstate(estateId: string): Promise<Estate> {
    const estate = await deps.store.getById(estateId);
    if (estate === undefined) throw new Error(`Estate ${estateId} not found`);

    const currentIndex = TIER_ORDER.indexOf(estate.tier);
    if (currentIndex >= TIER_ORDER.length - 1) throw new Error('Already at max tier');

    const targetTier = TIER_ORDER[currentIndex + 1]!;
    tierCounts[estate.tier]--;
    tierCounts[targetTier]++;

    const upgraded: Estate = {
      ...estate,
      tier: targetTier,
      storageCapacity: cfg.storagePerTier[targetTier],
      totalInvestmentKalon: estate.totalInvestmentKalon + UPGRADE_COSTS[targetTier],
      upgradedAt: deps.clock.now(),
    };

    await deps.store.save(upgraded);
    deps.log.info('estate-upgraded', { estateId, from: estate.tier, to: targetTier });
    return upgraded;
  }

  async function specialize(estateId: string, specialization: EstateSpecialization): Promise<Estate> {
    const estate = await deps.store.getById(estateId);
    if (estate === undefined) throw new Error(`Estate ${estateId} not found`);

    const updated: Estate = { ...estate, specialization };
    await deps.store.save(updated);
    deps.log.info('estate-specialized', { estateId, specialization });
    return updated;
  }

  async function hireWorker(estateId: string, npcId: string, name: string, role: string): Promise<EstateWorker> {
    const estate = await deps.store.getById(estateId);
    if (estate === undefined) throw new Error(`Estate ${estateId} not found`);
    if (estate.workers.length >= cfg.maxWorkersPerTier[estate.tier]) {
      throw new Error(`Worker cap reached for ${estate.tier}`);
    }

    const worker: EstateWorker = {
      workerId: deps.id.next(),
      npcId,
      name,
      role,
      skillLevel: 1,
      maxSkillLevel: 10,
      assignedChainId: undefined,
      morale: 0.8,
      hiredAt: deps.clock.now(),
    };

    await deps.store.save({ ...estate, workers: [...estate.workers, worker] });
    totalWorkers++;
    deps.log.info('worker-hired', { estateId, workerId: worker.workerId, role });
    return worker;
  }

  async function assignWorker(estateId: string, workerId: string, chainId: string): Promise<void> {
    const estate = await deps.store.getById(estateId);
    if (estate === undefined) throw new Error(`Estate ${estateId} not found`);

    const workers = estate.workers.map(w =>
      w.workerId === workerId ? { ...w, assignedChainId: chainId } : w
    );
    await deps.store.save({ ...estate, workers });
  }

  async function trainWorker(estateId: string, workerId: string): Promise<EstateWorker> {
    const estate = await deps.store.getById(estateId);
    if (estate === undefined) throw new Error(`Estate ${estateId} not found`);

    const worker = estate.workers.find(w => w.workerId === workerId);
    if (worker === undefined) throw new Error(`Worker ${workerId} not found`);
    if (worker.skillLevel >= worker.maxSkillLevel) throw new Error('Worker at max skill');

    const trained: EstateWorker = {
      ...worker,
      skillLevel: Math.min(worker.maxSkillLevel, worker.skillLevel + cfg.workerSkillGainPerCycle),
    };

    const workers = estate.workers.map(w => w.workerId === workerId ? trained : w);
    await deps.store.save({ ...estate, workers });
    return trained;
  }

  async function buildDefense(estateId: string, type: DefenseType): Promise<DefenseInstallation> {
    const estate = await deps.store.getById(estateId);
    if (estate === undefined) throw new Error(`Estate ${estateId} not found`);
    if (estate.defenses.length >= cfg.maxDefensesPerTier[estate.tier]) {
      throw new Error(`Defense cap reached for ${estate.tier}`);
    }

    const defense: DefenseInstallation = {
      defenseId: deps.id.next(),
      type,
      level: 1,
      maxLevel: 5,
      hitPoints: 100,
      maxHitPoints: 100,
      maintenanceCostKalon: 10,
    };

    await deps.store.save({ ...estate, defenses: [...estate.defenses, defense] });
    deps.log.info('defense-built', { estateId, type });
    return defense;
  }

  async function upgradeDefense(estateId: string, defenseId: string): Promise<DefenseInstallation> {
    const estate = await deps.store.getById(estateId);
    if (estate === undefined) throw new Error(`Estate ${estateId} not found`);

    const defense = estate.defenses.find(d => d.defenseId === defenseId);
    if (defense === undefined) throw new Error(`Defense ${defenseId} not found`);
    if (defense.level >= defense.maxLevel) throw new Error('Defense at max level');

    const upgraded: DefenseInstallation = {
      ...defense,
      level: defense.level + 1,
      maxHitPoints: defense.maxHitPoints + 50,
      hitPoints: defense.maxHitPoints + 50,
      maintenanceCostKalon: defense.maintenanceCostKalon + 5,
    };

    const defenses = estate.defenses.map(d => d.defenseId === defenseId ? upgraded : d);
    await deps.store.save({ ...estate, defenses });
    return upgraded;
  }

  async function addProductionChain(
    estateId: string,
    partial: Omit<ProductionChain, 'chainId' | 'state' | 'efficiency' | 'completedCycles'>,
  ): Promise<ProductionChain> {
    const estate = await deps.store.getById(estateId);
    if (estate === undefined) throw new Error(`Estate ${estateId} not found`);
    if (estate.productionChains.length >= cfg.maxProductionChainsPerTier[estate.tier]) {
      throw new Error(`Production chain cap reached for ${estate.tier}`);
    }

    const chain: ProductionChain = {
      ...partial,
      chainId: deps.id.next(),
      state: 'idle',
      efficiency: 1.0,
      completedCycles: 0,
    };

    await deps.store.save({ ...estate, productionChains: [...estate.productionChains, chain] });
    deps.log.info('chain-added', { estateId, chainId: chain.chainId, name: chain.name });
    return chain;
  }

  async function runProductionCycle(estateId: string, chainId: string): Promise<ProductionOutput> {
    const estate = await deps.store.getById(estateId);
    if (estate === undefined) throw new Error(`Estate ${estateId} not found`);

    const chain = estate.productionChains.find(c => c.chainId === chainId);
    if (chain === undefined) throw new Error(`Chain ${chainId} not found`);

    // Check inputs available
    const stored = new Map(estate.storedResources);
    for (const input of chain.inputs) {
      const available = stored.get(input.resourceId) ?? 0;
      if (available < input.quantityPerCycle) {
        throw new Error(`Insufficient ${input.resourceId}: need ${input.quantityPerCycle}, have ${available}`);
      }
    }

    // Consume inputs
    for (const input of chain.inputs) {
      const current = stored.get(input.resourceId) ?? 0;
      stored.set(input.resourceId, current - input.quantityPerCycle);
    }

    // Produce output
    const workerBonus = chain.assignedWorkerIds.length * 0.1;
    const output: ProductionOutput = {
      ...chain.output,
      quantityPerCycle: Math.round(chain.output.quantityPerCycle * chain.efficiency * (1 + workerBonus)),
    };

    const outputCurrent = stored.get(output.resourceId) ?? 0;
    stored.set(output.resourceId, outputCurrent + output.quantityPerCycle);

    // Update chain
    const updatedChains = estate.productionChains.map(c =>
      c.chainId === chainId
        ? { ...c, completedCycles: c.completedCycles + 1, state: 'producing' as const }
        : c
    );

    await deps.store.save({
      ...estate,
      storedResources: stored,
      productionChains: updatedChains,
    });

    totalProductionCycles++;
    return output;
  }

  async function sellProduction(estateId: string, resourceId: string, quantity: number): Promise<number> {
    const estate = await deps.store.getById(estateId);
    if (estate === undefined) throw new Error(`Estate ${estateId} not found`);

    const stored = new Map(estate.storedResources);
    const available = stored.get(resourceId) ?? 0;
    if (available < quantity) throw new Error(`Insufficient ${resourceId}`);

    const revenue = await deps.economy.sellGoods(estateId, resourceId, quantity, 0);
    stored.set(resourceId, available - quantity);

    await deps.store.save({
      ...estate,
      storedResources: stored,
      weeklyRevenueKalon: estate.weeklyRevenueKalon + revenue,
    });

    totalRevenueGenerated += revenue;
    deps.log.info('production-sold', { estateId, resourceId, quantity, revenue });
    return revenue;
  }

  async function createDynastyNetwork(dynastyId: string): Promise<DynastyEstateNetwork> {
    const estates = await deps.store.getByDynasty(dynastyId);
    const network: DynastyEstateNetwork = {
      dynastyId,
      estates: estates.map(e => e.estateId),
      sharedResourcePool: new Map(),
      coordinatedProduction: [],
      networkBonus: estates.length * cfg.networkBonusPerEstate,
    };

    dynastyNetworks.set(dynastyId, network);
    deps.log.info('dynasty-network-created', { dynastyId, estateCount: estates.length });
    return network;
  }

  async function coordinateProduction(dynastyId: string, chain: CoordinatedChain): Promise<DynastyEstateNetwork> {
    const network = dynastyNetworks.get(dynastyId);
    if (network === undefined) throw new Error(`Network for dynasty ${dynastyId} not found`);

    const updated: DynastyEstateNetwork = {
      ...network,
      coordinatedProduction: [...network.coordinatedProduction, chain],
    };

    dynastyNetworks.set(dynastyId, updated);
    deps.log.info('production-coordinated', { dynastyId, source: chain.sourceEstateId, target: chain.targetEstateId });
    return updated;
  }

  async function initiateSiege(estateId: string, attackerDynastyId: string): Promise<SiegeState> {
    const siege: SiegeState = {
      estateId,
      attackerDynastyId,
      phase: 'preparing',
      defenseIntegrity: 1.0,
      startedAt: deps.clock.now(),
      resolvedAt: undefined,
    };

    sieges.set(estateId, siege);
    siegesInitiated++;
    deps.log.info('siege-initiated', { estateId, attackerDynastyId });
    return siege;
  }

  async function advanceSiege(estateId: string): Promise<SiegeState> {
    const siege = sieges.get(estateId);
    if (siege === undefined) throw new Error(`No siege at ${estateId}`);

    const estate = await deps.store.getById(estateId);
    const totalDefenseHp = estate !== undefined
      ? estate.defenses.reduce((sum, d) => sum + d.hitPoints, 0)
      : 0;
    const maxDefenseHp = estate !== undefined
      ? estate.defenses.reduce((sum, d) => sum + d.maxHitPoints, 0)
      : 1;

    const integrity = maxDefenseHp > 0 ? totalDefenseHp / maxDefenseHp : 0;

    let phase = siege.phase;
    if (integrity <= 0) {
      phase = 'fallen';
    } else if (integrity <= 0.3) {
      phase = 'breach';
    } else {
      phase = 'active';
    }

    const updated: SiegeState = {
      ...siege,
      phase,
      defenseIntegrity: integrity,
      resolvedAt: phase === 'fallen' ? deps.clock.now() : undefined,
    };

    sieges.set(estateId, updated);
    deps.log.info('siege-advanced', { estateId, phase, integrity });
    return updated;
  }

  function getStats(): EstateSystemStats {
    return {
      totalEstates,
      estatesByTier: { ...tierCounts },
      totalWorkers,
      totalProductionCycles,
      totalRevenueGenerated,
      siegesInitiated,
      dynastyNetworks: dynastyNetworks.size,
    };
  }

  deps.log.info('estate-system-created', { tierCaps: cfg.maxWorkersPerTier });

  return {
    claimPlot,
    getEstate,
    getPlayerEstates,
    getWorldEstates,
    getUpgradeRequirements,
    upgradeEstate,
    specialize,
    hireWorker,
    assignWorker,
    trainWorker,
    buildDefense,
    upgradeDefense,
    addProductionChain,
    runProductionCycle,
    sellProduction,
    createDynastyNetwork,
    coordinateProduction,
    initiateSiege,
    advanceSiege,
    getStats,
  };
}
