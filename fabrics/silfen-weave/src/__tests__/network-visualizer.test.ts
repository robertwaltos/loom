import { describe, it, expect, vi } from 'vitest';
import { createNetworkVisualizer, DEFAULT_VIEWPORT } from '../network-visualizer.js';
import type {
  NetworkVisualizerDeps,
  WorldRegistryPort,
  CorridorQueryPort,
  WorldMeta,
  VisualizerFilter,
} from '../network-visualizer.js';
import type { WeaveCorridor } from '../weave-network.js';

// ── Fixtures ──────────────────────────────────────────────────────────

const WORLD_ANCHOR: WorldMeta = Object.freeze({
  worldId: 'w-anchor', name: 'Solhaven', playerCount: 500, tier: 'anchor',
});
const WORLD_FRONTIER: WorldMeta = Object.freeze({
  worldId: 'w-frontier', name: 'Ashenveil', playerCount: 80, tier: 'frontier',
});
const WORLD_WILD: WorldMeta = Object.freeze({
  worldId: 'w-wild', name: 'The Maw', playerCount: 12, tier: 'wild',
});

function makeCorridor(overrides: Partial<WeaveCorridor> = {}): WeaveCorridor {
  return Object.freeze({
    corridorId: 'c-1',
    worldIdA: 'w-anchor',
    worldIdB: 'w-frontier',
    tier: 'standard',
    status: 'stable',
    stability: 85,
    transitDurationMs: 180_000,
    dangerRating: 2,
    tollKalon: 10,
    discoveredBy: 'player-1',
    stabilizationContributors: [],
    stabilizationProgress: 100,
    activeEvents: [],
    trafficCount: 42,
    createdAt: 1000n,
    stabilizedAt: 2000n,
    ...overrides,
  });
}

function makeWorlds(worlds: WorldMeta[] = [WORLD_ANCHOR, WORLD_FRONTIER]): WorldRegistryPort {
  return { listWorlds: vi.fn().mockResolvedValue(worlds), getWorld: vi.fn() };
}

function makeCorridors(corridors: WeaveCorridor[] = [makeCorridor()]): CorridorQueryPort {
  return { getAll: vi.fn().mockResolvedValue(corridors) };
}

function makeDeps(
  worlds: WorldMeta[] = [WORLD_ANCHOR, WORLD_FRONTIER],
  corridors: WeaveCorridor[] = [makeCorridor()],
): NetworkVisualizerDeps {
  return { worlds: makeWorlds(worlds), corridors: makeCorridors(corridors) };
}

// ── Refresh ───────────────────────────────────────────────────────────

describe('refresh', () => {
  it('loads worlds and corridors', async () => {
    const viz = createNetworkVisualizer(makeDeps());
    await viz.refresh();
    const stats = viz.getStats();
    expect(stats.nodeCount).toBe(2);
    expect(stats.edgeCount).toBe(1);
  });

  it('assigns unique positions to all worlds', async () => {
    const deps = makeDeps([WORLD_ANCHOR, WORLD_FRONTIER, WORLD_WILD], []);
    const viz = createNetworkVisualizer(deps);
    await viz.refresh();
    const frame = viz.buildFrame();
    const positions = frame.nodes.map((n) => `${n.position.x.toFixed(2)},${n.position.y.toFixed(2)}`);
    expect(new Set(positions).size).toBe(3);
  });

  it('does not overwrite existing positions on re-refresh', async () => {
    const viz = createNetworkVisualizer(makeDeps());
    await viz.refresh();
    const frame1 = viz.buildFrame();
    const pos1 = frame1.nodes.find((n) => n.worldId === 'w-anchor')?.position;
    await viz.refresh();
    const frame2 = viz.buildFrame();
    const pos2 = frame2.nodes.find((n) => n.worldId === 'w-anchor')?.position;
    expect(pos2).toEqual(pos1);
  });

  it('records lastRefreshMs >= 0', async () => {
    const viz = createNetworkVisualizer(makeDeps());
    await viz.refresh();
    expect(viz.getStats().lastRefreshMs).toBeGreaterThanOrEqual(0);
  });
});

// ── buildFrame — nodes ────────────────────────────────────────────────

describe('buildFrame nodes', () => {
  it('produces one node per world', async () => {
    const viz = createNetworkVisualizer(makeDeps());
    await viz.refresh();
    expect(viz.buildFrame().nodes).toHaveLength(2);
  });

  it('maps world tier to NodeStyle', async () => {
    const deps = makeDeps([WORLD_ANCHOR]);
    const viz = createNetworkVisualizer(deps);
    await viz.refresh();
    const node = viz.buildFrame().nodes.find((n) => n.worldId === 'w-anchor');
    expect(node?.style).toBe('anchor');
  });

  it('marks selected world', async () => {
    const viz = createNetworkVisualizer(makeDeps());
    await viz.refresh();
    viz.selectWorld('w-anchor');
    const node = viz.buildFrame().nodes.find((n) => n.worldId === 'w-anchor');
    expect(node?.selected).toBe(true);
  });

  it('marks highlighted path worlds', async () => {
    const viz = createNetworkVisualizer(makeDeps());
    await viz.refresh();
    viz.highlightPath(['w-anchor', 'w-frontier']);
    const frame = viz.buildFrame();
    expect(frame.nodes.every((n) => n.highlighted)).toBe(true);
  });

  it('counts corridors per world', async () => {
    const c2 = makeCorridor({ corridorId: 'c-2', worldIdA: 'w-anchor', worldIdB: 'w-wild' });
    const deps = makeDeps([WORLD_ANCHOR, WORLD_FRONTIER, WORLD_WILD], [makeCorridor(), c2]);
    const viz = createNetworkVisualizer(deps);
    await viz.refresh();
    const anchor = viz.buildFrame().nodes.find((n) => n.worldId === 'w-anchor');
    expect(anchor?.corridorCount).toBe(2);
  });
});

// ── buildFrame — edges ────────────────────────────────────────────────

describe('buildFrame edges', () => {
  it('produces one edge per corridor', async () => {
    const viz = createNetworkVisualizer(makeDeps());
    await viz.refresh();
    expect(viz.buildFrame().edges).toHaveLength(1);
  });

  it('maps trade-route corridor to trade style', async () => {
    const c = makeCorridor({ tier: 'trade-route' });
    const viz = createNetworkVisualizer(makeDeps([WORLD_ANCHOR, WORLD_FRONTIER], [c]));
    await viz.refresh();
    expect(viz.buildFrame().edges[0]?.style).toBe('trade');
  });

  it('maps emergency corridor to emergency style', async () => {
    const c = makeCorridor({ tier: 'emergency' });
    const viz = createNetworkVisualizer(makeDeps([WORLD_ANCHOR, WORLD_FRONTIER], [c]));
    await viz.refresh();
    expect(viz.buildFrame().edges[0]?.style).toBe('emergency');
  });

  it('maps unstable status to unstable style', async () => {
    const c = makeCorridor({ status: 'unstable' });
    const viz = createNetworkVisualizer(makeDeps([WORLD_ANCHOR, WORLD_FRONTIER], [c]));
    await viz.refresh();
    expect(viz.buildFrame().edges[0]?.style).toBe('unstable');
  });

  it('highlights edge when both endpoints are in path', async () => {
    const viz = createNetworkVisualizer(makeDeps());
    await viz.refresh();
    viz.highlightPath(['w-anchor', 'w-frontier']);
    expect(viz.buildFrame().edges[0]?.highlighted).toBe(true);
  });
});

// ── setFilter ─────────────────────────────────────────────────────────

describe('setFilter', () => {
  it('excludes corridors that do not match tier filter', async () => {
    const c = makeCorridor({ tier: 'hazardous' });
    const viz = createNetworkVisualizer(makeDeps([WORLD_ANCHOR, WORLD_FRONTIER], [c]));
    await viz.refresh();
    const filter: VisualizerFilter = { tiers: ['trade-route'] };
    viz.setFilter(filter);
    expect(viz.buildFrame().edges).toHaveLength(0);
  });

  it('excludes corridors below minStability', async () => {
    const c = makeCorridor({ stability: 20 });
    const viz = createNetworkVisualizer(makeDeps([WORLD_ANCHOR, WORLD_FRONTIER], [c]));
    await viz.refresh();
    viz.setFilter({ minStability: 50 });
    expect(viz.buildFrame().edges).toHaveLength(0);
  });

  it('includes matching corridors', async () => {
    const viz = createNetworkVisualizer(makeDeps());
    await viz.refresh();
    viz.setFilter({ tiers: ['standard'] });
    expect(viz.buildFrame().edges).toHaveLength(1);
  });
});

// ── setViewport ───────────────────────────────────────────────────────

describe('setViewport', () => {
  it('starts with DEFAULT_VIEWPORT', () => {
    const viz = createNetworkVisualizer(makeDeps());
    expect(viz.buildFrame().viewport).toEqual(DEFAULT_VIEWPORT);
  });

  it('merges partial viewport', () => {
    const viz = createNetworkVisualizer(makeDeps());
    viz.setViewport({ zoom: 2 });
    const vp = viz.buildFrame().viewport;
    expect(vp.zoom).toBe(2);
    expect(vp.centerX).toBe(DEFAULT_VIEWPORT.centerX);
  });
});

// ── getStats ──────────────────────────────────────────────────────────

describe('getStats', () => {
  it('increments frameCount on each buildFrame', async () => {
    const viz = createNetworkVisualizer(makeDeps());
    await viz.refresh();
    viz.buildFrame();
    viz.buildFrame();
    expect(viz.getStats().frameCount).toBe(2);
  });
});

// ── DEFAULT_VIEWPORT ──────────────────────────────────────────────────

describe('DEFAULT_VIEWPORT', () => {
  it('is centered at origin with zoom 1', () => {
    expect(DEFAULT_VIEWPORT).toEqual({ centerX: 0, centerY: 0, zoom: 1 });
  });
});
