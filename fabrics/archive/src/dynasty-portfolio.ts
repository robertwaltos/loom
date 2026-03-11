/**
 * dynasty-portfolio.ts — Dynasty asset and achievement portfolio tracking.
 *
 * Tracks all assets, achievements, historical milestones, portfolio
 * valuation over time, and supports export/import of portfolios.
 *
 * "A dynasty's worth is measured not in KALON alone,
 *  but in the tapestry of its deeds."
 */

// ── Ports ────────────────────────────────────────────────────────

interface PortfolioClock {
  readonly nowMicroseconds: () => number;
}

interface PortfolioIdGenerator {
  readonly generate: () => string;
}

interface DynastyPortfolioDeps {
  readonly clock: PortfolioClock;
  readonly idGenerator: PortfolioIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type AssetCategory = 'currency' | 'property' | 'artifact' | 'title' | 'resource';

interface PortfolioAsset {
  readonly assetId: string;
  readonly dynastyId: string;
  readonly category: AssetCategory;
  readonly name: string;
  readonly quantity: number;
  readonly valuationPerUnit: number;
  readonly acquiredAt: number;
  readonly worldId: string;
}

interface AddAssetParams {
  readonly dynastyId: string;
  readonly category: AssetCategory;
  readonly name: string;
  readonly quantity: number;
  readonly valuationPerUnit: number;
  readonly worldId: string;
}

interface Achievement {
  readonly achievementId: string;
  readonly dynastyId: string;
  readonly title: string;
  readonly description: string;
  readonly earnedAt: number;
  readonly worldId: string;
  readonly tier: AchievementTier;
}

type AchievementTier = 'bronze' | 'silver' | 'gold' | 'legendary';

interface GrantAchievementParams {
  readonly dynastyId: string;
  readonly title: string;
  readonly description: string;
  readonly worldId: string;
  readonly tier: AchievementTier;
}

interface Milestone {
  readonly milestoneId: string;
  readonly dynastyId: string;
  readonly event: string;
  readonly recordedAt: number;
  readonly worldId: string;
  readonly detail: string;
}

interface RecordMilestoneParams {
  readonly dynastyId: string;
  readonly event: string;
  readonly worldId: string;
  readonly detail: string;
}

interface ValuationSnapshot {
  readonly dynastyId: string;
  readonly totalValuation: number;
  readonly assetCount: number;
  readonly snapshotAt: number;
}

interface PortfolioExport {
  readonly dynastyId: string;
  readonly assets: ReadonlyArray<PortfolioAsset>;
  readonly achievements: ReadonlyArray<Achievement>;
  readonly milestones: ReadonlyArray<Milestone>;
  readonly exportedAt: number;
  readonly totalValuation: number;
}

interface PortfolioImportResult {
  readonly dynastyId: string;
  readonly assetsImported: number;
  readonly achievementsImported: number;
  readonly milestonesImported: number;
}

interface PortfolioStats {
  readonly totalDynasties: number;
  readonly totalAssets: number;
  readonly totalAchievements: number;
  readonly totalMilestones: number;
  readonly totalValuationSnapshots: number;
}

// ── Public Interface ─────────────────────────────────────────────

interface DynastyPortfolio {
  readonly addAsset: (params: AddAssetParams) => PortfolioAsset;
  readonly removeAsset: (assetId: string) => boolean;
  readonly getAssets: (dynastyId: string) => ReadonlyArray<PortfolioAsset>;
  readonly getAssetsByCategory: (
    dynastyId: string,
    cat: AssetCategory,
  ) => ReadonlyArray<PortfolioAsset>;
  readonly grantAchievement: (params: GrantAchievementParams) => Achievement;
  readonly getAchievements: (dynastyId: string) => ReadonlyArray<Achievement>;
  readonly getAchievementsByTier: (
    dynastyId: string,
    tier: AchievementTier,
  ) => ReadonlyArray<Achievement>;
  readonly recordMilestone: (params: RecordMilestoneParams) => Milestone;
  readonly getMilestones: (dynastyId: string) => ReadonlyArray<Milestone>;
  readonly computeValuation: (dynastyId: string) => number;
  readonly snapshotValuation: (dynastyId: string) => ValuationSnapshot;
  readonly getValuationHistory: (dynastyId: string) => ReadonlyArray<ValuationSnapshot>;
  readonly exportPortfolio: (dynastyId: string) => PortfolioExport;
  readonly importPortfolio: (data: PortfolioExport) => PortfolioImportResult;
  readonly getDynastyIds: () => ReadonlyArray<string>;
  readonly getStats: () => PortfolioStats;
}

// ── State ────────────────────────────────────────────────────────

interface PortfolioState {
  readonly deps: DynastyPortfolioDeps;
  readonly assets: Map<string, PortfolioAsset>;
  readonly dynastyAssets: Map<string, string[]>;
  readonly achievements: Map<string, Achievement>;
  readonly dynastyAchievements: Map<string, string[]>;
  readonly milestones: Milestone[];
  readonly dynastyMilestones: Map<string, string[]>;
  readonly valuationHistory: Map<string, ValuationSnapshot[]>;
  readonly knownDynasties: Set<string>;
}

// ── Factory ──────────────────────────────────────────────────────

function createDynastyPortfolio(deps: DynastyPortfolioDeps): DynastyPortfolio {
  const state: PortfolioState = {
    deps,
    assets: new Map(),
    dynastyAssets: new Map(),
    achievements: new Map(),
    dynastyAchievements: new Map(),
    milestones: [],
    dynastyMilestones: new Map(),
    valuationHistory: new Map(),
    knownDynasties: new Set(),
  };

  return {
    addAsset: (p) => addAssetImpl(state, p),
    removeAsset: (id) => removeAssetImpl(state, id),
    getAssets: (d) => getAssetsImpl(state, d),
    getAssetsByCategory: (d, c) => getAssetsByCategoryImpl(state, d, c),
    grantAchievement: (p) => grantAchievementImpl(state, p),
    getAchievements: (d) => getAchievementsImpl(state, d),
    getAchievementsByTier: (d, t) => getAchievementsByTierImpl(state, d, t),
    recordMilestone: (p) => recordMilestoneImpl(state, p),
    getMilestones: (d) => getMilestonesImpl(state, d),
    computeValuation: (d) => computeValuationImpl(state, d),
    snapshotValuation: (d) => snapshotValuationImpl(state, d),
    getValuationHistory: (d) => state.valuationHistory.get(d) ?? [],
    exportPortfolio: (d) => exportPortfolioImpl(state, d),
    importPortfolio: (data) => importPortfolioImpl(state, data),
    getDynastyIds: () => [...state.knownDynasties],
    getStats: () => getStatsImpl(state),
  };
}

// ── Assets ───────────────────────────────────────────────────────

function addAssetImpl(state: PortfolioState, params: AddAssetParams): PortfolioAsset {
  const assetId = state.deps.idGenerator.generate();
  const asset: PortfolioAsset = {
    assetId,
    dynastyId: params.dynastyId,
    category: params.category,
    name: params.name,
    quantity: params.quantity,
    valuationPerUnit: params.valuationPerUnit,
    acquiredAt: state.deps.clock.nowMicroseconds(),
    worldId: params.worldId,
  };

  state.assets.set(assetId, asset);
  appendToList(state.dynastyAssets, params.dynastyId, assetId);
  state.knownDynasties.add(params.dynastyId);
  return asset;
}

function removeAssetImpl(state: PortfolioState, assetId: string): boolean {
  const asset = state.assets.get(assetId);
  if (asset === undefined) return false;

  state.assets.delete(assetId);
  const dynastyList = state.dynastyAssets.get(asset.dynastyId);
  if (dynastyList !== undefined) {
    const idx = dynastyList.indexOf(assetId);
    if (idx >= 0) dynastyList.splice(idx, 1);
  }
  return true;
}

function getAssetsImpl(state: PortfolioState, dynastyId: string): ReadonlyArray<PortfolioAsset> {
  const ids = state.dynastyAssets.get(dynastyId);
  if (ids === undefined) return [];
  return ids.map((id) => state.assets.get(id)).filter((a): a is PortfolioAsset => a !== undefined);
}

function getAssetsByCategoryImpl(
  state: PortfolioState,
  dynastyId: string,
  category: AssetCategory,
): ReadonlyArray<PortfolioAsset> {
  return getAssetsImpl(state, dynastyId).filter((a) => a.category === category);
}

// ── Achievements ─────────────────────────────────────────────────

function grantAchievementImpl(state: PortfolioState, params: GrantAchievementParams): Achievement {
  const achievementId = state.deps.idGenerator.generate();
  const achievement: Achievement = {
    achievementId,
    dynastyId: params.dynastyId,
    title: params.title,
    description: params.description,
    earnedAt: state.deps.clock.nowMicroseconds(),
    worldId: params.worldId,
    tier: params.tier,
  };

  state.achievements.set(achievementId, achievement);
  appendToList(state.dynastyAchievements, params.dynastyId, achievementId);
  state.knownDynasties.add(params.dynastyId);
  return achievement;
}

function getAchievementsImpl(state: PortfolioState, dynastyId: string): ReadonlyArray<Achievement> {
  const ids = state.dynastyAchievements.get(dynastyId);
  if (ids === undefined) return [];
  return ids
    .map((id) => state.achievements.get(id))
    .filter((a): a is Achievement => a !== undefined);
}

function getAchievementsByTierImpl(
  state: PortfolioState,
  dynastyId: string,
  tier: AchievementTier,
): ReadonlyArray<Achievement> {
  return getAchievementsImpl(state, dynastyId).filter((a) => a.tier === tier);
}

// ── Milestones ───────────────────────────────────────────────────

function recordMilestoneImpl(state: PortfolioState, params: RecordMilestoneParams): Milestone {
  const milestoneId = state.deps.idGenerator.generate();
  const milestone: Milestone = {
    milestoneId,
    dynastyId: params.dynastyId,
    event: params.event,
    recordedAt: state.deps.clock.nowMicroseconds(),
    worldId: params.worldId,
    detail: params.detail,
  };

  state.milestones.push(milestone);
  appendToList(state.dynastyMilestones, params.dynastyId, milestoneId);
  state.knownDynasties.add(params.dynastyId);
  return milestone;
}

function getMilestonesImpl(state: PortfolioState, dynastyId: string): ReadonlyArray<Milestone> {
  return state.milestones.filter((m) => m.dynastyId === dynastyId);
}

// ── Valuation ────────────────────────────────────────────────────

function computeValuationImpl(state: PortfolioState, dynastyId: string): number {
  const assets = getAssetsImpl(state, dynastyId);
  let total = 0;
  for (const asset of assets) {
    total += asset.quantity * asset.valuationPerUnit;
  }
  return total;
}

function snapshotValuationImpl(state: PortfolioState, dynastyId: string): ValuationSnapshot {
  const totalValuation = computeValuationImpl(state, dynastyId);
  const assets = getAssetsImpl(state, dynastyId);
  const snapshot: ValuationSnapshot = {
    dynastyId,
    totalValuation,
    assetCount: assets.length,
    snapshotAt: state.deps.clock.nowMicroseconds(),
  };

  const history = state.valuationHistory.get(dynastyId);
  if (history !== undefined) {
    history.push(snapshot);
  } else {
    state.valuationHistory.set(dynastyId, [snapshot]);
  }
  return snapshot;
}

// ── Export / Import ──────────────────────────────────────────────

function exportPortfolioImpl(state: PortfolioState, dynastyId: string): PortfolioExport {
  const assets = getAssetsImpl(state, dynastyId);
  const achievements = getAchievementsImpl(state, dynastyId);
  const milestones = getMilestonesImpl(state, dynastyId);
  const totalValuation = computeValuationImpl(state, dynastyId);

  return {
    dynastyId,
    assets: [...assets],
    achievements: [...achievements],
    milestones: [...milestones],
    exportedAt: state.deps.clock.nowMicroseconds(),
    totalValuation,
  };
}

function importPortfolioImpl(state: PortfolioState, data: PortfolioExport): PortfolioImportResult {
  let assetsImported = 0;
  for (const asset of data.assets) {
    state.assets.set(asset.assetId, asset);
    appendToList(state.dynastyAssets, data.dynastyId, asset.assetId);
    assetsImported++;
  }

  let achievementsImported = 0;
  for (const ach of data.achievements) {
    state.achievements.set(ach.achievementId, ach);
    appendToList(state.dynastyAchievements, data.dynastyId, ach.achievementId);
    achievementsImported++;
  }

  let milestonesImported = 0;
  for (const ms of data.milestones) {
    state.milestones.push(ms);
    appendToList(state.dynastyMilestones, data.dynastyId, ms.milestoneId);
    milestonesImported++;
  }

  state.knownDynasties.add(data.dynastyId);

  return {
    dynastyId: data.dynastyId,
    assetsImported,
    achievementsImported,
    milestonesImported,
  };
}

// ── Stats ────────────────────────────────────────────────────────

function getStatsImpl(state: PortfolioState): PortfolioStats {
  let totalValuationSnapshots = 0;
  for (const snaps of state.valuationHistory.values()) {
    totalValuationSnapshots += snaps.length;
  }
  return {
    totalDynasties: state.knownDynasties.size,
    totalAssets: state.assets.size,
    totalAchievements: state.achievements.size,
    totalMilestones: state.milestones.length,
    totalValuationSnapshots,
  };
}

// ── Utilities ────────────────────────────────────────────────────

function appendToList(index: Map<string, string[]>, key: string, value: string): void {
  const existing = index.get(key);
  if (existing !== undefined) {
    existing.push(value);
  } else {
    index.set(key, [value]);
  }
}

// ── Exports ──────────────────────────────────────────────────────

export { createDynastyPortfolio };
export type {
  DynastyPortfolio,
  DynastyPortfolioDeps,
  PortfolioClock,
  PortfolioIdGenerator,
  PortfolioAsset,
  AssetCategory,
  AddAssetParams,
  Achievement,
  AchievementTier,
  GrantAchievementParams,
  Milestone,
  RecordMilestoneParams,
  ValuationSnapshot,
  PortfolioExport,
  PortfolioImportResult,
  PortfolioStats,
};
