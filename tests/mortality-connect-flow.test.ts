/**
 * Mortality-Connect Flow -- Integration test.
 *
 * Proves the vertical slice from player connect through mortality
 * notification dispatch. The flow:
 *
 *   1. Player connects -> lifecycle hook fires
 *   2. MortalityConnectAdapter records login via mortality bridge
 *   3. Mortality engine reactivates dormant dynasties
 *   4. If dynasty was dormant, recovery is detected via transition result
 *   5. On disconnect, presence is notified
 *
 * Uses real services: DynastyMortalityEngine, MortalityConnectAdapter.
 * Bridges the new engine API to the adapter's MortalityRecordPort.
 */

import { describe, it, expect } from 'vitest';
import { createDynastyMortalityEngine } from '@loom/nakama-fabric';
import type { DynastyMortalityEngine, MortalityDeps, MortalityEvent } from '@loom/nakama-fabric';
import { createMortalityConnectAdapter } from '@loom/loom-core';
import type { MortalityRecordPort, MortalityLoginResult } from '@loom/loom-core';

// ── Helpers ──────────────────────────────────────────────────────

let idCounter = 0;

function createMortalityDeps(): {
  readonly deps: MortalityDeps;
  readonly events: MortalityEvent[];
} {
  idCounter = 0;
  const events: MortalityEvent[] = [];
  return {
    events,
    deps: {
      clock: { nowMicroseconds: () => 1_000_000 },
      idGenerator: { next: () => `id-${String(++idCounter)}` },
      notifications: {
        notify: (event) => {
          events.push(event);
        },
      },
    },
  };
}

/**
 * Bridges DynastyMortalityEngine to MortalityRecordPort.
 *
 * On "login", if the dynasty is DORMANT, reactivate it and return
 * the transition as a MortalityLoginResult. If the dynasty is ACTIVE,
 * return null (no state change). If not registered, register first.
 */
function bridgeEngineToRecordPort(engine: DynastyMortalityEngine): MortalityRecordPort {
  return {
    recordLogin: (dynastyId): MortalityLoginResult | null => {
      const record = engine.getRecord(dynastyId);

      if (record === undefined) {
        engine.registerDynasty(dynastyId);
        return null;
      }

      if (record.state === 'DORMANT') {
        const result = engine.reactivate(dynastyId);
        if (typeof result === 'string') return null;
        return {
          dynastyId: result.dynastyId,
          from: result.from.toLowerCase(),
          to: result.to.toLowerCase(),
        };
      }

      return null;
    },
  };
}

// ── Integration: Connect -> Mortality -> Login ─────────────────────

describe('Mortality-Connect Flow -- login recording', () => {
  it('records login when player connects through lifecycle', () => {
    const { deps } = createMortalityDeps();
    const engine = createDynastyMortalityEngine(deps);
    const mortality = bridgeEngineToRecordPort(engine);
    const adapter = createMortalityConnectAdapter({ mortality });

    adapter.lifecycle.onConnect('dynasty-alice', 'earth');

    const stats = engine.getStats();
    expect(stats.totalRegistered).toBe(1);
    expect(stats.activeCount).toBe(1);
    expect(adapter.getStats().loginsRecorded).toBe(1);
  });

  it('sends recovery notification when dormant dynasty logs in', () => {
    const { deps, events } = createMortalityDeps();
    const engine = createDynastyMortalityEngine(deps);
    const mortality = bridgeEngineToRecordPort(engine);
    const adapter = createMortalityConnectAdapter({ mortality });

    // Register and set dormant before the "login"
    engine.registerDynasty('dynasty-bob');
    engine.setDormant('dynasty-bob', 'Player inactive');

    // Clear events from setup steps
    events.length = 0;

    // Now connect -- should reactivate the dormant dynasty
    adapter.lifecycle.onConnect('dynasty-bob', 'mars');

    // Engine should have emitted a state_changed event for reactivation
    const stateChanges = events.filter((e) => e.type === 'state_changed');
    expect(stateChanges).toHaveLength(1);
    const reactivation = stateChanges[0];
    expect(reactivation).toBeDefined();
    if (reactivation === undefined) return;
    expect(reactivation.dynastyId).toBe('dynasty-bob');
    expect(reactivation.payload['to']).toBe('ACTIVE');

    // Adapter should track the recovery
    expect(adapter.getStats().loginsRecovered).toBe(1);

    // Engine should show dynasty back to ACTIVE
    const record = engine.getRecord('dynasty-bob');
    expect(record).toBeDefined();
    if (record === undefined) return;
    expect(record.state).toBe('ACTIVE');
  });
});

// ── Integration: Connect -> Mortality -> Tick ──────────────────────

describe('Mortality-Connect Flow -- multi-player session', () => {
  it('tracks multiple concurrent player logins', () => {
    const { deps } = createMortalityDeps();
    const engine = createDynastyMortalityEngine(deps);
    const mortality = bridgeEngineToRecordPort(engine);
    const adapter = createMortalityConnectAdapter({ mortality });

    adapter.lifecycle.onConnect('d-1', 'earth');
    adapter.lifecycle.onConnect('d-2', 'earth');
    adapter.lifecycle.onConnect('d-3', 'mars');

    const stats = engine.getStats();
    expect(stats.totalRegistered).toBe(3);
    expect(stats.activeCount).toBe(3);
    expect(adapter.getStats().loginsRecorded).toBe(3);
  });
});

// ── Integration: Disconnect -> Presence ───────────────────────────

describe('Mortality-Connect Flow -- disconnect', () => {
  it('disconnects presence when player disconnects', () => {
    const disconnected: string[] = [];
    const { deps } = createMortalityDeps();
    const engine = createDynastyMortalityEngine(deps);
    const mortality = bridgeEngineToRecordPort(engine);
    const adapter = createMortalityConnectAdapter({
      mortality,
      presence: {
        disconnect: (dynastyId) => {
          disconnected.push(dynastyId);
        },
      },
      connectionResolver: {
        getDynastyForConnection: (connId) => {
          if (connId === 'conn-1') return 'd-1';
          return undefined;
        },
      },
    });

    adapter.lifecycle.onConnect('d-1', 'earth');
    adapter.lifecycle.onDisconnect('conn-1');

    expect(disconnected).toEqual(['d-1']);
    expect(adapter.getStats().disconnectsProcessed).toBe(1);
  });

  it('handles disconnect for unknown connection', () => {
    const { deps } = createMortalityDeps();
    const engine = createDynastyMortalityEngine(deps);
    const mortality = bridgeEngineToRecordPort(engine);
    const adapter = createMortalityConnectAdapter({
      mortality,
      presence: {
        disconnect: () => {
          /* noop */
        },
      },
      connectionResolver: {
        getDynastyForConnection: () => undefined,
      },
    });

    adapter.lifecycle.onDisconnect('conn-unknown');
    expect(adapter.getStats().disconnectsProcessed).toBe(1);
  });
});
