import { describe, it, expect } from 'vitest';
import { createDynastyAllianceService } from '../dynasty-alliance.js';
import type { DynastyAllianceDeps } from '../dynasty-alliance.js';

function createDeps(startTime = 10_000): DynastyAllianceDeps {
  let t = startTime;
  let id = 0;
  return {
    clock: { nowMicroseconds: () => t++ },
    idGenerator: { next: () => `al-${String(id++)}` },
  };
}

describe('Dynasty alliance simulation scenarios', () => {
  it('builds a small alliance network with expected visibility', () => {
    const svc = createDynastyAllianceService(createDeps());

    const a = svc.propose({ proposerId: 'd1', targetId: 'd2' });
    const b = svc.propose({ proposerId: 'd2', targetId: 'd3' });
    const c = svc.propose({ proposerId: 'd4', targetId: 'd5' });
    svc.accept(a.allianceId);
    svc.accept(b.allianceId);
    svc.accept(c.allianceId);

    expect(svc.getAlliances('d2')).toHaveLength(2);
    expect(svc.getAlliances('d4')).toHaveLength(1);
    expect(svc.areAllied('d1', 'd2')).toBe(true);
    expect(svc.areAllied('d2', 'd3')).toBe(true);
    expect(svc.areAllied('d1', 'd3')).toBe(false);
  });

  it('treats alliance relation as symmetric for active pairs', () => {
    const svc = createDynastyAllianceService(createDeps());

    const a = svc.propose({ proposerId: 'alpha', targetId: 'beta' });
    svc.accept(a.allianceId);

    expect(svc.areAllied('alpha', 'beta')).toBe(true);
    expect(svc.areAllied('beta', 'alpha')).toBe(true);
  });

  it('does not consider proposed alliances as active relationships', () => {
    const svc = createDynastyAllianceService(createDeps());

    svc.propose({ proposerId: 'alpha', targetId: 'beta' });

    expect(svc.areAllied('alpha', 'beta')).toBe(false);
  });

  it('removes allied relation immediately after dissolution', () => {
    const svc = createDynastyAllianceService(createDeps());

    const a = svc.propose({ proposerId: 'd1', targetId: 'd2' });
    svc.accept(a.allianceId);
    expect(svc.areAllied('d1', 'd2')).toBe(true);

    const dissolved = svc.dissolve(a.allianceId);
    expect(dissolved).toBe(true);
    expect(svc.areAllied('d1', 'd2')).toBe(false);
  });

  it('records timeline fields in monotonic order for accepted alliances', () => {
    const svc = createDynastyAllianceService(createDeps(50_000));

    const a = svc.propose({ proposerId: 'd1', targetId: 'd2' });
    svc.accept(a.allianceId);
    svc.dissolve(a.allianceId);

    const final = svc.getAlliance(a.allianceId);
    expect(final).toBeDefined();
    expect(final!.proposedAt).toBeGreaterThan(0);
    expect(final!.formedAt).toBeGreaterThan(final!.proposedAt);
    expect(final!.dissolvedAt).toBeGreaterThan(final!.formedAt);
  });

  it('allows dissolving a proposed alliance before acceptance', () => {
    const svc = createDynastyAllianceService(createDeps());

    const a = svc.propose({ proposerId: 'd1', targetId: 'd2' });
    const dissolved = svc.dissolve(a.allianceId);

    expect(dissolved).toBe(true);
    expect(svc.getAlliance(a.allianceId)?.status).toBe('dissolved');
    expect(svc.accept(a.allianceId)).toBe(false);
  });

  it('keeps stats consistent through mixed lifecycle transitions', () => {
    const svc = createDynastyAllianceService(createDeps());

    const a1 = svc.propose({ proposerId: 'd1', targetId: 'd2' });
    const a2 = svc.propose({ proposerId: 'd3', targetId: 'd4' });
    const a3 = svc.propose({ proposerId: 'd5', targetId: 'd6' });
    svc.accept(a1.allianceId);
    svc.dissolve(a2.allianceId);

    const stats = svc.getStats();
    expect(stats.totalAlliances).toBe(3);
    expect(stats.activeAlliances).toBe(1);
    expect(stats.proposedAlliances).toBe(1);
    expect(stats.dissolvedAlliances).toBe(1);

    svc.accept(a3.allianceId);
    svc.dissolve(a1.allianceId);
    const next = svc.getStats();
    expect(next.totalAlliances).toBe(3);
    expect(next.activeAlliances).toBe(1);
    expect(next.proposedAlliances).toBe(0);
    expect(next.dissolvedAlliances).toBe(2);
  });

  it('isolates unknown-id operations from existing state', () => {
    const svc = createDynastyAllianceService(createDeps());

    const a = svc.propose({ proposerId: 'd1', targetId: 'd2' });
    svc.accept(a.allianceId);

    expect(svc.accept('missing')).toBe(false);
    expect(svc.dissolve('missing')).toBe(false);
    expect(svc.areAllied('d1', 'd2')).toBe(true);
  });

  it('keeps getAlliances scoped to participating dynasties only', () => {
    const svc = createDynastyAllianceService(createDeps());

    svc.propose({ proposerId: 'a', targetId: 'b' });
    svc.propose({ proposerId: 'b', targetId: 'c' });
    svc.propose({ proposerId: 'c', targetId: 'd' });

    expect(svc.getAlliances('b')).toHaveLength(2);
    expect(svc.getAlliances('x')).toHaveLength(0);
  });

  it('creates deterministic alliance ids under sequential proposals', () => {
    const svc = createDynastyAllianceService(createDeps());

    const first = svc.propose({ proposerId: 'd1', targetId: 'd2' });
    const second = svc.propose({ proposerId: 'd3', targetId: 'd4' });
    const third = svc.propose({ proposerId: 'd5', targetId: 'd6' });

    expect(first.allianceId).toBe('al-0');
    expect(second.allianceId).toBe('al-1');
    expect(third.allianceId).toBe('al-2');
  });
});
