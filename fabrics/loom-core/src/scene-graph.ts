/**
 * scene-graph.ts — Hierarchical scene node management with transform propagation.
 *
 * Nodes form a tree. World transforms are composed by walking the ancestor chain.
 * Removing a node removes all its descendants. Reparenting detects cycles.
 */

// ── Types ─────────────────────────────────────────────────────────

export type NodeId = string;

export type SceneError =
  | 'node-not-found'
  | 'parent-not-found'
  | 'circular-reference'
  | 'already-exists'
  | 'root-node';

export interface Transform {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly rotX: number;
  readonly rotY: number;
  readonly rotZ: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly scaleZ: number;
}

export interface SceneNode {
  readonly nodeId: NodeId;
  readonly label: string;
  readonly parentId: NodeId | null;
  readonly childIds: ReadonlyArray<NodeId>;
  readonly localTransform: Transform;
  readonly worldTransform: Transform;
  readonly createdAt: bigint;
}

export interface SceneStats {
  readonly totalNodes: number;
  readonly maxDepth: number;
  readonly rootCount: number;
}

export interface SceneGraphSystem {
  addNode(
    nodeId: NodeId,
    label: string,
    parentId: NodeId | null,
    localTransform: Transform,
  ): SceneNode | SceneError;
  removeNode(
    nodeId: NodeId,
  ): { success: true; removedCount: number } | { success: false; error: SceneError };
  reparent(
    nodeId: NodeId,
    newParentId: NodeId | null,
  ): { success: true } | { success: false; error: SceneError };
  setLocalTransform(
    nodeId: NodeId,
    transform: Transform,
  ): { success: true } | { success: false; error: SceneError };
  getNode(nodeId: NodeId): SceneNode | undefined;
  getChildren(nodeId: NodeId): ReadonlyArray<SceneNode>;
  getAncestors(nodeId: NodeId): ReadonlyArray<SceneNode>;
  getStats(): SceneStats;
}

// ── Ports ─────────────────────────────────────────────────────────

interface SceneClock {
  nowUs(): bigint;
}

interface SceneIdGenerator {
  generate(): string;
}

interface SceneLogger {
  debug(msg: string): void;
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

export interface SceneGraphDeps {
  readonly clock: SceneClock;
  readonly idGen: SceneIdGenerator;
  readonly logger: SceneLogger;
}

// ── Internal State ────────────────────────────────────────────────

interface MutableNode {
  nodeId: NodeId;
  label: string;
  parentId: NodeId | null;
  childIds: NodeId[];
  localTransform: Transform;
  worldTransform: Transform;
  createdAt: bigint;
}

interface SceneState {
  readonly nodes: Map<NodeId, MutableNode>;
  readonly clock: SceneClock;
  readonly logger: SceneLogger;
}

// ── Transform Composition ─────────────────────────────────────────

function composeTransform(parent: Transform, local: Transform): Transform {
  return {
    x: parent.x + local.x,
    y: parent.y + local.y,
    z: parent.z + local.z,
    rotX: parent.rotX + local.rotX,
    rotY: parent.rotY + local.rotY,
    rotZ: parent.rotZ + local.rotZ,
    scaleX: parent.scaleX * local.scaleX,
    scaleY: parent.scaleY * local.scaleY,
    scaleZ: parent.scaleZ * local.scaleZ,
  };
}

function computeWorldTransform(state: SceneState, node: MutableNode): Transform {
  if (node.parentId === null) return node.localTransform;
  const parent = state.nodes.get(node.parentId);
  if (parent === undefined) return node.localTransform;
  return composeTransform(parent.worldTransform, node.localTransform);
}

function recomputeSubtree(state: SceneState, nodeId: NodeId): void {
  const node = state.nodes.get(nodeId);
  if (node === undefined) return;
  node.worldTransform = computeWorldTransform(state, node);
  for (const childId of node.childIds) {
    recomputeSubtree(state, childId);
  }
}

// ── Cycle Detection ───────────────────────────────────────────────

function isDescendant(state: SceneState, ancestorId: NodeId, candidateId: NodeId): boolean {
  const candidate = state.nodes.get(candidateId);
  if (candidate === undefined) return false;
  if (candidate.parentId === null) return false;
  if (candidate.parentId === ancestorId) return true;
  return isDescendant(state, ancestorId, candidate.parentId);
}

// ── Node Snapshot ─────────────────────────────────────────────────

function toReadonly(node: MutableNode): SceneNode {
  return {
    nodeId: node.nodeId,
    label: node.label,
    parentId: node.parentId,
    childIds: node.childIds.slice(),
    localTransform: node.localTransform,
    worldTransform: node.worldTransform,
    createdAt: node.createdAt,
  };
}

// ── Operations ────────────────────────────────────────────────────

function addNodeImpl(
  state: SceneState,
  nodeId: NodeId,
  label: string,
  parentId: NodeId | null,
  localTransform: Transform,
): SceneNode | SceneError {
  if (state.nodes.has(nodeId)) return 'already-exists';
  if (parentId !== null && !state.nodes.has(parentId)) return 'parent-not-found';

  const now = state.clock.nowUs();
  const mutable: MutableNode = {
    nodeId,
    label,
    parentId,
    childIds: [],
    localTransform,
    worldTransform: localTransform,
    createdAt: now,
  };

  state.nodes.set(nodeId, mutable);

  if (parentId !== null) {
    const parent = state.nodes.get(parentId) as MutableNode;
    parent.childIds.push(nodeId);
  }

  mutable.worldTransform = computeWorldTransform(state, mutable);
  state.logger.info('scene-node-added nodeId=' + nodeId + ' parent=' + String(parentId));
  return toReadonly(mutable);
}

function collectSubtree(state: SceneState, nodeId: NodeId, collected: NodeId[]): void {
  collected.push(nodeId);
  const node = state.nodes.get(nodeId);
  if (node === undefined) return;
  for (const childId of node.childIds) {
    collectSubtree(state, childId, collected);
  }
}

function removeNodeImpl(
  state: SceneState,
  nodeId: NodeId,
): { success: true; removedCount: number } | { success: false; error: SceneError } {
  const node = state.nodes.get(nodeId);
  if (node === undefined) return { success: false, error: 'node-not-found' };

  const toRemove: NodeId[] = [];
  collectSubtree(state, nodeId, toRemove);

  if (node.parentId !== null) {
    const parent = state.nodes.get(node.parentId);
    if (parent !== undefined) {
      parent.childIds = parent.childIds.filter((id) => id !== nodeId);
    }
  }

  for (const id of toRemove) {
    state.nodes.delete(id);
  }

  state.logger.info('scene-node-removed nodeId=' + nodeId + ' count=' + String(toRemove.length));
  return { success: true, removedCount: toRemove.length };
}

function reparentImpl(
  state: SceneState,
  nodeId: NodeId,
  newParentId: NodeId | null,
): { success: true } | { success: false; error: SceneError } {
  const node = state.nodes.get(nodeId);
  if (node === undefined) return { success: false, error: 'node-not-found' };
  if (newParentId !== null && !state.nodes.has(newParentId)) {
    return { success: false, error: 'parent-not-found' };
  }
  if (newParentId !== null && isDescendant(state, nodeId, newParentId)) {
    return { success: false, error: 'circular-reference' };
  }

  if (node.parentId !== null) {
    const oldParent = state.nodes.get(node.parentId);
    if (oldParent !== undefined) {
      oldParent.childIds = oldParent.childIds.filter((id) => id !== nodeId);
    }
  }

  node.parentId = newParentId;

  if (newParentId !== null) {
    const newParent = state.nodes.get(newParentId) as MutableNode;
    newParent.childIds.push(nodeId);
  }

  recomputeSubtree(state, nodeId);
  state.logger.info('scene-node-reparented nodeId=' + nodeId + ' newParent=' + String(newParentId));
  return { success: true };
}

function setLocalTransformImpl(
  state: SceneState,
  nodeId: NodeId,
  transform: Transform,
): { success: true } | { success: false; error: SceneError } {
  const node = state.nodes.get(nodeId);
  if (node === undefined) return { success: false, error: 'node-not-found' };
  node.localTransform = transform;
  recomputeSubtree(state, nodeId);
  return { success: true };
}

function getChildrenImpl(state: SceneState, nodeId: NodeId): ReadonlyArray<SceneNode> {
  const node = state.nodes.get(nodeId);
  if (node === undefined) return [];
  return node.childIds.map((id) => toReadonly(state.nodes.get(id) as MutableNode));
}

function getAncestorsImpl(state: SceneState, nodeId: NodeId): ReadonlyArray<SceneNode> {
  const ancestors: SceneNode[] = [];
  const current = state.nodes.get(nodeId);
  if (current === undefined) return [];
  let parentId = current.parentId;
  while (parentId !== null) {
    const parent = state.nodes.get(parentId);
    if (parent === undefined) break;
    ancestors.push(toReadonly(parent));
    parentId = parent.parentId;
  }
  return ancestors;
}

function distanceFromRoot(state: SceneState, node: MutableNode): number {
  let depth = 0;
  let current: MutableNode | undefined = node;
  while (current !== undefined && current.parentId !== null) {
    depth += 1;
    current = state.nodes.get(current.parentId);
  }
  return depth;
}

function getStatsImpl(state: SceneState): SceneStats {
  let rootCount = 0;
  let maxDepth = 0;
  for (const [, node] of state.nodes) {
    if (node.parentId === null) rootCount += 1;
    const d = distanceFromRoot(state, node);
    if (d > maxDepth) maxDepth = d;
  }
  return { totalNodes: state.nodes.size, maxDepth, rootCount };
}

// ── Factory ───────────────────────────────────────────────────────

export function createSceneGraphSystem(deps: SceneGraphDeps): SceneGraphSystem {
  const state: SceneState = {
    nodes: new Map(),
    clock: deps.clock,
    logger: deps.logger,
  };

  return {
    addNode: (nodeId, label, parentId, localTransform) =>
      addNodeImpl(state, nodeId, label, parentId, localTransform),
    removeNode: (nodeId) => removeNodeImpl(state, nodeId),
    reparent: (nodeId, newParentId) => reparentImpl(state, nodeId, newParentId),
    setLocalTransform: (nodeId, transform) => setLocalTransformImpl(state, nodeId, transform),
    getNode: (nodeId) => {
      const node = state.nodes.get(nodeId);
      return node !== undefined ? toReadonly(node) : undefined;
    },
    getChildren: (nodeId) => getChildrenImpl(state, nodeId),
    getAncestors: (nodeId) => getAncestorsImpl(state, nodeId),
    getStats: () => getStatsImpl(state),
  };
}
