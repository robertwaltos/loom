import { describe, expect, it } from 'vitest';
import { createInputMapperSystem } from '../input-mapper.js';

describe('input-mapper simulation', () => {
  it('simulates action registration, rebind workflow, and input history capture', () => {
    let now = 1_000_000n;
    let id = 0;
    const mapper = createInputMapperSystem({
      clock: { nowUs: () => (now += 1_000n) },
      idGen: { generate: () => `input-${++id}` },
      logger: {
        debug: () => undefined,
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
    });

    mapper.registerAction('jump', 'Jump', 'Vertical move', 'Space');
    mapper.registerAction('interact', 'Interact', 'Use object', 'KeyE');
    mapper.bindAction('interact', 'KeyF');
    mapper.processInput('Space');
    mapper.processInput('KeyF');
    mapper.processInput('Escape');

    const latest = mapper.getInputHistory(3);
    expect(mapper.getActionForInput('KeyF')?.actionId).toBe('interact');
    expect(latest[0]?.inputCode).toBe('Escape');
    expect(latest[1]?.actionId).toBe('interact');
    expect(latest[2]?.actionId).toBe('jump');
  });
});
