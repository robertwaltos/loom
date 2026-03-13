import { describe, expect, it } from 'vitest';
import { createSystemRegistry } from '../system-registry.js';
import { createSilentLogger } from '../logger.js';

describe('system-registry simulation', () => {
  it('simulates prioritized execution, runtime toggling, and unregister lifecycle', () => {
    const trace: string[] = [];
    const registry = createSystemRegistry({ logger: createSilentLogger() });

    registry.register('input', () => trace.push('input'), 10);
    registry.register('physics', () => trace.push('physics'), 20);
    registry.register('render', () => trace.push('render'), 30);

    registry.disable('physics');
    registry.runAll({ deltaMs: 16, tickNumber: 1, wallTimeMicroseconds: 16_000 });
    registry.enable('physics');
    registry.unregister('render');
    registry.runAll({ deltaMs: 16, tickNumber: 2, wallTimeMicroseconds: 32_000 });

    expect(trace).toEqual(['input', 'render', 'input', 'physics']);
    expect(registry.isRegistered('render')).toBe(false);
    expect(registry.listSystems().map((s) => s.name)).toEqual(['input', 'physics']);
  });
});
