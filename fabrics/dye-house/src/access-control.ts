/**
 * Access Control List — Resource-level permission enforcement.
 *
 * Complements the Permission Gate (which handles subscription-tier
 * authorization) with fine-grained resource access control.
 *
 * Model: Role-Based Access Control (RBAC)
 *   - Principals (dynasty IDs) are assigned roles
 *   - Roles grant permissions on resources
 *   - Permissions are (resource, action) pairs
 *   - Evaluation checks if a principal can perform an action on a resource
 *
 * Example:
 *   Role "world-admin" grants ("world:alpha", "manage")
 *   Dynasty "dyn-42" has role "world-admin"
 *   → dyn-42 can perform "manage" on "world:alpha"
 *
 * "Not all threads may touch every color."
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface AclRole {
  readonly roleId: string;
  readonly description: string;
  readonly grants: ReadonlyArray<AclGrant>;
}

export interface AclGrant {
  readonly resource: string;
  readonly action: string;
}

export interface AclAssignment {
  readonly principalId: string;
  readonly roleId: string;
  readonly assignedAt: number;
}

export interface AclVerdict {
  readonly allowed: boolean;
  readonly principalId: string;
  readonly resource: string;
  readonly action: string;
  readonly matchedRole: string | null;
}

export interface CreateRoleParams {
  readonly roleId: string;
  readonly description: string;
  readonly grants: ReadonlyArray<AclGrant>;
}

export interface AclStats {
  readonly totalRoles: number;
  readonly totalAssignments: number;
  readonly totalGrants: number;
}

// ─── Deps ───────────────────────────────────────────────────────────

export interface AccessControlDeps {
  readonly clock: { nowMicroseconds(): number };
}

// ─── Public Interface ───────────────────────────────────────────────

export interface AccessControlList {
  createRole(params: CreateRoleParams): AclRole;
  removeRole(roleId: string): boolean;
  getRole(roleId: string): AclRole | undefined;
  listRoles(): ReadonlyArray<AclRole>;

  assign(principalId: string, roleId: string): AclAssignment;
  revoke(principalId: string, roleId: string): boolean;
  getRolesForPrincipal(principalId: string): ReadonlyArray<AclRole>;

  check(principalId: string, resource: string, action: string): AclVerdict;
  getGrantsForPrincipal(principalId: string): ReadonlyArray<AclGrant>;

  getStats(): AclStats;
}

// ─── State ──────────────────────────────────────────────────────────

interface MutableRole {
  readonly roleId: string;
  readonly description: string;
  readonly grants: AclGrant[];
}

interface AclState {
  readonly roles: Map<string, MutableRole>;
  readonly assignments: Map<string, Set<string>>; // principalId → roleIds
  readonly assignmentRecords: AclAssignment[];
  readonly deps: AccessControlDeps;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createAccessControlList(deps: AccessControlDeps): AccessControlList {
  const state: AclState = {
    roles: new Map(),
    assignments: new Map(),
    assignmentRecords: [],
    deps,
  };

  return {
    createRole: (p) => createRoleImpl(state, p),
    removeRole: (id) => removeRoleImpl(state, id),
    getRole: (id) => getRoleImpl(state, id),
    listRoles: () => listRolesImpl(state),
    assign: (pid, rid) => assignImpl(state, pid, rid),
    revoke: (pid, rid) => revokeImpl(state, pid, rid),
    getRolesForPrincipal: (pid) => rolesForImpl(state, pid),
    check: (pid, res, act) => checkImpl(state, pid, res, act),
    getGrantsForPrincipal: (pid) => grantsForImpl(state, pid),
    getStats: () => computeStats(state),
  };
}

// ─── Roles ──────────────────────────────────────────────────────────

function createRoleImpl(state: AclState, params: CreateRoleParams): AclRole {
  if (state.roles.has(params.roleId)) {
    throw new Error('Role ' + params.roleId + ' already exists');
  }
  const role: MutableRole = {
    roleId: params.roleId,
    description: params.description,
    grants: [...params.grants],
  };
  state.roles.set(params.roleId, role);
  return toReadonlyRole(role);
}

function removeRoleImpl(state: AclState, roleId: string): boolean {
  if (!state.roles.delete(roleId)) return false;
  for (const roleSet of state.assignments.values()) {
    roleSet.delete(roleId);
  }
  return true;
}

function getRoleImpl(state: AclState, roleId: string): AclRole | undefined {
  const role = state.roles.get(roleId);
  return role !== undefined ? toReadonlyRole(role) : undefined;
}

function listRolesImpl(state: AclState): ReadonlyArray<AclRole> {
  const result: AclRole[] = [];
  for (const role of state.roles.values()) {
    result.push(toReadonlyRole(role));
  }
  return result;
}

// ─── Assignments ────────────────────────────────────────────────────

function assignImpl(state: AclState, principalId: string, roleId: string): AclAssignment {
  if (!state.roles.has(roleId)) {
    throw new Error('Role ' + roleId + ' not found');
  }
  let roleSet = state.assignments.get(principalId);
  if (roleSet === undefined) {
    roleSet = new Set();
    state.assignments.set(principalId, roleSet);
  }
  roleSet.add(roleId);

  const record: AclAssignment = {
    principalId,
    roleId,
    assignedAt: state.deps.clock.nowMicroseconds(),
  };
  state.assignmentRecords.push(record);
  return record;
}

function revokeImpl(state: AclState, principalId: string, roleId: string): boolean {
  const roleSet = state.assignments.get(principalId);
  if (roleSet === undefined) return false;
  const deleted = roleSet.delete(roleId);
  if (roleSet.size === 0) {
    state.assignments.delete(principalId);
  }
  return deleted;
}

function rolesForImpl(state: AclState, principalId: string): ReadonlyArray<AclRole> {
  const roleIds = state.assignments.get(principalId);
  if (roleIds === undefined) return [];
  const result: AclRole[] = [];
  for (const roleId of roleIds) {
    const role = state.roles.get(roleId);
    if (role !== undefined) result.push(toReadonlyRole(role));
  }
  return result;
}

// ─── Check ──────────────────────────────────────────────────────────

function checkImpl(
  state: AclState,
  principalId: string,
  resource: string,
  action: string,
): AclVerdict {
  const roleIds = state.assignments.get(principalId);
  if (roleIds === undefined) {
    return deny(principalId, resource, action);
  }

  for (const roleId of roleIds) {
    if (roleGrantsAccess(state, roleId, resource, action)) {
      return allow(principalId, resource, action, roleId);
    }
  }

  return deny(principalId, resource, action);
}

function roleGrantsAccess(
  state: AclState,
  roleId: string,
  resource: string,
  action: string,
): boolean {
  const role = state.roles.get(roleId);
  if (role === undefined) return false;
  return role.grants.some((g) => matchesGrant(g, resource, action));
}

function matchesGrant(grant: AclGrant, resource: string, action: string): boolean {
  const resourceMatch = grant.resource === resource || grant.resource === '*';
  const actionMatch = grant.action === action || grant.action === '*';
  return resourceMatch && actionMatch;
}

function allow(
  principalId: string,
  resource: string,
  action: string,
  matchedRole: string,
): AclVerdict {
  return { allowed: true, principalId, resource, action, matchedRole };
}

function deny(principalId: string, resource: string, action: string): AclVerdict {
  return { allowed: false, principalId, resource, action, matchedRole: null };
}

// ─── Grants Query ───────────────────────────────────────────────────

function grantsForImpl(state: AclState, principalId: string): ReadonlyArray<AclGrant> {
  const roleIds = state.assignments.get(principalId);
  if (roleIds === undefined) return [];
  const grants: AclGrant[] = [];
  for (const roleId of roleIds) {
    const role = state.roles.get(roleId);
    if (role !== undefined) {
      grants.push(...role.grants);
    }
  }
  return grants;
}

// ─── Stats ──────────────────────────────────────────────────────────

function computeStats(state: AclState): AclStats {
  let totalAssignments = 0;
  let totalGrants = 0;
  for (const roleSet of state.assignments.values()) {
    totalAssignments += roleSet.size;
  }
  for (const role of state.roles.values()) {
    totalGrants += role.grants.length;
  }
  return {
    totalRoles: state.roles.size,
    totalAssignments,
    totalGrants,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function toReadonlyRole(role: MutableRole): AclRole {
  return {
    roleId: role.roleId,
    description: role.description,
    grants: [...role.grants],
  };
}
