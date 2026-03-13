import { describe, expect, it } from 'vitest';
import { createMentorshipEngine } from '../mentorship-engine.js';

describe('mentorship-engine simulation', () => {
  const make = () => {
    let now = 1_000_000;
    let id = 0;
    return createMentorshipEngine({
      clock: { nowMicroseconds: () => (now += 1_000_000) },
      idGenerator: { generate: () => `pair-${++id}` },
      notifications: { notify: () => undefined },
    });
  };

  it('simulates full mentorship graduation pipeline with reputation and rewards accounting', () => {
    const mentorship = make();

    mentorship.registerMentor('mentor-1');

    const pairing = mentorship.createPairing({
      mentorId: 'mentor-1',
      protegeId: 'prot-1',
      criteria: { achievementsRequired: 3, questsCompleted: 2, reputationRequired: 40 },
      mentorRewardMicroKalon: 1_200n,
      protegeRewardMicroKalon: 800n,
    });

    mentorship.acceptPairing(pairing.pairingId);
    mentorship.updateProgress(pairing.pairingId, {
      achievementsEarned: 3,
      questsCompleted: 2,
      reputationEarned: 40,
    });

    const result = mentorship.checkGraduation(pairing.pairingId);
    expect(result.status).toBe('GRADUATED');

    const mentor = mentorship.getMentor('mentor-1');
    expect(mentor?.successfulGraduations).toBe(1);
    expect(mentor?.totalRewardsEarned).toBe(1_200n);

    const stats = mentorship.getStats();
    expect(stats.totalGraduations).toBe(1);
    expect(stats.totalRewardsDistributed).toBe(2_000n);
  });

  it('simulates mixed outcomes across concurrent pairings (graduation + dissolution)', () => {
    const mentorship = make();
    mentorship.registerMentor('mentor-2');

    const p1 = mentorship.createPairing({
      mentorId: 'mentor-2',
      protegeId: 'prot-a',
      criteria: { achievementsRequired: 0, questsCompleted: 0, reputationRequired: 0 },
      mentorRewardMicroKalon: 500n,
      protegeRewardMicroKalon: 500n,
    });
    const p2 = mentorship.createPairing({
      mentorId: 'mentor-2',
      protegeId: 'prot-b',
      criteria: { achievementsRequired: 10, questsCompleted: 10, reputationRequired: 200 },
      mentorRewardMicroKalon: 700n,
      protegeRewardMicroKalon: 700n,
    });

    mentorship.acceptPairing(p1.pairingId);
    mentorship.acceptPairing(p2.pairingId);

    mentorship.checkGraduation(p1.pairingId);
    mentorship.dissolvePairing(p2.pairingId);

    const list = mentorship.listByMentor('mentor-2').map((p) => p.status).sort();
    expect(list).toEqual(['DISSOLVED', 'GRADUATED']);

    const stats = mentorship.getStats();
    expect(stats.totalGraduations).toBe(1);
    expect(stats.totalDissolutions).toBe(1);
  });
});
