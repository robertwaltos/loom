/**
 * document-store.ts — Key-value document storage with versioning.
 *
 * Stores typed documents by collection and key. Supports versioned
 * writes (each put creates a new version), retrieval of specific
 * versions or latest, listing by collection, and deletion. Documents
 * are stored in memory with full version history.
 */

// ── Ports ────────────────────────────────────────────────────────

interface DocumentIdGenerator {
  readonly next: () => string;
}

interface DocumentClock {
  readonly nowMicroseconds: () => number;
}

// ── Types ────────────────────────────────────────────────────────

interface Document {
  readonly documentId: string;
  readonly collection: string;
  readonly key: string;
  readonly version: number;
  readonly data: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

interface PutDocumentParams {
  readonly collection: string;
  readonly key: string;
  readonly data: string;
}

interface DocumentFilter {
  readonly collection?: string;
  readonly keyPrefix?: string;
}

interface DocumentStats {
  readonly totalDocuments: number;
  readonly totalVersions: number;
  readonly totalPuts: number;
  readonly totalDeletes: number;
  readonly collections: number;
}

// ── Public API ───────────────────────────────────────────────────

interface DocumentStore {
  readonly put: (params: PutDocumentParams) => Document;
  readonly get: (collection: string, key: string) => Document | undefined;
  readonly getVersion: (
    collection: string,
    key: string,
    version: number,
  ) => Document | undefined;
  readonly list: (filter: DocumentFilter) => readonly Document[];
  readonly remove: (collection: string, key: string) => boolean;
  readonly getVersionCount: (collection: string, key: string) => number;
  readonly getStats: () => DocumentStats;
}

interface DocumentStoreDeps {
  readonly idGenerator: DocumentIdGenerator;
  readonly clock: DocumentClock;
}

// ── State ────────────────────────────────────────────────────────

interface DocumentState {
  readonly documents: Map<string, DocumentVersions>;
  readonly deps: DocumentStoreDeps;
  totalPuts: number;
  totalDeletes: number;
  totalVersions: number;
}

interface DocumentVersions {
  readonly documentId: string;
  readonly collection: string;
  readonly key: string;
  readonly versions: MutableVersion[];
  currentVersion: number;
}

interface MutableVersion {
  readonly version: number;
  readonly data: string;
  readonly createdAt: number;
}

// ── Helpers ──────────────────────────────────────────────────────

function composeKey(collection: string, key: string): string {
  return collection + ':' + key;
}

function toDocument(
  versions: DocumentVersions,
  ver: MutableVersion,
): Document {
  return {
    documentId: versions.documentId,
    collection: versions.collection,
    key: versions.key,
    version: ver.version,
    data: ver.data,
    createdAt: versions.versions[0]?.createdAt ?? ver.createdAt,
    updatedAt: ver.createdAt,
  };
}

// ── Operations ───────────────────────────────────────────────────

function putImpl(
  state: DocumentState,
  params: PutDocumentParams,
): Document {
  const ck = composeKey(params.collection, params.key);
  const now = state.deps.clock.nowMicroseconds();
  let versions = state.documents.get(ck);
  if (!versions) {
    versions = {
      documentId: state.deps.idGenerator.next(),
      collection: params.collection,
      key: params.key,
      versions: [],
      currentVersion: 0,
    };
    state.documents.set(ck, versions);
  }
  versions.currentVersion++;
  const ver: MutableVersion = {
    version: versions.currentVersion,
    data: params.data,
    createdAt: now,
  };
  versions.versions.push(ver);
  state.totalPuts++;
  state.totalVersions++;
  return toDocument(versions, ver);
}

function getImpl(
  state: DocumentState,
  collection: string,
  key: string,
): Document | undefined {
  const versions = state.documents.get(composeKey(collection, key));
  if (!versions) return undefined;
  const latest = versions.versions[versions.versions.length - 1];
  if (!latest) return undefined;
  return toDocument(versions, latest);
}

function getVersionImpl(
  state: DocumentState,
  collection: string,
  key: string,
  version: number,
): Document | undefined {
  const versions = state.documents.get(composeKey(collection, key));
  if (!versions) return undefined;
  const ver = versions.versions.find((v) => v.version === version);
  if (!ver) return undefined;
  return toDocument(versions, ver);
}

function listImpl(
  state: DocumentState,
  filter: DocumentFilter,
): readonly Document[] {
  const results: Document[] = [];
  for (const versions of state.documents.values()) {
    if (
      filter.collection !== undefined &&
      versions.collection !== filter.collection
    ) {
      continue;
    }
    if (
      filter.keyPrefix !== undefined &&
      !versions.key.startsWith(filter.keyPrefix)
    ) {
      continue;
    }
    const latest = versions.versions[versions.versions.length - 1];
    if (!latest) continue;
    results.push(toDocument(versions, latest));
  }
  return results;
}

function removeImpl(
  state: DocumentState,
  collection: string,
  key: string,
): boolean {
  const ck = composeKey(collection, key);
  const versions = state.documents.get(ck);
  if (!versions) return false;
  state.totalVersions -= versions.versions.length;
  state.documents.delete(ck);
  state.totalDeletes++;
  return true;
}

function getVersionCountImpl(
  state: DocumentState,
  collection: string,
  key: string,
): number {
  const versions = state.documents.get(composeKey(collection, key));
  return versions ? versions.versions.length : 0;
}

function getStatsImpl(state: DocumentState): DocumentStats {
  const collections = new Set<string>();
  for (const v of state.documents.values()) {
    collections.add(v.collection);
  }
  return {
    totalDocuments: state.documents.size,
    totalVersions: state.totalVersions,
    totalPuts: state.totalPuts,
    totalDeletes: state.totalDeletes,
    collections: collections.size,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createDocumentStore(deps: DocumentStoreDeps): DocumentStore {
  const state: DocumentState = {
    documents: new Map(),
    deps,
    totalPuts: 0,
    totalDeletes: 0,
    totalVersions: 0,
  };
  return {
    put: (params) => putImpl(state, params),
    get: (c, k) => getImpl(state, c, k),
    getVersion: (c, k, v) => getVersionImpl(state, c, k, v),
    list: (f) => listImpl(state, f),
    remove: (c, k) => removeImpl(state, c, k),
    getVersionCount: (c, k) => getVersionCountImpl(state, c, k),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createDocumentStore };
export type {
  DocumentStore,
  DocumentStoreDeps,
  Document,
  PutDocumentParams,
  DocumentFilter,
  DocumentStats,
};
