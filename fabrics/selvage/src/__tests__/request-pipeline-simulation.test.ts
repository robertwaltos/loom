import { describe, it, expect } from 'vitest';
import { createRequestPipeline } from '../request-pipeline.js';

function makePipeline() {
  return createRequestPipeline({ clock: { nowMicroseconds: () => 1_000_000 } });
}

describe('Request Pipeline Simulation', () => {
  it('executes stages in order and returns combined result', () => {
    const pipeline = makePipeline();
    const log: string[] = [];

    pipeline.addStage({ name: 'auth', handler: (_req) => { log.push('auth'); return true; }, order: 1 });
    pipeline.addStage({ name: 'rate-limit', handler: (_req) => { log.push('rate-limit'); return true; }, order: 2 });
    pipeline.addStage({ name: 'business', handler: (_req) => { log.push('business'); return true; }, order: 3 });

    const result = pipeline.execute('req-1');
    expect(result.success).toBe(true);
    expect(log).toEqual(['auth', 'rate-limit', 'business']);
  });

  it('short-circuits when a stage returns false', () => {
    const pipeline = makePipeline();
    const log: string[] = [];

    pipeline.addStage({ name: 'auth', handler: (_req) => { log.push('auth'); return false; }, order: 1 });
    pipeline.addStage({ name: 'business', handler: (_req) => { log.push('business'); return true; }, order: 2 });

    const result = pipeline.execute('req-2');
    expect(result.success).toBe(false);
    expect(log).toEqual(['auth']);
    expect(result.failedStage).toBe('auth');
  });

  it('disables and re-enables stages', () => {
    const pipeline = makePipeline();
    const log: string[] = [];

    pipeline.addStage({ name: 'logger', handler: (_req) => { log.push('logged'); return true; }, order: 1 });
    pipeline.disableStage('logger');
    pipeline.execute('req-3');
    expect(log).toHaveLength(0);

    pipeline.enableStage('logger');
    pipeline.execute('req-4');
    expect(log).toHaveLength(1);
  });

  it('removes stages and lists what remains', () => {
    const pipeline = makePipeline();

    pipeline.addStage({ name: 's1', handler: () => true, order: 1 });
    pipeline.addStage({ name: 's2', handler: () => true, order: 2 });
    pipeline.removeStage('s1');

    const stages = pipeline.listStages();
    expect(stages.map((s: { name: string }) => s.name)).not.toContain('s1');
    expect(stages.map((s: { name: string }) => s.name)).toContain('s2');
  });
});
