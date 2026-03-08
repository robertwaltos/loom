/**
 * Nakama System — Proves the ECS adapter bridges correctly.
 */

import { describe, it, expect } from 'vitest';
import { createNakamaSystem, NAKAMA_SYSTEM_PRIORITY } from '../nakama-system.js';
import type { NakamaSystemOrchestrator, NakamaSystemTickResult } from '../nakama-system.js';
import type { SystemContext } from '../system-registry.js';

function mockOrchestrator(): NakamaSystemOrchestrator & { readonly tickCount: () => number } {
  let ticks = 0;
  return {
    tick: (): NakamaSystemTickResult => {
      ticks += 1;
      return { idleSwept: 0, continuityTransitions: 0, integrityChanges: 0, tickNumber: ticks };
    },
    tickCount: () => ticks,
  };
}

function ctx(tick: number): SystemContext {
  return { deltaMs: 33, tickNumber: tick, wallTimeMicroseconds: tick * 33000 };
}

describe('NakamaSystem — adapter', () => {
  it('calls orchestrator tick each system tick', () => {
    const orch = mockOrchestrator();
    const system = createNakamaSystem({ orchestrator: orch });

    system(ctx(1));
    system(ctx(2));

    expect(orch.tickCount()).toBe(2);
  });

  it('has correct priority constant', () => {
    expect(NAKAMA_SYSTEM_PRIORITY).toBe(100);
  });

  it('does not throw on empty tick result', () => {
    const orch = mockOrchestrator();
    const system = createNakamaSystem({ orchestrator: orch });

    expect(() => { system(ctx(1)); }).not.toThrow();
  });
});
