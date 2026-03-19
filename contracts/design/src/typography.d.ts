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
export declare const TYPOGRAPHY: {
    readonly display: "'Playfair Display', Georgia, serif";
    readonly body: "'Lora', Georgia, serif";
    readonly accent: "'Cinzel', serif";
    readonly mono: "'JetBrains Mono', monospace";
};
export type FontKey = keyof typeof TYPOGRAPHY;
/**
 * Google Fonts configuration for loading.
 *
 * Playfair Display: 400, 500, 700, 900, italic 400 700
 * Lora: 400, 500, 600, italic 400 500
 * Cinzel: 400, 600, 700
 * JetBrains Mono: 300, 400, 500
 */
export declare const FONT_WEIGHTS: {
    readonly display: {
        readonly regular: readonly [400, 500, 700, 900];
        readonly italic: readonly [400, 700];
    };
    readonly body: {
        readonly regular: readonly [400, 500, 600];
        readonly italic: readonly [400, 500];
    };
    readonly accent: {
        readonly regular: readonly [400, 600, 700];
        readonly italic: readonly [];
    };
    readonly mono: {
        readonly regular: readonly [300, 400, 500];
        readonly italic: readonly [];
    };
};
//# sourceMappingURL=typography.d.ts.map