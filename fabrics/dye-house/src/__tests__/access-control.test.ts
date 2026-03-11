import { describe, it, expect } from 'vitest';
import { createAccessControlList } from '../access-control.js';
import type { AccessControlDeps } from '../access-control.js';

function makeDeps(): AccessControlDeps {
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
  };
}

describe('AccessControlList — roles', () => {
  it('creates a role', () => {
    const acl = createAccessControlList(makeDeps());
    const role = acl.createRole({
      roleId: 'admin',
      description: 'Full access',
      grants: [{ resource: '*', action: '*' }],
    });
    expect(role.roleId).toBe('admin');
    expect(role.grants).toHaveLength(1);
  });

  it('rejects duplicate role ids', () => {
    const acl = createAccessControlList(makeDeps());
    acl.createRole({ roleId: 'admin', description: '', grants: [] });
    expect(() => acl.createRole({ roleId: 'admin', description: '', grants: [] })).toThrow(
      'already exists',
    );
  });

  it('removes a role', () => {
    const acl = createAccessControlList(makeDeps());
    acl.createRole({ roleId: 'viewer', description: '', grants: [] });
    expect(acl.removeRole('viewer')).toBe(true);
    expect(acl.getRole('viewer')).toBeUndefined();
  });

  it('returns false for unknown role removal', () => {
    const acl = createAccessControlList(makeDeps());
    expect(acl.removeRole('unknown')).toBe(false);
  });

  it('lists all roles', () => {
    const acl = createAccessControlList(makeDeps());
    acl.createRole({ roleId: 'admin', description: '', grants: [] });
    acl.createRole({ roleId: 'viewer', description: '', grants: [] });
    expect(acl.listRoles()).toHaveLength(2);
  });
});

describe('AccessControlList — assignments', () => {
  it('assigns a role to a principal', () => {
    const acl = createAccessControlList(makeDeps());
    acl.createRole({ roleId: 'admin', description: '', grants: [] });
    const assignment = acl.assign('dyn-1', 'admin');
    expect(assignment.principalId).toBe('dyn-1');
    expect(assignment.roleId).toBe('admin');
    expect(assignment.assignedAt).toBeGreaterThan(0);
  });

  it('throws for unknown role assignment', () => {
    const acl = createAccessControlList(makeDeps());
    expect(() => acl.assign('dyn-1', 'unknown')).toThrow('not found');
  });

  it('revokes a role from a principal', () => {
    const acl = createAccessControlList(makeDeps());
    acl.createRole({ roleId: 'admin', description: '', grants: [] });
    acl.assign('dyn-1', 'admin');
    expect(acl.revoke('dyn-1', 'admin')).toBe(true);
  });

  it('returns false for unknown revocation', () => {
    const acl = createAccessControlList(makeDeps());
    expect(acl.revoke('dyn-1', 'admin')).toBe(false);
  });

  it('gets roles for a principal', () => {
    const acl = createAccessControlList(makeDeps());
    acl.createRole({ roleId: 'admin', description: 'Admin', grants: [] });
    acl.createRole({ roleId: 'viewer', description: 'Viewer', grants: [] });
    acl.assign('dyn-1', 'admin');
    acl.assign('dyn-1', 'viewer');
    const roles = acl.getRolesForPrincipal('dyn-1');
    expect(roles).toHaveLength(2);
  });

  it('returns empty for unknown principal', () => {
    const acl = createAccessControlList(makeDeps());
    expect(acl.getRolesForPrincipal('unknown')).toHaveLength(0);
  });
});

describe('AccessControlList — check', () => {
  it('allows access when role grants match', () => {
    const acl = createAccessControlList(makeDeps());
    acl.createRole({
      roleId: 'editor',
      description: '',
      grants: [{ resource: 'world:alpha', action: 'edit' }],
    });
    acl.assign('dyn-1', 'editor');
    const verdict = acl.check('dyn-1', 'world:alpha', 'edit');
    expect(verdict.allowed).toBe(true);
    expect(verdict.matchedRole).toBe('editor');
  });

  it('denies access when no role matches', () => {
    const acl = createAccessControlList(makeDeps());
    acl.createRole({
      roleId: 'viewer',
      description: '',
      grants: [{ resource: 'world:alpha', action: 'read' }],
    });
    acl.assign('dyn-1', 'viewer');
    const verdict = acl.check('dyn-1', 'world:alpha', 'delete');
    expect(verdict.allowed).toBe(false);
    expect(verdict.matchedRole).toBeNull();
  });

  it('denies access for unknown principal', () => {
    const acl = createAccessControlList(makeDeps());
    const verdict = acl.check('unknown', 'resource', 'action');
    expect(verdict.allowed).toBe(false);
  });

  it('supports wildcard resource grants', () => {
    const acl = createAccessControlList(makeDeps());
    acl.createRole({
      roleId: 'superadmin',
      description: '',
      grants: [{ resource: '*', action: 'manage' }],
    });
    acl.assign('dyn-1', 'superadmin');
    expect(acl.check('dyn-1', 'any-resource', 'manage').allowed).toBe(true);
  });

  it('supports wildcard action grants', () => {
    const acl = createAccessControlList(makeDeps());
    acl.createRole({
      roleId: 'world-admin',
      description: '',
      grants: [{ resource: 'world:alpha', action: '*' }],
    });
    acl.assign('dyn-1', 'world-admin');
    expect(acl.check('dyn-1', 'world:alpha', 'anything').allowed).toBe(true);
  });
});

describe('AccessControlList — role removal cascades', () => {
  it('removes role assignments when role deleted', () => {
    const acl = createAccessControlList(makeDeps());
    acl.createRole({ roleId: 'admin', description: '', grants: [] });
    acl.assign('dyn-1', 'admin');
    acl.removeRole('admin');
    expect(acl.getRolesForPrincipal('dyn-1')).toHaveLength(0);
  });
});

describe('AccessControlList — grants query', () => {
  it('gets all grants for a principal', () => {
    const acl = createAccessControlList(makeDeps());
    acl.createRole({
      roleId: 'editor',
      description: '',
      grants: [
        { resource: 'world:alpha', action: 'edit' },
        { resource: 'world:alpha', action: 'read' },
      ],
    });
    acl.createRole({
      roleId: 'trader',
      description: '',
      grants: [{ resource: 'market', action: 'trade' }],
    });
    acl.assign('dyn-1', 'editor');
    acl.assign('dyn-1', 'trader');

    const grants = acl.getGrantsForPrincipal('dyn-1');
    expect(grants).toHaveLength(3);
  });

  it('returns empty for unknown principal', () => {
    const acl = createAccessControlList(makeDeps());
    expect(acl.getGrantsForPrincipal('unknown')).toHaveLength(0);
  });
});

describe('AccessControlList — stats', () => {
  it('computes aggregate stats', () => {
    const acl = createAccessControlList(makeDeps());
    acl.createRole({
      roleId: 'admin',
      description: '',
      grants: [{ resource: '*', action: '*' }],
    });
    acl.createRole({
      roleId: 'viewer',
      description: '',
      grants: [
        { resource: 'world', action: 'read' },
        { resource: 'market', action: 'read' },
      ],
    });
    acl.assign('dyn-1', 'admin');
    acl.assign('dyn-2', 'viewer');

    const stats = acl.getStats();
    expect(stats.totalRoles).toBe(2);
    expect(stats.totalAssignments).toBe(2);
    expect(stats.totalGrants).toBe(3);
  });
});
