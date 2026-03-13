/**
 * NPC Creation Pipeline — Personality spec → trained behavior → deployed NPC.
 *
 * NEXT-STEPS Phase 11.1: "NPC creation pipeline: personality specification
 * → trained behavior → deployed."
 *
 * Stages:
 *   SPEC       — spec validated, training config derived
 *   TRAINING   — TrainerPort derives a behavior model version
 *   VALIDATION — automated checks on the trained behavior version
 *   DEPLOYED   — LiveNpc record available for the ECS to instantiate
 *   FAILED     — terminal, with error captured
 *   RETIRED    — previously deployed NPC taken offline
 *
 * Thread: cotton/shuttle/npc-creation-pipeline
 * Tier: 1
 */

// ── Archetypes ────────────────────────────────────────────────────

export type NpcCreationArchetype =
  | 'merchant' | 'scholar' | 'warrior' | 'noble'
  | 'mystic' | 'artisan' | 'outlaw' | 'elder';

// ── Personality Spec ──────────────────────────────────────────────

export interface TraitWeights {
  readonly curiosity: number;   // 0.0 – 1.0
  readonly aggression: number;
  readonly loyalty: number;
  readonly greed: number;
  readonly empathy: number;
}

export interface PersonalitySpec {
  readonly archetype: NpcCreationArchetype;
  readonly traitWeights: TraitWeights;
  readonly memorySeeds: readonly string[];
  readonly worldId: string;
  readonly factionId?: string;
}

// ── Training Config ───────────────────────────────────────────────

export type NpcModelTier = 'TIER_3' | 'TIER_4';

export interface TrainingConfig {
  readonly modelTier: NpcModelTier;
  readonly contextWindowTokens: number;
  readonly temperatureBase: number;
  readonly behaviorConstraints: readonly string[];
}

// ── Pipeline Record ───────────────────────────────────────────────

export type NpcPipelineStage =
  | 'SPEC' | 'TRAINING' | 'VALIDATION' | 'DEPLOYED' | 'FAILED' | 'RETIRED';

export interface DeployedNpc {
  readonly entityId: string;
  readonly pipelineId: string;
  readonly spec: PersonalitySpec;
  readonly trainingConfig: TrainingConfig;
  readonly behaviorVersion: string;
  readonly deployedAt: number;
}

export interface NpcPipelineRecord {
  readonly pipelineId: string;
  readonly stage: NpcPipelineStage;
  readonly spec: PersonalitySpec;
  readonly trainingConfig: TrainingConfig | null;
  readonly behaviorVersion: string | null;
  readonly deployedNpc: DeployedNpc | null;
  readonly error: string | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}

// ── Stats ─────────────────────────────────────────────────────────

export interface NpcPipelineStats {
  readonly spec: number;
  readonly training: number;
  readonly validation: number;
  readonly deployed: number;
  readonly failed: number;
  readonly retired: number;
}

// ── Errors ────────────────────────────────────────────────────────

export type NpcPipelineError =
  | { readonly code: 'pipeline-not-found'; readonly pipelineId: string }
  | { readonly code: 'invalid-spec'; readonly reason: string }
  | { readonly code: 'invalid-transition'; readonly from: NpcPipelineStage }
  | { readonly code: 'training-failed'; readonly pipelineId: string; readonly reason: string };

// ── Ports ─────────────────────────────────────────────────────────

export interface NpcTrainerPort {
  /** Derive a semver behavior model version from the spec and config. */
  readonly train: (spec: PersonalitySpec, config: TrainingConfig) => Promise<string>;
  /** Validate a trained behavior version. Returns null on success or an error string. */
  readonly validate: (behaviorVersion: string) => Promise<string | null>;
}

export interface NpcPipelineClock {
  readonly nowMicroseconds: () => number;
}

export interface NpcPipelineIdPort {
  readonly next: () => string;
}

export interface NpcPipelineLogPort {
  readonly info: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
  readonly warn: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
}

// ── Config ────────────────────────────────────────────────────────

export interface NpcPipelineConfig {
  readonly maxMemorySeeds: number;
  readonly tier4maxPerWorld: number;
}

export const DEFAULT_PIPELINE_CONFIG: NpcPipelineConfig = {
  maxMemorySeeds: 20,
  tier4maxPerWorld: 500,
};

// ── Public Interface ──────────────────────────────────────────────

export interface NpcCreationPipeline {
  readonly create: (spec: PersonalitySpec) => NpcPipelineRecord | NpcPipelineError;
  readonly advance: (pipelineId: string) => Promise<NpcPipelineRecord | NpcPipelineError>;
  readonly getPipeline: (pipelineId: string) => NpcPipelineRecord | NpcPipelineError;
  readonly listByWorld: (worldId: string) => readonly NpcPipelineRecord[];
  readonly retire: (pipelineId: string) => NpcPipelineRecord | NpcPipelineError;
  readonly getStats: () => NpcPipelineStats;
}

// ── Deps ──────────────────────────────────────────────────────────

export interface NpcPipelineDeps {
  readonly trainer: NpcTrainerPort;
  readonly clock: NpcPipelineClock;
  readonly id: NpcPipelineIdPort;
  readonly log: NpcPipelineLogPort;
}

// ── Mutable State ─────────────────────────────────────────────────

interface MutablePipelineRecord {
  readonly pipelineId: string;
  stage: NpcPipelineStage;
  readonly spec: PersonalitySpec;
  trainingConfig: TrainingConfig | null;
  behaviorVersion: string | null;
  deployedNpc: DeployedNpc | null;
  error: string | null;
  readonly createdAt: number;
  updatedAt: number;
}

// ── Validation ────────────────────────────────────────────────────

function validateSpec(
  spec: PersonalitySpec,
  cfg: NpcPipelineConfig,
): string | null {
  if (spec.memorySeeds.length > cfg.maxMemorySeeds) {
    return `memorySeeds exceeds maximum (${String(cfg.maxMemorySeeds)})`;
  }
  const { curiosity, aggression, loyalty, greed, empathy } = spec.traitWeights;
  const weights = [curiosity, aggression, loyalty, greed, empathy];
  const outOfRange = weights.some((w) => w < 0 || w > 1);
  if (outOfRange) return 'traitWeights must be in range [0.0, 1.0]';
  return null;
}

// ── Training Config Derivation ────────────────────────────────────

const TIER4_ARCHETYPES: ReadonlySet<NpcCreationArchetype> = new Set([
  'scholar', 'noble', 'mystic', 'elder',
]);

const ARCHETYPE_CONSTRAINTS: Readonly<Record<NpcCreationArchetype, string>> = {
  merchant:  'no-deception',
  scholar:   'no-violence',
  warrior:   'loyalty-enforced',
  noble:     'protocol-adherence',
  mystic:    'no-direct-disclosure',
  artisan:   'craft-focus',
  outlaw:    'no-law-enforcement-aid',
  elder:     'neutral-counsel',
};

function deriveTrainingConfig(spec: PersonalitySpec): TrainingConfig {
  const isTier4 = TIER4_ARCHETYPES.has(spec.archetype);
  return {
    modelTier: isTier4 ? 'TIER_4' : 'TIER_3',
    contextWindowTokens: isTier4 ? 32_768 : 8_192,
    temperatureBase: 0.4 + spec.traitWeights.curiosity * 0.3,
    behaviorConstraints: [ARCHETYPE_CONSTRAINTS[spec.archetype]],
  };
}

// ── Stage Transitions ─────────────────────────────────────────────

function advanceToTraining(
  record: MutablePipelineRecord,
  clock: NpcPipelineClock,
): void {
  const config = deriveTrainingConfig(record.spec);
  record.trainingConfig = config;
  record.stage = 'TRAINING';
  record.updatedAt = clock.nowMicroseconds();
}

async function advanceToValidation(
  deps: NpcPipelineDeps,
  record: MutablePipelineRecord,
): Promise<void> {
  const { spec, trainingConfig } = record;
  if (!trainingConfig) return;
  try {
    const version = await deps.trainer.train(spec, trainingConfig);
    record.behaviorVersion = version;
    record.stage = 'VALIDATION';
    record.updatedAt = deps.clock.nowMicroseconds();
    deps.log.info({ pipelineId: record.pipelineId, version }, 'Training complete');
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    record.stage = 'FAILED';
    record.error = reason;
    record.updatedAt = deps.clock.nowMicroseconds();
    deps.log.warn({ pipelineId: record.pipelineId, reason }, 'Training failed');
  }
}

async function advanceToDeployed(
  deps: NpcPipelineDeps,
  record: MutablePipelineRecord,
): Promise<void> {
  const { behaviorVersion } = record;
  if (behaviorVersion === null || record.trainingConfig === null) return;
  const validationError = await deps.trainer.validate(behaviorVersion);
  if (validationError !== null) {
    record.stage = 'FAILED';
    record.error = validationError;
    record.updatedAt = deps.clock.nowMicroseconds();
    return;
  }
  record.deployedNpc = {
    entityId: deps.id.next(),
    pipelineId: record.pipelineId,
    spec: record.spec,
    trainingConfig: record.trainingConfig,
    behaviorVersion,
    deployedAt: deps.clock.nowMicroseconds(),
  };
  record.stage = 'DEPLOYED';
  record.updatedAt = deps.clock.nowMicroseconds();
  deps.log.info({ pipelineId: record.pipelineId }, 'NPC deployed');
}

// ── Advance Dispatch ──────────────────────────────────────────────

const TERMINAL_STAGES: ReadonlySet<NpcPipelineStage> = new Set(['DEPLOYED', 'FAILED', 'RETIRED']);

async function advancePipeline(
  deps: NpcPipelineDeps,
  records: Map<string, MutablePipelineRecord>,
  pipelineId: string,
): Promise<NpcPipelineRecord | NpcPipelineError> {
  const record = records.get(pipelineId);
  if (!record) return { code: 'pipeline-not-found', pipelineId };
  if (TERMINAL_STAGES.has(record.stage)) {
    return { code: 'invalid-transition', from: record.stage };
  }
  if (record.stage === 'SPEC') advanceToTraining(record, deps.clock);
  else if (record.stage === 'TRAINING') await advanceToValidation(deps, record);
  else await advanceToDeployed(deps, record);
  return freezeRecord(record);
}

// ── Create ────────────────────────────────────────────────────────

function createPipeline(
  deps: NpcPipelineDeps,
  cfg: NpcPipelineConfig,
  records: Map<string, MutablePipelineRecord>,
  spec: PersonalitySpec,
): NpcPipelineRecord | NpcPipelineError {
  const validationError = validateSpec(spec, cfg);
  if (validationError !== null) return { code: 'invalid-spec', reason: validationError };
  const pipelineId = deps.id.next();
  const now = deps.clock.nowMicroseconds();
  const record: MutablePipelineRecord = {
    pipelineId, stage: 'SPEC', spec,
    trainingConfig: null, behaviorVersion: null,
    deployedNpc: null, error: null,
    createdAt: now, updatedAt: now,
  };
  records.set(pipelineId, record);
  deps.log.info({ pipelineId, archetype: spec.archetype }, 'Pipeline created');
  return freezeRecord(record);
}

// ── Retire ────────────────────────────────────────────────────────

function retirePipeline(
  clock: NpcPipelineClock,
  records: Map<string, MutablePipelineRecord>,
  pipelineId: string,
): NpcPipelineRecord | NpcPipelineError {
  const record = records.get(pipelineId);
  if (!record) return { code: 'pipeline-not-found', pipelineId };
  if (record.stage !== 'DEPLOYED') return { code: 'invalid-transition', from: record.stage };
  record.stage = 'RETIRED';
  record.updatedAt = clock.nowMicroseconds();
  return freezeRecord(record);
}

// ── Stats ─────────────────────────────────────────────────────────

function computePipelineStats(records: Map<string, MutablePipelineRecord>): NpcPipelineStats {
  let spec = 0, training = 0, validation = 0, deployed = 0, failed = 0, retired = 0;
  for (const r of records.values()) {
    if (r.stage === 'SPEC') spec++;
    else if (r.stage === 'TRAINING') training++;
    else if (r.stage === 'VALIDATION') validation++;
    else if (r.stage === 'DEPLOYED') deployed++;
    else if (r.stage === 'FAILED') failed++;
    else retired++;
  }
  return { spec, training, validation, deployed, failed, retired };
}

// ── Freeze ────────────────────────────────────────────────────────

function freezeRecord(r: MutablePipelineRecord): NpcPipelineRecord {
  return Object.freeze({ ...r });
}

// ── Factory ───────────────────────────────────────────────────────

export function createNpcCreationPipeline(
  deps: NpcPipelineDeps,
  config?: Partial<NpcPipelineConfig>,
): NpcCreationPipeline {
  const cfg: NpcPipelineConfig = { ...DEFAULT_PIPELINE_CONFIG, ...config };
  const records = new Map<string, MutablePipelineRecord>();

  return {
    create: (spec) => createPipeline(deps, cfg, records, spec),
    advance: (id) => advancePipeline(deps, records, id),
    getPipeline: (id) => {
      const r = records.get(id);
      return r ? freezeRecord(r) : { code: 'pipeline-not-found', pipelineId: id };
    },
    listByWorld: (worldId) =>
      [...records.values()]
        .filter((r) => r.spec.worldId === worldId)
        .map(freezeRecord),
    retire: (id) => retirePipeline(deps.clock, records, id),
    getStats: () => computePipelineStats(records),
  };
}
