/**
 * Moderation Routes
 *
 * All routes require the X-Moderation-Secret header.
 *
 * Violations:
 *   POST   /v1/moderation/violations
 *   GET    /v1/moderation/violations/:playerId
 *
 * Tickets:
 *   POST   /v1/moderation/tickets
 *   GET    /v1/moderation/tickets/:ticketId
 *   PATCH  /v1/moderation/tickets/:ticketId
 *
 * Bans:
 *   POST   /v1/moderation/bans
 *   GET    /v1/moderation/bans/:playerId
 *   DELETE /v1/moderation/bans/:playerId
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { PgModerationRepository, TicketCategory, TicketStatus, BanType } from '../../universe/moderation/pg-repository.js';

type ErrorResponse = { ok: false; error: string; code: string };

const VIOLATION_TYPES = ['speed_hack', 'teleport', 'rapid_fire', 'sequence_replay'] as const;
const PENALTY_TIERS = ['warn', 'kick', 'ban'] as const;
const TICKET_CATEGORIES: TicketCategory[] = ['cheating', 'harassment', 'spam', 'inappropriate_content', 'bug', 'other'];
const TICKET_STATUSES: TicketStatus[] = ['open', 'investigating', 'resolved', 'closed'];
const BAN_TYPES: BanType[] = ['temp', 'permanent'];

export interface ModerationRoutesDeps {
  readonly moderationRepo: PgModerationRepository;
  readonly moderationSecret: string | undefined;
}

export function registerModerationRoutes(app: FastifyAppLike, deps: ModerationRoutesDeps): void {
  const { moderationRepo, moderationSecret } = deps;

  function requireSecret(
    req: { headers: Record<string, unknown> },
    reply: { code: (n: number) => { send: (v: unknown) => unknown } },
  ): boolean {
    if (!moderationSecret) return true;
    const provided = (req.headers as Record<string, string | string[] | undefined>)['x-moderation-secret'];
    if (provided !== moderationSecret) {
      const err: ErrorResponse = { ok: false, error: 'Forbidden', code: 'FORBIDDEN' };
      reply.code(403).send(err);
      return false;
    }
    return true;
  }

  // ── Violations ──────────────────────────────────────────────────────

  // POST /v1/moderation/violations
  app.post('/v1/moderation/violations', async (req, reply) => {
    if (!requireSecret(req as never, reply as never)) return;
    const b = (req as unknown as { body: Record<string, unknown> }).body;
    const playerId = typeof b['playerId'] === 'string' ? b['playerId'] : null;
    const violationType = typeof b['violationType'] === 'string' ? b['violationType'] : null;
    const severity = typeof b['severity'] === 'number' ? b['severity'] : 1;
    const details = typeof b['details'] === 'string' ? b['details'] : null;
    const penaltyTier = typeof b['penaltyTier'] === 'string' ? b['penaltyTier'] : null;

    if (playerId === null || violationType === null) {
      const err: ErrorResponse = { ok: false, error: 'playerId and violationType required', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    if (!VIOLATION_TYPES.includes(violationType as never)) {
      const err: ErrorResponse = { ok: false, error: `violationType must be one of: ${VIOLATION_TYPES.join(', ')}`, code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    if (penaltyTier !== null && !PENALTY_TIERS.includes(penaltyTier as never)) {
      const err: ErrorResponse = { ok: false, error: `penaltyTier must be one of: ${PENALTY_TIERS.join(', ')}`, code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    try {
      const violation = await moderationRepo.recordViolation({
        playerId, violationType, severity, details,
        penaltyTier: penaltyTier as 'warn' | 'kick' | 'ban' | null,
      });
      return reply.code(201).send({ ok: true, violation });
    } catch (err) {
      const e: ErrorResponse = { ok: false, error: String(err), code: 'INTERNAL' };
      return reply.code(500).send(e);
    }
  });

  // GET /v1/moderation/violations/:playerId
  app.get('/v1/moderation/violations/:playerId', async (req, reply) => {
    if (!requireSecret(req as never, reply as never)) return;
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const playerId = typeof params['playerId'] === 'string' ? params['playerId'] : null;
    const query = (req as unknown as { query: Record<string, unknown> }).query;
    const limitRaw = typeof query['limit'] === 'string' ? query['limit'] : undefined;
    const limit = limitRaw !== undefined ? parseInt(limitRaw, 10) : 50;
    if (playerId === null) {
      const err: ErrorResponse = { ok: false, error: 'playerId required', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    try {
      const violations = await moderationRepo.getViolations(playerId, limit);
      return reply.send({ ok: true, violations });
    } catch (err) {
      const e: ErrorResponse = { ok: false, error: String(err), code: 'INTERNAL' };
      return reply.code(500).send(e);
    }
  });

  // ── Tickets ─────────────────────────────────────────────────────────

  // POST /v1/moderation/tickets
  app.post('/v1/moderation/tickets', async (req, reply) => {
    if (!requireSecret(req as never, reply as never)) return;
    const b = (req as unknown as { body: Record<string, unknown> }).body;
    const ticketId = typeof b['ticketId'] === 'string' ? b['ticketId'] : null;
    const reporterId = typeof b['reporterId'] === 'string' ? b['reporterId'] : null;
    const category = typeof b['category'] === 'string' ? b['category'] : null;
    const description = typeof b['description'] === 'string' ? b['description'] : null;

    if (!ticketId || !reporterId || !category || !description) {
      const err: ErrorResponse = { ok: false, error: 'ticketId, reporterId, category, description required', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    if (!TICKET_CATEGORIES.includes(category as TicketCategory)) {
      const err: ErrorResponse = { ok: false, error: `category must be one of: ${TICKET_CATEGORIES.join(', ')}`, code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    try {
      const ticket = await moderationRepo.createTicket({
        ticketId, reporterId, category: category as TicketCategory, description,
        targetPlayerId: typeof b['targetPlayerId'] === 'string' ? b['targetPlayerId'] : null,
        worldId: typeof b['worldId'] === 'string' ? b['worldId'] : null,
        evidenceUrl: typeof b['evidenceUrl'] === 'string' ? b['evidenceUrl'] : null,
      });
      return reply.code(201).send({ ok: true, ticket });
    } catch (err) {
      const e: ErrorResponse = { ok: false, error: String(err), code: 'INTERNAL' };
      return reply.code(500).send(e);
    }
  });

  // GET /v1/moderation/tickets/:ticketId
  app.get('/v1/moderation/tickets/:ticketId', async (req, reply) => {
    if (!requireSecret(req as never, reply as never)) return;
    const ticketParams = (req as unknown as { params: Record<string, unknown> }).params;
    const ticketId = typeof ticketParams['ticketId'] === 'string' ? ticketParams['ticketId'] : null;
    if (ticketId === null) {
      const err: ErrorResponse = { ok: false, error: 'ticketId required', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    try {
      const ticket = await moderationRepo.getTicket(ticketId);
      if (ticket === null) {
        const err: ErrorResponse = { ok: false, error: 'Ticket not found', code: 'NOT_FOUND' };
        return reply.code(404).send(err);
      }
      return reply.send({ ok: true, ticket });
    } catch (err) {
      const e: ErrorResponse = { ok: false, error: String(err), code: 'INTERNAL' };
      return reply.code(500).send(e);
    }
  });

  // PATCH /v1/moderation/tickets/:ticketId
  app.patch('/v1/moderation/tickets/:ticketId', async (req, reply) => {
    if (!requireSecret(req as never, reply as never)) return;
    const patchParams = (req as unknown as { params: Record<string, unknown> }).params;
    const patchTicketId = typeof patchParams['ticketId'] === 'string' ? patchParams['ticketId'] : null;
    if (patchTicketId === null) {
      const err: ErrorResponse = { ok: false, error: 'ticketId required', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    const b = (req as unknown as { body: Record<string, unknown> }).body;

    const status = typeof b['status'] === 'string' ? b['status'] : undefined;
    if (status !== undefined && !TICKET_STATUSES.includes(status as TicketStatus)) {
      const err: ErrorResponse = { ok: false, error: `status must be one of: ${TICKET_STATUSES.join(', ')}`, code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    try {
      const ticketUpdate: { status?: TicketStatus; moderatorId?: string; resolutionNote?: string } = {};
      if (status !== undefined) ticketUpdate['status'] = status as TicketStatus;
      const moId = typeof b['moderatorId'] === 'string' ? b['moderatorId'] : undefined;
      const resNote = typeof b['resolutionNote'] === 'string' ? b['resolutionNote'] : undefined;
      if (moId !== undefined) ticketUpdate['moderatorId'] = moId;
      if (resNote !== undefined) ticketUpdate['resolutionNote'] = resNote;

      const ticket = await moderationRepo.updateTicket(patchTicketId, ticketUpdate);
      if (ticket === null) {
        const err: ErrorResponse = { ok: false, error: 'Ticket not found', code: 'NOT_FOUND' };
        return reply.code(404).send(err);
      }
      return reply.send({ ok: true, ticket });
    } catch (err) {
      const e: ErrorResponse = { ok: false, error: String(err), code: 'INTERNAL' };
      return reply.code(500).send(e);
    }
  });

  // ── Bans ─────────────────────────────────────────────────────────────

  // POST /v1/moderation/bans
  app.post('/v1/moderation/bans', async (req, reply) => {
    if (!requireSecret(req as never, reply as never)) return;
    const b = (req as unknown as { body: Record<string, unknown> }).body;
    const playerId = typeof b['playerId'] === 'string' ? b['playerId'] : null;
    const banType = typeof b['banType'] === 'string' ? b['banType'] : null;
    const reason = typeof b['reason'] === 'string' ? b['reason'] : null;

    if (!playerId || !banType || !reason) {
      const err: ErrorResponse = { ok: false, error: 'playerId, banType, reason required', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    if (!BAN_TYPES.includes(banType as BanType)) {
      const err: ErrorResponse = { ok: false, error: `banType must be one of: ${BAN_TYPES.join(', ')}`, code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    const expiresAtRaw = b['expiresAt'];
    const expiresAt = typeof expiresAtRaw === 'number' ? expiresAtRaw : null;
    if (banType === 'temp' && expiresAt === null) {
      const err: ErrorResponse = { ok: false, error: 'expiresAt (ms epoch) required for temp bans', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    try {
      const ban = await moderationRepo.banPlayer({
        playerId, banType: banType as BanType, reason,
        moderatorId: typeof b['moderatorId'] === 'string' ? b['moderatorId'] : null,
        expiresAt,
        ticketId: typeof b['ticketId'] === 'string' ? b['ticketId'] : null,
      });
      return reply.code(201).send({ ok: true, ban });
    } catch (err) {
      const e: ErrorResponse = { ok: false, error: String(err), code: 'INTERNAL' };
      return reply.code(500).send(e);
    }
  });

  // GET /v1/moderation/bans/:playerId
  app.get('/v1/moderation/bans/:playerId', async (req, reply) => {
    if (!requireSecret(req as never, reply as never)) return;
    const banGetParams = (req as unknown as { params: Record<string, unknown> }).params;
    const banPlayerId = typeof banGetParams['playerId'] === 'string' ? banGetParams['playerId'] : null;
    if (banPlayerId === null) {
      const err: ErrorResponse = { ok: false, error: 'playerId required', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    const banQuery = (req as unknown as { query: Record<string, unknown> }).query;
    try {
      if (banQuery['history'] === 'true') {
        const bans = await moderationRepo.getBanHistory(banPlayerId);
        return reply.send({ ok: true, bans });
      }
      const ban = await moderationRepo.getActiveBan(banPlayerId);
      return reply.send({ ok: true, ban });
    } catch (err) {
      const e: ErrorResponse = { ok: false, error: String(err), code: 'INTERNAL' };
      return reply.code(500).send(e);
    }
  });

  // DELETE /v1/moderation/bans/:playerId  (lift ban)
  app.delete('/v1/moderation/bans/:playerId', async (req, reply) => {
    if (!requireSecret(req as never, reply as never)) return;
    const delParams = (req as unknown as { params: Record<string, unknown> }).params;
    const delPlayerId = typeof delParams['playerId'] === 'string' ? delParams['playerId'] : null;
    if (delPlayerId === null) {
      const err: ErrorResponse = { ok: false, error: 'playerId required', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    const b = (req as unknown as { body: Record<string, unknown> }).body;
    const liftedBy = typeof b['liftedBy'] === 'string' ? b['liftedBy'] : 'system';

    try {
      await moderationRepo.liftBan(delPlayerId, liftedBy);
      return reply.send({ ok: true });
    } catch (err) {
      const e: ErrorResponse = { ok: false, error: String(err), code: 'INTERNAL' };
      return reply.code(500).send(e);
    }
  });
}
