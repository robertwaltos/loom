import { describe, it, expect, beforeEach } from 'vitest';
import type { PolicyVaultState, Clock, IdGenerator, Logger } from '../policy-vault.js';
import {
  createPolicyVaultState,
  createDraft,
  submitForReview,
  approve,
  reject,
  reviseContent,
  supersede,
  getDocument,
  listDocuments,
  getRevisionHistory,
} from '../policy-vault.js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function makeClock(): Clock {
  let t = 1_000_000n;
  return {
    now: () => {
      t += 1000n;
      return t;
    },
  };
}

function makeIdGen(): IdGenerator {
  let n = 0;
  return { generate: () => 'id-' + String(++n) };
}

function makeLogger(): Logger {
  return { info: () => undefined, warn: () => undefined };
}

function makeDeps() {
  return { clock: makeClock(), idGen: makeIdGen(), logger: makeLogger() };
}

// ============================================================================
// DRAFT CREATION
// ============================================================================

describe('PolicyVault — createDraft', () => {
  let state: PolicyVaultState;

  beforeEach(() => {
    state = createPolicyVaultState(makeDeps());
  });

  it('creates a draft document', () => {
    const result = createDraft(state, 'Privacy Policy', 'Content here', 'author-1', ['legal']);
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.status).toBe('DRAFT');
      expect(result.version).toBe(1);
      expect(result.approvedAt).toBeNull();
      expect(result.supersededById).toBeNull();
    }
  });

  it('rejects empty content', () => {
    const result = createDraft(state, 'Title', '', 'author-1', []);
    expect(result).toBe('invalid-content');
  });

  it('rejects whitespace-only content', () => {
    const result = createDraft(state, 'Title', '   ', 'author-1', []);
    expect(result).toBe('invalid-content');
  });

  it('document is retrievable after creation', () => {
    const doc = createDraft(state, 'Policy', 'Body', 'author-1', []);
    if (typeof doc === 'object') {
      expect(getDocument(state, doc.docId)?.title).toBe('Policy');
    }
  });
});

// ============================================================================
// WORKFLOW TRANSITIONS
// ============================================================================

describe('PolicyVault — submitForReview', () => {
  let state: PolicyVaultState;

  beforeEach(() => {
    state = createPolicyVaultState(makeDeps());
  });

  it('moves DRAFT → PENDING_REVIEW', () => {
    const doc = createDraft(state, 'P', 'Content', 'author-1', []);
    if (typeof doc === 'object') {
      const result = submitForReview(state, doc.docId);
      expect(result).toEqual({ success: true });
      expect(getDocument(state, doc.docId)?.status).toBe('PENDING_REVIEW');
    }
  });

  it('rejects submit for non-DRAFT document', () => {
    const doc = createDraft(state, 'P', 'Content', 'author-1', []);
    if (typeof doc === 'object') {
      submitForReview(state, doc.docId);
      const result = submitForReview(state, doc.docId);
      expect(result).toEqual({ success: false, error: 'wrong-status' });
    }
  });

  it('returns policy-not-found for unknown doc', () => {
    expect(submitForReview(state, 'ghost')).toEqual({ success: false, error: 'policy-not-found' });
  });
});

describe('PolicyVault — approve', () => {
  let state: PolicyVaultState;

  beforeEach(() => {
    state = createPolicyVaultState(makeDeps());
  });

  it('approves a PENDING_REVIEW document', () => {
    const doc = createDraft(state, 'P', 'Content', 'author-1', []);
    if (typeof doc === 'object') {
      submitForReview(state, doc.docId);
      const result = approve(state, doc.docId, 'approver-1', 'LGTM');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.approval.decision).toBe('APPROVED');
      }
      expect(getDocument(state, doc.docId)?.status).toBe('APPROVED');
      expect(getDocument(state, doc.docId)?.approvedAt).not.toBeNull();
    }
  });

  it('returns already-approved for second approve', () => {
    const doc = createDraft(state, 'P', 'Content', 'author-1', []);
    if (typeof doc === 'object') {
      submitForReview(state, doc.docId);
      approve(state, doc.docId, 'approver-1', 'OK');
      const result = approve(state, doc.docId, 'approver-2', 'Also OK');
      expect(result).toEqual({ success: false, error: 'already-approved' });
    }
  });

  it('returns wrong-status when approving DRAFT', () => {
    const doc = createDraft(state, 'P', 'Content', 'author-1', []);
    if (typeof doc === 'object') {
      const result = approve(state, doc.docId, 'approver-1', 'notes');
      expect(result).toEqual({ success: false, error: 'wrong-status' });
    }
  });
});

describe('PolicyVault — reject', () => {
  let state: PolicyVaultState;

  beforeEach(() => {
    state = createPolicyVaultState(makeDeps());
  });

  it('rejects a PENDING_REVIEW document', () => {
    const doc = createDraft(state, 'P', 'Content', 'author-1', []);
    if (typeof doc === 'object') {
      submitForReview(state, doc.docId);
      const result = reject(state, doc.docId, 'reviewer-1', 'Needs work');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.approval.decision).toBe('REJECTED');
      }
      expect(getDocument(state, doc.docId)?.status).toBe('REJECTED');
    }
  });

  it('returns wrong-status when rejecting DRAFT', () => {
    const doc = createDraft(state, 'P', 'Content', 'author-1', []);
    if (typeof doc === 'object') {
      const result = reject(state, doc.docId, 'reviewer-1', 'notes');
      expect(result).toEqual({ success: false, error: 'wrong-status' });
    }
  });
});

// ============================================================================
// REVISION
// ============================================================================

describe('PolicyVault — reviseContent', () => {
  let state: PolicyVaultState;

  beforeEach(() => {
    state = createPolicyVaultState(makeDeps());
  });

  it('revises a DRAFT document and increments version', () => {
    const doc = createDraft(state, 'P', 'Original', 'author-1', []);
    if (typeof doc === 'object') {
      const result = reviseContent(state, doc.docId, 'Updated content', 'author-1');
      expect(result.success).toBe(true);
      expect(getDocument(state, doc.docId)?.version).toBe(2);
      expect(getDocument(state, doc.docId)?.content).toBe('Updated content');
    }
  });

  it('revises a REJECTED document', () => {
    const doc = createDraft(state, 'P', 'Original', 'author-1', []);
    if (typeof doc === 'object') {
      submitForReview(state, doc.docId);
      reject(state, doc.docId, 'reviewer', 'No');
      const result = reviseContent(state, doc.docId, 'Better content', 'author-1');
      expect(result.success).toBe(true);
    }
  });

  it('returns wrong-status for PENDING_REVIEW', () => {
    const doc = createDraft(state, 'P', 'Content', 'author-1', []);
    if (typeof doc === 'object') {
      submitForReview(state, doc.docId);
      const result = reviseContent(state, doc.docId, 'New', 'author-1');
      expect(result).toEqual({ success: false, error: 'wrong-status' });
    }
  });

  it('records revision history', () => {
    const doc = createDraft(state, 'P', 'First', 'author-1', []);
    if (typeof doc === 'object') {
      reviseContent(state, doc.docId, 'Second', 'author-1');
      reviseContent(state, doc.docId, 'Third', 'author-1');
      const history = getRevisionHistory(state, doc.docId);
      expect(history).toHaveLength(2);
      expect(history[0]?.previousContent).toBe('First');
      expect(history[1]?.previousContent).toBe('Second');
    }
  });
});

// ============================================================================
// SUPERSEDE & LIST
// ============================================================================

describe('PolicyVault — supersede and list', () => {
  let state: PolicyVaultState;

  beforeEach(() => {
    state = createPolicyVaultState(makeDeps());
  });

  it('supersedes a document', () => {
    const old = createDraft(state, 'Old', 'content', 'author-1', []);
    const newer = createDraft(state, 'New', 'content', 'author-1', []);
    if (typeof old === 'object' && typeof newer === 'object') {
      const result = supersede(state, old.docId, newer.docId);
      expect(result).toEqual({ success: true });
      expect(getDocument(state, old.docId)?.status).toBe('SUPERSEDED');
      expect(getDocument(state, old.docId)?.supersededById).toBe(newer.docId);
    }
  });

  it('lists all documents without filter', () => {
    createDraft(state, 'A', 'content', 'author-1', []);
    createDraft(state, 'B', 'content', 'author-1', []);
    expect(listDocuments(state)).toHaveLength(2);
  });

  it('lists documents filtered by status', () => {
    const d1 = createDraft(state, 'A', 'content', 'author-1', []);
    const d2 = createDraft(state, 'B', 'content', 'author-1', []);
    if (typeof d1 === 'object') submitForReview(state, d1.docId);
    expect(listDocuments(state, 'DRAFT')).toHaveLength(typeof d2 === 'object' ? 1 : 0);
    expect(listDocuments(state, 'PENDING_REVIEW')).toHaveLength(1);
  });
});
