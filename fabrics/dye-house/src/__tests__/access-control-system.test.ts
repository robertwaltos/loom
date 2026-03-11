import { describe, it, expect } from 'vitest';
import { createAccessControlSystem } from '../access-control-system.js';
import type { AccessControlSystem } from '../access-control-system.js';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

let idCounter = 0;

function createTestSystem(): AccessControlSystem {
  return createAccessControlSystem({
    clock: { nowMicroseconds: () => BigInt(Date.now()) * 1000n },
    idGen: { next: () => 'id-' + String(++idCounter) },
    logger: { info: () => undefined, warn: () => undefined },
  });
}

// ─── registerSubject ─────────────────────────────────────────────────────────

describe('registerSubject', () => {
  it('registers a new subject', () => {
    const sys = createTestSystem();
    const r = sys.registerSubject('user-1');
    expect(r).toEqual({ success: true });
  });

  it('returns already-exists for duplicate subjectId', () => {
    const sys = createTestSystem();
    sys.registerSubject('user-1');
    const r = sys.registerSubject('user-1');
    expect(r).toEqual({ success: false, error: 'already-exists' });
  });

  it('getSubject returns registered subject', () => {
    const sys = createTestSystem();
    sys.registerSubject('user-1');
    const s = sys.getSubject('user-1');
    expect(s?.subjectId).toBe('user-1');
    expect(s?.roles).toEqual([]);
  });

  it('getSubject returns undefined for unknown subject', () => {
    const sys = createTestSystem();
    expect(sys.getSubject('ghost')).toBeUndefined();
  });
});

// ─── createRole ──────────────────────────────────────────────────────────────

describe('createRole', () => {
  it('creates a role with the given permissions', () => {
    const sys = createTestSystem();
    const role = sys.createRole('admin', ['READ', 'WRITE', 'DELETE'], null);
    expect(typeof role).not.toBe('string');
    if (typeof role === 'string') return;
    expect(role.name).toBe('admin');
    expect(role.permissions.has('READ')).toBe(true);
    expect(role.inheritsFrom).toBeNull();
  });

  it('returns already-exists for duplicate role name', () => {
    const sys = createTestSystem();
    sys.createRole('editor', ['READ', 'WRITE'], null);
    const r = sys.createRole('editor', ['READ'], null);
    expect(r).toBe('already-exists');
  });

  it('returns role-not-found when inheritsFrom is unknown', () => {
    const sys = createTestSystem();
    const r = sys.createRole('child', ['READ'], 'nonexistent-role');
    expect(r).toBe('role-not-found');
  });

  it('creates role with valid inheritsFrom', () => {
    const sys = createTestSystem();
    const parent = sys.createRole('parent', ['READ'], null);
    if (typeof parent === 'string') throw new Error('expected role');
    const child = sys.createRole('child', ['WRITE'], parent.roleId);
    if (typeof child === 'string') throw new Error('expected role');
    expect(child.inheritsFrom).toBe(parent.roleId);
  });

  it('listRoles returns all created roles', () => {
    const sys = createTestSystem();
    sys.createRole('r1', ['READ'], null);
    sys.createRole('r2', ['WRITE'], null);
    expect(sys.listRoles().length).toBe(2);
  });
});

// ─── assignRole / revokeRole ─────────────────────────────────────────────────

describe('assignRole', () => {
  it('assigns a role to a subject', () => {
    const sys = createTestSystem();
    sys.registerSubject('user-1');
    const role = sys.createRole('viewer', ['READ'], null);
    if (typeof role === 'string') throw new Error('expected role');
    const r = sys.assignRole('user-1', role.roleId);
    expect(r).toEqual({ success: true });
    expect(sys.getSubject('user-1')?.roles).toContain(role.roleId);
  });

  it('returns subject-not-found when subject not registered', () => {
    const sys = createTestSystem();
    const role = sys.createRole('viewer', ['READ'], null);
    if (typeof role === 'string') throw new Error('expected role');
    expect(sys.assignRole('ghost', role.roleId)).toEqual({
      success: false,
      error: 'subject-not-found',
    });
  });

  it('returns role-not-found for unknown roleId', () => {
    const sys = createTestSystem();
    sys.registerSubject('user-1');
    expect(sys.assignRole('user-1', 'bad-role')).toEqual({
      success: false,
      error: 'role-not-found',
    });
  });

  it('returns role-assigned-already when role already assigned', () => {
    const sys = createTestSystem();
    sys.registerSubject('user-1');
    const role = sys.createRole('viewer', ['READ'], null);
    if (typeof role === 'string') throw new Error('expected role');
    sys.assignRole('user-1', role.roleId);
    expect(sys.assignRole('user-1', role.roleId)).toEqual({
      success: false,
      error: 'role-assigned-already',
    });
  });
});

describe('revokeRole', () => {
  it('revokes an assigned role', () => {
    const sys = createTestSystem();
    sys.registerSubject('user-1');
    const role = sys.createRole('viewer', ['READ'], null);
    if (typeof role === 'string') throw new Error('expected role');
    sys.assignRole('user-1', role.roleId);
    const r = sys.revokeRole('user-1', role.roleId);
    expect(r).toEqual({ success: true });
  });

  it('returns role-not-found when role not assigned', () => {
    const sys = createTestSystem();
    sys.registerSubject('user-1');
    const role = sys.createRole('viewer', ['READ'], null);
    if (typeof role === 'string') throw new Error('expected role');
    expect(sys.revokeRole('user-1', role.roleId)).toEqual({
      success: false,
      error: 'role-not-found',
    });
  });
});

// ─── checkAccess ─────────────────────────────────────────────────────────────

describe('checkAccess', () => {
  it('grants access via role permission', () => {
    const sys = createTestSystem();
    sys.registerSubject('user-1');
    const role = sys.createRole('reader', ['READ'], null);
    if (typeof role === 'string') throw new Error('expected role');
    sys.assignRole('user-1', role.roleId);
    const check = sys.checkAccess('user-1', 'res-1', 'READ');
    expect(check.granted).toBe(true);
    expect(check.reason).toBe('role');
  });

  it('denies access when permission not in role', () => {
    const sys = createTestSystem();
    sys.registerSubject('user-1');
    const role = sys.createRole('reader', ['READ'], null);
    if (typeof role === 'string') throw new Error('expected role');
    sys.assignRole('user-1', role.roleId);
    const check = sys.checkAccess('user-1', 'res-1', 'DELETE');
    expect(check.granted).toBe(false);
    expect(check.reason).toBe('denied');
  });

  it('denies access for unregistered subject', () => {
    const sys = createTestSystem();
    const check = sys.checkAccess('ghost', 'res-1', 'READ');
    expect(check.granted).toBe(false);
  });

  it('grants access via inherited parent role permission', () => {
    const sys = createTestSystem();
    sys.registerSubject('user-1');
    const parent = sys.createRole('parent', ['ADMIN'], null);
    if (typeof parent === 'string') throw new Error('expected role');
    const child = sys.createRole('child', ['READ'], parent.roleId);
    if (typeof child === 'string') throw new Error('expected role');
    sys.assignRole('user-1', child.roleId);
    const check = sys.checkAccess('user-1', 'res-1', 'ADMIN');
    expect(check.granted).toBe(true);
    expect(check.reason).toBe('role');
  });

  it('grants access via direct resource permission', () => {
    const sys = createTestSystem();
    sys.registerSubject('user-1');
    sys.grantResourcePermission('user-1', 'res-special', 'EXECUTE');
    const check = sys.checkAccess('user-1', 'res-special', 'EXECUTE');
    expect(check.granted).toBe(true);
    expect(check.reason).toBe('resource-grant');
  });
});

// ─── resource permissions ─────────────────────────────────────────────────────

describe('grantResourcePermission / revokeResourcePermission', () => {
  it('grants and then revokes resource permission', () => {
    const sys = createTestSystem();
    sys.registerSubject('user-1');
    sys.grantResourcePermission('user-1', 'res-1', 'WRITE');
    const before = sys.checkAccess('user-1', 'res-1', 'WRITE');
    expect(before.granted).toBe(true);

    sys.revokeResourcePermission('user-1', 'res-1', 'WRITE');
    const after = sys.checkAccess('user-1', 'res-1', 'WRITE');
    expect(after.granted).toBe(false);
  });

  it('returns subject-not-found when granting for unknown subject', () => {
    const sys = createTestSystem();
    const r = sys.grantResourcePermission('ghost', 'res-1', 'READ');
    expect(r).toEqual({ success: false, error: 'subject-not-found' });
  });

  it('returns resource-not-found when revoking non-granted permission', () => {
    const sys = createTestSystem();
    sys.registerSubject('user-1');
    const r = sys.revokeResourcePermission('user-1', 'res-1', 'READ');
    expect(r).toEqual({ success: false, error: 'resource-not-found' });
  });
});
