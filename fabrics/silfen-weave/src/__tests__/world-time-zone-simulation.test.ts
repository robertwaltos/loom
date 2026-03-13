import { describe, expect, it } from 'vitest';
import { createWorldTimeZoneService } from '../world-time-zone.js';

describe('world-time-zone simulation', () => {
  it('keeps independent local clocks across worlds with different cycles', () => {
    let now = 0;
    const time = createWorldTimeZoneService({
      clock: { nowMicroseconds: () => now },
    });

    const day = 86_400_000_000;
    time.configure({ worldId: 'w1', dayLengthMicro: day, offsetMicro: 0 });
    time.configure({ worldId: 'w2', dayLengthMicro: day / 2, offsetMicro: day / 4 });

    now = day / 2;
    const w1 = time.getLocalTime('w1');
    const w2 = time.getLocalTime('w2');

    expect(w1?.dayNumber).toBe(0);
    expect(typeof w2?.isDay).toBe('boolean');
    expect(time.getStats().trackedWorlds).toBe(2);
  });
});
