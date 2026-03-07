/**
 * The Remembrance — Append-only permanent record.
 *
 * Every significant event in The Concord is recorded here.
 * SHA-256 hash chain ensures integrity. Entries are immutable.
 * This is the in-memory implementation; Foundation Archive
 * syncs to a separate cloud provider for permanence.
 */

import { archiveSealed } from './remembrance-errors.js';
import { computeEntryHash } from './remembrance-hasher.js';

export type RemembranceCategory =
  | 'entity.lifecycle'
  | 'economy.transaction'
  | 'governance.vote'
  | 'world.transition'
  | 'player.achievement'
  | 'npc.action'
  | 'system.event';

export interface RemembranceEntry {
  readonly entryId: string;
  readonly index: number;
  readonly timestamp: number;
  readonly category: RemembranceCategory;
  readonly worldId: string;
  readonly subjectId: string;
  readonly content: string;
  readonly hash: string;
  readonly previousHash: string;
}

export interface Remembrance {
  record(params: RecordParams): Promise<RemembranceEntry>;
  get(entryId: string): RemembranceEntry | undefined;
  getByIndex(index: number): RemembranceEntry | undefined;
  latest(): RemembranceEntry | undefined;
  count(): number;
  query(filter: RemembranceFilter): ReadonlyArray<RemembranceEntry>;
  verifyChain(): Promise<ChainVerification>;
  seal(): void;
}

export interface RecordParams {
  readonly category: RemembranceCategory;
  readonly worldId: string;
  readonly subjectId: string;
  readonly content: string;
}

export interface RemembranceFilter {
  readonly category?: RemembranceCategory;
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
  readonly entries: RemembranceEntry[];
  readonly entryById: Map<string, RemembranceEntry>;
  readonly idGenerator: { generate(): string };
  readonly clock: { nowMicroseconds(): number };
  sealed: boolean;
}

const GENESIS_HASH = '0'.repeat(64);

export function createRemembrance(deps: {
  readonly idGenerator: { generate(): string };
  readonly clock: { nowMicroseconds(): number };
}): Remembrance {
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

async function recordEntry(state: ArchiveState, params: RecordParams): Promise<RemembranceEntry> {
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

  const entry: RemembranceEntry = {
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
  filter: RemembranceFilter,
): ReadonlyArray<RemembranceEntry> {
  return state.entries.filter((entry) => matchesRemembranceFilter(entry, filter));
}

function matchesRemembranceFilter(entry: RemembranceEntry, filter: RemembranceFilter): boolean {
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
