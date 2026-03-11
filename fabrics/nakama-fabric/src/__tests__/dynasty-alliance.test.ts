import { describe, it, expect } from 'vitest';
import { createDynastyAllianceService } from '../dynasty-alliance.js';
import type { DynastyAllianceDeps } from '../dynasty-alliance.js';

function createDeps(): DynastyAllianceDeps {
  let time = 1000;
  let id = 0;
  return {
    clock: { nowMicroseconds: () => time++ },
    idGenerator: { next: () => 'al-' + String(id++) },
  };
}

describe('DynastyAllianceService — propose', () => {
  it('creates a proposed alliance', () => {
    const svc = createDynastyAllianceService(createDeps());
    const a = svc.propose({ proposerId: 'd-1', targetId: 'd-2' });
    expect(a.allianceId).toBe('al-0');
    expect(a.status).toBe('proposed');
    expect(a.proposerId).toBe('d-1');
    expect(a.acceptorId).toBe('d-2');
    expect(a.formedAt).toBe(0);
  });

  it('retrieves an alliance by id', () => {
    const svc = createDynastyAllianceService(createDeps());
    const a = svc.propose({ proposerId: 'd-1', targetId: 'd-2' });
    expect(svc.getAlliance(a.allianceId)).toBeDefined();
  });

  it('returns undefined for unknown alliance', () => {
    const svc = createDynastyAllianceService(createDeps());
    expect(svc.getAlliance('nope')).toBeUndefined();
  });
});

describe('DynastyAllianceService — accept / dissolve', () => {
  it('accepts a proposed alliance', () => {
    const svc = createDynastyAllianceService(createDeps());
    const a = svc.propose({ proposerId: 'd-1', targetId: 'd-2' });
    expect(svc.accept(a.allianceId)).toBe(true);
    expect(svc.getAlliance(a.allianceId)?.status).toBe('active');
    expect(svc.getAlliance(a.allianceId)?.formedAt).toBeGreaterThan(0);
  });

  it('cannot accept an already active alliance', () => {
    const svc = createDynastyAllianceService(createDeps());
    const a = svc.propose({ proposerId: 'd-1', targetId: 'd-2' });
    svc.accept(a.allianceId);
    expect(svc.accept(a.allianceId)).toBe(false);
  });

  it('dissolves an active alliance', () => {
    const svc = createDynastyAllianceService(createDeps());
    const a = svc.propose({ proposerId: 'd-1', targetId: 'd-2' });
    svc.accept(a.allianceId);
    expect(svc.dissolve(a.allianceId)).toBe(true);
    expect(svc.getAlliance(a.allianceId)?.status).toBe('dissolved');
  });

  it('cannot dissolve an already dissolved alliance', () => {
    const svc = createDynastyAllianceService(createDeps());
    const a = svc.propose({ proposerId: 'd-1', targetId: 'd-2' });
    svc.dissolve(a.allianceId);
    expect(svc.dissolve(a.allianceId)).toBe(false);
  });
});

describe('DynastyAllianceService — getAlliances / areAllied', () => {
  it('lists all alliances for a dynasty', () => {
    const svc = createDynastyAllianceService(createDeps());
    svc.propose({ proposerId: 'd-1', targetId: 'd-2' });
    svc.propose({ proposerId: 'd-3', targetId: 'd-1' });
    expect(svc.getAlliances('d-1')).toHaveLength(2);
  });

  it('detects active alliance between two dynasties', () => {
    const svc = createDynastyAllianceService(createDeps());
    const a = svc.propose({ proposerId: 'd-1', targetId: 'd-2' });
    svc.accept(a.allianceId);
    expect(svc.areAllied('d-1', 'd-2')).toBe(true);
    expect(svc.areAllied('d-2', 'd-1')).toBe(true);
  });

  it('returns false when not allied', () => {
    const svc = createDynastyAllianceService(createDeps());
    svc.propose({ proposerId: 'd-1', targetId: 'd-2' });
    expect(svc.areAllied('d-1', 'd-2')).toBe(false);
  });
});

describe('DynastyAllianceService — getStats', () => {
  it('reports alliance statistics', () => {
    const svc = createDynastyAllianceService(createDeps());
    const a1 = svc.propose({ proposerId: 'd-1', targetId: 'd-2' });
    svc.accept(a1.allianceId);
    svc.propose({ proposerId: 'd-3', targetId: 'd-4' });
    const a3 = svc.propose({ proposerId: 'd-5', targetId: 'd-6' });
    svc.dissolve(a3.allianceId);

    const stats = svc.getStats();
    expect(stats.totalAlliances).toBe(3);
    expect(stats.activeAlliances).toBe(1);
    expect(stats.proposedAlliances).toBe(1);
    expect(stats.dissolvedAlliances).toBe(1);
  });
});
