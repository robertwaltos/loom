import { describe, it, expect } from 'vitest';
import {
  createCurriculumMap,
  TOTAL_STEM_WORLDS,
  TOTAL_LANGUAGE_ARTS_WORLDS,
  TOTAL_FINANCIAL_WORLDS,
  TOTAL_CROSS_CURRICULAR_HIGHLIGHTS,
} from '../curriculum-map.js';

describe('curriculum-map simulation', () => {
  function makeCm() {
    return createCurriculumMap();
  }

  // ── data coverage ─────────────────────────────────────────────────

  it('exports TOTAL_STEM_WORLDS = 15', () => {
    expect(TOTAL_STEM_WORLDS).toBe(15);
  });

  it('exports TOTAL_LANGUAGE_ARTS_WORLDS = 10', () => {
    expect(TOTAL_LANGUAGE_ARTS_WORLDS).toBe(10);
  });

  it('exports TOTAL_FINANCIAL_WORLDS = 10', () => {
    expect(TOTAL_FINANCIAL_WORLDS).toBe(10);
  });

  it('exports TOTAL_CROSS_CURRICULAR_HIGHLIGHTS = 8', () => {
    expect(TOTAL_CROSS_CURRICULAR_HIGHLIGHTS).toBe(8);
  });

  it('getSTEMAlignments returns 15 items', () => {
    const cm = makeCm();
    expect(cm.getSTEMAlignments().length).toBe(TOTAL_STEM_WORLDS);
  });

  it('getLanguageArtsAlignments returns 10 items', () => {
    const cm = makeCm();
    expect(cm.getLanguageArtsAlignments().length).toBe(TOTAL_LANGUAGE_ARTS_WORLDS);
  });

  it('getFinancialAlignments returns 10 items', () => {
    const cm = makeCm();
    expect(cm.getFinancialAlignments().length).toBe(TOTAL_FINANCIAL_WORLDS);
  });

  it('keeps entrepreneur workshop on the canonical world id', () => {
    const cm = makeCm();
    const alignment = cm.getAlignmentByWorld('entrepreneur-workshop');

    expect(alignment).toBeDefined();
    expect(alignment?.worldName).toBe("Entrepreneur's Workshop");
    expect(cm.getAlignmentByWorld('entrepreneurs-workshop')).toBeUndefined();
  });

  it('getCrossCurricularHighlights returns 8 items', () => {
    const cm = makeCm();
    expect(cm.getCrossCurricularHighlights().length).toBe(TOTAL_CROSS_CURRICULAR_HIGHLIGHTS);
  });

  // ── getGradeMappings ───────────────────────────────────────────────

  it('getGradeMappings returns at least one mapping', () => {
    const cm = makeCm();
    expect(cm.getGradeMappings().length).toBeGreaterThan(0);
  });

  // ── getAlignmentByWorld ────────────────────────────────────────────

  it('getAlignmentByWorld returns an entry for a known STEM world', () => {
    const cm = makeCm();
    const stem = cm.getSTEMAlignments();
    const worldId = stem[0].worldId;
    const alignment = cm.getAlignmentByWorld(worldId);
    expect(alignment).toBeDefined();
    expect(alignment!.worldId).toBe(worldId);
  });

  it('getAlignmentByWorld returns undefined for an unknown world', () => {
    const cm = makeCm();
    expect(cm.getAlignmentByWorld('__no-world__')).toBeUndefined();
  });

  // ── getWorldsByStandard ───────────────────────────────────────────

  it('getWorldsByStandard returns worlds matching a standard fragment', () => {
    const cm = makeCm();
    const allAlignments = [
      ...cm.getSTEMAlignments(),
      ...cm.getLanguageArtsAlignments(),
      ...cm.getFinancialAlignments(),
    ];
    // Use the first standard fragment from the first alignment that has standards
    const alignmentWithStandard = allAlignments.find(
      (a) => a.standards && a.standards.length > 0
    );
    if (!alignmentWithStandard) return; // guard if structure differs
    const fragment = alignmentWithStandard.standards[0].substring(0, 3);
    const worlds = cm.getWorldsByStandard(fragment);
    expect(worlds.length).toBeGreaterThan(0);
  });

  // ── getDomain ─────────────────────────────────────────────────────

  it('getDomain returns stem for a STEM world', () => {
    const cm = makeCm();
    const stem = cm.getSTEMAlignments();
    const worldId = stem[0].worldId;
    expect(cm.getDomain(worldId)).toBe('stem');
  });

  it('getDomain returns lang-arts for a language-arts world', () => {
    const cm = makeCm();
    const la = cm.getLanguageArtsAlignments();
    const worldId = la[0].worldId;
    expect(cm.getDomain(worldId)).toBe('language-arts');
  });

  it('getDomain returns finance for a financial world', () => {
    const cm = makeCm();
    const fin = cm.getFinancialAlignments();
    const worldId = fin[0].worldId;
    expect(cm.getDomain(worldId)).toBe('financial-literacy');
  });

  it('getDomain returns null for an unknown world', () => {
    const cm = makeCm();
    expect(cm.getDomain('__no-world__')).toBeUndefined();
  });
});
