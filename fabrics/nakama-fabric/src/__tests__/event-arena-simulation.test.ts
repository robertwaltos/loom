import { describe, expect, it } from 'vitest';
import { createEventArenaSystem } from '../event-arena.js';

describe('event-arena simulation', () => {
  it('simulates a full elimination tournament to conclusion', () => {
    let nowUs = 1_000_000;
    let seq = 0;
    const system = createEventArenaSystem({
      clock: { nowMicroseconds: () => nowUs },
      idGenerator: { next: () => `arena-${++seq}` },
    });

    const arena = system.createArena({
      worldId: 'world-1',
      name: 'Grand Trials',
      arenaType: 'TOURNAMENT',
      maxParticipants: 4,
      opensAt: 2_000_000,
      startsAt: 3_000_000,
      prizePool: 10_000n,
    });

    system.registerParticipant(arena.arenaId, 'd1', 'One');
    system.registerParticipant(arena.arenaId, 'd2', 'Two');
    system.registerParticipant(arena.arenaId, 'd3', 'Three');
    system.registerParticipant(arena.arenaId, 'd4', 'Four');
    system.startArena(arena.arenaId);

    const round1 = system.generateMatches(arena.arenaId);
    for (const match of round1) {
      system.reportMatch({
        arenaId: arena.arenaId,
        matchId: match.matchId,
        winnerId: match.participantA,
        scoreA: 2,
        scoreB: 1,
      });
    }
    const finals = system.generateMatches(arena.arenaId);
    system.reportMatch({
      arenaId: arena.arenaId,
      matchId: finals[0].matchId,
      winnerId: finals[0].participantA,
      scoreA: 3,
      scoreB: 2,
    });

    const concluded = system.concludeArena(arena.arenaId);
    expect(concluded.phase).toBe('CONCLUDED');
    expect(concluded.winnerId).toBeTruthy();
  });
});
