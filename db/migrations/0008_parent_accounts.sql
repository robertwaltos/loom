-- Parent Accounts
-- COPPA-compliant parent records. Email/password managed by auth provider.
-- All timestamps: BIGINT unix epoch milliseconds.

CREATE TABLE IF NOT EXISTS parent_accounts (
  id                    UUID         PRIMARY KEY,           -- matches auth provider user ID
  consent_verified      BOOLEAN      NOT NULL DEFAULT FALSE,
  consent_verified_at   BIGINT,                            -- epoch ms, null until verified
  consent_method        VARCHAR(32),                        -- 'credit_card_micro', 'email_plus1', etc.
  subscription_status   VARCHAR(32)  NOT NULL DEFAULT 'trial',  -- 'trial', 'active', 'cancelled', 'expired'
  time_controls         JSONB        NOT NULL DEFAULT '{"maxDailyMinutes":null,"bedtimeCutoff":null,"notificationsEnabled":true}',
  created_at            BIGINT       NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_parent_accounts_created_at ON parent_accounts (created_at);
