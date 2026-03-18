/**
 * Koydo Worlds — Moderation PG Repository
 *
 * Persists anti-cheat violations, support tickets, and player bans.
 * Tables: loom_violations, loom_support_tickets, loom_bans
 * (see db/migrations/0001, 0002, 0003)
 */

import type { Pool } from 'pg';

// ─── Domain Types ──────────────────────────────────────────────────

export interface Violation {
  readonly id: number;
  readonly playerId: string;
  readonly violationType: string;
  readonly severity: number;
  readonly details: string | null;
  readonly detectedAt: number;
  readonly penaltyTier: 'warn' | 'kick' | 'ban' | null;
  readonly createdAt: number;
}

export type TicketCategory = 'cheating' | 'harassment' | 'spam' | 'inappropriate_content' | 'bug' | 'other';
export type TicketStatus = 'open' | 'investigating' | 'resolved' | 'closed';

export interface SupportTicket {
  readonly ticketId: string;
  readonly reporterId: string;
  readonly targetPlayerId: string | null;
  readonly category: TicketCategory;
  readonly description: string;
  readonly worldId: string | null;
  readonly evidenceUrl: string | null;
  readonly status: TicketStatus;
  readonly moderatorId: string | null;
  readonly resolutionNote: string | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export type BanType = 'temp' | 'permanent';

export interface Ban {
  readonly id: number;
  readonly playerId: string;
  readonly banType: BanType;
  readonly reason: string;
  readonly moderatorId: string | null;
  readonly bannedAt: number;
  readonly expiresAt: number | null;
  readonly liftedAt: number | null;
  readonly liftedBy: string | null;
  readonly ticketId: string | null;
}

// ─── Public Interface ──────────────────────────────────────────────

export interface PgModerationRepository {
  // Violations
  recordViolation(v: Omit<Violation, 'id' | 'detectedAt' | 'createdAt'>): Promise<Violation>;
  getViolations(playerId: string, limit?: number): Promise<readonly Violation[]>;

  // Support tickets
  createTicket(t: Omit<SupportTicket, 'status' | 'moderatorId' | 'resolutionNote' | 'createdAt' | 'updatedAt'>): Promise<SupportTicket>;
  getTicket(ticketId: string): Promise<SupportTicket | null>;
  updateTicket(ticketId: string, update: { status?: TicketStatus; moderatorId?: string; resolutionNote?: string }): Promise<SupportTicket | null>;

  // Bans
  banPlayer(b: Omit<Ban, 'id' | 'bannedAt' | 'liftedAt' | 'liftedBy'>): Promise<Ban>;
  liftBan(playerId: string, liftedBy: string): Promise<void>;
  getActiveBan(playerId: string): Promise<Ban | null>;
  getBanHistory(playerId: string): Promise<readonly Ban[]>;
}

// ─── Factory ──────────────────────────────────────────────────────

export function createPgModerationRepository(pool: Pool): PgModerationRepository {
  return {
    // ── Violations ──────────────────────────────────────────────────

    async recordViolation(v) {
      const result = await pool.query<{
        id: string; player_id: string; violation_type: string;
        severity: number; details: string | null; detected_at: Date;
        penalty_tier: string | null; created_at: Date;
      }>(
        `INSERT INTO loom_violations
           (player_id, violation_type, severity, details, penalty_tier)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [v.playerId, v.violationType, v.severity, v.details ?? null, v.penaltyTier ?? null],
      );
      return rowToViolation(result.rows[0]!);
    },

    async getViolations(playerId, limit = 50) {
      const result = await pool.query<{
        id: string; player_id: string; violation_type: string;
        severity: number; details: string | null; detected_at: Date;
        penalty_tier: string | null; created_at: Date;
      }>(
        `SELECT * FROM loom_violations WHERE player_id = $1
         ORDER BY detected_at DESC LIMIT $2`,
        [playerId, limit],
      );
      return result.rows.map(rowToViolation);
    },

    // ── Support Tickets ─────────────────────────────────────────────

    async createTicket(t) {
      const result = await pool.query<TicketRow>(
        `INSERT INTO loom_support_tickets
           (ticket_id, reporter_id, target_player_id, category, description, world_id, evidence_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [t.ticketId, t.reporterId, t.targetPlayerId ?? null, t.category,
         t.description, t.worldId ?? null, t.evidenceUrl ?? null],
      );
      return rowToTicket(result.rows[0]!);
    },

    async getTicket(ticketId) {
      const result = await pool.query<TicketRow>(
        'SELECT * FROM loom_support_tickets WHERE ticket_id = $1',
        [ticketId],
      );
      const row = result.rows[0];
      return row !== undefined ? rowToTicket(row) : null;
    },

    async updateTicket(ticketId, update) {
      const sets: string[] = ['updated_at = NOW()'];
      const params: unknown[] = [ticketId];
      if (update.status !== undefined) { params.push(update.status); sets.push(`status = $${params.length}`); }
      if (update.moderatorId !== undefined) { params.push(update.moderatorId); sets.push(`moderator_id = $${params.length}`); }
      if (update.resolutionNote !== undefined) { params.push(update.resolutionNote); sets.push(`resolution_note = $${params.length}`); }

      const result = await pool.query<TicketRow>(
        `UPDATE loom_support_tickets SET ${sets.join(', ')}
         WHERE ticket_id = $1 RETURNING *`,
        params,
      );
      const row = result.rows[0];
      return row !== undefined ? rowToTicket(row) : null;
    },

    // ── Bans ────────────────────────────────────────────────────────

    async banPlayer(b) {
      const result = await pool.query<BanRow>(
        `INSERT INTO loom_bans
           (player_id, ban_type, reason, moderator_id, expires_at, ticket_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          b.playerId, b.banType, b.reason, b.moderatorId ?? null,
          b.expiresAt !== null ? new Date(b.expiresAt).toISOString() : null,
          b.ticketId ?? null,
        ],
      );
      return rowToBan(result.rows[0]!);
    },

    async liftBan(playerId, liftedBy) {
      await pool.query(
        `UPDATE loom_bans SET lifted_at = NOW(), lifted_by = $2
         WHERE player_id = $1 AND lifted_at IS NULL`,
        [playerId, liftedBy],
      );
    },

    async getActiveBan(playerId) {
      const result = await pool.query<BanRow>(
        `SELECT * FROM loom_bans
         WHERE player_id = $1 AND lifted_at IS NULL
         ORDER BY banned_at DESC LIMIT 1`,
        [playerId],
      );
      const row = result.rows[0];
      return row !== undefined ? rowToBan(row) : null;
    },

    async getBanHistory(playerId) {
      const result = await pool.query<BanRow>(
        'SELECT * FROM loom_bans WHERE player_id = $1 ORDER BY banned_at DESC',
        [playerId],
      );
      return result.rows.map(rowToBan);
    },
  };
}

// ─── Row Types + Mappers ───────────────────────────────────────────

type TicketRow = {
  ticket_id: string; reporter_id: string; target_player_id: string | null;
  category: string; description: string; world_id: string | null;
  evidence_url: string | null; status: string; moderator_id: string | null;
  resolution_note: string | null; created_at: Date; updated_at: Date;
};

type BanRow = {
  id: string; player_id: string; ban_type: string; reason: string;
  moderator_id: string | null; banned_at: Date; expires_at: Date | null;
  lifted_at: Date | null; lifted_by: string | null; ticket_id: string | null;
};

function rowToViolation(row: {
  id: string; player_id: string; violation_type: string;
  severity: number; details: string | null; detected_at: Date;
  penalty_tier: string | null; created_at: Date;
}): Violation {
  return {
    id: parseInt(row.id, 10),
    playerId: row.player_id,
    violationType: row.violation_type,
    severity: row.severity,
    details: row.details,
    detectedAt: new Date(row.detected_at).getTime(),
    penaltyTier: row.penalty_tier as Violation['penaltyTier'],
    createdAt: new Date(row.created_at).getTime(),
  };
}

function rowToTicket(row: TicketRow): SupportTicket {
  return {
    ticketId: row.ticket_id,
    reporterId: row.reporter_id,
    targetPlayerId: row.target_player_id,
    category: row.category as TicketCategory,
    description: row.description,
    worldId: row.world_id,
    evidenceUrl: row.evidence_url,
    status: row.status as TicketStatus,
    moderatorId: row.moderator_id,
    resolutionNote: row.resolution_note,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

function rowToBan(row: BanRow): Ban {
  return {
    id: parseInt(row.id, 10),
    playerId: row.player_id,
    banType: row.ban_type as BanType,
    reason: row.reason,
    moderatorId: row.moderator_id,
    bannedAt: new Date(row.banned_at).getTime(),
    expiresAt: row.expires_at !== null ? new Date(row.expires_at).getTime() : null,
    liftedAt: row.lifted_at !== null ? new Date(row.lifted_at).getTime() : null,
    liftedBy: row.lifted_by,
    ticketId: row.ticket_id,
  };
}
