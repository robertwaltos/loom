/**
 * Survey Corps Flow — Integration test.
 *
 * Proves the vertical slice across Survey Corps systems:
 *
 *   1. Mission proposal and crew assignment
 *   2. Phase advancement through the mission lifecycle
 *   3. Reputation tracking based on mission outcomes
 *   4. Leaderboard and rank progression
 *
 * Uses real services: SurveyCorpsEngine, CorpsReputationService.
 * Mocks: clock, id generator, reward/unlock ports.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSurveyCorpsEngine } from '@loom/nakama-fabric';
import type { SurveyCorpsEngine, SurveyCorpsDeps } from '@loom/nakama-fabric';
import { createCorpsReputationService, RANK_THRESHOLDS } from '@loom/nakama-fabric';
import type { CorpsReputationService, CorpsReputationDeps } from '@loom/nakama-fabric';

// ── Shared Mocks ────────────────────────────────────────────────

function mockClock(start = 1_000_000): { nowMicroseconds: () => number } {
  let t = start;
  return { nowMicroseconds: () => t++ };
}

/** Clock that advances by huge steps so phase duration checks pass. */
function fastClock(start = 1_000_000): { nowMicroseconds: () => number } {
  let t = start;
  const step = 100_000_000_000; // 100 seconds per call
  return {
    nowMicroseconds: () => {
      const now = t;
      t += step;
      return now;
    },
  };
}

function mockIdGen(prefix = 'id'): { generate: () => string } {
  let c = 0;
  return { generate: () => prefix + '-' + String(++c) };
}

function mockRewardPort(): SurveyCorpsDeps['rewardPort'] {
  return {
    issueReward: () => {
      /* noop */
    },
  } as unknown as SurveyCorpsDeps['rewardPort'];
}

function mockUnlockPort(): SurveyCorpsDeps['worldUnlockPort'] {
  return {
    unlockWorld: () => {
      /* noop */
    },
  } as unknown as SurveyCorpsDeps['worldUnlockPort'];
}

// ── Survey Corps Engine ─────────────────────────────────────────

describe('Survey Corps Flow — mission lifecycle', () => {
  let corps: SurveyCorpsEngine;

  beforeEach(() => {
    const deps: SurveyCorpsDeps = {
      clock: fastClock() as SurveyCorpsDeps['clock'],
      idGenerator: mockIdGen('mission') as SurveyCorpsDeps['idGenerator'],
      rewardPort: mockRewardPort(),
      worldUnlockPort: mockUnlockPort(),
    };
    corps = createSurveyCorpsEngine(deps);
  });

  it('proposes a survey mission', () => {
    const mission = corps.proposeMission({
      missionType: 'exploration',
      target: {
        worldId: 'uncharted-7',
        stellarClass: 'G',
        distanceLightYears: 4.2,
        knownHazards: 2,
      },
      sponsorDynastyId: 'house-alpha',
    });
    expect(mission.phase).toBe('proposed');
    expect(mission.target.worldId).toBe('uncharted-7');
  });

  it('assigns crew to mission one at a time', () => {
    const mission = corps.proposeMission({
      missionType: 'deep_survey',
      target: {
        worldId: 'uncharted-8',
        stellarClass: 'K',
        distanceLightYears: 8.1,
        knownHazards: 4,
      },
      sponsorDynastyId: 'house-alpha',
    });

    const navigator = corps.assignCrew({
      missionId: mission.missionId,
      dynastyId: 'house-alpha',
      role: 'navigator',
      experienceLevel: 5,
    });
    expect(navigator).toBeDefined();

    const scientist = corps.assignCrew({
      missionId: mission.missionId,
      dynastyId: 'house-beta',
      role: 'scientist',
      experienceLevel: 3,
    });
    expect(scientist).toBeDefined();
  });

  it('advances mission through phases', () => {
    const mission = corps.proposeMission({
      missionType: 'resource_mapping',
      target: {
        worldId: 'uncharted-9',
        stellarClass: 'F',
        distanceLightYears: 12.5,
        knownHazards: 1,
      },
      sponsorDynastyId: 'house-alpha',
    });

    corps.assignCrew({
      missionId: mission.missionId,
      dynastyId: 'house-alpha',
      role: 'commander',
      experienceLevel: 7,
    });

    // proposed → approved
    const approved = corps.approveMission(mission.missionId);
    expect(approved.to).toBe('approved');

    // approved → outbound
    const outbound = corps.advancePhase(mission.missionId);
    expect(outbound).not.toBeNull();

    // Verify mission state
    const current = corps.getMission(mission.missionId);
    expect(current.phase).not.toBe('proposed');
  });

  it('completes a mission successfully', () => {
    const mission = corps.proposeMission({
      missionType: 'exploration',
      target: {
        worldId: 'terra-nova',
        stellarClass: 'G',
        distanceLightYears: 5.0,
        knownHazards: 2,
      },
      sponsorDynastyId: 'house-alpha',
    });

    corps.assignCrew({
      missionId: mission.missionId,
      dynastyId: 'house-alpha',
      role: 'commander',
      experienceLevel: 8,
    });

    corps.approveMission(mission.missionId);
    corps.advancePhase(mission.missionId); // → outbound
    corps.advancePhase(mission.missionId); // → on_site
    corps.advancePhase(mission.missionId); // → returning

    const completed = corps.completeMission(mission.missionId, 8, 3);
    expect(completed.to).toBe('completed');
  });

  it('tracks mission stats', () => {
    corps.proposeMission({
      missionType: 'exploration',
      target: {
        worldId: 'world-a',
        stellarClass: 'G',
        distanceLightYears: 3.0,
        knownHazards: 1,
      },
      sponsorDynastyId: 'house-alpha',
    });
    corps.proposeMission({
      missionType: 'hazard_assessment',
      target: {
        worldId: 'world-b',
        stellarClass: 'M',
        distanceLightYears: 1.5,
        knownHazards: 6,
      },
      sponsorDynastyId: 'house-beta',
    });

    const stats = corps.getStats();
    expect(stats.totalMissions).toBe(2);
  });
});

// ── Corps Reputation ────────────────────────────────────────────

describe('Survey Corps Flow — reputation system', () => {
  let reputation: CorpsReputationService;

  beforeEach(() => {
    const deps: CorpsReputationDeps = {
      clock: mockClock() as CorpsReputationDeps['clock'],
    };
    reputation = createCorpsReputationService(deps);
  });

  it('starts at recruit rank after enrollment', () => {
    reputation.enroll('house-alpha');
    const record = reputation.getRecord('house-alpha');
    expect(record.rank).toBe('recruit');
    expect(record.reputation).toBe(0);
  });

  it('gains reputation from successful mission', () => {
    reputation.enroll('house-alpha');
    reputation.awardMissionComplete({
      dynastyId: 'house-alpha',
      missionDifficulty: 3,
      wasCommander: true,
      crewSize: 2,
    });

    const record = reputation.getRecord('house-alpha');
    expect(record.reputation).toBeGreaterThan(0);
  });

  it('loses reputation from failed mission', () => {
    reputation.enroll('house-alpha');

    // First gain some rep
    reputation.awardMissionComplete({
      dynastyId: 'house-alpha',
      missionDifficulty: 5,
      wasCommander: true,
      crewSize: 3,
    });
    const before = reputation.getRecord('house-alpha').reputation;

    reputation.penalizeMissionFailure({
      dynastyId: 'house-alpha',
      missionDifficulty: 3,
      wasCommander: false,
      crewSize: 2,
    });
    const after = reputation.getRecord('house-alpha').reputation;
    expect(after).toBeLessThan(before);
  });

  it('advances rank based on accumulated reputation', () => {
    reputation.enroll('house-alpha');

    // Accumulate enough for rank advancement
    for (let i = 0; i < 20; i++) {
      reputation.awardMissionComplete({
        dynastyId: 'house-alpha',
        missionDifficulty: 5,
        wasCommander: true,
        crewSize: 4,
      });
    }

    const record = reputation.getRecord('house-alpha');
    expect(record.rank).not.toBe('recruit');
  });

  it('maintains leaderboard', () => {
    reputation.enroll('house-alpha');
    reputation.enroll('house-beta');

    reputation.awardMissionComplete({
      dynastyId: 'house-alpha',
      missionDifficulty: 3,
      wasCommander: true,
      crewSize: 2,
    });
    reputation.awardMissionComplete({
      dynastyId: 'house-beta',
      missionDifficulty: 5,
      wasCommander: true,
      crewSize: 3,
    });

    const board = reputation.getLeaderboard(10);
    expect(board).toHaveLength(2);
  });

  it('exports rank thresholds', () => {
    expect(RANK_THRESHOLDS).toBeDefined();
  });

  it('tracks reputation stats', () => {
    reputation.enroll('house-alpha');
    reputation.awardMissionComplete({
      dynastyId: 'house-alpha',
      missionDifficulty: 1,
      wasCommander: false,
      crewSize: 1,
    });

    const stats = reputation.getStats();
    expect(stats.totalMembers).toBe(1);
  });
});

// ── Cross-System Flow ───────────────────────────────────────────

describe('Survey Corps Flow — end-to-end', () => {
  it('full flow: propose → crew → advance → complete → reputation', () => {
    // Create corps engine with fast clock for phase advancement
    const corps = createSurveyCorpsEngine({
      clock: fastClock() as SurveyCorpsDeps['clock'],
      idGenerator: mockIdGen('m') as SurveyCorpsDeps['idGenerator'],
      rewardPort: mockRewardPort(),
      worldUnlockPort: mockUnlockPort(),
    });

    // Create reputation service
    const rep = createCorpsReputationService({
      clock: mockClock() as CorpsReputationDeps['clock'],
    });

    // Propose mission
    const mission = corps.proposeMission({
      missionType: 'exploration',
      target: {
        worldId: 'terra-nova',
        stellarClass: 'G',
        distanceLightYears: 4.5,
        knownHazards: 2,
      },
      sponsorDynastyId: 'house-alpha',
    });

    // Assign crew
    corps.assignCrew({
      missionId: mission.missionId,
      dynastyId: 'house-alpha',
      role: 'commander',
      experienceLevel: 6,
    });
    corps.assignCrew({
      missionId: mission.missionId,
      dynastyId: 'house-beta',
      role: 'scientist',
      experienceLevel: 4,
    });

    // Advance through phases
    corps.approveMission(mission.missionId);
    corps.advancePhase(mission.missionId); // → outbound
    corps.advancePhase(mission.missionId); // → on_site
    corps.advancePhase(mission.missionId); // → returning

    // Complete
    corps.completeMission(mission.missionId, 9, 2);

    // Record outcome in reputation system
    rep.enroll('house-alpha');
    rep.enroll('house-beta');

    rep.awardMissionComplete({
      dynastyId: 'house-alpha',
      missionDifficulty: 4,
      wasCommander: true,
      crewSize: 2,
    });
    rep.awardMissionComplete({
      dynastyId: 'house-beta',
      missionDifficulty: 4,
      wasCommander: false,
      crewSize: 2,
    });

    // Both crew members gain reputation
    expect(rep.getRecord('house-alpha').reputation).toBeGreaterThan(0);
    expect(rep.getRecord('house-beta').reputation).toBeGreaterThan(0);
  });
});
