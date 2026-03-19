/**
 * Accessibility PG Repository
 *
 * Implements AccStorePort from fabrics/loom-core/src/accessibility-system.ts.
 * Three tables: koydo_accessibility_text_scale, koydo_accessibility_contrast,
 * koydo_accessibility_cognitive.
 */

import type { Pool } from 'pg';
import type {
  AccStorePort,
  TextScaleProfile,
  HighContrastProfile,
  CognitiveAccessProfile,
  AccessibilityPreset,
} from '../../fabrics/loom-core/src/accessibility-system.js';

export function createPgAccessibilityRepository(pool: Pool): AccStorePort {
  return {
    async saveTextScaleProfile(p: TextScaleProfile): Promise<void> {
      await pool.query(
        `INSERT INTO koydo_accessibility_text_scale
           (player_id, global_scale, chat_font_size, hud_font_size, menu_font_size,
            tooltip_font_size, dialogue_font_size, notification_font_size, updated_at_ms)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (player_id) DO UPDATE SET
           global_scale = EXCLUDED.global_scale,
           chat_font_size = EXCLUDED.chat_font_size,
           hud_font_size = EXCLUDED.hud_font_size,
           menu_font_size = EXCLUDED.menu_font_size,
           tooltip_font_size = EXCLUDED.tooltip_font_size,
           dialogue_font_size = EXCLUDED.dialogue_font_size,
           notification_font_size = EXCLUDED.notification_font_size,
           updated_at_ms = EXCLUDED.updated_at_ms`,
        [
          p.playerId, p.globalScale, p.chatFontSize, p.hudFontSize,
          p.menuFontSize, p.tooltipFontSize, p.dialogueFontSize,
          p.notificationFontSize, p.updatedAtMs,
        ],
      );
    },

    async getTextScaleProfile(playerId: string): Promise<TextScaleProfile | undefined> {
      const result = await pool.query(
        'SELECT * FROM koydo_accessibility_text_scale WHERE player_id = $1',
        [playerId],
      );
      const row = result.rows[0];
      if (row === undefined) return undefined;
      return {
        playerId: row.player_id as string,
        globalScale: parseFloat(row.global_scale),
        chatFontSize: row.chat_font_size as number,
        hudFontSize: row.hud_font_size as number,
        menuFontSize: row.menu_font_size as number,
        tooltipFontSize: row.tooltip_font_size as number,
        dialogueFontSize: row.dialogue_font_size as number,
        notificationFontSize: row.notification_font_size as number,
        updatedAtMs: parseInt(row.updated_at_ms, 10),
      };
    },

    async saveHighContrastProfile(p: HighContrastProfile): Promise<void> {
      await pool.query(
        `INSERT INTO koydo_accessibility_contrast
           (player_id, mode, outline_width_px, simplified_backgrounds, enhanced_crosshair,
            ui_background_opacity, npc_nameplate_contrast, minimap_high_contrast, updated_at_ms)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (player_id) DO UPDATE SET
           mode = EXCLUDED.mode,
           outline_width_px = EXCLUDED.outline_width_px,
           simplified_backgrounds = EXCLUDED.simplified_backgrounds,
           enhanced_crosshair = EXCLUDED.enhanced_crosshair,
           ui_background_opacity = EXCLUDED.ui_background_opacity,
           npc_nameplate_contrast = EXCLUDED.npc_nameplate_contrast,
           minimap_high_contrast = EXCLUDED.minimap_high_contrast,
           updated_at_ms = EXCLUDED.updated_at_ms`,
        [
          p.playerId, p.mode, p.outlineWidthPx, p.simplifiedBackgrounds,
          p.enhancedCrosshair, p.uiBackgroundOpacity, p.npcNameplateContrast,
          p.minimapHighContrast, p.updatedAtMs,
        ],
      );
    },

    async getHighContrastProfile(playerId: string): Promise<HighContrastProfile | undefined> {
      const result = await pool.query(
        'SELECT * FROM koydo_accessibility_contrast WHERE player_id = $1',
        [playerId],
      );
      const row = result.rows[0];
      if (row === undefined) return undefined;
      return {
        playerId: row.player_id as string,
        mode: row.mode as HighContrastProfile['mode'],
        outlineWidthPx: row.outline_width_px as number,
        simplifiedBackgrounds: row.simplified_backgrounds as boolean,
        enhancedCrosshair: row.enhanced_crosshair as boolean,
        uiBackgroundOpacity: parseFloat(row.ui_background_opacity),
        npcNameplateContrast: row.npc_nameplate_contrast as boolean,
        minimapHighContrast: row.minimap_high_contrast as boolean,
        updatedAtMs: parseInt(row.updated_at_ms, 10),
      };
    },

    async saveCognitiveProfile(p: CognitiveAccessProfile): Promise<void> {
      await pool.query(
        `INSERT INTO koydo_accessibility_cognitive
           (player_id, level, simplified_ui, timer_multiplier, quest_summaries_enabled,
            auto_navigation_enabled, reduced_animations, focus_highlight,
            action_confirmation, updated_at_ms)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (player_id) DO UPDATE SET
           level = EXCLUDED.level,
           simplified_ui = EXCLUDED.simplified_ui,
           timer_multiplier = EXCLUDED.timer_multiplier,
           quest_summaries_enabled = EXCLUDED.quest_summaries_enabled,
           auto_navigation_enabled = EXCLUDED.auto_navigation_enabled,
           reduced_animations = EXCLUDED.reduced_animations,
           focus_highlight = EXCLUDED.focus_highlight,
           action_confirmation = EXCLUDED.action_confirmation,
           updated_at_ms = EXCLUDED.updated_at_ms`,
        [
          p.playerId, p.level, p.simplifiedUi, p.timerMultiplier,
          p.questSummariesEnabled, p.autoNavigationEnabled, p.reducedAnimations,
          p.focusHighlight, p.actionConfirmation, p.updatedAtMs,
        ],
      );
    },

    async getCognitiveProfile(playerId: string): Promise<CognitiveAccessProfile | undefined> {
      const result = await pool.query(
        'SELECT * FROM koydo_accessibility_cognitive WHERE player_id = $1',
        [playerId],
      );
      const row = result.rows[0];
      if (row === undefined) return undefined;
      return {
        playerId: row.player_id as string,
        level: row.level as CognitiveAccessProfile['level'],
        simplifiedUi: row.simplified_ui as boolean,
        timerMultiplier: parseFloat(row.timer_multiplier),
        questSummariesEnabled: row.quest_summaries_enabled as boolean,
        autoNavigationEnabled: row.auto_navigation_enabled as boolean,
        reducedAnimations: row.reduced_animations as boolean,
        focusHighlight: row.focus_highlight as boolean,
        actionConfirmation: row.action_confirmation as boolean,
        updatedAtMs: parseInt(row.updated_at_ms, 10),
      };
    },

    // Presets are managed in-memory by the engine; these stubs satisfy the interface.
    async saveAccessibilityPreset(_preset: AccessibilityPreset): Promise<void> {},
    async getAccessibilityPreset(_presetId: string): Promise<AccessibilityPreset | undefined> {
      return undefined;
    },
    async listPresets(): Promise<readonly AccessibilityPreset[]> {
      return [];
    },
  };
}
