import { describe, expect, it } from 'vitest';
import {
  createCosmicEventSystem,
  type CosmicClockPort,
  type CosmicIdGeneratorPort,
  type CosmicLoggerPort,
} from '../cosmic-event.js';

class Clock implements CosmicClockPort {
  private t = 1_000_000n;
  now() {
    return this.t;
  }
}

class IdGen implements CosmicIdGeneratorPort {
  private i = 0;
  generate() {
    this.i += 1;
    return `ev-${this.i}`;
  }
}

const logger: CosmicLoggerPort = { info: () => {}, warn: () => {}, error: () => {} };

describe('cosmic-event simulation', () => {
  it('runs event lifecycle and updates forecast counts', () => {
    const system = createCosmicEventSystem({ clock: new Clock(), idGen: new IdGen(), logger });
    system.registerWorld('w1');
    system.registerWorld('w2');

    const event = system.predictEvent('SOLAR_FLARE', 8, ['w1', 'w2'], 5_000n);
    expect(typeof event).toBe('object');
    if (typeof event === 'string') return;

    expect(system.getForecast().upcomingCount).toBe(1);
    system.activateEvent(event.eventId);
    expect(system.getForecast().activeCount).toBe(1);

    const impact = system.measureImpact(event.eventId, 'w1');
    expect(typeof impact).toBe('object');

    system.waneEvent(event.eventId);
    system.endEvent(event.eventId);
    expect(system.getEvent(event.eventId)?.status).toBe('ENDED');
  });
});
