import { describe, expect, it } from 'vitest';
import { MarkError, createMarksRegistry } from '../marks-registry.js';

describe('marks-registry simulation', () => {
  const make = () => {
    let id = 0;
    return createMarksRegistry({
      idGenerator: { next: () => `mark-${++id}` },
      clock: { nowMicroseconds: () => 1_000_000 + id * 1_000_000 },
    });
  };

  it('simulates multi-dynasty mark progression and indexed queries', () => {
    const reg = make();

    reg.award({ markType: 'FOUNDING', dynastyId: 'd1', chronicleEntryRef: 'c1' });
    reg.award({ markType: 'SURVEY', dynastyId: 'd1', chronicleEntryRef: 'c2', worldId: 'earth' });
    reg.award({ markType: 'WORLD', dynastyId: 'd2', chronicleEntryRef: 'c3', worldId: 'mars' });
    reg.award({ markType: 'DEFENCE', dynastyId: 'd2', chronicleEntryRef: 'c4' });

    expect(reg.totalAwarded()).toBe(4);
    expect(reg.totalAwardedByType('SURVEY')).toBe(1);
    expect(reg.getByDynasty('d1')).toHaveLength(2);
    expect(reg.countByDynastyAndType('d2', 'WORLD')).toBe(1);
    expect(reg.getWorldMark('mars')?.dynastyId).toBe('d2');
  });

  it('simulates hard constraints for world uniqueness, chronicle uniqueness, and first-contact cap', () => {
    const reg = make();

    reg.award({ markType: 'WORLD', dynastyId: 'd1', chronicleEntryRef: 'w1', worldId: 'earth' });
    expect(() =>
      reg.award({ markType: 'WORLD', dynastyId: 'd2', chronicleEntryRef: 'w2', worldId: 'earth' }),
    ).toThrow('WORLD mark already exists');

    reg.award({ markType: 'SURVEY', dynastyId: 'd9', chronicleEntryRef: 'dup-ref' });
    expect(() =>
      reg.award({ markType: 'FOUNDING', dynastyId: 'd8', chronicleEntryRef: 'dup-ref' }),
    ).toThrow('Chronicle ref already used');

    reg.award({ markType: 'FIRST_CONTACT', dynastyId: 'a', chronicleEntryRef: 'fc-1' });
    reg.award({ markType: 'FIRST_CONTACT', dynastyId: 'b', chronicleEntryRef: 'fc-2' });
    reg.award({ markType: 'FIRST_CONTACT', dynastyId: 'c', chronicleEntryRef: 'fc-3' });

    let caught: unknown;
    try {
      reg.award({ markType: 'FIRST_CONTACT', dynastyId: 'd', chronicleEntryRef: 'fc-4' });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(MarkError);
    expect((caught as MarkError).code).toBe('SUPPLY_CAP_REACHED');
  });
});
