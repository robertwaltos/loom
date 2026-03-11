import { describe, it, expect } from 'vitest';
import { createRbacEngine } from '../rbac-engine.js';
import type { RbacEngine } from '../rbac-engine.js';

// ─── Helpers ────────────────────────────────────────────────────────

function createTestEngine(): { engine: RbacEngine } {
  const engine = createRbacEngine({
    clock: { nowMilliseconds: () => 1000 },
  });
  return { engine };
}

// ─── Built-in Roles ─────────────────────────────────────────────────

describe('RbacEngine built-in roles', () => {
  it('has 5 built-in roles', () => {
    const { engine } = createTestEngine();
    const roles = engine.listRoles();
    expect(roles.length).toBeGreaterThanOrEqual(5);
  });

  it('includes citizen role', () => {
    const { engine } = createTestEngine();
    const role = engine.getRole('citizen');
    expect(role).toBeDefined();
    expect(role?.roleId).toBe('citizen');
  });

  it('includes system role', () => {
    const { engine } = createTestEngine();
    const role = engine.getRole('system');
    expect(role).toBeDefined();
  });

  it('cannot redefine built-in role', () => {
    const { engine } = createTestEngine();
    expect(() => {
      engine.defineRole({
        roleId: 'citizen',
        description: 'hacked',
        permissions: [],
        inheritsFrom: null,
      });
    }).toThrow('Cannot redefine builtin role');
  });

  it('cannot remove built-in role', () => {
    const { engine } = createTestEngine();
    expect(() => engine.removeRole('citizen')).toThrow('Cannot remove builtin role');
  });
});

// ─── Custom Roles ───────────────────────────────────────────────────

describe('RbacEngine custom roles', () => {
  it('defines a custom role', () => {
    const { engine } = createTestEngine();
    engine.defineRole({
      roleId: 'surveyor',
      description: 'Survey Corps member',
      permissions: [{ permission: 'execute', resource: 'survey:*', scope: 'world' }],
      inheritsFrom: 'citizen',
    });
    expect(engine.getRole('surveyor')).toBeDefined();
  });

  it('removes a custom role', () => {
    const { engine } = createTestEngine();
    engine.defineRole({
      roleId: 'temp',
      description: 'Temporary',
      permissions: [],
      inheritsFrom: null,
    });
    expect(engine.removeRole('temp')).toBe(true);
    expect(engine.getRole('temp')).toBeUndefined();
  });

  it('returns false removing nonexistent role', () => {
    const { engine } = createTestEngine();
    expect(engine.removeRole('nonexistent')).toBe(false);
  });
});

// ─── Assignment ─────────────────────────────────────────────────────

describe('RbacEngine assignment', () => {
  it('assigns a role to a principal', () => {
    const { engine } = createTestEngine();
    const assignment = engine.assignRole('dyn-1', 'citizen');
    expect(assignment.principalId).toBe('dyn-1');
    expect(assignment.roleId).toBe('citizen');
  });

  it('lists roles for a principal', () => {
    const { engine } = createTestEngine();
    engine.assignRole('dyn-1', 'citizen');
    engine.assignRole('dyn-1', 'elder');
    const roles = engine.getRolesForPrincipal('dyn-1');
    expect(roles).toHaveLength(2);
  });

  it('revokes a role from a principal', () => {
    const { engine } = createTestEngine();
    engine.assignRole('dyn-1', 'citizen');
    expect(engine.revokeRole('dyn-1', 'citizen')).toBe(true);
    expect(engine.getRolesForPrincipal('dyn-1')).toHaveLength(0);
  });

  it('returns false revoking unassigned role', () => {
    const { engine } = createTestEngine();
    expect(engine.revokeRole('dyn-1', 'citizen')).toBe(false);
  });

  it('throws assigning nonexistent role', () => {
    const { engine } = createTestEngine();
    expect(() => engine.assignRole('dyn-1', 'nonexistent')).toThrow('Role not found');
  });
});

// ─── Permission Checks ──────────────────────────────────────────────

describe('RbacEngine permission checks', () => {
  it('allows read for citizen on any resource', () => {
    const { engine } = createTestEngine();
    engine.assignRole('dyn-1', 'citizen');
    const result = engine.checkPermission('dyn-1', 'read', 'world:alpha');
    expect(result.allowed).toBe(true);
  });

  it('denies write for citizen', () => {
    const { engine } = createTestEngine();
    engine.assignRole('dyn-1', 'citizen');
    const result = engine.checkPermission('dyn-1', 'write', 'world:alpha');
    expect(result.allowed).toBe(false);
  });

  it('denies unassigned principal', () => {
    const { engine } = createTestEngine();
    const result = engine.checkPermission('dyn-99', 'read', 'world:alpha');
    expect(result.allowed).toBe(false);
  });

  it('allows admin for administrator role', () => {
    const { engine } = createTestEngine();
    engine.assignRole('dyn-1', 'administrator');
    const result = engine.checkPermission('dyn-1', 'admin', 'anything');
    expect(result.allowed).toBe(true);
  });

  it('system role has all permissions', () => {
    const { engine } = createTestEngine();
    engine.assignRole('dyn-1', 'system');
    expect(engine.checkPermission('dyn-1', 'read', 'x').allowed).toBe(true);
    expect(engine.checkPermission('dyn-1', 'write', 'x').allowed).toBe(true);
    expect(engine.checkPermission('dyn-1', 'execute', 'x').allowed).toBe(true);
    expect(engine.checkPermission('dyn-1', 'admin', 'x').allowed).toBe(true);
  });
});

// ─── Role Hierarchy ─────────────────────────────────────────────────

describe('RbacEngine role hierarchy', () => {
  it('elder inherits citizen read permission', () => {
    const { engine } = createTestEngine();
    engine.assignRole('dyn-1', 'elder');
    const result = engine.checkPermission('dyn-1', 'read', 'world:alpha');
    expect(result.allowed).toBe(true);
  });

  it('architect inherits elder governance write', () => {
    const { engine } = createTestEngine();
    engine.assignRole('dyn-1', 'architect');
    const result = engine.checkPermission('dyn-1', 'write', 'governance:vote');
    expect(result.allowed).toBe(true);
  });

  it('custom role inherits from parent', () => {
    const { engine } = createTestEngine();
    engine.defineRole({
      roleId: 'surveyor',
      description: 'Surveyor',
      permissions: [{ permission: 'execute', resource: 'survey:*', scope: 'world' }],
      inheritsFrom: 'citizen',
    });
    engine.assignRole('dyn-1', 'surveyor');
    expect(engine.checkPermission('dyn-1', 'read', 'any').allowed).toBe(true);
    expect(engine.checkPermission('dyn-1', 'execute', 'survey:alpha').allowed).toBe(true);
  });
});

// ─── Effective Permissions ──────────────────────────────────────────

describe('RbacEngine effective permissions', () => {
  it('returns all effective permissions for a principal', () => {
    const { engine } = createTestEngine();
    engine.assignRole('dyn-1', 'elder');
    const perms = engine.getEffectivePermissions('dyn-1');
    expect(perms.length).toBeGreaterThanOrEqual(2);
  });

  it('returns empty for unassigned principal', () => {
    const { engine } = createTestEngine();
    expect(engine.getEffectivePermissions('unknown')).toHaveLength(0);
  });
});

// ─── Audit Trail ────────────────────────────────────────────────────

describe('RbacEngine audit trail', () => {
  it('records permission checks in audit', () => {
    const { engine } = createTestEngine();
    engine.assignRole('dyn-1', 'citizen');
    engine.checkPermission('dyn-1', 'read', 'world:alpha');
    const audit = engine.getAuditTrail(10);
    expect(audit).toHaveLength(1);
    expect(audit[0]?.allowed).toBe(true);
  });

  it('records denied checks in audit', () => {
    const { engine } = createTestEngine();
    engine.assignRole('dyn-1', 'citizen');
    engine.checkPermission('dyn-1', 'write', 'world:alpha');
    const audit = engine.getAuditTrail(10);
    expect(audit[0]?.allowed).toBe(false);
  });

  it('filters audit by principal', () => {
    const { engine } = createTestEngine();
    engine.assignRole('dyn-1', 'citizen');
    engine.assignRole('dyn-2', 'citizen');
    engine.checkPermission('dyn-1', 'read', 'a');
    engine.checkPermission('dyn-2', 'read', 'b');
    const audit = engine.getAuditForPrincipal('dyn-1', 10);
    expect(audit).toHaveLength(1);
  });
});

// ─── Stats ──────────────────────────────────────────────────────────

describe('RbacEngine stats', () => {
  it('tracks total checks and denials', () => {
    const { engine } = createTestEngine();
    engine.assignRole('dyn-1', 'citizen');
    engine.checkPermission('dyn-1', 'read', 'a');
    engine.checkPermission('dyn-1', 'write', 'a');
    const stats = engine.getStats();
    expect(stats.totalChecks).toBe(2);
    expect(stats.totalDenied).toBe(1);
  });

  it('counts roles and assignments', () => {
    const { engine } = createTestEngine();
    engine.assignRole('dyn-1', 'citizen');
    const stats = engine.getStats();
    expect(stats.totalRoles).toBeGreaterThanOrEqual(5);
    expect(stats.totalAssignments).toBe(1);
  });
});
