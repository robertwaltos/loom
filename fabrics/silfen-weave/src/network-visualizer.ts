/**
 * network-visualizer.ts — Galaxy-map layer above the Silfen Weave network.
 *
 * NEXT-STEPS Phase 12.2: "Network visualization: galaxy-map UI showing all
 * worlds + connections."
 *
 * Business-logic only (no UI). Maintains:
 *   - A world-node registry with 2D galaxy positions
 *   - An edge layer keyed to WeaveCorridor data
 *   - Viewport state (pan + zoom)
 *   - Selection / highlighted-path state
 *   - Frame snapshots consumed by the renderer
 *
 * Thread: cotton/silfen-weave/network-visualizer
 * Tier: 2
 */

import type { WeaveCorridor, CorridorTier, CorridorStatus } from './weave-network.js';

// ── Ports ────────────────────────────────────────────────────────────

export interface WorldRegistryPort {
  readonly getWorld: (worldId: string) => Promise<WorldMeta | undefined>;
  readonly listWorlds: () => Promise<readonly WorldMeta[]>;
}

export interface CorridorQueryPort {
  readonly getAll: () => Promise<readonly WeaveCorridor[]>;
}

// ── Types ────────────────────────────────────────────────────────────

export interface WorldMeta {
  readonly worldId: string;
  readonly name: string;
  readonly playerCount: number;
  readonly tier: 'anchor' | 'settled' | 'frontier' | 'wild';
}

export interface GalaxyPosition {
  readonly x: number;
  readonly y: number;
}

export type NodeStyle = 'anchor' | 'settled' | 'frontier' | 'wild';
export type EdgeStyle = 'trade' | 'standard' | 'hazardous' | 'emergency' | 'unstable';

export interface MapNode {
  readonly worldId: string;
  readonly name: string;
  readonly position: GalaxyPosition;
  readonly style: NodeStyle;
  readonly playerCount: number;
  readonly corridorCount: number;
  readonly selected: boolean;
  readonly highlighted: boolean;
}

export interface MapEdge {
  readonly corridorId: string;
  readonly worldIdA: string;
  readonly worldIdB: string;
  readonly style: EdgeStyle;
  readonly stability: number;
  readonly tollKalon: number;
  readonly highlighted: boolean;
}

export interface Viewport {
  readonly centerX: number;
  readonly centerY: number;
  readonly zoom: number;
}

export interface GalaxyMapFrame {
  readonly nodes: readonly MapNode[];
  readonly edges: readonly MapEdge[];
  readonly viewport: Viewport;
  readonly selectedWorldId: string | undefined;
  readonly highlightedPath: readonly string[];
}

export interface VisualizerStats {
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly frameCount: number;
  readonly lastRefreshMs: number;
}

export type VisualizerFilter = {
  readonly tiers?: ReadonlyArray<CorridorTier>;
  readonly statuses?: ReadonlyArray<CorridorStatus>;
  readonly minStability?: number;
};

export interface NetworkVisualizer {
  readonly refresh: () => Promise<void>;
  readonly setViewport: (vp: Partial<Viewport>) => void;
  readonly selectWorld: (worldId: string | undefined) => void;
  readonly setFilter: (filter: VisualizerFilter) => void;
  readonly highlightPath: (worldIds: readonly string[]) => void;
  readonly buildFrame: () => GalaxyMapFrame;
  readonly getStats: () => VisualizerStats;
}

export type NetworkVisualizerDeps = {
  readonly worlds: WorldRegistryPort;
  readonly corridors: CorridorQueryPort;
};

export const DEFAULT_VIEWPORT: Viewport = Object.freeze({ centerX: 0, centerY: 0, zoom: 1 });

// ── Helpers ──────────────────────────────────────────────────────────

const TIER_STYLE_MAP: Record<WorldMeta['tier'], NodeStyle> = {
  anchor: 'anchor', settled: 'settled', frontier: 'frontier', wild: 'wild',
};

function corridorToEdgeStyle(c: WeaveCorridor): EdgeStyle {
  if (c.tier === 'emergency') return 'emergency';
  if (c.tier === 'trade-route') return 'trade';
  if (c.tier === 'hazardous' || c.tier === 'uncharted') return 'hazardous';
  if (c.status === 'unstable' || c.status === 'stabilizing') return 'unstable';
  return 'standard';
}

function goldenAnglePosition(index: number, _total: number): GalaxyPosition {
  const r = Math.sqrt(index + 1) * 80;
  const angle = index * 2.399963229728653;
  return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
}

function matchesFilter(c: WeaveCorridor, f: VisualizerFilter): boolean {
  if (f.tiers && !f.tiers.includes(c.tier)) return false;
  if (f.statuses && !f.statuses.includes(c.status)) return false;
  if (f.minStability !== undefined && c.stability < f.minStability) return false;
  return true;
}

// ── State ────────────────────────────────────────────────────────────

type VisState = {
  positions: Map<string, GalaxyPosition>;
  metas: Map<string, WorldMeta>;
  corridors: WeaveCorridor[];
  viewport: Viewport;
  selectedWorldId: string | undefined;
  highlightedPath: string[];
  filter: VisualizerFilter;
  frameCount: number;
  lastRefreshMs: number;
};

function buildNodes(state: VisState, corridors: WeaveCorridor[]): readonly MapNode[] {
  const corridorCounts = new Map<string, number>();
  for (const c of corridors) {
    corridorCounts.set(c.worldIdA, (corridorCounts.get(c.worldIdA) ?? 0) + 1);
    corridorCounts.set(c.worldIdB, (corridorCounts.get(c.worldIdB) ?? 0) + 1);
  }
  return Array.from(state.metas.values()).map((m, i) => ({
    worldId: m.worldId,
    name: m.name,
    position: state.positions.get(m.worldId) ?? goldenAnglePosition(i, state.metas.size),
    style: TIER_STYLE_MAP[m.tier],
    playerCount: m.playerCount,
    corridorCount: corridorCounts.get(m.worldId) ?? 0,
    selected: state.selectedWorldId === m.worldId,
    highlighted: state.highlightedPath.includes(m.worldId),
  }));
}

function buildEdges(state: VisState, corridors: WeaveCorridor[]): readonly MapEdge[] {
  const pathSet = new Set(state.highlightedPath);
  return corridors
    .filter((c) => matchesFilter(c, state.filter))
    .map((c) => ({
      corridorId: c.corridorId,
      worldIdA: c.worldIdA,
      worldIdB: c.worldIdB,
      style: corridorToEdgeStyle(c),
      stability: c.stability,
      tollKalon: c.tollKalon,
      highlighted: pathSet.has(c.worldIdA) && pathSet.has(c.worldIdB),
    }));
}

// ── Factory ──────────────────────────────────────────────────────────

function createInitialState(): VisState {
  return {
    positions: new Map(),
    metas: new Map(),
    corridors: [],
    viewport: DEFAULT_VIEWPORT,
    selectedWorldId: undefined,
    highlightedPath: [],
    filter: {},
    frameCount: 0,
    lastRefreshMs: 0,
  };
}

async function doRefresh(state: VisState, deps: NetworkVisualizerDeps): Promise<void> {
  const t0 = Date.now();
  const [worlds, corridors] = await Promise.all([
    deps.worlds.listWorlds(),
    deps.corridors.getAll(),
  ]);
  state.metas.clear();
  for (let i = 0; i < worlds.length; i++) {
    const w = worlds[i];
    if (w === undefined) continue;
    state.metas.set(w.worldId, w);
    if (!state.positions.has(w.worldId)) {
      state.positions.set(w.worldId, goldenAnglePosition(i, worlds.length));
    }
  }
  state.corridors = [...corridors];
  state.lastRefreshMs = Date.now() - t0;
}

export function createNetworkVisualizer(deps: NetworkVisualizerDeps): NetworkVisualizer {
  const state = createInitialState();
  return {
    refresh: () => doRefresh(state, deps),
    setViewport(vp) { state.viewport = Object.freeze({ ...state.viewport, ...vp }); },
    selectWorld(worldId) { state.selectedWorldId = worldId; },
    setFilter(filter) { state.filter = filter; },
    highlightPath(worldIds) { state.highlightedPath = [...worldIds]; },
    buildFrame() {
      state.frameCount++;
      const filtered = state.corridors.filter((c) => matchesFilter(c, state.filter));
      return Object.freeze({
        nodes: buildNodes(state, filtered),
        edges: buildEdges(state, state.corridors),
        viewport: state.viewport,
        selectedWorldId: state.selectedWorldId,
        highlightedPath: [...state.highlightedPath],
      });
    },
    getStats: () => Object.freeze({
      nodeCount: state.metas.size,
      edgeCount: state.corridors.length,
      frameCount: state.frameCount,
      lastRefreshMs: state.lastRefreshMs,
    }),
  };
}
