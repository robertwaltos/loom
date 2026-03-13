import { describe, it, expect, vi } from 'vitest';
import {
  createVoiceTranscriptionEngine,
  DEFAULT_TRANSCRIPTION_CONFIG,
  type TranscriberPort,
  type TranscriptionLogPort,
  type VoiceTranscriptionDeps,
  type SubmitTranscriptionParams,
} from '../voice-transcription.js';

// ── Test Doubles ──────────────────────────────────────────────────

let counter = 0;
function makeId() {
  counter++;
  return `job-${String(counter)}`;
}

function makeClock(us = 1_000_000) {
  let now = us;
  return { nowMicroseconds: () => now, advance: (delta: number) => { now += delta; } };
}

function makeLog(): TranscriptionLogPort {
  return { info: vi.fn(), warn: vi.fn() };
}

function makeTranscriber(
  result: { text: string; confidence: number; languageDetected: string; durationMs: number },
): TranscriberPort & { transcribe: ReturnType<typeof vi.fn> } {
  const transcribe = vi.fn().mockResolvedValue(result);
  return { transcribe } as unknown as TranscriberPort & { transcribe: ReturnType<typeof vi.fn> };
}

const GOOD_RESULT = { text: 'Hello world', confidence: 0.95, languageDetected: 'en', durationMs: 420 };
const LOW_RESULT  = { text: 'mumblemumble', confidence: 0.45, languageDetected: 'en', durationMs: 210 };

function audioBytes(size = 1024) {
  return new Uint8Array(size);
}

function makeParams(overrides: Partial<SubmitTranscriptionParams> = {}): SubmitTranscriptionParams {
  return {
    sessionId: 'sess-1',
    playerId: 'player-1',
    worldId: 'world-A',
    purpose: 'accessibility',
    languageHint: 'en',
    audio: audioBytes(),
    ...overrides,
  };
}

function makeDeps(tResult = GOOD_RESULT): VoiceTranscriptionDeps & { clock: ReturnType<typeof makeClock> } {
  return {
    transcriber: makeTranscriber(tResult),
    clock: makeClock(),
    id: { next: makeId },
    log: makeLog(),
  };
}

// ── Tests ─────────────────────────────────────────────────────────

describe('VoiceTranscriptionEngine — submit', () => {
  it('returns a PENDING job on valid submit', () => {
    const deps = makeDeps();
    const engine = createVoiceTranscriptionEngine(deps);
    const result = engine.submit(makeParams());
    expect('code' in result).toBe(false);
    if ('code' in result) return;
    expect(result.status).toBe('PENDING');
    expect(result.playerId).toBe('player-1');
    expect(result.languageHint).toBe('en');
  });

  it('rejects audio exceeding maxAudioBytes', () => {
    const deps = makeDeps();
    const engine = createVoiceTranscriptionEngine(deps, { maxAudioBytes: 512 });
    const result = engine.submit(makeParams({ audio: audioBytes(1024) }));
    expect('code' in result).toBe(true);
    if (!('code' in result)) return;
    expect(result.code).toBe('audio-too-large');
  });

  it('rejects unsupported language codes', () => {
    const deps = makeDeps();
    const engine = createVoiceTranscriptionEngine(deps);
    const result = engine.submit(makeParams({ languageHint: 'klingon' }));
    expect('code' in result).toBe(true);
    if (!('code' in result)) return;
    expect(result.code).toBe('invalid-language');
  });

  it('normalizes language hint to lowercase', () => {
    const deps = makeDeps();
    const engine = createVoiceTranscriptionEngine(deps);
    const result = engine.submit(makeParams({ languageHint: 'EN' }));
    expect('code' in result).toBe(false);
    if ('code' in result) return;
    expect(result.languageHint).toBe('en');
  });
});

describe('VoiceTranscriptionEngine — process', () => {
  it('transitions status from PENDING to DONE', async () => {
    const deps = makeDeps();
    const engine = createVoiceTranscriptionEngine(deps);
    const submitted = engine.submit(makeParams());
    if ('code' in submitted) throw new Error('submit failed');

    const processed = await engine.process(submitted.jobId);
    expect('code' in processed).toBe(false);
    if ('code' in processed) return;
    expect(processed.status).toBe('DONE');
    expect(processed.result?.text).toBe('Hello world');
    expect(processed.result?.confidence).toBe(0.95);
  });

  it('returns job-not-found for unknown jobId', async () => {
    const deps = makeDeps();
    const engine = createVoiceTranscriptionEngine(deps);
    const result = await engine.process('nonexistent');
    expect('code' in result).toBe(true);
    if (!('code' in result)) return;
    expect(result.code).toBe('job-not-found');
  });

  it('returns transcription-failed when transcriber throws', async () => {
    const transcribe = vi.fn().mockRejectedValue(new Error('model unavailable'));
    const baseDeps = makeDeps();
    const deps: VoiceTranscriptionDeps = {
      ...baseDeps,
      transcriber: { transcribe } as unknown as TranscriberPort,
    };
    const engine = createVoiceTranscriptionEngine(deps);
    const submitted = engine.submit(makeParams());
    if ('code' in submitted) throw new Error('submit failed');

    const result = await engine.process(submitted.jobId);
    expect('code' in result).toBe(true);
    if (!('code' in result)) return;
    expect(result.code).toBe('transcription-failed');
    if (result.code !== 'transcription-failed') return;
    expect(result.reason).toBe('model unavailable');
  });

  it('logs a warning for low-confidence results', async () => {
    const deps = makeDeps(LOW_RESULT);
    const engine = createVoiceTranscriptionEngine(deps);
    const submitted = engine.submit(makeParams());
    if ('code' in submitted) throw new Error('submit failed');

    await engine.process(submitted.jobId);
    expect(deps.log.warn).toHaveBeenCalled();
  });
});

describe('VoiceTranscriptionEngine — getJob / listByPlayer', () => {
  it('retrieves a submitted job by id', () => {
    const deps = makeDeps();
    const engine = createVoiceTranscriptionEngine(deps);
    const submitted = engine.submit(makeParams());
    if ('code' in submitted) throw new Error('submit failed');

    const fetched = engine.getJob(submitted.jobId);
    expect('code' in fetched).toBe(false);
    if ('code' in fetched) return;
    expect(fetched.jobId).toBe(submitted.jobId);
  });

  it('returns job-not-found for unknown id', () => {
    const deps = makeDeps();
    const engine = createVoiceTranscriptionEngine(deps);
    const result = engine.getJob('x');
    expect('code' in result).toBe(true);
  });

  it('lists all jobs for a player', () => {
    const deps = makeDeps();
    const engine = createVoiceTranscriptionEngine(deps);
    engine.submit(makeParams({ purpose: 'accessibility' }));
    engine.submit(makeParams({ purpose: 'moderation' }));
    engine.submit(makeParams({ playerId: 'player-2' }));
    expect(engine.listByPlayer('player-1')).toHaveLength(2);
    expect(engine.listByPlayer('player-2')).toHaveLength(1);
    expect(engine.listByPlayer('nobody')).toHaveLength(0);
  });
});

describe('VoiceTranscriptionEngine — stats', () => {
  it('reflects submitted / completed counts', async () => {
    const deps = makeDeps();
    const engine = createVoiceTranscriptionEngine(deps);

    engine.submit(makeParams());
    const s1 = engine.submit(makeParams());
    if ('code' in s1) throw new Error('submit failed');
    await engine.process(s1.jobId);

    const stats = engine.getStats();
    expect(stats.totalSubmitted).toBe(2);
    expect(stats.totalCompleted).toBe(1);
    expect(stats.totalFailed).toBe(0);
    expect(stats.pending).toBe(1);
    expect(stats.averageConfidence).toBe(0.95);
  });
});

describe('VoiceTranscriptionEngine — purge', () => {
  it('removes jobs older than the cutoff for a given purpose', () => {
    const deps = makeDeps();
    const engine = createVoiceTranscriptionEngine(deps);

    // submitted at us=1_000_000
    engine.submit(makeParams({ purpose: 'session-record' }));
    // advance time then submit another
    deps.clock.advance(10_000_000);
    engine.submit(makeParams({ purpose: 'session-record' }));

    // purge session-record jobs older than us=5_000_000
    const removed = engine.purge('session-record', 5_000_000);
    expect(removed).toBe(1);
    expect(engine.getStats().totalSubmitted).toBe(1);
  });

  it('does not remove jobs of a different purpose', () => {
    const deps = makeDeps();
    const engine = createVoiceTranscriptionEngine(deps);
    engine.submit(makeParams({ purpose: 'accessibility' }));

    const removed = engine.purge('session-record', 999_999_999);
    expect(removed).toBe(0);
  });
});

describe('VoiceTranscriptionEngine — config', () => {
  it('respects DEFAULT_TRANSCRIPTION_CONFIG exports', () => {
    expect(DEFAULT_TRANSCRIPTION_CONFIG.maxAudioBytes).toBe(25 * 1_024 * 1_024);
    expect(DEFAULT_TRANSCRIPTION_CONFIG.minConfidenceThreshold).toBe(0.6);
    expect(DEFAULT_TRANSCRIPTION_CONFIG.languageFallback).toBe('en');
  });
});
