/**
 * Witness Registry — TypeScript contract port.
 *
 * Hexagonal adapter for WitnessRegistry.sol.
 * Builds and verifies Merkle trees entirely in TypeScript so the off-chain
 * layer is independently testable.
 */

import { createHash } from 'node:crypto';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WitnessRecordType =
  | 'dynasty-founding'
  | 'world-milestone'
  | 'player-milestone'
  | 'ceremony-attestation'
  | 'heirloom-creation'
  | 'territory-claim'
  | 'treaty-signed'
  | 'war-declared'
  | 'era-transition';

export interface WitnessRecord {
  readonly id: string;
  readonly type: WitnessRecordType;
  readonly worldId: string;
  readonly subject: string;         // dynastyId | playerId | worldId
  readonly description: string;
  readonly timestampMs: number;
  readonly extra?: Record<string, string | number | boolean>;
}

export interface WitnessBatch {
  readonly batchId: string;
  readonly recordType: WitnessRecordType;
  readonly records: readonly WitnessRecord[];
  readonly merkleRoot: string;          // hex-encoded 32-byte root
  readonly leaves: readonly string[];   // hex-encoded leaf hashes (sorted)
  readonly metadataUri: string;
  readonly builtAt: number;             // unix ms
}

export interface BatchSubmitResult {
  readonly txHash: string;
  readonly blockNumber: bigint;
  readonly batchId: string;
  readonly merkleRoot: string;
  readonly entryCount: number;
}

export interface VerifyResult {
  readonly verified: boolean;
  readonly batchId: string;
  readonly leafHash: string;
}

// ─── Port interface ───────────────────────────────────────────────────────────

export interface WitnessRegistryPort {
  submitBatch(batch: WitnessBatch): Promise<BatchSubmitResult>;
  verifyRecord(batchId: string, record: WitnessRecord): Promise<VerifyResult>;
  batchExists(batchId: string): Promise<boolean>;
  batchCount(): Promise<bigint>;
}

// ─── Merkle tree helpers ──────────────────────────────────────────────────────

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function hashPair(a: string, b: string): string {
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  return sha256Hex(lo + hi);
}

export function hashRecord(record: WitnessRecord): string {
  const canonical = JSON.stringify({
    id:          record.id,
    type:        record.type,
    worldId:     record.worldId,
    subject:     record.subject,
    description: record.description,
    timestampMs: record.timestampMs,
    ...record.extra,
  });
  return sha256Hex(canonical);
}

export function buildMerkleTree(leaves: readonly string[]): {
  root: string;
  layers: readonly (readonly string[])[];
} {
  if (leaves.length === 0) throw new Error('Cannot build Merkle tree from empty leaves');

  const sorted = [...leaves].sort();
  let layer: string[] = sorted;
  const layers: string[][] = [layer];

  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left  = layer[i]!;
      const right = layer[i + 1] ?? left; // odd: duplicate last
      next.push(hashPair(left, right));
    }
    layer = next;
    layers.push(layer);
  }

  return { root: layer[0]!, layers };
}

export function buildMerkleProof(
  leaf: string,
  layers: readonly (readonly string[])[],
): string[] {
  const proof: string[] = [];
  let target = leaf;

  for (let l = 0; l < layers.length - 1; l++) {
    const layer = layers[l]!;
    const idx   = layer.indexOf(target);
    if (idx === -1) throw new Error(`Leaf not found in layer ${l}`);

    const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
    const sibling    = layer[siblingIdx] ?? target; // odd: self
    proof.push(sibling);

    target = layers[l + 1]![Math.floor(idx / 2)]!;
  }

  return proof;
}

export function verifyMerkleProof(
  root: string,
  leaf: string,
  proof: readonly string[],
): boolean {
  let computed = leaf;
  for (const sibling of proof) {
    computed = hashPair(computed, sibling);
  }
  return computed === root;
}

// ─── Batch builder ────────────────────────────────────────────────────────────

export function buildBatch(
  records: readonly WitnessRecord[],
  metadataUri: string,
): WitnessBatch {
  if (records.length === 0) throw new Error('Batch must have at least one record');

  const recordType = records[0]!.type;
  const leaves     = records.map(hashRecord);
  const { root }   = buildMerkleTree(leaves);

  const batchId = sha256Hex(
    records.map((r) => r.id).join(':') + ':' + root,
  );

  return {
    batchId,
    recordType,
    records,
    merkleRoot: root,
    leaves,
    metadataUri,
    builtAt: Date.now(),
  };
}

// ─── In-memory mock ───────────────────────────────────────────────────────────

export function createMockWitnessRegistryPort(): WitnessRegistryPort & {
  getSubmittedBatches(): ReadonlyMap<string, WitnessBatch>;
} {
  const submitted = new Map<string, WitnessBatch>();
  let blockNum = 1n;

  return {
    getSubmittedBatches: () => submitted,

    submitBatch: async (batch) => {
      if (submitted.has(batch.batchId)) {
        throw new Error(`Batch already exists: ${batch.batchId}`);
      }
      submitted.set(batch.batchId, batch);
      const bn = blockNum++;
      return {
        txHash:     `0x${'b'.repeat(64)}`,
        blockNumber: bn,
        batchId:    batch.batchId,
        merkleRoot: batch.merkleRoot,
        entryCount: batch.records.length,
      };
    },

    verifyRecord: async (batchId, record) => {
      const batch = submitted.get(batchId);
      const leaf  = hashRecord(record);
      if (batch === undefined) {
        return { verified: false, batchId, leafHash: leaf };
      }
      const { layers } = buildMerkleTree(batch.leaves);
      const proof      = buildMerkleProof(leaf, layers);
      const verified   = verifyMerkleProof(batch.merkleRoot, leaf, proof);
      return { verified, batchId, leafHash: leaf };
    },

    batchExists: async (batchId) => submitted.has(batchId),

    batchCount: async () => BigInt(submitted.size),
  };
}
