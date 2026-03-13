/**
 * Witness Protocol - Simulation Tests
 *
 * Validates record creation, batch submission decisions,
 * verification flow, and protocol query/stat behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createWitnessProtocol,
  WITNESS_RECORD_TYPES,
  type WitnessProtocolDeps,
  type RegistryEntry,
  type WitnessRecord,
  type CeremonyRecord,
  type TransactionReceipt,
  type GasEstimate,
} from '../witness-protocol.js';

function makeHarness() {
  let now = 1_000_000n;
  let idCounter = 0;

  const records = new Map<string, WitnessRecord>();
  const ceremonies = new Map<string, CeremonyRecord[]>();
  const pending = new Map<string, RegistryEntry>();
  const submitted = new Map<string, string>();

  const info = vi.fn();
  const warn = vi.fn();
  const error = vi.fn();
  const emit = vi.fn();

  let gasBudgetOverride: ((entryCount: number) => GasEstimate) | undefined;
  let verifyResult = true;

  const deps: WitnessProtocolDeps = {
    clock: { now: () => now },
    ids: { next: () => `w-${++idCounter}` },
    log: { info, warn, error },
    events: { emit },
    chain: {
      submitBatch: async (entries) => ({
        txHash: `0xtx${entries.length}`,
        blockNumber: 500n,
        gasUsed: BigInt(entries.length * 100_000),
        entryCount: entries.length,
        merkleRoot: `mr-${entries.length}`,
        chainId: 'test-l2',
        timestamp: now,
      }),
      verifyEntry: async () => verifyResult,
      getExplorerUrl: (txHash) => `https://explorer.local/tx/${txHash}`,
      estimateGas: async (entryCount) => {
        if (gasBudgetOverride) return gasBudgetOverride(entryCount);
        return {
          estimatedGasUnits: BigInt(entryCount * 100_000),
          estimatedCostUsd: Number((entryCount * 5) / 100),
          entryCount,
          withinBudget: entryCount <= 2,
        };
      },
      getChainId: () => 'test-l2',
    },
    store: {
      saveRecord: async (record) => {
        records.set(record.id, record);
        if (!record.entry.submitted) {
          pending.set(record.entry.id, record.entry);
        }
      },
      getRecord: async (recordId) => records.get(recordId),
      getRecordsByDynasty: async (dynastyId) =>
        [...records.values()].filter((record) => record.entry.metadata.dynastyId === dynastyId),
      getRecordsByWorld: async (worldId) =>
        [...records.values()].filter((record) => record.entry.metadata.worldId === worldId),
      getPendingEntries: async () => [...pending.values()],
      markEntrySubmitted: async (entryId, txHash) => {
        const entry = pending.get(entryId);
        if (!entry) return;
        pending.delete(entryId);
        submitted.set(entryId, txHash);

        for (const [id, record] of records.entries()) {
          if (record.entry.id === entryId) {
            records.set(id, {
              ...record,
              entry: { ...record.entry, submitted: true, txHash },
            });
            break;
          }
        }
      },
      saveCeremony: async (ceremony) => {
        const bucket = ceremonies.get(ceremony.dynastyId) ?? [];
        ceremonies.set(ceremony.dynastyId, [...bucket, ceremony]);
      },
      getCeremonies: async (dynastyId) => ceremonies.get(dynastyId) ?? [],
    },
    hash: {
      sha256: (data) => `h(${data})`,
      merkleRoot: (hashes) => `m(${hashes.join('|')})`,
    },
  };

  const engine = createWitnessProtocol(deps, {
    minEntriesForBatch: 2,
    maxBatchSize: 4,
  });

  return {
    engine,
    records,
    ceremonies,
    pending,
    submitted,
    info,
    warn,
    error,
    emit,
    setNow: (value: bigint) => {
      now = value;
    },
    setGasEstimator: (fn: (entryCount: number) => GasEstimate) => {
      gasBudgetOverride = fn;
    },
    setVerifyResult: (value: boolean) => {
      verifyResult = value;
    },
  };
}

describe('WitnessProtocolEngine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes witness record type catalog', () => {
    expect(WITNESS_RECORD_TYPES).toContain('dynasty-founding');
    expect(WITNESS_RECORD_TYPES).toContain('ceremony-attestation');
    expect(WITNESS_RECORD_TYPES.length).toBeGreaterThanOrEqual(5);
  });

  it('registers dynasty founding as a pending witness record', async () => {
    const { engine, records, pending, emit } = makeHarness();

    const record = await engine.registerDynasty({
      dynastyId: 'dyn-a',
      dynastyName: 'House A',
      founderId: 'p1',
      founderName: 'Founder',
      foundedAt: 1000n,
      worldId: 'w-1',
      motto: 'Rise',
    });

    expect(records.get(record.id)?.entry.recordType).toBe('dynasty-founding');
    expect(pending.size).toBe(1);
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'witness.dynasty-registered' }));
  });

  it('registers world milestone record with world metadata', async () => {
    const { engine, records } = makeHarness();

    const record = await engine.registerWorldMilestone({
      worldId: 'world-z',
      milestoneType: 'restoration',
      description: 'Luminance reached 100',
      achievedAt: 2000n,
      value: 100,
      achievedBy: 'p2',
    });

    expect(records.get(record.id)?.entry.recordType).toBe('world-milestone');
    expect(records.get(record.id)?.entry.metadata.worldId).toBe('world-z');
  });

  it('generates player digest using merkle root and achievement count', async () => {
    const { engine, records } = makeHarness();

    const record = await engine.generatePlayerDigest('p3', 'dyn-b', ['a1', 'a2', 'a3'], 1n, 2n);
    const saved = records.get(record.id);

    expect(saved?.entry.recordType).toBe('player-milestone');
    expect(saved?.entry.metadata.description).toContain('3 achievements');
  });

  it('records ceremonies with attestation hash and retrievable dynasty history', async () => {
    const { engine } = makeHarness();

    const ceremony = await engine.recordCeremony('founding', 'dyn-c', 'world-c', ['p1', 'p2'], 'Founding ritual');
    const byDynasty = await engine.getCeremonies('dyn-c');

    expect(ceremony.entry?.recordType).toBe('ceremony-attestation');
    expect(ceremony.attestationHash).toContain('h(');
    expect(byDynasty).toHaveLength(1);
    expect(byDynasty[0]?.id).toBe(ceremony.id);
  });

  it('returns undefined when pending entries are below minimum batch size', async () => {
    const { engine } = makeHarness();

    await engine.registerDynasty({
      dynastyId: 'dyn-low',
      dynastyName: 'Low',
      founderId: 'p',
      founderName: 'F',
      foundedAt: 1n,
      worldId: 'w',
    });

    const result = await engine.submitBatch();
    expect(result).toBeUndefined();
  });

  it('submits full batch when gas estimate is within budget', async () => {
    const { engine, pending, submitted, emit } = makeHarness();

    await engine.registerDynasty({ dynastyId: 'd1', dynastyName: 'D1', founderId: 'p1', founderName: 'F1', foundedAt: 1n, worldId: 'w1' });
    await engine.registerWorldMilestone({ worldId: 'w1', milestoneType: 'm', description: 'desc', achievedAt: 2n });

    const result = await engine.submitBatch();

    expect(result).toBeDefined();
    expect(result?.entryCount).toBe(2);
    expect(result?.receipt.entryCount).toBe(2);
    expect(pending.size).toBe(0);
    expect(submitted.size).toBe(2);
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'witness.batch-submitted' }));
  });

  it('reduces batch size when initial gas exceeds budget but reduced fits', async () => {
    const { engine, setGasEstimator } = makeHarness();

    setGasEstimator((entryCount) => ({
      estimatedGasUnits: BigInt(entryCount * 100_000),
      estimatedCostUsd: entryCount <= 2 ? 0.08 : 0.2,
      entryCount,
      withinBudget: entryCount <= 2,
    }));

    await engine.registerDynasty({ dynastyId: 'd1', dynastyName: 'D1', founderId: 'p1', founderName: 'F1', foundedAt: 1n, worldId: 'w1' });
    await engine.registerDynasty({ dynastyId: 'd2', dynastyName: 'D2', founderId: 'p2', founderName: 'F2', foundedAt: 1n, worldId: 'w1' });
    await engine.registerDynasty({ dynastyId: 'd3', dynastyName: 'D3', founderId: 'p3', founderName: 'F3', foundedAt: 1n, worldId: 'w1' });

    const result = await engine.submitBatch();

    expect(result).toBeDefined();
    expect(result?.entryCount).toBe(1); // halved from 3 -> floor 1
  });

  it('returns undefined when gas remains over budget even after reduction', async () => {
    const { engine, setGasEstimator, error } = makeHarness();

    setGasEstimator((entryCount) => ({
      estimatedGasUnits: BigInt(entryCount * 100_000),
      estimatedCostUsd: 1,
      entryCount,
      withinBudget: false,
    }));

    await engine.registerDynasty({ dynastyId: 'dx', dynastyName: 'DX', founderId: 'px', founderName: 'FX', foundedAt: 1n, worldId: 'wx' });
    await engine.registerWorldMilestone({ worldId: 'wx', milestoneType: 'm', description: 'd', achievedAt: 2n });

    const result = await engine.submitBatch();

    expect(result).toBeUndefined();
    expect(error).toHaveBeenCalled();
  });

  it('estimates gas from current pending entry count', async () => {
    const { engine } = makeHarness();

    await engine.registerDynasty({ dynastyId: 'd1', dynastyName: 'D1', founderId: 'p1', founderName: 'F1', foundedAt: 1n, worldId: 'w1' });
    await engine.registerDynasty({ dynastyId: 'd2', dynastyName: 'D2', founderId: 'p2', founderName: 'F2', foundedAt: 1n, worldId: 'w1' });

    const estimate = await engine.estimateGas();
    expect(estimate.entryCount).toBe(2);
  });

  it('verifies record on-chain and persists verification metadata', async () => {
    const { engine, records, submitted, setVerifyResult } = makeHarness();

    const rec = await engine.registerDynasty({ dynastyId: 'd1', dynastyName: 'D1', founderId: 'p1', founderName: 'F1', foundedAt: 1n, worldId: 'w1' });
    await engine.registerWorldMilestone({ worldId: 'w1', milestoneType: 'm', description: 'x', achievedAt: 2n });
    await engine.submitBatch();

    const entryId = records.get(rec.id)?.entry.id;
    if (entryId) {
      expect(submitted.has(entryId)).toBe(true);
    }

    setVerifyResult(true);
    const verified = await engine.verifyRecord(rec.id);
    const updated = records.get(rec.id);

    expect(verified).toBe(true);
    expect(updated?.verified).toBe(true);
    expect(updated?.verifiedAt).toBeDefined();
    expect(updated?.explorerUrl).toContain('https://explorer.local/tx/');
  });

  it('returns false on verification when record has no tx hash', async () => {
    const { engine } = makeHarness();
    const rec = await engine.registerDynasty({ dynastyId: 'd', dynastyName: 'D', founderId: 'p', founderName: 'F', foundedAt: 1n, worldId: 'w' });

    const verified = await engine.verifyRecord(rec.id);
    expect(verified).toBe(false);
  });

  it('throws when verifying a missing record', async () => {
    const { engine } = makeHarness();
    await expect(engine.verifyRecord('missing-record')).rejects.toThrow('Record missing-record not found');
  });

  it('filters records by dynasty and world from store', async () => {
    const { engine } = makeHarness();

    await engine.registerDynasty({ dynastyId: 'dyn-a', dynastyName: 'A', founderId: 'p1', founderName: 'F1', foundedAt: 1n, worldId: 'w-1' });
    await engine.registerDynasty({ dynastyId: 'dyn-b', dynastyName: 'B', founderId: 'p2', founderName: 'F2', foundedAt: 1n, worldId: 'w-2' });

    const byDynasty = await engine.getDynastyRecords('dyn-a');
    const byWorld = await engine.getWorldRecords('w-2');

    expect(byDynasty).toHaveLength(1);
    expect(byWorld).toHaveLength(1);
  });

  it('returns explorer URLs and protocol stats with chain id', async () => {
    const { engine } = makeHarness();
    await engine.registerDynasty({ dynastyId: 'd1', dynastyName: 'D1', founderId: 'p1', founderName: 'F1', foundedAt: 1n, worldId: 'w1' });

    expect(engine.getExplorerUrl('0xabc')).toBe('https://explorer.local/tx/0xabc');

    const stats = await engine.getStats();
    expect(stats.pendingEntries).toBe(1);
    expect(stats.chainId).toBe('test-l2');
  });
});
