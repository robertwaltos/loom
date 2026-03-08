import { describe, it, expect } from 'vitest';
import { createSurveyRoster } from '../survey-roster.js';
import type { SurveyRosterDeps } from '../survey-roster.js';

function makeDeps(): SurveyRosterDeps {
  let time = 1_000_000;
  let idCounter = 0;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: { next: () => 'mem-' + String(++idCounter) },
  };
}

describe('SurveyRoster — enroll and retrieve', () => {
  it('enrolls a member', () => {
    const roster = createSurveyRoster(makeDeps());
    const member = roster.enroll({ dynastyId: 'dyn-1', specialisation: 'navigation' });
    expect(member.memberId).toBe('mem-1');
    expect(member.status).toBe('active');
    expect(member.missionsCompleted).toBe(0);
  });

  it('retrieves member by id', () => {
    const roster = createSurveyRoster(makeDeps());
    const member = roster.enroll({ dynastyId: 'dyn-1', specialisation: 'geology' });
    expect(roster.getMember(member.memberId)?.dynastyId).toBe('dyn-1');
  });

  it('retrieves member by dynasty', () => {
    const roster = createSurveyRoster(makeDeps());
    roster.enroll({ dynastyId: 'dyn-1', specialisation: 'cartography' });
    expect(roster.getByDynasty('dyn-1')?.specialisation).toBe('cartography');
  });

  it('returns undefined for unknown member', () => {
    const roster = createSurveyRoster(makeDeps());
    expect(roster.getMember('missing')).toBeUndefined();
    expect(roster.getByDynasty('missing')).toBeUndefined();
  });
});

describe('SurveyRoster — deployment lifecycle', () => {
  it('deploys an active member', () => {
    const roster = createSurveyRoster(makeDeps());
    const member = roster.enroll({ dynastyId: 'dyn-1', specialisation: 'navigation' });
    expect(roster.deploy(member.memberId)).toBe(true);
    expect(roster.getMember(member.memberId)?.status).toBe('deployed');
  });

  it('cannot deploy already-deployed member', () => {
    const roster = createSurveyRoster(makeDeps());
    const member = roster.enroll({ dynastyId: 'dyn-1', specialisation: 'navigation' });
    roster.deploy(member.memberId);
    expect(roster.deploy(member.memberId)).toBe(false);
  });

  it('recalls a deployed member', () => {
    const roster = createSurveyRoster(makeDeps());
    const member = roster.enroll({ dynastyId: 'dyn-1', specialisation: 'navigation' });
    roster.deploy(member.memberId);
    expect(roster.recall(member.memberId)).toBe(true);
    expect(roster.getMember(member.memberId)?.status).toBe('active');
  });

  it('completes a mission', () => {
    const roster = createSurveyRoster(makeDeps());
    const member = roster.enroll({ dynastyId: 'dyn-1', specialisation: 'engineering' });
    roster.deploy(member.memberId);
    expect(roster.completeMission(member.memberId)).toBe(true);
    const updated = roster.getMember(member.memberId);
    expect(updated?.status).toBe('active');
    expect(updated?.missionsCompleted).toBe(1);
  });

  it('cannot complete mission for non-deployed member', () => {
    const roster = createSurveyRoster(makeDeps());
    const member = roster.enroll({ dynastyId: 'dyn-1', specialisation: 'navigation' });
    expect(roster.completeMission(member.memberId)).toBe(false);
  });
});

describe('SurveyRoster — deactivate and reactivate', () => {
  it('deactivates a member', () => {
    const roster = createSurveyRoster(makeDeps());
    const member = roster.enroll({ dynastyId: 'dyn-1', specialisation: 'xenobiology' });
    expect(roster.deactivate(member.memberId)).toBe(true);
    expect(roster.getMember(member.memberId)?.status).toBe('inactive');
  });

  it('cannot deactivate already inactive member', () => {
    const roster = createSurveyRoster(makeDeps());
    const member = roster.enroll({ dynastyId: 'dyn-1', specialisation: 'navigation' });
    roster.deactivate(member.memberId);
    expect(roster.deactivate(member.memberId)).toBe(false);
  });

  it('reactivates an inactive member', () => {
    const roster = createSurveyRoster(makeDeps());
    const member = roster.enroll({ dynastyId: 'dyn-1', specialisation: 'navigation' });
    roster.deactivate(member.memberId);
    expect(roster.reactivate(member.memberId)).toBe(true);
    expect(roster.getMember(member.memberId)?.status).toBe('active');
  });
});

describe('SurveyRoster — list and stats', () => {
  it('lists by status', () => {
    const roster = createSurveyRoster(makeDeps());
    roster.enroll({ dynastyId: 'dyn-1', specialisation: 'navigation' });
    const m2 = roster.enroll({ dynastyId: 'dyn-2', specialisation: 'geology' });
    roster.deploy(m2.memberId);
    expect(roster.listByStatus('active')).toHaveLength(1);
    expect(roster.listByStatus('deployed')).toHaveLength(1);
  });

  it('tracks stats', () => {
    const roster = createSurveyRoster(makeDeps());
    roster.enroll({ dynastyId: 'dyn-1', specialisation: 'navigation' });
    const m2 = roster.enroll({ dynastyId: 'dyn-2', specialisation: 'geology' });
    roster.deploy(m2.memberId);
    const stats = roster.getStats();
    expect(stats.totalMembers).toBe(2);
    expect(stats.activeMembers).toBe(1);
    expect(stats.deployedMembers).toBe(1);
  });

  it('starts with zero stats', () => {
    const roster = createSurveyRoster(makeDeps());
    const stats = roster.getStats();
    expect(stats.totalMembers).toBe(0);
  });
});
