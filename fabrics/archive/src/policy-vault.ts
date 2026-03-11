/**
 * policy-vault.ts — Versioned policy document storage with approval workflow.
 *
 * Documents flow through: DRAFT → PENDING_REVIEW → APPROVED | REJECTED.
 * Approved docs can be superseded by newer versions. Every content change
 * while in DRAFT or REJECTED state creates a PolicyRevision record.
 *
 * "No rule governs the Loom that has not been examined and agreed upon."
 */

// ============================================================================
// PORTS
// ============================================================================

export type Clock = {
  now(): bigint;
};

export type IdGenerator = {
  generate(): string;
};

export type Logger = {
  info(message: string): void;
  warn(message: string): void;
};

// ============================================================================
// TYPES
// ============================================================================

export type PolicyDocId = string;
export type AuthorId = string;

export type PolicyError =
  | 'policy-not-found'
  | 'wrong-status'
  | 'already-approved'
  | 'invalid-content'
  | 'already-exists';

export type PolicyStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED';

export type PolicyDocument = {
  readonly docId: PolicyDocId;
  readonly title: string;
  readonly content: string;
  readonly authorId: AuthorId;
  readonly version: number;
  readonly status: PolicyStatus;
  readonly createdAt: bigint;
  readonly approvedAt: bigint | null;
  readonly supersededById: PolicyDocId | null;
  readonly tags: ReadonlyArray<string>;
};

export type PolicyRevision = {
  readonly revisionId: string;
  readonly docId: PolicyDocId;
  readonly previousContent: string;
  readonly newContent: string;
  readonly changedBy: AuthorId;
  readonly changedAt: bigint;
};

export type PolicyApproval = {
  readonly approvalId: string;
  readonly docId: PolicyDocId;
  readonly approverId: AuthorId;
  readonly decision: 'APPROVED' | 'REJECTED';
  readonly notes: string;
  readonly decidedAt: bigint;
};

// ============================================================================
// STATE
// ============================================================================

type MutableDoc = {
  docId: PolicyDocId;
  title: string;
  content: string;
  authorId: AuthorId;
  version: number;
  status: PolicyStatus;
  createdAt: bigint;
  approvedAt: bigint | null;
  supersededById: PolicyDocId | null;
  tags: ReadonlyArray<string>;
};

export type PolicyVaultState = {
  readonly deps: { clock: Clock; idGen: IdGenerator; logger: Logger };
  readonly documents: Map<PolicyDocId, MutableDoc>;
  readonly revisions: Map<PolicyDocId, PolicyRevision[]>;
};

// ============================================================================
// FACTORY
// ============================================================================

export function createPolicyVaultState(deps: {
  clock: Clock;
  idGen: IdGenerator;
  logger: Logger;
}): PolicyVaultState {
  return { deps, documents: new Map(), revisions: new Map() };
}

// ============================================================================
// DRAFT CREATION
// ============================================================================

export function createDraft(
  state: PolicyVaultState,
  title: string,
  content: string,
  authorId: AuthorId,
  tags: ReadonlyArray<string>,
): PolicyDocument | PolicyError {
  if (content.trim().length === 0) return 'invalid-content';
  const docId = state.deps.idGen.generate();
  const now = state.deps.clock.now();
  const doc: MutableDoc = {
    docId,
    title,
    content,
    authorId,
    version: 1,
    status: 'DRAFT',
    createdAt: now,
    approvedAt: null,
    supersededById: null,
    tags,
  };
  state.documents.set(docId, doc);
  state.revisions.set(docId, []);
  state.deps.logger.info('Policy draft created: ' + docId);
  return toDocument(doc);
}

// ============================================================================
// WORKFLOW TRANSITIONS
// ============================================================================

export function submitForReview(
  state: PolicyVaultState,
  docId: PolicyDocId,
): { success: true } | { success: false; error: PolicyError } {
  const doc = state.documents.get(docId);
  if (doc === undefined) return { success: false, error: 'policy-not-found' };
  if (doc.status !== 'DRAFT') return { success: false, error: 'wrong-status' };
  doc.status = 'PENDING_REVIEW';
  state.deps.logger.info('Policy submitted for review: ' + docId);
  return { success: true };
}

export function approve(
  state: PolicyVaultState,
  docId: PolicyDocId,
  approverId: AuthorId,
  notes: string,
): { success: true; approval: PolicyApproval } | { success: false; error: PolicyError } {
  const doc = state.documents.get(docId);
  if (doc === undefined) return { success: false, error: 'policy-not-found' };
  if (doc.status === 'APPROVED') return { success: false, error: 'already-approved' };
  if (doc.status !== 'PENDING_REVIEW') return { success: false, error: 'wrong-status' };
  const now = state.deps.clock.now();
  doc.status = 'APPROVED';
  doc.approvedAt = now;
  const approval: PolicyApproval = {
    approvalId: state.deps.idGen.generate(),
    docId,
    approverId,
    decision: 'APPROVED',
    notes,
    decidedAt: now,
  };
  state.deps.logger.info('Policy approved: ' + docId);
  return { success: true, approval };
}

export function reject(
  state: PolicyVaultState,
  docId: PolicyDocId,
  approverId: AuthorId,
  notes: string,
): { success: true; approval: PolicyApproval } | { success: false; error: PolicyError } {
  const doc = state.documents.get(docId);
  if (doc === undefined) return { success: false, error: 'policy-not-found' };
  if (doc.status !== 'PENDING_REVIEW') return { success: false, error: 'wrong-status' };
  const now = state.deps.clock.now();
  doc.status = 'REJECTED';
  const approval: PolicyApproval = {
    approvalId: state.deps.idGen.generate(),
    docId,
    approverId,
    decision: 'REJECTED',
    notes,
    decidedAt: now,
  };
  state.deps.logger.info('Policy rejected: ' + docId);
  return { success: true, approval };
}

export function reviseContent(
  state: PolicyVaultState,
  docId: PolicyDocId,
  newContent: string,
  authorId: AuthorId,
): { success: true; revision: PolicyRevision } | { success: false; error: PolicyError } {
  const doc = state.documents.get(docId);
  if (doc === undefined) return { success: false, error: 'policy-not-found' };
  if (doc.status !== 'DRAFT' && doc.status !== 'REJECTED') {
    return { success: false, error: 'wrong-status' };
  }
  if (newContent.trim().length === 0) return { success: false, error: 'invalid-content' };
  const now = state.deps.clock.now();
  const revision: PolicyRevision = {
    revisionId: state.deps.idGen.generate(),
    docId,
    previousContent: doc.content,
    newContent,
    changedBy: authorId,
    changedAt: now,
  };
  state.revisions.get(docId)?.push(revision);
  doc.content = newContent;
  doc.version = doc.version + 1;
  return { success: true, revision };
}

export function supersede(
  state: PolicyVaultState,
  docId: PolicyDocId,
  newDocId: PolicyDocId,
): { success: true } | { success: false; error: PolicyError } {
  const doc = state.documents.get(docId);
  if (doc === undefined) return { success: false, error: 'policy-not-found' };
  doc.status = 'SUPERSEDED';
  doc.supersededById = newDocId;
  state.deps.logger.info('Policy superseded: ' + docId + ' by ' + newDocId);
  return { success: true };
}

// ============================================================================
// QUERIES
// ============================================================================

export function getDocument(
  state: PolicyVaultState,
  docId: PolicyDocId,
): PolicyDocument | undefined {
  const doc = state.documents.get(docId);
  return doc === undefined ? undefined : toDocument(doc);
}

export function listDocuments(
  state: PolicyVaultState,
  status?: PolicyStatus,
): ReadonlyArray<PolicyDocument> {
  const all = [...state.documents.values()];
  const filtered = status === undefined ? all : all.filter((d) => d.status === status);
  return filtered.map(toDocument);
}

export function getRevisionHistory(
  state: PolicyVaultState,
  docId: PolicyDocId,
): ReadonlyArray<PolicyRevision> {
  return state.revisions.get(docId) ?? [];
}

// ============================================================================
// HELPERS
// ============================================================================

function toDocument(d: MutableDoc): PolicyDocument {
  return {
    docId: d.docId,
    title: d.title,
    content: d.content,
    authorId: d.authorId,
    version: d.version,
    status: d.status,
    createdAt: d.createdAt,
    approvedAt: d.approvedAt,
    supersededById: d.supersededById,
    tags: d.tags,
  };
}
