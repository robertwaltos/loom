import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPluginCiPipeline,
  DEFAULT_PIPELINE_CONFIG,
  type PluginManifest,
  type PluginCiDeps,
  type PipelineConfig,
} from '../index.js';

function makeDeps(overrides: Partial<PipelineConfig> = {}): PluginCiDeps {
  let t = 1000;
  return {
    clock: { nowMs: () => { t += 10; return t; } },
    log: { info: () => undefined, warn: () => undefined },
    config: { ...DEFAULT_PIPELINE_CONFIG, ...overrides },
  };
}

const validManifest: PluginManifest = Object.freeze({
  pluginId: 'test-plugin',
  version: '1.0.0',
  sdkVersion: '1.1.0',
  author: 'Tester',
  description: 'A perfectly valid community plugin',
  hooks: ['WEATHER', 'TRADE'],
  sourceFiles: ['index.ts'],
});

const cleanSource = `
  import { createPlugin } from '@loom/modding-sdk';
  export function registerPlugin(sdk) {}
`;

describe('schema stage', () => {
  it('passes a fully-populated manifest', () => {
    const ci = createPluginCiPipeline(makeDeps());
    const result = ci.run(validManifest, [cleanSource]);
    const schema = result.stages.find((s) => s.stage === 'schema');
    expect(schema?.status).toBe('passed');
  });

  it('fails when pluginId is missing', () => {
    const ci = createPluginCiPipeline(makeDeps());
    const bad = { ...validManifest, pluginId: '' };
    const result = ci.run(bad, [cleanSource]);
    const schema = result.stages.find((s) => s.stage === 'schema');
    expect(schema?.status).toBe('failed');
    expect(schema?.messages.some((m) => m.includes('pluginId'))).toBe(true);
  });

  it('fails when no sourceFiles are provided', () => {
    const ci = createPluginCiPipeline(makeDeps());
    const bad = { ...validManifest, sourceFiles: [] };
    const result = ci.run(bad, [cleanSource]);
    const schema = result.stages.find((s) => s.stage === 'schema');
    expect(schema?.status).toBe('failed');
  });
});

describe('security stage', () => {
  it('passes clean source with no blocked imports', () => {
    const ci = createPluginCiPipeline(makeDeps());
    const result = ci.run(validManifest, [cleanSource]);
    const security = result.stages.find((s) => s.stage === 'security');
    expect(security?.status).toBe('passed');
  });

  it('fails when source contains a blocked import pattern', () => {
    const ci = createPluginCiPipeline(makeDeps());
    const evil = `import fs from 'fs'; fs.readFileSync('/etc/passwd');`;
    const result = ci.run(validManifest, [evil]);
    const security = result.stages.find((s) => s.stage === 'security');
    expect(security?.status).toBe('failed');
    expect(security?.messages.at(0)).toContain('fs');
  });

  it('fails when child_process is detected', () => {
    const ci = createPluginCiPipeline(makeDeps());
    const evil = `require('child_process').exec('rm -rf /')`;
    const result = ci.run(validManifest, [evil]);
    const security = result.stages.find((s) => s.stage === 'security');
    expect(security?.status).toBe('failed');
  });
});

describe('compatibility stage', () => {
  it('passes with an allowed SDK version', () => {
    const ci = createPluginCiPipeline(makeDeps());
    const result = ci.run(validManifest, [cleanSource]);
    const compat = result.stages.find((s) => s.stage === 'compatibility');
    expect(compat?.status).toBe('passed');
  });

  it('fails with an unsupported SDK version', () => {
    const ci = createPluginCiPipeline(makeDeps());
    const bad = { ...validManifest, sdkVersion: '0.9.0' };
    const result = ci.run(bad, [cleanSource]);
    const compat = result.stages.find((s) => s.stage === 'compatibility');
    expect(compat?.status).toBe('failed');
    expect(compat?.messages.at(0)).toContain('0.9.0');
  });

  it('fails when hook count exceeds maxHooks', () => {
    const ci = createPluginCiPipeline(makeDeps({ maxHooks: 2 }));
    const bad = { ...validManifest, hooks: ['A', 'B', 'C'] };
    const result = ci.run(bad, [cleanSource]);
    const compat = result.stages.find((s) => s.stage === 'compatibility');
    expect(compat?.status).toBe('failed');
    expect(compat?.messages.at(0)).toContain('3');
  });
});

describe('tests stage', () => {
  it('reports one message per hook', () => {
    const ci = createPluginCiPipeline(makeDeps());
    const result = ci.run(validManifest, [cleanSource]);
    const tests = result.stages.find((s) => s.stage === 'tests');
    expect(tests?.status).toBe('passed');
    expect(tests?.messages.length).toBe(validManifest.hooks.length);
  });
});

describe('pipeline halting', () => {
  it('halts after schema failure by default', () => {
    const ci = createPluginCiPipeline(makeDeps());
    const bad = { ...validManifest, pluginId: '' };
    const result = ci.run(bad, [cleanSource]);
    expect(result.stages.length).toBe(1);
    expect(result.passed).toBe(false);
  });

  it('runs all stages when continueOnFailure is set', () => {
    const ci = createPluginCiPipeline(makeDeps({ continueOnFailure: true }));
    const bad = { ...validManifest, pluginId: '' };
    const result = ci.run(bad, [cleanSource]);
    expect(result.stages.length).toBe(4);
  });
});

describe('getStats', () => {
  let ci: ReturnType<typeof createPluginCiPipeline>;
  beforeEach(() => { ci = createPluginCiPipeline(makeDeps()); });

  it('starts at zeros', () => {
    expect(ci.getStats()).toEqual({ totalRuns: 0, passed: 0, failed: 0 });
  });

  it('increments passed on success', () => {
    ci.run(validManifest, [cleanSource]);
    const stats = ci.getStats();
    expect(stats.totalRuns).toBe(1);
    expect(stats.passed).toBe(1);
    expect(stats.failed).toBe(0);
  });

  it('increments failed on failure', () => {
    const bad = { ...validManifest, pluginId: '' };
    ci.run(bad, [cleanSource]);
    const stats = ci.getStats();
    expect(stats.totalRuns).toBe(1);
    expect(stats.failed).toBe(1);
    expect(stats.passed).toBe(0);
  });

  it('accumulates across multiple runs', () => {
    ci.run(validManifest, [cleanSource]);
    ci.run({ ...validManifest, pluginId: '' }, [cleanSource]);
    ci.run(validManifest, [cleanSource]);
    const stats = ci.getStats();
    expect(stats.totalRuns).toBe(3);
    expect(stats.passed).toBe(2);
    expect(stats.failed).toBe(1);
  });
});
