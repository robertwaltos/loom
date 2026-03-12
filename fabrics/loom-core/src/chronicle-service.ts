/**
 * chronicle-service.ts — Immutable Chronicle entry management.
 *
 * The Chronicle is the Concord's permanent record:
 *   - Every significant action is recorded
 *   - Entries are immutable once written (Permanence Covenant)
 *   - Players can search and read entries at Chronicle terminals
 *   - Entries affect probability space (NPC behavior, reputation)
 *
 * This service is the in-process store. Archive fabric handles
 * persistence (PostgreSQL + Foundation Archive), but all
 * runtime reads and writes flow through this service.
 *
 * Design:
 *   - Hexagonal: no infrastructure imports
 *   - Event-driven: publishes ChronicleEntry events
 *   - Immutable: entries are frozen on creation
 */

import type { EntityId } from '@loom/entities-contracts';
import type { ChronicleEntryType } from '@loom/events-contracts';

// ── Types ───────────────────────────────────────────────────────

export interface ChronicleEntry {
  /** Unique entry identifier. */
  readonly entryId: string;
  /** Entity that created this entry (player, NPC, or system). */
  readonly authorEntityId: EntityId;
  /** World where the entry was created. */
  readonly worldId: string;
  /** Classification of the entry. */
  readonly entryType: ChronicleEntryType;
  /** Human-readable summary of the event. */
  readonly summary: string;
  /** Full narrative text. */
  readonly body: string;
  /** Unix timestamp in microseconds when the entry was recorded. */
  readonly timestamp: number;
  /** IDs of entities mentioned in this entry. */
  readonly mentionedEntities: ReadonlyArray<EntityId>;
  /** Tags for search/filtering. */
  readonly tags: ReadonlyArray<string>;
  /** Hash of previous entry in this world (chain integrity). */
  readonly previousHash: string | null;
  /** Hash of this entry (computed from content + previous hash). */
  readonly entryHash: string;
}

export interface ChronicleSearchResult {
  readonly entries: ReadonlyArray<ChronicleEntry>;
  readonly totalCount: number;
  readonly query: string;
}

/** Port for persistence backends. */
export interface ChronicleEventSink {
  onEntryCreated(entry: ChronicleEntry): void;
}

export interface ChronicleServiceDeps {
  readonly clock: { readonly nowMicroseconds: () => number };
  readonly idGenerator: { readonly generate: () => string };
  readonly eventSink?: ChronicleEventSink;
}

// ── Service Interface ───────────────────────────────────────────

export interface ChronicleService {
  /** Create a new immutable Chronicle entry. */
  createEntry(params: CreateEntryParams): ChronicleEntry;

  /** Read an entry by ID. */
  getEntry(entryId: string): ChronicleEntry | undefined;

  /** Get all entries for a world, ordered by timestamp. */
  getWorldEntries(worldId: string): ReadonlyArray<ChronicleEntry>;

  /** Get entries by author entity. */
  getAuthorEntries(authorEntityId: EntityId): ReadonlyArray<ChronicleEntry>;

  /** Search entries by text query (summary + body + tags). */
  search(worldId: string, query: string): ChronicleSearchResult;

  /** Search entries mentioning a specific entity. */
  searchByEntity(entityId: EntityId): ReadonlyArray<ChronicleEntry>;

  /** Get the total entry count. */
  entryCount(): number;

  /** Get the latest entry hash for a world (chain head). */
  getChainHead(worldId: string): string | null;

  /** Verify the hash chain integrity for a world. Returns broken entry IDs. */
  verifyChain(worldId: string): ReadonlyArray<string>;
}

export interface CreateEntryParams {
  readonly authorEntityId: EntityId;
  readonly worldId: string;
  readonly entryType: ChronicleEntryType;
  readonly summary: string;
  readonly body: string;
  readonly mentionedEntities?: ReadonlyArray<EntityId>;
  readonly tags?: ReadonlyArray<string>;
}

// ── Hash Function ───────────────────────────────────────────────

/**
 * Simple deterministic hash for Chronicle chain integrity.
 * Not cryptographic — the archive fabric handles signing.
 * Uses djb2a for fast in-process hashing.
 */
function computeHash(content: string, previousHash: string | null): string {
  const input = `${previousHash ?? 'genesis'}:${content}`;
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return `chr_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

// ── Factory ─────────────────────────────────────────────────────

export function createChronicleService(deps: ChronicleServiceDeps): ChronicleService {
  const entriesById = new Map<string, ChronicleEntry>();
  const entriesByWorld = new Map<string, ChronicleEntry[]>();
  const entriesByAuthor = new Map<string, ChronicleEntry[]>();
  const entriesByMentioned = new Map<string, ChronicleEntry[]>();
  const chainHeads = new Map<string, string>();

  function createEntry(params: CreateEntryParams): ChronicleEntry {
    const entryId = deps.idGenerator.generate();
    const timestamp = deps.clock.nowMicroseconds();
    const previousHash = chainHeads.get(params.worldId) ?? null;
    const content = `${params.summary}:${params.body}:${params.entryType}:${params.authorEntityId}:${timestamp}`;
    const entryHash = computeHash(content, previousHash);

    const entry: ChronicleEntry = Object.freeze({
      entryId,
      authorEntityId: params.authorEntityId,
      worldId: params.worldId,
      entryType: params.entryType,
      summary: params.summary,
      body: params.body,
      timestamp,
      mentionedEntities: Object.freeze([...(params.mentionedEntities ?? [])]),
      tags: Object.freeze([...(params.tags ?? [])]),
      previousHash,
      entryHash,
    });

    // Index
    entriesById.set(entryId, entry);

    const worldList = entriesByWorld.get(params.worldId) ?? [];
    worldList.push(entry);
    entriesByWorld.set(params.worldId, worldList);

    const authorList = entriesByAuthor.get(params.authorEntityId) ?? [];
    authorList.push(entry);
    entriesByAuthor.set(params.authorEntityId, authorList);

    for (const mentioned of entry.mentionedEntities) {
      const mentionedList = entriesByMentioned.get(mentioned) ?? [];
      mentionedList.push(entry);
      entriesByMentioned.set(mentioned, mentionedList);
    }

    // Update chain head
    chainHeads.set(params.worldId, entryHash);

    // Notify sink
    deps.eventSink?.onEntryCreated(entry);

    return entry;
  }

  function getEntry(entryId: string): ChronicleEntry | undefined {
    return entriesById.get(entryId);
  }

  function getWorldEntries(worldId: string): ReadonlyArray<ChronicleEntry> {
    return entriesByWorld.get(worldId) ?? [];
  }

  function getAuthorEntries(authorEntityId: EntityId): ReadonlyArray<ChronicleEntry> {
    return entriesByAuthor.get(authorEntityId) ?? [];
  }

  function search(worldId: string, query: string): ChronicleSearchResult {
    const worldEntries = entriesByWorld.get(worldId) ?? [];
    const lowerQuery = query.toLowerCase();

    const matches = worldEntries.filter((e) => {
      if (e.summary.toLowerCase().includes(lowerQuery)) return true;
      if (e.body.toLowerCase().includes(lowerQuery)) return true;
      if (e.tags.some((t) => t.toLowerCase().includes(lowerQuery))) return true;
      return false;
    });

    return {
      entries: matches,
      totalCount: matches.length,
      query,
    };
  }

  function searchByEntity(entityId: EntityId): ReadonlyArray<ChronicleEntry> {
    return entriesByMentioned.get(entityId) ?? [];
  }

  function entryCount(): number {
    return entriesById.size;
  }

  function getChainHead(worldId: string): string | null {
    return chainHeads.get(worldId) ?? null;
  }

  function verifyChain(worldId: string): ReadonlyArray<string> {
    const entries = entriesByWorld.get(worldId) ?? [];
    const broken: string[] = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      const expected = i === 0 ? null : entries[i - 1]!.entryHash;
      if (entry.previousHash !== expected) {
        broken.push(entry.entryId);
      }
    }

    return broken;
  }

  return {
    createEntry,
    getEntry,
    getWorldEntries,
    getAuthorEntries,
    search,
    searchByEntity,
    entryCount,
    getChainHead,
    verifyChain,
  };
}
