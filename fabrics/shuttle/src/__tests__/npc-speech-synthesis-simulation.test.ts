import { describe, expect, it } from 'vitest';
import { createNpcSpeechSynthesisEngine } from '../npc-speech-synthesis.js';

describe('npc-speech-synthesis simulation', () => {
  it('simulates queued dialogue synthesis and completion with cached reuse', async () => {
    let now = 1_000_000;
    let id = 0;
    const engine = createNpcSpeechSynthesisEngine({
      synthesizer: {
        synthesize: async () => ({
          audioBytes: new Uint8Array(128),
          durationMs: 900,
          characterCount: 22,
        }),
      },
      clock: { nowMicroseconds: () => now },
      id: { next: () => `speech-${++id}` },
      log: { info: () => undefined, warn: () => undefined },
    });

    const p = {
      npcEntityId: 'npc-1',
      archetype: 'merchant' as const,
      text: 'Fresh goods from the river trade!',
    };
    const j1 = engine.submit(p);
    const j2 = engine.submit(p);
    if ('code' in j1 || 'code' in j2) throw new Error('submit failed');

    const r1 = await engine.process(j1.jobId);
    const r2 = await engine.process(j2.jobId);

    expect('code' in r1).toBe(false);
    expect('code' in r2).toBe(false);
    expect(engine.getStats().cacheHits).toBeGreaterThanOrEqual(1);
  });
});
