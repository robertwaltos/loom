/**
 * document-vault.ts — Versioned document storage.
 *
 * Stores named documents with version history. Each update
 * creates a new version, preserving the complete edit history.
 * Supports version retrieval, rollback, and aggregate statistics.
 */

// ── Ports ────────────────────────────────────────────────────────

interface VaultClock {
  readonly nowMicroseconds: () => number;
}

interface VaultIdGenerator {
  readonly next: () => string;
}

interface DocumentVaultDeps {
  readonly clock: VaultClock;
  readonly idGenerator: VaultIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

interface DocumentVersion {
  readonly versionId: string;
  readonly content: string;
  readonly createdAt: number;
  readonly versionNumber: number;
}

interface Document {
  readonly documentId: string;
  readonly name: string;
  readonly currentVersion: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}

interface CreateDocumentParams {
  readonly name: string;
  readonly content: string;
}

interface VaultStats {
  readonly totalDocuments: number;
  readonly totalVersions: number;
  readonly averageVersions: number;
}

interface DocumentVault {
  readonly create: (params: CreateDocumentParams) => Document;
  readonly update: (documentId: string, content: string) => boolean;
  readonly getDocument: (documentId: string) => Document | undefined;
  readonly getVersion: (documentId: string, version: number) => DocumentVersion | undefined;
  readonly getLatestContent: (documentId: string) => string | undefined;
  readonly listDocuments: () => readonly Document[];
  readonly getHistory: (documentId: string) => readonly DocumentVersion[];
  readonly remove: (documentId: string) => boolean;
  readonly getStats: () => VaultStats;
}

// ── State ────────────────────────────────────────────────────────

interface MutableDocument {
  readonly documentId: string;
  readonly name: string;
  currentVersion: number;
  readonly createdAt: number;
  updatedAt: number;
  readonly versions: DocumentVersion[];
}

interface VaultState {
  readonly deps: DocumentVaultDeps;
  readonly documents: Map<string, MutableDocument>;
}

// ── Helpers ──────────────────────────────────────────────────────

function toReadonly(doc: MutableDocument): Document {
  return {
    documentId: doc.documentId,
    name: doc.name,
    currentVersion: doc.currentVersion,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// ── Operations ───────────────────────────────────────────────────

function createImpl(state: VaultState, params: CreateDocumentParams): Document {
  const now = state.deps.clock.nowMicroseconds();
  const doc: MutableDocument = {
    documentId: state.deps.idGenerator.next(),
    name: params.name,
    currentVersion: 1,
    createdAt: now,
    updatedAt: now,
    versions: [
      {
        versionId: state.deps.idGenerator.next(),
        content: params.content,
        createdAt: now,
        versionNumber: 1,
      },
    ],
  };
  state.documents.set(doc.documentId, doc);
  return toReadonly(doc);
}

function updateImpl(state: VaultState, documentId: string, content: string): boolean {
  const doc = state.documents.get(documentId);
  if (!doc) return false;
  const now = state.deps.clock.nowMicroseconds();
  doc.currentVersion += 1;
  doc.updatedAt = now;
  doc.versions.push({
    versionId: state.deps.idGenerator.next(),
    content,
    createdAt: now,
    versionNumber: doc.currentVersion,
  });
  return true;
}

function getStatsImpl(state: VaultState): VaultStats {
  let totalVersions = 0;
  for (const doc of state.documents.values()) {
    totalVersions += doc.versions.length;
  }
  const total = state.documents.size;
  return {
    totalDocuments: total,
    totalVersions,
    averageVersions: total > 0 ? totalVersions / total : 0,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createDocumentVault(deps: DocumentVaultDeps): DocumentVault {
  const state: VaultState = { deps, documents: new Map() };
  return {
    create: (p) => createImpl(state, p),
    update: (id, content) => updateImpl(state, id, content),
    getDocument: (id) => {
      const d = state.documents.get(id);
      return d ? toReadonly(d) : undefined;
    },
    getVersion: (id, ver) => {
      const d = state.documents.get(id);
      if (!d) return undefined;
      return d.versions.find((v) => v.versionNumber === ver);
    },
    getLatestContent: (id) => {
      const d = state.documents.get(id);
      if (!d) return undefined;
      const latest = d.versions[d.versions.length - 1];
      return latest?.content;
    },
    listDocuments: () => {
      const result: Document[] = [];
      for (const d of state.documents.values()) result.push(toReadonly(d));
      return result;
    },
    getHistory: (id) => [...(state.documents.get(id)?.versions ?? [])],
    remove: (id) => state.documents.delete(id),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createDocumentVault };
export type {
  DocumentVault,
  DocumentVaultDeps,
  Document,
  DocumentVersion,
  CreateDocumentParams,
  VaultStats,
};
