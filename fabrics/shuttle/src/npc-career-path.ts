/**
 * NPC Career Path System — Career progression, job history, and advancement.
 *
 * Tracks the employment lifecycle of NPCs: hiring, termination, promotion,
 * salary adjustments, and full job history. CareerPath aggregates statistics
 * across all jobs held. PrimaryProfession is determined by most-frequent role.
 *
 * "Every dynasty's story is built on the careers of those who serve it."
 */

// ============================================================================
// PORTS
// ============================================================================

export type NpcCareerPathClock = {
  now(): bigint;
};

export type NpcCareerPathIdGen = {
  generate(): string;
};

export type NpcCareerPathLogger = {
  info(message: string): void;
  error(message: string): void;
};

export type NpcCareerPathDeps = {
  readonly clock: NpcCareerPathClock;
  readonly idGen: NpcCareerPathIdGen;
  readonly logger: NpcCareerPathLogger;
};

// ============================================================================
// TYPES
// ============================================================================

export type NpcId = string;
export type CareerPathId = string;
export type JobId = string;

export type CareerError =
  | 'npc-not-found'
  | 'job-not-found'
  | 'career-not-found'
  | 'already-employed'
  | 'not-employed'
  | 'invalid-level'
  | 'already-registered';

export type Profession =
  | 'MERCHANT'
  | 'SOLDIER'
  | 'SCHOLAR'
  | 'ARTISAN'
  | 'FARMER'
  | 'POLITICIAN'
  | 'HEALER'
  | 'EXPLORER';

export type JobRecord = {
  readonly jobId: JobId;
  readonly npcId: NpcId;
  readonly profession: Profession;
  readonly employer: string;
  readonly worldId: string;
  readonly startedAt: bigint;
  endedAt: bigint | null;
  levelAchieved: number;
  salaryKalon: bigint;
};

export type CareerPath = {
  readonly careerPathId: CareerPathId;
  readonly npcId: NpcId;
  currentJobId: JobId | null;
  totalJobsHeld: number;
  highestLevel: number;
  totalEarnedKalon: bigint;
  primaryProfession: Profession | null;
};

export type CareerAdvancement = {
  readonly advancementId: string;
  readonly npcId: NpcId;
  readonly jobId: JobId;
  readonly fromLevel: number;
  readonly toLevel: number;
  readonly advancedAt: bigint;
};

// ============================================================================
// STATE
// ============================================================================

export type NpcCareerPathState = {
  readonly deps: NpcCareerPathDeps;
  readonly careerPaths: Map<NpcId, CareerPath>;
  readonly jobs: Map<JobId, JobRecord>;
  readonly jobHistory: Map<NpcId, JobId[]>;
};

// ============================================================================
// FACTORY
// ============================================================================

export function createNpcCareerPathState(deps: NpcCareerPathDeps): NpcCareerPathState {
  return {
    deps,
    careerPaths: new Map(),
    jobs: new Map(),
    jobHistory: new Map(),
  };
}

// ============================================================================
// REGISTER
// ============================================================================

export function registerNpcCareer(
  state: NpcCareerPathState,
  npcId: NpcId,
): { success: true } | { success: false; error: CareerError } {
  if (state.careerPaths.has(npcId)) return { success: false, error: 'already-registered' };
  const careerPath: CareerPath = {
    careerPathId: state.deps.idGen.generate(),
    npcId,
    currentJobId: null,
    totalJobsHeld: 0,
    highestLevel: 0,
    totalEarnedKalon: 0n,
    primaryProfession: null,
  };
  state.careerPaths.set(npcId, careerPath);
  state.jobHistory.set(npcId, []);
  state.deps.logger.info('npc-career-path: registered npc ' + npcId);
  return { success: true };
}

// ============================================================================
// HIRE
// ============================================================================

export function hire(
  state: NpcCareerPathState,
  npcId: NpcId,
  profession: Profession,
  employer: string,
  worldId: string,
  startingSalaryKalon: bigint,
): JobRecord | CareerError {
  const career = state.careerPaths.get(npcId);
  if (career === undefined) return 'npc-not-found';
  if (career.currentJobId !== null) return 'already-employed';
  const job = createJobRecord(state, npcId, profession, employer, worldId, startingSalaryKalon);
  state.jobs.set(job.jobId, job);
  state.jobHistory.get(npcId)?.push(job.jobId);
  career.currentJobId = job.jobId;
  career.totalJobsHeld += 1;
  refreshCareerSummary(state, career);
  state.deps.logger.info('npc-career-path: hired npc ' + npcId + ' as ' + profession);
  return job;
}

function createJobRecord(
  state: NpcCareerPathState,
  npcId: NpcId,
  profession: Profession,
  employer: string,
  worldId: string,
  salaryKalon: bigint,
): JobRecord {
  return {
    jobId: state.deps.idGen.generate(),
    npcId,
    profession,
    employer,
    worldId,
    startedAt: state.deps.clock.now(),
    endedAt: null,
    levelAchieved: 1,
    salaryKalon,
  };
}

// ============================================================================
// TERMINATE
// ============================================================================

export function terminate(
  state: NpcCareerPathState,
  npcId: NpcId,
): { success: true } | { success: false; error: CareerError } {
  const career = state.careerPaths.get(npcId);
  if (career === undefined) return { success: false, error: 'npc-not-found' };
  if (career.currentJobId === null) return { success: false, error: 'not-employed' };
  const job = state.jobs.get(career.currentJobId);
  if (job === undefined) return { success: false, error: 'job-not-found' };
  job.endedAt = state.deps.clock.now();
  career.totalEarnedKalon += job.salaryKalon;
  career.currentJobId = null;
  refreshCareerSummary(state, career);
  state.deps.logger.info('npc-career-path: terminated npc ' + npcId);
  return { success: true };
}

// ============================================================================
// PROMOTE
// ============================================================================

export function promote(
  state: NpcCareerPathState,
  npcId: NpcId,
  newLevel: number,
): { success: true; advancement: CareerAdvancement } | { success: false; error: CareerError } {
  const career = state.careerPaths.get(npcId);
  if (career === undefined) return { success: false, error: 'npc-not-found' };
  if (career.currentJobId === null) return { success: false, error: 'not-employed' };
  const job = state.jobs.get(career.currentJobId);
  if (job === undefined) return { success: false, error: 'job-not-found' };
  if (newLevel <= job.levelAchieved || newLevel > 10) {
    return { success: false, error: 'invalid-level' };
  }
  const fromLevel = job.levelAchieved;
  job.levelAchieved = newLevel;
  if (newLevel > career.highestLevel) career.highestLevel = newLevel;
  const advancement: CareerAdvancement = {
    advancementId: state.deps.idGen.generate(),
    npcId,
    jobId: career.currentJobId,
    fromLevel,
    toLevel: newLevel,
    advancedAt: state.deps.clock.now(),
  };
  return { success: true, advancement };
}

// ============================================================================
// ADJUST SALARY
// ============================================================================

export function adjustSalary(
  state: NpcCareerPathState,
  npcId: NpcId,
  newSalaryKalon: bigint,
): { success: true } | { success: false; error: CareerError } {
  const career = state.careerPaths.get(npcId);
  if (career === undefined) return { success: false, error: 'npc-not-found' };
  if (career.currentJobId === null) return { success: false, error: 'not-employed' };
  const job = state.jobs.get(career.currentJobId);
  if (job === undefined) return { success: false, error: 'job-not-found' };
  job.salaryKalon = newSalaryKalon;
  return { success: true };
}

// ============================================================================
// QUERIES
// ============================================================================

export function getCareerPath(state: NpcCareerPathState, npcId: NpcId): CareerPath | undefined {
  return state.careerPaths.get(npcId);
}

export function getCurrentJob(state: NpcCareerPathState, npcId: NpcId): JobRecord | undefined {
  const career = state.careerPaths.get(npcId);
  if (career === undefined || career.currentJobId === null) return undefined;
  return state.jobs.get(career.currentJobId);
}

export function getJobHistory(state: NpcCareerPathState, npcId: NpcId): ReadonlyArray<JobRecord> {
  const ids = state.jobHistory.get(npcId) ?? [];
  const records: JobRecord[] = [];
  for (const id of ids) {
    const job = state.jobs.get(id);
    if (job !== undefined) records.push(job);
  }
  return records;
}

// ============================================================================
// HELPERS
// ============================================================================

function refreshCareerSummary(state: NpcCareerPathState, career: CareerPath): void {
  const ids = state.jobHistory.get(career.npcId) ?? [];
  let highestLevel = 0;
  const professionCounts = new Map<Profession, number>();
  for (const id of ids) {
    const job = state.jobs.get(id);
    if (job === undefined) continue;
    if (job.levelAchieved > highestLevel) highestLevel = job.levelAchieved;
    professionCounts.set(job.profession, (professionCounts.get(job.profession) ?? 0) + 1);
  }
  career.highestLevel = highestLevel;
  career.primaryProfession = computePrimaryProfession(professionCounts);
}

function computePrimaryProfession(counts: Map<Profession, number>): Profession | null {
  if (counts.size === 0) return null;
  let primary: Profession | null = null;
  let max = 0;
  for (const [profession, count] of counts) {
    if (count > max) {
      max = count;
      primary = profession;
    }
  }
  return primary;
}
