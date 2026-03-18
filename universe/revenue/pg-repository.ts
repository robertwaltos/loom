/**
 * Koydo Worlds — Revenue PG Repository
 *
 * Persists RevenueEvent records to the revenue_events table and
 * snapshots RoyaltyLedgerEntry rows to royalty_ledger.
 *
 * At boot, main.ts loads all historical events into the in-memory
 * RevenueEngine so quarterly royalty calculations remain accurate.
 *
 * Tables: revenue_events, royalty_ledger (see db/migrations/0012)
 */

import type { Pool } from 'pg';
import type { RevenueEvent, RoyaltyLedgerEntry } from './types.js';

// ─── Public Interface ──────────────────────────────────────────────

export interface PgRevenueRepository {
  /** Persist a new revenue event (idempotent on transaction_id). */
  saveEvent(event: RevenueEvent): Promise<void>;
  /** Load all revenue events ordered by created_at ASC. */
  loadAllEvents(): Promise<readonly RevenueEvent[]>;
  /** Upsert a quarterly royalty ledger snapshot. */
  saveLedger(entry: RoyaltyLedgerEntry): Promise<void>;
  /** Load a single ledger entry by quarter, or null if absent. */
  loadLedger(quarter: string): Promise<RoyaltyLedgerEntry | null>;
  /** Load all ledger entries ordered by quarter. */
  loadAllLedgers(): Promise<readonly RoyaltyLedgerEntry[]>;
}

// ─── Factory ──────────────────────────────────────────────────────

export function createPgRevenueRepository(pool: Pool): PgRevenueRepository {
  return {
    async saveEvent(event) {
      await pool.query(
        `INSERT INTO revenue_events
           (id, event_type, gross_amount_usd, net_amount_usd, platform,
            payment_processor, user_id, transaction_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (transaction_id) DO NOTHING`,
        [
          event.id,
          event.eventType,
          event.grossAmountUsd,
          event.netAmountUsd,
          event.platform,
          event.paymentProcessor,
          event.userId,
          event.transactionId,
          event.createdAt,
        ],
      );
    },

    async loadAllEvents() {
      const result = await pool.query<{
        id: string;
        event_type: string;
        gross_amount_usd: string;
        net_amount_usd: string;
        platform: string;
        payment_processor: string;
        user_id: string;
        transaction_id: string;
        created_at: string;
      }>('SELECT * FROM revenue_events ORDER BY created_at ASC');

      return result.rows.map(row => ({
        id: row.id,
        eventType: row.event_type as RevenueEvent['eventType'],
        grossAmountUsd: parseFloat(row.gross_amount_usd),
        netAmountUsd: parseFloat(row.net_amount_usd),
        platform: row.platform as RevenueEvent['platform'],
        paymentProcessor: row.payment_processor as RevenueEvent['paymentProcessor'],
        userId: row.user_id,
        transactionId: row.transaction_id,
        createdAt: Number(row.created_at),
      }));
    },

    async saveLedger(entry) {
      await pool.query(
        `INSERT INTO royalty_ledger
           (id, quarter, total_gross_revenue, epic_store_revenue,
            royalty_eligible_revenue, cumulative_lifetime_gross,
            royalty_rate, royalty_owed, threshold_note,
            report_submitted, report_submitted_at, payment_status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (quarter) DO UPDATE SET
           total_gross_revenue       = EXCLUDED.total_gross_revenue,
           epic_store_revenue        = EXCLUDED.epic_store_revenue,
           royalty_eligible_revenue  = EXCLUDED.royalty_eligible_revenue,
           cumulative_lifetime_gross = EXCLUDED.cumulative_lifetime_gross,
           royalty_rate              = EXCLUDED.royalty_rate,
           royalty_owed              = EXCLUDED.royalty_owed,
           threshold_note            = EXCLUDED.threshold_note,
           report_submitted          = EXCLUDED.report_submitted,
           report_submitted_at       = EXCLUDED.report_submitted_at,
           payment_status            = EXCLUDED.payment_status`,
        [
          entry.id,
          entry.quarter,
          entry.totalGrossRevenue,
          entry.epicStoreRevenue,
          entry.royaltyEligibleRevenue,
          entry.cumulativeLifetimeGross,
          entry.royaltyRate,
          entry.royaltyOwed,
          entry.thresholdNote,
          entry.reportSubmitted,
          entry.reportSubmittedAt ?? null,
          entry.paymentStatus,
          entry.createdAt,
        ],
      );
    },

    async loadLedger(quarter) {
      const result = await pool.query<{
        id: string;
        quarter: string;
        total_gross_revenue: string;
        epic_store_revenue: string;
        royalty_eligible_revenue: string;
        cumulative_lifetime_gross: string;
        royalty_rate: string;
        royalty_owed: string;
        threshold_note: string;
        report_submitted: boolean;
        report_submitted_at: string | null;
        payment_status: string;
        created_at: string;
      }>(
        'SELECT * FROM royalty_ledger WHERE quarter = $1',
        [quarter],
      );

      const row = result.rows[0];
      if (row === undefined) return null;
      return rowToLedger(row);
    },

    async loadAllLedgers() {
      const result = await pool.query<{
        id: string;
        quarter: string;
        total_gross_revenue: string;
        epic_store_revenue: string;
        royalty_eligible_revenue: string;
        cumulative_lifetime_gross: string;
        royalty_rate: string;
        royalty_owed: string;
        threshold_note: string;
        report_submitted: boolean;
        report_submitted_at: string | null;
        payment_status: string;
        created_at: string;
      }>('SELECT * FROM royalty_ledger ORDER BY quarter ASC');

      return result.rows.map(rowToLedger);
    },
  };
}

// ─── Row Mapper ────────────────────────────────────────────────────

function rowToLedger(row: {
  id: string;
  quarter: string;
  total_gross_revenue: string;
  epic_store_revenue: string;
  royalty_eligible_revenue: string;
  cumulative_lifetime_gross: string;
  royalty_rate: string;
  royalty_owed: string;
  threshold_note: string;
  report_submitted: boolean;
  report_submitted_at: string | null;
  payment_status: string;
  created_at: string;
}): RoyaltyLedgerEntry {
  return {
    id: row.id,
    quarter: row.quarter,
    totalGrossRevenue: parseFloat(row.total_gross_revenue),
    epicStoreRevenue: parseFloat(row.epic_store_revenue),
    royaltyEligibleRevenue: parseFloat(row.royalty_eligible_revenue),
    cumulativeLifetimeGross: parseFloat(row.cumulative_lifetime_gross),
    royaltyRate: parseFloat(row.royalty_rate),
    royaltyOwed: parseFloat(row.royalty_owed),
    thresholdNote: row.threshold_note,
    reportSubmitted: row.report_submitted,
    reportSubmittedAt: row.report_submitted_at !== null ? Number(row.report_submitted_at) : null,
    paymentStatus: row.payment_status as RoyaltyLedgerEntry['paymentStatus'],
    createdAt: Number(row.created_at),
  };
}
