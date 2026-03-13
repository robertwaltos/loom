import { describe, expect, it } from 'vitest';
import { createConfigLoaderSystem } from '../config-loader.js';

describe('config-loader simulation', () => {
  it('simulates config set/update/snapshot workflow with versioning', () => {
    let now = 1_000_000n;
    let id = 0;
    const sys = createConfigLoaderSystem({
      clock: { nowUs: () => (now += 1_000n) },
      idGen: { generate: () => `cfg-${++id}` },
      logger: {
        debug: () => undefined,
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
    });

    sys.setConfig('world.gravity', 'WORLD', 9.8);
    sys.updateConfig('world.gravity', 9.7);
    const snap = sys.takeSnapshot('WORLD');

    expect(sys.getConfig('world.gravity')?.version).toBe(2);
    expect(snap.entries.length).toBe(1);
  });
});
