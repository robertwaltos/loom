/**
 * Mortality-Connect Adapter — Bridges player connection lifecycle to mortality.
 *
 * When a player connects, the adapter calls mortality.recordLogin so the
 * dynasty's continuity timer resets. When a player disconnects, the adapter
 * calls presence.disconnect so the presence tracker marks them offline
 * (which eventually triggers dormancy evaluation in the next tick).
 *
 * This adapter implements ConnectLifecyclePort from the PlayerConnectOrchestrator,
 * completing the vertical slice: auth → connect → spawn → mortality notification.
 *
 * Bible v1.1 Part 8: "Before implementing any mechanic that touches inactive
 * dynasties, ask: what does this do to the player who logged in once a month
 * to write one Chronicle entry for someone they lost?"
 */

// ── Port Interfaces ─────────────────────────────────────────────

export interface MortalityRecordPort {
  readonly recordLogin: (dynastyId: string) => MortalityLoginResult | null;
}

export interface MortalityLoginResult {
  readonly dynastyId: string;
  readonly from: string;
  readonly to: string;
}

export interface PresenceDisconnectPort {
  readonly disconnect: (dynastyId: string) => void;
}

// ── Public Interface ────────────────────────────────────────────

export interface MortalityConnectLifecycle {
  readonly onConnect: (dynastyId: string, worldId: string) => void;
  readonly onDisconnect: (connectionId: string) => void;
}

// ── Deps ────────────────────────────────────────────────────────

export interface MortalityConnectDeps {
  readonly mortality: MortalityRecordPort;
  readonly presence?: PresenceDisconnectPort;
  readonly connectionResolver?: ConnectionResolverPort;
}

export interface ConnectionResolverPort {
  readonly getDynastyForConnection: (connectionId: string) => string | undefined;
}

// ── Stats ───────────────────────────────────────────────────────

export interface MortalityConnectStats {
  readonly loginsRecorded: number;
  readonly loginsRecovered: number;
  readonly disconnectsProcessed: number;
}

// ── Adapter with Stats ──────────────────────────────────────────

export interface MortalityConnectAdapter {
  readonly lifecycle: MortalityConnectLifecycle;
  readonly getStats: () => MortalityConnectStats;
}

// ── State ───────────────────────────────────────────────────────

interface AdapterState {
  readonly deps: MortalityConnectDeps;
  loginsRecorded: number;
  loginsRecovered: number;
  disconnectsProcessed: number;
}

// ── Factory ─────────────────────────────────────────────────────

function createMortalityConnectAdapter(deps: MortalityConnectDeps): MortalityConnectAdapter {
  const state: AdapterState = {
    deps,
    loginsRecorded: 0,
    loginsRecovered: 0,
    disconnectsProcessed: 0,
  };

  return {
    lifecycle: {
      onConnect: (dynastyId, _worldId) => {
        handleConnect(state, dynastyId);
      },
      onDisconnect: (connectionId) => {
        handleDisconnect(state, connectionId);
      },
    },
    getStats: () => buildStats(state),
  };
}

// ── Connect Handler ─────────────────────────────────────────────

function handleConnect(state: AdapterState, dynastyId: string): void {
  state.loginsRecorded += 1;
  const transition = state.deps.mortality.recordLogin(dynastyId);
  if (transition !== null && transition.to === 'active') {
    state.loginsRecovered += 1;
  }
}

// ── Disconnect Handler ──────────────────────────────────────────

function handleDisconnect(state: AdapterState, connectionId: string): void {
  state.disconnectsProcessed += 1;

  if (state.deps.connectionResolver === undefined) return;
  if (state.deps.presence === undefined) return;

  const dynastyId = state.deps.connectionResolver.getDynastyForConnection(connectionId);
  if (dynastyId === undefined) return;

  state.deps.presence.disconnect(dynastyId);
}

// ── Stats ───────────────────────────────────────────────────────

function buildStats(state: AdapterState): MortalityConnectStats {
  return {
    loginsRecorded: state.loginsRecorded,
    loginsRecovered: state.loginsRecovered,
    disconnectsProcessed: state.disconnectsProcessed,
  };
}

// ── Exports ─────────────────────────────────────────────────────

export { createMortalityConnectAdapter };
