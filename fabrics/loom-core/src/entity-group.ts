/**
 * entity-group.ts — Entity group management.
 *
 * Organizes entities into named groups for batch operations.
 * Supports membership queries, group lifecycle, and aggregate
 * statistics across all managed groups.
 */

// ── Ports ────────────────────────────────────────────────────────

interface GroupClock {
  readonly nowMicroseconds: () => number;
}

interface EntityGroupDeps {
  readonly clock: GroupClock;
}

// ── Types ────────────────────────────────────────────────────────

interface EntityGroup {
  readonly groupId: string;
  readonly members: ReadonlySet<string>;
  readonly createdAt: number;
}

interface CreateGroupParams {
  readonly groupId: string;
}

interface GroupStats {
  readonly totalGroups: number;
  readonly totalMemberships: number;
  readonly largestGroupSize: number;
}

interface EntityGroupManager {
  readonly createGroup: (params: CreateGroupParams) => boolean;
  readonly removeGroup: (groupId: string) => boolean;
  readonly addMember: (groupId: string, entityId: string) => boolean;
  readonly removeMember: (groupId: string, entityId: string) => boolean;
  readonly isMember: (groupId: string, entityId: string) => boolean;
  readonly getGroup: (groupId: string) => EntityGroup | undefined;
  readonly listGroups: () => readonly EntityGroup[];
  readonly getEntityGroups: (entityId: string) => readonly string[];
  readonly getStats: () => GroupStats;
}

// ── State ────────────────────────────────────────────────────────

interface MutableGroup {
  readonly groupId: string;
  readonly members: Set<string>;
  readonly createdAt: number;
}

interface GroupState {
  readonly deps: EntityGroupDeps;
  readonly groups: Map<string, MutableGroup>;
}

// ── Helpers ──────────────────────────────────────────────────────

function toReadonly(group: MutableGroup): EntityGroup {
  return {
    groupId: group.groupId,
    members: new Set(group.members),
    createdAt: group.createdAt,
  };
}

// ── Operations ───────────────────────────────────────────────────

function createGroupImpl(state: GroupState, params: CreateGroupParams): boolean {
  if (state.groups.has(params.groupId)) return false;
  state.groups.set(params.groupId, {
    groupId: params.groupId,
    members: new Set(),
    createdAt: state.deps.clock.nowMicroseconds(),
  });
  return true;
}

function removeGroupImpl(state: GroupState, groupId: string): boolean {
  return state.groups.delete(groupId);
}

function addMemberImpl(state: GroupState, groupId: string, entityId: string): boolean {
  const group = state.groups.get(groupId);
  if (!group) return false;
  if (group.members.has(entityId)) return false;
  group.members.add(entityId);
  return true;
}

function removeMemberImpl(state: GroupState, groupId: string, entityId: string): boolean {
  const group = state.groups.get(groupId);
  if (!group) return false;
  return group.members.delete(entityId);
}

function getEntityGroupsImpl(state: GroupState, entityId: string): string[] {
  const result: string[] = [];
  for (const group of state.groups.values()) {
    if (group.members.has(entityId)) result.push(group.groupId);
  }
  return result;
}

function getStatsImpl(state: GroupState): GroupStats {
  let totalMemberships = 0;
  let largestGroupSize = 0;
  for (const group of state.groups.values()) {
    totalMemberships += group.members.size;
    if (group.members.size > largestGroupSize) {
      largestGroupSize = group.members.size;
    }
  }
  return {
    totalGroups: state.groups.size,
    totalMemberships,
    largestGroupSize,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createEntityGroupManager(deps: EntityGroupDeps): EntityGroupManager {
  const state: GroupState = { deps, groups: new Map() };
  return {
    createGroup: (p) => createGroupImpl(state, p),
    removeGroup: (id) => removeGroupImpl(state, id),
    addMember: (gid, eid) => addMemberImpl(state, gid, eid),
    removeMember: (gid, eid) => removeMemberImpl(state, gid, eid),
    isMember: (gid, eid) => {
      const g = state.groups.get(gid);
      return g ? g.members.has(eid) : false;
    },
    getGroup: (id) => {
      const g = state.groups.get(id);
      return g ? toReadonly(g) : undefined;
    },
    listGroups: () => {
      const result: EntityGroup[] = [];
      for (const g of state.groups.values()) result.push(toReadonly(g));
      return result;
    },
    getEntityGroups: (eid) => getEntityGroupsImpl(state, eid),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createEntityGroupManager };
export type { EntityGroupManager, EntityGroupDeps, EntityGroup, CreateGroupParams, GroupStats };
