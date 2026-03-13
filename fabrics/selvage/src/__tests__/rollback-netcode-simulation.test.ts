import { describe, it, expect } from 'vitest';
import { createRollbackNetcode } from '../rollback-netcode.js';
import type { GameState, ClientInput } from '../rollback-netcode.js';

function makeNetcode() {
  return createRollbackNetcode({
    clock: { nowMs: () => 1000 },
    log: { info: () => {}, warn: () => {} },
    applyInput: (state: GameState, _input: ClientInput): GameState => {
      const nextFrame = state.frame + 1;
      return { frame: nextFrame, entities: state.entities, checksum: `frame-${nextFrame}` };
    },
    computeChecksum: (state: GameState): string => `frame-${state.frame}`,
  });
}

const baseInput: ClientInput = { frame: 1, playerId: 'player-1', actions: ['move'], timestampMs: 1000 };
const baseState: GameState = { frame: 0, entities: [], checksum: 'frame-0' };

describe('Rollback Netcode Simulation', () => {
  it('predicts state from client input', () => {
    const netcode = makeNetcode();

    netcode.predict(baseInput, baseState);

    const predicted = netcode.getPredictedState();
    expect(predicted).toBeDefined();
    expect(predicted!.frame).toBe(1);
    expect(predicted!.checksum).toBe('frame-1');
  });

  it('confirms state from server when prediction matches', () => {
    const netcode = makeNetcode();

    netcode.predict(baseInput, baseState);

    const serverState: GameState = { frame: 1, entities: [], checksum: 'frame-1' };
    const result = netcode.confirm(1, serverState);
    expect(result).toBeDefined();
    expect(result!.divergenceDetected).toBe(false);

    const confirmed = netcode.getConfirmedState();
    expect(confirmed!.frame).toBe(1);
  });

  it('detects misprediction when server state diverges', () => {
    const netcode = makeNetcode();

    netcode.predict(baseInput, baseState);

    // Server state has a different checksum → divergence
    const serverState: GameState = { frame: 1, entities: [], checksum: 'authoritative-different' };
    const result = netcode.confirm(1, serverState);
    expect(result).toBeDefined();
    expect(result!.divergenceDetected).toBe(true);
  });

  it('tracks stats', () => {
    const netcode = makeNetcode();
    netcode.predict(baseInput, baseState);
    const confirmState: GameState = { frame: 1, entities: [], checksum: 'frame-1' };
    netcode.confirm(1, confirmState);
    const stats = netcode.getStats();
    expect(stats.totalPredictions).toBeGreaterThanOrEqual(1);
  });
});
