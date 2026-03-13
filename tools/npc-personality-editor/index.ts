/**
 * npc-personality-editor/index.ts — GUI state manager for configuring
 * NPC archetypes and personality parameters.
 *
 * NEXT-STEPS Phase 16.4: "NPC personality editor: GUI for configuring
 * NPC archetypes and behaviors."
 *
 * Implements a diff/preview/validate/commit workflow:
 *   1. `startSession`  — opens an editing session for an archetype
 *   2. `setTraits` / `setAggression` / `setLoyalty` / `setDialogueBias`
 *      — mutate the draft config (marks session as dirty)
 *   3. `validate`      — returns array of validation errors (empty = OK)
 *   4. `preview`       — generates a PersonalityPreview for the UI
 *   5. `commit`        — finalises config if validation passes
 *   6. `reset`         — reverts draft to committed baseline
 *   7. `exportConfig`  — serialize committed config to tagged result
 *
 * Thread: cotton/tools/npc-personality-editor
 * Tier: 1
 */

// ── Ports ────────────────────────────────────────────────────────────

export interface PersonalityClockPort {
  readonly nowMs: () => number;
}

export interface PersonalityIdPort {
  readonly next: () => string;
}

export interface PersonalityLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
}

// ── Types ────────────────────────────────────────────────────────────

export type NpcArchetype =
  | 'merchant'
  | 'scholar'
  | 'warrior'
  | 'noble'
  | 'mystic'
  | 'artisan'
  | 'outlaw'
  | 'elder';

export type PersonalityTrait =
  | 'brave'
  | 'cowardly'
  | 'generous'
  | 'greedy'
  | 'loyal'
  | 'treacherous'
  | 'wise'
  | 'foolish'
  | 'aggressive'
  | 'peaceful';

export type PersonalityEditorError =
  | 'session-not-found'
  | 'validation-failed'
  | 'nothing-to-reset'
  | 'session-closed';

export interface PersonalityConfig {
  readonly archetype: NpcArchetype;
  readonly traits: readonly PersonalityTrait[];
  readonly dialogueBias: string;
  readonly aggressionLevel: number;
  readonly loyaltyBase: number;
}

export interface PersonalityPreview {
  readonly config: PersonalityConfig;
  readonly behaviorFlags: Readonly<Record<string, boolean>>;
  readonly sampleDialogueTags: readonly string[];
}

export interface EditSession {
  readonly sessionId: string;
  readonly archetype: NpcArchetype;
  readonly draft: PersonalityConfig;
  readonly baseline: PersonalityConfig;
  readonly isDirty: boolean;
  readonly validationErrors: readonly string[];
  readonly createdAt: number;
  readonly lastModifiedAt: number;
}

export interface PersonalityEditorStats {
  readonly totalSessions: number;
  readonly activeSessions: number;
  readonly committedSessions: number;
}

export type ConfigExport =
  | { readonly ok: true; readonly json: string }
  | { readonly ok: false; readonly error: PersonalityEditorError };

export interface NpcPersonalityEditor {
  readonly startSession: (archetype: NpcArchetype, base?: Partial<PersonalityConfig>) => EditSession;
  readonly closeSession: (sessionId: string) => boolean;
  readonly setTraits: (sessionId: string, traits: readonly PersonalityTrait[]) => EditSession | PersonalityEditorError;
  readonly setAggression: (sessionId: string, level: number) => EditSession | PersonalityEditorError;
  readonly setLoyalty: (sessionId: string, level: number) => EditSession | PersonalityEditorError;
  readonly setDialogueBias: (sessionId: string, bias: string) => EditSession | PersonalityEditorError;
  readonly validate: (sessionId: string) => string[];
  readonly preview: (sessionId: string) => PersonalityPreview | PersonalityEditorError;
  readonly commit: (sessionId: string) => PersonalityConfig | PersonalityEditorError;
  readonly reset: (sessionId: string) => EditSession | PersonalityEditorError;
  readonly exportConfig: (sessionId: string) => ConfigExport;
  readonly getSession: (sessionId: string) => EditSession | undefined;
  readonly getStats: () => PersonalityEditorStats;
}

export type PersonalityEditorDeps = {
  readonly clock: PersonalityClockPort;
  readonly id: PersonalityIdPort;
  readonly log: PersonalityLogPort;
};

// ── Defaults ──────────────────────────────────────────────────────────

const ARCHETYPE_DEFAULTS: Record<NpcArchetype, Partial<PersonalityConfig>> = {
  merchant: { aggressionLevel: 0.1, loyaltyBase: 0.5, dialogueBias: 'commerce' },
  scholar: { aggressionLevel: 0.05, loyaltyBase: 0.7, dialogueBias: 'knowledge' },
  warrior: { aggressionLevel: 0.8, loyaltyBase: 0.6, dialogueBias: 'combat' },
  noble: { aggressionLevel: 0.3, loyaltyBase: 0.4, dialogueBias: 'politics' },
  mystic: { aggressionLevel: 0.2, loyaltyBase: 0.5, dialogueBias: 'mysticism' },
  artisan: { aggressionLevel: 0.1, loyaltyBase: 0.8, dialogueBias: 'craft' },
  outlaw: { aggressionLevel: 0.7, loyaltyBase: 0.3, dialogueBias: 'survival' },
  elder: { aggressionLevel: 0.05, loyaltyBase: 0.9, dialogueBias: 'wisdom' },
};

function defaultConfig(archetype: NpcArchetype, overrides?: Partial<PersonalityConfig>): PersonalityConfig {
  const defaults = ARCHETYPE_DEFAULTS[archetype];
  return Object.freeze({
    archetype,
    traits: [],
    dialogueBias: defaults.dialogueBias ?? 'neutral',
    aggressionLevel: defaults.aggressionLevel ?? 0.5,
    loyaltyBase: defaults.loyaltyBase ?? 0.5,
    ...overrides,
  });
}

// ── Internal state ────────────────────────────────────────────────────

type MutableSession = {
  sessionId: string;
  archetype: NpcArchetype;
  draft: PersonalityConfig;
  baseline: PersonalityConfig;
  isDirty: boolean;
  validationErrors: string[];
  committed: boolean;
  closed: boolean;
  createdAt: number;
  lastModifiedAt: number;
};

type EditorStore = {
  sessions: Map<string, MutableSession>;
  totalSessions: number;
  committedSessions: number;
};

// ── Helpers ───────────────────────────────────────────────────────────

function snapshotSession(s: MutableSession): EditSession {
  return Object.freeze({
    sessionId: s.sessionId,
    archetype: s.archetype,
    draft: s.draft,
    baseline: s.baseline,
    isDirty: s.isDirty,
    validationErrors: s.validationErrors,
    createdAt: s.createdAt,
    lastModifiedAt: s.lastModifiedAt,
  });
}

function validateConfig(config: PersonalityConfig): string[] {
  const errors: string[] = [];
  if (config.aggressionLevel < 0 || config.aggressionLevel > 1) {
    errors.push('aggressionLevel must be between 0 and 1');
  }
  if (config.loyaltyBase < 0 || config.loyaltyBase > 1) {
    errors.push('loyaltyBase must be between 0 and 1');
  }
  if (config.traits.includes('brave') && config.traits.includes('cowardly')) {
    errors.push('traits brave and cowardly are mutually exclusive');
  }
  if (config.traits.includes('loyal') && config.traits.includes('treacherous')) {
    errors.push('traits loyal and treacherous are mutually exclusive');
  }
  if (config.dialogueBias.trim().length === 0) {
    errors.push('dialogueBias must not be empty');
  }
  return errors;
}

function buildBehaviorFlags(config: PersonalityConfig): Record<string, boolean> {
  return {
    isAggressive: config.aggressionLevel > 0.6,
    isPassive: config.aggressionLevel < 0.2,
    isHighlyLoyal: config.loyaltyBase > 0.7,
    hasWisdomTrait: config.traits.includes('wise'),
    willFlee: config.traits.includes('cowardly') && config.aggressionLevel < 0.3,
    willBarter: config.archetype === 'merchant' || config.traits.includes('generous'),
  };
}

function patchDraft(
  store: EditorStore,
  sessionId: string,
  patch: Partial<PersonalityConfig>,
  nowMs: number,
): EditSession | PersonalityEditorError {
  const s = store.sessions.get(sessionId);
  if (s === undefined) return 'session-not-found';
  if (s.closed) return 'session-closed';
  s.draft = Object.freeze({ ...s.draft, ...patch });
  s.isDirty = true;
  s.lastModifiedAt = nowMs;
  return snapshotSession(s);
}

function getOpen(store: EditorStore, sessionId: string): MutableSession | PersonalityEditorError {
  const s = store.sessions.get(sessionId);
  if (s === undefined) return 'session-not-found';
  return s.closed ? 'session-closed' : s;
}

// ── Builder functions ─────────────────────────────────────────────────

function makeStartSession(store: EditorStore, deps: PersonalityEditorDeps) {
  return function startSession(archetype: NpcArchetype, base?: Partial<PersonalityConfig>): EditSession {
    const config = defaultConfig(archetype, base);
    const s: MutableSession = {
      sessionId: deps.id.next(), archetype, draft: config, baseline: config,
      isDirty: false, validationErrors: [], committed: false, closed: false,
      createdAt: deps.clock.nowMs(), lastModifiedAt: deps.clock.nowMs(),
    };
    store.sessions.set(s.sessionId, s);
    store.totalSessions++;
    return snapshotSession(s);
  };
}

function makePreview(store: EditorStore) {
  return function preview(sessionId: string): PersonalityPreview | PersonalityEditorError {
    const s = getOpen(store, sessionId);
    if (typeof s === 'string') return s;
    return Object.freeze({
      config: s.draft,
      behaviorFlags: Object.freeze(buildBehaviorFlags(s.draft)),
      sampleDialogueTags: Object.freeze([s.draft.dialogueBias, s.draft.archetype]),
    });
  };
}

function makeCommit(store: EditorStore, deps: PersonalityEditorDeps) {
  return function commit(sessionId: string): PersonalityConfig | PersonalityEditorError {
    const s = getOpen(store, sessionId);
    if (typeof s === 'string') return s;
    const errors = validateConfig(s.draft);
    if (errors.length > 0) { s.validationErrors = errors; return 'validation-failed'; }
    s.baseline = s.draft;
    s.isDirty = false;
    s.committed = true;
    store.committedSessions++;
    deps.log.info('personality-committed', { sessionId, archetype: s.archetype });
    return s.baseline;
  };
}

function makeReset(store: EditorStore, deps: PersonalityEditorDeps) {
  return function reset(sessionId: string): EditSession | PersonalityEditorError {
    const s = getOpen(store, sessionId);
    if (typeof s === 'string') return s;
    if (!s.isDirty) return 'nothing-to-reset';
    s.draft = s.baseline;
    s.isDirty = false;
    s.lastModifiedAt = deps.clock.nowMs();
    return snapshotSession(s);
  };
}

function makeExportConfig(store: EditorStore) {
  return function exportConfig(sessionId: string): ConfigExport {
    const s = getOpen(store, sessionId);
    if (typeof s === 'string') return { ok: false, error: s };
    return { ok: true, json: JSON.stringify(s.baseline) };
  };
}

function makeGetStats(store: EditorStore) {
  return function getStats(): PersonalityEditorStats {
    return Object.freeze({
      totalSessions: store.totalSessions,
      activeSessions: Array.from(store.sessions.values()).filter((s) => !s.closed).length,
      committedSessions: store.committedSessions,
    });
  };
}

// ── Factory ───────────────────────────────────────────────────────────

export function createNpcPersonalityEditor(deps: PersonalityEditorDeps): NpcPersonalityEditor {
  const store: EditorStore = { sessions: new Map(), totalSessions: 0, committedSessions: 0 };
  const now = () => deps.clock.nowMs();
  return {
    startSession: makeStartSession(store, deps),
    closeSession(sessionId) {
      const s = store.sessions.get(sessionId);
      if (s === undefined) return false;
      s.closed = true;
      return true;
    },
    setTraits: (id, traits) => patchDraft(store, id, { traits }, now()),
    setAggression: (id, level) => patchDraft(store, id, { aggressionLevel: level }, now()),
    setLoyalty: (id, level) => patchDraft(store, id, { loyaltyBase: level }, now()),
    setDialogueBias: (id, bias) => patchDraft(store, id, { dialogueBias: bias }, now()),
    validate(sessionId) {
      const s = store.sessions.get(sessionId);
      if (s === undefined) return ['session-not-found'];
      const errors = validateConfig(s.draft);
      s.validationErrors = errors;
      return errors;
    },
    preview: makePreview(store),
    commit: makeCommit(store, deps),
    reset: makeReset(store, deps),
    exportConfig: makeExportConfig(store),
    getSession: (id) => { const s = store.sessions.get(id); return s === undefined ? undefined : snapshotSession(s); },
    getStats: makeGetStats(store),
  };
}
