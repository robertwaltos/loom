import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEventArenaSystem,
  type EventArenaSystem,
  type ArenaSystemDeps,
  DEFAULT_ARENA_CONFIG,
} from '../event-arena.js';

// ─── Helpers ─────────────────────────────────────────────────────

let nowUs = 1_000_000;
let idSeq = 0;

function createDeps(): ArenaSystemDeps {
  nowUs = 1_000_000;
  idSeq = 0;
  return {
    clock: { nowMicroseconds: () => nowUs },
    idGenerator: { next: () => `arena-${++idSeq}` },
  };
}

function advanceTime(us: number): void {
  nowUs += us;
}

const BASE_ARENA = {
  worldId: 'world-1',
  name: 'Grand Tournament',
  arenaType: 'TOURNAMENT' as const,
  maxParticipants: 8,
  opensAt: 2_000_000,
  startsAt: 3_000_000,
  prizePool: 10_000n,
};

// ─── Tests ───────────────────────────────────────────────────────

describe('EventArenaSystem', () => {
  let system: EventArenaSystem;

  beforeEach(() => {
    system = createEventArenaSystem(createDeps());
  });

  describe('creation', () => {
    it('creates arena in SCHEDULING phase', () => {
      const arena = system.createArena(BASE_ARENA);
      expect(arena.phase).toBe('SCHEDULING');
      expect(arena.name).toBe('Grand Tournament');
      expect(arena.arenaType).toBe('TOURNAMENT');
      expect(arena.maxParticipants).toBe(8);
      expect(arena.prizePool).toBe(10_000n);
    });

    it('stats reflect creation', () => {
      system.createArena(BASE_ARENA);
      const stats = system.getStats();
      expect(stats.totalArenas).toBe(1);
      expect(stats.activeArenas).toBe(0);
    });
  });

  describe('registration', () => {
    it('registers participant and opens arena', () => {
      const arena = system.createArena(BASE_ARENA);
      const updated = system.registerParticipant(arena.arenaId, 'dynasty-1', 'Champion One');
      expect(updated.phase).toBe('OPEN');
      expect(updated.participants).toHaveLength(1);
      expect(updated.participants[0].displayName).toBe('Champion One');
      expect(updated.participants[0].seed).toBe(1);
    });

    it('prevents duplicate registration', () => {
      const arena = system.createArena(BASE_ARENA);
      system.registerParticipant(arena.arenaId, 'dynasty-1', 'One');
      expect(() => system.registerParticipant(arena.arenaId, 'dynasty-1', 'One')).toThrow('already registered');
    });

    it('prevents registration past max capacity', () => {
      const arena = system.createArena({ ...BASE_ARENA, maxParticipants: 1 });
      system.registerParticipant(arena.arenaId, 'dynasty-1', 'One');
      expect(() => system.registerParticipant(arena.arenaId, 'dynasty-2', 'Two')).toThrow('full');
    });

    it('allows withdrawal before match', () => {
      const arena = system.createArena(BASE_ARENA);
      system.registerParticipant(arena.arenaId, 'dynasty-1', 'One');
      const updated = system.withdrawParticipant(arena.arenaId, 'dynasty-1');
      expect(updated.participants[0].status).toBe('WITHDRAWN');
    });
  });

  describe('spectators', () => {
    it('allows spectators to join', () => {
      const arena = system.createArena(BASE_ARENA);
      const updated = system.joinAsSpectator(arena.arenaId, 'spectator-1');
      expect(updated.spectators).toHaveLength(1);
      expect(updated.spectators[0].status).toBe('WATCHING');
    });

    it('spectators can leave', () => {
      const arena = system.createArena(BASE_ARENA);
      system.joinAsSpectator(arena.arenaId, 'spectator-1');
      const updated = system.leaveAsSpectator(arena.arenaId, 'spectator-1');
      expect(updated.spectators[0].status).toBe('LEFT');
    });

    it('enforces spectator capacity', () => {
      const arena = system.createArena(BASE_ARENA);
      system = createEventArenaSystem(createDeps(), { maxSpectatorsPerArena: 1 });
      const a2 = system.createArena(BASE_ARENA);
      system.joinAsSpectator(a2.arenaId, 'spec-1');
      expect(() => system.joinAsSpectator(a2.arenaId, 'spec-2')).toThrow('capacity');
    });
  });

  describe('tournament flow', () => {
    function setupTournament(): string {
      const arena = system.createArena(BASE_ARENA);
      system.registerParticipant(arena.arenaId, 'd1', 'Fighter 1');
      system.registerParticipant(arena.arenaId, 'd2', 'Fighter 2');
      system.registerParticipant(arena.arenaId, 'd3', 'Fighter 3');
      system.registerParticipant(arena.arenaId, 'd4', 'Fighter 4');
      return arena.arenaId;
    }

    it('starts arena and activates participants', () => {
      const arenaId = setupTournament();
      const started = system.startArena(arenaId);
      expect(started.phase).toBe('IN_PROGRESS');
      expect(started.currentRound).toBe(1);
      for (const p of started.participants) {
        expect(p.status).toBe('ACTIVE');
      }
    });

    it('generates bracket matches', () => {
      const arenaId = setupTournament();
      system.startArena(arenaId);
      const matches = system.generateMatches(arenaId);
      expect(matches).toHaveLength(2);
      expect(matches[0].round).toBe(1);
    });

    it('reports match results and eliminates losers', () => {
      const arenaId = setupTournament();
      system.startArena(arenaId);
      const matches = system.generateMatches(arenaId);

      const result = system.reportMatch({
        arenaId,
        matchId: matches[0].matchId,
        winnerId: matches[0].participantA,
        scoreA: 10,
        scoreB: 3,
      });

      expect(result.winnerId).toBe(matches[0].participantA);
      expect(result.scoreA).toBe(10);
      expect(result.scoreB).toBe(3);

      // Check loser eliminated
      const arena = system.getArena(arenaId);
      const loser = arena.participants.find(p => p.dynastyId === matches[0].participantB);
      expect(loser!.status).toBe('ELIMINATED');
    });

    it('winner must be a participant of the match', () => {
      const arenaId = setupTournament();
      system.startArena(arenaId);
      const matches = system.generateMatches(arenaId);

      expect(() => system.reportMatch({
        arenaId,
        matchId: matches[0].matchId,
        winnerId: 'nobody',
        scoreA: 1,
        scoreB: 0,
      })).toThrow('must be a participant');
    });

    it('concludes with a winner', () => {
      const arenaId = setupTournament();
      system.startArena(arenaId);
      const matches = system.generateMatches(arenaId);

      // Report all round 1 matches
      system.reportMatch({
        arenaId,
        matchId: matches[0].matchId,
        winnerId: matches[0].participantA,
        scoreA: 1,
        scoreB: 0,
      });
      system.reportMatch({
        arenaId,
        matchId: matches[1].matchId,
        winnerId: matches[1].participantA,
        scoreA: 1,
        scoreB: 0,
      });

      // Generate round 2
      const finals = system.generateMatches(arenaId);
      expect(finals).toHaveLength(1);

      system.reportMatch({
        arenaId,
        matchId: finals[0].matchId,
        winnerId: finals[0].participantA,
        scoreA: 1,
        scoreB: 0,
      });

      const concluded = system.concludeArena(arenaId);
      expect(concluded.phase).toBe('CONCLUDED');
      expect(concluded.winnerId).toBe(finals[0].participantA);
    });

    it('can archive a concluded arena', () => {
      const arenaId = setupTournament();
      system.startArena(arenaId);
      const matches = system.generateMatches(arenaId);
      system.reportMatch({
        arenaId,
        matchId: matches[0].matchId,
        winnerId: matches[0].participantA,
        scoreA: 1,
        scoreB: 0,
      });
      system.reportMatch({
        arenaId,
        matchId: matches[1].matchId,
        winnerId: matches[1].participantA,
        scoreA: 1,
        scoreB: 0,
      });
      system.concludeArena(arenaId);

      const archived = system.archiveArena(arenaId);
      expect(archived.phase).toBe('ARCHIVED');
    });
  });

  describe('exhibition mode', () => {
    it('does not eliminate losers in exhibition', () => {
      const arena = system.createArena({ ...BASE_ARENA, arenaType: 'EXHIBITION' });
      system.registerParticipant(arena.arenaId, 'd1', 'P1');
      system.registerParticipant(arena.arenaId, 'd2', 'P2');
      system.startArena(arena.arenaId);
      const matches = system.generateMatches(arena.arenaId);
      system.reportMatch({
        arenaId: arena.arenaId,
        matchId: matches[0].matchId,
        winnerId: 'd1',
        scoreA: 5,
        scoreB: 3,
      });

      const result = system.getArena(arena.arenaId);
      const p2 = result.participants.find(p => p.dynastyId === 'd2');
      // Exhibition: no elimination
      expect(p2!.status).toBe('ACTIVE');
    });
  });

  describe('queries', () => {
    it('getActiveArenas filters by world', () => {
      system.createArena(BASE_ARENA);
      system.createArena({ ...BASE_ARENA, worldId: 'world-2' });

      // Register to move to OPEN
      const all = system.getStats();
      expect(all.totalArenas).toBe(2);
    });

    it('throws for unknown arena', () => {
      expect(() => system.getArena('nope')).toThrow('Unknown arena');
    });

    it('prevents starting with insufficient participants', () => {
      const arena = system.createArena(BASE_ARENA);
      system.registerParticipant(arena.arenaId, 'd1', 'Solo');
      expect(() => system.startArena(arena.arenaId)).toThrow('at least');
    });
  });

  describe('odd participant bye', () => {
    it('gives bye to last participant with odd count', () => {
      const arena = system.createArena(BASE_ARENA);
      system.registerParticipant(arena.arenaId, 'd1', 'P1');
      system.registerParticipant(arena.arenaId, 'd2', 'P2');
      system.registerParticipant(arena.arenaId, 'd3', 'P3');
      system.startArena(arena.arenaId);

      const matches = system.generateMatches(arena.arenaId);
      expect(matches).toHaveLength(1); // Only 1 match, d3 gets bye

      const updated = system.getArena(arena.arenaId);
      const p3 = updated.participants.find(p => p.dynastyId === 'd3');
      expect(p3!.score).toBe(1); // bye win
    });
  });
});
