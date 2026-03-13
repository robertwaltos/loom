import { describe, it, expect } from 'vitest';
import {
  createDocGenerator,
  registerEndpoint,
  generateCatalog,
  getEndpointCount,
  getTagCount,
  tagEndpoint,
  getEndpointsByTag,
  searchEndpoints,
  type DocGenState,
  type ClockPort,
  type IdPort,
  type LogPort,
} from '../api-doc-generator.js';

function makeClock(): ClockPort {
  let t = 1_000_000_000n;
  return { nowMicros: () => (t += 1000n) };
}
function makeId(): IdPort {
  let n = 0;
  return { generate: () => 'ep-' + String(++n) };
}
function makeLog(): LogPort {
  return { info: () => {}, warn: () => {}, error: () => {} };
}

describe('API Doc Generator Simulation', () => {
  it('registers endpoints, tags them, generates catalog', () => {
    const state: DocGenState = createDocGenerator(makeClock(), makeId(), makeLog());

    const ep1 = registerEndpoint(
      state,
      'GET',
      '/users',
      'List users',
      'Returns all users',
      [],
      [{ statusCode: 200, contentType: 'application/json', schema: 'UserList' }],
      'v1',
    );
    const ep2 = registerEndpoint(
      state,
      'POST',
      '/users',
      'Create user',
      'Creates a new user',
      [],
      [{ statusCode: 201, contentType: 'application/json', schema: 'User' }],
      'v1',
    );
    const ep3 = registerEndpoint(
      state,
      'GET',
      '/worlds',
      'List worlds',
      'Returns all worlds',
      [],
      [],
      'v1',
    );

    expect(typeof ep1).toBe('object');
    expect(typeof ep2).toBe('object');
    expect(typeof ep3).toBe('object');
    expect(getEndpointCount(state)).toBe(3);

    tagEndpoint(state, 'GET', '/users', 'users', 'User management endpoints');
    tagEndpoint(state, 'POST', '/users', 'users', 'User management endpoints');
    tagEndpoint(state, 'GET', '/worlds', 'worlds', 'World endpoints');

    expect(getTagCount(state)).toBe(2);

    const userEndpoints = getEndpointsByTag(state, 'users');
    expect(userEndpoints).toHaveLength(2);

    const catalog = generateCatalog(state);
    expect(catalog.totalEndpoints).toBe(3);
    expect(catalog.tags).toHaveLength(2);
  });

  it('searches endpoints by keyword', () => {
    const state: DocGenState = createDocGenerator(makeClock(), makeId(), makeLog());
    registerEndpoint(state, 'GET', '/dynasties', 'List dynasties', 'Returns all dynasties', [], [], 'v1');
    registerEndpoint(state, 'GET', '/worlds', 'List worlds', 'Returns all worlds', [], [], 'v1');

    const results = searchEndpoints(state, 'dynasties');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some(e => e.path.includes('dynasties'))).toBe(true);
  });

  it('rejects duplicate endpoint registration', () => {
    const state: DocGenState = createDocGenerator(makeClock(), makeId(), makeLog());
    registerEndpoint(state, 'GET', '/test', 'Test', 'Test endpoint', [], [], 'v1');
    const dup = registerEndpoint(state, 'GET', '/test', 'Test', 'Test endpoint', [], [], 'v1');
    expect(dup).toBe('endpoint-exists');
    expect(getEndpointCount(state)).toBe(1);
  });
});
