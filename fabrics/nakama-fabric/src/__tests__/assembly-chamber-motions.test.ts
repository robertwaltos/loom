import { describe, it, expect } from 'vitest';
import {
  MOTION_REQUIREMENTS,
  ARCHITECT_VOTE_FOR_ASCENDANCY_REPRESENTATION,
  ARCHITECT_VOTE_AGAINST_ASCENDANCY_REPRESENTATION,
  ChamberMotionError,
  createChamberMotion,
  beginDebate,
  castVote,
  resolveMotion,
  withdrawMotion,
  checkArchitectRequirement,
} from '../assembly-chamber-motions.js';
import type {
  ChamberMotion,
  ChamberMotionType,
} from '../assembly-chamber-motions.js';

// ── Helpers ──────────────────────────────────────────────────────────

function makeMotion(
  type: ChamberMotionType = 'WORLD_247_DECLASSIFICATION',
  id = 'motion-01',
): ChamberMotion {
  return createChamberMotion(id, type, 'dynasty-test', 42);
}

const VOTE_RESULT = { for: 300, against: 100, abstain: 20 };

// ── MOTION_REQUIREMENTS map ──────────────────────────────────────────

describe('MOTION_REQUIREMENTS', () => {
  it('contains all six motion types', () => {
    expect(MOTION_REQUIREMENTS.size).toBe(6);
  });

  it('ASCENDANCY_REPRESENTATION_VOTE requires the Architect', () => {
    const req = MOTION_REQUIREMENTS.get('ASCENDANCY_REPRESENTATION_VOTE');
    expect(req?.architectRequired).toBe(true);
    expect(req?.threshold).toBe('CONSTITUTIONAL');
  });

  it('WORLD_247_DECLASSIFICATION does not require the Architect', () => {
    const req = MOTION_REQUIREMENTS.get('WORLD_247_DECLASSIFICATION');
    expect(req?.architectRequired).toBe(false);
    expect(req?.threshold).toBe('SIGNIFICANT');
  });

  it('WORLD_499_QUARANTINE_LIFT has ORDINARY threshold', () => {
    expect(MOTION_REQUIREMENTS.get('WORLD_499_QUARANTINE_LIFT')?.threshold).toBe('ORDINARY');
  });

  it('ADEYEMI_AUDIT_MOTION has SIGNIFICANT threshold', () => {
    expect(MOTION_REQUIREMENTS.get('ADEYEMI_AUDIT_MOTION')?.threshold).toBe('SIGNIFICANT');
  });

  it('LATTICE_DEGRADATION_PETITION has ORDINARY threshold', () => {
    expect(MOTION_REQUIREMENTS.get('LATTICE_DEGRADATION_PETITION')?.threshold).toBe('ORDINARY');
  });

  it('WORLD_412_ACCOUNT_RELEASE has SIGNIFICANT threshold', () => {
    expect(MOTION_REQUIREMENTS.get('WORLD_412_ACCOUNT_RELEASE')?.threshold).toBe('SIGNIFICANT');
  });
});

// ── Architect Vote Statements ────────────────────────────────────────

describe('Architect vote statements', () => {
  it('FOR statement contains key phrase', () => {
    expect(ARCHITECT_VOTE_FOR_ASCENDANCY_REPRESENTATION).toContain('I vote to seat the delegation');
  });

  it('AGAINST statement contains the "I vote against" phrase', () => {
    expect(ARCHITECT_VOTE_AGAINST_ASCENDANCY_REPRESENTATION).toContain('I vote against');
  });
});

// ── ChamberMotionError ───────────────────────────────────────────────

describe('ChamberMotionError', () => {
  it('has correct name and code and motionId', () => {
    const err = new ChamberMotionError('BAD_CODE', 'motion-99', 'detail here');
    expect(err.name).toBe('ChamberMotionError');
    expect(err.code).toBe('BAD_CODE');
    expect(err.motionId).toBe('motion-99');
  });

  it('message contains code, motionId, and detail', () => {
    const err = new ChamberMotionError('CODE', 'mid', 'detail');
    expect(err.message).toContain('CODE');
    expect(err.message).toContain('mid');
    expect(err.message).toContain('detail');
  });
});

// ── createChamberMotion ──────────────────────────────────────────────

describe('createChamberMotion', () => {
  it('creates a PENDING motion with correct fields', () => {
    const m = makeMotion();
    expect(m.motionId).toBe('motion-01');
    expect(m.motionType).toBe('WORLD_247_DECLASSIFICATION');
    expect(m.filedByDynastyId).toBe('dynasty-test');
    expect(m.filedAtIngameYear).toBe(42);
    expect(m.status).toBe('PENDING');
    expect(m.voteResult).toBeNull();
    expect(m.architectVote).toBe('NOT_CAST');
    expect(m.chamberUnlockTriggered).toBe(false);
  });

  it('sets requiredThreshold from requirements map', () => {
    const m = makeMotion('ASCENDANCY_REPRESENTATION_VOTE');
    expect(m.requiredThreshold).toBe('CONSTITUTIONAL');
  });

  it('throws ChamberMotionError for unknown motion type', () => {
    expect(() =>
      createChamberMotion('x', 'UNKNOWN_TYPE' as ChamberMotionType, 'dyn', 1),
    ).toThrow(ChamberMotionError);
  });
});

// ── beginDebate ──────────────────────────────────────────────────────

describe('beginDebate', () => {
  it('transitions PENDING → DEBATE', () => {
    const m = beginDebate(makeMotion());
    expect(m.status).toBe('DEBATE');
  });

  it('throws if status is not PENDING', () => {
    const m = beginDebate(makeMotion());
    expect(() => beginDebate(m)).toThrow(ChamberMotionError);
  });
});

// ── castVote ─────────────────────────────────────────────────────────

describe('castVote', () => {
  it('transitions DEBATE → VOTED and records result', () => {
    const m = castVote(beginDebate(makeMotion()), VOTE_RESULT, 'FOR');
    expect(m.status).toBe('VOTED');
    expect(m.voteResult).toEqual(VOTE_RESULT);
    expect(m.architectVote).toBe('FOR');
  });

  it('throws if status is not DEBATE', () => {
    const m = makeMotion();
    expect(() => castVote(m, VOTE_RESULT, 'FOR')).toThrow(ChamberMotionError);
  });

  it('records ABSTAIN architect vote', () => {
    const m = castVote(beginDebate(makeMotion()), VOTE_RESULT, 'ABSTAIN');
    expect(m.architectVote).toBe('ABSTAIN');
  });
});

// ── resolveMotion ────────────────────────────────────────────────────

describe('resolveMotion', () => {
  function votedMotion(): ChamberMotion {
    return castVote(beginDebate(makeMotion()), VOTE_RESULT, 'FOR');
  }

  it('VOTED → PASSED when passed=true, unlocks chamber', () => {
    const m = resolveMotion(votedMotion(), true);
    expect(m.status).toBe('PASSED');
    expect(m.chamberUnlockTriggered).toBe(true);
  });

  it('VOTED → FAILED when passed=false, no chamber unlock', () => {
    const m = resolveMotion(votedMotion(), false);
    expect(m.status).toBe('FAILED');
    expect(m.chamberUnlockTriggered).toBe(false);
  });

  it('throws if status is not VOTED', () => {
    expect(() => resolveMotion(makeMotion(), true)).toThrow(ChamberMotionError);
  });
});

// ── withdrawMotion ───────────────────────────────────────────────────

describe('withdrawMotion', () => {
  it('transitions PENDING → WITHDRAWN', () => {
    expect(withdrawMotion(makeMotion()).status).toBe('WITHDRAWN');
  });

  it('transitions DEBATE → WITHDRAWN', () => {
    expect(withdrawMotion(beginDebate(makeMotion())).status).toBe('WITHDRAWN');
  });

  it('throws if motion is already PASSED', () => {
    const passed = resolveMotion(castVote(beginDebate(makeMotion()), VOTE_RESULT, 'FOR'), true);
    expect(() => withdrawMotion(passed)).toThrow(ChamberMotionError);
  });

  it('throws if motion is already FAILED', () => {
    const failed = resolveMotion(castVote(beginDebate(makeMotion()), VOTE_RESULT, 'FOR'), false);
    expect(() => withdrawMotion(failed)).toThrow(ChamberMotionError);
  });

  it('throws if motion is already WITHDRAWN', () => {
    const withdrawn = withdrawMotion(makeMotion());
    expect(() => withdrawMotion(withdrawn)).toThrow(ChamberMotionError);
  });
});

// ── checkArchitectRequirement ────────────────────────────────────────

describe('checkArchitectRequirement', () => {
  it('non-architect motion: canPass=true regardless of vote', () => {
    const m = makeMotion('WORLD_247_DECLASSIFICATION');
    const check = checkArchitectRequirement(m);
    expect(check.requiresArchitect).toBe(false);
    expect(check.canPass).toBe(true);
  });

  it('ASCENDANCY_REPRESENTATION_VOTE: canPass=false when NOT_CAST', () => {
    const m = makeMotion('ASCENDANCY_REPRESENTATION_VOTE');
    const check = checkArchitectRequirement(m);
    expect(check.requiresArchitect).toBe(true);
    expect(check.architectHasVoted).toBe(false);
    expect(check.canPass).toBe(false);
  });

  it('ASCENDANCY_REPRESENTATION_VOTE: canPass=true when architect votes FOR', () => {
    const m = castVote(
      beginDebate(makeMotion('ASCENDANCY_REPRESENTATION_VOTE')),
      VOTE_RESULT,
      'FOR',
    );
    const check = checkArchitectRequirement(m);
    expect(check.requiresArchitect).toBe(true);
    expect(check.architectHasVoted).toBe(true);
    expect(check.canPass).toBe(true);
  });

  it('ASCENDANCY_REPRESENTATION_VOTE: canPass=false when architect votes AGAINST', () => {
    const m = castVote(
      beginDebate(makeMotion('ASCENDANCY_REPRESENTATION_VOTE')),
      VOTE_RESULT,
      'AGAINST',
    );
    const check = checkArchitectRequirement(m);
    expect(check.canPass).toBe(false);
  });
});
