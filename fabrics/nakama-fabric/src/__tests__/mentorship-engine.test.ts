import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMentorshipEngine,
  GRADUATION_REPUTATION_BONUS,
  MAX_ACTIVE_PAIRINGS,
} from '../mentorship-engine.js';
import type {
  MentorshipEngineDeps,
  MentorshipEvent,
  MentorshipEngine,
  CreatePairingParams,
  GraduationCriteria,
} from '../mentorship-engine.js';

function makeDeps(): MentorshipEngineDeps & { readonly events: MentorshipEvent[] } {
  let time = 1_000_000;
  let idCounter = 0;
  const events: MentorshipEvent[] = [];
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: {
      generate: () => {
        idCounter++;
        return 'pair-' + String(idCounter);
      },
    },
    notifications: {
      notify: (_dynastyId, event) => {
        events.push(event);
      },
    },
    events,
  };
}

const DEFAULT_CRITERIA: GraduationCriteria = {
  achievementsRequired: 5,
  questsCompleted: 3,
  reputationRequired: 100,
};

function makePairingParams(overrides?: Partial<CreatePairingParams>): CreatePairingParams {
  return {
    mentorId: 'mentor-1',
    protegeId: 'protege-1',
    criteria: DEFAULT_CRITERIA,
    mentorRewardMicroKalon: 1000n,
    protegeRewardMicroKalon: 500n,
    ...overrides,
  };
}

let engine: MentorshipEngine;
let deps: MentorshipEngineDeps & { readonly events: MentorshipEvent[] };

beforeEach(() => {
  deps = makeDeps();
  engine = createMentorshipEngine(deps);
});

describe('MentorshipEngine -- mentor registration', () => {
  it('registers a mentor', () => {
    const profile = engine.registerMentor('d1');
    expect(profile.dynastyId).toBe('d1');
    expect(profile.reputation).toBe(0);
    expect(profile.totalPairings).toBe(0);
    expect(profile.successfulGraduations).toBe(0);
    expect(profile.totalRewardsEarned).toBe(0n);
  });

  it('retrieves a mentor profile', () => {
    engine.registerMentor('d1');
    const profile = engine.getMentor('d1');
    expect(profile).toBeDefined();
    expect(profile?.dynastyId).toBe('d1');
  });

  it('returns undefined for unregistered mentor', () => {
    expect(engine.getMentor('nobody')).toBeUndefined();
  });

  it('rejects duplicate registration', () => {
    engine.registerMentor('d1');
    expect(() => engine.registerMentor('d1')).toThrow('already a registered mentor');
  });
});

describe('MentorshipEngine -- pairing creation', () => {
  it('creates a pending pairing', () => {
    engine.registerMentor('mentor-1');
    const pairing = engine.createPairing(makePairingParams());
    expect(pairing.status).toBe('PENDING');
    expect(pairing.mentorId).toBe('mentor-1');
    expect(pairing.protegeId).toBe('protege-1');
  });

  it('rejects self-mentoring', () => {
    engine.registerMentor('d1');
    expect(() =>
      engine.createPairing(
        makePairingParams({
          mentorId: 'd1',
          protegeId: 'd1',
        }),
      ),
    ).toThrow('cannot mentor itself');
  });

  it('rejects unregistered mentor', () => {
    expect(() => engine.createPairing(makePairingParams())).toThrow('not registered');
  });

  it('enforces max active pairings', () => {
    engine.registerMentor('mentor-1');
    for (let i = 1; i <= MAX_ACTIVE_PAIRINGS; i++) {
      const p = engine.createPairing(makePairingParams({ protegeId: 'p-' + String(i) }));
      engine.acceptPairing(p.pairingId);
    }
    expect(() =>
      engine.createPairing(
        makePairingParams({
          protegeId: 'p-extra',
        }),
      ),
    ).toThrow('maximum active pairings');
  });

  it('rejects negative criteria values', () => {
    engine.registerMentor('mentor-1');
    expect(() =>
      engine.createPairing(
        makePairingParams({
          criteria: { achievementsRequired: -1, questsCompleted: 0, reputationRequired: 0 },
        }),
      ),
    ).toThrow('non-negative');
  });

  it('increments total pairings on mentor', () => {
    engine.registerMentor('mentor-1');
    engine.createPairing(makePairingParams());
    const profile = engine.getMentor('mentor-1');
    expect(profile?.totalPairings).toBe(1);
  });
});

describe('MentorshipEngine -- pairing acceptance', () => {
  it('accepts a pending pairing', () => {
    engine.registerMentor('mentor-1');
    const pairing = engine.createPairing(makePairingParams());
    const accepted = engine.acceptPairing(pairing.pairingId);
    expect(accepted.status).toBe('ACTIVE');
    expect(accepted.acceptedAt).toBeGreaterThan(0);
  });

  it('rejects accepting non-pending pairing', () => {
    engine.registerMentor('mentor-1');
    const pairing = engine.createPairing(makePairingParams());
    engine.acceptPairing(pairing.pairingId);
    expect(() => engine.acceptPairing(pairing.pairingId)).toThrow('not pending');
  });

  it('throws for unknown pairing', () => {
    expect(() => engine.acceptPairing('missing')).toThrow('not found');
  });

  it('increments active pairings on mentor', () => {
    engine.registerMentor('mentor-1');
    const pairing = engine.createPairing(makePairingParams());
    engine.acceptPairing(pairing.pairingId);
    expect(engine.getMentor('mentor-1')?.activePairings).toBe(1);
  });
});

describe('MentorshipEngine -- progress tracking', () => {
  it('updates protege progress', () => {
    engine.registerMentor('mentor-1');
    const pairing = engine.createPairing(makePairingParams());
    engine.acceptPairing(pairing.pairingId);
    const updated = engine.updateProgress(pairing.pairingId, {
      achievementsEarned: 2,
      questsCompleted: 1,
    });
    expect(updated.progress.achievementsEarned).toBe(2);
    expect(updated.progress.questsCompleted).toBe(1);
    expect(updated.progress.reputationEarned).toBe(0);
  });

  it('allows partial progress updates', () => {
    engine.registerMentor('mentor-1');
    const pairing = engine.createPairing(makePairingParams());
    engine.acceptPairing(pairing.pairingId);
    engine.updateProgress(pairing.pairingId, { achievementsEarned: 3 });
    const updated = engine.updateProgress(pairing.pairingId, { reputationEarned: 50 });
    expect(updated.progress.achievementsEarned).toBe(3);
    expect(updated.progress.reputationEarned).toBe(50);
  });

  it('rejects progress on non-active pairing', () => {
    engine.registerMentor('mentor-1');
    const pairing = engine.createPairing(makePairingParams());
    expect(() =>
      engine.updateProgress(pairing.pairingId, {
        achievementsEarned: 1,
      }),
    ).toThrow('active pairings');
  });
});

describe('MentorshipEngine -- graduation', () => {
  it('graduates when all criteria met', () => {
    engine.registerMentor('mentor-1');
    const pairing = engine.createPairing(
      makePairingParams({
        criteria: { achievementsRequired: 2, questsCompleted: 1, reputationRequired: 50 },
      }),
    );
    engine.acceptPairing(pairing.pairingId);
    engine.updateProgress(pairing.pairingId, {
      achievementsEarned: 2,
      questsCompleted: 1,
      reputationEarned: 50,
    });
    const graduated = engine.checkGraduation(pairing.pairingId);
    expect(graduated.status).toBe('GRADUATED');
    expect(graduated.completedAt).toBeGreaterThan(0);
  });

  it('does not graduate when criteria not met', () => {
    engine.registerMentor('mentor-1');
    const pairing = engine.createPairing(makePairingParams());
    engine.acceptPairing(pairing.pairingId);
    engine.updateProgress(pairing.pairingId, { achievementsEarned: 1 });
    const result = engine.checkGraduation(pairing.pairingId);
    expect(result.status).toBe('ACTIVE');
  });

  it('awards reputation bonus to mentor on graduation', () => {
    engine.registerMentor('mentor-1');
    const pairing = engine.createPairing(
      makePairingParams({
        criteria: { achievementsRequired: 1, questsCompleted: 0, reputationRequired: 0 },
      }),
    );
    engine.acceptPairing(pairing.pairingId);
    engine.updateProgress(pairing.pairingId, { achievementsEarned: 1 });
    engine.checkGraduation(pairing.pairingId);
    const mentor = engine.getMentor('mentor-1');
    expect(mentor?.reputation).toBe(GRADUATION_REPUTATION_BONUS);
    expect(mentor?.successfulGraduations).toBe(1);
  });

  it('tracks mentor rewards earned', () => {
    engine.registerMentor('mentor-1');
    const pairing = engine.createPairing(
      makePairingParams({
        criteria: { achievementsRequired: 0, questsCompleted: 0, reputationRequired: 0 },
        mentorRewardMicroKalon: 2000n,
      }),
    );
    engine.acceptPairing(pairing.pairingId);
    engine.checkGraduation(pairing.pairingId);
    expect(engine.getMentor('mentor-1')?.totalRewardsEarned).toBe(2000n);
  });

  it('decrements active pairings on graduation', () => {
    engine.registerMentor('mentor-1');
    const pairing = engine.createPairing(
      makePairingParams({
        criteria: { achievementsRequired: 0, questsCompleted: 0, reputationRequired: 0 },
      }),
    );
    engine.acceptPairing(pairing.pairingId);
    engine.checkGraduation(pairing.pairingId);
    expect(engine.getMentor('mentor-1')?.activePairings).toBe(0);
  });
});

describe('MentorshipEngine -- dissolution', () => {
  it('dissolves an active pairing', () => {
    engine.registerMentor('mentor-1');
    const pairing = engine.createPairing(makePairingParams());
    engine.acceptPairing(pairing.pairingId);
    const dissolved = engine.dissolvePairing(pairing.pairingId);
    expect(dissolved.status).toBe('DISSOLVED');
    expect(dissolved.completedAt).toBeGreaterThan(0);
  });

  it('dissolves a pending pairing', () => {
    engine.registerMentor('mentor-1');
    const pairing = engine.createPairing(makePairingParams());
    const dissolved = engine.dissolvePairing(pairing.pairingId);
    expect(dissolved.status).toBe('DISSOLVED');
  });

  it('rejects dissolving graduated pairing', () => {
    engine.registerMentor('mentor-1');
    const pairing = engine.createPairing(
      makePairingParams({
        criteria: { achievementsRequired: 0, questsCompleted: 0, reputationRequired: 0 },
      }),
    );
    engine.acceptPairing(pairing.pairingId);
    engine.checkGraduation(pairing.pairingId);
    expect(() => engine.dissolvePairing(pairing.pairingId)).toThrow('active or pending');
  });

  it('decrements active pairings on dissolution', () => {
    engine.registerMentor('mentor-1');
    const pairing = engine.createPairing(makePairingParams());
    engine.acceptPairing(pairing.pairingId);
    engine.dissolvePairing(pairing.pairingId);
    expect(engine.getMentor('mentor-1')?.activePairings).toBe(0);
  });
});

describe('MentorshipEngine -- notifications', () => {
  it('emits PAIRING_CREATED to both parties', () => {
    engine.registerMentor('mentor-1');
    engine.createPairing(makePairingParams());
    const created = deps.events.filter((e) => e.kind === 'PAIRING_CREATED');
    expect(created).toHaveLength(2);
  });

  it('emits GRADUATED to both parties', () => {
    engine.registerMentor('mentor-1');
    const pairing = engine.createPairing(
      makePairingParams({
        criteria: { achievementsRequired: 0, questsCompleted: 0, reputationRequired: 0 },
      }),
    );
    engine.acceptPairing(pairing.pairingId);
    deps.events.length = 0;
    engine.checkGraduation(pairing.pairingId);
    const graduated = deps.events.filter((e) => e.kind === 'GRADUATED');
    expect(graduated).toHaveLength(2);
  });
});

describe('MentorshipEngine -- queries', () => {
  it('retrieves pairing by id', () => {
    engine.registerMentor('mentor-1');
    const pairing = engine.createPairing(makePairingParams());
    const fetched = engine.getPairing(pairing.pairingId);
    expect(fetched).toBeDefined();
    expect(fetched?.mentorId).toBe('mentor-1');
  });

  it('returns undefined for unknown pairing', () => {
    expect(engine.getPairing('missing')).toBeUndefined();
  });

  it('lists pairings by mentor', () => {
    engine.registerMentor('mentor-1');
    engine.createPairing(makePairingParams({ protegeId: 'p1' }));
    engine.createPairing(makePairingParams({ protegeId: 'p2' }));
    const list = engine.listByMentor('mentor-1');
    expect(list).toHaveLength(2);
  });

  it('lists pairings by protege', () => {
    engine.registerMentor('m1');
    engine.registerMentor('m2');
    engine.createPairing(makePairingParams({ mentorId: 'm1', protegeId: 'p1' }));
    engine.createPairing(makePairingParams({ mentorId: 'm2', protegeId: 'p1' }));
    const list = engine.listByProtege('p1');
    expect(list).toHaveLength(2);
  });

  it('returns empty lists for unknown ids', () => {
    expect(engine.listByMentor('nobody')).toHaveLength(0);
    expect(engine.listByProtege('nobody')).toHaveLength(0);
  });

  it('returns mentor leaderboard', () => {
    engine.registerMentor('m1');
    engine.registerMentor('m2');
    const p1 = engine.createPairing(
      makePairingParams({
        mentorId: 'm1',
        protegeId: 'p1',
        criteria: { achievementsRequired: 0, questsCompleted: 0, reputationRequired: 0 },
      }),
    );
    engine.acceptPairing(p1.pairingId);
    engine.checkGraduation(p1.pairingId);
    const board = engine.getLeaderboard(10);
    expect(board).toHaveLength(2);
    expect(board[0]?.dynastyId).toBe('m1');
    expect(board[0]?.reputation).toBe(GRADUATION_REPUTATION_BONUS);
  });
});

describe('MentorshipEngine -- stats', () => {
  it('starts with zero stats', () => {
    const stats = engine.getStats();
    expect(stats.totalMentors).toBe(0);
    expect(stats.totalActivePairings).toBe(0);
    expect(stats.totalGraduations).toBe(0);
    expect(stats.totalDissolutions).toBe(0);
    expect(stats.totalRewardsDistributed).toBe(0n);
  });

  it('tracks aggregate stats', () => {
    engine.registerMentor('m1');
    engine.registerMentor('m2');
    const p1 = engine.createPairing(
      makePairingParams({
        mentorId: 'm1',
        protegeId: 'p1',
        criteria: { achievementsRequired: 0, questsCompleted: 0, reputationRequired: 0 },
        mentorRewardMicroKalon: 1000n,
        protegeRewardMicroKalon: 500n,
      }),
    );
    engine.acceptPairing(p1.pairingId);
    engine.checkGraduation(p1.pairingId);
    const p2 = engine.createPairing(
      makePairingParams({
        mentorId: 'm2',
        protegeId: 'p2',
      }),
    );
    engine.acceptPairing(p2.pairingId);
    engine.dissolvePairing(p2.pairingId);
    const stats = engine.getStats();
    expect(stats.totalMentors).toBe(2);
    expect(stats.totalGraduations).toBe(1);
    expect(stats.totalDissolutions).toBe(1);
    expect(stats.totalRewardsDistributed).toBe(1500n);
  });
});

describe('MentorshipEngine -- constants', () => {
  it('exports GRADUATION_REPUTATION_BONUS', () => {
    expect(GRADUATION_REPUTATION_BONUS).toBe(50);
  });

  it('exports MAX_ACTIVE_PAIRINGS', () => {
    expect(MAX_ACTIVE_PAIRINGS).toBe(3);
  });
});
