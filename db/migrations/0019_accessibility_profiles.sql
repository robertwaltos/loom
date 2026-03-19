-- Migration 0019: Accessibility profiles
-- Three lean tables — one per accessibility profile type.
-- Timestamps: BIGINT unix epoch ms (Koydo convention).
-- player_id matches kindler_id from koydo_kindlers.

CREATE TABLE IF NOT EXISTS koydo_accessibility_text_scale (
  player_id        TEXT        NOT NULL PRIMARY KEY,
  global_scale     NUMERIC     NOT NULL DEFAULT 1.0,
  chat_font_size   INTEGER     NOT NULL DEFAULT 14,
  hud_font_size    INTEGER     NOT NULL DEFAULT 12,
  menu_font_size   INTEGER     NOT NULL DEFAULT 16,
  tooltip_font_size    INTEGER NOT NULL DEFAULT 13,
  dialogue_font_size   INTEGER NOT NULL DEFAULT 15,
  notification_font_size INTEGER NOT NULL DEFAULT 14,
  updated_at_ms    BIGINT      NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS koydo_accessibility_contrast (
  player_id                TEXT    NOT NULL PRIMARY KEY,
  mode                     TEXT    NOT NULL DEFAULT 'off',
  outline_width_px         INTEGER NOT NULL DEFAULT 0,
  simplified_backgrounds   BOOLEAN NOT NULL DEFAULT FALSE,
  enhanced_crosshair       BOOLEAN NOT NULL DEFAULT FALSE,
  ui_background_opacity    NUMERIC NOT NULL DEFAULT 0.7,
  npc_nameplate_contrast   BOOLEAN NOT NULL DEFAULT FALSE,
  minimap_high_contrast    BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at_ms            BIGINT  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS koydo_accessibility_cognitive (
  player_id                  TEXT    NOT NULL PRIMARY KEY,
  level                      TEXT    NOT NULL DEFAULT 'standard',
  simplified_ui              BOOLEAN NOT NULL DEFAULT FALSE,
  timer_multiplier           NUMERIC NOT NULL DEFAULT 1.0,
  quest_summaries_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  auto_navigation_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  reduced_animations         BOOLEAN NOT NULL DEFAULT FALSE,
  focus_highlight            BOOLEAN NOT NULL DEFAULT FALSE,
  action_confirmation        BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at_ms              BIGINT  NOT NULL DEFAULT 0
);
