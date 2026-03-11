import { describe, it, expect, beforeEach } from 'vitest';
import {
  createNpcFactionAI,
  LOYALTY_MIN,
  LOYALTY_MAX,
  LOYALTY_COMPLY_THRESHOLD,
  RECRUITMENT_BASE_CHANCE,
} from '../npc-faction-ai.js';
import type {
  NpcFactionAI,
  NpcFactionAIDeps,
  PatrolRoute,
  FactionEvent,
} from '../npc-faction-ai.js';

function createDeps(): NpcFactionAIDeps {
  let time = 1000;
  let id = 0;
  return {
    clock: { nowMicroseconds: () => time++ },
    idGenerator: { generate: () => 'fai-' + String(id++) },
  };
}

describe('NpcFactionAI — member management', () => {
  let ai: NpcFactionAI;

  beforeEach(() => {
    ai = createNpcFactionAI(createDeps());
  });

  it('adds a member to a faction', () => {
    const member = ai.addMember('npc-1', 'ascendancy', 'soldier');
    expect(member.npcId).toBe('npc-1');
    expect(member.factionId).toBe('ascendancy');
    expect(member.role).toBe('soldier');
    expect(member.loyalty).toBe(50);
  });

  it('retrieves a member', () => {
    ai.addMember('npc-1', 'ascendancy', 'diplomat');
    const m = ai.getMember('npc-1');
    expect(m).toBeDefined();
    expect(m?.role).toBe('diplomat');
  });

  it('returns undefined for unknown member', () => {
    expect(ai.getMember('ghost')).toBeUndefined();
  });

  it('removes a member', () => {
    ai.addMember('npc-1', 'ascendancy', 'scout');
    expect(ai.removeMember('npc-1')).toBe(true);
    expect(ai.getMember('npc-1')).toBeUndefined();
  });

  it('lists members by faction', () => {
    ai.addMember('npc-1', 'ascendancy', 'soldier');
    ai.addMember('npc-2', 'ascendancy', 'diplomat');
    ai.addMember('npc-3', 'foundation', 'leader');
    expect(ai.getMembersByFaction('ascendancy')).toHaveLength(2);
    expect(ai.getMembersByFaction('foundation')).toHaveLength(1);
  });
});

describe('NpcFactionAI — loyalty', () => {
  let ai: NpcFactionAI;

  beforeEach(() => {
    ai = createNpcFactionAI(createDeps());
  });

  it('adjusts loyalty up', () => {
    ai.addMember('npc-1', 'ascendancy', 'soldier');
    const loyalty = ai.adjustLoyalty('npc-1', 20);
    expect(loyalty).toBe(70);
  });

  it('adjusts loyalty down', () => {
    ai.addMember('npc-1', 'ascendancy', 'soldier');
    const loyalty = ai.adjustLoyalty('npc-1', -30);
    expect(loyalty).toBe(20);
  });

  it('clamps loyalty to max', () => {
    ai.addMember('npc-1', 'ascendancy', 'soldier');
    const loyalty = ai.adjustLoyalty('npc-1', 200);
    expect(loyalty).toBe(LOYALTY_MAX);
  });

  it('clamps loyalty to min', () => {
    ai.addMember('npc-1', 'ascendancy', 'soldier');
    const loyalty = ai.adjustLoyalty('npc-1', -200);
    expect(loyalty).toBe(LOYALTY_MIN);
  });

  it('returns zero for unknown npc', () => {
    expect(ai.adjustLoyalty('ghost', 10)).toBe(0);
  });

  it('evaluates loyalty compliance above threshold', () => {
    ai.addMember('npc-1', 'ascendancy', 'soldier');
    const decision = ai.evaluateLoyalty('npc-1', 'patrol_border');
    expect(decision).toBeDefined();
    expect(decision?.willComply).toBe(true);
  });

  it('evaluates loyalty refusal below threshold', () => {
    ai.addMember('npc-1', 'ascendancy', 'soldier');
    ai.adjustLoyalty('npc-1', -30);
    const decision = ai.evaluateLoyalty('npc-1', 'sacrifice_mission');
    expect(decision?.willComply).toBe(false);
  });

  it('returns undefined for unknown npc loyalty eval', () => {
    expect(ai.evaluateLoyalty('ghost', 'anything')).toBeUndefined();
  });
});

describe('NpcFactionAI — patrol route registration', () => {
  let ai: NpcFactionAI;

  beforeEach(() => {
    ai = createNpcFactionAI(createDeps());
  });

  it('adds a patrol route', () => {
    const route: PatrolRoute = {
      routeId: 'pr-1',
      factionId: 'ascendancy',
      waypoints: ['gate', 'tower', 'wall'],
      priority: 5,
    };
    expect(ai.addPatrolRoute(route)).toBe(true);
    expect(ai.getPatrolRoute('pr-1')).toBeDefined();
  });

  it('rejects duplicate route ids', () => {
    const route: PatrolRoute = {
      routeId: 'pr-1',
      factionId: 'ascendancy',
      waypoints: ['gate'],
      priority: 1,
    };
    ai.addPatrolRoute(route);
    expect(ai.addPatrolRoute(route)).toBe(false);
  });

  it('lists patrol routes for a faction', () => {
    ai.addPatrolRoute({ routeId: 'pr-1', factionId: 'ascendancy', waypoints: ['a'], priority: 1 });
    ai.addPatrolRoute({ routeId: 'pr-2', factionId: 'ascendancy', waypoints: ['b'], priority: 2 });
    ai.addPatrolRoute({ routeId: 'pr-3', factionId: 'foundation', waypoints: ['c'], priority: 1 });
    expect(ai.getPatrolRoutesForFaction('ascendancy')).toHaveLength(2);
  });

  it('fails to assign patrol to non-member', () => {
    ai.addPatrolRoute({ routeId: 'pr-1', factionId: 'ascendancy', waypoints: ['a'], priority: 1 });
    expect(ai.assignPatrol('ghost', 'pr-1')).toBeUndefined();
  });
});

describe('NpcFactionAI — patrol assignments', () => {
  let ai: NpcFactionAI;

  beforeEach(() => {
    ai = createNpcFactionAI(createDeps());
  });

  it('assigns patrol to a member', () => {
    ai.addMember('npc-1', 'ascendancy', 'soldier');
    ai.addPatrolRoute({
      routeId: 'pr-1',
      factionId: 'ascendancy',
      waypoints: ['a', 'b', 'c'],
      priority: 1,
    });
    const assignment = ai.assignPatrol('npc-1', 'pr-1');
    expect(assignment).toBeDefined();
    expect(assignment?.status).toBe('patrolling');
    expect(assignment?.currentWaypointIndex).toBe(0);
  });

  it('advances patrol through waypoints', () => {
    ai.addMember('npc-1', 'ascendancy', 'soldier');
    ai.addPatrolRoute({
      routeId: 'pr-1',
      factionId: 'ascendancy',
      waypoints: ['a', 'b', 'c'],
      priority: 1,
    });
    const assignment = ai.assignPatrol('npc-1', 'pr-1');
    expect(assignment).toBeDefined();
    const advanced = ai.advancePatrol(assignment?.assignmentId ?? '');
    expect(advanced?.currentWaypointIndex).toBe(1);
    expect(advanced?.status).toBe('patrolling');
  });

  it('transitions to returning at end of route', () => {
    ai.addMember('npc-1', 'ascendancy', 'soldier');
    ai.addPatrolRoute({
      routeId: 'pr-1',
      factionId: 'ascendancy',
      waypoints: ['a', 'b'],
      priority: 1,
    });
    const assignment = ai.assignPatrol('npc-1', 'pr-1');
    expect(assignment).toBeDefined();
    const assignId = assignment?.assignmentId ?? '';
    ai.advancePatrol(assignId);
    const final = ai.advancePatrol(assignId);
    expect(final?.status).toBe('returning');
  });
});

describe('NpcFactionAI — diplomacy', () => {
  let ai: NpcFactionAI;

  beforeEach(() => {
    ai = createNpcFactionAI(createDeps());
  });

  it('sets diplomacy stance between factions', () => {
    const rel = ai.setDiplomacy('ascendancy', 'foundation', 'cautious');
    expect(rel.stance).toBe('cautious');
    expect(rel.factionA).toBe('ascendancy');
  });

  it('retrieves diplomacy stance', () => {
    ai.setDiplomacy('ascendancy', 'foundation', 'friendly');
    expect(ai.getDiplomacy('ascendancy', 'foundation')).toBe('friendly');
  });

  it('returns neutral for unknown relations', () => {
    expect(ai.getDiplomacy('unknown-a', 'unknown-b')).toBe('neutral');
  });

  it('uses canonical key ordering', () => {
    ai.setDiplomacy('b-faction', 'a-faction', 'allied');
    expect(ai.getDiplomacy('a-faction', 'b-faction')).toBe('allied');
  });

  it('updates existing diplomacy relation', () => {
    ai.setDiplomacy('ascendancy', 'foundation', 'cautious');
    ai.setDiplomacy('ascendancy', 'foundation', 'hostile');
    expect(ai.getDiplomacy('ascendancy', 'foundation')).toBe('hostile');
  });
});

describe('NpcFactionAI — event responses', () => {
  let ai: NpcFactionAI;

  beforeEach(() => {
    ai = createNpcFactionAI(createDeps());
  });

  it('responds defend for high loyalty high severity', () => {
    ai.addMember('npc-1', 'ascendancy', 'soldier');
    ai.adjustLoyalty('npc-1', 30);
    const event: FactionEvent = {
      eventId: 'e1',
      factionId: 'ascendancy',
      eventType: 'invasion',
      severity: 9,
      location: 'border',
      occurredAt: 5000,
    };
    const response = ai.respondToEvent(event, 'npc-1');
    expect(response.responseType).toBe('defend');
  });

  it('responds ignore for low loyalty low severity', () => {
    ai.addMember('npc-1', 'ascendancy', 'soldier');
    ai.adjustLoyalty('npc-1', -30);
    const event: FactionEvent = {
      eventId: 'e1',
      factionId: 'ascendancy',
      eventType: 'minor_theft',
      severity: 2,
      location: 'market',
      occurredAt: 5000,
    };
    const response = ai.respondToEvent(event, 'npc-1');
    expect(response.responseType).toBe('ignore');
  });
});

describe('NpcFactionAI — recruitment', () => {
  let ai: NpcFactionAI;

  beforeEach(() => {
    ai = createNpcFactionAI(createDeps());
  });

  it('creates a recruitment attempt', () => {
    ai.addMember('npc-1', 'ascendancy', 'recruiter');
    const attempt = ai.attemptRecruitment('npc-1', 'npc-2');
    expect(attempt.recruiterId).toBe('npc-1');
    expect(attempt.targetNpcId).toBe('npc-2');
    expect(attempt.factionId).toBe('ascendancy');
    expect(typeof attempt.success).toBe('boolean');
  });
});

describe('NpcFactionAI — stats and constants', () => {
  it('reports AI statistics', () => {
    const ai = createNpcFactionAI(createDeps());
    ai.addMember('npc-1', 'ascendancy', 'soldier');
    ai.addPatrolRoute({ routeId: 'pr-1', factionId: 'ascendancy', waypoints: ['a'], priority: 1 });
    ai.setDiplomacy('ascendancy', 'foundation', 'neutral');
    const stats = ai.getStats();
    expect(stats.totalMembers).toBe(1);
    expect(stats.totalPatrolRoutes).toBe(1);
    expect(stats.totalDiplomacyRelations).toBe(1);
  });

  it('exports loyalty constants', () => {
    expect(LOYALTY_MIN).toBe(0);
    expect(LOYALTY_MAX).toBe(100);
    expect(LOYALTY_COMPLY_THRESHOLD).toBe(30);
  });

  it('exports recruitment constant', () => {
    expect(RECRUITMENT_BASE_CHANCE).toBe(0.5);
  });
});
