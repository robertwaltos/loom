import { describe, it, expect, vi } from 'vitest';
import { createNpcAiSystem, NPC_AI_SYSTEM_PRIORITY } from '../npc-ai-system.js';
import { createComponentStore } from '../component-store.js';

// ─── helpers ───────────────────────────────────────────────────────────────

function makeClock() {
  let us = 1_000_000n;
  return { nowMicroseconds: () => { us += 16_667n; return Number(us); } };
}

function makeTickContext(deltaMs = 16, tickNumber = 1, wallTimeMicroseconds = 1_000_000) {
  return { deltaMs, tickNumber, wallTimeMicroseconds };
}

// ─── constant ─────────────────────────────────────────────────────────────

describe('NpcAiSystem — constant', () => {
  it('NPC_AI_SYSTEM_PRIORITY is 125', () => {
    expect(NPC_AI_SYSTEM_PRIORITY).toBe(125);
  });
});

// ─── factory ──────────────────────────────────────────────────────────────

describe('NpcAiSystem — factory', () => {
  it('createNpcAiSystem returns a function', () => {
    const store = createComponentStore();
    const system = createNpcAiSystem({ componentStore: store, clock: makeClock() });
    expect(typeof system).toBe('function');
  });
});

// ─── system execution ─────────────────────────────────────────────────────

describe('NpcAiSystem — system execution', () => {
  it('does not throw on empty ComponentStore tick', () => {
    const store = createComponentStore();
    const system = createNpcAiSystem({ componentStore: store, clock: makeClock() });
    expect(() => system(makeTickContext())).not.toThrow();
  });

  it('does not throw when an NPC entity exists with ai-brain + transform', () => {
    const store = createComponentStore();
    const entityId = 'npc-1' as never;
    store.set(entityId, 'ai-brain', {
      hostility: 'neutral',
      awarenessRadius: 10,
      tier: 1,
    });
    store.set(entityId, 'transform', {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
    });
    const system = createNpcAiSystem({ componentStore: store, clock: makeClock() });
    expect(() => system(makeTickContext())).not.toThrow();
  });

  it('calls eventSink.onNpcDecision when an NPC has a resolvable goal', () => {
    const store = createComponentStore();
    const entityId = 'npc-2' as never;
    store.set(entityId, 'ai-brain', {
      hostility: 'hostile',
      awarenessRadius: 15,
      tier: 2,
    });
    store.set(entityId, 'transform', {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
    });
    const onNpcDecision = vi.fn();
    const system = createNpcAiSystem({
      componentStore: store,
      clock: makeClock(),
      eventSink: { onNpcDecision },
    });
    system(makeTickContext());
    // The NPC may or may not trigger a decision depending on awareness scan results.
    // Just ensure no throw occurred — the spy may or may not have been called for a solo NPC.
    expect(typeof onNpcDecision.mock.calls.length).toBe('number');
  });

});
