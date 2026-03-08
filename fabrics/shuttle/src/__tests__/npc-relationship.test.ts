import { describe, it, expect } from 'vitest';
import { createRelationshipTracker } from '../npc-relationship.js';
import type { RelationshipTrackerDeps, DispositionChange } from '../npc-relationship.js';

function makeDeps(overrides?: Partial<RelationshipTrackerDeps>): RelationshipTrackerDeps {
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    ...overrides,
  };
}

describe('RelationshipTracker — forming relationships', () => {
  it('forms a relationship between two entities', () => {
    const tracker = createRelationshipTracker(makeDeps());
    const rel = tracker.form({
      fromEntityId: 'npc-1',
      toEntityId: 'player-1',
      type: 'ally',
      initialDisposition: 50,
    });
    expect(rel.fromEntityId).toBe('npc-1');
    expect(rel.toEntityId).toBe('player-1');
    expect(rel.type).toBe('ally');
    expect(rel.disposition).toBe(50);
  });

  it('returns existing relationship on duplicate form', () => {
    const tracker = createRelationshipTracker(makeDeps());
    tracker.form({ fromEntityId: 'a', toEntityId: 'b', type: 'ally', initialDisposition: 30 });
    const dup = tracker.form({ fromEntityId: 'a', toEntityId: 'b', type: 'rival' });
    expect(dup.type).toBe('ally');
    expect(dup.disposition).toBe(30);
  });

  it('defaults disposition to 0', () => {
    const tracker = createRelationshipTracker(makeDeps());
    const rel = tracker.form({ fromEntityId: 'a', toEntityId: 'b', type: 'stranger' });
    expect(rel.disposition).toBe(0);
  });

  it('stores tags', () => {
    const tracker = createRelationshipTracker(makeDeps());
    const rel = tracker.form({
      fromEntityId: 'a', toEntityId: 'b', type: 'mentor', tags: ['combat', 'wisdom'],
    });
    expect(rel.tags).toEqual(['combat', 'wisdom']);
  });
});

describe('RelationshipTracker — disposition adjustments', () => {
  it('adjusts disposition positively', () => {
    const tracker = createRelationshipTracker(makeDeps());
    tracker.form({ fromEntityId: 'a', toEntityId: 'b', type: 'stranger' });
    const change = tracker.adjustDisposition('a', 'b', 25);
    expect(change.previousDisposition).toBe(0);
    expect(change.newDisposition).toBe(25);
    expect(change.delta).toBe(25);
  });

  it('adjusts disposition negatively', () => {
    const tracker = createRelationshipTracker(makeDeps());
    tracker.form({ fromEntityId: 'a', toEntityId: 'b', type: 'rival', initialDisposition: 10 });
    const change = tracker.adjustDisposition('a', 'b', -30);
    expect(change.newDisposition).toBe(-20);
  });

  it('clamps disposition to max', () => {
    const tracker = createRelationshipTracker(makeDeps());
    tracker.form({ fromEntityId: 'a', toEntityId: 'b', type: 'ally', initialDisposition: 90 });
    tracker.adjustDisposition('a', 'b', 50);
    const rel = tracker.getRelationship('a', 'b');
    expect(rel?.disposition).toBe(100);
  });

  it('clamps disposition to min', () => {
    const tracker = createRelationshipTracker(makeDeps());
    tracker.form({ fromEntityId: 'a', toEntityId: 'b', type: 'nemesis', initialDisposition: -90 });
    tracker.adjustDisposition('a', 'b', -50);
    const rel = tracker.getRelationship('a', 'b');
    expect(rel?.disposition).toBe(-100);
  });

  it('throws for unknown relationship', () => {
    const tracker = createRelationshipTracker(makeDeps());
    expect(() => tracker.adjustDisposition('a', 'b', 10))
      .toThrow('not found');
  });
});

describe('RelationshipTracker — interactions', () => {
  it('records an interaction', () => {
    const tracker = createRelationshipTracker(makeDeps());
    tracker.form({ fromEntityId: 'a', toEntityId: 'b', type: 'ally' });
    expect(tracker.recordInteraction('a', 'b')).toBe(true);
    const rel = tracker.getRelationship('a', 'b');
    expect(rel?.interactionCount).toBe(1);
  });

  it('returns false for unknown relationship', () => {
    const tracker = createRelationshipTracker(makeDeps());
    expect(tracker.recordInteraction('a', 'b')).toBe(false);
  });

  it('increments interaction count', () => {
    const tracker = createRelationshipTracker(makeDeps());
    tracker.form({ fromEntityId: 'a', toEntityId: 'b', type: 'ally' });
    tracker.recordInteraction('a', 'b');
    tracker.recordInteraction('a', 'b');
    tracker.recordInteraction('a', 'b');
    const rel = tracker.getRelationship('a', 'b');
    expect(rel?.interactionCount).toBe(3);
  });
});

describe('RelationshipTracker — type changes', () => {
  it('changes relationship type', () => {
    const tracker = createRelationshipTracker(makeDeps());
    tracker.form({ fromEntityId: 'a', toEntityId: 'b', type: 'stranger' });
    expect(tracker.setType('a', 'b', 'ally')).toBe(true);
    const rel = tracker.getRelationship('a', 'b');
    expect(rel?.type).toBe('ally');
  });

  it('returns false for unknown relationship', () => {
    const tracker = createRelationshipTracker(makeDeps());
    expect(tracker.setType('a', 'b', 'rival')).toBe(false);
  });
});

describe('RelationshipTracker — queries', () => {
  it('gets relationships from an entity', () => {
    const tracker = createRelationshipTracker(makeDeps());
    tracker.form({ fromEntityId: 'a', toEntityId: 'b', type: 'ally' });
    tracker.form({ fromEntityId: 'a', toEntityId: 'c', type: 'rival' });
    tracker.form({ fromEntityId: 'b', toEntityId: 'a', type: 'ally' });

    const from = tracker.getRelationshipsFrom('a');
    expect(from).toHaveLength(2);
  });

  it('gets relationships to an entity', () => {
    const tracker = createRelationshipTracker(makeDeps());
    tracker.form({ fromEntityId: 'b', toEntityId: 'a', type: 'ally' });
    tracker.form({ fromEntityId: 'c', toEntityId: 'a', type: 'rival' });

    const to = tracker.getRelationshipsTo('a');
    expect(to).toHaveLength(2);
  });

  it('gets mutual relationships', () => {
    const tracker = createRelationshipTracker(makeDeps());
    tracker.form({ fromEntityId: 'a', toEntityId: 'b', type: 'ally' });
    tracker.form({ fromEntityId: 'b', toEntityId: 'a', type: 'ally' });
    tracker.form({ fromEntityId: 'c', toEntityId: 'd', type: 'rival' });

    const mutual = tracker.getMutualRelationships('a');
    expect(mutual).toHaveLength(2);
  });

  it('returns undefined for unknown relationship', () => {
    const tracker = createRelationshipTracker(makeDeps());
    expect(tracker.getRelationship('a', 'b')).toBeUndefined();
  });
});

describe('RelationshipTracker — removal', () => {
  it('removes a specific relationship', () => {
    const tracker = createRelationshipTracker(makeDeps());
    tracker.form({ fromEntityId: 'a', toEntityId: 'b', type: 'ally' });
    expect(tracker.removeRelationship('a', 'b')).toBe(true);
    expect(tracker.getRelationship('a', 'b')).toBeUndefined();
  });

  it('returns false for unknown relationship removal', () => {
    const tracker = createRelationshipTracker(makeDeps());
    expect(tracker.removeRelationship('a', 'b')).toBe(false);
  });

  it('removes all relationships for an entity', () => {
    const tracker = createRelationshipTracker(makeDeps());
    tracker.form({ fromEntityId: 'a', toEntityId: 'b', type: 'ally' });
    tracker.form({ fromEntityId: 'a', toEntityId: 'c', type: 'rival' });
    tracker.form({ fromEntityId: 'b', toEntityId: 'a', type: 'ally' });

    const removed = tracker.removeAllForEntity('a');
    expect(removed).toBe(3);
    expect(tracker.getStats().totalRelationships).toBe(0);
  });
});

describe('RelationshipTracker — stats', () => {
  it('computes aggregate stats', () => {
    const tracker = createRelationshipTracker(makeDeps());
    tracker.form({ fromEntityId: 'a', toEntityId: 'b', type: 'ally', initialDisposition: 50 });
    tracker.form({ fromEntityId: 'b', toEntityId: 'a', type: 'rival', initialDisposition: -50 });
    tracker.recordInteraction('a', 'b');

    const stats = tracker.getStats();
    expect(stats.totalRelationships).toBe(2);
    expect(stats.totalInteractions).toBe(1);
    expect(stats.averageDisposition).toBe(0);
  });

  it('starts with zero stats', () => {
    const tracker = createRelationshipTracker(makeDeps());
    const stats = tracker.getStats();
    expect(stats.totalRelationships).toBe(0);
    expect(stats.averageDisposition).toBe(0);
  });
});

describe('RelationshipTracker — disposition callback capture', () => {
  it('returns full disposition change info', () => {
    const tracker = createRelationshipTracker(makeDeps());
    tracker.form({ fromEntityId: 'a', toEntityId: 'b', type: 'ally', initialDisposition: 20 });
    const changes: DispositionChange[] = [];
    changes.push(tracker.adjustDisposition('a', 'b', 15));
    changes.push(tracker.adjustDisposition('a', 'b', -10));
    expect(changes[0]?.newDisposition).toBe(35);
    expect(changes[1]?.newDisposition).toBe(25);
  });
});
