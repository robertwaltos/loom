import { describe, expect, it } from 'vitest';
import { createSequentialIdGenerator, createUuidGenerator } from '../id-generator.js';

describe('id-generator simulation', () => {
  it('simulates deterministic local IDs and globally unique runtime IDs', () => {
    const sequential = createSequentialIdGenerator('npc');
    const first = sequential.generate();
    const second = sequential.generate();

    const uuid = createUuidGenerator().generate();

    expect(first).toBe('npc-000001');
    expect(second).toBe('npc-000002');
    expect(uuid).toMatch(/^[0-9a-f-]{36}$/i);
  });
});
