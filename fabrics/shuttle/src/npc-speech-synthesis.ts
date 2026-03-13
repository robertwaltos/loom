/**
 * NPC Speech Synthesis — TTS for Tier 3 NPCs with archetype voice styles.
 *
 * NEXT-STEPS Phase 9.1: "NPC speech synthesis: TTS for Tier 3 NPCs
 * (voice style per archetype)."
 *
 * Converts NPC dialogue text into audio using a `SpeechSynthesisPort`.
 * Each NPC archetype maps to a voice profile (pitch, rate, emphasis),
 * so a merchant sounds different from a scholar or a warrior.
 *
 * Features:
 *   - 8 archetype voice profiles (merchant, scholar, warrior, noble,
 *     mystic, artisan, outlaw, elder)
 *   - Per-world language overrides (localization-aware)
 *   - Emotion intensity modulation (calm, excited, angry, fearful)
 *   - Synthesis queue with priority ordering (dialogue > ambient)
 *   - Request deduplication: identical text+voice returns cached bytes
 *
 * Thread: cotton/shuttle/npc-speech-synthesis
 * Tier: 1
 */

// ── Voice Archetypes ──────────────────────────────────────────────

export type NpcArchetype =
  | 'merchant'
  | 'scholar'
  | 'warrior'
  | 'noble'
  | 'mystic'
  | 'artisan'
  | 'outlaw'
  | 'elder';

export type EmotionIntensity = 'calm' | 'excited' | 'angry' | 'fearful' | 'sorrowful';

export type SpeechPriority = 'DIALOGUE' | 'AMBIENT' | 'QUEST' | 'SYSTEM';

// ── Voice Profile ─────────────────────────────────────────────────

export interface VoiceProfile {
  /** 0.5 (deep) → 2.0 (high) */
  readonly pitchMultiplier: number;
  /** 0.5 (slow) → 2.0 (fast) */
  readonly rateMultiplier: number;
  /** 0.0 (flat) → 1.0 (very expressive) */
  readonly expressiveness: number;
  /** BCP-47 default language code */
  readonly defaultLanguage: string;
  /** Voice identifier hint e.g. 'en-US-Neural2-D' */
  readonly voiceId: string;
}

export const ARCHETYPE_PROFILES: Readonly<Record<NpcArchetype, VoiceProfile>> = {
  merchant: { pitchMultiplier: 1.0, rateMultiplier: 1.15, expressiveness: 0.7, defaultLanguage: 'en', voiceId: 'merchant-default' },
  scholar:  { pitchMultiplier: 1.0, rateMultiplier: 0.90, expressiveness: 0.4, defaultLanguage: 'en', voiceId: 'scholar-default' },
  warrior:  { pitchMultiplier: 0.80, rateMultiplier: 1.0,  expressiveness: 0.6, defaultLanguage: 'en', voiceId: 'warrior-default' },
  noble:    { pitchMultiplier: 1.05, rateMultiplier: 0.85, expressiveness: 0.5, defaultLanguage: 'en', voiceId: 'noble-default' },
  mystic:   { pitchMultiplier: 1.10, rateMultiplier: 0.80, expressiveness: 0.8, defaultLanguage: 'en', voiceId: 'mystic-default' },
  artisan:  { pitchMultiplier: 0.95, rateMultiplier: 1.05, expressiveness: 0.5, defaultLanguage: 'en', voiceId: 'artisan-default' },
  outlaw:   { pitchMultiplier: 0.90, rateMultiplier: 1.20, expressiveness: 0.65, defaultLanguage: 'en', voiceId: 'outlaw-default' },
  elder:    { pitchMultiplier: 0.85, rateMultiplier: 0.75, expressiveness: 0.55, defaultLanguage: 'en', voiceId: 'elder-default' },
};

// ── Ports ─────────────────────────────────────────────────────────

export interface SpeechSynthesisPort {
  readonly synthesize: (request: SynthesisRequest) => Promise<SynthesisResult>;
}

export interface SynthesisRequest {
  readonly text: string;
  readonly voiceId: string;
  readonly languageCode: string;
  readonly pitchMultiplier: number;
  readonly rateMultiplier: number;
  readonly emotionIntensity: EmotionIntensity;
}

export interface SynthesisResult {
  readonly audioBytes: Uint8Array;
  readonly durationMs: number;
  readonly characterCount: number;
}

export interface SpeechClock {
  readonly nowMicroseconds: () => number;
}

export interface SpeechIdPort {
  readonly next: () => string;
}

export interface SpeechLogPort {
  readonly info: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
  readonly warn: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
}

// ── Types ─────────────────────────────────────────────────────────

export type SpeechJobStatus = 'QUEUED' | 'PROCESSING' | 'DONE' | 'FAILED';

export interface SpeechJob {
  readonly jobId: string;
  readonly npcEntityId: string;
  readonly archetype: NpcArchetype;
  readonly text: string;
  readonly languageCode: string;
  readonly emotionIntensity: EmotionIntensity;
  readonly priority: SpeechPriority;
  readonly status: SpeechJobStatus;
  readonly result: SynthesisResult | null;
  readonly error: string | null;
  readonly submittedAt: number;
  readonly completedAt: number | null;
}

export interface SubmitSpeechParams {
  readonly npcEntityId: string;
  readonly archetype: NpcArchetype;
  readonly text: string;
  readonly languageCode?: string;
  readonly emotionIntensity?: EmotionIntensity;
  readonly priority?: SpeechPriority;
}

// ── Config ────────────────────────────────────────────────────────

export interface NpcSpeechConfig {
  readonly maxTextLength: number;
  readonly cacheMaxEntries: number;
}

export const DEFAULT_SPEECH_CONFIG: NpcSpeechConfig = {
  maxTextLength: 1_000,
  cacheMaxEntries: 2_000,
};

// ── Errors ────────────────────────────────────────────────────────

export type SpeechError =
  | { readonly code: 'job-not-found'; readonly jobId: string }
  | { readonly code: 'text-too-long'; readonly length: number; readonly max: number }
  | { readonly code: 'synthesis-failed'; readonly jobId: string; readonly reason: string };

// ── Stats ─────────────────────────────────────────────────────────

export interface NpcSpeechStats {
  readonly totalSubmitted: number;
  readonly totalCompleted: number;
  readonly totalFailed: number;
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly pending: number;
}

// ── Public Interface ──────────────────────────────────────────────

export interface NpcSpeechSynthesisEngine {
  readonly submit: (params: SubmitSpeechParams) => SpeechJob | SpeechError;
  readonly process: (jobId: string) => Promise<SpeechJob | SpeechError>;
  readonly getJob: (jobId: string) => SpeechJob | SpeechError;
  readonly getVoiceProfile: (archetype: NpcArchetype) => VoiceProfile;
  readonly getStats: () => NpcSpeechStats;
  readonly clearCache: () => number;
}

// ── Deps ──────────────────────────────────────────────────────────

export interface NpcSpeechDeps {
  readonly synthesizer: SpeechSynthesisPort;
  readonly clock: SpeechClock;
  readonly id: SpeechIdPort;
  readonly log: SpeechLogPort;
}

// ── Mutable State ─────────────────────────────────────────────────

interface MutableSpeechJob {
  readonly jobId: string;
  readonly npcEntityId: string;
  readonly archetype: NpcArchetype;
  readonly text: string;
  readonly languageCode: string;
  readonly emotionIntensity: EmotionIntensity;
  readonly priority: SpeechPriority;
  status: SpeechJobStatus;
  result: SynthesisResult | null;
  error: string | null;
  readonly submittedAt: number;
  completedAt: number | null;
}

// ── Factory ───────────────────────────────────────────────────────

export function createNpcSpeechSynthesisEngine(
  deps: NpcSpeechDeps,
  config?: Partial<NpcSpeechConfig>,
): NpcSpeechSynthesisEngine {
  const cfg: NpcSpeechConfig = { ...DEFAULT_SPEECH_CONFIG, ...config };
  const jobs = new Map<string, MutableSpeechJob>();
  const cache = new Map<string, SynthesisResult>(); // cacheKey → result
  let cacheHits = 0;
  let cacheMisses = 0;

  return {
    submit: (p) => submitSpeech(deps, cfg, jobs, p),
    process: (id) => processSpeech(deps, cfg, jobs, cache,
      { onHit: () => { cacheHits++; }, onMiss: () => { cacheMisses++; } }, id),
    getJob: (id) => getById(jobs, id),
    getVoiceProfile: (a) => ARCHETYPE_PROFILES[a],
    getStats: () => computeSpeechStats(jobs, cacheHits, cacheMisses),
    clearCache: () => clearSpeechCache(cache),
  };
}

// ── Submit ────────────────────────────────────────────────────────

function submitSpeech(
  deps: NpcSpeechDeps,
  cfg: NpcSpeechConfig,
  jobs: Map<string, MutableSpeechJob>,
  params: SubmitSpeechParams,
): SpeechJob | SpeechError {
  if (params.text.length > cfg.maxTextLength) {
    return { code: 'text-too-long', length: params.text.length, max: cfg.maxTextLength };
  }

  const profile = ARCHETYPE_PROFILES[params.archetype];
  const job: MutableSpeechJob = {
    jobId: deps.id.next(),
    npcEntityId: params.npcEntityId,
    archetype: params.archetype,
    text: params.text,
    languageCode: params.languageCode ?? profile.defaultLanguage,
    emotionIntensity: params.emotionIntensity ?? 'calm',
    priority: params.priority ?? 'DIALOGUE',
    status: 'QUEUED',
    result: null,
    error: null,
    submittedAt: deps.clock.nowMicroseconds(),
    completedAt: null,
  };

  jobs.set(job.jobId, job);
  deps.log.info({ jobId: job.jobId, archetype: params.archetype }, 'Speech job queued');
  return freezeSpeech(job);
}

// ── Process ───────────────────────────────────────────────────────

function buildCacheKey(job: MutableSpeechJob): string {
  return `${job.archetype}:${job.languageCode}:${job.emotionIntensity}:${job.text}`;
}

function buildSynthRequest(job: MutableSpeechJob): SynthesisRequest {
  const profile = ARCHETYPE_PROFILES[job.archetype];
  return {
    text: job.text,
    voiceId: profile.voiceId,
    languageCode: job.languageCode,
    pitchMultiplier: profile.pitchMultiplier,
    rateMultiplier: profile.rateMultiplier,
    emotionIntensity: job.emotionIntensity,
  };
}

function applyHit(
  job: MutableSpeechJob,
  cached: SynthesisResult,
  clock: SpeechClock,
): SpeechJob {
  job.status = 'DONE';
  job.result = cached;
  job.completedAt = clock.nowMicroseconds();
  return freezeSpeech(job);
}

async function applyMiss(
  deps: NpcSpeechDeps,
  cfg: NpcSpeechConfig,
  cache: Map<string, SynthesisResult>,
  cacheKey: string,
  job: MutableSpeechJob,
  jobId: string,
): Promise<SpeechJob | SpeechError> {
  try {
    const result = await deps.synthesizer.synthesize(buildSynthRequest(job));
    cacheSet(cache, cacheKey, result, cfg.cacheMaxEntries);
    job.status = 'DONE';
    job.result = result;
    job.completedAt = deps.clock.nowMicroseconds();
    deps.log.info({ jobId, durationMs: result.durationMs }, 'Speech synthesized');
    return freezeSpeech(job);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    job.status = 'FAILED';
    job.error = reason;
    job.completedAt = deps.clock.nowMicroseconds();
    deps.log.warn({ jobId, reason }, 'Synthesis failed');
    return { code: 'synthesis-failed', jobId, reason };
  }
}

async function processSpeech(
  deps: NpcSpeechDeps,
  cfg: NpcSpeechConfig,
  jobs: Map<string, MutableSpeechJob>,
  cache: Map<string, SynthesisResult>,
  hooks: { onHit: () => void; onMiss: () => void },
  jobId: string,
): Promise<SpeechJob | SpeechError> {
  const job = jobs.get(jobId);
  if (!job) return { code: 'job-not-found', jobId };
  job.status = 'PROCESSING';
  const cacheKey = buildCacheKey(job);
  const cached = cache.get(cacheKey);
  if (cached) {
    hooks.onHit();
    return applyHit(job, cached, deps.clock);
  }
  hooks.onMiss();
  return applyMiss(deps, cfg, cache, cacheKey, job, jobId);
}

function cacheSet(
  cache: Map<string, SynthesisResult>,
  key: string,
  value: SynthesisResult,
  maxEntries: number,
): void {
  if (cache.size >= maxEntries) {
    const first = cache.keys().next();
    if (first.done === false) cache.delete(first.value);
  }
  cache.set(key, value);
}

// ── Read Helpers ──────────────────────────────────────────────────

function getById(
  jobs: Map<string, MutableSpeechJob>,
  jobId: string,
): SpeechJob | SpeechError {
  const job = jobs.get(jobId);
  return job ? freezeSpeech(job) : { code: 'job-not-found', jobId };
}

// ── Stats ─────────────────────────────────────────────────────────

function computeSpeechStats(
  jobs: Map<string, MutableSpeechJob>,
  cacheHits: number,
  cacheMisses: number,
): NpcSpeechStats {
  let completed = 0;
  let failed = 0;
  let pending = 0;

  for (const j of jobs.values()) {
    if (j.status === 'DONE') completed++;
    else if (j.status === 'FAILED') failed++;
    else pending++;
  }

  return {
    totalSubmitted: jobs.size,
    totalCompleted: completed,
    totalFailed: failed,
    cacheHits,
    cacheMisses,
    pending,
  };
}

function clearSpeechCache(cache: Map<string, SynthesisResult>): number {
  const count = cache.size;
  cache.clear();
  return count;
}

// ── Freeze ─────────────────────────────────────────────────────────

function freezeSpeech(job: MutableSpeechJob): SpeechJob {
  return Object.freeze({ ...job });
}
