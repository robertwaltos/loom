import { describe, it, expect, vi } from 'vitest';
import {
  createNpcPersonalityEditor,
  type NpcPersonalityEditor,
  type PersonalityEditorDeps,
  type NpcArchetype,
  type PersonalityTrait,
} from '../index.js';

// ── Test doubles ──────────────────────────────────────────────────────

let counter = 0;
function makeDeps(): PersonalityEditorDeps {
  return {
    clock: { nowMs: () => 1_000_000 + counter * 100 },
    id: { next: () => 'sess-' + String(++counter) },
    log: { info: vi.fn(), warn: vi.fn() },
  };
}

function makeEditor(): NpcPersonalityEditor {
  counter = 0;
  return createNpcPersonalityEditor(makeDeps());
}

// ── startSession ──────────────────────────────────────────────────────

describe('startSession', () => {
  it('returns a session snapshot with correct archetype', () => {
    const ed = makeEditor();
    const s = ed.startSession('merchant');
    expect(s.archetype).toBe('merchant');
  });

  it('increments totalSessions stat', () => {
    const ed = makeEditor();
    ed.startSession('scholar');
    ed.startSession('warrior');
    expect(ed.getStats().totalSessions).toBe(2);
  });

  it('accepts partial base config override', () => {
    const ed = makeEditor();
    const s = ed.startSession('noble', { aggressionLevel: 0.9 });
    expect(s.draft.aggressionLevel).toBe(0.9);
  });
});

// ── closeSession ──────────────────────────────────────────────────────

describe('closeSession', () => {
  it('returns true for existing session', () => {
    const ed = makeEditor();
    const s = ed.startSession('warrior');
    expect(ed.closeSession(s.sessionId)).toBe(true);
  });

  it('returns false for unknown sessionId', () => {
    const ed = makeEditor();
    expect(ed.closeSession('no-such-id')).toBe(false);
  });

  it('rejects operations on closed session', () => {
    const ed = makeEditor();
    const s = ed.startSession('elder');
    ed.closeSession(s.sessionId);
    expect(ed.preview(s.sessionId)).toBe('session-closed');
  });
});

// ── setTraits / setAggression / setLoyalty / setDialogueBias ─────────

describe('draft setters', () => {
  it('setTraits marks session dirty and updates draft', () => {
    const ed = makeEditor();
    const s = ed.startSession('artisan');
    const traits: PersonalityTrait[] = ['loyal', 'wise'];
    const updated = ed.setTraits(s.sessionId, traits);
    if (typeof updated === 'string') throw new Error('Expected EditSession');
    expect(updated.isDirty).toBe(true);
    expect(updated.draft.traits).toEqual(traits);
  });

  it('setAggression updates aggressionLevel', () => {
    const ed = makeEditor();
    const s = ed.startSession('outlaw');
    const result = ed.setAggression(s.sessionId, 0.8);
    if (typeof result === 'string') throw new Error('Expected EditSession');
    expect(result.draft.aggressionLevel).toBe(0.8);
  });

  it('setLoyalty updates loyaltyBase', () => {
    const ed = makeEditor();
    const s = ed.startSession('scholar');
    const result = ed.setLoyalty(s.sessionId, 0.3);
    if (typeof result === 'string') throw new Error('Expected EditSession');
    expect(result.draft.loyaltyBase).toBe(0.3);
  });

  it('setDialogueBias updates dialogueBias', () => {
    const ed = makeEditor();
    const s = ed.startSession('mystic');
    const result = ed.setDialogueBias(s.sessionId, 'cryptic');
    if (typeof result === 'string') throw new Error('Expected EditSession');
    expect(result.draft.dialogueBias).toBe('cryptic');
  });

  it('returns session-not-found for unknown id', () => {
    const ed = makeEditor();
    expect(ed.setTraits('ghost', ['brave'])).toBe('session-not-found');
  });
});

// ── validate ─────────────────────────────────────────────────────────

describe('validate', () => {
  it('returns empty array for valid session', () => {
    const ed = makeEditor();
    const s = ed.startSession('merchant');
    expect(ed.validate(s.sessionId)).toEqual([]);
  });

  it('returns session-not-found sentinel in array for unknown id', () => {
    const ed = makeEditor();
    expect(ed.validate('nope')).toEqual(['session-not-found']);
  });
});

// ── preview ───────────────────────────────────────────────────────────

describe('preview', () => {
  it('returns PersonalityPreview with config and behavior flags', () => {
    const ed = makeEditor();
    const s = ed.startSession('warrior');
    const p = ed.preview(s.sessionId);
    if (typeof p === 'string') throw new Error('Expected preview');
    expect(p.config.archetype).toBe('warrior');
    expect(typeof p.behaviorFlags).toBe('object');
    expect(Array.isArray(p.sampleDialogueTags)).toBe(true);
  });

  it('returns session-not-found for unknown id', () => {
    const ed = makeEditor();
    expect(ed.preview('ghost')).toBe('session-not-found');
  });
});

// ── commit ────────────────────────────────────────────────────────────

describe('commit', () => {
  it('commits valid draft and returns the config', () => {
    const ed = makeEditor();
    const s = ed.startSession('noble');
    const result = ed.commit(s.sessionId);
    if (typeof result === 'string') throw new Error('Expected config');
    expect(result.archetype).toBe('noble');
  });

  it('increments committedSessions stat', () => {
    const ed = makeEditor();
    const s = ed.startSession('elder');
    ed.commit(s.sessionId);
    expect(ed.getStats().committedSessions).toBe(1);
  });

  it('returns session-not-found for unknown id', () => {
    const ed = makeEditor();
    expect(ed.commit('gone')).toBe('session-not-found');
  });
});

// ── reset ─────────────────────────────────────────────────────────────

describe('reset', () => {
  it('reverts dirty draft to baseline', () => {
    const ed = makeEditor();
    const s = ed.startSession('artisan');
    ed.setDialogueBias(s.sessionId, 'grumpy');
    const r = ed.reset(s.sessionId);
    if (typeof r === 'string') throw new Error('Expected EditSession');
    expect(r.isDirty).toBe(false);
    expect(r.draft.dialogueBias).toBe(s.baseline.dialogueBias);
  });

  it('returns nothing-to-reset for clean session', () => {
    const ed = makeEditor();
    const s = ed.startSession('merchant');
    expect(ed.reset(s.sessionId)).toBe('nothing-to-reset');
  });
});

// ── exportConfig ──────────────────────────────────────────────────────

describe('exportConfig', () => {
  it('returns ok:true with JSON for valid session', () => {
    const ed = makeEditor();
    const s = ed.startSession('scholar');
    const result = ed.exportConfig(s.sessionId);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error();
    const parsed = JSON.parse(result.json) as { archetype: NpcArchetype };
    expect(parsed.archetype).toBe('scholar');
  });

  it('returns ok:false for unknown session', () => {
    const ed = makeEditor();
    const result = ed.exportConfig('nope');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error();
    expect(result.error).toBe('session-not-found');
  });
});

// ── getStats ──────────────────────────────────────────────────────────

describe('getStats', () => {
  it('tracks active vs closed sessions', () => {
    const ed = makeEditor();
    const a = ed.startSession('warrior');
    const b = ed.startSession('merchant');
    ed.closeSession(a.sessionId);
    const stats = ed.getStats();
    expect(stats.totalSessions).toBe(2);
    expect(stats.activeSessions).toBe(1);
    expect(stats.committedSessions).toBe(0);
    void b;
  });
});
