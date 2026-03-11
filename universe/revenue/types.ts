/**
 * Koydo Worlds — Revenue & Epic Royalty Tracking
 *
 * UE5 Royalty: First $1M lifetime free, then 5% (or 3.5% with Epic Store).
 * Build this once, automate, and forget.
 */

// ─── Revenue Events ────────────────────────────────────────────────

export type RevenueEventType = 'subscription' | 'iap' | 'other';

export type RevenuePlatform = 'ios' | 'android' | 'epic' | 'console' | 'web';

export type PaymentProcessor = 'apple' | 'google' | 'stripe' | 'epic' | 'other';

export interface RevenueEvent {
  readonly id: string;
  readonly eventType: RevenueEventType;
  readonly grossAmountUsd: number;
  readonly netAmountUsd: number;
  readonly platform: RevenuePlatform;
  readonly paymentProcessor: PaymentProcessor;
  readonly userId: string;
  readonly transactionId: string;
  readonly createdAt: number;
}

// ─── Royalty Ledger ────────────────────────────────────────────────

export type RoyaltyPaymentStatus = 'not_due' | 'pending' | 'paid';

export interface RoyaltyLedgerEntry {
  readonly id: string;
  readonly quarter: string;                     // '2027-Q1'
  readonly totalGrossRevenue: number;
  readonly epicStoreRevenue: number;            // Excluded from royalty calc
  readonly royaltyEligibleRevenue: number;
  readonly cumulativeLifetimeGross: number;
  readonly royaltyRate: number;                 // 0.050 or 0.035
  readonly royaltyOwed: number;
  readonly thresholdNote: string;               // 'Under $1M lifetime' | 'Under $10K quarter'
  readonly reportSubmitted: boolean;
  readonly reportSubmittedAt: number | null;
  readonly paymentStatus: RoyaltyPaymentStatus;
  readonly createdAt: number;
}

/**
 * UE5 Royalty Rules (as of March 2026):
 * - First $1,000,000 USD lifetime gross per product: royalty-free
 * - After $1M: 5% of gross revenue (standard rate)
 * - Reduced: 3.5% if launching on Epic Games Store simultaneously
 * - Quarterly reporting required when >$10,000/quarter after crossing $1M
 * - Revenue from Epic Games Store sales excluded from royalty
 * - Report due within 45 days of quarter end
 */
