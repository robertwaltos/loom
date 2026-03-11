/**
 * Mortality-Connect Adapter — Proves lifecycle bridge works correctly.
 */

import { describe, it, expect } from 'vitest';
import { createMortalityConnectAdapter } from '../mortality-connect-adapter.js';
import type { MortalityConnectDeps, MortalityLoginResult } from '../mortality-connect-adapter.js';

// ── Helpers ─────────────────────────────────────────────────────

function createMockMortality(): MortalityConnectDeps['mortality'] & {
  readonly logins: string[];
} {
  const logins: string[] = [];
  return {
    logins,
    recordLogin: (dynastyId) => {
      logins.push(dynastyId);
      return null;
    },
  };
}

function createRecoveringMortality(): MortalityConnectDeps['mortality'] & {
  readonly logins: string[];
} {
  const logins: string[] = [];
  return {
    logins,
    recordLogin: (dynastyId): MortalityLoginResult => {
      logins.push(dynastyId);
      return { dynastyId, from: 'dormant_30', to: 'active' };
    },
  };
}

function createMockPresence(): MortalityConnectDeps['presence'] & {
  readonly disconnected: string[];
} {
  const disconnected: string[] = [];
  return {
    disconnected,
    disconnect: (dynastyId) => {
      disconnected.push(dynastyId);
    },
  };
}

function createMockResolver(
  mapping: Record<string, string>,
): MortalityConnectDeps['connectionResolver'] {
  return {
    getDynastyForConnection: (connectionId) => mapping[connectionId],
  };
}

// ── Connect Lifecycle ───────────────────────────────────────────

describe('MortalityConnectAdapter — onConnect', () => {
  it('records login when player connects', () => {
    const mortality = createMockMortality();
    const adapter = createMortalityConnectAdapter({ mortality });

    adapter.lifecycle.onConnect('d-1', 'earth');

    expect(mortality.logins).toEqual(['d-1']);
    expect(adapter.getStats().loginsRecorded).toBe(1);
  });

  it('tracks recovery when login restores dynasty', () => {
    const mortality = createRecoveringMortality();
    const adapter = createMortalityConnectAdapter({ mortality });

    adapter.lifecycle.onConnect('d-1', 'earth');

    expect(adapter.getStats().loginsRecovered).toBe(1);
  });

  it('does not count recovery for non-recovery transitions', () => {
    const mortality = createMockMortality();
    const adapter = createMortalityConnectAdapter({ mortality });

    adapter.lifecycle.onConnect('d-1', 'earth');

    expect(adapter.getStats().loginsRecovered).toBe(0);
  });

  it('handles multiple connects', () => {
    const mortality = createMockMortality();
    const adapter = createMortalityConnectAdapter({ mortality });

    adapter.lifecycle.onConnect('d-1', 'earth');
    adapter.lifecycle.onConnect('d-2', 'mars');
    adapter.lifecycle.onConnect('d-3', 'earth');

    expect(mortality.logins).toEqual(['d-1', 'd-2', 'd-3']);
    expect(adapter.getStats().loginsRecorded).toBe(3);
  });
});

// ── Disconnect Lifecycle ────────────────────────────────────────

describe('MortalityConnectAdapter — onDisconnect', () => {
  it('resolves dynasty and disconnects presence', () => {
    const mortality = createMockMortality();
    const presence = createMockPresence();
    const connectionResolver = createMockResolver({ 'conn-1': 'd-1' });
    const adapter = createMortalityConnectAdapter({
      mortality,
      presence,
      connectionResolver,
    });

    adapter.lifecycle.onDisconnect('conn-1');

    expect(presence.disconnected).toEqual(['d-1']);
    expect(adapter.getStats().disconnectsProcessed).toBe(1);
  });

  it('handles unknown connection gracefully', () => {
    const mortality = createMockMortality();
    const presence = createMockPresence();
    const connectionResolver = createMockResolver({});
    const adapter = createMortalityConnectAdapter({
      mortality,
      presence,
      connectionResolver,
    });

    adapter.lifecycle.onDisconnect('conn-unknown');

    expect(presence.disconnected).toEqual([]);
    expect(adapter.getStats().disconnectsProcessed).toBe(1);
  });

  it('handles missing resolver gracefully', () => {
    const mortality = createMockMortality();
    const adapter = createMortalityConnectAdapter({ mortality });

    adapter.lifecycle.onDisconnect('conn-1');

    expect(adapter.getStats().disconnectsProcessed).toBe(1);
  });

  it('handles missing presence port gracefully', () => {
    const mortality = createMockMortality();
    const connectionResolver = createMockResolver({ 'conn-1': 'd-1' });
    const adapter = createMortalityConnectAdapter({
      mortality,
      connectionResolver,
    });

    adapter.lifecycle.onDisconnect('conn-1');

    expect(adapter.getStats().disconnectsProcessed).toBe(1);
  });
});

// ── Stats ───────────────────────────────────────────────────────

describe('MortalityConnectAdapter — stats', () => {
  it('starts with zero stats', () => {
    const mortality = createMockMortality();
    const adapter = createMortalityConnectAdapter({ mortality });
    const stats = adapter.getStats();

    expect(stats.loginsRecorded).toBe(0);
    expect(stats.loginsRecovered).toBe(0);
    expect(stats.disconnectsProcessed).toBe(0);
  });

  it('accumulates across multiple operations', () => {
    const mortality = createRecoveringMortality();
    const presence = createMockPresence();
    const connectionResolver = createMockResolver({ 'conn-1': 'd-1' });
    const adapter = createMortalityConnectAdapter({
      mortality,
      presence,
      connectionResolver,
    });

    adapter.lifecycle.onConnect('d-1', 'earth');
    adapter.lifecycle.onConnect('d-2', 'mars');
    adapter.lifecycle.onDisconnect('conn-1');

    const stats = adapter.getStats();
    expect(stats.loginsRecorded).toBe(2);
    expect(stats.loginsRecovered).toBe(2);
    expect(stats.disconnectsProcessed).toBe(1);
  });
});
