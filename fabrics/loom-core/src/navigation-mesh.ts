/**
 * Navigation Mesh — Grid-based pathfinding for world movement.
 *
 * A* pathfinding over a node grid where each cell carries a traversal
 * type and cost. Dynamic obstacles can be placed and removed at runtime.
 * Supports surface, underground, and underwater navigation layers.
 * Common routes are cached for performance.
 */

// ─── Types ──────────────────────────────────────────────────────────

export type NodeType = 'PASSABLE' | 'BLOCKED' | 'SLOW' | 'WATER' | 'HAZARD';

export type NavigationLayer = 'SURFACE' | 'UNDERGROUND' | 'UNDERWATER';

export interface NavNode {
  readonly x: number;
  readonly y: number;
  readonly type: NodeType;
  readonly layer: NavigationLayer;
  readonly baseCost: number;
}

export interface NavPath {
  readonly nodes: ReadonlyArray<NavNode>;
  readonly totalCost: number;
  readonly length: number;
}

export interface NavObstacle {
  readonly obstacleId: string;
  readonly x: number;
  readonly y: number;
  readonly layer: NavigationLayer;
}

export interface PathRequest {
  readonly startX: number;
  readonly startY: number;
  readonly endX: number;
  readonly endY: number;
  readonly layer: NavigationLayer;
  readonly weatherCostMod?: number;
}

export interface NavMeshStats {
  readonly width: number;
  readonly height: number;
  readonly totalNodes: number;
  readonly blockedNodes: number;
  readonly obstacleCount: number;
  readonly cachedPaths: number;
  readonly pathsComputed: number;
}

export interface NavigationMesh {
  getNode(x: number, y: number, layer: NavigationLayer): NavNode | undefined;
  setNodeType(x: number, y: number, layer: NavigationLayer, type: NodeType): boolean;
  findPath(request: PathRequest): NavPath | undefined;
  addObstacle(x: number, y: number, layer: NavigationLayer): NavObstacle;
  removeObstacle(obstacleId: string): boolean;
  getNeighbors(x: number, y: number, layer: NavigationLayer): ReadonlyArray<NavNode>;
  clearPathCache(): number;
  getStats(): NavMeshStats;
}

// ─── Constants ──────────────────────────────────────────────────────

const NODE_COST: Record<NodeType, number> = {
  PASSABLE: 1.0,
  BLOCKED: Infinity,
  SLOW: 2.5,
  WATER: 3.0,
  HAZARD: 4.0,
};

const DIRECTION_OFFSETS: ReadonlyArray<{ readonly dx: number; readonly dy: number }> = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: -1 },
  { dx: 1, dy: 1 },
  { dx: -1, dy: 1 },
  { dx: -1, dy: -1 },
];

const DIAGONAL_COST_MULTIPLIER = 1.414;
const MAX_CACHE_SIZE = 256;

// ─── State ──────────────────────────────────────────────────────────

interface MutableNode {
  readonly x: number;
  readonly y: number;
  type: NodeType;
  readonly layer: NavigationLayer;
  baseCost: number;
}

interface MeshState {
  readonly width: number;
  readonly height: number;
  readonly layers: Map<NavigationLayer, MutableNode[][]>;
  readonly obstacles: Map<string, NavObstacle>;
  readonly pathCache: Map<string, NavPath>;
  nextObstacleId: number;
  pathsComputed: number;
}

// ─── Grid Access Helper ─────────────────────────────────────────────

function meshAt(grid: MutableNode[][], y: number, x: number): MutableNode {
  return (grid[y] as MutableNode[])[x] as MutableNode;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createNavigationMesh(
  width: number,
  height: number,
  defaultType: NodeType = 'PASSABLE',
): NavigationMesh {
  const state: MeshState = {
    width,
    height,
    layers: new Map(),
    obstacles: new Map(),
    pathCache: new Map(),
    nextObstacleId: 1,
    pathsComputed: 0,
  };

  initializeLayer(state, 'SURFACE', defaultType);
  initializeLayer(state, 'UNDERGROUND', defaultType);
  initializeLayer(state, 'UNDERWATER', defaultType);

  return {
    getNode: (x, y, layer) => getNodeImpl(state, x, y, layer),
    setNodeType: (x, y, layer, type) => setNodeTypeImpl(state, x, y, layer, type),
    findPath: (req) => findPathImpl(state, req),
    addObstacle: (x, y, layer) => addObstacleImpl(state, x, y, layer),
    removeObstacle: (id) => removeObstacleImpl(state, id),
    getNeighbors: (x, y, layer) => getNeighborsImpl(state, x, y, layer),
    clearPathCache: () => clearCacheImpl(state),
    getStats: () => buildStats(state),
  };
}

// ─── Initialization ─────────────────────────────────────────────────

function initializeLayer(state: MeshState, layer: NavigationLayer, defaultType: NodeType): void {
  const grid: MutableNode[][] = [];
  for (let y = 0; y < state.height; y++) {
    const row: MutableNode[] = [];
    for (let x = 0; x < state.width; x++) {
      row.push({ x, y, type: defaultType, layer, baseCost: NODE_COST[defaultType] });
    }
    grid.push(row);
  }
  state.layers.set(layer, grid);
}

// ─── Node Access ────────────────────────────────────────────────────

function getNodeImpl(
  state: MeshState,
  x: number,
  y: number,
  layer: NavigationLayer,
): NavNode | undefined {
  if (!inBounds(state, x, y)) return undefined;
  const grid = state.layers.get(layer);
  if (grid === undefined) return undefined;
  return meshAt(grid, y, x);
}

function setNodeTypeImpl(
  state: MeshState,
  x: number,
  y: number,
  layer: NavigationLayer,
  type: NodeType,
): boolean {
  if (!inBounds(state, x, y)) return false;
  const grid = state.layers.get(layer);
  if (grid === undefined) return false;

  const node = meshAt(grid, y, x);
  node.type = type;
  node.baseCost = NODE_COST[type];
  state.pathCache.clear();
  return true;
}

function inBounds(state: MeshState, x: number, y: number): boolean {
  return x >= 0 && x < state.width && y >= 0 && y < state.height;
}

// ─── Neighbors ──────────────────────────────────────────────────────

function getNeighborsImpl(
  state: MeshState,
  x: number,
  y: number,
  layer: NavigationLayer,
): ReadonlyArray<NavNode> {
  const grid = state.layers.get(layer);
  if (grid === undefined) return [];

  const results: NavNode[] = [];
  for (const dir of DIRECTION_OFFSETS) {
    const nx = x + dir.dx;
    const ny = y + dir.dy;
    if (inBounds(state, nx, ny)) results.push(meshAt(grid, ny, nx));
  }
  return results;
}

// ─── A* Pathfinding ─────────────────────────────────────────────────

interface AStarNode {
  readonly x: number;
  readonly y: number;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | undefined;
}

function findPathImpl(state: MeshState, request: PathRequest): NavPath | undefined {
  const cacheKey = buildCacheKey(request);
  const cached = state.pathCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const grid = state.layers.get(request.layer);
  if (grid === undefined) return undefined;
  if (!inBounds(state, request.startX, request.startY)) return undefined;
  if (!inBounds(state, request.endX, request.endY)) return undefined;

  const path = runAStar(state, grid, request);
  state.pathsComputed += 1;

  if (path !== undefined && state.pathCache.size < MAX_CACHE_SIZE) {
    state.pathCache.set(cacheKey, path);
  }
  return path;
}

function runAStar(
  state: MeshState,
  grid: MutableNode[][],
  request: PathRequest,
): NavPath | undefined {
  const weatherMod = request.weatherCostMod ?? 1.0;
  const openSet = new Map<string, AStarNode>();
  const closedSet = new Set<string>();

  const start = createAStarNode(request.startX, request.startY, request.endX, request.endY);
  openSet.set(nodeKey(start.x, start.y), start);

  while (openSet.size > 0) {
    const current = extractLowestF(openSet);
    if (current.x === request.endX && current.y === request.endY) {
      return reconstructPath(current, grid);
    }
    closedSet.add(nodeKey(current.x, current.y));
    expandNode(state, grid, current, request, weatherMod, openSet, closedSet);
  }
  return undefined;
}

function createAStarNode(x: number, y: number, endX: number, endY: number): AStarNode {
  const h = heuristic(x, y, endX, endY);
  return { x, y, g: 0, h, f: h, parent: undefined };
}

function expandNode(
  state: MeshState,
  grid: MutableNode[][],
  current: AStarNode,
  request: PathRequest,
  weatherMod: number,
  openSet: Map<string, AStarNode>,
  closedSet: Set<string>,
): void {
  for (const dir of DIRECTION_OFFSETS) {
    const nx = current.x + dir.dx;
    const ny = current.y + dir.dy;
    if (!inBounds(state, nx, ny)) continue;

    const key = nodeKey(nx, ny);
    if (closedSet.has(key)) continue;

    const neighbor = meshAt(grid, ny, nx);
    if (neighbor.type === 'BLOCKED') continue;

    const isDiagonal = dir.dx !== 0 && dir.dy !== 0;
    const moveCost = neighbor.baseCost * weatherMod * (isDiagonal ? DIAGONAL_COST_MULTIPLIER : 1.0);
    const tentativeG = current.g + moveCost;
    processNeighbor(openSet, nx, ny, tentativeG, request.endX, request.endY, current);
  }
}

function processNeighbor(
  openSet: Map<string, AStarNode>,
  nx: number,
  ny: number,
  tentativeG: number,
  endX: number,
  endY: number,
  parent: AStarNode,
): void {
  const key = nodeKey(nx, ny);
  const existing = openSet.get(key);
  if (existing !== undefined && tentativeG >= existing.g) return;

  const h = heuristic(nx, ny, endX, endY);
  const neighbor: AStarNode = { x: nx, y: ny, g: tentativeG, h, f: tentativeG + h, parent };
  openSet.set(key, neighbor);
}

function extractLowestF(openSet: Map<string, AStarNode>): AStarNode {
  let best: AStarNode | undefined;
  let bestKey = '';
  for (const [key, node] of openSet) {
    if (best === undefined || node.f < best.f) {
      best = node;
      bestKey = key;
    }
  }
  openSet.delete(bestKey);
  return best as AStarNode;
}

function heuristic(x1: number, y1: number, x2: number, y2: number): number {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  return dx + dy;
}

function nodeKey(x: number, y: number): string {
  return String(x) + ',' + String(y);
}

function reconstructPath(end: AStarNode, grid: MutableNode[][]): NavPath {
  const nodes: NavNode[] = [];
  let current: AStarNode | undefined = end;
  let totalCost = 0;

  while (current !== undefined) {
    const pathNode = meshAt(grid, current.y, current.x);
    nodes.push(pathNode);
    totalCost += pathNode.baseCost;
    current = current.parent;
  }
  nodes.reverse();
  return { nodes, totalCost, length: nodes.length };
}

function buildCacheKey(request: PathRequest): string {
  return (
    String(request.startX) +
    ',' +
    String(request.startY) +
    '->' +
    String(request.endX) +
    ',' +
    String(request.endY) +
    '@' +
    request.layer
  );
}

// ─── Obstacles ──────────────────────────────────────────────────────

function addObstacleImpl(
  state: MeshState,
  x: number,
  y: number,
  layer: NavigationLayer,
): NavObstacle {
  const id = 'obs-' + String(state.nextObstacleId);
  state.nextObstacleId += 1;

  setNodeTypeImpl(state, x, y, layer, 'BLOCKED');
  const obstacle: NavObstacle = { obstacleId: id, x, y, layer };
  state.obstacles.set(id, obstacle);
  return obstacle;
}

function removeObstacleImpl(state: MeshState, obstacleId: string): boolean {
  const obstacle = state.obstacles.get(obstacleId);
  if (obstacle === undefined) return false;

  setNodeTypeImpl(state, obstacle.x, obstacle.y, obstacle.layer, 'PASSABLE');
  state.obstacles.delete(obstacleId);
  return true;
}

// ─── Cache ──────────────────────────────────────────────────────────

function clearCacheImpl(state: MeshState): number {
  const count = state.pathCache.size;
  state.pathCache.clear();
  return count;
}

// ─── Stats ──────────────────────────────────────────────────────────

function countBlockedInLayer(grid: MutableNode[][], w: number, h: number): number {
  let count = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (meshAt(grid, y, x).type === 'BLOCKED') count++;
    }
  }
  return count;
}

function buildStats(state: MeshState): NavMeshStats {
  let blockedCount = 0;
  for (const [, grid] of state.layers) {
    blockedCount += countBlockedInLayer(grid, state.width, state.height);
  }

  return {
    width: state.width,
    height: state.height,
    totalNodes: state.width * state.height * state.layers.size,
    blockedNodes: blockedCount,
    obstacleCount: state.obstacles.size,
    cachedPaths: state.pathCache.size,
    pathsComputed: state.pathsComputed,
  };
}
