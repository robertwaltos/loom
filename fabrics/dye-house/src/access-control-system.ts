/**
 * Access Control System — Role-based access control (RBAC) with permission checking.
 *
 * Subjects are registered entities (users or services). Roles carry named
 * permissions and optional single-level inheritance. Subjects are assigned
 * roles. Access checks grant if any role (or parent role) contains the
 * requested permission, or if a direct resource-level permission exists.
 *
 * "Not all threads may touch every color."
 *
 * Fabric: dye-house
 * Thread tier: 1
 */

// ─── Port Interfaces ─────────────────────────────────────────────────────────

interface AccessControlClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface AccessControlIdGenPort {
  readonly next: () => string;
}

interface AccessControlLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type SubjectId = string;
export type ResourceId = string;
export type RoleId = string;

export type Permission = 'READ' | 'WRITE' | 'DELETE' | 'ADMIN' | 'EXECUTE';

export type AccessError =
  | 'subject-not-found'
  | 'role-not-found'
  | 'resource-not-found'
  | 'already-exists'
  | 'permission-denied'
  | 'role-assigned-already';

export interface Role {
  readonly roleId: RoleId;
  readonly name: string;
  readonly permissions: ReadonlySet<Permission>;
  readonly inheritsFrom: RoleId | null;
  readonly createdAt: bigint;
}

export interface AccessSubject {
  readonly subjectId: SubjectId;
  readonly roles: ReadonlyArray<RoleId>;
  readonly createdAt: bigint;
}

export interface AccessCheck {
  readonly subjectId: SubjectId;
  readonly resourceId: ResourceId;
  readonly permission: Permission;
  readonly granted: boolean;
  readonly reason: string;
  readonly checkedAt: bigint;
}

// ─── System Interface ─────────────────────────────────────────────────────────

export interface AccessControlSystem {
  createRole(
    name: string,
    permissions: ReadonlyArray<Permission>,
    inheritsFrom: RoleId | null,
  ): Role | AccessError;
  assignRole(
    subjectId: SubjectId,
    roleId: RoleId,
  ): { success: true } | { success: false; error: AccessError };
  revokeRole(
    subjectId: SubjectId,
    roleId: RoleId,
  ): { success: true } | { success: false; error: AccessError };
  registerSubject(subjectId: SubjectId): { success: true } | { success: false; error: AccessError };
  checkAccess(subjectId: SubjectId, resourceId: ResourceId, permission: Permission): AccessCheck;
  grantResourcePermission(
    subjectId: SubjectId,
    resourceId: ResourceId,
    permission: Permission,
  ): { success: true } | { success: false; error: AccessError };
  revokeResourcePermission(
    subjectId: SubjectId,
    resourceId: ResourceId,
    permission: Permission,
  ): { success: true } | { success: false; error: AccessError };
  getSubject(subjectId: SubjectId): AccessSubject | undefined;
  getRole(roleId: RoleId): Role | undefined;
  listRoles(): ReadonlyArray<Role>;
}

// ─── Deps ────────────────────────────────────────────────────────────────────

export interface AccessControlSystemDeps {
  readonly clock: AccessControlClockPort;
  readonly idGen: AccessControlIdGenPort;
  readonly logger: AccessControlLoggerPort;
}

// ─── Internal State ───────────────────────────────────────────────────────────

interface MutableRole {
  roleId: RoleId;
  name: string;
  permissions: Set<Permission>;
  inheritsFrom: RoleId | null;
  createdAt: bigint;
}

interface MutableSubject {
  subjectId: SubjectId;
  roles: Set<RoleId>;
  createdAt: bigint;
}

interface AccessControlState {
  readonly roles: Map<RoleId, MutableRole>;
  readonly rolesByName: Map<string, RoleId>;
  readonly subjects: Map<SubjectId, MutableSubject>;
  readonly resourcePerms: Map<string, Set<Permission>>;
  readonly deps: AccessControlSystemDeps;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createAccessControlSystem(deps: AccessControlSystemDeps): AccessControlSystem {
  const state: AccessControlState = {
    roles: new Map(),
    rolesByName: new Map(),
    subjects: new Map(),
    resourcePerms: new Map(),
    deps,
  };

  return {
    createRole: (name, permissions, inheritsFrom) =>
      createRoleImpl(state, name, permissions, inheritsFrom),
    assignRole: (subjectId, roleId) => assignRoleImpl(state, subjectId, roleId),
    revokeRole: (subjectId, roleId) => revokeRoleImpl(state, subjectId, roleId),
    registerSubject: (subjectId) => registerSubjectImpl(state, subjectId),
    checkAccess: (subjectId, resourceId, permission) =>
      checkAccessImpl(state, subjectId, resourceId, permission),
    grantResourcePermission: (subjectId, resourceId, permission) =>
      grantResourcePermissionImpl(state, subjectId, resourceId, permission),
    revokeResourcePermission: (subjectId, resourceId, permission) =>
      revokeResourcePermissionImpl(state, subjectId, resourceId, permission),
    getSubject: (subjectId) => toReadonlySubject(state.subjects.get(subjectId)),
    getRole: (roleId) => toReadonlyRole(state.roles.get(roleId)),
    listRoles: () => listRolesImpl(state),
  };
}

// ─── Create Role ──────────────────────────────────────────────────────────────

function createRoleImpl(
  state: AccessControlState,
  name: string,
  permissions: ReadonlyArray<Permission>,
  inheritsFrom: RoleId | null,
): Role | AccessError {
  if (state.rolesByName.has(name)) return 'already-exists';
  if (inheritsFrom !== null && !state.roles.has(inheritsFrom)) return 'role-not-found';

  const roleId = state.deps.idGen.next();
  const role: MutableRole = {
    roleId,
    name,
    permissions: new Set(permissions),
    inheritsFrom,
    createdAt: state.deps.clock.nowMicroseconds(),
  };
  state.roles.set(roleId, role);
  state.rolesByName.set(name, roleId);
  state.deps.logger.info('role-created', { roleId, name });
  return toReadonlyRole(role) as Role;
}

// ─── Register Subject ─────────────────────────────────────────────────────────

function registerSubjectImpl(
  state: AccessControlState,
  subjectId: SubjectId,
): { success: true } | { success: false; error: AccessError } {
  if (state.subjects.has(subjectId)) return { success: false, error: 'already-exists' };
  const subject: MutableSubject = {
    subjectId,
    roles: new Set(),
    createdAt: state.deps.clock.nowMicroseconds(),
  };
  state.subjects.set(subjectId, subject);
  state.deps.logger.info('subject-registered', { subjectId });
  return { success: true };
}

// ─── Assign Role ──────────────────────────────────────────────────────────────

function assignRoleImpl(
  state: AccessControlState,
  subjectId: SubjectId,
  roleId: RoleId,
): { success: true } | { success: false; error: AccessError } {
  const subject = state.subjects.get(subjectId);
  if (subject === undefined) return { success: false, error: 'subject-not-found' };
  if (!state.roles.has(roleId)) return { success: false, error: 'role-not-found' };
  if (subject.roles.has(roleId)) return { success: false, error: 'role-assigned-already' };
  subject.roles.add(roleId);
  state.deps.logger.info('role-assigned', { subjectId, roleId });
  return { success: true };
}

// ─── Revoke Role ──────────────────────────────────────────────────────────────

function revokeRoleImpl(
  state: AccessControlState,
  subjectId: SubjectId,
  roleId: RoleId,
): { success: true } | { success: false; error: AccessError } {
  const subject = state.subjects.get(subjectId);
  if (subject === undefined) return { success: false, error: 'subject-not-found' };
  if (!subject.roles.has(roleId)) return { success: false, error: 'role-not-found' };
  subject.roles.delete(roleId);
  return { success: true };
}

// ─── Check Access ─────────────────────────────────────────────────────────────

function checkAccessImpl(
  state: AccessControlState,
  subjectId: SubjectId,
  resourceId: ResourceId,
  permission: Permission,
): AccessCheck {
  const now = state.deps.clock.nowMicroseconds();
  const subject = state.subjects.get(subjectId);

  if (subject === undefined) {
    return buildCheck(subjectId, resourceId, permission, false, 'denied', now);
  }

  const resKey = resourcePermKey(subjectId, resourceId);
  const resPerms = state.resourcePerms.get(resKey);
  if (resPerms !== undefined && resPerms.has(permission)) {
    return buildCheck(subjectId, resourceId, permission, true, 'resource-grant', now);
  }

  for (const roleId of subject.roles) {
    if (roleHasPermission(state, roleId, permission)) {
      return buildCheck(subjectId, resourceId, permission, true, 'role', now);
    }
  }

  return buildCheck(subjectId, resourceId, permission, false, 'denied', now);
}

function roleHasPermission(state: AccessControlState, roleId: RoleId, perm: Permission): boolean {
  const role = state.roles.get(roleId);
  if (role === undefined) return false;
  if (role.permissions.has(perm)) return true;
  if (role.inheritsFrom === null) return false;
  const parent = state.roles.get(role.inheritsFrom);
  return parent?.permissions.has(perm) ?? false;
}

// ─── Resource Permissions ─────────────────────────────────────────────────────

function grantResourcePermissionImpl(
  state: AccessControlState,
  subjectId: SubjectId,
  resourceId: ResourceId,
  permission: Permission,
): { success: true } | { success: false; error: AccessError } {
  if (!state.subjects.has(subjectId)) return { success: false, error: 'subject-not-found' };
  const key = resourcePermKey(subjectId, resourceId);
  let perms = state.resourcePerms.get(key);
  if (perms === undefined) {
    perms = new Set();
    state.resourcePerms.set(key, perms);
  }
  perms.add(permission);
  return { success: true };
}

function revokeResourcePermissionImpl(
  state: AccessControlState,
  subjectId: SubjectId,
  resourceId: ResourceId,
  permission: Permission,
): { success: true } | { success: false; error: AccessError } {
  if (!state.subjects.has(subjectId)) return { success: false, error: 'subject-not-found' };
  const key = resourcePermKey(subjectId, resourceId);
  const perms = state.resourcePerms.get(key);
  if (perms === undefined || !perms.has(permission)) {
    return { success: false, error: 'resource-not-found' };
  }
  perms.delete(permission);
  return { success: true };
}

// ─── List Roles ───────────────────────────────────────────────────────────────

function listRolesImpl(state: AccessControlState): ReadonlyArray<Role> {
  const result: Role[] = [];
  for (const role of state.roles.values()) {
    const r = toReadonlyRole(role);
    if (r !== undefined) result.push(r);
  }
  return result;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resourcePermKey(subjectId: SubjectId, resourceId: ResourceId): string {
  return subjectId + '::' + resourceId;
}

function buildCheck(
  subjectId: SubjectId,
  resourceId: ResourceId,
  permission: Permission,
  granted: boolean,
  reason: string,
  checkedAt: bigint,
): AccessCheck {
  return { subjectId, resourceId, permission, granted, reason, checkedAt };
}

function toReadonlyRole(role: MutableRole | undefined): Role | undefined {
  if (role === undefined) return undefined;
  return {
    roleId: role.roleId,
    name: role.name,
    permissions: new Set(role.permissions) as ReadonlySet<Permission>,
    inheritsFrom: role.inheritsFrom,
    createdAt: role.createdAt,
  };
}

function toReadonlySubject(subject: MutableSubject | undefined): AccessSubject | undefined {
  if (subject === undefined) return undefined;
  return {
    subjectId: subject.subjectId,
    roles: [...subject.roles],
    createdAt: subject.createdAt,
  };
}
