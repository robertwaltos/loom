/**
 * assembly-voting-api.ts — Full Assembly governance voting API.
 *
 * Implements the quadratic voting system with liquid democracy delegation,
 * Architect weight application, and quorum requirements.
 *
 * From bible:
 *  - Quadratic voting: voice_credits = sqrt(KALON_position)  max 100 per motion
 *  - Vote weight: 40% Chronicle Depth + 35% Civic Contribution + 25% KALON Position
 *  - Architect weight: 14% of final tally (applied after all player votes)
 *  - Quorum: 15% of registered dynasties must vote for binding result
 *  - Contested: margin < 3% triggers 72-hour re-vote period
 *
 * Thread: steel
 * Tier: 1
 */
// ─── Constants ────────────────────────────────────────────────────────────────
export const ARCHITECT_VOTE_WEIGHT_PERCENT = 14;
export const QUORUM_THRESHOLD_PERCENT = 15;
export const CONTESTED_MARGIN_THRESHOLD_PERCENT = 3;
export const MAX_VOICE_CREDITS_PER_MOTION = 100;
export const REVOTE_WINDOW_HOURS = 72;
export const EMERGENCY_SESSION_MIN_SUPPORTERS = 3;
export const VOTE_WEIGHT_CHRONICLE_DEPTH_PERCENT = 40;
export const VOTE_WEIGHT_CIVIC_CONTRIBUTION_PERCENT = 35;
export const VOTE_WEIGHT_KALON_POSITION_PERCENT = 25;
export const MICRO_KALON_PER_KALON = 1000000n;
export class AssemblyVotingError extends Error {
    code;
    statusCode;
    constructor(code, message, statusCode = 400) {
        super(`[${code}] ${message}`);
        this.name = 'AssemblyVotingError';
        this.code = code;
        this.statusCode = statusCode;
    }
}
// ─── Quadratic Voting Calculation ─────────────────────────────────────────────
/**
 * Calculate voice credits from KALON position.
 * voiceCredits = Math.min(sqrt(KALON_position), MAX_VOICE_CREDITS_PER_MOTION)
 */
export function calculateVoiceCredits(kalonPositionMicro) {
    const kalon = Number(kalonPositionMicro / MICRO_KALON_PER_KALON);
    const credits = Math.sqrt(kalon);
    return Math.min(Math.floor(credits), MAX_VOICE_CREDITS_PER_MOTION);
}
/**
 * Calculate vote weight for a dynasty.
 * weight = (0.40 × chronicleDepth) + (0.35 × civicContribution) + (0.25 × kalonNormalized)
 * kalonNormalized = voiceCredits / MAX_VOICE_CREDITS_PER_MOTION * 100
 */
export function calculateVoteWeight(profile) {
    const kalonNormalized = (calculateVoiceCredits(profile.kalonPositionMicro) / MAX_VOICE_CREDITS_PER_MOTION) * 100;
    const weight = (VOTE_WEIGHT_CHRONICLE_DEPTH_PERCENT / 100) * profile.chronicleDepthScore +
        (VOTE_WEIGHT_CIVIC_CONTRIBUTION_PERCENT / 100) * profile.civicContributionScore +
        (VOTE_WEIGHT_KALON_POSITION_PERCENT / 100) * kalonNormalized;
    return Math.round(weight * 100) / 100;
}
/**
 * Apply Architect's 14% weight to the final tally.
 * architectContribution = 0.14 × totalPlayerVotes
 * Architect always votes with the majority to preserve stability.
 */
export function applyArchitectWeight(ayePlayerWeight, nayPlayerWeight) {
    const totalPlayerWeight = ayePlayerWeight + nayPlayerWeight;
    const architectContribution = (ARCHITECT_VOTE_WEIGHT_PERCENT / 100) * totalPlayerWeight;
    // Architect votes with majority
    const architectForAye = ayePlayerWeight >= nayPlayerWeight;
    const finalAye = architectForAye
        ? ayePlayerWeight + architectContribution
        : ayePlayerWeight;
    const finalNay = architectForAye
        ? nayPlayerWeight
        : nayPlayerWeight + architectContribution;
    return { finalAye, finalNay, architectContribution };
}
/**
 * Check if a vote result is contested (margin < 3%).
 */
export function isVoteContested(ayeWeight, nayWeight) {
    const total = ayeWeight + nayWeight;
    if (total === 0)
        return false;
    const marginPercent = (Math.abs(ayeWeight - nayWeight) / total) * 100;
    return marginPercent < CONTESTED_MARGIN_THRESHOLD_PERCENT;
}
/**
 * Check if quorum has been met.
 */
export function isQuorumMet(dynastiesVoted, totalRegistered) {
    if (totalRegistered === 0)
        return false;
    const participationPercent = (dynastiesVoted / totalRegistered) * 100;
    return participationPercent >= QUORUM_THRESHOLD_PERCENT;
}
/**
 * Validate voice credits input.
 */
export function validateVoiceCredits(requested, profile) {
    if (requested < 1 || requested > MAX_VOICE_CREDITS_PER_MOTION) {
        throw new AssemblyVotingError('INVALID_VOICE_CREDITS', `Voice credits must be between 1 and ${MAX_VOICE_CREDITS_PER_MOTION}, got ${requested}`);
    }
    const maxAvailable = calculateVoiceCredits(profile.kalonPositionMicro);
    if (requested > maxAvailable) {
        throw new AssemblyVotingError('KALON_POSITION_REQUIRED', `Dynasty KALON position only supports ${maxAvailable} voice credits, requested ${requested}`);
    }
}
/**
 * Validate emergency session request.
 */
export function validateEmergencySessionRequest(req) {
    if (req.supportingDynasties.length < EMERGENCY_SESSION_MIN_SUPPORTERS - 1) {
        throw new AssemblyVotingError('EMERGENCY_INSUFFICIENT_SUPPORT', `Emergency session requires ${EMERGENCY_SESSION_MIN_SUPPORTERS} dynasties total (filer + ${EMERGENCY_SESSION_MIN_SUPPORTERS - 1} supporters), got ${1 + req.supportingDynasties.length}`);
    }
    if (req.supportingDynasties.includes(req.filedBy)) {
        throw new AssemblyVotingError('DELEGATION_CONFLICT', 'Filing dynasty cannot appear in the supporter list');
    }
}
//# sourceMappingURL=assembly-voting-api.js.map