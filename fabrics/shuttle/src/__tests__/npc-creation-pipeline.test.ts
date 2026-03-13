import { describe, it, expect, vi } from 'vitest';
import {
  createNpcCreationPipeline,
  DEFAULT_PIPELINE_CONFIG,
  type NpcPipelineDeps,
  type NpcPipelineLogPort,
  type NpcTrainerPort,
  type PersonalitySpec,
} from '../npc-creation-pipeline.js';

// ── Test Doubles ──────────────────────────────────────────────────

let counter = 0;
function makeId() {
  counter++;
  return `pip-${String(counter)}`;
}

function makeClock(us = 1_000_000) {
  let now = us;
  return { nowMicroseconds: () => now, advance: (d: number) => { now += d; } };
}

function makeLog(): NpcPipelineLogPort {
  return { info: vi.fn(), warn: vi.fn() };
}

function makeTrainer(opts?: {
  trainResult?: string;
  trainError?: string;
  validateError?: string | null;
}): NpcTrainerPort {
  const trainResult = opts?.trainResult ?? '1.0.0';
  const trainError = opts?.trainError;
  const validateError = opts?.validateError ?? null;

  return {
    train: trainError !== undefined
      ? vi.fn().mockRejectedValue(new Error(trainError))
      : vi.fn().mockResolvedValue(trainResult),
    validate: vi.fn().mockResolvedValue(validateError),
  };
}

function makeDeps(trainer?: NpcTrainerPort): NpcPipelineDeps & { clock: ReturnType<typeof makeClock> } {
  return {
    trainer: trainer ?? makeTrainer(),
    clock: makeClock(),
    id: { next: makeId },
    log: makeLog(),
  };
}

const BASE_SPEC: PersonalitySpec = {
  archetype: 'merchant',
  traitWeights: { curiosity: 0.6, aggression: 0.2, loyalty: 0.8, greed: 0.5, empathy: 0.7 },
  memorySeeds: ['first trade', 'guild initiation'],
  worldId: 'world-A',
};

function spec(overrides: Partial<PersonalitySpec> = {}): PersonalitySpec {
  return { ...BASE_SPEC, ...overrides };
}

// ── create ────────────────────────────────────────────────────────

describe('create', () => {
  it('returns SPEC stage record for valid spec', () => {
    const pipeline = createNpcCreationPipeline(makeDeps());
    const r = pipeline.create(spec());
    expect(r).toMatchObject({ stage: 'SPEC', error: null, trainingConfig: null });
  });

  it('rejects spec with too many memory seeds', () => {
    const pipeline = createNpcCreationPipeline(makeDeps(), { maxMemorySeeds: 2 });
    const seeds = ['a', 'b', 'c'];
    const r = pipeline.create(spec({ memorySeeds: seeds }));
    expect(r).toMatchObject({ code: 'invalid-spec' });
  });

  it('rejects spec with out-of-range trait weight', () => {
    const pipeline = createNpcCreationPipeline(makeDeps());
    const r = pipeline.create(spec({
      traitWeights: { curiosity: 1.5, aggression: 0, loyalty: 0, greed: 0, empathy: 0 },
    }));
    expect(r).toMatchObject({ code: 'invalid-spec' });
  });
});

// ── advance: SPEC → TRAINING ──────────────────────────────────────

describe('advance SPEC → TRAINING', () => {
  it('moves to TRAINING and derives training config', async () => {
    const pipeline = createNpcCreationPipeline(makeDeps());
    const created = pipeline.create(spec());
    if ('code' in created) throw new Error('unexpected error');

    const after = await pipeline.advance(created.pipelineId);
    expect(after).toMatchObject({ stage: 'TRAINING' });
    if ('code' in after || after.trainingConfig === null) throw new Error('expected config');
    expect(['TIER_3', 'TIER_4']).toContain(after.trainingConfig.modelTier);
  });

  it('assigns TIER_4 to scholar archetype', async () => {
    const pipeline = createNpcCreationPipeline(makeDeps());
    const created = pipeline.create(spec({ archetype: 'scholar' }));
    if ('code' in created) throw new Error('unexpected error');

    const after = await pipeline.advance(created.pipelineId);
    if ('code' in after || after.trainingConfig === null) throw new Error('expected config');
    expect(after.trainingConfig.modelTier).toBe('TIER_4');
  });

  it('assigns TIER_3 to merchant archetype', async () => {
    const pipeline = createNpcCreationPipeline(makeDeps());
    const created = pipeline.create(spec({ archetype: 'merchant' }));
    if ('code' in created) throw new Error('unexpected error');

    const after = await pipeline.advance(created.pipelineId);
    if ('code' in after || after.trainingConfig === null) throw new Error('expected config');
    expect(after.trainingConfig.modelTier).toBe('TIER_3');
  });
});

// ── advance: TRAINING → VALIDATION ───────────────────────────────

describe('advance TRAINING → VALIDATION', () => {
  async function setupAtTraining(trainer?: NpcTrainerPort) {
    const jobs = createNpcCreationPipeline(makeDeps(trainer));
    const created = jobs.create(spec());
    if ('code' in created) throw new Error('unexpected error');
    await jobs.advance(created.pipelineId); // → TRAINING
    return { pipeline: jobs, pipelineId: created.pipelineId };
  }

  it('calls trainer.train and moves to VALIDATION', async () => {
    const trainer = makeTrainer({ trainResult: '2.1.0' });
    const { pipeline, pipelineId } = await setupAtTraining(trainer);
    const after = await pipeline.advance(pipelineId);
    expect(after).toMatchObject({ stage: 'VALIDATION', behaviorVersion: '2.1.0' });
  });

  it('marks FAILED when trainer throws', async () => {
    const trainer = makeTrainer({ trainError: 'GPU OOM' });
    const { pipeline, pipelineId } = await setupAtTraining(trainer);
    const after = await pipeline.advance(pipelineId);
    expect(after).toMatchObject({ stage: 'FAILED' });
    if ('code' in after) throw new Error('unexpected error code');
    expect(after.error).toBe('GPU OOM');
  });
});

// ── advance: VALIDATION → DEPLOYED ───────────────────────────────

describe('advance VALIDATION → DEPLOYED', () => {
  async function setupAtValidation(validateError?: string | null) {
    const trainer = makeTrainer({ validateError: validateError ?? null });
    const pipeline = createNpcCreationPipeline(makeDeps(trainer));
    const created = pipeline.create(spec());
    if ('code' in created) throw new Error('unexpected error');
    await pipeline.advance(created.pipelineId); // SPEC → TRAINING
    await pipeline.advance(created.pipelineId); // TRAINING → VALIDATION
    return { pipeline, pipelineId: created.pipelineId };
  }

  it('creates a DeployedNpc record and moves to DEPLOYED', async () => {
    const { pipeline, pipelineId } = await setupAtValidation(null);
    const after = await pipeline.advance(pipelineId);
    expect(after).toMatchObject({ stage: 'DEPLOYED' });
    if ('code' in after || after.deployedNpc === null) throw new Error('expected deployedNpc');
    expect(after.deployedNpc.entityId).toBeTruthy();
    expect(after.deployedNpc.behaviorVersion).toBeTruthy();
  });

  it('marks FAILED when validation returns error', async () => {
    const { pipeline, pipelineId } = await setupAtValidation('behavior-constraint-violation');
    const after = await pipeline.advance(pipelineId);
    expect(after).toMatchObject({ stage: 'FAILED' });
    if ('code' in after) throw new Error('unexpected error code');
    expect(after.error).toBe('behavior-constraint-violation');
  });
});

// ── advance: terminal stages ──────────────────────────────────────

describe('advance terminal stage', () => {
  it('returns invalid-transition when stage is DEPLOYED', async () => {
    const pipeline = createNpcCreationPipeline(makeDeps());
    const created = pipeline.create(spec());
    if ('code' in created) throw new Error('unexpected error');
    await pipeline.advance(created.pipelineId);
    await pipeline.advance(created.pipelineId);
    await pipeline.advance(created.pipelineId); // → DEPLOYED
    const r = await pipeline.advance(created.pipelineId);
    expect(r).toMatchObject({ code: 'invalid-transition', from: 'DEPLOYED' });
  });

  it('returns pipeline-not-found for unknown id', async () => {
    const pipeline = createNpcCreationPipeline(makeDeps());
    const r = await pipeline.advance('nonexistent');
    expect(r).toMatchObject({ code: 'pipeline-not-found' });
  });
});

// ── getPipeline ───────────────────────────────────────────────────

describe('getPipeline', () => {
  it('returns pipeline-not-found for unknown id', () => {
    const pipeline = createNpcCreationPipeline(makeDeps());
    expect(pipeline.getPipeline('ghost')).toMatchObject({ code: 'pipeline-not-found' });
  });

  it('returns current state for known id', () => {
    const pipeline = createNpcCreationPipeline(makeDeps());
    const r = pipeline.create(spec());
    if ('code' in r) throw new Error('unexpected error');
    expect(pipeline.getPipeline(r.pipelineId)).toMatchObject({ stage: 'SPEC' });
  });
});

// ── listByWorld ───────────────────────────────────────────────────

describe('listByWorld', () => {
  it('returns only pipelines for the given world', () => {
    const pipeline = createNpcCreationPipeline(makeDeps());
    pipeline.create(spec({ worldId: 'world-A' }));
    pipeline.create(spec({ worldId: 'world-A' }));
    pipeline.create(spec({ worldId: 'world-B' }));
    expect(pipeline.listByWorld('world-A')).toHaveLength(2);
    expect(pipeline.listByWorld('world-B')).toHaveLength(1);
    expect(pipeline.listByWorld('world-C')).toHaveLength(0);
  });
});

// ── retire ────────────────────────────────────────────────────────

describe('retire', () => {
  it('retires a DEPLOYED NPC', async () => {
    const pipeline = createNpcCreationPipeline(makeDeps());
    const created = pipeline.create(spec());
    if ('code' in created) throw new Error('unexpected error');
    await pipeline.advance(created.pipelineId);
    await pipeline.advance(created.pipelineId);
    await pipeline.advance(created.pipelineId); // → DEPLOYED

    const r = pipeline.retire(created.pipelineId);
    expect(r).toMatchObject({ stage: 'RETIRED' });
  });

  it('returns invalid-transition on non-DEPLOYED stage', () => {
    const pipeline = createNpcCreationPipeline(makeDeps());
    const created = pipeline.create(spec());
    if ('code' in created) throw new Error('unexpected error');
    const r = pipeline.retire(created.pipelineId);
    expect(r).toMatchObject({ code: 'invalid-transition', from: 'SPEC' });
  });
});

// ── getStats ──────────────────────────────────────────────────────

describe('getStats', () => {
  it('starts at all zeros', () => {
    const pipeline = createNpcCreationPipeline(makeDeps());
    expect(pipeline.getStats()).toMatchObject({
      spec: 0, training: 0, validation: 0, deployed: 0, failed: 0, retired: 0,
    });
  });

  it('increments spec count after create', () => {
    const pipeline = createNpcCreationPipeline(makeDeps());
    pipeline.create(spec());
    pipeline.create(spec());
    expect(pipeline.getStats().spec).toBe(2);
  });

  it('tracks full lifecycle in stats', async () => {
    const pipeline = createNpcCreationPipeline(makeDeps());
    const created = pipeline.create(spec());
    if ('code' in created) throw new Error('unexpected error');
    await pipeline.advance(created.pipelineId);
    await pipeline.advance(created.pipelineId);
    await pipeline.advance(created.pipelineId);
    const stats = pipeline.getStats();
    expect(stats.deployed).toBe(1);
    expect(stats.spec).toBe(0);
  });
});

// ── DEFAULT_PIPELINE_CONFIG ───────────────────────────────────────

describe('DEFAULT_PIPELINE_CONFIG', () => {
  it('has valid shape', () => {
    expect(DEFAULT_PIPELINE_CONFIG.maxMemorySeeds).toBeGreaterThan(0);
    expect(DEFAULT_PIPELINE_CONFIG.tier4maxPerWorld).toBeGreaterThan(0);
  });
});
