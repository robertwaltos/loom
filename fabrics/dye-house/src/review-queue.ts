/**
 * Chronicle Review Queue ΓÇö Human moderation workflow.
 *
 * Manages the queue of Chronicle entries that require human review:
 *   - Standard: 24-hour SLA
 *   - Urgent: 4-hour SLA
 *   - Severe: 1-hour SLA
 *
 * Items are assigned to moderators, decisions recorded, and SLA breaches tracked.
 */

import type { ModerationFlag } from './chronicle-moderation.js';

// ΓöÇΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type ReviewPriority = 'standard' | 'urgent' | 'severe';

export interface ReviewQueueItem {
  readonly itemId: string;
  readonly submissionId: string;
  readonly dynastyId: string;
  readonly priority: ReviewPriority;
  readonly flags: ModerationFlag[];
  readonly assignedTo?: string;
  readonly queuedAt: string;
  readonly slaDeadlineAt: string;
  readonly status: 'queued' | 'in_review' | 'decided';
}

export interface ReviewDecision {
  readonly itemId: string;
  readonly moderatorId: string;
  readonly decision: 'approve' | 'reject' | 'edit_approve';
  readonly reason: string;
  readonly editedText?: string;
  readonly decidedAt: string;
}

// ΓöÇΓöÇΓöÇ Ports ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface ReviewClockPort {
  readonly nowIso: () => string;
  readonly nowMs: () => number;
  readonly addMs: (isoDate: string, ms: number) => string;
}

export interface ReviewIdPort {
  readonly next: () => string;
}

export interface ReviewLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
}

// ΓöÇΓöÇΓöÇ SLA constants (ms) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const SLA_MS: Record<ReviewPriority, number> = {
  standard: 24 * 60 * 60 * 1000,
  urgent: 4 * 60 * 60 * 1000,
  severe: 60 * 60 * 1000,
};

// ΓöÇΓöÇΓöÇ State ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface ReviewQueueState {
  readonly items: Map<string, ReviewQueueItem>;
  readonly decisions: Map<string, ReviewDecision>;
}

export function createReviewQueueState(): ReviewQueueState {
  return {
    items: new Map(),
    decisions: new Map(),
  };
}

// ΓöÇΓöÇΓöÇ Queue operations ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function enqueue(
  state: ReviewQueueState,
  submissionId: string,
  dynastyId: string,
  flags: ModerationFlag[],
  priority: ReviewPriority,
  clock: ReviewClockPort,
  id: ReviewIdPort,
  log: ReviewLogPort,
): ReviewQueueItem {
  const queuedAt = clock.nowIso();
  const slaDeadlineAt = clock.addMs(queuedAt, SLA_MS[priority]);

  const item: ReviewQueueItem = {
    itemId: id.next(),
    submissionId,
    dynastyId,
    priority,
    flags,
    queuedAt,
    slaDeadlineAt,
    status: 'queued',
  };

  state.items.set(item.itemId, item);
  log.info('review-queue-item-added', { itemId: item.itemId, submissionId, priority });
  return item;
}

export function assignToModerator(
  state: ReviewQueueState,
  itemId: string,
  moderatorId: string,
  log: ReviewLogPort,
): ReviewQueueItem {
  const item = state.items.get(itemId);
  if (item === undefined) throw new Error(`Queue item ${itemId} not found`);

  const updated: ReviewQueueItem = {
    ...item,
    assignedTo: moderatorId,
    status: 'in_review',
  };

  state.items.set(itemId, updated);
  log.info('review-item-assigned', { itemId, moderatorId });
  return updated;
}

export function decide(
  state: ReviewQueueState,
  itemId: string,
  moderatorId: string,
  decision: ReviewDecision['decision'],
  reason: string,
  clock: ReviewClockPort,
  log: ReviewLogPort,
  editedText?: string,
): ReviewDecision {
  const item = state.items.get(itemId);
  if (item === undefined) throw new Error(`Queue item ${itemId} not found`);

  const reviewDecision: ReviewDecision = {
    itemId,
    moderatorId,
    decision,
    reason,
    editedText,
    decidedAt: clock.nowIso(),
  };

  const updated: ReviewQueueItem = { ...item, status: 'decided' };
  state.items.set(itemId, updated);
  state.decisions.set(itemId, reviewDecision);

  log.info('review-decision-recorded', { itemId, moderatorId, decision });
  return reviewDecision;
}

export function getQueue(state: ReviewQueueState, priority?: ReviewPriority): ReviewQueueItem[] {
  const all = Array.from(state.items.values());
  const pending = all.filter((item) => item.status !== 'decided');

  if (priority === undefined) return pending;
  return pending.filter((item) => item.priority === priority);
}

export function getOverdueItems(
  state: ReviewQueueState,
  clock: ReviewClockPort,
): ReviewQueueItem[] {
  const nowMs = clock.nowMs();
  return Array.from(state.items.values()).filter((item) => {
    if (item.status === 'decided') return false;
    return new Date(item.slaDeadlineAt).getTime() < nowMs;
  });
}

export function getQueueDepth(state: ReviewQueueState): {
  standard: number;
  urgent: number;
  severe: number;
} {
  const pending = Array.from(state.items.values()).filter((i) => i.status !== 'decided');
  return {
    standard: pending.filter((i) => i.priority === 'standard').length,
    urgent: pending.filter((i) => i.priority === 'urgent').length,
    severe: pending.filter((i) => i.priority === 'severe').length,
  };
}
