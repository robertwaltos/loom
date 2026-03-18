-- Revenue & Royalty Tracking
-- Records IAP and subscription events. Used for Epic royalty calculations.
-- All timestamps: BIGINT unix epoch milliseconds.

-- ─── Revenue Events ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS revenue_events (
  id                  UUID         PRIMARY KEY,
  event_type          VARCHAR(16)  NOT NULL CHECK (event_type IN ('subscription','iap','other')),
  gross_amount_usd    NUMERIC(12,4) NOT NULL,
  net_amount_usd      NUMERIC(12,4) NOT NULL,
  platform            VARCHAR(16)  NOT NULL CHECK (platform IN ('ios','android','epic','console','web')),
  payment_processor   VARCHAR(16)  NOT NULL CHECK (payment_processor IN ('apple','google','stripe','epic','other')),
  user_id             VARCHAR(128) NOT NULL,
  transaction_id      VARCHAR(256) NOT NULL UNIQUE,
  created_at          BIGINT       NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_revenue_events_created    ON revenue_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_events_platform   ON revenue_events (platform);
CREATE INDEX IF NOT EXISTS idx_revenue_events_user       ON revenue_events (user_id);

-- ─── Royalty Ledger (quarterly Epic royalty reports) ──────────────────────────

CREATE TABLE IF NOT EXISTS royalty_ledger (
  id                        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter                   VARCHAR(7)   NOT NULL UNIQUE,   -- e.g. '2025-Q1'
  total_gross_revenue       NUMERIC(16,4) NOT NULL,
  epic_store_revenue        NUMERIC(16,4) NOT NULL,
  royalty_eligible_revenue  NUMERIC(16,4) NOT NULL,
  cumulative_lifetime_gross NUMERIC(16,4) NOT NULL,
  royalty_rate              NUMERIC(5,4)  NOT NULL,          -- e.g. 0.05 = 5%
  royalty_owed              NUMERIC(16,4) NOT NULL,
  threshold_note            TEXT         NOT NULL DEFAULT '',
  report_submitted          BOOLEAN      NOT NULL DEFAULT FALSE,
  report_submitted_at       BIGINT,
  payment_status            VARCHAR(16)  NOT NULL DEFAULT 'not_due'
                              CHECK (payment_status IN ('not_due','pending','paid')),
  created_at                BIGINT       NOT NULL
);
