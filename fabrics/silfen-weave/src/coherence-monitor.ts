/**
 * coherence-monitor.ts — World coherence monitoring.
 *
 * Tracks coherence levels for active frequency locks and transit
 * corridors. Detects degradation trends, triggers alerts when
 * thresholds are breached, and provides aggregate coherence
 * health for the lattice.
 */

// ── Ports ────────────────────────────────────────────────────────

interface CoherenceClock {
  readonly nowMicroseconds: () => number;
}

interface CoherenceMonitorDeps {
  readonly clock: CoherenceClock;
}

// ── Types ────────────────────────────────────────────────────────

type CoherenceLevel = 'nominal' | 'degraded' | 'critical' | 'failed';

interface CoherenceSample {
  readonly subjectId: string;
  readonly value: number;
  readonly level: CoherenceLevel;
  readonly recordedAt: number;
}

interface CoherenceSubject {
  readonly subjectId: string;
  readonly label: string;
  readonly samples: CoherenceSample[];
  readonly registeredAt: number;
}

interface RegisterSubjectParams {
  readonly subjectId: string;
  readonly label: string;
}

interface RecordSampleParams {
  readonly subjectId: string;
  readonly value: number;
}

interface CoherenceAlert {
  readonly subjectId: string;
  readonly level: CoherenceLevel;
  readonly value: number;
  readonly timestamp: number;
}

interface CoherenceConfig {
  readonly degradedThreshold: number;
  readonly criticalThreshold: number;
  readonly failedThreshold: number;
  readonly maxSamples: number;
}

interface CoherenceStats {
  readonly totalSubjects: number;
  readonly totalSamples: number;
  readonly totalAlerts: number;
  readonly subjectsByLevel: Record<CoherenceLevel, number>;
}

interface CoherenceMonitor {
  readonly register: (params: RegisterSubjectParams) => boolean;
  readonly unregister: (subjectId: string) => boolean;
  readonly recordSample: (params: RecordSampleParams) => CoherenceAlert | undefined;
  readonly getSubject: (subjectId: string) => CoherenceSubject | undefined;
  readonly getLevel: (subjectId: string) => CoherenceLevel | undefined;
  readonly getLatestValue: (subjectId: string) => number | undefined;
  readonly listByLevel: (level: CoherenceLevel) => readonly CoherenceSubject[];
  readonly getAlerts: () => readonly CoherenceAlert[];
  readonly getStats: () => CoherenceStats;
}

// ── Constants ────────────────────────────────────────────────────

const DEFAULT_COHERENCE_CONFIG: CoherenceConfig = {
  degradedThreshold: 0.7,
  criticalThreshold: 0.4,
  failedThreshold: 0.1,
  maxSamples: 100,
};

// ── State ────────────────────────────────────────────────────────

interface CoherenceState {
  readonly deps: CoherenceMonitorDeps;
  readonly config: CoherenceConfig;
  readonly subjects: Map<string, MutableSubject>;
  readonly alerts: CoherenceAlert[];
  totalSamples: number;
}

interface MutableSubject {
  readonly subjectId: string;
  readonly label: string;
  readonly samples: CoherenceSample[];
  readonly registeredAt: number;
}

// ── Helpers ──────────────────────────────────────────────────────

function classifyLevel(value: number, config: CoherenceConfig): CoherenceLevel {
  if (value <= config.failedThreshold) return 'failed';
  if (value <= config.criticalThreshold) return 'critical';
  if (value <= config.degradedThreshold) return 'degraded';
  return 'nominal';
}

function buildSample(
  subjectId: string,
  value: number,
  level: CoherenceLevel,
  timestamp: number,
): CoherenceSample {
  return { subjectId, value, level, recordedAt: timestamp };
}

function addSampleToSubject(
  subject: MutableSubject,
  sample: CoherenceSample,
  maxSamples: number,
): void {
  subject.samples.push(sample);
  if (subject.samples.length > maxSamples) {
    subject.samples.splice(0, subject.samples.length - maxSamples);
  }
}

// ── Operations ───────────────────────────────────────────────────

function registerImpl(state: CoherenceState, params: RegisterSubjectParams): boolean {
  if (state.subjects.has(params.subjectId)) return false;
  state.subjects.set(params.subjectId, {
    subjectId: params.subjectId,
    label: params.label,
    samples: [],
    registeredAt: state.deps.clock.nowMicroseconds(),
  });
  return true;
}

function unregisterImpl(state: CoherenceState, subjectId: string): boolean {
  return state.subjects.delete(subjectId);
}

function recordSampleImpl(
  state: CoherenceState,
  params: RecordSampleParams,
): CoherenceAlert | undefined {
  const subject = state.subjects.get(params.subjectId);
  if (!subject) return undefined;
  const now = state.deps.clock.nowMicroseconds();
  const level = classifyLevel(params.value, state.config);
  const sample = buildSample(params.subjectId, params.value, level, now);
  addSampleToSubject(subject, sample, state.config.maxSamples);
  state.totalSamples += 1;
  if (level === 'nominal') return undefined;
  const alert: CoherenceAlert = {
    subjectId: params.subjectId,
    level,
    value: params.value,
    timestamp: now,
  };
  state.alerts.push(alert);
  return alert;
}

function getSubjectImpl(state: CoherenceState, subjectId: string): CoherenceSubject | undefined {
  const s = state.subjects.get(subjectId);
  if (!s) return undefined;
  return { ...s, samples: [...s.samples] };
}

function getLevelImpl(state: CoherenceState, subjectId: string): CoherenceLevel | undefined {
  const s = state.subjects.get(subjectId);
  if (!s) return undefined;
  const last = s.samples[s.samples.length - 1];
  return last?.level ?? 'nominal';
}

function getLatestValueImpl(state: CoherenceState, subjectId: string): number | undefined {
  const s = state.subjects.get(subjectId);
  if (!s) return undefined;
  const last = s.samples[s.samples.length - 1];
  return last?.value;
}

function listByLevelImpl(state: CoherenceState, level: CoherenceLevel): CoherenceSubject[] {
  const result: CoherenceSubject[] = [];
  for (const s of state.subjects.values()) {
    const last = s.samples[s.samples.length - 1];
    const current = last?.level ?? 'nominal';
    if (current === level) {
      result.push({ ...s, samples: [...s.samples] });
    }
  }
  return result;
}

function countByLevel(state: CoherenceState): Record<CoherenceLevel, number> {
  const counts: Record<CoherenceLevel, number> = {
    nominal: 0,
    degraded: 0,
    critical: 0,
    failed: 0,
  };
  for (const s of state.subjects.values()) {
    const last = s.samples[s.samples.length - 1];
    const level = last?.level ?? 'nominal';
    counts[level] += 1;
  }
  return counts;
}

function getStatsImpl(state: CoherenceState): CoherenceStats {
  return {
    totalSubjects: state.subjects.size,
    totalSamples: state.totalSamples,
    totalAlerts: state.alerts.length,
    subjectsByLevel: countByLevel(state),
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createCoherenceMonitor(
  deps: CoherenceMonitorDeps,
  config?: Partial<CoherenceConfig>,
): CoherenceMonitor {
  const state: CoherenceState = {
    deps,
    config: { ...DEFAULT_COHERENCE_CONFIG, ...config },
    subjects: new Map(),
    alerts: [],
    totalSamples: 0,
  };
  return {
    register: (p) => registerImpl(state, p),
    unregister: (id) => unregisterImpl(state, id),
    recordSample: (p) => recordSampleImpl(state, p),
    getSubject: (id) => getSubjectImpl(state, id),
    getLevel: (id) => getLevelImpl(state, id),
    getLatestValue: (id) => getLatestValueImpl(state, id),
    listByLevel: (l) => listByLevelImpl(state, l),
    getAlerts: () => [...state.alerts],
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createCoherenceMonitor, DEFAULT_COHERENCE_CONFIG };
export type {
  CoherenceMonitor,
  CoherenceMonitorDeps,
  CoherenceConfig,
  CoherenceLevel,
  CoherenceSample,
  CoherenceSubject,
  RegisterSubjectParams,
  RecordSampleParams,
  CoherenceAlert,
  CoherenceStats,
};
