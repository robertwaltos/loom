import { describe, expect, it } from 'vitest';
import { createVoiceTranscriptionEngine } from '../voice-transcription.js';

describe('voice-transcription simulation', () => {
  it('simulates submit-process flow and per-player transcript retrieval', async () => {
    let now = 1_000_000;
    let id = 0;
    const engine = createVoiceTranscriptionEngine({
      transcriber: {
        transcribe: async () => ({
          text: 'Move to the eastern gate.',
          confidence: 0.93,
          languageDetected: 'en',
          durationMs: 320,
        }),
      },
      clock: { nowMicroseconds: () => now },
      id: { next: () => `job-${++id}` },
      log: { info: () => undefined, warn: () => undefined },
    });

    const job = engine.submit({
      sessionId: 'sess-1',
      playerId: 'player-1',
      worldId: 'world-1',
      purpose: 'accessibility',
      languageHint: 'en',
      audio: new Uint8Array(512),
    });
    if ('code' in job) throw new Error('submit failed');

    const done = await engine.process(job.jobId);
    expect('code' in done).toBe(false);
    expect(engine.listByPlayer('player-1').length).toBe(1);
  });
});
