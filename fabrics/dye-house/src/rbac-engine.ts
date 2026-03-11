/**
 * RBAC Engine — Role-Based Access Control with hierarchy.
 *
 * Roles: CITIZEN, ELDER, ARCHITECT, ADMINISTRATOR, SYSTEM
 * Permissions: READ, WRITE, EXECUTE, ADMIN
 * Resource scoping: world-level, dynasty-level, global
 *
 * Role hierarchy: SYSTEM > ADMINISTRATOR > ARCHITECT > ELDER > CITIZEN
 * Higher roles inherit all permissions of lower roles.
 * Custom roles can be created and assigned.
 * Permission audit trail records all checks.
 *
 * "Not all threads may touch every color in The Loom."
 */

// ─── Types ──────────────────────────────────────────────────────────

export type RbacBuiltinRole = 'citizen' | 'elder' | 'architect' | 'administrator' | 'system';
export type RbacPermission = 'read' | 'write' | 'execute' | 'admin';
export type RbacScope = 'global' | 'world' | 'dynasty';

export interface RbacRoleDefinition {
  readonly roleId: string;
  readonly description: string;
  readonly permissions: ReadonlyArray<RbacPermissionGrant>;
  readonly inheritsFrom: string | null;
}

export interface RbacPermissionGrant {
  readonly permission: RbacPermission;
  readonly resource: string;
  readonly scope: RbacScope;
}

export interface RbacAssignment {
  readonly principalId: string;
  readonly roleId: string;
  readonly assignedAt: number;
}

export interface RbacCheckResult {
  readonly allowed: boolean;
  readonly principalId: string;
  readonly permission: RbacPermission;
  readonly resource: string;
  readonly matchedRole: string | null;
  readonly checkedAt: number;
}

export interface RbacAuditEntry {
  readonly principalId: string;
  readonly permission: RbacPermission;
  readonly resource: string;
  readonly allowed: boolean;
  readonly matchedRole: string | null;
  readonly checkedAt: number;
}

export interface RbacStats {
  readonly totalRoles: number;
  readonly totalAssignments: number;
  readonly totalAuditEntries: number;
  readonly totalChecks: number;
  readonly totalDenied: number;
}

// ─── Ports ──────────────────────────────────────────────────────────

export interface RbacEngineDeps {
  readonly clock: { nowMilliseconds(): number };
}

// ─── Public Interface ───────────────────────────────────────────────

export interface RbacEngine {
  readonly defineRole: (role: RbacRoleDefinition) => void;
  readonly removeRole: (roleId: string) => boolean;
  readonly getRole: (roleId: string) => RbacRoleDefinition | undefined;
  readonly listRoles: () => ReadonlyArray<RbacRoleDefinition>;
  readonly assignRole: (principalId: string, roleId: string) => RbacAssignment;
  readonly revokeRole: (principalId: string, roleId: string) => boolean;
  readonly getRolesForPrincipal: (principalId: string) => ReadonlyArray<string>;
  readonly checkPermission: (
    principalId: string,
    permission: RbacPermission,
    resource: string,
  ) => RbacCheckResult;
  readonly getEffectivePermissions: (principalId: string) => ReadonlyArray<RbacPermissionGrant>;
  readonly getAuditTrail: (limit: number) => ReadonlyArray<RbacAuditEntry>;
  readonly getAuditForPrincipal: (
    principalId: string,
    limit: number,
  ) => ReadonlyArray<RbacAuditEntry>;
  readonly getStats: () => RbacStats;
}

// ─── Built-in Role Hierarchy ────────────────────────────────────────

const BUILTIN_HIERARCHY: ReadonlyArray<RbacBuiltinRole> = [
  'citizen',
  'elder',
  'architect',
  'administrator',
  'system',
];

// ─── Internal State ─────────────────────────────────────────────────

interface RbacState {
  readonly roles: Map<string, RbacRoleDefinition>;
  readonly assignments: Map<string, Set<string>>;
  readonly audit: RbacAuditEntry[];
  readonly deps: RbacEngineDeps;
  readonly maxAudit: number;
  totalChecks: number;
  totalDenied: number;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createRbacEngine(deps: RbacEngineDeps): RbacEngine {
  const state: RbacState = {
    roles: new Map(),
    assignments: new Map(),
    audit: [],
    deps,
    maxAudit: 1000,
    totalChecks: 0,
    totalDenied: 0,
  };

  registerBuiltinRoles(state);

  return {
    defineRole: (r) => {
      defineRoleImpl(state, r);
    },
    removeRole: (id) => removeRoleImpl(state, id),
    getRole: (id) => state.roles.get(id),
    listRoles: () => listRolesImpl(state),
    assignRole: (pid, rid) => assignRoleImpl(state, pid, rid),
    revokeRole: (pid, rid) => revokeRoleImpl(state, pid, rid),
    getRolesForPrincipal: (pid) => getRolesImpl(state, pid),
    checkPermission: (pid, perm, res) => checkImpl(state, pid, perm, res),
    getEffectivePermissions: (pid) => effectivePermsImpl(state, pid),
    getAuditTrail: (n) => recentAudit(state, n),
    getAuditForPrincipal: (pid, n) => auditForPrincipal(state, pid, n),
    getStats: () => computeStats(state),
  };
}

// ─── Builtin Roles ──────────────────────────────────────────────────

function makeRole(
  roleId: string,
  description: string,
  permissions: ReadonlyArray<RbacPermissionGrant>,
  inheritsFrom: string | null,
): RbacRoleDefinition {
  return { roleId, description, permissions, inheritsFrom };
}

function systemPermissions(): ReadonlyArray<RbacPermissionGrant> {
  return [
    { permission: 'read', resource: '*', scope: 'global' },
    { permission: 'write', resource: '*', scope: 'global' },
    { permission: 'execute', resource: '*', scope: 'global' },
    { permission: 'admin', resource: '*', scope: 'global' },
  ];
}

function getBuiltinRoles(): ReadonlyArray<RbacRoleDefinition> {
  const p = (perm: RbacPermission, res: string): ReadonlyArray<RbacPermissionGrant> => [
    { permission: perm, resource: res, scope: 'global' },
  ];
  return [
    makeRole('citizen', 'Basic citizen access', p('read', '*'), null),
    makeRole('elder', 'Elder with governance rights', p('write', 'governance:*'), 'citizen'),
    makeRole(
      'architect',
      'Architect with world management',
      [{ permission: 'execute', resource: 'world:*', scope: 'world' }],
      'elder',
    ),
    makeRole('administrator', 'Full administrative access', p('admin', '*'), 'architect'),
    makeRole('system', 'System-level unrestricted access', systemPermissions(), 'administrator'),
  ];
}

function registerBuiltinRoles(state: RbacState): void {
  for (const role of getBuiltinRoles()) state.roles.set(role.roleId, role);
}

// ─── Role Management ────────────────────────────────────────────────

function defineRoleImpl(state: RbacState, role: RbacRoleDefinition): void {
  if (isBuiltinRole(role.roleId)) {
    throw new Error('Cannot redefine builtin role: ' + role.roleId);
  }
  state.roles.set(role.roleId, role);
}

function removeRoleImpl(state: RbacState, roleId: string): boolean {
  if (isBuiltinRole(roleId)) {
    throw new Error('Cannot remove builtin role: ' + roleId);
  }
  if (!state.roles.delete(roleId)) return false;
  for (const roleSet of state.assignments.values()) {
    roleSet.delete(roleId);
  }
  return true;
}

function isBuiltinRole(roleId: string): boolean {
  return BUILTIN_HIERARCHY.includes(roleId as RbacBuiltinRole);
}

// ─── Assignment ─────────────────────────────────────────────────────

function assignRoleImpl(state: RbacState, principalId: string, roleId: string): RbacAssignment {
  if (!state.roles.has(roleId)) {
    throw new Error('Role not found: ' + roleId);
  }
  let roleSet = state.assignments.get(principalId);
  if (roleSet === undefined) {
    roleSet = new Set();
    state.assignments.set(principalId, roleSet);
  }
  roleSet.add(roleId);
  return {
    principalId,
    roleId,
    assignedAt: state.deps.clock.nowMilliseconds(),
  };
}

function revokeRoleImpl(state: RbacState, principalId: string, roleId: string): boolean {
  const roleSet = state.assignments.get(principalId);
  if (roleSet === undefined) return false;
  const deleted = roleSet.delete(roleId);
  if (roleSet.size === 0) state.assignments.delete(principalId);
  return deleted;
}

function getRolesImpl(state: RbacState, principalId: string): ReadonlyArray<string> {
  const roleSet = state.assignments.get(principalId);
  if (roleSet === undefined) return [];
  return [...roleSet];
}

// ─── Permission Check ───────────────────────────────────────────────

function checkImpl(
  state: RbacState,
  principalId: string,
  permission: RbacPermission,
  resource: string,
): RbacCheckResult {
  state.totalChecks += 1;
  const now = state.deps.clock.nowMilliseconds();
  const roleIds = state.assignments.get(principalId);

  if (roleIds === undefined || roleIds.size === 0) {
    state.totalDenied += 1;
    recordAudit(state, principalId, permission, resource, false, null, now);
    return { allowed: false, principalId, permission, resource, matchedRole: null, checkedAt: now };
  }

  for (const roleId of roleIds) {
    if (roleHasPermission(state, roleId, permission, resource)) {
      recordAudit(state, principalId, permission, resource, true, roleId, now);
      return {
        allowed: true,
        principalId,
        permission,
        resource,
        matchedRole: roleId,
        checkedAt: now,
      };
    }
  }

  state.totalDenied += 1;
  recordAudit(state, principalId, permission, resource, false, null, now);
  return { allowed: false, principalId, permission, resource, matchedRole: null, checkedAt: now };
}

function roleHasPermission(
  state: RbacState,
  roleId: string,
  permission: RbacPermission,
  resource: string,
): boolean {
  const visited = new Set<string>();
  return walkRoleChain(state, roleId, permission, resource, visited);
}

function walkRoleChain(
  state: RbacState,
  roleId: string,
  permission: RbacPermission,
  resource: string,
  visited: Set<string>,
): boolean {
  if (visited.has(roleId)) return false;
  visited.add(roleId);

  const role = state.roles.get(roleId);
  if (role === undefined) return false;

  for (const grant of role.permissions) {
    if (grantsMatch(grant, permission, resource)) return true;
  }

  if (role.inheritsFrom !== null) {
    return walkRoleChain(state, role.inheritsFrom, permission, resource, visited);
  }
  return false;
}

function grantsMatch(
  grant: RbacPermissionGrant,
  permission: RbacPermission,
  resource: string,
): boolean {
  if (grant.permission !== permission) return false;
  if (grant.resource === '*') return true;
  if (grant.resource === resource) return true;
  return matchWildcard(grant.resource, resource);
}

function matchWildcard(pattern: string, resource: string): boolean {
  if (!pattern.endsWith('*')) return false;
  const prefix = pattern.slice(0, -1);
  return resource.startsWith(prefix);
}

// ─── Effective Permissions ──────────────────────────────────────────

function effectivePermsImpl(
  state: RbacState,
  principalId: string,
): ReadonlyArray<RbacPermissionGrant> {
  const roleIds = state.assignments.get(principalId);
  if (roleIds === undefined) return [];

  const grants: RbacPermissionGrant[] = [];
  const visited = new Set<string>();

  for (const roleId of roleIds) {
    collectGrants(state, roleId, grants, visited);
  }
  return grants;
}

function collectGrants(
  state: RbacState,
  roleId: string,
  grants: RbacPermissionGrant[],
  visited: Set<string>,
): void {
  if (visited.has(roleId)) return;
  visited.add(roleId);

  const role = state.roles.get(roleId);
  if (role === undefined) return;

  for (const g of role.permissions) grants.push(g);
  if (role.inheritsFrom !== null) {
    collectGrants(state, role.inheritsFrom, grants, visited);
  }
}

// ─── Audit Trail ────────────────────────────────────────────────────

function recordAudit(
  state: RbacState,
  principalId: string,
  permission: RbacPermission,
  resource: string,
  allowed: boolean,
  matchedRole: string | null,
  checkedAt: number,
): void {
  state.audit.push({ principalId, permission, resource, allowed, matchedRole, checkedAt });
  if (state.audit.length > state.maxAudit) state.audit.shift();
}

function recentAudit(state: RbacState, limit: number): ReadonlyArray<RbacAuditEntry> {
  const start = Math.max(0, state.audit.length - limit);
  return state.audit.slice(start);
}

function auditForPrincipal(
  state: RbacState,
  principalId: string,
  limit: number,
): ReadonlyArray<RbacAuditEntry> {
  const filtered: RbacAuditEntry[] = [];
  for (const entry of state.audit) {
    if (entry.principalId === principalId) filtered.push(entry);
  }
  const start = Math.max(0, filtered.length - limit);
  return filtered.slice(start);
}

// ─── List Roles ─────────────────────────────────────────────────────

function listRolesImpl(state: RbacState): ReadonlyArray<RbacRoleDefinition> {
  const result: RbacRoleDefinition[] = [];
  for (const r of state.roles.values()) result.push(r);
  return result;
}

// ─── Stats ──────────────────────────────────────────────────────────

function computeStats(state: RbacState): RbacStats {
  let totalAssignments = 0;
  for (const roleSet of state.assignments.values()) {
    totalAssignments += roleSet.size;
  }
  return {
    totalRoles: state.roles.size,
    totalAssignments,
    totalAuditEntries: state.audit.length,
    totalChecks: state.totalChecks,
    totalDenied: state.totalDenied,
  };
}
