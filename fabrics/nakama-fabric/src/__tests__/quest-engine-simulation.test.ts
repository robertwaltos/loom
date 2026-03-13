import { describe, expect, it } from 'vitest';
import { createQuestEngine } from '../quest-engine.js';

describe('quest-engine simulation', () => {
  it('simulates prerequisite unlock and quest completion chain', () => {
    let now = 1_000_000;
    let id = 0;
    const events: string[] = [];
    const engine = createQuestEngine({
      clock: { nowMicroseconds: () => (now += 1_000_000) },
      idGenerator: { generate: () => `q-${++id}` },
      notifications: {
        notify: (_dynastyId, event) => {
          events.push(event.kind);
        },
      },
    });

    engine.defineQuest({
      id: 'q-base',
      name: 'Scout',
      description: 'Scout one world',
      objectives: [{ id: 'o1', description: 'Scout world', requiredCount: 1 }],
      reward: { microKalon: 100n, items: [], reputationPoints: 1 },
      prerequisiteQuestIds: [],
      timeLimitMicroseconds: null,
      repeatable: false,
      maxLevel: 1,
    });
    engine.defineQuest({
      id: 'q-advanced',
      name: 'Diplomat',
      description: 'Broker a treaty',
      objectives: [{ id: 'o2', description: 'Negotiate treaty', requiredCount: 1 }],
      reward: { microKalon: 500n, items: [], reputationPoints: 3 },
      prerequisiteQuestIds: ['q-base'],
      timeLimitMicroseconds: null,
      repeatable: false,
      maxLevel: 1,
    });

    expect(engine.listAvailable('dyn-1').map((q) => q.id)).toEqual(['q-base']);

    const base = engine.acceptQuest('dyn-1', 'q-base');
    const done = engine.advanceObjective(base.instanceId, 'o1', 1);
    expect(done.status).toBe('COMPLETED');

    const available = engine.listAvailable('dyn-1').map((q) => q.id);
    expect(available).toContain('q-advanced');
    expect(events.length).toBeGreaterThan(0);
  });
});
