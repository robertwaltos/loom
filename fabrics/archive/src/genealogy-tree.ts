/**
 * Genealogy Tree — Dynasty family structure and lineage queries.
 *
 * Maintains parent/child relationships between dynasty members.
 * Supports ancestor and descendant traversal with cycle detection,
 * sibling enumeration, and lowest-common-ancestor resolution.
 *
 * Scope: one Genealogy Tree per dynasty (dynastyId namespaces the tree).
 * Multiple members across multiple dynasties can share the same tree
 * instance — each member is scoped to their dynastyId.
 *
 * "Blood is a ledger. Every line tells a story."
 */

// ─── Port Interfaces ─────────────────────────────────────────────────

export interface GenealogyClockPort {
  readonly nowMicroseconds: () => number;
}

export interface GenealogyIdGeneratorPort {
  readonly next: () => string;
}

export interface GenealogyDeps {
  readonly clock: GenealogyClockPort;
  readonly idGenerator: GenealogyIdGeneratorPort;
}

// ─── Types ───────────────────────────────────────────────────────────

export type MemberRole = 'founder' | 'heir' | 'consort' | 'ward' | 'ally';

export interface FamilyNode {
  readonly memberId: string;
  readonly dynastyId: string;
  readonly displayName: string;
  readonly role: MemberRole;
  readonly parentIds: ReadonlyArray<string>;
  readonly childIds: ReadonlyArray<string>;
  readonly addedAt: number;
}

export interface GenealogyTree {
  readonly treeId: string;
  readonly dynastyId: string;
  readonly memberCount: number;
  readonly depth: number;
  readonly createdAt: number;
}

export interface AncestorQuery {
  readonly memberId: string;
  readonly dynastyId: string;
  readonly ancestors: ReadonlyArray<AncestorEntry>;
  readonly maxDepth: number;
}

export interface AncestorEntry {
  readonly memberId: string;
  readonly generation: number;
}

export interface DescendantQuery {
  readonly memberId: string;
  readonly dynastyId: string;
  readonly descendants: ReadonlyArray<DescendantEntry>;
  readonly maxDepth: number;
}

export interface DescendantEntry {
  readonly memberId: string;
  readonly generation: number;
}

export interface CommonAncestorResult {
  readonly memberAId: string;
  readonly memberBId: string;
  readonly commonAncestorId: string | null;
  readonly generationsFromA: number;
  readonly generationsFromB: number;
}

export interface GenealogyStats {
  readonly totalMembers: number;
  readonly totalDynasties: number;
  readonly totalParentRelationships: number;
  readonly deepestTree: number;
}

// ─── Module Interface ─────────────────────────────────────────────────

export interface GenealogyTreeEngine {
  readonly addMember: (params: AddMemberParams) => FamilyNode | string;
  readonly setParent: (childId: string, parentId: string, dynastyId: string) => FamilyNode | string;
  readonly getMember: (memberId: string, dynastyId: string) => FamilyNode | undefined;
  readonly getAncestors: (params: AncestorQueryParams) => AncestorQuery | string;
  readonly getDescendants: (params: DescendantQueryParams) => DescendantQuery | string;
  readonly getSiblings: (memberId: string, dynastyId: string) => ReadonlyArray<FamilyNode>;
  readonly getCommonAncestor: (
    memberAId: string,
    memberBId: string,
    dynastyId: string,
  ) => CommonAncestorResult;
  readonly getTree: (dynastyId: string) => GenealogyTree | undefined;
  readonly getStats: () => GenealogyStats;
}

export interface AddMemberParams {
  readonly memberId: string;
  readonly dynastyId: string;
  readonly displayName: string;
  readonly role: MemberRole;
}

export interface AncestorQueryParams {
  readonly memberId: string;
  readonly dynastyId: string;
  readonly maxGenerations?: number;
}

export interface DescendantQueryParams {
  readonly memberId: string;
  readonly dynastyId: string;
  readonly maxGenerations?: number;
}

// ─── State ────────────────────────────────────────────────────────────

interface MutableFamilyNode {
  readonly memberId: string;
  readonly dynastyId: string;
  readonly displayName: string;
  readonly role: MemberRole;
  readonly parentIds: string[];
  readonly childIds: string[];
  readonly addedAt: number;
}

interface GenealogyState {
  readonly nodes: Map<string, MutableFamilyNode>;
  readonly dynastyMembers: Map<string, Set<string>>;
  readonly trees: Map<string, GenealogyTree>;
}

function nodeKey(dynastyId: string, memberId: string): string {
  return dynastyId + '::' + memberId;
}

const DEFAULT_MAX_GENERATIONS = 100;

// ─── Factory ─────────────────────────────────────────────────────────

export function createGenealogyTreeEngine(deps: GenealogyDeps): GenealogyTreeEngine {
  const state: GenealogyState = {
    nodes: new Map(),
    dynastyMembers: new Map(),
    trees: new Map(),
  };

  return {
    addMember: (params) => addMember(state, deps, params),
    setParent: (childId, parentId, dynastyId) => setParent(state, childId, parentId, dynastyId),
    getMember: (memberId, dynastyId) => frozenNode(state.nodes.get(nodeKey(dynastyId, memberId))),
    getAncestors: (params) => getAncestors(state, params),
    getDescendants: (params) => getDescendants(state, params),
    getSiblings: (memberId, dynastyId) => getSiblings(state, memberId, dynastyId),
    getCommonAncestor: (memberAId, memberBId, dynastyId) =>
      getCommonAncestor(state, memberAId, memberBId, dynastyId),
    getTree: (dynastyId) => state.trees.get(dynastyId),
    getStats: () => getStats(state),
  };
}

// ─── addMember ────────────────────────────────────────────────────────

function addMember(
  state: GenealogyState,
  deps: GenealogyDeps,
  params: AddMemberParams,
): FamilyNode | string {
  const key = nodeKey(params.dynastyId, params.memberId);
  if (state.nodes.has(key)) {
    return 'member ' + params.memberId + ' already exists in dynasty ' + params.dynastyId;
  }

  const node: MutableFamilyNode = {
    memberId: params.memberId,
    dynastyId: params.dynastyId,
    displayName: params.displayName,
    role: params.role,
    parentIds: [],
    childIds: [],
    addedAt: deps.clock.nowMicroseconds(),
  };

  state.nodes.set(key, node);
  registerDynastyMember(state, params.dynastyId, params.memberId);
  upsertTree(state, deps, params.dynastyId);

  return frozenNode(node) as FamilyNode;
}

function registerDynastyMember(state: GenealogyState, dynastyId: string, memberId: string): void {
  const members = state.dynastyMembers.get(dynastyId) ?? new Set<string>();
  members.add(memberId);
  state.dynastyMembers.set(dynastyId, members);
}

function upsertTree(state: GenealogyState, deps: GenealogyDeps, dynastyId: string): void {
  const memberCount = state.dynastyMembers.get(dynastyId)?.size ?? 0;
  const depth = computeTreeDepth(state, dynastyId);
  const existing = state.trees.get(dynastyId);

  state.trees.set(dynastyId, {
    treeId: existing?.treeId ?? deps.idGenerator.next(),
    dynastyId,
    memberCount,
    depth,
    createdAt: existing?.createdAt ?? deps.clock.nowMicroseconds(),
  });
}

// ─── setParent ────────────────────────────────────────────────────────

function setParent(
  state: GenealogyState,
  childId: string,
  parentId: string,
  dynastyId: string,
): FamilyNode | string {
  if (childId === parentId) {
    return 'child and parent cannot be the same member';
  }

  const childNode = state.nodes.get(nodeKey(dynastyId, childId));
  if (childNode === undefined) {
    return 'child member ' + childId + ' not found in dynasty ' + dynastyId;
  }

  const parentNode = state.nodes.get(nodeKey(dynastyId, parentId));
  if (parentNode === undefined) {
    return 'parent member ' + parentId + ' not found in dynasty ' + dynastyId;
  }

  if (wouldCreateCycle(state, dynastyId, parentId, childId)) {
    return 'setting parent would create a cycle in dynasty ' + dynastyId;
  }

  if (!childNode.parentIds.includes(parentId)) {
    childNode.parentIds.push(parentId);
  }
  if (!parentNode.childIds.includes(childId)) {
    parentNode.childIds.push(childId);
  }

  return frozenNode(childNode) as FamilyNode;
}

function wouldCreateCycle(
  state: GenealogyState,
  dynastyId: string,
  candidateParentId: string,
  candidateChildId: string,
): boolean {
  const visited = new Set<string>();
  const queue: string[] = [candidateParentId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) {
      break;
    }
    if (current === candidateChildId) {
      return true;
    }
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);
    const node = state.nodes.get(nodeKey(dynastyId, current));
    if (node !== undefined) {
      queue.push(...node.parentIds);
    }
  }

  return false;
}

// ─── getAncestors ─────────────────────────────────────────────────────

function getAncestors(state: GenealogyState, params: AncestorQueryParams): AncestorQuery | string {
  const node = state.nodes.get(nodeKey(params.dynastyId, params.memberId));
  if (node === undefined) {
    return 'member ' + params.memberId + ' not found in dynasty ' + params.dynastyId;
  }

  const maxGen = params.maxGenerations ?? DEFAULT_MAX_GENERATIONS;
  const ancestors: AncestorEntry[] = [];
  collectAncestors(state, params.dynastyId, params.memberId, 1, maxGen, new Set(), ancestors);

  const maxDepth = ancestors.reduce((max, a) => Math.max(max, a.generation), 0);
  return { memberId: params.memberId, dynastyId: params.dynastyId, ancestors, maxDepth };
}

function collectAncestors(
  state: GenealogyState,
  dynastyId: string,
  memberId: string,
  generation: number,
  maxGen: number,
  visited: Set<string>,
  result: AncestorEntry[],
): void {
  if (generation > maxGen || visited.has(memberId)) {
    return;
  }
  visited.add(memberId);

  const node = state.nodes.get(nodeKey(dynastyId, memberId));
  if (node === undefined) {
    return;
  }

  for (const parentId of node.parentIds) {
    result.push({ memberId: parentId, generation });
    collectAncestors(state, dynastyId, parentId, generation + 1, maxGen, visited, result);
  }
}

// ─── getDescendants ───────────────────────────────────────────────────

function getDescendants(
  state: GenealogyState,
  params: DescendantQueryParams,
): DescendantQuery | string {
  const node = state.nodes.get(nodeKey(params.dynastyId, params.memberId));
  if (node === undefined) {
    return 'member ' + params.memberId + ' not found in dynasty ' + params.dynastyId;
  }

  const maxGen = params.maxGenerations ?? DEFAULT_MAX_GENERATIONS;
  const descendants: DescendantEntry[] = [];
  collectDescendants(state, params.dynastyId, params.memberId, 1, maxGen, new Set(), descendants);

  const maxDepth = descendants.reduce((max, d) => Math.max(max, d.generation), 0);
  return { memberId: params.memberId, dynastyId: params.dynastyId, descendants, maxDepth };
}

function collectDescendants(
  state: GenealogyState,
  dynastyId: string,
  memberId: string,
  generation: number,
  maxGen: number,
  visited: Set<string>,
  result: DescendantEntry[],
): void {
  if (generation > maxGen || visited.has(memberId)) {
    return;
  }
  visited.add(memberId);

  const node = state.nodes.get(nodeKey(dynastyId, memberId));
  if (node === undefined) {
    return;
  }

  for (const childId of node.childIds) {
    result.push({ memberId: childId, generation });
    collectDescendants(state, dynastyId, childId, generation + 1, maxGen, visited, result);
  }
}

// ─── getSiblings ──────────────────────────────────────────────────────

function getSiblings(
  state: GenealogyState,
  memberId: string,
  dynastyId: string,
): ReadonlyArray<FamilyNode> {
  const node = state.nodes.get(nodeKey(dynastyId, memberId));
  if (node === undefined) {
    return [];
  }

  const siblingIds = new Set<string>();
  for (const parentId of node.parentIds) {
    const parentNode = state.nodes.get(nodeKey(dynastyId, parentId));
    if (parentNode === undefined) {
      continue;
    }
    for (const childId of parentNode.childIds) {
      if (childId !== memberId) {
        siblingIds.add(childId);
      }
    }
  }

  const siblings: FamilyNode[] = [];
  for (const sibId of siblingIds) {
    const sib = state.nodes.get(nodeKey(dynastyId, sibId));
    if (sib !== undefined) {
      siblings.push(frozenNode(sib) as FamilyNode);
    }
  }
  return siblings;
}

// ─── getCommonAncestor ────────────────────────────────────────────────

function getCommonAncestor(
  state: GenealogyState,
  memberAId: string,
  memberBId: string,
  dynastyId: string,
): CommonAncestorResult {
  const ancestorsA = buildAncestorMap(state, dynastyId, memberAId);
  const ancestorsB = buildAncestorMap(state, dynastyId, memberBId);

  let bestAncestorId: string | null = null;
  let bestGenA = Infinity;
  let bestGenB = Infinity;

  for (const [ancestorId, genA] of ancestorsA) {
    const genB = ancestorsB.get(ancestorId);
    if (genB === undefined) {
      continue;
    }
    if (genA + genB < bestGenA + bestGenB) {
      bestAncestorId = ancestorId;
      bestGenA = genA;
      bestGenB = genB;
    }
  }

  return {
    memberAId,
    memberBId,
    commonAncestorId: bestAncestorId,
    generationsFromA: bestAncestorId !== null ? bestGenA : 0,
    generationsFromB: bestAncestorId !== null ? bestGenB : 0,
  };
}

function buildAncestorMap(
  state: GenealogyState,
  dynastyId: string,
  memberId: string,
): Map<string, number> {
  const result = new Map<string, number>();
  const queue: Array<{ id: string; gen: number }> = [{ id: memberId, gen: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined || visited.has(current.id)) {
      continue;
    }
    visited.add(current.id);
    if (current.id !== memberId) {
      result.set(current.id, current.gen);
    }
    const node = state.nodes.get(nodeKey(dynastyId, current.id));
    if (node === undefined) {
      continue;
    }
    for (const parentId of node.parentIds) {
      queue.push({ id: parentId, gen: current.gen + 1 });
    }
  }

  return result;
}

// ─── computeTreeDepth ─────────────────────────────────────────────────

function computeTreeDepth(state: GenealogyState, dynastyId: string): number {
  const members = state.dynastyMembers.get(dynastyId);
  if (members === undefined || members.size === 0) {
    return 0;
  }

  let maxDepth = 0;
  for (const memberId of members) {
    const depth = computeMemberDepth(state, dynastyId, memberId, new Set());
    if (depth > maxDepth) {
      maxDepth = depth;
    }
  }
  return maxDepth;
}

function computeMemberDepth(
  state: GenealogyState,
  dynastyId: string,
  memberId: string,
  visited: Set<string>,
): number {
  if (visited.has(memberId)) {
    return 0;
  }
  visited.add(memberId);
  const node = state.nodes.get(nodeKey(dynastyId, memberId));
  if (node === undefined || node.parentIds.length === 0) {
    return 0;
  }
  let maxParentDepth = 0;
  for (const parentId of node.parentIds) {
    const d = computeMemberDepth(state, dynastyId, parentId, visited);
    if (d > maxParentDepth) {
      maxParentDepth = d;
    }
  }
  return maxParentDepth + 1;
}

// ─── frozenNode ───────────────────────────────────────────────────────

function frozenNode(node: MutableFamilyNode | undefined): FamilyNode | undefined {
  if (node === undefined) {
    return undefined;
  }
  return {
    memberId: node.memberId,
    dynastyId: node.dynastyId,
    displayName: node.displayName,
    role: node.role,
    parentIds: [...node.parentIds],
    childIds: [...node.childIds],
    addedAt: node.addedAt,
  };
}

// ─── getStats ─────────────────────────────────────────────────────────

function getStats(state: GenealogyState): GenealogyStats {
  let totalParentRels = 0;
  for (const node of state.nodes.values()) {
    totalParentRels += node.parentIds.length;
  }

  let deepest = 0;
  for (const dynastyId of state.dynastyMembers.keys()) {
    const d = computeTreeDepth(state, dynastyId);
    if (d > deepest) {
      deepest = d;
    }
  }

  return {
    totalMembers: state.nodes.size,
    totalDynasties: state.dynastyMembers.size,
    totalParentRelationships: totalParentRels,
    deepestTree: deepest,
  };
}
