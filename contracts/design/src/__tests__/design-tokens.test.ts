import { describe, it, expect } from 'vitest';
import { COLOURS, TYPOGRAPHY, FONT_WEIGHTS } from '../index.js';

describe('Design token colours', () => {
  it('exports all primary surface colours', () => {
    expect(COLOURS.dawnWhite).toBe('#F8F4EE');
    expect(COLOURS.parchment).toBe('#EDE8DF');
    expect(COLOURS.cream).toBe('#E2D9CA');
  });

  it('exports gold system', () => {
    expect(COLOURS.chronicleGold).toBe('#C49A3C');
    expect(COLOURS.goldBright).toBe('#D4AA4C');
    expect(COLOURS.goldDim).toBe('#9A7A2C');
    expect(COLOURS.goldPale).toBe('#EDD98A');
  });

  it('exports ink system', () => {
    expect(COLOURS.deepInk).toBe('#1A1410');
    expect(COLOURS.inkMid).toBe('#2E2420');
    expect(COLOURS.dim).toBe('#8A7A6A');
    expect(COLOURS.dimLight).toBe('#B0A090');
  });

  it('exports accent colours', () => {
    expect(COLOURS.latticeBlue).toBe('#2A5C8A');
    expect(COLOURS.resonanceTeal).toBe('#1A7A6A');
    expect(COLOURS.surveyCopper).toBe('#A05C28');
    expect(COLOURS.ascendancyRed).toBe('#8A2020');
  });

  it('exports depth accents', () => {
    expect(COLOURS.nightSky).toBe('#0D1525');
    expect(COLOURS.voidDeep).toBe('#060A12');
  });

  it('all hex colours are valid format', () => {
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    const rgbaPattern = /^rgba\(\d+,\d+,\d+,[\d.]+\)$/;
    for (const [, value] of Object.entries(COLOURS)) {
      expect(
        hexPattern.test(value) || rgbaPattern.test(value),
        `Invalid colour format: ${value}`,
      ).toBe(true);
    }
  });
});

describe('Design token typography', () => {
  it('exports four font families', () => {
    expect(TYPOGRAPHY.display).toContain('Playfair Display');
    expect(TYPOGRAPHY.body).toContain('Lora');
    expect(TYPOGRAPHY.accent).toContain('Cinzel');
    expect(TYPOGRAPHY.mono).toContain('JetBrains Mono');
  });

  it('all fonts have serif or monospace fallback', () => {
    expect(TYPOGRAPHY.display).toContain('serif');
    expect(TYPOGRAPHY.body).toContain('serif');
    expect(TYPOGRAPHY.accent).toContain('serif');
    expect(TYPOGRAPHY.mono).toContain('monospace');
  });
});

describe('Design token font weights', () => {
  it('defines weights for all font families', () => {
    expect(FONT_WEIGHTS.display.regular.length).toBeGreaterThan(0);
    expect(FONT_WEIGHTS.body.regular.length).toBeGreaterThan(0);
    expect(FONT_WEIGHTS.accent.regular.length).toBeGreaterThan(0);
    expect(FONT_WEIGHTS.mono.regular.length).toBeGreaterThan(0);
  });

  it('display includes 900 weight for bold headlines', () => {
    expect(FONT_WEIGHTS.display.regular).toContain(900);
  });
});
