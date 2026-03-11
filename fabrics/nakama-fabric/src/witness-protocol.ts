/**
 * Witness Protocol — On-Chain Registry for permanent records.
 *
 *   - MARKS registry: dynasty founding, world milestones on L2
 *   - Batch registration: gas-optimized batch hashing
 *   - Achievement hashing: quarterly player milestone digests
 *   - Ceremony system: Remembrance events → on-chain attestations
 *   - Chain explorer integration: public verification links
 *   - Cross-chain bridge: abstracted for future chain migration
 *
 * "What the Loom weaves, the chain remembers."
 */

import type { LoomEvent } from '@loom/events-contracts';

// ─── Ports ──────────────────────────────────────────────────────────

export interface WitnessClockPort {
  readonly now: () => bigint;
}

export interface WitnessIdPort {
  readonly next: () => string;
}

export interface WitnessLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface WitnessEventPort {
  readonly emit: (event: LoomEvent) => void;
}

export interface ChainAdapterPort {
  readonly submitBatch: (entries: readonly RegistryEntry[]) => Promise<TransactionReceipt>;
  readonly verifyEntry: (txHash: string, entryHash: string) => Promise<boolean>;
  readonly getExplorerUrl: (txHash: string) => string;
  readonly estimateGas: (entryCount: number) => Promise<GasEstimate>;
  readonly getChainId: () => string;
}

export interface WitnessStorePort {
  readonly saveRecord: (record: WitnessRecord) => Promise<void>;
  readonly getRecord: (recordId: string) => Promise<WitnessRecord | undefined>;
  readonly getRecordsByDynasty: (dynastyId: string) => Promise<readonly WitnessRecord[]>;
  readonly getRecordsByWorld: (worldId: string) => Promise<readonly WitnessRecord[]>;
  readonly getPendingEntries: () => Promise<readonly RegistryEntry[]>;
  readonly markEntrySubmitted: (entryId: string, txHash: string) => Promise<void>;
  readonly saveCeremony: (ceremony: CeremonyRecord) => Promise<void>;
  readonly getCeremonies: (dynastyId: string) => Promise<readonly CeremonyRecord[]>;
}

export interface HashPort {
  readonly sha256: (data: string) => string;
  readonly merkleRoot: (hashes: readonly string[]) => string;
}

// ─── Constants ──────────────────────────────────────────────────────

const MAX_BATCH_SIZE = 100;
const MAX_GAS_COST_USD = 0.10;
const QUARTERLY_INTERVAL_DAYS = 90;
const MIN_ENTRIES_FOR_BATCH = 5;

export const WITNESS_RECORD_TYPES = [
  'dynasty-founding',
  'world-milestone',
  'player-milestone',
  'ceremony-attestation',
  'heirloom-creation',
  'territory-claim',
  'treaty-signed',
  'war-declared',
  'era-transition',
] as const;

export type WitnessRecordType = typeof WITNESS_RECORD_TYPES[number];

// ─── Types ──────────────────────────────────────────────────────────

export interface RegistryEntry {
  readonly id: string;
  readonly recordType: WitnessRecordType;
  readonly dataHash: string;
  readonly metadata: RegistryMetadata;
  readonly createdAt: bigint;
  readonly submitted: boolean;
  readonly txHash?: string;
}

export interface RegistryMetadata {
  readonly dynastyId?: string;
  readonly worldId?: string;
  readonly playerId?: string;
  readonly entityId?: string;
  readonly description: string;
  readonly timestamp: bigint;
}

export interface TransactionReceipt {
  readonly txHash: string;
  readonly blockNumber: bigint;
  readonly gasUsed: bigint;
  readonly entryCount: number;
  readonly merkleRoot: string;
  readonly chainId: string;
  readonly timestamp: bigint;
}

export interface GasEstimate {
  readonly estimatedGasUnits: bigint;
  readonly estimatedCostUsd: number;
  readonly entryCount: number;
  readonly withinBudget: boolean;
}

export interface WitnessRecord {
  readonly id: string;
  readonly entry: RegistryEntry;
  readonly receipt?: TransactionReceipt;
  readonly explorerUrl?: string;
  readonly verified: boolean;
  readonly verifiedAt?: bigint;
}

export interface DynastyRegistration {
  readonly dynastyId: string;
  readonly dynastyName: string;
  readonly founderId: string;
  readonly founderName: string;
  readonly foundedAt: bigint;
  readonly worldId: string;
  readonly motto?: string;
}

export interface WorldMilestone {
  readonly worldId: string;
  readonly milestoneType: string;
  readonly description: string;
  readonly achievedAt: bigint;
  readonly value?: number;
  readonly achievedBy?: string;
}

export interface PlayerMilestoneDigest {
  readonly playerId: string;
  readonly dynastyId: string;
  readonly periodStart: bigint;
  readonly periodEnd: bigint;
  readonly achievementHashes: readonly string[];
  readonly digestHash: string;
  readonly achievementCount: number;
}

export interface CeremonyRecord {
  readonly id: string;
  readonly ceremonyType: CeremonyType;
  readonly dynastyId: string;
  readonly worldId: string;
  readonly participants: readonly string[];
  readonly description: string;
  readonly attestationHash: string;
  readonly performedAt: bigint;
  readonly entry?: RegistryEntry;
}

export type CeremonyType =
  | 'founding'
  | 'coronation'
  | 'memorial'
  | 'treaty'
  | 'conquest'
  | 'remembrance'
  | 'era-dawn'
  | 'world-birth';

export interface WitnessBatchResult {
  readonly batchId: string;
  readonly entryCount: number;
  readonly receipt: TransactionReceipt;
  readonly gasEstimate: GasEstimate;
  readonly explorerUrl: string;
}

export interface WitnessProtocolStats {
  readonly totalRecords: number;
  readonly totalOnChain: number;
  readonly pendingEntries: number;
  readonly totalCeremonies: number;
  readonly totalGasUsed: bigint;
  readonly chainId: string;
}

// ─── Deps & Config ──────────────────────────────────────────────────

export interface WitnessProtocolDeps {
  readonly clock: WitnessClockPort;
  readonly ids: WitnessIdPort;
  readonly log: WitnessLogPort;
  readonly events: WitnessEventPort;
  readonly chain: ChainAdapterPort;
  readonly store: WitnessStorePort;
  readonly hash: HashPort;
}

export interface WitnessProtocolConfig {
  readonly maxBatchSize: number;
  readonly maxGasCostUsd: number;
  readonly minEntriesForBatch: number;
  readonly quarterlyIntervalDays: number;
  readonly autoSubmit: boolean;
}

const DEFAULT_CONFIG: WitnessProtocolConfig = {
  maxBatchSize: MAX_BATCH_SIZE,
  maxGasCostUsd: MAX_GAS_COST_USD,
  minEntriesForBatch: MIN_ENTRIES_FOR_BATCH,
  quarterlyIntervalDays: QUARTERLY_INTERVAL_DAYS,
  autoSubmit: false,
};

// ─── Engine ─────────────────────────────────────────────────────────

export interface WitnessProtocolEngine {
  /** Register a dynasty founding on-chain. */
  readonly registerDynasty: (registration: DynastyRegistration) => Promise<WitnessRecord>;

  /** Register a world milestone for on-chain attestation. */
  readonly registerWorldMilestone: (milestone: WorldMilestone) => Promise<WitnessRecord>;

  /** Generate and register a quarterly player milestone digest. */
  readonly generatePlayerDigest: (
    playerId: string,
    dynastyId: string,
    achievementHashes: readonly string[],
    periodStart: bigint,
    periodEnd: bigint,
  ) => Promise<WitnessRecord>;

  /** Record a ceremony and create its on-chain attestation. */
  readonly recordCeremony: (
    ceremonyType: CeremonyType,
    dynastyId: string,
    worldId: string,
    participants: readonly string[],
    description: string,
  ) => Promise<CeremonyRecord>;

  /** Submit pending entries as a batch transaction. */
  readonly submitBatch: () => Promise<WitnessBatchResult | undefined>;

  /** Estimate gas cost for current pending entries. */
  readonly estimateGas: () => Promise<GasEstimate>;

  /** Verify an existing record on-chain. */
  readonly verifyRecord: (recordId: string) => Promise<boolean>;

  /** Get all witness records for a dynasty. */
  readonly getDynastyRecords: (dynastyId: string) => Promise<readonly WitnessRecord[]>;

  /** Get all witness records for a world. */
  readonly getWorldRecords: (worldId: string) => Promise<readonly WitnessRecord[]>;

  /** Get all ceremonies for a dynasty. */
  readonly getCeremonies: (dynastyId: string) => Promise<readonly CeremonyRecord[]>;

  /** Get explorer URL for a transaction. */
  readonly getExplorerUrl: (txHash: string) => string;

  /** Get protocol statistics. */
  readonly getStats: () => Promise<WitnessProtocolStats>;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createWitnessProtocol(
  deps: WitnessProtocolDeps,
  config?: Partial<WitnessProtocolConfig>,
): WitnessProtocolEngine {
  const cfg: WitnessProtocolConfig = { ...DEFAULT_CONFIG, ...config };
  const { clock, ids, log, events, chain, store, hash: hashPort } = deps;

  function createEntry(
    recordType: WitnessRecordType,
    data: string,
    metadata: RegistryMetadata,
  ): RegistryEntry {
    return {
      id: ids.next(),
      recordType,
      dataHash: hashPort.sha256(data),
      metadata,
      createdAt: clock.now(),
      submitted: false,
    };
  }

  async function createRecord(entry: RegistryEntry): Promise<WitnessRecord> {
    const record: WitnessRecord = {
      id: ids.next(),
      entry,
      verified: false,
    };
    await store.saveRecord(record);
    return record;
  }

  const engine: WitnessProtocolEngine = {
    async registerDynasty(registration) {
      const data = JSON.stringify({
        type: 'dynasty-founding',
        dynastyId: registration.dynastyId,
        dynastyName: registration.dynastyName,
        founderId: registration.founderId,
        founderName: registration.founderName,
        foundedAt: registration.foundedAt.toString(),
        worldId: registration.worldId,
        motto: registration.motto,
      });

      const entry = createEntry('dynasty-founding', data, {
        dynastyId: registration.dynastyId,
        worldId: registration.worldId,
        playerId: registration.founderId,
        description: `Dynasty "${registration.dynastyName}" founded by ${registration.founderName}`,
        timestamp: registration.foundedAt,
      });

      const record = await createRecord(entry);

      log.info('Dynasty registered for witness', {
        dynastyId: registration.dynastyId,
        dynastyName: registration.dynastyName,
        entryHash: entry.dataHash,
      });

      events.emit({
        type: 'witness.dynasty-registered',
        payload: {
          recordId: record.id,
          dynastyId: registration.dynastyId,
        },
      } as LoomEvent);

      return record;
    },

    async registerWorldMilestone(milestone) {
      const data = JSON.stringify({
        type: 'world-milestone',
        worldId: milestone.worldId,
        milestoneType: milestone.milestoneType,
        description: milestone.description,
        achievedAt: milestone.achievedAt.toString(),
        value: milestone.value,
        achievedBy: milestone.achievedBy,
      });

      const entry = createEntry('world-milestone', data, {
        worldId: milestone.worldId,
        playerId: milestone.achievedBy,
        description: milestone.description,
        timestamp: milestone.achievedAt,
      });

      const record = await createRecord(entry);

      log.info('World milestone registered', {
        worldId: milestone.worldId,
        milestoneType: milestone.milestoneType,
      });

      events.emit({
        type: 'witness.world-milestone',
        payload: {
          recordId: record.id,
          worldId: milestone.worldId,
          milestoneType: milestone.milestoneType,
        },
      } as LoomEvent);

      return record;
    },

    async generatePlayerDigest(playerId, dynastyId, achievementHashes, periodStart, periodEnd) {
      const digestHash = hashPort.merkleRoot(achievementHashes);

      const data = JSON.stringify({
        type: 'player-milestone',
        playerId,
        dynastyId,
        periodStart: periodStart.toString(),
        periodEnd: periodEnd.toString(),
        digestHash,
        achievementCount: achievementHashes.length,
      });

      const entry = createEntry('player-milestone', data, {
        playerId,
        dynastyId,
        description: `Quarterly digest: ${achievementHashes.length} achievements`,
        timestamp: clock.now(),
      });

      const record = await createRecord(entry);

      log.info('Player digest generated', {
        playerId,
        dynastyId,
        achievementCount: achievementHashes.length,
        digestHash,
      });

      events.emit({
        type: 'witness.player-digest',
        payload: {
          recordId: record.id,
          playerId,
          achievementCount: achievementHashes.length,
        },
      } as LoomEvent);

      return record;
    },

    async recordCeremony(ceremonyType, dynastyId, worldId, participants, description) {
      const attestationData = JSON.stringify({
        type: 'ceremony-attestation',
        ceremonyType,
        dynastyId,
        worldId,
        participants,
        description,
        performedAt: clock.now().toString(),
      });

      const attestationHash = hashPort.sha256(attestationData);

      const entry = createEntry('ceremony-attestation', attestationData, {
        dynastyId,
        worldId,
        description: `Ceremony: ${ceremonyType} — ${description}`,
        timestamp: clock.now(),
      });

      const ceremony: CeremonyRecord = {
        id: ids.next(),
        ceremonyType,
        dynastyId,
        worldId,
        participants,
        description,
        attestationHash,
        performedAt: clock.now(),
        entry,
      };

      await store.saveCeremony(ceremony);

      log.info('Ceremony recorded', {
        ceremonyType,
        dynastyId,
        participants: participants.length,
        attestationHash,
      });

      events.emit({
        type: 'witness.ceremony-recorded',
        payload: {
          ceremonyId: ceremony.id,
          ceremonyType,
          dynastyId,
        },
      } as LoomEvent);

      return ceremony;
    },

    async submitBatch() {
      const pending = await store.getPendingEntries();
      if (pending.length < cfg.minEntriesForBatch) {
        log.info('Not enough entries for batch', {
          pending: pending.length,
          minRequired: cfg.minEntriesForBatch,
        });
        return undefined;
      }

      const batch = pending.slice(0, cfg.maxBatchSize);

      const gasEstimate = await chain.estimateGas(batch.length);
      if (!gasEstimate.withinBudget) {
        log.warn('Gas cost exceeds budget', {
          estimatedCost: gasEstimate.estimatedCostUsd,
          budget: cfg.maxGasCostUsd,
          entryCount: batch.length,
        });

        const reduced = batch.slice(0, Math.max(1, Math.floor(batch.length / 2)));
        const reducedEstimate = await chain.estimateGas(reduced.length);

        if (!reducedEstimate.withinBudget) {
          log.error('Cannot submit batch within gas budget', {
            entryCount: reduced.length,
          });
          return undefined;
        }

        const receipt = await chain.submitBatch(reduced);
        for (const entry of reduced) {
          await store.markEntrySubmitted(entry.id, receipt.txHash);
        }

        const explorerUrl = chain.getExplorerUrl(receipt.txHash);
        log.info('Reduced batch submitted', {
          txHash: receipt.txHash,
          entryCount: reduced.length,
          gasUsed: receipt.gasUsed.toString(),
        });

        events.emit({
          type: 'witness.batch-submitted',
          payload: {
            txHash: receipt.txHash,
            entryCount: reduced.length,
          },
        } as LoomEvent);

        return {
          batchId: ids.next(),
          entryCount: reduced.length,
          receipt,
          gasEstimate: reducedEstimate,
          explorerUrl,
        };
      }

      const receipt = await chain.submitBatch(batch);
      for (const entry of batch) {
        await store.markEntrySubmitted(entry.id, receipt.txHash);
      }

      const explorerUrl = chain.getExplorerUrl(receipt.txHash);
      log.info('Batch submitted on-chain', {
        txHash: receipt.txHash,
        entryCount: batch.length,
        gasUsed: receipt.gasUsed.toString(),
        merkleRoot: receipt.merkleRoot,
      });

      events.emit({
        type: 'witness.batch-submitted',
        payload: {
          txHash: receipt.txHash,
          entryCount: batch.length,
        },
      } as LoomEvent);

      return {
        batchId: ids.next(),
        entryCount: batch.length,
        receipt,
        gasEstimate,
        explorerUrl,
      };
    },

    async estimateGas() {
      const pending = await store.getPendingEntries();
      return chain.estimateGas(pending.length);
    },

    async verifyRecord(recordId) {
      const record = await store.getRecord(recordId);
      if (!record) {
        throw new Error(`Record ${recordId} not found`);
      }
      if (!record.entry.txHash) {
        return false;
      }

      const verified = await chain.verifyEntry(record.entry.txHash, record.entry.dataHash);

      if (verified) {
        const updated: WitnessRecord = {
          ...record,
          verified: true,
          verifiedAt: clock.now(),
          explorerUrl: chain.getExplorerUrl(record.entry.txHash),
        };
        await store.saveRecord(updated);
      }

      log.info('Record verification', {
        recordId,
        verified,
        txHash: record.entry.txHash,
      });

      return verified;
    },

    async getDynastyRecords(dynastyId) {
      return store.getRecordsByDynasty(dynastyId);
    },

    async getWorldRecords(worldId) {
      return store.getRecordsByWorld(worldId);
    },

    async getCeremonies(dynastyId) {
      return store.getCeremonies(dynastyId);
    },

    getExplorerUrl(txHash) {
      return chain.getExplorerUrl(txHash);
    },

    async getStats() {
      const pending = await store.getPendingEntries();
      return {
        totalRecords: 0,
        totalOnChain: 0,
        pendingEntries: pending.length,
        totalCeremonies: 0,
        totalGasUsed: 0n,
        chainId: chain.getChainId(),
      };
    },
  };

  log.info('Witness Protocol initialized', {
    maxBatchSize: cfg.maxBatchSize,
    maxGasCostUsd: cfg.maxGasCostUsd,
    chainId: chain.getChainId(),
  });

  return engine;
}
