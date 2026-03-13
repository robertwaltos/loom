import { describe, expect, it } from 'vitest';
import { createPlayerEventEngine } from '../player-event-engine.js';

describe('player-event-engine simulation', () => {
  it('simulates propose-approve-start-join-conclude event lifecycle with side effects', () => {
    let now = 1_000_000;
    let id = 0;
    const boosts: string[] = [];
    const remembrance: string[] = [];

    const engine = createPlayerEventEngine({
      clock: { nowMicroseconds: () => now++ },
      idGenerator: { generate: () => `evt-${++id}` },
      logger: {
        info: () => undefined,
        warn: () => undefined,
      },
      world: {
        applyTemporaryBoost: (worldId) => {
          boosts.push(worldId);
        },
      },
      notifications: {
        notifyWorld: () => undefined,
        notifyPlayer: () => undefined,
      },
      remembrance: {
        recordEvent: (eventRecord) => {
          remembrance.push(eventRecord.eventId);
        },
        recordTournamentResult: () => undefined,
      },
    });

    const proposed = engine.proposeEvent({
      worldId: 'earth',
      proposerId: 'player-1',
      eventType: 'festival',
      title: 'Harvest Fair',
      description: 'Seasonal celebration',
      scheduledStartAt: 2_000_000,
      scheduledEndAt: 4_000_000,
      maxParticipants: 30,
      economyBoosts: { trade: 1.2 },
    });

    engine.approveEvent(proposed.eventId);
    engine.startEvent(proposed.eventId);
    const joined = engine.joinEvent(proposed.eventId, 'player-2', 'participant');
    const concluded = engine.concludeEvent(proposed.eventId);

    expect(joined.participants.some((p) => p.playerId === 'player-2')).toBe(true);
    expect(concluded.phase).toBe('CONCLUDED');
    expect(boosts).toEqual(['earth']);
    expect(remembrance).toContain(proposed.eventId);
  });
});
