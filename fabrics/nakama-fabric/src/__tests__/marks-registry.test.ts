import { describe, it, expect } from 'vitest';
import { createMarksRegistry, MARK_SUPPLY_CAPS, MarkError } from '../marks-registry.js';
import type { MarkType, MarksRegistry } from '../marks-registry.js';

let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return 'mark-' + String(idCounter);
}

function createTestRegistry(): MarksRegistry {
  idCounter = 0;
  return createMarksRegistry({
    idGenerator: { next: nextId },
    clock: { nowMicroseconds: () => 1_000_000 },
  });
}

// ─── Award Basics ──────────────────────────────────────────────────

describe('MARKS award basics', () => {
  it('awards a FOUNDING mark', () => {
    const reg = createTestRegistry();
    const mark = reg.award({
      markType: 'FOUNDING',
      dynastyId: 'dyn-1',
      chronicleEntryRef: 'hash-1',
    });
    expect(mark.markId).toBe('mark-1');
    expect(mark.markType).toBe('FOUNDING');
    expect(mark.dynastyId).toBe('dyn-1');
    expect(mark.chronicleEntryRef).toBe('hash-1');
    expect(mark.worldId).toBeNull();
    expect(mark.awardedAtUs).toBe(1_000_000);
  });

  it('awards a SURVEY mark with worldId', () => {
    const reg = createTestRegistry();
    const mark = reg.award({
      markType: 'SURVEY',
      dynastyId: 'dyn-1',
      chronicleEntryRef: 'hash-1',
      worldId: 'earth',
    });
    expect(mark.worldId).toBe('earth');
  });

  it('awards multiple SURVEY marks to same dynasty', () => {
    const reg = createTestRegistry();
    reg.award({ markType: 'SURVEY', dynastyId: 'dyn-1', chronicleEntryRef: 'h1', worldId: 'w1' });
    reg.award({ markType: 'SURVEY', dynastyId: 'dyn-1', chronicleEntryRef: 'h2', worldId: 'w2' });
    expect(reg.countByDynasty('dyn-1')).toBe(2);
  });
});

// ─── Supply Caps ───────────────────────────────────────────────────

describe('MARKS supply caps', () => {
  it('FOUNDING cap is 500', () => {
    expect(MARK_SUPPLY_CAPS.FOUNDING).toBe(500);
  });

  it('FIRST_CONTACT cap is 3', () => {
    expect(MARK_SUPPLY_CAPS.FIRST_CONTACT).toBe(3);
  });

  it('rejects FIRST_CONTACT beyond cap', () => {
    const reg = createTestRegistry();
    reg.award({ markType: 'FIRST_CONTACT', dynastyId: 'd1', chronicleEntryRef: 'h1' });
    reg.award({ markType: 'FIRST_CONTACT', dynastyId: 'd2', chronicleEntryRef: 'h2' });
    reg.award({ markType: 'FIRST_CONTACT', dynastyId: 'd3', chronicleEntryRef: 'h3' });
    expect(() =>
      reg.award({
        markType: 'FIRST_CONTACT',
        dynastyId: 'd4',
        chronicleEntryRef: 'h4',
      }),
    ).toThrow('Supply cap reached');
  });

  it('error is MarkError with correct code', () => {
    const reg = createTestRegistry();
    for (let i = 0; i < 3; i++) {
      reg.award({
        markType: 'FIRST_CONTACT',
        dynastyId: 'd' + String(i),
        chronicleEntryRef: 'h' + String(i),
      });
    }
    try {
      reg.award({ markType: 'FIRST_CONTACT', dynastyId: 'd4', chronicleEntryRef: 'h4' });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(MarkError);
      expect((err as MarkError).code).toBe('SUPPLY_CAP_REACHED');
    }
  });

  it('SURVEY has no hard cap', () => {
    expect(MARK_SUPPLY_CAPS.SURVEY).toBeNull();
  });
});

// ─── WORLD Mark Uniqueness ─────────────────────────────────────────

describe('MARKS WORLD uniqueness', () => {
  it('allows one WORLD mark per world', () => {
    const reg = createTestRegistry();
    const mark = reg.award({
      markType: 'WORLD',
      dynastyId: 'dyn-1',
      chronicleEntryRef: 'h1',
      worldId: 'earth',
    });
    expect(mark.markType).toBe('WORLD');
  });

  it('rejects duplicate WORLD mark for same world', () => {
    const reg = createTestRegistry();
    reg.award({ markType: 'WORLD', dynastyId: 'd1', chronicleEntryRef: 'h1', worldId: 'earth' });
    expect(() =>
      reg.award({
        markType: 'WORLD',
        dynastyId: 'd2',
        chronicleEntryRef: 'h2',
        worldId: 'earth',
      }),
    ).toThrow('WORLD mark already exists');
  });

  it('allows WORLD marks for different worlds', () => {
    const reg = createTestRegistry();
    reg.award({ markType: 'WORLD', dynastyId: 'd1', chronicleEntryRef: 'h1', worldId: 'earth' });
    reg.award({ markType: 'WORLD', dynastyId: 'd2', chronicleEntryRef: 'h2', worldId: 'mars' });
    expect(reg.totalAwardedByType('WORLD')).toBe(2);
  });

  it('getWorldMark returns the mark for a world', () => {
    const reg = createTestRegistry();
    reg.award({ markType: 'WORLD', dynastyId: 'd1', chronicleEntryRef: 'h1', worldId: 'earth' });
    const mark = reg.getWorldMark('earth');
    expect(mark).not.toBeNull();
    expect(mark?.dynastyId).toBe('d1');
  });

  it('getWorldMark returns null for unmarked world', () => {
    const reg = createTestRegistry();
    expect(reg.getWorldMark('venus')).toBeNull();
  });
});

// ─── Chronicle Ref Uniqueness ──────────────────────────────────────

describe('MARKS chronicle ref uniqueness', () => {
  it('rejects duplicate chronicle reference', () => {
    const reg = createTestRegistry();
    reg.award({ markType: 'SURVEY', dynastyId: 'd1', chronicleEntryRef: 'same-hash' });
    expect(() =>
      reg.award({
        markType: 'FOUNDING',
        dynastyId: 'd2',
        chronicleEntryRef: 'same-hash',
      }),
    ).toThrow('Chronicle ref already used');
  });
});

// ─── Queries ───────────────────────────────────────────────────────

describe('MARKS queries', () => {
  it('getByDynasty returns all marks for a dynasty', () => {
    const reg = createTestRegistry();
    reg.award({ markType: 'FOUNDING', dynastyId: 'd1', chronicleEntryRef: 'h1' });
    reg.award({ markType: 'SURVEY', dynastyId: 'd1', chronicleEntryRef: 'h2', worldId: 'w1' });
    reg.award({ markType: 'SURVEY', dynastyId: 'd2', chronicleEntryRef: 'h3', worldId: 'w2' });
    expect(reg.getByDynasty('d1')).toHaveLength(2);
    expect(reg.getByDynasty('d2')).toHaveLength(1);
  });

  it('getByDynasty returns empty for unknown dynasty', () => {
    const reg = createTestRegistry();
    expect(reg.getByDynasty('unknown')).toHaveLength(0);
  });

  it('getByType returns all marks of a type', () => {
    const reg = createTestRegistry();
    reg.award({ markType: 'SURVEY', dynastyId: 'd1', chronicleEntryRef: 'h1' });
    reg.award({ markType: 'SURVEY', dynastyId: 'd2', chronicleEntryRef: 'h2' });
    reg.award({ markType: 'FOUNDING', dynastyId: 'd3', chronicleEntryRef: 'h3' });
    expect(reg.getByType('SURVEY')).toHaveLength(2);
    expect(reg.getByType('FOUNDING')).toHaveLength(1);
  });

  it('countByDynastyAndType filters correctly', () => {
    const reg = createTestRegistry();
    reg.award({ markType: 'SURVEY', dynastyId: 'd1', chronicleEntryRef: 'h1' });
    reg.award({ markType: 'SURVEY', dynastyId: 'd1', chronicleEntryRef: 'h2' });
    reg.award({ markType: 'FOUNDING', dynastyId: 'd1', chronicleEntryRef: 'h3' });
    expect(reg.countByDynastyAndType('d1', 'SURVEY')).toBe(2);
    expect(reg.countByDynastyAndType('d1', 'FOUNDING')).toBe(1);
    expect(reg.countByDynastyAndType('d1', 'DEFENCE')).toBe(0);
  });

  it('totalAwarded counts all marks', () => {
    const reg = createTestRegistry();
    expect(reg.totalAwarded()).toBe(0);
    reg.award({ markType: 'FOUNDING', dynastyId: 'd1', chronicleEntryRef: 'h1' });
    reg.award({ markType: 'SURVEY', dynastyId: 'd2', chronicleEntryRef: 'h2' });
    expect(reg.totalAwarded()).toBe(2);
  });

  it('totalAwardedByType counts specific type', () => {
    const reg = createTestRegistry();
    reg.award({ markType: 'SURVEY', dynastyId: 'd1', chronicleEntryRef: 'h1' });
    reg.award({ markType: 'SURVEY', dynastyId: 'd2', chronicleEntryRef: 'h2' });
    expect(reg.totalAwardedByType('SURVEY')).toBe(2);
    expect(reg.totalAwardedByType('FOUNDING')).toBe(0);
  });
});

// ─── All Mark Types ────────────────────────────────────────────────

describe('MARKS all types awardable', () => {
  const markTypes: ReadonlyArray<MarkType> = [
    'FOUNDING',
    'SURVEY',
    'WORLD',
    'DEFENCE',
    'SURVIVOR',
    'FIRST_CONTACT',
  ];

  it('can award each mark type', () => {
    const reg = createTestRegistry();
    for (const [i, markType] of markTypes.entries()) {
      const idx = String(i);
      const mark = reg.award({
        markType,
        dynastyId: 'd' + idx,
        chronicleEntryRef: 'h' + idx,
        worldId: markType === 'WORLD' ? 'world-' + idx : undefined,
      });
      expect(mark.markType).toBe(markType);
    }
    expect(reg.totalAwarded()).toBe(markTypes.length);
  });
});
