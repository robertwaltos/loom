import { describe, it, expect, vi } from 'vitest';
import { createEstateSystemEngine } from '../estate-system.js';

function makeDeps() {
  return {
    clock: { now: vi.fn(() => BigInt(1_000_000)) },
    id: { next: vi.fn().mockImplementation((() => { let i = 0; return () => `eid-${++i}`; })()) },
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    events: { emit: vi.fn() },
    store: {
      save: vi.fn().mockResolvedValue(undefined),
      getById: vi.fn().mockResolvedValue(undefined),
      getByOwner: vi.fn().mockResolvedValue([]),
      getByWorld: vi.fn().mockResolvedValue([]),
      getByDynasty: vi.fn().mockResolvedValue([]),
    },
    economy: {
      getResourcePrice: vi.fn().mockResolvedValue(1),
      sellGoods: vi.fn().mockResolvedValue(0),
    },
  };
}

describe('estate-system simulation', () => {
  // ── engine creation ───────────────────────────────────────────────

  it('creates an engine without throwing', () => {
    const deps = makeDeps();
    expect(() => createEstateSystemEngine(deps)).not.toThrow();
  });

  it('engine exposes expected methods', () => {
    const deps = makeDeps();
    const engine = createEstateSystemEngine(deps);
    expect(typeof engine.claimPlot).toBe('function');
    expect(typeof engine.getEstate).toBe('function');
    expect(typeof engine.upgradeEstate).toBe('function');
    expect(typeof engine.assignWorker).toBe('function');
  });

  // ── tier definitions ──────────────────────────────────────────────

  it('claimPlot creates a plot-tier estate', async () => {
    const deps = makeDeps();
    let saved: any;
    deps.store.save.mockImplementation(async (e: any) => { saved = e; });
    const engine = createEstateSystemEngine(deps);
    await engine.claimPlot('owner-1', 'world-1', 'My Plot', 'nordic-timber');
    expect(saved.tier).toBe('plot');
    expect(saved.workers).toHaveLength(0);
  });

  it('upgrade requirement plot→homestead costs 1000 kalon', async () => {
    const deps = makeDeps();
    let saved: any;
    deps.store.save.mockImplementation(async (e: any) => { saved = e; });
    deps.store.getById.mockImplementation(async () => saved);
    const engine = createEstateSystemEngine(deps);
    await engine.claimPlot('owner-1', 'world-1', 'My Plot', 'nordic-timber');
    const req = await engine.getUpgradeRequirements(saved.estateId);
    expect(req).toBeDefined();
    expect(req!.kalonCost).toBe(1000);
    expect(req!.targetTier).toBe('homestead');
  });

  it('upgradeEstate advances plot to homestead', async () => {
    const deps = makeDeps();
    let saved: any;
    deps.store.save.mockImplementation(async (e: any) => { saved = e; });
    deps.store.getById.mockImplementation(async () => saved);
    const engine = createEstateSystemEngine(deps);
    await engine.claimPlot('owner-1', 'world-1', 'My Plot', 'nordic-timber');
    const upgraded = await engine.upgradeEstate(saved.estateId);
    expect(upgraded.tier).toBe('homestead');
  });

  it('plot estate has totalInvestmentKalon = 0', async () => {
    const deps = makeDeps();
    let saved: any;
    deps.store.save.mockImplementation(async (e: any) => { saved = e; });
    const engine = createEstateSystemEngine(deps);
    await engine.claimPlot('owner-1', 'world-1', 'My Plot', 'nordic-timber');
    expect(saved.totalInvestmentKalon).toBe(0);
  });

  // ── getEstate ─────────────────────────────────────────────────────

  it('getEstate returns undefined for an unknown estate id', async () => {
    const deps = makeDeps();
    const engine = createEstateSystemEngine(deps);
    const estate = await engine.getEstate('__no-estate__');
    expect(estate).toBeUndefined();
  });

  // ── upgradeEstate ────────────────────────────────────────────

  it('upgradeEstate throws when estate does not exist', async () => {
    const deps = makeDeps();
    const engine = createEstateSystemEngine(deps);
    await expect(engine.upgradeEstate('__no-estate__')).rejects.toThrow();
  });
});
