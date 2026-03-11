import { describe, it, expect } from 'vitest';
import { createFactionPolitics } from '../faction-politics.js';

function createTestPolitics() {
  let time = 1_000_000n;
  let idCount = 0;
  return createFactionPolitics({
    clock: { nowMicroseconds: () => time },
    idGen: { next: () => 'id-' + String((idCount = idCount + 1)) },
  });
}

describe('FactionPolitics relationship management', () => {
  it('sets relationship between two factions', () => {
    const pol = createTestPolitics();
    const result = pol.setRelationship('faction-a', 'faction-b', 50);
    expect(result).toBe('success');
  });

  it('gets relationship between two factions', () => {
    const pol = createTestPolitics();
    pol.setRelationship('faction-a', 'faction-b', 50);
    const rel = pol.getRelationship('faction-a', 'faction-b');
    expect(rel).not.toBe('not-found');
    if (rel !== 'not-found') {
      expect(rel.score).toBe(50);
      expect(rel.tier).toBe('FRIENDLY');
    }
  });

  it('returns not-found for missing relationship', () => {
    const pol = createTestPolitics();
    const rel = pol.getRelationship('faction-x', 'faction-y');
    expect(rel).toBe('not-found');
  });

  it('prevents setting relationship with self', () => {
    const pol = createTestPolitics();
    const result = pol.setRelationship('faction-a', 'faction-a', 50);
    expect(result).toBe('same-faction');
  });

  it('rejects score below -100', () => {
    const pol = createTestPolitics();
    const result = pol.setRelationship('faction-a', 'faction-b', -150);
    expect(result).toBe('invalid-score');
  });

  it('rejects score above 100', () => {
    const pol = createTestPolitics();
    const result = pol.setRelationship('faction-a', 'faction-b', 150);
    expect(result).toBe('invalid-score');
  });

  it('updates existing relationship score', () => {
    const pol = createTestPolitics();
    pol.setRelationship('faction-a', 'faction-b', 30);
    pol.setRelationship('faction-a', 'faction-b', 60);
    const rel = pol.getRelationship('faction-a', 'faction-b');
    expect(rel).not.toBe('not-found');
    if (rel !== 'not-found') {
      expect(rel.score).toBe(60);
    }
  });

  it('sets relationship score to zero', () => {
    const pol = createTestPolitics();
    pol.setRelationship('faction-a', 'faction-b', 0);
    const rel = pol.getRelationship('faction-a', 'faction-b');
    expect(rel).not.toBe('not-found');
    if (rel !== 'not-found') {
      expect(rel.score).toBe(0);
      expect(rel.tier).toBe('NEUTRAL');
    }
  });

  it('classifies ALLIED tier for score >= 75', () => {
    const pol = createTestPolitics();
    pol.setRelationship('faction-a', 'faction-b', 80);
    const rel = pol.getRelationship('faction-a', 'faction-b');
    expect(rel).not.toBe('not-found');
    if (rel !== 'not-found') {
      expect(rel.tier).toBe('ALLIED');
    }
  });

  it('classifies FRIENDLY tier for score 25-74', () => {
    const pol = createTestPolitics();
    pol.setRelationship('faction-a', 'faction-b', 50);
    const rel = pol.getRelationship('faction-a', 'faction-b');
    expect(rel).not.toBe('not-found');
    if (rel !== 'not-found') {
      expect(rel.tier).toBe('FRIENDLY');
    }
  });

  it('classifies NEUTRAL tier for score -24 to 24', () => {
    const pol = createTestPolitics();
    pol.setRelationship('faction-a', 'faction-b', 10);
    const rel = pol.getRelationship('faction-a', 'faction-b');
    expect(rel).not.toBe('not-found');
    if (rel !== 'not-found') {
      expect(rel.tier).toBe('NEUTRAL');
    }
  });

  it('classifies TENSE tier for score -50 to -25', () => {
    const pol = createTestPolitics();
    pol.setRelationship('faction-a', 'faction-b', -30);
    const rel = pol.getRelationship('faction-a', 'faction-b');
    expect(rel).not.toBe('not-found');
    if (rel !== 'not-found') {
      expect(rel.tier).toBe('TENSE');
    }
  });

  it('classifies HOSTILE tier for score -75 to -51', () => {
    const pol = createTestPolitics();
    pol.setRelationship('faction-a', 'faction-b', -60);
    const rel = pol.getRelationship('faction-a', 'faction-b');
    expect(rel).not.toBe('not-found');
    if (rel !== 'not-found') {
      expect(rel.tier).toBe('HOSTILE');
    }
  });

  it('classifies WAR tier for score <= -76', () => {
    const pol = createTestPolitics();
    pol.setRelationship('faction-a', 'faction-b', -80);
    const rel = pol.getRelationship('faction-a', 'faction-b');
    expect(rel).not.toBe('not-found');
    if (rel !== 'not-found') {
      expect(rel.tier).toBe('WAR');
    }
  });

  it('relationship key is order-independent', () => {
    const pol = createTestPolitics();
    pol.setRelationship('faction-a', 'faction-b', 50);
    const relAB = pol.getRelationship('faction-a', 'faction-b');
    const relBA = pol.getRelationship('faction-b', 'faction-a');
    expect(relAB).toEqual(relBA);
  });

  it('lists all relationships', () => {
    const pol = createTestPolitics();
    pol.setRelationship('faction-a', 'faction-b', 40);
    pol.setRelationship('faction-c', 'faction-d', -20);
    const all = pol.getAllRelationships();
    expect(all.length).toBe(2);
  });
});

describe('FactionPolitics actions', () => {
  it('records a faction action', () => {
    const pol = createTestPolitics();
    const actionId = pol.recordAction({
      actingFaction: 'faction-a',
      targetFaction: 'faction-b',
      actionType: 'FORM_ALLIANCE',
      scoreDelta: 20,
    });
    expect(actionId).toContain('action-');
  });

  it('action updates relationship score', () => {
    const pol = createTestPolitics();
    pol.setRelationship('faction-a', 'faction-b', 30);
    pol.recordAction({
      actingFaction: 'faction-a',
      targetFaction: 'faction-b',
      actionType: 'EXTEND_AID',
      scoreDelta: 15,
    });
    const rel = pol.getRelationship('faction-a', 'faction-b');
    expect(rel).not.toBe('not-found');
    if (rel !== 'not-found') {
      expect(rel.score).toBe(45);
    }
  });

  it('action with negative delta decreases score', () => {
    const pol = createTestPolitics();
    pol.setRelationship('faction-a', 'faction-b', 50);
    pol.recordAction({
      actingFaction: 'faction-a',
      targetFaction: 'faction-b',
      actionType: 'DENOUNCE',
      scoreDelta: -25,
    });
    const rel = pol.getRelationship('faction-a', 'faction-b');
    expect(rel).not.toBe('not-found');
    if (rel !== 'not-found') {
      expect(rel.score).toBe(25);
    }
  });

  it('action creates relationship if none exists', () => {
    const pol = createTestPolitics();
    pol.recordAction({
      actingFaction: 'faction-x',
      targetFaction: 'faction-y',
      actionType: 'FORM_ALLIANCE',
      scoreDelta: 30,
    });
    const rel = pol.getRelationship('faction-x', 'faction-y');
    expect(rel).not.toBe('not-found');
    if (rel !== 'not-found') {
      expect(rel.score).toBe(30);
    }
  });

  it('action clamps score at 100', () => {
    const pol = createTestPolitics();
    pol.setRelationship('faction-a', 'faction-b', 90);
    pol.recordAction({
      actingFaction: 'faction-a',
      targetFaction: 'faction-b',
      actionType: 'FORM_ALLIANCE',
      scoreDelta: 50,
    });
    const rel = pol.getRelationship('faction-a', 'faction-b');
    expect(rel).not.toBe('not-found');
    if (rel !== 'not-found') {
      expect(rel.score).toBe(100);
    }
  });

  it('action clamps score at -100', () => {
    const pol = createTestPolitics();
    pol.setRelationship('faction-a', 'faction-b', -90);
    pol.recordAction({
      actingFaction: 'faction-a',
      targetFaction: 'faction-b',
      actionType: 'DECLARE_WAR',
      scoreDelta: -50,
    });
    const rel = pol.getRelationship('faction-a', 'faction-b');
    expect(rel).not.toBe('not-found');
    if (rel !== 'not-found') {
      expect(rel.score).toBe(-100);
    }
  });

  it('retrieves action history for faction', () => {
    const pol = createTestPolitics();
    pol.recordAction({
      actingFaction: 'faction-a',
      targetFaction: 'faction-b',
      actionType: 'FORM_ALLIANCE',
      scoreDelta: 20,
    });
    pol.recordAction({
      actingFaction: 'faction-a',
      targetFaction: 'faction-c',
      actionType: 'DENOUNCE',
      scoreDelta: -10,
    });
    const history = pol.getActionHistory('faction-a');
    expect(history.length).toBe(2);
  });

  it('includes faction as both actor and target in history', () => {
    const pol = createTestPolitics();
    pol.recordAction({
      actingFaction: 'faction-a',
      targetFaction: 'faction-b',
      actionType: 'EXTEND_AID',
      scoreDelta: 10,
    });
    pol.recordAction({
      actingFaction: 'faction-b',
      targetFaction: 'faction-a',
      actionType: 'NEGOTIATE_TREATY',
      scoreDelta: 15,
    });
    const history = pol.getActionHistory('faction-a');
    expect(history.length).toBe(2);
  });

  it('returns empty history for faction with no actions', () => {
    const pol = createTestPolitics();
    const history = pol.getActionHistory('faction-z');
    expect(history.length).toBe(0);
  });
});

describe('FactionPolitics power ranking', () => {
  it('computes power ranking from metrics', () => {
    const pol = createTestPolitics();
    pol.setFactionMetrics('faction-a', {
      memberCount: 100,
      treasury: 5_000_000n,
      influenceScore: 80,
    });
    const ranks = pol.getPowerRanking();
    expect(ranks.length).toBe(1);
    const rank = ranks[0];
    expect(rank).toBeDefined();
    if (rank !== undefined) {
      expect(rank.factionId).toBe('faction-a');
      expect(rank.rank).toBe(1);
    }
  });

  it('ranks multiple factions by power score', () => {
    const pol = createTestPolitics();
    pol.setFactionMetrics('faction-a', {
      memberCount: 50,
      treasury: 1_000_000n,
      influenceScore: 30,
    });
    pol.setFactionMetrics('faction-b', {
      memberCount: 100,
      treasury: 10_000_000n,
      influenceScore: 90,
    });
    const ranks = pol.getPowerRanking();
    expect(ranks.length).toBe(2);
    const first = ranks[0];
    const second = ranks[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (first !== undefined && second !== undefined) {
      expect(first.factionId).toBe('faction-b');
      expect(second.factionId).toBe('faction-a');
      expect(first.rank).toBe(1);
      expect(second.rank).toBe(2);
    }
  });

  it('updates faction metrics', () => {
    const pol = createTestPolitics();
    pol.setFactionMetrics('faction-a', {
      memberCount: 50,
      treasury: 1_000_000n,
      influenceScore: 30,
    });
    pol.setFactionMetrics('faction-a', {
      memberCount: 80,
      treasury: 5_000_000n,
      influenceScore: 60,
    });
    const ranks = pol.getPowerRanking();
    const rank = ranks[0];
    expect(rank).toBeDefined();
    if (rank !== undefined) {
      expect(rank.memberCount).toBe(80);
      expect(rank.treasury).toBe(5_000_000n);
    }
  });

  it('power score includes member count weight', () => {
    const pol = createTestPolitics();
    pol.setFactionMetrics('faction-a', {
      memberCount: 100,
      treasury: 0n,
      influenceScore: 0,
    });
    const ranks = pol.getPowerRanking();
    const rank = ranks[0];
    expect(rank).toBeDefined();
    if (rank !== undefined) {
      expect(rank.powerScore).toBeGreaterThanOrEqual(10000);
    }
  });

  it('power score includes treasury weight', () => {
    const pol = createTestPolitics();
    pol.setFactionMetrics('faction-a', {
      memberCount: 0,
      treasury: 10_000_000n,
      influenceScore: 0,
    });
    const ranks = pol.getPowerRanking();
    const rank = ranks[0];
    expect(rank).toBeDefined();
    if (rank !== undefined) {
      expect(rank.powerScore).toBeGreaterThanOrEqual(10);
    }
  });

  it('power score includes influence weight', () => {
    const pol = createTestPolitics();
    pol.setFactionMetrics('faction-a', {
      memberCount: 0,
      treasury: 0n,
      influenceScore: 100,
    });
    const ranks = pol.getPowerRanking();
    const rank = ranks[0];
    expect(rank).toBeDefined();
    if (rank !== undefined) {
      expect(rank.powerScore).toBeGreaterThanOrEqual(5000);
    }
  });

  it('returns empty ranking for no factions', () => {
    const pol = createTestPolitics();
    const ranks = pol.getPowerRanking();
    expect(ranks.length).toBe(0);
  });
});

describe('FactionPolitics embargoes', () => {
  it('applies embargo between two factions', () => {
    const pol = createTestPolitics();
    pol.setRelationship('faction-a', 'faction-b', 30);
    const result = pol.applyEmbargo('faction-c', 'faction-a', 'faction-b');
    expect(result).toBe('success');
  });

  it('embargo marks relationship as embargoed', () => {
    const pol = createTestPolitics();
    pol.setRelationship('faction-a', 'faction-b', 30);
    pol.applyEmbargo('faction-c', 'faction-a', 'faction-b');
    const rel = pol.getRelationship('faction-a', 'faction-b');
    expect(rel).not.toBe('not-found');
    if (rel !== 'not-found') {
      expect(rel.embargoActive).toBe(true);
    }
  });

  it('embargo fails if relationship does not exist', () => {
    const pol = createTestPolitics();
    const result = pol.applyEmbargo('faction-c', 'faction-x', 'faction-y');
    expect(result).toBe('not-found');
  });

  it('removes embargo from relationship', () => {
    const pol = createTestPolitics();
    pol.setRelationship('faction-a', 'faction-b', 30);
    pol.applyEmbargo('faction-c', 'faction-a', 'faction-b');
    pol.removeEmbargo('faction-a', 'faction-b');
    const rel = pol.getRelationship('faction-a', 'faction-b');
    expect(rel).not.toBe('not-found');
    if (rel !== 'not-found') {
      expect(rel.embargoActive).toBe(false);
    }
  });

  it('remove embargo fails if relationship does not exist', () => {
    const pol = createTestPolitics();
    const result = pol.removeEmbargo('faction-x', 'faction-y');
    expect(result).toBe('not-found');
  });

  it('lists active embargoes', () => {
    const pol = createTestPolitics();
    pol.setRelationship('faction-a', 'faction-b', 30);
    pol.setRelationship('faction-c', 'faction-d', 20);
    pol.applyEmbargo('system', 'faction-a', 'faction-b');
    pol.applyEmbargo('system', 'faction-c', 'faction-d');
    const embargoes = pol.getActiveEmbargoes();
    expect(embargoes.length).toBe(2);
  });

  it('active embargoes exclude removed ones', () => {
    const pol = createTestPolitics();
    pol.setRelationship('faction-a', 'faction-b', 30);
    pol.applyEmbargo('system', 'faction-a', 'faction-b');
    pol.removeEmbargo('faction-a', 'faction-b');
    const embargoes = pol.getActiveEmbargoes();
    expect(embargoes.length).toBe(0);
  });
});

describe('FactionPolitics political events', () => {
  it('records a political event', () => {
    const pol = createTestPolitics();
    const eventId = pol.recordPoliticalEvent(
      'ALLIANCE_FORMED',
      ['faction-a', 'faction-b'],
      'Alliance signed',
    );
    expect(eventId).toContain('event-');
  });

  it('retrieves all political events', () => {
    const pol = createTestPolitics();
    pol.recordPoliticalEvent('WAR_DECLARED', ['faction-a', 'faction-c'], 'War begins');
    pol.recordPoliticalEvent('TREATY_SIGNED', ['faction-b', 'faction-d'], 'Peace treaty');
    const events = pol.getPoliticalEvents();
    expect(events.length).toBe(2);
  });

  it('filters events by faction', () => {
    const pol = createTestPolitics();
    pol.recordPoliticalEvent('ALLIANCE_FORMED', ['faction-a', 'faction-b'], 'Event 1');
    pol.recordPoliticalEvent('WAR_DECLARED', ['faction-c', 'faction-d'], 'Event 2');
    pol.recordPoliticalEvent('TREATY_SIGNED', ['faction-a', 'faction-c'], 'Event 3');
    const events = pol.getPoliticalEvents('faction-a');
    expect(events.length).toBe(2);
  });

  it('event includes timestamp', () => {
    const pol = createTestPolitics();
    const eventId = pol.recordPoliticalEvent('SUMMIT_HELD', ['faction-a'], 'Summit description');
    const events = pol.getPoliticalEvents();
    const event = events[0];
    expect(event).toBeDefined();
    if (event !== undefined) {
      expect(event.timestamp).toBeGreaterThan(0n);
    }
  });

  it('event includes involved factions', () => {
    const pol = createTestPolitics();
    pol.recordPoliticalEvent(
      'CONFERENCE',
      ['faction-a', 'faction-b', 'faction-c'],
      'Three-way conference',
    );
    const events = pol.getPoliticalEvents();
    const event = events[0];
    expect(event).toBeDefined();
    if (event !== undefined) {
      expect(event.involvedFactions.length).toBe(3);
    }
  });

  it('returns empty events for faction not involved', () => {
    const pol = createTestPolitics();
    pol.recordPoliticalEvent('EVENT', ['faction-a'], 'Description');
    const events = pol.getPoliticalEvents('faction-z');
    expect(events.length).toBe(0);
  });
});

describe('FactionPolitics edge cases', () => {
  it('handles large positive score delta', () => {
    const pol = createTestPolitics();
    pol.setRelationship('faction-a', 'faction-b', 0);
    pol.recordAction({
      actingFaction: 'faction-a',
      targetFaction: 'faction-b',
      actionType: 'EXTEND_AID',
      scoreDelta: 200,
    });
    const rel = pol.getRelationship('faction-a', 'faction-b');
    expect(rel).not.toBe('not-found');
    if (rel !== 'not-found') {
      expect(rel.score).toBe(100);
    }
  });

  it('handles large negative score delta', () => {
    const pol = createTestPolitics();
    pol.setRelationship('faction-a', 'faction-b', 0);
    pol.recordAction({
      actingFaction: 'faction-a',
      targetFaction: 'faction-b',
      actionType: 'DECLARE_WAR',
      scoreDelta: -200,
    });
    const rel = pol.getRelationship('faction-a', 'faction-b');
    expect(rel).not.toBe('not-found');
    if (rel !== 'not-found') {
      expect(rel.score).toBe(-100);
    }
  });

  it('multiple actions accumulate score changes', () => {
    const pol = createTestPolitics();
    pol.setRelationship('faction-a', 'faction-b', 0);
    pol.recordAction({
      actingFaction: 'faction-a',
      targetFaction: 'faction-b',
      actionType: 'EXTEND_AID',
      scoreDelta: 10,
    });
    pol.recordAction({
      actingFaction: 'faction-a',
      targetFaction: 'faction-b',
      actionType: 'NEGOTIATE_TREATY',
      scoreDelta: 15,
    });
    const rel = pol.getRelationship('faction-a', 'faction-b');
    expect(rel).not.toBe('not-found');
    if (rel !== 'not-found') {
      expect(rel.score).toBe(25);
    }
  });

  it('handles zero member count in power ranking', () => {
    const pol = createTestPolitics();
    pol.setFactionMetrics('faction-a', {
      memberCount: 0,
      treasury: 0n,
      influenceScore: 0,
    });
    const ranks = pol.getPowerRanking();
    const rank = ranks[0];
    expect(rank).toBeDefined();
    if (rank !== undefined) {
      expect(rank.powerScore).toBe(0);
    }
  });

  it('handles very large treasury in power ranking', () => {
    const pol = createTestPolitics();
    pol.setFactionMetrics('faction-a', {
      memberCount: 10,
      treasury: 1_000_000_000_000n,
      influenceScore: 50,
    });
    const ranks = pol.getPowerRanking();
    const rank = ranks[0];
    expect(rank).toBeDefined();
    if (rank !== undefined) {
      expect(rank.powerScore).toBeGreaterThan(0);
    }
  });

  it('relationship persists across multiple operations', () => {
    const pol = createTestPolitics();
    pol.setRelationship('faction-a', 'faction-b', 50);
    pol.recordAction({
      actingFaction: 'faction-a',
      targetFaction: 'faction-b',
      actionType: 'EXTEND_AID',
      scoreDelta: 10,
    });
    pol.applyEmbargo('faction-c', 'faction-a', 'faction-b');
    const rel = pol.getRelationship('faction-a', 'faction-b');
    expect(rel).not.toBe('not-found');
    if (rel !== 'not-found') {
      expect(rel.score).toBe(60);
      expect(rel.embargoActive).toBe(true);
    }
  });
});
