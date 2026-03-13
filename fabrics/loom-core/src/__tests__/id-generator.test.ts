import { describe, it, expect } from 'vitest';
import { createUuidGenerator, createSequentialIdGenerator } from '../id-generator.js';

describe('createUuidGenerator', () => {
  it('generates a string matching the UUID v4 pattern', () => {
    const gen = createUuidGenerator();
    const id = gen.generate();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('generates unique values on successive calls', () => {
    const gen = createUuidGenerator();
    expect(gen.generate()).not.toBe(gen.generate());
  });
});

describe('createSequentialIdGenerator', () => {
  it('generates sequential padded IDs with default prefix', () => {
    const gen = createSequentialIdGenerator();
    expect(gen.generate()).toBe('test-000001');
    expect(gen.generate()).toBe('test-000002');
  });

  it('uses a custom prefix', () => {
    const gen = createSequentialIdGenerator('entity');
    expect(gen.generate()).toBe('entity-000001');
  });

  it('generates unique values across multiple calls', () => {
    const gen = createSequentialIdGenerator('x');
    const ids = Array.from({ length: 5 }, () => gen.generate());
    expect(new Set(ids).size).toBe(5);
  });

  it('each generator has independent state', () => {
    const a = createSequentialIdGenerator('a');
    const b = createSequentialIdGenerator('b');
    a.generate();
    a.generate();
    expect(b.generate()).toBe('b-000001');
  });
});
