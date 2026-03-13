/**
 * Accessibility System — text scaling, high contrast mode,
 * and cognitive accessibility features.
 *
 * The Loom manages accessibility state and preference profiles.
 * UE5+UI layer renders according to these parameters.
 *
 *   - Text scaling: 50%–200% UI scale, resizable chat fonts
 *   - High contrast mode: enhanced outlines, simplified backgrounds
 *   - Cognitive accessibility: simplified UI, extended timers, quest summaries
 *
 * "Every world. Every player. No exceptions."
 */

import type { LoomEvent } from '@loom/events-contracts';

// ─── Ports ──────────────────────────────────────────────────────────

export interface AccClockPort {
  readonly now: () => bigint;
}

export interface AccIdPort {
  readonly next: () => string;
}

export interface AccLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface AccEventPort {
  readonly emit: (event: LoomEvent) => void;
}

export interface AccStorePort {
  readonly saveTextScaleProfile: (profile: TextScaleProfile) => Promise<void>;
  readonly getTextScaleProfile: (playerId: string) => Promise<TextScaleProfile | undefined>;
  readonly saveHighContrastProfile: (profile: HighContrastProfile) => Promise<void>;
  readonly getHighContrastProfile: (playerId: string) => Promise<HighContrastProfile | undefined>;
  readonly saveCognitiveProfile: (profile: CognitiveAccessProfile) => Promise<void>;
  readonly getCognitiveProfile: (playerId: string) => Promise<CognitiveAccessProfile | undefined>;
  readonly saveAccessibilityPreset: (preset: AccessibilityPreset) => Promise<void>;
  readonly getAccessibilityPreset: (presetId: string) => Promise<AccessibilityPreset | undefined>;
  readonly listPresets: () => Promise<readonly AccessibilityPreset[]>;
}

// ─── Constants ──────────────────────────────────────────────────────

export const TEXT_SCALE_MIN = 0.5;
export const TEXT_SCALE_MAX = 2.0;
export const TEXT_SCALE_DEFAULT = 1.0;
export const TEXT_SCALE_STEP = 0.1;

export const CONTRAST_MODES = ['off', 'enhanced', 'maximum'] as const;
export type ContrastMode = (typeof CONTRAST_MODES)[number];

export const COGNITIVE_LEVELS = ['standard', 'simplified', 'minimal'] as const;
export type CognitiveLevel = (typeof COGNITIVE_LEVELS)[number];

const BASE_FONT_SIZES: Readonly<Record<string, number>> = {
  chat: 14,
  hud: 12,
  menu: 16,
  tooltip: 13,
  dialogue: 15,
  notification: 14,
};

const TIMER_MULTIPLIERS: Readonly<Record<CognitiveLevel, number>> = {
  standard: 1.0,
  simplified: 1.5,
  minimal: 2.5,
};

const OUTLINE_WIDTHS: Readonly<Record<ContrastMode, number>> = {
  off: 0,
  enhanced: 2,
  maximum: 4,
};

// ─── Types ──────────────────────────────────────────────────────────

export interface TextScaleProfile {
  readonly playerId: string;
  readonly globalScale: number;
  readonly chatFontSize: number;
  readonly hudFontSize: number;
  readonly menuFontSize: number;
  readonly tooltipFontSize: number;
  readonly dialogueFontSize: number;
  readonly notificationFontSize: number;
  readonly updatedAtMs: number;
}

export interface HighContrastProfile {
  readonly playerId: string;
  readonly mode: ContrastMode;
  readonly outlineWidthPx: number;
  readonly simplifiedBackgrounds: boolean;
  readonly enhancedCrosshair: boolean;
  readonly uiBackgroundOpacity: number;
  readonly npcNameplateContrast: boolean;
  readonly minimapHighContrast: boolean;
  readonly updatedAtMs: number;
}

export interface CognitiveAccessProfile {
  readonly playerId: string;
  readonly level: CognitiveLevel;
  readonly simplifiedUi: boolean;
  readonly timerMultiplier: number;
  readonly questSummariesEnabled: boolean;
  readonly autoNavigationEnabled: boolean;
  readonly reducedAnimations: boolean;
  readonly focusHighlight: boolean;
  readonly actionConfirmation: boolean;
  readonly updatedAtMs: number;
}

export interface AccessibilityPreset {
  readonly presetId: string;
  readonly name: string;
  readonly description: string;
  readonly textScale: number;
  readonly contrastMode: ContrastMode;
  readonly cognitiveLevel: CognitiveLevel;
}

// ─── Helpers ────────────────────────────────────────────────────────

function makeEvent(type: string, payload: unknown, ids: AccIdPort, clock: AccClockPort): LoomEvent {
  return {
    eventId: ids.next(),
    type,
    payload,
    timestamp: Number(clock.now()),
    correlationId: ids.next(),
    causationId: ids.next(),
    sequenceNumber: 0,
    sourceWorldId: '',
    sourceFabricId: 'accessibility',
    schemaVersion: 1,
    metadata: {},
  } as LoomEvent;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ─── Text Scaling ───────────────────────────────────────────────────

export function computeTextScaleProfile(
  playerId: string,
  globalScale: number,
  clock: AccClockPort,
): TextScaleProfile {
  const scale = clamp(globalScale, TEXT_SCALE_MIN, TEXT_SCALE_MAX);
  return {
    playerId,
    globalScale: scale,
    chatFontSize: Math.round(BASE_FONT_SIZES['chat'] * scale),
    hudFontSize: Math.round(BASE_FONT_SIZES['hud'] * scale),
    menuFontSize: Math.round(BASE_FONT_SIZES['menu'] * scale),
    tooltipFontSize: Math.round(BASE_FONT_SIZES['tooltip'] * scale),
    dialogueFontSize: Math.round(BASE_FONT_SIZES['dialogue'] * scale),
    notificationFontSize: Math.round(BASE_FONT_SIZES['notification'] * scale),
    updatedAtMs: Number(clock.now()),
  };
}

// ─── High Contrast ──────────────────────────────────────────────────

export function computeHighContrastProfile(
  playerId: string,
  mode: ContrastMode,
  clock: AccClockPort,
): HighContrastProfile {
  const outlineWidthPx = OUTLINE_WIDTHS[mode];
  const simplifiedBackgrounds = mode !== 'off';
  const enhancedCrosshair = mode === 'maximum';
  const uiBackgroundOpacity = mode === 'off' ? 0.7 : mode === 'enhanced' ? 0.85 : 1.0;

  return {
    playerId,
    mode,
    outlineWidthPx,
    simplifiedBackgrounds,
    enhancedCrosshair,
    uiBackgroundOpacity,
    npcNameplateContrast: mode !== 'off',
    minimapHighContrast: mode === 'maximum',
    updatedAtMs: Number(clock.now()),
  };
}

// ─── Cognitive Accessibility ────────────────────────────────────────

export function computeCognitiveAccessProfile(
  playerId: string,
  level: CognitiveLevel,
  clock: AccClockPort,
): CognitiveAccessProfile {
  return {
    playerId,
    level,
    simplifiedUi: level !== 'standard',
    timerMultiplier: TIMER_MULTIPLIERS[level],
    questSummariesEnabled: level !== 'standard',
    autoNavigationEnabled: level === 'minimal',
    reducedAnimations: level !== 'standard',
    focusHighlight: level !== 'standard',
    actionConfirmation: level === 'minimal',
    updatedAtMs: Number(clock.now()),
  };
}

// ─── Preset Library ─────────────────────────────────────────────────

export function createDefaultAccessibilityPresets(ids: AccIdPort): readonly AccessibilityPreset[] {
  return [
    { presetId: ids.next(), name: 'Default', description: 'Standard settings', textScale: 1.0, contrastMode: 'off', cognitiveLevel: 'standard' },
    { presetId: ids.next(), name: 'Large Text', description: 'Larger text for readability', textScale: 1.5, contrastMode: 'off', cognitiveLevel: 'standard' },
    { presetId: ids.next(), name: 'Extra Large Text', description: 'Maximum text scaling', textScale: 2.0, contrastMode: 'off', cognitiveLevel: 'standard' },
    { presetId: ids.next(), name: 'High Contrast', description: 'Enhanced outlines and backgrounds', textScale: 1.0, contrastMode: 'enhanced', cognitiveLevel: 'standard' },
    { presetId: ids.next(), name: 'Maximum Contrast', description: 'Strongest contrast settings', textScale: 1.2, contrastMode: 'maximum', cognitiveLevel: 'standard' },
    { presetId: ids.next(), name: 'Simplified UI', description: 'Reduced complexity interface', textScale: 1.2, contrastMode: 'off', cognitiveLevel: 'simplified' },
    { presetId: ids.next(), name: 'Minimal UI', description: 'Minimum complexity with navigation aids', textScale: 1.5, contrastMode: 'enhanced', cognitiveLevel: 'minimal' },
    { presetId: ids.next(), name: 'Vision Assist', description: 'Combined large text and high contrast', textScale: 1.8, contrastMode: 'maximum', cognitiveLevel: 'standard' },
  ] as const;
}

// ─── Accessibility Engine ───────────────────────────────────────────

export interface AccessibilityEngine {
  readonly setTextScale: (playerId: string, globalScale: number) => Promise<TextScaleProfile>;
  readonly setContrastMode: (playerId: string, mode: ContrastMode) => Promise<HighContrastProfile>;
  readonly setCognitiveLevel: (playerId: string, level: CognitiveLevel) => Promise<CognitiveAccessProfile>;
  readonly applyPreset: (playerId: string, presetId: string) => Promise<{ text: TextScaleProfile; contrast: HighContrastProfile; cognitive: CognitiveAccessProfile } | undefined>;
  readonly getPresets: () => readonly AccessibilityPreset[];
  readonly getTimerDuration: (baseDurationMs: number, playerId: string) => Promise<number>;
}

export interface AccEngineDeps {
  readonly clock: AccClockPort;
  readonly ids: AccIdPort;
  readonly log: AccLogPort;
  readonly events: AccEventPort;
  readonly store: AccStorePort;
}

export function createAccessibilityEngine(deps: AccEngineDeps): AccessibilityEngine {
  const presets = createDefaultAccessibilityPresets(deps.ids);
  const presetMap = new Map(presets.map((p) => [p.presetId, p]));
  const cognitiveProfiles = new Map<string, CognitiveAccessProfile>();

  return {
    async setTextScale(playerId, globalScale) {
      const profile = computeTextScaleProfile(playerId, globalScale, deps.clock);
      await deps.store.saveTextScaleProfile(profile);
      deps.events.emit(makeEvent('accessibility.text-scale.updated', profile, deps.ids, deps.clock));
      deps.log.info('Text scale updated', { playerId, globalScale: profile.globalScale });
      return profile;
    },

    async setContrastMode(playerId, mode) {
      const profile = computeHighContrastProfile(playerId, mode, deps.clock);
      await deps.store.saveHighContrastProfile(profile);
      deps.events.emit(makeEvent('accessibility.contrast.updated', profile, deps.ids, deps.clock));
      deps.log.info('Contrast mode updated', { playerId, mode });
      return profile;
    },

    async setCognitiveLevel(playerId, level) {
      const profile = computeCognitiveAccessProfile(playerId, level, deps.clock);
      cognitiveProfiles.set(playerId, profile);
      await deps.store.saveCognitiveProfile(profile);
      deps.events.emit(makeEvent('accessibility.cognitive.updated', profile, deps.ids, deps.clock));
      deps.log.info('Cognitive level updated', { playerId, level });
      return profile;
    },

    async applyPreset(playerId, presetId) {
      const preset = presetMap.get(presetId);
      if (!preset) {
        deps.log.warn('Accessibility preset not found', { presetId });
        return undefined;
      }
      const text = computeTextScaleProfile(playerId, preset.textScale, deps.clock);
      const contrast = computeHighContrastProfile(playerId, preset.contrastMode, deps.clock);
      const cognitive = computeCognitiveAccessProfile(playerId, preset.cognitiveLevel, deps.clock);
      cognitiveProfiles.set(playerId, cognitive);
      await deps.store.saveTextScaleProfile(text);
      await deps.store.saveHighContrastProfile(contrast);
      await deps.store.saveCognitiveProfile(cognitive);
      deps.events.emit(makeEvent('accessibility.preset.applied', { playerId, presetId, presetName: preset.name }, deps.ids, deps.clock));
      deps.log.info('Accessibility preset applied', { playerId, presetName: preset.name });
      return { text, contrast, cognitive };
    },

    getPresets() {
      return presets;
    },

    async getTimerDuration(baseDurationMs, playerId) {
      const profile = cognitiveProfiles.get(playerId);
      const multiplier = profile ? profile.timerMultiplier : 1.0;
      return baseDurationMs * multiplier;
    },
  };
}
