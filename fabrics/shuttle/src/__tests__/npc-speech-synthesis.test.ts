import { describe, it, expect, vi } from 'vitest';
import {
  createNpcSpeechSynthesisEngine,
  DEFAULT_SPEECH_CONFIG,
  type NpcSpeechDeps,
  type SpeechSynthesisPort,
  type SpeechLogPort,
  type SubmitSpeechParams,
  type NpcArchetype,
} from '../npc-speech-synthesis.js';

// ── Test Doubles ──────────────────────────────────────────────────

let counter = 0;
function makeId() {
  counter++;
  return `speech-${String(counter)}`;
}

function makeClock(us = 1_000_000) {
  let now = us;
  return { nowMicroseconds: () => now, advance: (d: number) => { now += d; } };
}

function makeLog(): SpeechLogPort {
  return { info: vi.fn(), warn: vi.fn() };
}

const GOOD_RESULT = {
  audioBytes: new Uint8Array(512),
  durationMs: 1200,
  characterCount: 25,
};

function makeSynthesizer(
  impl?: () => Promise<typeof GOOD_RESULT>,
): SpeechSynthesisPort & { synthesize: ReturnType<typeof vi.fn> } {
  const synthesize = vi.fn().mockImplementation(impl ?? (() => Promise.resolve(GOOD_RESULT)));
  return { synthesize } as unknown as SpeechSynthesisPort & { synthesize: ReturnType<typeof vi.fn> };
}

function makeDeps(synth?: SpeechSynthesisPort): NpcSpeechDeps & { clock: ReturnType<typeof makeClock> } {
  return {
    synthesizer: synth ?? makeSynthesizer(),
    clock: makeClock(),
    id: { next: makeId },
    log: makeLog(),
  };
}

function makeParams(overrides: Partial<SubmitSpeechParams> = {}): SubmitSpeechParams {
  return {
    npcEntityId: 'npc-1',
    archetype: 'merchant',
    text: 'Welcome, traveller! Fine wares today.',
    ...overrides,
  };
}

// ── Submit ────────────────────────────────────────────────────────

describe('submit', () => {
  it('rejects text that exceeds maxTextLength', () => {
    const engine = createNpcSpeechSynthesisEngine(makeDeps(), { maxTextLength: 10 });
    const r = engine.submit(makeParams({ text: 'x'.repeat(11) }));
    expect(r).toMatchObject({ code: 'text-too-long', length: 11, max: 10 });
  });

  it('returns a QUEUED job with defaults', () => {
    const engine = createNpcSpeechSynthesisEngine(makeDeps());
    const r = engine.submit(makeParams());
    expect(r).toMatchObject({
      status: 'QUEUED',
      archetype: 'merchant',
      priority: 'DIALOGUE',
      emotionIntensity: 'calm',
      result: null,
      error: null,
    });
    expect('jobId' in r && r.jobId).toBeTruthy();
  });

  it('respects explicit languageCode and priority overrides', () => {
    const engine = createNpcSpeechSynthesisEngine(makeDeps());
    const r = engine.submit(makeParams({ languageCode: 'fr', priority: 'QUEST', emotionIntensity: 'excited' }));
    expect(r).toMatchObject({ languageCode: 'fr', priority: 'QUEST', emotionIntensity: 'excited' });
  });
});

// ── Process ───────────────────────────────────────────────────────

describe('process', () => {
  it('returns job-not-found for unknown jobId', async () => {
    const engine = createNpcSpeechSynthesisEngine(makeDeps());
    const r = await engine.process('no-such-job');
    expect(r).toMatchObject({ code: 'job-not-found', jobId: 'no-such-job' });
  });

  it('calls synthesizer and returns DONE job on success', async () => {
    const synth = makeSynthesizer();
    const deps = makeDeps(synth);
    const engine = createNpcSpeechSynthesisEngine(deps);
    const submitted = engine.submit(makeParams());
    if ('code' in submitted) throw new Error('unexpected error');

    const r = await engine.process(submitted.jobId);
    expect(r).toMatchObject({ status: 'DONE', jobId: submitted.jobId });
    expect(synth.synthesize).toHaveBeenCalledOnce();
  });

  it('returns synthesis-failed when synthesizer throws', async () => {
    const synth = makeSynthesizer(() => Promise.reject(new Error('TTS offline')));
    const deps = makeDeps(synth);
    const engine = createNpcSpeechSynthesisEngine(deps);
    const submitted = engine.submit(makeParams());
    if ('code' in submitted) throw new Error('unexpected error');

    const r = await engine.process(submitted.jobId);
    if (!('code' in r) || r.code !== 'synthesis-failed') throw new Error('expected synthesis-failed');
    expect(r.reason).toBe('TTS offline');
  });

  it('hits cache on second process for identical params', async () => {
    const synth = makeSynthesizer();
    const deps = makeDeps(synth);
    const engine = createNpcSpeechSynthesisEngine(deps);

    const p = makeParams();
    const j1 = engine.submit(p);
    const j2 = engine.submit(p); // same text/archetype/lang/emotion
    if ('code' in j1 || 'code' in j2) throw new Error('unexpected error');

    await engine.process(j1.jobId);
    await engine.process(j2.jobId);

    // synthesizer should only be called once (second hit is from cache)
    expect(synth.synthesize).toHaveBeenCalledOnce();
  });
});

// ── getJob ────────────────────────────────────────────────────────

describe('getJob', () => {
  it('returns job-not-found for unknown id', () => {
    const engine = createNpcSpeechSynthesisEngine(makeDeps());
    expect(engine.getJob('ghost')).toMatchObject({ code: 'job-not-found' });
  });

  it('returns current job state', () => {
    const engine = createNpcSpeechSynthesisEngine(makeDeps());
    const r = engine.submit(makeParams());
    if ('code' in r) throw new Error('unexpected error');
    const got = engine.getJob(r.jobId);
    expect(got).toMatchObject({ jobId: r.jobId, status: 'QUEUED' });
  });
});

// ── getVoiceProfile ───────────────────────────────────────────────

describe('getVoiceProfile', () => {
  const archetypes: NpcArchetype[] = [
    'merchant', 'scholar', 'warrior', 'noble', 'mystic', 'artisan', 'outlaw', 'elder',
  ];

  it.each(archetypes)('returns a valid profile for archetype %s', (archetype) => {
    const engine = createNpcSpeechSynthesisEngine(makeDeps());
    const profile = engine.getVoiceProfile(archetype);
    expect(profile.pitchMultiplier).toBeGreaterThan(0);
    expect(profile.rateMultiplier).toBeGreaterThan(0);
    expect(profile.voiceId).toBeTruthy();
  });

  it('all eight archetype profiles are distinct voiceIds', () => {
    const engine = createNpcSpeechSynthesisEngine(makeDeps());
    const voiceIds = archetypes.map((a) => engine.getVoiceProfile(a).voiceId);
    const unique = new Set(voiceIds);
    expect(unique.size).toBe(archetypes.length);
  });

  it('warrior has lower pitch than merchant', () => {
    const engine = createNpcSpeechSynthesisEngine(makeDeps());
    expect(engine.getVoiceProfile('warrior').pitchMultiplier)
      .toBeLessThan(engine.getVoiceProfile('merchant').pitchMultiplier);
  });
});

// ── getStats ──────────────────────────────────────────────────────

describe('getStats', () => {
  it('starts at zero', () => {
    const engine = createNpcSpeechSynthesisEngine(makeDeps());
    expect(engine.getStats()).toMatchObject({
      totalSubmitted: 0,
      totalCompleted: 0,
      totalFailed: 0,
      cacheHits: 0,
      cacheMisses: 0,
      pending: 0,
    });
  });

  it('increments counts after submit and process', async () => {
    const engine = createNpcSpeechSynthesisEngine(makeDeps());
    const r = engine.submit(makeParams());
    if ('code' in r) throw new Error('unexpected error');

    await engine.process(r.jobId);
    const stats = engine.getStats();
    expect(stats.totalSubmitted).toBe(1);
    expect(stats.totalCompleted).toBe(1);
    expect(stats.cacheMisses).toBe(1);
    expect(stats.cacheHits).toBe(0);
  });

  it('tracks cache hits', async () => {
    const engine = createNpcSpeechSynthesisEngine(makeDeps());
    const p = makeParams({ archetype: 'elder', text: 'The weave remembers.' });
    const j1 = engine.submit(p);
    const j2 = engine.submit(p);
    if ('code' in j1 || 'code' in j2) throw new Error('unexpected error');

    await engine.process(j1.jobId);
    await engine.process(j2.jobId);

    const stats = engine.getStats();
    expect(stats.cacheHits).toBe(1);
    expect(stats.cacheMisses).toBe(1);
  });
});

// ── clearCache ────────────────────────────────────────────────────

describe('clearCache', () => {
  it('returns 0 when cache is empty', () => {
    const engine = createNpcSpeechSynthesisEngine(makeDeps());
    expect(engine.clearCache()).toBe(0);
  });

  it('returns count of cleared entries and forces re-synthesis', async () => {
    const synth = makeSynthesizer();
    const engine = createNpcSpeechSynthesisEngine(makeDeps(synth));
    const p = makeParams({ text: 'Goods for sale!' });
    const j1 = engine.submit(p);
    if ('code' in j1) throw new Error('unexpected error');
    await engine.process(j1.jobId);

    const cleared = engine.clearCache();
    expect(cleared).toBe(1);

    // Next identical process should re-call synthesizer (not hit cache)
    const j2 = engine.submit(p);
    if ('code' in j2) throw new Error('unexpected error');
    await engine.process(j2.jobId);

    expect(synth.synthesize).toHaveBeenCalledTimes(2);
  });
});

// ── Config ─────────────────────────────────────────────────────────

describe('DEFAULT_SPEECH_CONFIG', () => {
  it('has expected shape', () => {
    expect(DEFAULT_SPEECH_CONFIG.maxTextLength).toBeGreaterThan(0);
    expect(DEFAULT_SPEECH_CONFIG.cacheMaxEntries).toBeGreaterThan(0);
  });
});
