/**
 * historical-pressure-vectors.ts — Quarterly pressure vector calculation.
 *
 * Reads accumulated Remembrance data and outputs per-world pressure vectors.
 * These feed: NPC drift (betrayalWeight), world event probability (conflictWeight),
 * commodity stability (prosperityWeight), Ascendancy threat tier (ascendancySignatureWeight).
 *
 * Vectors expire after 90 days. New calculation on each quarter start.
 *
 * Thread: iron
 * Tier: 1
 */
// ─── Constants ────────────────────────────────────────────────────────────────
const VECTOR_EXPIRY_DAYS = 90;
const MS_PER_DAY = 86_400_000;
// ─── Weight Computation ───────────────────────────────────────────────────────
/**
 * Compute a HistoricalPressureVector for a single world from its Remembrance entries.
 */
export function computePressureVector(worldId, entries, now) {
    const worldEntries = entries.filter((e) => e.worldId === worldId);
    if (worldEntries.length === 0) {
        return buildSilentVector(worldId, now);
    }
    const betrayalCount = worldEntries.filter((e) => e.isBetrayal).length;
    const unresolvedBetraylals = worldEntries.filter((e) => e.isBetrayal && !e.isResolved).length;
    const conflictCount = worldEntries.filter((e) => e.theme === 'CONFLICT' || e.theme === 'BETRAYAL').length;
    const ascendancyCount = worldEntries.filter((e) => e.theme === 'ASCENDANCY').length;
    const prosperityCount = worldEntries.filter((e) => e.theme === 'PROSPERITY').length;
    // betrayalWeight: unresolved betrayals are weighted 2×
    const betrayalWeight = Math.min(100, Math.round(betrayalCount * 4 + unresolvedBetraylals * 8));
    // conflictWeight: +40% bonus when 3+ unresolved betrayals (bible rule)
    const baseConflict = Math.min(100, Math.round(conflictCount * 5));
    const conflictBonus = unresolvedBetraylals >= 3 ? 40 : 0;
    const conflictWeight = Math.min(100, baseConflict + conflictBonus);
    const prosperityWeight = Math.min(100, Math.round(prosperityCount * 10));
    const ascendancySignatureWeight = Math.min(100, Math.round(ascendancyCount * 8));
    const dominantTheme = getDominantTheme(worldEntries);
    const expiresAt = new Date(now.getTime() + VECTOR_EXPIRY_DAYS * MS_PER_DAY);
    return {
        worldId,
        betrayalWeight,
        conflictWeight,
        prosperityWeight,
        ascendancySignatureWeight,
        calculatedAt: now,
        expiresAt,
        sourceEntryCount: worldEntries.length,
        dominantTheme,
    };
}
/**
 * Build a "silent" vector for a world with no Remembrance entries.
 * SILENCE theme signals stagnation — the Architect eventually notices.
 */
export function buildSilentVector(worldId, now) {
    return {
        worldId,
        betrayalWeight: 0,
        conflictWeight: 0,
        prosperityWeight: 0,
        ascendancySignatureWeight: 0,
        calculatedAt: now,
        expiresAt: new Date(now.getTime() + VECTOR_EXPIRY_DAYS * MS_PER_DAY),
        sourceEntryCount: 0,
        dominantTheme: 'SILENCE',
    };
}
/**
 * Determine the dominant Remembrance theme for a world.
 */
export function getDominantTheme(entries) {
    if (entries.length === 0)
        return 'SILENCE';
    const counts = new Map();
    for (const e of entries) {
        counts.set(e.theme, (counts.get(e.theme) ?? 0) + 1);
    }
    let maxCount = 0;
    let dominantTheme = 'SILENCE';
    for (const [theme, count] of counts) {
        if (count > maxCount) {
            maxCount = count;
            dominantTheme = theme;
        }
    }
    return dominantTheme;
}
/**
 * Compute pressure vectors for all worlds in one batch pass.
 */
export function computeAllPressureVectors(worldIds, entries, now) {
    return worldIds.map((worldId) => computePressureVector(worldId, entries, now));
}
/**
 * Check if a vector is still valid (not expired).
 */
export function isVectorActive(vector, now) {
    return vector.expiresAt > now;
}
//# sourceMappingURL=historical-pressure-vectors.js.map