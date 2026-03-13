import { describe, it, expect } from 'vitest';
import {
  createEntryTypes,
  TOTAL_ENTRY_TYPE_DEFINITIONS,
  SPARK_GAIN_ENTRY_MIN,
  SPARK_GAIN_ENTRY_MAX,
} from '../entry-types.js';

describe('entry-types simulation', () => {
  function makeEt() {
    return createEntryTypes();
  }

  // ── constants ─────────────────────────────────────────────────────

  it('exports TOTAL_ENTRY_TYPE_DEFINITIONS = 3', () => {
    expect(TOTAL_ENTRY_TYPE_DEFINITIONS).toBe(3);
  });

  it('exports SPARK_GAIN_ENTRY_MIN = 5', () => {
    expect(SPARK_GAIN_ENTRY_MIN).toBe(5);
  });

  it('exports SPARK_GAIN_ENTRY_MAX = 15', () => {
    expect(SPARK_GAIN_ENTRY_MAX).toBe(15);
  });

  // ── data coverage ─────────────────────────────────────────────────

  it('getAllEntries returns 9 sample entries', () => {
    const et = makeEt();
    expect(et.getAllEntries().length).toBe(9);
  });

  it('includes the three required entry types', () => {
    const et = makeEt();
    const types = new Set(et.getAllEntries().map((e) => e.type));
    expect(types.has('unsolved_mystery')).toBe(true);
    expect(types.has('living_experiment')).toBe(true);
    expect(types.has('thought_experiment')).toBe(true);
  });

  // ── getEntryById ──────────────────────────────────────────────────

  it('getEntryById returns the correct entry', () => {
    const et = makeEt();
    const all = et.getAllEntries();
    const target = all[0];
    expect(et.getEntryById(target.entryId)).toStrictEqual(target);
  });

  it('getEntryById returns undefined for an unknown id', () => {
    const et = makeEt();
    expect(et.getEntryById('__no-entry__')).toBeUndefined();
  });

  // ── getEntriesByType ──────────────────────────────────────────────

  it('getEntriesByType returns only entries of the requested type', () => {
    const et = makeEt();
    const mysteries = et.getEntriesByType('unsolved_mystery');
    expect(mysteries.length).toBeGreaterThan(0);
    expect(mysteries.every((e) => e.type === 'unsolved_mystery')).toBe(true);
  });

  it('getEntriesByType returns entries for all three types', () => {
    const et = makeEt();
    expect(et.getEntriesByType('unsolved_mystery').length).toBeGreaterThan(0);
    expect(et.getEntriesByType('living_experiment').length).toBeGreaterThan(0);
    expect(et.getEntriesByType('thought_experiment').length).toBeGreaterThan(0);
  });

  // ── getEntriesByWorld ─────────────────────────────────────────────

  it('getEntriesByWorld returns entries belonging to a given world', () => {
    const et = makeEt();
    const all = et.getAllEntries();
    const firstWorldId = all[0].worldIds[0];
    const entries = et.getEntriesByWorld(firstWorldId);
    expect(entries.length).toBeGreaterThan(0);
  });

  // ── getWorldAssignments ───────────────────────────────────────────

  it('getWorldAssignments returns an array of world-entry mappings', () => {
    const et = makeEt();
    const assignments = et.getWorldAssignments();
    expect(Array.isArray(assignments)).toBe(true);
    expect(assignments.length).toBeGreaterThan(0);
  });

  // ── isPrimaryWorld ────────────────────────────────────────────────

  it('isPrimaryWorld returns a boolean', () => {
    const et = makeEt();
    const worldAssignments = et.getWorldAssignments();
    const entry = worldAssignments[0];
    const result = et.isPrimaryWorld(entry.entryType, entry.worldId);
    expect(typeof result).toBe('boolean');
  });
});
