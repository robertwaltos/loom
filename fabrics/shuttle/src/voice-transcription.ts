/**
 * Voice Transcription Engine — Accessibility-first speech-to-text.
 *
 * NEXT-STEPS Phase 8.1: "Voice-to-text transcription for accessibility
 * (whisper model via shuttle workflows)."
 *
 * Converts live voice audio chunks to text for:
 *   - Chat overlay (hearing-impaired accessibility)
 *   - NPC voice input (player speaking to NPCs)
 *   - Content moderation (audio evidence trails)
 *   - Session recording transcripts
 *
 * Uses a `TranscriberPort` — never directly imports model infra.
 * Audio bytes are held in a transient buffer map, cleared after processing.
 *
 * Thread: cotton/shuttle/voice-transcription
 * Tier: 1
 */

// ── Ports ────────────────────────────────────────────────────────

export interface TranscriberPort {
  /** Transcribe raw audio bytes; returns text and confidence ∈ [0,1]. */
  readonly transcribe: (
    audio: Uint8Array,
    languageHint: string,
  ) => Promise<TranscriptionResult>;
}

export interface TranscriptionClock {
  readonly nowMicroseconds: () => number;
}

export interface TranscriptionIdPort {
  readonly next: () => string;
}

export interface TranscriptionLogPort {
  readonly info: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
  readonly warn: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
}

// ── Types ────────────────────────────────────────────────────────

export interface TranscriptionResult {
  readonly text: string;
  readonly confidence: number;
  readonly languageDetected: string;
  readonly durationMs: number;
}

export type TranscriptionPurpose =
  | 'accessibility'
  | 'npc-input'
  | 'moderation'
  | 'session-record';

export type TranscriptionStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';

export interface TranscriptionJob {
  readonly jobId: string;
  readonly sessionId: string;
  readonly playerId: string;
  readonly worldId: string;
  readonly purpose: TranscriptionPurpose;
  readonly languageHint: string;
  readonly audioSizeBytes: number;
  readonly status: TranscriptionStatus;
  readonly result: TranscriptionResult | null;
  readonly error: string | null;
  readonly submittedAt: number;
  readonly completedAt: number | null;
}

export interface SubmitTranscriptionParams {
  readonly sessionId: string;
  readonly playerId: string;
  readonly worldId: string;
  readonly purpose: TranscriptionPurpose;
  readonly languageHint: string;
  readonly audio: Uint8Array;
}

// ── Config ────────────────────────────────────────────────────────

export interface VoiceTranscriptionConfig {
  readonly maxAudioBytes: number;
  readonly minConfidenceThreshold: number;
  readonly languageFallback: string;
}

const MB = 1_024 * 1_024;

export const DEFAULT_TRANSCRIPTION_CONFIG: VoiceTranscriptionConfig = {
  maxAudioBytes: 25 * MB,
  minConfidenceThreshold: 0.6,
  languageFallback: 'en',
};

// ── Errors ───────────────────────────────────────────────────────

export type TranscriptionError =
  | { readonly code: 'job-not-found'; readonly jobId: string }
  | { readonly code: 'audio-too-large'; readonly bytes: number; readonly maxBytes: number }
  | { readonly code: 'invalid-language'; readonly language: string }
  | { readonly code: 'transcription-failed'; readonly jobId: string; readonly reason: string };

// ── Stats ────────────────────────────────────────────────────────

export interface TranscriptionStats {
  readonly totalSubmitted: number;
  readonly totalCompleted: number;
  readonly totalFailed: number;
  readonly pending: number;
  readonly processing: number;
  readonly averageConfidence: number;
}

// ── Public Interface ─────────────────────────────────────────────

export interface VoiceTranscriptionEngine {
  readonly submit: (params: SubmitTranscriptionParams) => TranscriptionJob | TranscriptionError;
  readonly process: (jobId: string) => Promise<TranscriptionJob | TranscriptionError>;
  readonly getJob: (jobId: string) => TranscriptionJob | TranscriptionError;
  readonly listByPlayer: (playerId: string) => ReadonlyArray<TranscriptionJob>;
  readonly getStats: () => TranscriptionStats;
  readonly purge: (purpose: TranscriptionPurpose, olderThanUs: number) => number;
}

// ── Valid Languages ───────────────────────────────────────────────

const SUPPORTED_LANGUAGES = new Set([
  'en', 'es', 'pt', 'fr', 'de', 'it', 'ja', 'ko', 'zh', 'ru', 'ar', 'hi',
]);

// ── Mutable State ────────────────────────────────────────────────

interface MutableJob {
  readonly jobId: string;
  readonly sessionId: string;
  readonly playerId: string;
  readonly worldId: string;
  readonly purpose: TranscriptionPurpose;
  readonly languageHint: string;
  readonly audioSizeBytes: number;
  status: TranscriptionStatus;
  result: TranscriptionResult | null;
  error: string | null;
  readonly submittedAt: number;
  completedAt: number | null;
}

export interface VoiceTranscriptionDeps {
  readonly transcriber: TranscriberPort;
  readonly clock: TranscriptionClock;
  readonly id: TranscriptionIdPort;
  readonly log: TranscriptionLogPort;
}

// ── Factory ──────────────────────────────────────────────────────

export function createVoiceTranscriptionEngine(
  deps: VoiceTranscriptionDeps,
  config?: Partial<VoiceTranscriptionConfig>,
): VoiceTranscriptionEngine {
  const cfg: VoiceTranscriptionConfig = { ...DEFAULT_TRANSCRIPTION_CONFIG, ...config };
  const jobs = new Map<string, MutableJob>();
  const audioBuffer = new Map<string, Uint8Array>();
  const playerIndex = new Map<string, string[]>();

  return {
    submit: (p) => submitJob(deps, cfg, jobs, audioBuffer, playerIndex, p),
    process: (id) => processJob(deps, cfg, jobs, audioBuffer, id),
    getJob: (id) => getJobById(jobs, id),
    listByPlayer: (pid) => listByPlayer(jobs, playerIndex, pid),
    getStats: () => computeStats(jobs),
    purge: (purpose, older) => purge(jobs, playerIndex, purpose, older),
  };
}

// ── Submit ───────────────────────────────────────────────────────

function validateSubmit(
  cfg: VoiceTranscriptionConfig,
  params: SubmitTranscriptionParams,
): TranscriptionError | null {
  if (params.audio.byteLength > cfg.maxAudioBytes) {
    return { code: 'audio-too-large', bytes: params.audio.byteLength, maxBytes: cfg.maxAudioBytes };
  }
  const lang = params.languageHint.toLowerCase();
  if (!SUPPORTED_LANGUAGES.has(lang)) {
    return { code: 'invalid-language', language: params.languageHint };
  }
  return null;
}

function buildJob(deps: VoiceTranscriptionDeps, params: SubmitTranscriptionParams): MutableJob {
  return {
    jobId: deps.id.next(),
    sessionId: params.sessionId,
    playerId: params.playerId,
    worldId: params.worldId,
    purpose: params.purpose,
    languageHint: params.languageHint.toLowerCase(),
    audioSizeBytes: params.audio.byteLength,
    status: 'PENDING',
    result: null,
    error: null,
    submittedAt: deps.clock.nowMicroseconds(),
    completedAt: null,
  };
}

function submitJob(
  deps: VoiceTranscriptionDeps,
  cfg: VoiceTranscriptionConfig,
  jobs: Map<string, MutableJob>,
  audioBuffer: Map<string, Uint8Array>,
  playerIndex: Map<string, string[]>,
  params: SubmitTranscriptionParams,
): TranscriptionJob | TranscriptionError {
  const err = validateSubmit(cfg, params);
  if (err) return err;

  const job = buildJob(deps, params);
  jobs.set(job.jobId, job);
  audioBuffer.set(job.jobId, params.audio);

  const existing = playerIndex.get(params.playerId) ?? [];
  playerIndex.set(params.playerId, [...existing, job.jobId]);

  deps.log.info({ jobId: job.jobId, playerId: params.playerId, purpose: params.purpose }, 'Job submitted');
  return freeze(job);
}

// ── Process ──────────────────────────────────────────────────────

function applySuccess(
  deps: VoiceTranscriptionDeps,
  cfg: VoiceTranscriptionConfig,
  job: MutableJob,
  result: TranscriptionResult,
): void {
  if (result.confidence < cfg.minConfidenceThreshold) {
    deps.log.warn({ jobId: job.jobId, confidence: result.confidence }, 'Low confidence transcription');
  }
  job.status = 'DONE';
  job.result = result;
  job.completedAt = deps.clock.nowMicroseconds();
  deps.log.info({ jobId: job.jobId, confidence: result.confidence }, 'Transcription done');
}

function applyFailure(deps: VoiceTranscriptionDeps, job: MutableJob, err: unknown): string {
  const reason = err instanceof Error ? err.message : String(err);
  job.status = 'FAILED';
  job.error = reason;
  job.completedAt = deps.clock.nowMicroseconds();
  deps.log.warn({ jobId: job.jobId, reason }, 'Transcription failed');
  return reason;
}

async function processJob(
  deps: VoiceTranscriptionDeps,
  cfg: VoiceTranscriptionConfig,
  jobs: Map<string, MutableJob>,
  audioBuffer: Map<string, Uint8Array>,
  jobId: string,
): Promise<TranscriptionJob | TranscriptionError> {
  const job = jobs.get(jobId);
  if (!job) return { code: 'job-not-found', jobId };

  const audio = audioBuffer.get(jobId);
  if (!audio) return { code: 'job-not-found', jobId };

  job.status = 'PROCESSING';

  try {
    const result = await deps.transcriber.transcribe(audio, job.languageHint);
    audioBuffer.delete(jobId);
    applySuccess(deps, cfg, job, result);
    return freeze(job);
  } catch (err) {
    audioBuffer.delete(jobId);
    const reason = applyFailure(deps, job, err);
    return { code: 'transcription-failed', jobId, reason };
  }
}

// ── Read Helpers ─────────────────────────────────────────────────

function getJobById(
  jobs: Map<string, MutableJob>,
  jobId: string,
): TranscriptionJob | TranscriptionError {
  const job = jobs.get(jobId);
  return job ? freeze(job) : { code: 'job-not-found', jobId };
}

function listByPlayer(
  jobs: Map<string, MutableJob>,
  playerIndex: Map<string, string[]>,
  playerId: string,
): ReadonlyArray<TranscriptionJob> {
  const ids = playerIndex.get(playerId) ?? [];
  return ids
    .map((id) => jobs.get(id))
    .filter((j): j is MutableJob => j !== undefined)
    .map(freeze);
}

// ── Stats ────────────────────────────────────────────────────────

interface StatAccum {
  completed: number;
  failed: number;
  pending: number;
  processing: number;
  totalConfidence: number;
}

function accumulateJob(acc: StatAccum, job: MutableJob): void {
  switch (job.status) {
    case 'DONE':
      acc.completed++;
      acc.totalConfidence += job.result?.confidence ?? 0;
      break;
    case 'FAILED':
      acc.failed++;
      break;
    case 'PENDING':
      acc.pending++;
      break;
    default:
      acc.processing++;
  }
}

function computeStats(jobs: Map<string, MutableJob>): TranscriptionStats {
  const acc: StatAccum = { completed: 0, failed: 0, pending: 0, processing: 0, totalConfidence: 0 };
  for (const job of jobs.values()) accumulateJob(acc, job);
  return {
    totalSubmitted: jobs.size,
    totalCompleted: acc.completed,
    totalFailed: acc.failed,
    pending: acc.pending,
    processing: acc.processing,
    averageConfidence: acc.completed > 0 ? acc.totalConfidence / acc.completed : 0,
  };
}

// ── Purge ────────────────────────────────────────────────────────

function purge(
  jobs: Map<string, MutableJob>,
  playerIndex: Map<string, string[]>,
  purpose: TranscriptionPurpose,
  olderThanUs: number,
): number {
  let count = 0;

  for (const [id, job] of jobs) {
    if (job.purpose === purpose && job.submittedAt < olderThanUs) {
      jobs.delete(id);
      count++;
    }
  }

  for (const [pid, ids] of playerIndex) {
    playerIndex.set(pid, ids.filter((id) => jobs.has(id)));
  }

  return count;
}

// ── Freeze ───────────────────────────────────────────────────────

function freeze(job: MutableJob): TranscriptionJob {
  return Object.freeze({ ...job });
}
