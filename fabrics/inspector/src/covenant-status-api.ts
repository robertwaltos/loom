/**
 * Covenant Status API ΓÇö Public read-only view of the Permanence Covenant.
 *
 * Translates the internal CovenantState into a simplified CovenantPublicStatus
 * suitable for display on the website. Exposes a single GET /covenant/status route.
 *
 * Status mapping:
 *   DORMANT / MONITORING         ΓåÆ 'ACTIVE'
 *   ACTIVATED / COUNTDOWN        ΓåÆ 'TRIGGERED'
 *   SOURCE_RELEASED / COMMUNITY_HANDED / PRESERVED ΓåÆ 'TRIGGERED'
 */

import type { CovenantState, CovenantStatus } from './permanence-covenant.js';

// ΓöÇΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type CovenantPublicDisplayStatus = 'ACTIVE' | 'STRESSED' | 'TRIGGERED';

export interface CovenantPublicStatus {
  readonly status: CovenantPublicDisplayStatus;
  readonly message: string;
  readonly lastVerifiedAt: string;
  readonly archiveUrl?: string;
  readonly version: string;
}

// ΓöÇΓöÇΓöÇ Fastify-compatible minimal interface ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface FastifyInstance {
  get(
    path: string,
    handler: (request: Record<string, unknown>, reply: { send(payload: unknown): void }) => void,
  ): void;
}

// ΓöÇΓöÇΓöÇ Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const COVENANT_VERSION = '1.0.0';

const STATUS_MESSAGES: Record<CovenantPublicDisplayStatus, string> = {
  ACTIVE: 'All covenant conditions met. The Chronicle continues.',
  STRESSED: 'Covenant monitoring active. Studio health under review.',
  TRIGGERED: 'Permanence Covenant activated. 30-day provisions in effect.',
};

const TRANSFERRED_MESSAGE = 'The civilisation has been transferred to the community.';

const TRANSFERRED_STATUSES: ReadonlySet<CovenantStatus> = new Set([
  'SOURCE_RELEASED',
  'COMMUNITY_HANDED',
  'PRESERVED',
]);

const ACTIVE_STATUSES: ReadonlySet<CovenantStatus> = new Set(['DORMANT', 'MONITORING']);

// ΓöÇΓöÇΓöÇ Core function ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function getPublicStatus(covenantState: CovenantState): CovenantPublicStatus {
  const displayStatus = resolveDisplayStatus(covenantState.status);
  const message = resolveMessage(covenantState.status);

  const result: CovenantPublicStatus = {
    status: displayStatus,
    message,
    lastVerifiedAt: covenantState.lastUpdatedAt,
    version: COVENANT_VERSION,
  };

  if (covenantState.archiveUrl !== undefined) {
    return { ...result, archiveUrl: covenantState.archiveUrl };
  }

  return result;
}

// ΓöÇΓöÇΓöÇ Route registration ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function registerRoute(fastify: FastifyInstance, getState: () => CovenantState): void {
  fastify.get('/covenant/status', (_request, reply) => {
    const state = getState();
    const status = getPublicStatus(state);
    reply.send(status);
  });
}

// ΓöÇΓöÇΓöÇ Private helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function resolveDisplayStatus(status: CovenantStatus): CovenantPublicDisplayStatus {
  if (ACTIVE_STATUSES.has(status)) return 'ACTIVE';
  return 'TRIGGERED';
}

function resolveMessage(status: CovenantStatus): string {
  if (TRANSFERRED_STATUSES.has(status)) return TRANSFERRED_MESSAGE;
  if (ACTIVE_STATUSES.has(status)) return STATUS_MESSAGES['ACTIVE'];
  return STATUS_MESSAGES['TRIGGERED'];
}
