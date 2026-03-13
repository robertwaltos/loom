import { describe, expect, it } from 'vitest';
import { createFakeClock } from '../clock.js';
import { createSequentialIdGenerator } from '../id-generator.js';
import { createLoomCore } from '../loom-core.js';

describe('loom-core simulation', () => {
  it('simulates multi-world entity lifecycle and one-tick system execution', () => {
    const loom = createLoomCore({
      clock: createFakeClock(1_000_000),
      idGenerator: createSequentialIdGenerator('loom-sim'),
    });

    loom.worlds.loadWorld('earth', 'server-a', 100);
    loom.worlds.loadWorld('mars', 'server-b', 50);
    const e1 = loom.entities.spawn('npc', 'earth');
    loom.entities.spawn('npc', 'earth');
    loom.entities.spawn('npc', 'mars');

    let ticks = 0;
    loom.systems.register('sim-system', () => {
      ticks++;
    });
    loom.tickLoop.tickOnce();
    loom.entities.despawn(e1, 'destroyed');

    expect(loom.entities.queryByWorld('earth')).toHaveLength(1);
    expect(loom.entities.queryByWorld('mars')).toHaveLength(1);
    expect(ticks).toBe(1);

    loom.shutdown();
  });
});
