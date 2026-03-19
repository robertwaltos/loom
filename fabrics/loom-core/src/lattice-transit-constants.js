/**
 * lattice-transit-constants.ts — Canonical Lattice transit physics constants.
 *
 * All values are sourced from the Technical Appendix of:
 *   docs/game-bible/lattice-transit-physics.md
 *
 * These constants govern lock time calculations, ZPF anomaly thresholds,
 * beacon specifications, and Survey Corps vessel parameters. Any system
 * touching Lattice transit mechanics MUST use these values — never local magic
 * numbers. See lattice-transit-physics.md for the full physics derivation.
 *
 * Base lock time formula:
 *   lockMs = BASE_LOCK_MS × (1 + distanceLY × LOCK_DISTANCE_FACTOR) × fieldConditionMultiplier
 */
// ── Lock Time ──────────────────────────────────────────────────────────────
/** 3 minutes at zero distance. Baseline for beacon frequency lock. */
export const BASE_LOCK_MS = 180_000;
/** Per-light-year scaling factor for lock time. */
export const LOCK_DISTANCE_FACTOR = 0.15;
// ── Field Condition Multipliers ────────────────────────────────────────────
/** Clear vacuum, no anomaly — fastest possible lock time. */
export const FIELD_CONDITION_MIN = 0.8;
/** Heavy anomaly, near partial collapse risk — slowest normal operation. */
export const FIELD_CONDITION_MAX = 2.4;
// ── ZPF Hz Anomaly Thresholds ──────────────────────────────────────────────
/**
 * ZPF Hz anomaly severity thresholds (deviation from world baseline).
 * Source: Sister Ngozi Achebe-Solberg's observational journal (World 199).
 * These thresholds determine transit reliability and partial collapse risk.
 */
export const ZPF_HZ_ANOMALY = {
    /** Unusual dreams reported by residents. */
    MINOR: 0.5,
    /** Survey instruments inconsistent. */
    NOTABLE: 1.5,
    /** Lock times +15%, elevated partial collapse risk. */
    SIGNIFICANT: 3.0,
    /** Partial collapse risk nonzero. */
    CRITICAL: 7.0,
    /** Assembly emergency session auto-filed. */
    CASCADE: 12.0,
};
/** Lock time penalty at SIGNIFICANT anomaly level (+15%). */
export const SIGNIFICANT_ANOMALY_LOCK_PENALTY = 0.15;
// ── Blind Pulse Parameters ─────────────────────────────────────────────────
/**
 * Survey Corps blind pulse transit parameters.
 * Blind pulse = direction + duration, no beacon destination required.
 * Used only by Survey Corps for first-contact exploration.
 */
export const BLIND_PULSE = {
    /** Minimum effective duration — microsecond produces a very short jump. */
    MIN_DURATION_SECONDS: 0.000001,
    /** Survey Corps operational ceiling before reactor stress becomes critical. */
    MAX_PRACTICAL_DURATION_SECONDS: 600,
    /** Endpoint precision at interstellar range. */
    RESOLUTION_ACCURACY_LIGHT_WEEKS: 1,
};
// ── Beacon Specifications ──────────────────────────────────────────────────
/**
 * Lattice beacon canonical specifications.
 * Beacons are ZPF-coupled devices: signature-immutable, reactor-sustained for
 * 1 million years, signal instantaneous (ZPF modulation, not EM propagation).
 */
export const BEACON = {
    /** Compact fusion reactor lifespan — no maintenance required after deployment. */
    REACTOR_LIFESPAN_YEARS: 1_000_000,
    /** ZPF modulation propagates instantaneously everywhere — no light-speed delay. */
    SIGNAL_PROPAGATION: 'INSTANTANEOUS',
    /** Crystal-lattice geometry burned at manufacture — cannot be changed. */
    SIGNATURE_MUTABLE: false,
};
// ── Transit Event Parameters ───────────────────────────────────────────────
/**
 * Transit subjective duration for the traveller inside the polarized bubble.
 * Independent of stellar distance once beacon lock is achieved.
 */
export const TRANSIT_SECONDS_SUBJECTIVE = 4;
/**
 * Transit is a vacuum polarization pulse — not a persistent corridor.
 * Bubble forms → threshold achieved → beacon lock → snap → dissolution.
 * No open tunnel, no corridor, no residue.
 */
export const TRANSIT_IS_PULSE = true;
// ── Survey Vessel Parameters ───────────────────────────────────────────────
/**
 * Survey Corps vessel blind-pulse performance envelope.
 * Effective velocity is a metric equivalent — the vessel is not literally
 * moving at 0.08–0.12c through space; the ZPF bubble resolves at this rate.
 */
export const SURVEY_VESSEL = {
    EFFECTIVE_VELOCITY_C_MIN: 0.08,
    EFFECTIVE_VELOCITY_C_MAX: 0.12,
    RANGE_LIGHT_YEARS_MIN: 5,
    RANGE_LIGHT_YEARS_MAX: 8,
};
// ── Canonical Functions ────────────────────────────────────────────────────
/**
 * Compute expected beacon frequency lock time in milliseconds.
 *
 * Formula: BASE_LOCK_MS × (1 + distanceLY × LOCK_DISTANCE_FACTOR) × fieldConditionMultiplier
 *
 * @param distanceLightYears - Distance to target beacon in light-years.
 * @param fieldConditionMultiplier - ZPF field condition multiplier, clamped to
 *   [FIELD_CONDITION_MIN, FIELD_CONDITION_MAX].
 * @returns Lock time in milliseconds.
 */
export function computeLockMs(distanceLightYears, fieldConditionMultiplier) {
    const clampedMultiplier = Math.max(FIELD_CONDITION_MIN, Math.min(FIELD_CONDITION_MAX, fieldConditionMultiplier));
    return BASE_LOCK_MS * (1 + distanceLightYears * LOCK_DISTANCE_FACTOR) * clampedMultiplier;
}
/**
 * Convert a ZPF Hz delta (deviation from world baseline) into a field condition
 * multiplier for use in computeLockMs.
 *
 * @param deltaHz - Observed ZPF frequency deviation from baseline, in Hz.
 * @returns Field condition multiplier in [FIELD_CONDITION_MIN, FIELD_CONDITION_MAX].
 */
export function fieldConditionFromHzDelta(deltaHz) {
    if (deltaHz < ZPF_HZ_ANOMALY.MINOR)
        return FIELD_CONDITION_MIN;
    if (deltaHz < ZPF_HZ_ANOMALY.NOTABLE)
        return 1.0;
    if (deltaHz < ZPF_HZ_ANOMALY.SIGNIFICANT)
        return 1.15;
    if (deltaHz < ZPF_HZ_ANOMALY.CRITICAL)
        return 1.5;
    if (deltaHz < ZPF_HZ_ANOMALY.CASCADE)
        return 2.0;
    return FIELD_CONDITION_MAX;
}
/**
 * Classify a ZPF Hz delta into a named anomaly severity level.
 *
 * @param deltaHz - Observed ZPF frequency deviation from baseline, in Hz.
 * @returns The ZpfAnomalyLevel corresponding to the reading.
 */
export function classifyZpfDelta(deltaHz) {
    if (deltaHz < ZPF_HZ_ANOMALY.MINOR)
        return 'NONE';
    if (deltaHz < ZPF_HZ_ANOMALY.NOTABLE)
        return 'MINOR';
    if (deltaHz < ZPF_HZ_ANOMALY.SIGNIFICANT)
        return 'NOTABLE';
    if (deltaHz < ZPF_HZ_ANOMALY.CRITICAL)
        return 'SIGNIFICANT';
    if (deltaHz < ZPF_HZ_ANOMALY.CASCADE)
        return 'CRITICAL';
    return 'CASCADE';
}
//# sourceMappingURL=lattice-transit-constants.js.map