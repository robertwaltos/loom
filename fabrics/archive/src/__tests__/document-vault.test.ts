import { describe, it, expect } from 'vitest';
import { createDocumentVault } from '../document-vault.js';
import type { DocumentVaultDeps } from '../document-vault.js';

function makeDeps(): DocumentVaultDeps {
  let time = 1_000_000;
  let idCounter = 0;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: { next: () => 'doc-' + String(++idCounter) },
  };
}

describe('DocumentVault — create and retrieve', () => {
  it('creates a document', () => {
    const vault = createDocumentVault(makeDeps());
    const doc = vault.create({ name: 'notes', content: 'hello' });
    expect(doc.name).toBe('notes');
    expect(doc.currentVersion).toBe(1);
  });

  it('retrieves a document by id', () => {
    const vault = createDocumentVault(makeDeps());
    const doc = vault.create({ name: 'notes', content: 'hello' });
    expect(vault.getDocument(doc.documentId)?.name).toBe('notes');
  });

  it('returns undefined for unknown document', () => {
    const vault = createDocumentVault(makeDeps());
    expect(vault.getDocument('missing')).toBeUndefined();
  });

  it('gets latest content', () => {
    const vault = createDocumentVault(makeDeps());
    const doc = vault.create({ name: 'notes', content: 'initial' });
    expect(vault.getLatestContent(doc.documentId)).toBe('initial');
  });

  it('lists all documents', () => {
    const vault = createDocumentVault(makeDeps());
    vault.create({ name: 'a', content: 'content-a' });
    vault.create({ name: 'b', content: 'content-b' });
    expect(vault.listDocuments()).toHaveLength(2);
  });
});

describe('DocumentVault — update and versioning', () => {
  it('updates document content', () => {
    const vault = createDocumentVault(makeDeps());
    const doc = vault.create({ name: 'notes', content: 'v1' });
    expect(vault.update(doc.documentId, 'v2')).toBe(true);
    expect(vault.getLatestContent(doc.documentId)).toBe('v2');
  });

  it('increments version number', () => {
    const vault = createDocumentVault(makeDeps());
    const doc = vault.create({ name: 'notes', content: 'v1' });
    vault.update(doc.documentId, 'v2');
    expect(vault.getDocument(doc.documentId)?.currentVersion).toBe(2);
  });

  it('retrieves specific version', () => {
    const vault = createDocumentVault(makeDeps());
    const doc = vault.create({ name: 'notes', content: 'v1' });
    vault.update(doc.documentId, 'v2');
    expect(vault.getVersion(doc.documentId, 1)?.content).toBe('v1');
    expect(vault.getVersion(doc.documentId, 2)?.content).toBe('v2');
  });

  it('returns undefined for unknown version', () => {
    const vault = createDocumentVault(makeDeps());
    const doc = vault.create({ name: 'notes', content: 'v1' });
    expect(vault.getVersion(doc.documentId, 99)).toBeUndefined();
  });

  it('gets full version history', () => {
    const vault = createDocumentVault(makeDeps());
    const doc = vault.create({ name: 'notes', content: 'v1' });
    vault.update(doc.documentId, 'v2');
    vault.update(doc.documentId, 'v3');
    expect(vault.getHistory(doc.documentId)).toHaveLength(3);
  });
});

describe('DocumentVault — remove', () => {
  it('removes a document', () => {
    const vault = createDocumentVault(makeDeps());
    const doc = vault.create({ name: 'temp', content: 'data' });
    expect(vault.remove(doc.documentId)).toBe(true);
    expect(vault.getDocument(doc.documentId)).toBeUndefined();
  });

  it('returns false for unknown removal', () => {
    const vault = createDocumentVault(makeDeps());
    expect(vault.remove('missing')).toBe(false);
  });
});

describe('DocumentVault — stats', () => {
  it('starts with zero stats', () => {
    const vault = createDocumentVault(makeDeps());
    const stats = vault.getStats();
    expect(stats.totalDocuments).toBe(0);
    expect(stats.totalVersions).toBe(0);
  });

  it('tracks aggregate stats', () => {
    const vault = createDocumentVault(makeDeps());
    const doc = vault.create({ name: 'a', content: 'v1' });
    vault.update(doc.documentId, 'v2');
    vault.create({ name: 'b', content: 'v1' });
    const stats = vault.getStats();
    expect(stats.totalDocuments).toBe(2);
    expect(stats.totalVersions).toBe(3);
    expect(stats.averageVersions).toBeCloseTo(1.5);
  });
});
