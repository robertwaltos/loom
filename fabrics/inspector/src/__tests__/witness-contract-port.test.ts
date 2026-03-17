import { describe, it, expect } from 'vitest';
import {
  hashRecord,
  buildMerkleTree,
  buildMerkleProof,
  verifyMerkleProof,
  buildBatch,
  createMockWitnessRegistryPort,
  type WitnessRecord,
} from '../witness-contract-port.js';

const makeRecord = (id: string, subject: string = 'player-1'): WitnessRecord => ({
  id,
  type: 'dynasty-founding',
  worldId: 'great-archive',
  subject,
  description: `Dynasty ${id} founded`,
  timestampMs: 1_700_000_000_000,
});

describe('hashRecord', () => {
  it('returns a 64-char hex string', () => {
    const h = hashRecord(makeRecord('r1'));
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic', () => {
    const r = makeRecord('r2');
    expect(hashRecord(r)).toBe(hashRecord(r));
  });

  it('differs for different records', () => {
    expect(hashRecord(makeRecord('r3'))).not.toBe(hashRecord(makeRecord('r4')));
  });
});

describe('buildMerkleTree', () => {
  it('throws for empty leaves', () => {
    expect(() => buildMerkleTree([])).toThrow();
  });

  it('returns single leaf as root', () => {
    const leaf = 'a'.repeat(64);
    const { root, layers } = buildMerkleTree([leaf]);
    expect(root).toBe(leaf);
    expect(layers).toHaveLength(1);
  });

  it('builds a 2-leaf tree', () => {
    const leaves = ['a'.repeat(64), 'b'.repeat(64)];
    const { root, layers } = buildMerkleTree(leaves);
    expect(layers).toHaveLength(2);
    expect(typeof root).toBe('string');
    expect(root).not.toBe(leaves[0]);
  });

  it('builds a 4-leaf tree with correct depth', () => {
    const leaves = ['a', 'b', 'c', 'd'].map((x) => x.repeat(64));
    const { layers } = buildMerkleTree(leaves);
    expect(layers).toHaveLength(3); // leaf layer + mid + root
  });

  it('handles odd number of leaves', () => {
    const leaves = ['a', 'b', 'c'].map((x) => x.repeat(64));
    const { root } = buildMerkleTree(leaves);
    expect(typeof root).toBe('string');
    expect(root.length).toBe(64);
  });
});

describe('buildMerkleProof + verifyMerkleProof', () => {
  it('verifies a leaf in a 4-leaf tree', () => {
    const leaves = ['a', 'b', 'c', 'd'].map((x) => x.repeat(64));
    const { root, layers } = buildMerkleTree(leaves);
    const target = leaves[0]!;
    const proof  = buildMerkleProof(target, layers);
    expect(verifyMerkleProof(root, target, proof)).toBe(true);
  });

  it('verifies all leaves in a 3-leaf tree', () => {
    const leaves = ['x', 'y', 'z'].map((x) => x.repeat(64));
    const { root, layers } = buildMerkleTree(leaves);
    for (const leaf of [...leaves].sort()) {
      const proof = buildMerkleProof(leaf, layers);
      expect(verifyMerkleProof(root, leaf, proof)).toBe(true);
    }
  });

  it('rejects a tampered leaf', () => {
    const leaves = ['a', 'b'].map((x) => x.repeat(64));
    const { root, layers } = buildMerkleTree(leaves);
    const proof   = buildMerkleProof(leaves[0]!, layers);
    const tampered = 'f'.repeat(64);
    expect(verifyMerkleProof(root, tampered, proof)).toBe(false);
  });
});

describe('buildBatch', () => {
  it('builds a batch with merkle root', () => {
    const records = [makeRecord('r1'), makeRecord('r2'), makeRecord('r3')];
    const batch   = buildBatch(records, 'ipfs://QmTest');
    expect(batch.records).toHaveLength(3);
    expect(batch.merkleRoot).toMatch(/^[0-9a-f]{64}$/);
    expect(batch.recordType).toBe('dynasty-founding');
    expect(batch.metadataUri).toBe('ipfs://QmTest');
  });

  it('throws for empty records', () => {
    expect(() => buildBatch([], 'ipfs://QmTest')).toThrow();
  });

  it('generates stable batchId for same records', () => {
    const records = [makeRecord('r5'), makeRecord('r6')];
    const a = buildBatch(records, 'uri');
    const b = buildBatch(records, 'uri');
    expect(a.batchId).toBe(b.batchId);
  });
});

describe('createMockWitnessRegistryPort', () => {
  it('starts with 0 batches', async () => {
    const port = createMockWitnessRegistryPort();
    expect(await port.batchCount()).toBe(0n);
  });

  it('submits a batch and increments count', async () => {
    const port    = createMockWitnessRegistryPort();
    const records = [makeRecord('r10'), makeRecord('r11')];
    const batch   = buildBatch(records, 'ipfs://Qm1');
    const result  = await port.submitBatch(batch);
    expect(result.entryCount).toBe(2);
    expect(result.merkleRoot).toBe(batch.merkleRoot);
    expect(await port.batchCount()).toBe(1n);
  });

  it('rejects duplicate batchId', async () => {
    const port   = createMockWitnessRegistryPort();
    const batch  = buildBatch([makeRecord('r20')], 'uri');
    await port.submitBatch(batch);
    await expect(port.submitBatch(batch)).rejects.toThrow('Batch already exists');
  });

  it('verifies a record that was submitted', async () => {
    const port    = createMockWitnessRegistryPort();
    const r1      = makeRecord('r30');
    const r2      = makeRecord('r31');
    const batch   = buildBatch([r1, r2], 'uri');
    await port.submitBatch(batch);
    const result = await port.verifyRecord(batch.batchId, r1);
    expect(result.verified).toBe(true);
  });

  it('returns verified=false for unknown batch', async () => {
    const port   = createMockWitnessRegistryPort();
    const result = await port.verifyRecord('unknown-batch-id', makeRecord('r40'));
    expect(result.verified).toBe(false);
  });

  it('batchExists returns true after submission', async () => {
    const port  = createMockWitnessRegistryPort();
    const batch = buildBatch([makeRecord('r50')], 'uri');
    expect(await port.batchExists(batch.batchId)).toBe(false);
    await port.submitBatch(batch);
    expect(await port.batchExists(batch.batchId)).toBe(true);
  });

  it('getSubmittedBatches reflects all submissions', async () => {
    const port = createMockWitnessRegistryPort();
    for (let i = 0; i < 3; i++) {
      await port.submitBatch(buildBatch([makeRecord(`r6${i}`)], 'uri'));
    }
    expect(port.getSubmittedBatches().size).toBe(3);
  });
});
