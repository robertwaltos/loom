/**
 * Design Tokens — Typography System.
 *
 * Bible v1.4: Typography hierarchy for The Concord UI.
 *
 * 1. Playfair Display — Headlines, pull quotes, dynasty names in large contexts
 * 2. Lora — Body text, UI copy, Chronicle entries
 * 3. Cinzel — Formal heraldic: MARKS labels, dynasty formal titles, Covenant headers
 * 4. JetBrains Mono — Data: timestamps, block heights, KALON amounts, eyebrow labels
 */

export const TYPOGRAPHY = {
  display:  "'Playfair Display', Georgia, serif",
  body:     "'Lora', Georgia, serif",
  accent:   "'Cinzel', serif",
  mono:     "'JetBrains Mono', monospace",
} as const;

export type FontKey = keyof typeof TYPOGRAPHY;

/**
 * Google Fonts configuration for loading.
 *
 * Playfair Display: 400, 500, 700, 900, italic 400 700
 * Lora: 400, 500, 600, italic 400 500
 * Cinzel: 400, 600, 700
 * JetBrains Mono: 300, 400, 500
 */
export const FONT_WEIGHTS = {
  display: { regular: [400, 500, 700, 900], italic: [400, 700] },
  body:    { regular: [400, 500, 600], italic: [400, 500] },
  accent:  { regular: [400, 600, 700], italic: [] },
  mono:    { regular: [300, 400, 500], italic: [] },
} as const;
