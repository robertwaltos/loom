/**
 * The Chronicle — Append-only permanent record.
 *
 * Bible v1.4: "Your story is permanent. Build something worth reading."
 *
 * Every significant event in The Concord is recorded here.
 * SHA-256 hash chain ensures integrity. Entries are immutable.
 * This is the in-memory implementation; Foundation Archive
 * syncs to a separate cloud provider for permanence.
 */

import { archiveSealed } from './chronicle-errors.js';
import { computeEntryHash } from './chronicle-hasher.js';

export type ChronicleCategory =
  | 'entity.lifecycle'
  | 'economy.transaction'
  | 'governance.vote'
  | 'world.transition'
  | 'player.achievement'
  | 'npc.action'
  | 'system.event';

export interface ChronicleEntry {
  readonly entryId: string;
  readonly index: number;
  readonly timestamp: number;
  readonly category: ChronicleCategory;
  readonly worldId: string;
  readonly subjectId: string;
  readonly content: string;
  readonly hash: string;
  readonly previousHash: string;
}

export interface Chronicle {
  record(params: RecordParams): Promise<ChronicleEntry>;
  get(entryId: string): ChronicleEntry | undefined;
  getByIndex(index: number): ChronicleEntry | undefined;
  latest(): ChronicleEntry | undefined;
  count(): number;
  query(filter: ChronicleFilter): ReadonlyArray<ChronicleEntry>;
  verifyChain(): Promise<ChainVerification>;
  seal(): void;
}

export interface RecordParams {
  readonly category: ChronicleCategory;
  readonly worldId: string;
  readonly subjectId: string;
  readonly content: string;
}

export interface ChronicleFilter {
  readonly category?: ChronicleCategory;
  readonly worldId?: string;
  readonly subjectId?: string;
  readonly fromIndex?: number;
  readonly toIndex?: number;
}

export interface ChainVerification {
  readonly valid: boolean;
  readonly entriesChecked: number;
  readonly brokenAt: number | null;
}

interface ArchiveState {
  readonly entries: ChronicleEntry[];
  readonly entryById: Map<string, ChronicleEntry>;
  readonly idGenerator: { generate(): string };
  readonly clock: { nowMicroseconds(): number };
  sealed: boolean;
}

const GENESIS_HASH = '0'.repeat(64);

export function createChronicle(deps: {
  readonly idGenerator: { generate(): string };
  readonly clock: { nowMicroseconds(): number };
}): Chronicle {
  const state: ArchiveState = {
    entries: [],
    entryById: new Map(),
    idGenerator: deps.idGenerator,
    clock: deps.clock,
    sealed: false,
  };

  return {
    record: (params) => recordEntry(state, params),
    get: (id) => state.entryById.get(id),
    getByIndex: (idx) => state.entries[idx],
    latest: () => state.entries[state.entries.length - 1],
    count: () => state.entries.length,
    query: (filter) => queryEntries(state, filter),
    verifyChain: () => verifyHashChain(state),
    seal: () => {
      state.sealed = true;
    },
  };
}

async function recordEntry(state: ArchiveState, params: RecordParams): Promise<ChronicleEntry> {
  if (state.sealed) throw archiveSealed();

  const entryId = state.idGenerator.generate();
  const index = state.entries.length;
  const timestamp = state.clock.nowMicroseconds();
  const prev = index === 0 ? undefined : state.entries[index - 1];
  const previousHash = prev?.hash ?? GENESIS_HASH;

  const hash = await computeEntryHash({
    previousHash,
    entryId,
    timestamp,
    category: params.category,
    content: params.content,
  });

  const entry: ChronicleEntry = {
    entryId,
    index,
    timestamp,
    category: params.category,
    worldId: params.worldId,
    subjectId: params.subjectId,
    content: params.content,
    hash,
    previousHash,
  };

  state.entries.push(entry);
  state.entryById.set(entryId, entry);
  return entry;
}

function queryEntries(
  state: ArchiveState,
  filter: ChronicleFilter,
): ReadonlyArray<ChronicleEntry> {
  return state.entries.filter((entry) => matchesChronicleFilter(entry, filter));
}

function matchesChronicleFilter(entry: ChronicleEntry, filter: ChronicleFilter): boolean {
  if (filter.category !== undefined && entry.category !== filter.category) return false;
  if (filter.worldId !== undefined && entry.worldId !== filter.worldId) return false;
  if (filter.subjectId !== undefined && entry.subjectId !== filter.subjectId) return false;
  if (filter.fromIndex !== undefined && entry.index < filter.fromIndex) return false;
  if (filter.toIndex !== undefined && entry.index > filter.toIndex) return false;
  return true;
}

async function verifyHashChain(state: ArchiveState): Promise<ChainVerification> {
  for (const entry of state.entries) {
    const prevEntry = entry.index === 0 ? undefined : state.entries[entry.index - 1];
    const expectedPreviousHash = prevEntry?.hash ?? GENESIS_HASH;
    if (entry.previousHash !== expectedPreviousHash) {
      return { valid: false, entriesChecked: entry.index, brokenAt: entry.index };
    }
    const recomputed = await computeEntryHash({
      previousHash: entry.previousHash,
      entryId: entry.entryId,
      timestamp: entry.timestamp,
      category: entry.category,
      content: entry.content,
    });
    if (recomputed !== entry.hash) {
      return { valid: false, entriesChecked: entry.index + 1, brokenAt: entry.index };
    }
  }
  return { valid: true, entriesChecked: state.entries.length, brokenAt: null };
}
