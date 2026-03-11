import { describe, it, expect } from 'vitest';
import { createRequestPipeline } from '../request-pipeline.js';
import type { RequestPipelineDeps } from '../request-pipeline.js';

function makeDeps(): RequestPipelineDeps {
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
  };
}

describe('RequestPipeline — stage management', () => {
  it('adds a stage', () => {
    const pipeline = createRequestPipeline(makeDeps());
    expect(
      pipeline.addStage({
        name: 'auth',
        handler: () => true,
        order: 1,
      }),
    ).toBe(true);
    expect(pipeline.getStage('auth')?.name).toBe('auth');
  });

  it('rejects duplicate stage', () => {
    const pipeline = createRequestPipeline(makeDeps());
    pipeline.addStage({ name: 'auth', handler: () => true, order: 1 });
    expect(
      pipeline.addStage({
        name: 'auth',
        handler: () => true,
        order: 2,
      }),
    ).toBe(false);
  });

  it('removes a stage', () => {
    const pipeline = createRequestPipeline(makeDeps());
    pipeline.addStage({ name: 'auth', handler: () => true, order: 1 });
    expect(pipeline.removeStage('auth')).toBe(true);
    expect(pipeline.getStage('auth')).toBeUndefined();
  });

  it('lists stages in order', () => {
    const pipeline = createRequestPipeline(makeDeps());
    pipeline.addStage({ name: 'validate', handler: () => true, order: 2 });
    pipeline.addStage({ name: 'auth', handler: () => true, order: 1 });
    const stages = pipeline.listStages();
    expect(stages[0]?.name).toBe('auth');
    expect(stages[1]?.name).toBe('validate');
  });
});

describe('RequestPipeline — enable and disable', () => {
  it('disables a stage', () => {
    const pipeline = createRequestPipeline(makeDeps());
    pipeline.addStage({ name: 'auth', handler: () => true, order: 1 });
    expect(pipeline.disableStage('auth')).toBe(true);
    expect(pipeline.getStage('auth')?.enabled).toBe(false);
  });

  it('enables a disabled stage', () => {
    const pipeline = createRequestPipeline(makeDeps());
    pipeline.addStage({ name: 'auth', handler: () => true, order: 1 });
    pipeline.disableStage('auth');
    expect(pipeline.enableStage('auth')).toBe(true);
    expect(pipeline.getStage('auth')?.enabled).toBe(true);
  });

  it('returns false for unknown stage', () => {
    const pipeline = createRequestPipeline(makeDeps());
    expect(pipeline.enableStage('missing')).toBe(false);
    expect(pipeline.disableStage('missing')).toBe(false);
  });
});

describe('RequestPipeline — execution', () => {
  it('executes all stages successfully', () => {
    const pipeline = createRequestPipeline(makeDeps());
    pipeline.addStage({ name: 'auth', handler: () => true, order: 1 });
    pipeline.addStage({ name: 'validate', handler: () => true, order: 2 });
    const result = pipeline.execute('req-1');
    expect(result.success).toBe(true);
    expect(result.stagesRun).toBe(2);
    expect(result.failedStage).toBeUndefined();
  });

  it('stops at failed stage', () => {
    const pipeline = createRequestPipeline(makeDeps());
    pipeline.addStage({ name: 'auth', handler: () => false, order: 1 });
    pipeline.addStage({ name: 'validate', handler: () => true, order: 2 });
    const result = pipeline.execute('req-1');
    expect(result.success).toBe(false);
    expect(result.stagesRun).toBe(1);
    expect(result.failedStage).toBe('auth');
  });

  it('skips disabled stages', () => {
    const pipeline = createRequestPipeline(makeDeps());
    pipeline.addStage({ name: 'auth', handler: () => false, order: 1 });
    pipeline.addStage({ name: 'validate', handler: () => true, order: 2 });
    pipeline.disableStage('auth');
    const result = pipeline.execute('req-1');
    expect(result.success).toBe(true);
    expect(result.stagesRun).toBe(1);
  });

  it('provides context to stages', () => {
    const pipeline = createRequestPipeline(makeDeps());
    pipeline.addStage({
      name: 'set-value',
      handler: (ctx) => {
        ctx.values.set('user', 'alice');
        return true;
      },
      order: 1,
    });
    let captured = '';
    pipeline.addStage({
      name: 'read-value',
      handler: (ctx) => {
        const val = ctx.values.get('user');
        captured = typeof val === 'string' ? val : '';
        return true;
      },
      order: 2,
    });
    pipeline.execute('req-1');
    expect(captured).toBe('alice');
  });
});

describe('RequestPipeline — stats', () => {
  it('starts with zero stats', () => {
    const pipeline = createRequestPipeline(makeDeps());
    const stats = pipeline.getStats();
    expect(stats.totalStages).toBe(0);
    expect(stats.totalExecutions).toBe(0);
  });

  it('tracks aggregate stats', () => {
    const pipeline = createRequestPipeline(makeDeps());
    pipeline.addStage({ name: 'auth', handler: () => true, order: 1 });
    pipeline.addStage({ name: 'fail', handler: () => false, order: 2 });
    pipeline.disableStage('fail');
    pipeline.execute('req-1');
    pipeline.enableStage('fail');
    pipeline.execute('req-2');
    const stats = pipeline.getStats();
    expect(stats.totalStages).toBe(2);
    expect(stats.enabledStages).toBe(2);
    expect(stats.totalExecutions).toBe(2);
    expect(stats.totalFailures).toBe(1);
  });
});
