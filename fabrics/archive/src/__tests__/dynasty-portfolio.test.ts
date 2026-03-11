import { describe, it, expect, beforeEach } from 'vitest';
import { createDynastyPortfolio } from '../dynasty-portfolio.js';
import type { DynastyPortfolio, DynastyPortfolioDeps } from '../dynasty-portfolio.js';

// ── Test Helpers ─────────────────────────────────────────────────

function createDeps(): DynastyPortfolioDeps {
  let idCounter = 0;
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => time++ },
    idGenerator: {
      generate() {
        idCounter += 1;
        return 'id-' + String(idCounter);
      },
    },
  };
}

let portfolio: DynastyPortfolio;

beforeEach(() => {
  portfolio = createDynastyPortfolio(createDeps());
});

// ── Assets ───────────────────────────────────────────────────────

describe('DynastyPortfolio addAsset', () => {
  it('adds an asset with correct metadata', () => {
    const asset = portfolio.addAsset({
      dynastyId: 'dynasty-1',
      category: 'currency',
      name: 'KALON',
      quantity: 500,
      valuationPerUnit: 1,
      worldId: 'earth',
    });
    expect(asset.assetId).toBe('id-1');
    expect(asset.dynastyId).toBe('dynasty-1');
    expect(asset.category).toBe('currency');
    expect(asset.name).toBe('KALON');
    expect(asset.quantity).toBe(500);
  });

  it('records acquisition timestamp', () => {
    const asset = portfolio.addAsset({
      dynastyId: 'dynasty-1',
      category: 'property',
      name: 'Estate',
      quantity: 1,
      valuationPerUnit: 10000,
      worldId: 'earth',
    });
    expect(asset.acquiredAt).toBeGreaterThan(0);
  });

  it('tracks dynasty in known dynasties', () => {
    portfolio.addAsset({
      dynastyId: 'dynasty-1',
      category: 'currency',
      name: 'KALON',
      quantity: 100,
      valuationPerUnit: 1,
      worldId: 'earth',
    });
    expect(portfolio.getDynastyIds()).toContain('dynasty-1');
  });
});

describe('DynastyPortfolio getAssets', () => {
  it('retrieves assets for a dynasty', () => {
    portfolio.addAsset({
      dynastyId: 'd1',
      category: 'currency',
      name: 'KALON',
      quantity: 100,
      valuationPerUnit: 1,
      worldId: 'earth',
    });
    portfolio.addAsset({
      dynastyId: 'd1',
      category: 'property',
      name: 'Estate',
      quantity: 1,
      valuationPerUnit: 5000,
      worldId: 'earth',
    });
    const assets = portfolio.getAssets('d1');
    expect(assets).toHaveLength(2);
  });

  it('returns empty array for unknown dynasty', () => {
    expect(portfolio.getAssets('unknown')).toHaveLength(0);
  });

  it('filters by category', () => {
    portfolio.addAsset({
      dynastyId: 'd1',
      category: 'currency',
      name: 'KALON',
      quantity: 100,
      valuationPerUnit: 1,
      worldId: 'earth',
    });
    portfolio.addAsset({
      dynastyId: 'd1',
      category: 'artifact',
      name: 'Sword',
      quantity: 1,
      valuationPerUnit: 500,
      worldId: 'earth',
    });
    const artifacts = portfolio.getAssetsByCategory('d1', 'artifact');
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0]?.name).toBe('Sword');
  });
});

describe('DynastyPortfolio removeAsset', () => {
  it('removes an existing asset', () => {
    const asset = portfolio.addAsset({
      dynastyId: 'd1',
      category: 'currency',
      name: 'KALON',
      quantity: 100,
      valuationPerUnit: 1,
      worldId: 'earth',
    });
    const removed = portfolio.removeAsset(asset.assetId);
    expect(removed).toBe(true);
    expect(portfolio.getAssets('d1')).toHaveLength(0);
  });

  it('returns false for unknown asset', () => {
    expect(portfolio.removeAsset('nonexistent')).toBe(false);
  });
});

// ── Achievements ─────────────────────────────────────────────────

describe('DynastyPortfolio achievements', () => {
  it('grants an achievement', () => {
    const ach = portfolio.grantAchievement({
      dynastyId: 'd1',
      title: 'First Landing',
      description: 'Landed on first world',
      worldId: 'earth',
      tier: 'bronze',
    });
    expect(ach.achievementId).toBeDefined();
    expect(ach.title).toBe('First Landing');
    expect(ach.tier).toBe('bronze');
  });

  it('retrieves achievements for a dynasty', () => {
    portfolio.grantAchievement({
      dynastyId: 'd1',
      title: 'A',
      description: '',
      worldId: 'earth',
      tier: 'bronze',
    });
    portfolio.grantAchievement({
      dynastyId: 'd1',
      title: 'B',
      description: '',
      worldId: 'earth',
      tier: 'gold',
    });
    expect(portfolio.getAchievements('d1')).toHaveLength(2);
  });

  it('returns empty for unknown dynasty', () => {
    expect(portfolio.getAchievements('unknown')).toHaveLength(0);
  });

  it('filters achievements by tier', () => {
    portfolio.grantAchievement({
      dynastyId: 'd1',
      title: 'A',
      description: '',
      worldId: 'earth',
      tier: 'bronze',
    });
    portfolio.grantAchievement({
      dynastyId: 'd1',
      title: 'B',
      description: '',
      worldId: 'earth',
      tier: 'gold',
    });
    portfolio.grantAchievement({
      dynastyId: 'd1',
      title: 'C',
      description: '',
      worldId: 'earth',
      tier: 'gold',
    });
    const gold = portfolio.getAchievementsByTier('d1', 'gold');
    expect(gold).toHaveLength(2);
  });
});

// ── Milestones ───────────────────────────────────────────────────

describe('DynastyPortfolio milestones', () => {
  it('records a milestone', () => {
    const ms = portfolio.recordMilestone({
      dynastyId: 'd1',
      event: 'world.discovered',
      worldId: 'mars',
      detail: 'First dynasty to reach Mars',
    });
    expect(ms.milestoneId).toBeDefined();
    expect(ms.event).toBe('world.discovered');
    expect(ms.detail).toBe('First dynasty to reach Mars');
  });

  it('retrieves milestones for a dynasty', () => {
    portfolio.recordMilestone({
      dynastyId: 'd1',
      event: 'a',
      worldId: 'w',
      detail: '',
    });
    portfolio.recordMilestone({
      dynastyId: 'd1',
      event: 'b',
      worldId: 'w',
      detail: '',
    });
    portfolio.recordMilestone({
      dynastyId: 'd2',
      event: 'c',
      worldId: 'w',
      detail: '',
    });
    expect(portfolio.getMilestones('d1')).toHaveLength(2);
  });

  it('returns empty for unknown dynasty', () => {
    expect(portfolio.getMilestones('unknown')).toHaveLength(0);
  });
});

// ── Valuation ────────────────────────────────────────────────────

describe('DynastyPortfolio valuation', () => {
  it('computes total valuation from assets', () => {
    portfolio.addAsset({
      dynastyId: 'd1',
      category: 'currency',
      name: 'KALON',
      quantity: 100,
      valuationPerUnit: 2,
      worldId: 'earth',
    });
    portfolio.addAsset({
      dynastyId: 'd1',
      category: 'property',
      name: 'Estate',
      quantity: 1,
      valuationPerUnit: 5000,
      worldId: 'earth',
    });
    expect(portfolio.computeValuation('d1')).toBe(5200);
  });

  it('returns zero for dynasty with no assets', () => {
    expect(portfolio.computeValuation('empty')).toBe(0);
  });

  it('creates a valuation snapshot', () => {
    portfolio.addAsset({
      dynastyId: 'd1',
      category: 'currency',
      name: 'KALON',
      quantity: 100,
      valuationPerUnit: 1,
      worldId: 'earth',
    });
    const snap = portfolio.snapshotValuation('d1');
    expect(snap.dynastyId).toBe('d1');
    expect(snap.totalValuation).toBe(100);
    expect(snap.assetCount).toBe(1);
    expect(snap.snapshotAt).toBeGreaterThan(0);
  });

  it('tracks valuation history', () => {
    portfolio.addAsset({
      dynastyId: 'd1',
      category: 'currency',
      name: 'KALON',
      quantity: 100,
      valuationPerUnit: 1,
      worldId: 'earth',
    });
    portfolio.snapshotValuation('d1');
    portfolio.addAsset({
      dynastyId: 'd1',
      category: 'property',
      name: 'Land',
      quantity: 1,
      valuationPerUnit: 1000,
      worldId: 'earth',
    });
    portfolio.snapshotValuation('d1');
    const history = portfolio.getValuationHistory('d1');
    expect(history).toHaveLength(2);
    expect(history[0]?.totalValuation).toBe(100);
    expect(history[1]?.totalValuation).toBe(1100);
  });

  it('returns empty history for unknown dynasty', () => {
    expect(portfolio.getValuationHistory('unknown')).toHaveLength(0);
  });
});

// ── Export / Import ──────────────────────────────────────────────

describe('DynastyPortfolio export', () => {
  it('exports complete portfolio', () => {
    portfolio.addAsset({
      dynastyId: 'd1',
      category: 'currency',
      name: 'KALON',
      quantity: 100,
      valuationPerUnit: 1,
      worldId: 'earth',
    });
    portfolio.grantAchievement({
      dynastyId: 'd1',
      title: 'Test',
      description: '',
      worldId: 'earth',
      tier: 'bronze',
    });
    portfolio.recordMilestone({
      dynastyId: 'd1',
      event: 'start',
      worldId: 'earth',
      detail: '',
    });
    const exported = portfolio.exportPortfolio('d1');
    expect(exported.dynastyId).toBe('d1');
    expect(exported.assets).toHaveLength(1);
    expect(exported.achievements).toHaveLength(1);
    expect(exported.milestones).toHaveLength(1);
    expect(exported.totalValuation).toBe(100);
  });

  it('exports empty portfolio for unknown dynasty', () => {
    const exported = portfolio.exportPortfolio('unknown');
    expect(exported.assets).toHaveLength(0);
    expect(exported.achievements).toHaveLength(0);
    expect(exported.milestones).toHaveLength(0);
    expect(exported.totalValuation).toBe(0);
  });
});

describe('DynastyPortfolio import', () => {
  it('imports a portfolio into a new instance', () => {
    portfolio.addAsset({
      dynastyId: 'd1',
      category: 'currency',
      name: 'KALON',
      quantity: 100,
      valuationPerUnit: 1,
      worldId: 'earth',
    });
    portfolio.grantAchievement({
      dynastyId: 'd1',
      title: 'Test',
      description: '',
      worldId: 'earth',
      tier: 'silver',
    });
    portfolio.recordMilestone({
      dynastyId: 'd1',
      event: 'start',
      worldId: 'earth',
      detail: 'genesis',
    });
    const exported = portfolio.exportPortfolio('d1');

    const newPortfolio = createDynastyPortfolio(createDeps());
    const result = newPortfolio.importPortfolio(exported);
    expect(result.assetsImported).toBe(1);
    expect(result.achievementsImported).toBe(1);
    expect(result.milestonesImported).toBe(1);
    expect(newPortfolio.getAssets('d1')).toHaveLength(1);
    expect(newPortfolio.getAchievements('d1')).toHaveLength(1);
  });
});

// ── Stats ────────────────────────────────────────────────────────

describe('DynastyPortfolio stats', () => {
  it('reports empty stats initially', () => {
    const stats = portfolio.getStats();
    expect(stats.totalDynasties).toBe(0);
    expect(stats.totalAssets).toBe(0);
    expect(stats.totalAchievements).toBe(0);
    expect(stats.totalMilestones).toBe(0);
    expect(stats.totalValuationSnapshots).toBe(0);
  });

  it('tracks aggregate statistics', () => {
    portfolio.addAsset({
      dynastyId: 'd1',
      category: 'currency',
      name: 'KALON',
      quantity: 100,
      valuationPerUnit: 1,
      worldId: 'earth',
    });
    portfolio.grantAchievement({
      dynastyId: 'd1',
      title: 'A',
      description: '',
      worldId: 'earth',
      tier: 'bronze',
    });
    portfolio.recordMilestone({
      dynastyId: 'd2',
      event: 'start',
      worldId: 'earth',
      detail: '',
    });
    portfolio.snapshotValuation('d1');
    const stats = portfolio.getStats();
    expect(stats.totalDynasties).toBe(2);
    expect(stats.totalAssets).toBe(1);
    expect(stats.totalAchievements).toBe(1);
    expect(stats.totalMilestones).toBe(1);
    expect(stats.totalValuationSnapshots).toBe(1);
  });
});
