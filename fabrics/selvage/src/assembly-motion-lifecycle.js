/**
 * assembly-motion-lifecycle.ts — State machine for Assembly motion progression.
 *
 * State machine: DRAFT → FILED → DEBATE → VOTING → DECIDED → ENACTED | REJECTED | CONTESTED
 *
 * Each state has entry conditions, time limits, valid transitions, and a
 * Chronicle entry auto-generated on transition.
 *
 * Thread: steel
 * Tier: 1
 */
// ─── Time Windows (milliseconds) ─────────────────────────────────────────────
export const DEBATE_WINDOW_MS = 72 * 60 * 60 * 1000; // 72 hours
export const VOTING_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours
export const CONTESTED_REVOTE_WINDOW_MS = 72 * 60 * 60 * 1000; // 72 hours
export const LARGE_CLAIM_ASSEMBLY_WINDOW_MS = 72 * 60 * 60 * 1000; // 72 hours
// ─── Valid Transitions ────────────────────────────────────────────────────────
const VALID_TRANSITIONS = {
    DRAFT: ['FILED', 'WITHDRAWN'],
    FILED: ['DEBATE', 'WITHDRAWN'],
    DEBATE: ['VOTING', 'WITHDRAWN'],
    VOTING: ['DECIDED'],
    DECIDED: ['ENACTED', 'REJECTED', 'CONTESTED'],
    ENACTED: [],
    REJECTED: [],
    CONTESTED: ['VOTING'], // re-vote allowed
    WITHDRAWN: [],
};
export class MotionLifecycleError extends Error {
    code;
    motionId;
    currentPhase;
    constructor(code, motionId, currentPhase, message) {
        super(`[${code}] motion ${motionId} (${currentPhase}): ${message}`);
        this.name = 'MotionLifecycleError';
        this.code = code;
        this.motionId = motionId;
        this.currentPhase = currentPhase;
    }
}
export const MOTION_PHASE_CONDITIONS = [
    {
        phase: 'DRAFT',
        entryCondition: 'Any registered dynasty may draft a motion',
        timeLimit: 'No limit — held until filed or withdrawn',
        chronicleEntryGenerated: false,
        chronicleEntryTemplate: null,
    },
    {
        phase: 'FILED',
        entryCondition: 'Dynasty formally submits motion to Assembly Clerk; must have minimum 1 KALON position',
        timeLimit: 'Enters Debate within 24 hours of filing',
        chronicleEntryGenerated: true,
        chronicleEntryTemplate: 'Motion {title} filed by {dynastyId} — now open for Assembly review',
    },
    {
        phase: 'DEBATE',
        entryCondition: 'Motion passes initial filing review; debate window opens immediately',
        timeLimit: '72 real hours',
        chronicleEntryGenerated: true,
        chronicleEntryTemplate: 'Debate opened on motion: {title}',
    },
    {
        phase: 'VOTING',
        entryCondition: 'Debate window elapsed; Assembly Clerk opens vote',
        timeLimit: '48 real hours',
        chronicleEntryGenerated: true,
        chronicleEntryTemplate: 'Voting opened on motion: {title}',
    },
    {
        phase: 'DECIDED',
        entryCondition: 'Voting window closed; tally computed with Architect weight applied',
        timeLimit: 'Immediate — resolves to ENACTED, REJECTED, or CONTESTED',
        chronicleEntryGenerated: true,
        chronicleEntryTemplate: 'Vote closed on motion: {title} — tallying',
    },
    {
        phase: 'ENACTED',
        entryCondition: 'AYE > NAY after Architect weight; quorum met; margin ≥ 3%',
        timeLimit: 'Terminal',
        chronicleEntryGenerated: true,
        chronicleEntryTemplate: 'Motion {title} enacted by Assembly vote — comes into force immediately',
    },
    {
        phase: 'REJECTED',
        entryCondition: 'NAY ≥ AYE after Architect weight; OR quorum not met',
        timeLimit: 'Terminal',
        chronicleEntryGenerated: true,
        chronicleEntryTemplate: 'Motion {title} rejected by Assembly vote',
    },
    {
        phase: 'CONTESTED',
        entryCondition: 'Margin < 3% after Architect weight — too close to call',
        timeLimit: '72 real hours re-vote window',
        chronicleEntryGenerated: true,
        chronicleEntryTemplate: 'Motion {title} result contested — margin below 3%. 72-hour re-vote convened.',
    },
    {
        phase: 'WITHDRAWN',
        entryCondition: 'Filing dynasty withdraws before VOTING phase',
        timeLimit: 'Terminal',
        chronicleEntryGenerated: true,
        chronicleEntryTemplate: 'Motion {title} withdrawn by filing dynasty',
    },
];
// ─── Terminal Phases ──────────────────────────────────────────────────────────
export const TERMINAL_PHASES = new Set([
    'ENACTED',
    'REJECTED',
    'WITHDRAWN',
]);
export function isTerminalPhase(phase) {
    return TERMINAL_PHASES.has(phase);
}
// ─── Transition Logic ─────────────────────────────────────────────────────────
export function canTransition(from, to) {
    return VALID_TRANSITIONS[from].includes(to);
}
export function validateTransition(motionId, current, next) {
    if (isTerminalPhase(current)) {
        throw new MotionLifecycleError('ALREADY_TERMINAL', motionId, current, `phase ${current} is terminal — no further transitions`);
    }
    if (!canTransition(current, next)) {
        throw new MotionLifecycleError('INVALID_TRANSITION', motionId, current, `cannot transition to ${next}`);
    }
}
// ─── Motion Factory ───────────────────────────────────────────────────────────
export function createMotionRecord(motionId, title, description, type, filedBy, now) {
    return {
        motionId,
        title,
        description,
        type,
        filedBy,
        phase: 'DRAFT',
        filedAt: now,
        debateOpensAt: null,
        debateClosesAt: null,
        votingOpensAt: null,
        votingClosesAt: null,
        decidedAt: null,
        resolvedAt: null,
        chronicleEntryId: null,
        isContested: false,
        reVoteWindowClosesAt: null,
    };
}
export function fileMotion(motion, now) {
    validateTransition(motion.motionId, motion.phase, 'FILED');
    const debateOpensAt = new Date(new Date(now).getTime()).toISOString();
    const debateClosesAt = new Date(new Date(now).getTime() + DEBATE_WINDOW_MS).toISOString();
    return {
        ...motion,
        phase: 'FILED',
        debateOpensAt,
        debateClosesAt,
    };
}
export function openDebate(motion, now) {
    validateTransition(motion.motionId, motion.phase, 'DEBATE');
    return { ...motion, phase: 'DEBATE' };
}
export function openVoting(motion, now) {
    validateTransition(motion.motionId, motion.phase, 'VOTING');
    const votingClosesAt = new Date(new Date(now).getTime() + VOTING_WINDOW_MS).toISOString();
    return {
        ...motion,
        phase: 'VOTING',
        votingOpensAt: now,
        votingClosesAt,
    };
}
export function closeVoting(motion, now) {
    validateTransition(motion.motionId, motion.phase, 'DECIDED');
    return { ...motion, phase: 'DECIDED', decidedAt: now };
}
export function resolveMotion(motion, outcome, now) {
    validateTransition(motion.motionId, motion.phase, outcome);
    const reVoteWindowClosesAt = outcome === 'CONTESTED'
        ? new Date(new Date(now).getTime() + CONTESTED_REVOTE_WINDOW_MS).toISOString()
        : null;
    return {
        ...motion,
        phase: outcome,
        resolvedAt: now,
        isContested: outcome === 'CONTESTED',
        reVoteWindowClosesAt,
    };
}
export function withdrawMotion(motion, now) {
    validateTransition(motion.motionId, motion.phase, 'WITHDRAWN');
    return { ...motion, phase: 'WITHDRAWN', resolvedAt: now };
}
export function getPhaseConditions(phase) {
    return MOTION_PHASE_CONDITIONS.find((c) => c.phase === phase);
}
//# sourceMappingURL=assembly-motion-lifecycle.js.map