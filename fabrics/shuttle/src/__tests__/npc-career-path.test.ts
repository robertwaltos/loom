import { describe, it, expect, beforeEach } from 'vitest';
import type { NpcCareerPathState, NpcCareerPathDeps } from '../npc-career-path.js';
import {
  createNpcCareerPathState,
  registerNpcCareer,
  hire,
  terminate,
  promote,
  adjustSalary,
  getCareerPath,
  getCurrentJob,
  getJobHistory,
} from '../npc-career-path.js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createMockDeps(): NpcCareerPathDeps {
  let time = 1_000_000n;
  let counter = 0;
  return {
    clock: {
      now: () => {
        time = time + 1000n;
        return time;
      },
    },
    idGen: { generate: () => 'cp-' + String(++counter) },
    logger: { info: () => undefined, error: () => undefined },
  };
}

// ============================================================================
// TESTS: REGISTRATION
// ============================================================================

describe('NpcCareerPath - Registration', () => {
  let state: NpcCareerPathState;

  beforeEach(() => {
    state = createNpcCareerPathState(createMockDeps());
  });

  it('should register a new NPC successfully', () => {
    const result = registerNpcCareer(state, 'npc-1');
    expect(result.success).toBe(true);
  });

  it('should return already-registered for duplicate', () => {
    registerNpcCareer(state, 'npc-1');
    const result = registerNpcCareer(state, 'npc-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('already-registered');
  });

  it('should initialize CareerPath with null currentJobId', () => {
    registerNpcCareer(state, 'npc-1');
    const career = getCareerPath(state, 'npc-1');
    expect(career?.currentJobId).toBeNull();
    expect(career?.totalJobsHeld).toBe(0);
    expect(career?.primaryProfession).toBeNull();
  });
});

// ============================================================================
// TESTS: HIRE
// ============================================================================

describe('NpcCareerPath - Hire', () => {
  let state: NpcCareerPathState;

  beforeEach(() => {
    state = createNpcCareerPathState(createMockDeps());
    registerNpcCareer(state, 'npc-1');
  });

  it('should return a JobRecord on success', () => {
    const result = hire(state, 'npc-1', 'MERCHANT', 'Trade Guild', 'world-alpha', 500n);
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.profession).toBe('MERCHANT');
      expect(result.employer).toBe('Trade Guild');
      expect(result.worldId).toBe('world-alpha');
      expect(result.salaryKalon).toBe(500n);
      expect(result.levelAchieved).toBe(1);
      expect(result.endedAt).toBeNull();
    }
  });

  it('should set currentJobId after hire', () => {
    const job = hire(state, 'npc-1', 'SOLDIER', 'City Guard', 'world-beta', 300n);
    const career = getCareerPath(state, 'npc-1');
    if (typeof job === 'object') {
      expect(career?.currentJobId).toBe(job.jobId);
    }
  });

  it('should increment totalJobsHeld', () => {
    hire(state, 'npc-1', 'FARMER', 'Farm Co', 'world-gamma', 100n);
    const career = getCareerPath(state, 'npc-1');
    expect(career?.totalJobsHeld).toBe(1);
  });

  it('should return already-employed if NPC has current job', () => {
    hire(state, 'npc-1', 'MERCHANT', 'Guild', 'world-1', 200n);
    const result = hire(state, 'npc-1', 'SOLDIER', 'Army', 'world-1', 250n);
    expect(result).toBe('already-employed');
  });

  it('should return npc-not-found for unregistered NPC', () => {
    const result = hire(state, 'ghost', 'MERCHANT', 'Guild', 'w1', 200n);
    expect(result).toBe('npc-not-found');
  });
});

// ============================================================================
// TESTS: TERMINATE
// ============================================================================

describe('NpcCareerPath - Terminate', () => {
  let state: NpcCareerPathState;

  beforeEach(() => {
    state = createNpcCareerPathState(createMockDeps());
    registerNpcCareer(state, 'npc-1');
  });

  it('should set endedAt and clear currentJobId', () => {
    hire(state, 'npc-1', 'SCHOLAR', 'Academy', 'world-1', 400n);
    terminate(state, 'npc-1');
    const career = getCareerPath(state, 'npc-1');
    expect(career?.currentJobId).toBeNull();
  });

  it('should accumulate salary to totalEarnedKalon', () => {
    hire(state, 'npc-1', 'SCHOLAR', 'Academy', 'world-1', 400n);
    terminate(state, 'npc-1');
    const career = getCareerPath(state, 'npc-1');
    expect(career?.totalEarnedKalon).toBe(400n);
  });

  it('should accumulate salary across multiple jobs', () => {
    hire(state, 'npc-1', 'MERCHANT', 'Guild', 'world-1', 200n);
    terminate(state, 'npc-1');
    hire(state, 'npc-1', 'ARTISAN', 'Forge', 'world-1', 300n);
    terminate(state, 'npc-1');
    const career = getCareerPath(state, 'npc-1');
    expect(career?.totalEarnedKalon).toBe(500n);
  });

  it('should return not-employed if NPC has no current job', () => {
    const result = terminate(state, 'npc-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('not-employed');
  });

  it('should return npc-not-found for unregistered NPC', () => {
    const result = terminate(state, 'ghost');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('npc-not-found');
  });
});

// ============================================================================
// TESTS: PROMOTE
// ============================================================================

describe('NpcCareerPath - Promote', () => {
  let state: NpcCareerPathState;

  beforeEach(() => {
    state = createNpcCareerPathState(createMockDeps());
    registerNpcCareer(state, 'npc-1');
    hire(state, 'npc-1', 'POLITICIAN', 'Council', 'world-1', 600n);
  });

  it('should return a CareerAdvancement on success', () => {
    const result = promote(state, 'npc-1', 3);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.advancement.fromLevel).toBe(1);
      expect(result.advancement.toLevel).toBe(3);
    }
  });

  it('should update levelAchieved on current job', () => {
    promote(state, 'npc-1', 5);
    const job = getCurrentJob(state, 'npc-1');
    expect(job?.levelAchieved).toBe(5);
  });

  it('should update highestLevel in CareerPath', () => {
    promote(state, 'npc-1', 7);
    const career = getCareerPath(state, 'npc-1');
    expect(career?.highestLevel).toBe(7);
  });

  it('should return invalid-level if newLevel <= current', () => {
    const result = promote(state, 'npc-1', 1);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('invalid-level');
  });

  it('should return invalid-level if newLevel > 10', () => {
    const result = promote(state, 'npc-1', 11);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('invalid-level');
  });

  it('should return not-employed if NPC has no current job', () => {
    terminate(state, 'npc-1');
    const result = promote(state, 'npc-1', 3);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('not-employed');
  });
});

// ============================================================================
// TESTS: ADJUST SALARY AND QUERIES
// ============================================================================

describe('NpcCareerPath - Adjust Salary and Queries', () => {
  let state: NpcCareerPathState;

  beforeEach(() => {
    state = createNpcCareerPathState(createMockDeps());
    registerNpcCareer(state, 'npc-1');
  });

  it('should update salaryKalon on current job', () => {
    hire(state, 'npc-1', 'HEALER', 'Clinic', 'world-1', 200n);
    adjustSalary(state, 'npc-1', 350n);
    const job = getCurrentJob(state, 'npc-1');
    expect(job?.salaryKalon).toBe(350n);
  });

  it('should return not-employed for adjustSalary with no current job', () => {
    const result = adjustSalary(state, 'npc-1', 300n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('not-employed');
  });

  it('should getJobHistory returning all past and current jobs', () => {
    hire(state, 'npc-1', 'EXPLORER', 'Survey Corps', 'world-2', 700n);
    terminate(state, 'npc-1');
    hire(state, 'npc-1', 'MERCHANT', 'Trade Guild', 'world-1', 500n);
    const history = getJobHistory(state, 'npc-1');
    expect(history.length).toBe(2);
  });

  it('should compute primaryProfession as most-frequent profession', () => {
    hire(state, 'npc-1', 'MERCHANT', 'Guild A', 'world-1', 100n);
    terminate(state, 'npc-1');
    hire(state, 'npc-1', 'MERCHANT', 'Guild B', 'world-2', 150n);
    terminate(state, 'npc-1');
    hire(state, 'npc-1', 'SOLDIER', 'Army', 'world-1', 200n);
    terminate(state, 'npc-1');
    const career = getCareerPath(state, 'npc-1');
    expect(career?.primaryProfession).toBe('MERCHANT');
  });

  it('should return undefined getCurrentJob when not employed', () => {
    expect(getCurrentJob(state, 'npc-1')).toBeUndefined();
  });

  it('should return undefined getCareerPath for unregistered NPC', () => {
    expect(getCareerPath(state, 'ghost')).toBeUndefined();
  });
});
