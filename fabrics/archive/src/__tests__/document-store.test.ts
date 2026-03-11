import { describe, it, expect } from 'vitest';
import { createDocumentStore } from '../document-store.js';
import type { DocumentStoreDeps } from '../document-store.js';

function makeDeps(): DocumentStoreDeps {
  let id = 0;
  let time = 1_000_000;
  return {
    idGenerator: { next: () => 'doc-' + String(++id) },
    clock: { nowMicroseconds: () => (time += 1_000_000) },
  };
}

describe('DocumentStore — put and get', () => {
  it('stores and retrieves a document', () => {
    const store = createDocumentStore(makeDeps());
    const doc = store.put({ collection: 'users', key: 'u1', data: '{"name":"Alice"}' });
    expect(doc.documentId).toBe('doc-1');
    expect(doc.version).toBe(1);
    const retrieved = store.get('users', 'u1');
    expect(retrieved?.data).toBe('{"name":"Alice"}');
  });

  it('returns undefined for missing document', () => {
    const store = createDocumentStore(makeDeps());
    expect(store.get('users', 'unknown')).toBeUndefined();
  });

  it('returns latest version on get', () => {
    const store = createDocumentStore(makeDeps());
    store.put({ collection: 'users', key: 'u1', data: 'v1' });
    store.put({ collection: 'users', key: 'u1', data: 'v2' });
    const doc = store.get('users', 'u1');
    expect(doc?.version).toBe(2);
    expect(doc?.data).toBe('v2');
  });
});

describe('DocumentStore — versioning', () => {
  it('tracks version count', () => {
    const store = createDocumentStore(makeDeps());
    store.put({ collection: 'items', key: 'i1', data: 'a' });
    store.put({ collection: 'items', key: 'i1', data: 'b' });
    store.put({ collection: 'items', key: 'i1', data: 'c' });
    expect(store.getVersionCount('items', 'i1')).toBe(3);
  });

  it('retrieves a specific version', () => {
    const store = createDocumentStore(makeDeps());
    store.put({ collection: 'items', key: 'i1', data: 'first' });
    store.put({ collection: 'items', key: 'i1', data: 'second' });
    const v1 = store.getVersion('items', 'i1', 1);
    expect(v1?.data).toBe('first');
    expect(v1?.version).toBe(1);
  });

  it('returns undefined for non-existent version', () => {
    const store = createDocumentStore(makeDeps());
    store.put({ collection: 'items', key: 'i1', data: 'only' });
    expect(store.getVersion('items', 'i1', 99)).toBeUndefined();
  });

  it('returns 0 for unknown document version count', () => {
    const store = createDocumentStore(makeDeps());
    expect(store.getVersionCount('x', 'y')).toBe(0);
  });

  it('preserves createdAt across versions', () => {
    const store = createDocumentStore(makeDeps());
    const v1 = store.put({ collection: 'c', key: 'k', data: 'a' });
    store.put({ collection: 'c', key: 'k', data: 'b' });
    const v2 = store.get('c', 'k');
    expect(v2?.createdAt).toBe(v1.createdAt);
    expect(v2?.updatedAt).toBeGreaterThan(v1.updatedAt);
  });
});

describe('DocumentStore — list', () => {
  it('lists documents by collection', () => {
    const store = createDocumentStore(makeDeps());
    store.put({ collection: 'users', key: 'u1', data: 'a' });
    store.put({ collection: 'users', key: 'u2', data: 'b' });
    store.put({ collection: 'items', key: 'i1', data: 'c' });
    const results = store.list({ collection: 'users' });
    expect(results).toHaveLength(2);
  });

  it('lists documents by key prefix', () => {
    const store = createDocumentStore(makeDeps());
    store.put({ collection: 'logs', key: 'error-1', data: 'a' });
    store.put({ collection: 'logs', key: 'error-2', data: 'b' });
    store.put({ collection: 'logs', key: 'info-1', data: 'c' });
    const results = store.list({ collection: 'logs', keyPrefix: 'error' });
    expect(results).toHaveLength(2);
  });

  it('lists all documents with empty filter', () => {
    const store = createDocumentStore(makeDeps());
    store.put({ collection: 'a', key: 'k1', data: 'x' });
    store.put({ collection: 'b', key: 'k2', data: 'y' });
    const results = store.list({});
    expect(results).toHaveLength(2);
  });
});

describe('DocumentStore — remove', () => {
  it('removes a document', () => {
    const store = createDocumentStore(makeDeps());
    store.put({ collection: 'users', key: 'u1', data: 'a' });
    expect(store.remove('users', 'u1')).toBe(true);
    expect(store.get('users', 'u1')).toBeUndefined();
  });

  it('returns false for unknown document', () => {
    const store = createDocumentStore(makeDeps());
    expect(store.remove('x', 'y')).toBe(false);
  });

  it('removes all versions', () => {
    const store = createDocumentStore(makeDeps());
    store.put({ collection: 'c', key: 'k', data: 'a' });
    store.put({ collection: 'c', key: 'k', data: 'b' });
    store.remove('c', 'k');
    expect(store.getVersionCount('c', 'k')).toBe(0);
  });
});

describe('DocumentStore — stats', () => {
  it('tracks aggregate statistics', () => {
    const store = createDocumentStore(makeDeps());
    store.put({ collection: 'a', key: 'k1', data: 'x' });
    store.put({ collection: 'a', key: 'k1', data: 'y' });
    store.put({ collection: 'b', key: 'k2', data: 'z' });
    store.remove('b', 'k2');

    const stats = store.getStats();
    expect(stats.totalDocuments).toBe(1);
    expect(stats.totalVersions).toBe(2);
    expect(stats.totalPuts).toBe(3);
    expect(stats.totalDeletes).toBe(1);
    expect(stats.collections).toBe(1);
  });

  it('starts with zero stats', () => {
    const store = createDocumentStore(makeDeps());
    const stats = store.getStats();
    expect(stats.totalDocuments).toBe(0);
    expect(stats.totalPuts).toBe(0);
  });
});
