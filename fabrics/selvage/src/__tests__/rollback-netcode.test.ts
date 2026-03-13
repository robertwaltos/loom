import { describe, it, expect } from 'vitest';
import {
  createRollbackNetcode,
  type ClientInput,
  type GameState,
  type RollbackNetecodeDeps,
} from '../rollback-netcode.js';

// ── Test helpers ──────────────────────────────────────────────────────

function makeState(frame: number, checksum = 'ok'): GameState {
  return Object.freeze({ frame, entities: [], checksum });
}

function makeInput(frame: number, actions: string[] = ['move']): ClientInput {
  return Object.freeze({ frame, playerId: 'p1', actions, timestampMs: frame * 16 });
}

/** Applies input by bumping frame; checksum comes from joined actions. */
function applyInput(state: GameState, input: ClientInput): GameState {
  return makeState(input.frame, input.actions.join('+'));
}

function computeChecksum(state: GameState): string {
  return state.checksum;
}

function makeDeps(): RollbackNetecodeDeps {
  return {
    clock: { nowMs: () => Date.now() },
    log: { info: () => undefined, warn: () => undefined },
    applyInput,
    computeChecksum,
  };
}

// ── predict ───────────────────────────────────────────────────────────

describe('predict', () => {
  it('returns the state after applying an input', () => {
    const engine = createRollbackNetcode(makeDeps());
    const base = makeState(0);
    const result = engine.predict(makeInput(1, ['jump']), base);
    expect(result.frame).toBe(1);
    expect(result.state.checksum).toBe('jump');
  });

  it('increments buffered input count with each prediction', () => {
    const engine = createRollbackNetcode(makeDeps());
    const base = makeState(0);
    engine.predict(makeInput(1), base);
    const r2 = engine.predict(makeInput(2), makeState(1));
    expect(r2.bufferedInputCount).toBe(2);
  });

  it('exposes the predicted state via getPredictedState', () => {
    const engine = createRollbackNetcode(makeDeps());
    const base = makeState(0);
    engine.predict(makeInput(1, ['dash']), base);
    expect(engine.getPredictedState()?.checksum).toBe('dash');
  });
});

// ── confirm — no divergence ────────────────────────────────────────────

describe('confirm (no divergence)', () => {
  it('returns undefined when no prediction exists yet', () => {
    const engine = createRollbackNetcode(makeDeps());
    const result = engine.confirm(1, makeState(1));
    expect(result).toBeUndefined();
  });

  it('stores confirmed state', () => {
    const engine = createRollbackNetcode(makeDeps());
    engine.predict(makeInput(1, ['move']), makeState(0));
    const serverState = makeState(1, 'move');
    engine.confirm(1, serverState);
    expect(engine.getConfirmedState()?.frame).toBe(1);
  });

  it('reports no divergence when checksums match', () => {
    const engine = createRollbackNetcode(makeDeps());
    engine.predict(makeInput(1, ['move']), makeState(0));
    const result = engine.confirm(1, makeState(1, 'move'));
    expect(result?.divergenceDetected).toBe(false);
  });
});

// ── confirm — rollback ─────────────────────────────────────────────────

describe('confirm (rollback)', () => {
  it('detects divergence when server checksum differs', () => {
    const engine = createRollbackNetcode(makeDeps());
    engine.predict(makeInput(1, ['jump']), makeState(0));
    const result = engine.confirm(1, makeState(1, 'SERVER_DIFFERENT'));
    expect(result?.divergenceDetected).toBe(true);
  });

  it('re-applies buffered inputs after rollback', () => {
    const engine = createRollbackNetcode(makeDeps());
    engine.predict(makeInput(1, ['move']), makeState(0));
    engine.predict(makeInput(2, ['fire']), makeState(1, 'move'));
    engine.confirm(1, makeState(1, 'SERVER_CORRECTED'));
    // After rollback, predicted state re-applied input frame 2
    expect(engine.getPredictedState()?.checksum).toBe('fire');
  });

  it('increments misprediction counter on divergence', () => {
    const engine = createRollbackNetcode(makeDeps());
    engine.predict(makeInput(1, ['jump']), makeState(0));
    engine.confirm(1, makeState(1, 'diverged'));
    expect(engine.getStats().totalMispredictions).toBe(1);
  });
});

// ── getStats ──────────────────────────────────────────────────────────

describe('getStats', () => {
  it('starts at all zeros', () => {
    const s = createRollbackNetcode(makeDeps()).getStats();
    expect(s.totalPredictions).toBe(0);
    expect(s.totalRollbacks).toBe(0);
    expect(s.totalMispredictions).toBe(0);
    expect(s.maxRollbackDepth).toBe(0);
    expect(s.currentBufferDepth).toBe(0);
  });

  it('tracks predictions and max depth', () => {
    const engine = createRollbackNetcode(makeDeps());
    engine.predict(makeInput(1), makeState(0));
    engine.predict(makeInput(2), makeState(1));
    engine.predict(makeInput(3), makeState(2));
    const s = engine.getStats();
    expect(s.totalPredictions).toBe(3);
    expect(s.maxRollbackDepth).toBe(3);
    expect(s.currentBufferDepth).toBe(3);
  });

  it('prunes buffer after confirmation', () => {
    const engine = createRollbackNetcode(makeDeps());
    engine.predict(makeInput(1, ['a']), makeState(0));
    engine.predict(makeInput(2, ['b']), makeState(1, 'a'));
    engine.confirm(1, makeState(1, 'a'));
    expect(engine.getStats().currentBufferDepth).toBe(1);
  });
});
