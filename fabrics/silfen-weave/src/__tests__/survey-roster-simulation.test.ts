import { describe, expect, it } from 'vitest';
import { createSurveyRoster } from '../survey-roster.js';

function makeRoster() {
  let i = 0;
  let now = 1_000_000;
  return createSurveyRoster({
    clock: { nowMicroseconds: () => (now += 1_000_000) },
    idGenerator: { next: () => `mem-${++i}` },
  });
}

describe('survey-roster simulation', () => {
  it('manages member deployment cycle and status counters', () => {
    const roster = makeRoster();
    const m1 = roster.enroll({ dynastyId: 'd1', specialisation: 'navigation' });
    const m2 = roster.enroll({ dynastyId: 'd2', specialisation: 'geology' });

    roster.deploy(m1.memberId);
    roster.completeMission(m1.memberId);
    roster.deactivate(m2.memberId);

    const stats = roster.getStats();
    expect(stats.totalMembers).toBe(2);
    expect(stats.activeMembers).toBe(1);
    expect(stats.inactiveMembers).toBe(1);
    expect(roster.getMember(m1.memberId)?.missionsCompleted).toBe(1);
  });
});
