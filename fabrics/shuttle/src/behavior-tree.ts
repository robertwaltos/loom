/**
 * Behavior Tree — Tick-driven decision trees for Tier 2 Inhabitants.
 *
 * Bible v1.1: Tier 2 NPCs use behavior trees with 90-day rolling
 * memory. These are stateful, deterministic AI routines that execute
 * one tick at a time without blocking the Loom.
 *
 * Node types:
 *   Sequence:  Run children left-to-right, fail on first failure
 *   Selector:  Run children left-to-right, succeed on first success
 *   Action:    Leaf node, performs work, returns running/success/failure
 *   Condition: Leaf node, checks state, returns success/failure
 *
 * Each tree holds a blackboard (key-value context) for inter-node
 * communication within a single NPC's decision cycle.
 *
 * "Inhabitants follow patterns woven into their nature."
 */

// ─── Types ──────────────────────────────────────────────────────────

export type BtNodeStatus = 'success' | 'failure' | 'running';

export type BtNodeType = 'sequence' | 'selector' | 'action' | 'condition';

export interface BtBlackboard {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  has(key: string): boolean;
  clear(): void;
  keys(): ReadonlyArray<string>;
}

export interface BtTickContext {
  readonly npcId: string;
  readonly worldId: string;
  readonly deltaUs: number;
  readonly blackboard: BtBlackboard;
}

export type BtActionFn = (ctx: BtTickContext) => BtNodeStatus;
export type BtConditionFn = (ctx: BtTickContext) => boolean;

// ─── Node Interfaces ────────────────────────────────────────────────

export interface BtNode {
  readonly name: string;
  readonly type: BtNodeType;
  tick(ctx: BtTickContext): BtNodeStatus;
  reset(): void;
}

// ─── Behavior Tree ──────────────────────────────────────────────────

export interface BehaviorTree {
  readonly name: string;
  tick(ctx: BtTickContext): BtNodeStatus;
  reset(): void;
  getRoot(): BtNode;
}

// ─── Tree Stats ─────────────────────────────────────────────────────

export interface BtTreeStats {
  readonly name: string;
  readonly totalTicks: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly runningCount: number;
}

// ─── Tree Registry ──────────────────────────────────────────────────

export interface BehaviorTreeRegistry {
  register(tree: BehaviorTree): void;
  get(name: string): BehaviorTree | undefined;
  remove(name: string): boolean;
  list(): ReadonlyArray<string>;
  count(): number;
  tickTree(name: string, ctx: BtTickContext): BtNodeStatus;
  getStats(name: string): BtTreeStats | undefined;
}

// ─── Blackboard Factory ─────────────────────────────────────────────

export function createBlackboard(): BtBlackboard {
  const data = new Map<string, unknown>();

  return {
    get: (key) => data.get(key),
    set: (key, value) => { data.set(key, value); },
    has: (key) => data.has(key),
    clear: () => { data.clear(); },
    keys: () => [...data.keys()],
  };
}

// ─── Node Factories ─────────────────────────────────────────────────

export function createSequenceNode(
  name: string,
  children: ReadonlyArray<BtNode>,
): BtNode {
  let runningIndex = 0;

  return {
    name,
    type: 'sequence',
    tick: (ctx) => tickSequence(children, ctx, () => runningIndex, (i) => { runningIndex = i; }),
    reset: () => { runningIndex = 0; resetChildren(children); },
  };
}

function tickSequence(
  children: ReadonlyArray<BtNode>,
  ctx: BtTickContext,
  getIndex: () => number,
  setIndex: (i: number) => void,
): BtNodeStatus {
  for (let i = getIndex(); i < children.length; i++) {
    const child = children[i];
    if (child === undefined) continue;
    const status = child.tick(ctx);
    if (status === 'failure') { setIndex(0); return 'failure'; }
    if (status === 'running') { setIndex(i); return 'running'; }
  }
  setIndex(0);
  return 'success';
}

export function createSelectorNode(
  name: string,
  children: ReadonlyArray<BtNode>,
): BtNode {
  let runningIndex = 0;

  return {
    name,
    type: 'selector',
    tick: (ctx) => tickSelector(children, ctx, () => runningIndex, (i) => { runningIndex = i; }),
    reset: () => { runningIndex = 0; resetChildren(children); },
  };
}

function tickSelector(
  children: ReadonlyArray<BtNode>,
  ctx: BtTickContext,
  getIndex: () => number,
  setIndex: (i: number) => void,
): BtNodeStatus {
  for (let i = getIndex(); i < children.length; i++) {
    const child = children[i];
    if (child === undefined) continue;
    const status = child.tick(ctx);
    if (status === 'success') { setIndex(0); return 'success'; }
    if (status === 'running') { setIndex(i); return 'running'; }
  }
  setIndex(0);
  return 'failure';
}

export function createActionNode(
  name: string,
  action: BtActionFn,
): BtNode {
  return {
    name,
    type: 'action',
    tick: (ctx) => action(ctx),
    reset: () => { /* action nodes are stateless */ },
  };
}

export function createConditionNode(
  name: string,
  condition: BtConditionFn,
): BtNode {
  return {
    name,
    type: 'condition',
    tick: (ctx) => condition(ctx) ? 'success' : 'failure',
    reset: () => { /* condition nodes are stateless */ },
  };
}

// ─── Tree Factory ───────────────────────────────────────────────────

export function createBehaviorTree(
  name: string,
  root: BtNode,
): BehaviorTree {
  return {
    name,
    tick: (ctx) => root.tick(ctx),
    reset: () => { root.reset(); },
    getRoot: () => root,
  };
}

// ─── Registry Factory ───────────────────────────────────────────────

interface TreeEntry {
  readonly tree: BehaviorTree;
  totalTicks: number;
  successCount: number;
  failureCount: number;
  runningCount: number;
}

export function createBehaviorTreeRegistry(): BehaviorTreeRegistry {
  const trees = new Map<string, TreeEntry>();

  return {
    register: (t) => { registerTree(trees, t); },
    get: (n) => trees.get(n)?.tree,
    remove: (n) => trees.delete(n),
    list: () => [...trees.keys()],
    count: () => trees.size,
    tickTree: (n, ctx) => tickRegisteredTree(trees, n, ctx),
    getStats: (n) => getTreeStats(trees, n),
  };
}

function registerTree(
  trees: Map<string, TreeEntry>,
  tree: BehaviorTree,
): void {
  trees.set(tree.name, {
    tree,
    totalTicks: 0,
    successCount: 0,
    failureCount: 0,
    runningCount: 0,
  });
}

function tickRegisteredTree(
  trees: Map<string, TreeEntry>,
  name: string,
  ctx: BtTickContext,
): BtNodeStatus {
  const entry = trees.get(name);
  if (entry === undefined) return 'failure';

  const status = entry.tree.tick(ctx);
  entry.totalTicks += 1;
  if (status === 'success') entry.successCount += 1;
  else if (status === 'failure') entry.failureCount += 1;
  else entry.runningCount += 1;

  return status;
}

function getTreeStats(
  trees: Map<string, TreeEntry>,
  name: string,
): BtTreeStats | undefined {
  const entry = trees.get(name);
  if (entry === undefined) return undefined;

  return {
    name,
    totalTicks: entry.totalTicks,
    successCount: entry.successCount,
    failureCount: entry.failureCount,
    runningCount: entry.runningCount,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function resetChildren(children: ReadonlyArray<BtNode>): void {
  for (const child of children) {
    child.reset();
  }
}
