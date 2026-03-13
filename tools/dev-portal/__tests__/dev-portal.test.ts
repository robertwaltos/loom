import { describe, it, expect } from 'vitest';
import {
  createDevPortal,
  type DevPortal,
  type DevPortalDeps,
  type ApiEndpointDef,
  type LoomFabric,
} from '../index.js';

// ── Test doubles ──────────────────────────────────────────────────────

let counter = 0;
function makeDeps(): DevPortalDeps {
  return {
    clock: { nowMs: () => 1_700_000_000 + counter * 100 },
    id: { next: () => 'id-' + String(++counter) },
  };
}

function makePortal(): DevPortal {
  counter = 0;
  return createDevPortal(makeDeps());
}

function sampleEndpoint(fabric: LoomFabric = 'loom-core'): ApiEndpointDef {
  return {
    name: 'spawnEntity',
    fabric,
    description: 'Spawns a new entity into the world.',
    parameters: [{ name: 'archetype', type: 'string', required: true, description: 'Entity type' }],
    returnType: 'EntityId',
    exampleCode: 'sdk.spawnEntity("npc")',
  };
}

// ── registerEndpoint ──────────────────────────────────────────────────

describe('registerEndpoint', () => {
  it('returns a frozen endpoint with assigned id', () => {
    const portal = makePortal();
    const ep = portal.registerEndpoint(sampleEndpoint());
    expect(ep.id).toBeTruthy();
    expect(ep.name).toBe('spawnEntity');
    expect(Object.isFrozen(ep)).toBe(true);
  });

  it('increments totalEndpoints stat', () => {
    const portal = makePortal();
    portal.registerEndpoint(sampleEndpoint());
    portal.registerEndpoint(sampleEndpoint('shuttle'));
    expect(portal.getStats().totalEndpoints).toBe(2);
  });
});

// ── getEndpoint ───────────────────────────────────────────────────────

describe('getEndpoint', () => {
  it('retrieves endpoint by id', () => {
    const portal = makePortal();
    const ep = portal.registerEndpoint(sampleEndpoint());
    expect(portal.getEndpoint(ep.id)?.name).toBe('spawnEntity');
  });

  it('returns undefined for unknown id', () => {
    const portal = makePortal();
    expect(portal.getEndpoint('nope')).toBeUndefined();
  });
});

// ── listEndpointsByFabric ─────────────────────────────────────────────

describe('listEndpointsByFabric', () => {
  it('lists only matching fabric endpoints', () => {
    const portal = makePortal();
    portal.registerEndpoint(sampleEndpoint('loom-core'));
    portal.registerEndpoint(sampleEndpoint('selvage'));
    portal.registerEndpoint(sampleEndpoint('loom-core'));
    expect(portal.listEndpointsByFabric('loom-core')).toHaveLength(2);
  });

  it('returns empty array for fabric with no endpoints', () => {
    const portal = makePortal();
    expect(portal.listEndpointsByFabric('archive')).toHaveLength(0);
  });
});

// ── searchApi ─────────────────────────────────────────────────────────

describe('searchApi', () => {
  it('finds endpoints by name substring', () => {
    const portal = makePortal();
    portal.registerEndpoint(sampleEndpoint());
    const results = portal.searchApi('spawn');
    expect(results).toHaveLength(1);
  });

  it('finds endpoints by description keyword', () => {
    const portal = makePortal();
    portal.registerEndpoint(sampleEndpoint());
    const results = portal.searchApi('world');
    expect(results).toHaveLength(1);
  });

  it('returns empty for no match', () => {
    const portal = makePortal();
    portal.registerEndpoint(sampleEndpoint());
    expect(portal.searchApi('zzznomatch')).toHaveLength(0);
  });
});

// ── postThread ────────────────────────────────────────────────────────

describe('postThread', () => {
  it('creates a thread with the opening post', () => {
    const portal = makePortal();
    const t = portal.postThread('How to spawn NPCs', 'This is a long enough body text here.');
    if (typeof t === 'string') throw new Error('Expected thread');
    expect(t.title).toBe('How to spawn NPCs');
    expect(t.posts).toHaveLength(1);
  });

  it('increments totalPosts stat', () => {
    const portal = makePortal();
    portal.postThread('Title one', 'Body text that is long enough for the validator.');
    expect(portal.getStats().totalPosts).toBe(1);
  });

  it('returns body-too-short for short body', () => {
    const portal = makePortal();
    expect(portal.postThread('Title', 'Short')).toBe('body-too-short');
  });
});

// ── replyToThread ─────────────────────────────────────────────────────

describe('replyToThread', () => {
  it('adds a reply to existing thread', () => {
    const portal = makePortal();
    const t = portal.postThread('Title', 'Long enough opening body for the thread.');
    if (typeof t === 'string') throw new Error('Expected thread');
    portal.replyToThread(t.threadId, 'This reply is long enough to be accepted.');
    const thread = portal.getThread(t.threadId);
    expect(thread?.posts).toHaveLength(2);
  });

  it('returns thread-not-found for unknown threadId', () => {
    const portal = makePortal();
    expect(portal.replyToThread('ghost', 'This reply is long enough for the check.')).toBe(
      'thread-not-found',
    );
  });

  it('returns body-too-short for short reply', () => {
    const portal = makePortal();
    const t = portal.postThread('Title', 'Opening body is long enough here.');
    if (typeof t === 'string') throw new Error('Expected thread');
    expect(portal.replyToThread(t.threadId, 'Hi')).toBe('body-too-short');
  });
});

// ── searchForum ───────────────────────────────────────────────────────

describe('searchForum', () => {
  it('matches threads by title', () => {
    const portal = makePortal();
    portal.postThread('NPC spawn tutorial', 'Detailed body content explaining things.');
    const results = portal.searchForum('NPC');
    expect(results).toHaveLength(1);
  });

  it('matches threads by post body', () => {
    const portal = makePortal();
    const t = portal.postThread('General discussion', 'Opening body that is long enough here.');
    if (typeof t === 'string') throw new Error('Expected thread');
    portal.replyToThread(t.threadId, 'FlatBuffers schema for events is very useful here.');
    const results = portal.searchForum('FlatBuffers');
    expect(results).toHaveLength(1);
  });
});

// ── getStats ──────────────────────────────────────────────────────────

describe('getStats', () => {
  it('tracks endpoints, threads, and posts', () => {
    const portal = makePortal();
    portal.registerEndpoint(sampleEndpoint());
    const t = portal.postThread('Thread one', 'Long enough opening body content here.');
    if (typeof t === 'string') throw new Error('Expected thread');
    portal.replyToThread(t.threadId, 'And a reply which is long enough to pass validation.');
    const s = portal.getStats();
    expect(s.totalEndpoints).toBe(1);
    expect(s.totalThreads).toBe(1);
    expect(s.totalPosts).toBe(2);
  });
});
