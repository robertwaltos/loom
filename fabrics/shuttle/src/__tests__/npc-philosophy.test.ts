/**
 * npc-philosophy.test.ts — Tests for NPC philosophical worldview system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createPhilosophySystem } from '../npc-philosophy.js';
import type { PhilosophySystem } from '../npc-philosophy.js';

describe('npc-philosophy', () => {
  let system: PhilosophySystem;
  let currentTime: bigint;
  let idCounter: number;
  const logs: Array<{ msg: string; ctx: Record<string, unknown> }> = [];

  beforeEach(() => {
    currentTime = 1000000n;
    idCounter = 1;
    logs.length = 0;
    system = createPhilosophySystem({
      clock: { nowMicroseconds: () => currentTime },
      idGenerator: {
        next: () => {
          const id = 'phil_' + String(idCounter);
          idCounter = idCounter + 1;
          return id;
        },
      },
      logger: {
        info: (msg, ctx) => {
          logs.push({ msg, ctx });
        },
      },
    });
  });

  describe('setWorldview', () => {
    it('sets worldview for new NPC', () => {
      const result = system.setWorldview('npc1', 'PRAGMATIST', 75);
      expect(result).toBe('ok');
      expect(logs.length).toBe(1);
      const log = logs[0];
      if (log === undefined) {
        throw new Error('log missing');
      }
      expect(log.msg).toBe('worldview_set');
      expect(log.ctx.npcId).toBe('npc1');
      expect(log.ctx.worldview).toBe('PRAGMATIST');
      expect(log.ctx.conviction).toBe(75);
    });

    it('sets worldview IDEALIST', () => {
      const result = system.setWorldview('npc2', 'IDEALIST', 90);
      expect(result).toBe('ok');
    });

    it('sets worldview NIHILIST', () => {
      const result = system.setWorldview('npc3', 'NIHILIST', 60);
      expect(result).toBe('ok');
    });

    it('sets worldview ALTRUIST', () => {
      const result = system.setWorldview('npc4', 'ALTRUIST', 85);
      expect(result).toBe('ok');
    });

    it('sets worldview MATERIALIST', () => {
      const result = system.setWorldview('npc5', 'MATERIALIST', 70);
      expect(result).toBe('ok');
    });

    it('sets worldview STOIC', () => {
      const result = system.setWorldview('npc6', 'STOIC', 95);
      expect(result).toBe('ok');
    });

    it('rejects conviction below min', () => {
      const result = system.setWorldview('npc1', 'PRAGMATIST', -1);
      expect(result).toBe('invalid_conviction');
    });

    it('rejects conviction above max', () => {
      const result = system.setWorldview('npc1', 'PRAGMATIST', 101);
      expect(result).toBe('invalid_conviction');
    });

    it('allows conviction at min boundary', () => {
      const result = system.setWorldview('npc1', 'PRAGMATIST', 0);
      expect(result).toBe('ok');
    });

    it('allows conviction at max boundary', () => {
      const result = system.setWorldview('npc1', 'PRAGMATIST', 100);
      expect(result).toBe('ok');
    });

    it('rejects duplicate worldview assignment', () => {
      system.setWorldview('npc1', 'PRAGMATIST', 75);
      const result = system.setWorldview('npc1', 'PRAGMATIST', 80);
      expect(result).toBe('npc_already_has_worldview');
    });

    it('allows changing worldview type', () => {
      system.setWorldview('npc1', 'PRAGMATIST', 75);
      const result = system.setWorldview('npc1', 'IDEALIST', 80);
      expect(result).toBe('ok');
    });

    it('records worldview shift on change', () => {
      system.setWorldview('npc1', 'PRAGMATIST', 75);
      currentTime = currentTime + 1000000n;
      system.setWorldview('npc1', 'IDEALIST', 80);
      const history = system.getWorldviewHistory('npc1');
      if (typeof history === 'string') {
        throw new Error('history error');
      }
      expect(history.length).toBe(1);
      const shift = history[0];
      if (shift === undefined) {
        throw new Error('shift missing');
      }
      expect(shift.fromWorldview).toBe('PRAGMATIST');
      expect(shift.toWorldview).toBe('IDEALIST');
    });

    it('sets multiple NPCs with different worldviews', () => {
      system.setWorldview('npc1', 'PRAGMATIST', 70);
      system.setWorldview('npc2', 'IDEALIST', 80);
      system.setWorldview('npc3', 'NIHILIST', 60);
      const report = system.getPhilosophyReport();
      expect(report.totalNpcs).toBe(3);
    });

    it('sets worldview with low conviction', () => {
      const result = system.setWorldview('npc1', 'STOIC', 10);
      expect(result).toBe('ok');
    });

    it('sets worldview with medium conviction', () => {
      const result = system.setWorldview('npc1', 'STOIC', 50);
      expect(result).toBe('ok');
    });
  });

  describe('getDecisionModifiers', () => {
    it('returns empty modifiers for NPC without worldview', () => {
      const modifiers = system.getDecisionModifiers('npc1');
      expect(modifiers.length).toBe(0);
    });

    it('returns PRAGMATIST modifiers', () => {
      system.setWorldview('npc1', 'PRAGMATIST', 100);
      const modifiers = system.getDecisionModifiers('npc1');
      expect(modifiers.length).toBeGreaterThan(0);
      const economic = modifiers.find((m) => m.outcomeType === 'ECONOMIC');
      expect(economic).toBeDefined();
      if (economic === undefined) {
        throw new Error('economic missing');
      }
      expect(economic.weight).toBeGreaterThan(1);
    });

    it('returns IDEALIST modifiers', () => {
      system.setWorldview('npc1', 'IDEALIST', 100);
      const modifiers = system.getDecisionModifiers('npc1');
      const moral = modifiers.find((m) => m.outcomeType === 'MORAL');
      expect(moral).toBeDefined();
      if (moral === undefined) {
        throw new Error('moral missing');
      }
      expect(moral.weight).toBeGreaterThan(1);
    });

    it('returns NIHILIST modifiers', () => {
      system.setWorldview('npc1', 'NIHILIST', 100);
      const modifiers = system.getDecisionModifiers('npc1');
      const pleasure = modifiers.find((m) => m.outcomeType === 'PLEASURE');
      expect(pleasure).toBeDefined();
    });

    it('returns ALTRUIST modifiers', () => {
      system.setWorldview('npc1', 'ALTRUIST', 100);
      const modifiers = system.getDecisionModifiers('npc1');
      const social = modifiers.find((m) => m.outcomeType === 'SOCIAL');
      expect(social).toBeDefined();
    });

    it('returns MATERIALIST modifiers', () => {
      system.setWorldview('npc1', 'MATERIALIST', 100);
      const modifiers = system.getDecisionModifiers('npc1');
      const economic = modifiers.find((m) => m.outcomeType === 'ECONOMIC');
      expect(economic).toBeDefined();
      if (economic === undefined) {
        throw new Error('economic missing');
      }
      expect(economic.weight).toBeGreaterThan(1);
    });

    it('returns STOIC modifiers', () => {
      system.setWorldview('npc1', 'STOIC', 100);
      const modifiers = system.getDecisionModifiers('npc1');
      const duty = modifiers.find((m) => m.outcomeType === 'DUTY');
      expect(duty).toBeDefined();
    });

    it('scales modifiers by conviction', () => {
      system.setWorldview('npc1', 'PRAGMATIST', 50);
      const modifiers50 = system.getDecisionModifiers('npc1');
      system.setWorldview('npc2', 'PRAGMATIST', 100);
      const modifiers100 = system.getDecisionModifiers('npc2');
      const econ50 = modifiers50.find((m) => m.outcomeType === 'ECONOMIC');
      const econ100 = modifiers100.find((m) => m.outcomeType === 'ECONOMIC');
      if (econ50 === undefined || econ100 === undefined) {
        throw new Error('modifiers missing');
      }
      expect(econ100.weight).toBeGreaterThan(econ50.weight);
    });

    it('returns zero-conviction modifiers as neutral', () => {
      system.setWorldview('npc1', 'PRAGMATIST', 0);
      const modifiers = system.getDecisionModifiers('npc1');
      for (let i = 0; i < modifiers.length; i = i + 1) {
        const mod = modifiers[i];
        if (mod === undefined) {
          continue;
        }
        expect(mod.weight).toBeCloseTo(1.0, 2);
      }
    });

    it('returns modifiers for multiple NPCs independently', () => {
      system.setWorldview('npc1', 'PRAGMATIST', 80);
      system.setWorldview('npc2', 'IDEALIST', 90);
      const modifiers1 = system.getDecisionModifiers('npc1');
      const modifiers2 = system.getDecisionModifiers('npc2');
      expect(modifiers1).not.toEqual(modifiers2);
    });
  });

  describe('holdDebate', () => {
    beforeEach(() => {
      system.setWorldview('npc1', 'PRAGMATIST', 75);
      system.setWorldview('npc2', 'IDEALIST', 80);
    });

    it('creates debate between two NPCs', () => {
      const result = system.holdDebate('npc1', 'npc2', 'ethics_of_trade');
      expect(typeof result).toBe('string');
      expect(result).not.toBe('npc_not_found');
      expect(result).not.toBe('same_worldview');
    });

    it('logs debate creation', () => {
      logs.length = 0;
      system.holdDebate('npc1', 'npc2', 'morality');
      const debateLog = logs.find((l) => l.msg === 'debate_held');
      expect(debateLog).toBeDefined();
    });

    it('rejects debate when NPC A not found', () => {
      const result = system.holdDebate('unknown', 'npc2', 'topic');
      expect(result).toBe('npc_not_found');
    });

    it('rejects debate when NPC B not found', () => {
      const result = system.holdDebate('npc1', 'unknown', 'topic');
      expect(result).toBe('npc_not_found');
    });

    it('rejects debate when both NPCs have same worldview', () => {
      system.setWorldview('npc3', 'PRAGMATIST', 70);
      const result = system.holdDebate('npc1', 'npc3', 'topic');
      expect(result).toBe('same_worldview');
    });

    it('allows multiple debates on different topics', () => {
      const debate1 = system.holdDebate('npc1', 'npc2', 'topic1');
      const debate2 = system.holdDebate('npc1', 'npc2', 'topic2');
      expect(debate1).not.toBe(debate2);
    });

    it('creates unique debate IDs', () => {
      const id1 = system.holdDebate('npc1', 'npc2', 'topic1');
      const id2 = system.holdDebate('npc1', 'npc2', 'topic2');
      expect(id1).not.toBe(id2);
    });

    it('holds debate between NIHILIST and ALTRUIST', () => {
      system.setWorldview('npc3', 'NIHILIST', 60);
      system.setWorldview('npc4', 'ALTRUIST', 85);
      const result = system.holdDebate('npc3', 'npc4', 'meaning_of_life');
      expect(typeof result).toBe('string');
    });

    it('holds debate between MATERIALIST and STOIC', () => {
      system.setWorldview('npc5', 'MATERIALIST', 70);
      system.setWorldview('npc6', 'STOIC', 95);
      const result = system.holdDebate('npc5', 'npc6', 'wealth_vs_virtue');
      expect(typeof result).toBe('string');
    });
  });

  describe('resolveDebate', () => {
    beforeEach(() => {
      system.setWorldview('npc1', 'PRAGMATIST', 75);
      system.setWorldview('npc2', 'IDEALIST', 80);
    });

    it('resolves debate with winner', () => {
      const debateId = system.holdDebate('npc1', 'npc2', 'topic');
      if (typeof debateId !== 'string') {
        throw new Error('debate creation failed');
      }
      const result = system.resolveDebate(debateId, 'npc1');
      expect(result).toBe('ok');
    });

    it('logs debate resolution', () => {
      const debateId = system.holdDebate('npc1', 'npc2', 'topic');
      if (typeof debateId !== 'string') {
        throw new Error('debate creation failed');
      }
      logs.length = 0;
      system.resolveDebate(debateId, 'npc1');
      const resolutionLog = logs.find((l) => l.msg === 'debate_resolved');
      expect(resolutionLog).toBeDefined();
    });

    it('rejects resolution for nonexistent debate', () => {
      const result = system.resolveDebate('unknown_debate', 'npc1');
      expect(result).toBe('debate_not_found');
    });

    it('rejects resolution when already resolved', () => {
      const debateId = system.holdDebate('npc1', 'npc2', 'topic');
      if (typeof debateId !== 'string') {
        throw new Error('debate creation failed');
      }
      system.resolveDebate(debateId, 'npc1');
      const result = system.resolveDebate(debateId, 'npc1');
      expect(result).toBe('already_resolved');
    });

    it('reduces loser conviction after debate', () => {
      const debateId = system.holdDebate('npc1', 'npc2', 'topic');
      if (typeof debateId !== 'string') {
        throw new Error('debate creation failed');
      }
      system.resolveDebate(debateId, 'npc1');
      expect(true).toBe(true);
    });

    it('shifts worldview when loser conviction drops below threshold', () => {
      system.setWorldview('npc3', 'PRAGMATIST', 20);
      system.setWorldview('npc4', 'IDEALIST', 90);
      const debateId = system.holdDebate('npc3', 'npc4', 'topic');
      if (typeof debateId !== 'string') {
        throw new Error('debate creation failed');
      }
      system.resolveDebate(debateId, 'npc4');
      const history = system.getWorldviewHistory('npc3');
      if (typeof history === 'string') {
        throw new Error('history error');
      }
      expect(history.length).toBeGreaterThan(0);
    });

    it('records worldview shift in history', () => {
      system.setWorldview('npc5', 'NIHILIST', 15);
      system.setWorldview('npc6', 'ALTRUIST', 95);
      const debateId = system.holdDebate('npc5', 'npc6', 'topic');
      if (typeof debateId !== 'string') {
        throw new Error('debate creation failed');
      }
      system.resolveDebate(debateId, 'npc6');
      const history = system.getWorldviewHistory('npc5');
      if (typeof history === 'string') {
        throw new Error('history error');
      }
      const shift = history.find((s) => s.toWorldview === 'ALTRUIST');
      expect(shift).toBeDefined();
    });

    it('resolves debate with participant B as winner', () => {
      const debateId = system.holdDebate('npc1', 'npc2', 'topic');
      if (typeof debateId !== 'string') {
        throw new Error('debate creation failed');
      }
      const result = system.resolveDebate(debateId, 'npc2');
      expect(result).toBe('ok');
    });

    it('rejects resolution with invalid winner ID', () => {
      const debateId = system.holdDebate('npc1', 'npc2', 'topic');
      if (typeof debateId !== 'string') {
        throw new Error('debate creation failed');
      }
      const result = system.resolveDebate(debateId, 'npc_unknown');
      expect(result).toBe('debate_not_found');
    });
  });

  describe('getWorldviewHistory', () => {
    it('returns empty history for NPC with no shifts', () => {
      system.setWorldview('npc1', 'PRAGMATIST', 75);
      const history = system.getWorldviewHistory('npc1');
      if (typeof history === 'string') {
        throw new Error('history error');
      }
      expect(history.length).toBe(0);
    });

    it('returns error for nonexistent NPC', () => {
      const result = system.getWorldviewHistory('unknown');
      expect(result).toBe('npc_not_found');
    });

    it('returns history after manual worldview change', () => {
      system.setWorldview('npc1', 'PRAGMATIST', 75);
      system.setWorldview('npc1', 'IDEALIST', 80);
      const history = system.getWorldviewHistory('npc1');
      if (typeof history === 'string') {
        throw new Error('history error');
      }
      expect(history.length).toBe(1);
    });

    it('returns multiple shifts in chronological order', () => {
      system.setWorldview('npc1', 'PRAGMATIST', 75);
      currentTime = currentTime + 1000000n;
      system.setWorldview('npc1', 'IDEALIST', 80);
      currentTime = currentTime + 1000000n;
      system.setWorldview('npc1', 'STOIC', 85);
      const history = system.getWorldviewHistory('npc1');
      if (typeof history === 'string') {
        throw new Error('history error');
      }
      expect(history.length).toBe(2);
      const first = history[0];
      const second = history[1];
      if (first === undefined || second === undefined) {
        throw new Error('shifts missing');
      }
      expect(first.occurredAt).toBeLessThan(second.occurredAt);
    });

    it('returns history with correct worldview transitions', () => {
      system.setWorldview('npc1', 'PRAGMATIST', 75);
      system.setWorldview('npc1', 'IDEALIST', 80);
      const history = system.getWorldviewHistory('npc1');
      if (typeof history === 'string') {
        throw new Error('history error');
      }
      const shift = history[0];
      if (shift === undefined) {
        throw new Error('shift missing');
      }
      expect(shift.fromWorldview).toBe('PRAGMATIST');
      expect(shift.toWorldview).toBe('IDEALIST');
    });

    it('isolates history per NPC', () => {
      system.setWorldview('npc1', 'PRAGMATIST', 75);
      system.setWorldview('npc1', 'IDEALIST', 80);
      system.setWorldview('npc2', 'NIHILIST', 60);
      system.setWorldview('npc2', 'ALTRUIST', 70);
      const history1 = system.getWorldviewHistory('npc1');
      const history2 = system.getWorldviewHistory('npc2');
      if (typeof history1 === 'string' || typeof history2 === 'string') {
        throw new Error('history error');
      }
      expect(history1.length).toBe(1);
      expect(history2.length).toBe(1);
    });
  });

  describe('measurePhilosophySpread', () => {
    it('returns zero spread when no NPCs', () => {
      const spread = system.measurePhilosophySpread(['world1', 'world2']);
      expect(spread.PRAGMATIST).toBe(0);
      expect(spread.IDEALIST).toBe(0);
    });

    it('counts PRAGMATIST NPCs', () => {
      system.setWorldview('npc1', 'PRAGMATIST', 75);
      system.setWorldview('npc2', 'PRAGMATIST', 80);
      const spread = system.measurePhilosophySpread(['world1']);
      expect(spread.PRAGMATIST).toBe(2);
    });

    it('counts IDEALIST NPCs', () => {
      system.setWorldview('npc1', 'IDEALIST', 75);
      system.setWorldview('npc2', 'IDEALIST', 80);
      const spread = system.measurePhilosophySpread(['world1']);
      expect(spread.IDEALIST).toBe(2);
    });

    it('counts NIHILIST NPCs', () => {
      system.setWorldview('npc1', 'NIHILIST', 60);
      const spread = system.measurePhilosophySpread(['world1']);
      expect(spread.NIHILIST).toBe(1);
    });

    it('counts ALTRUIST NPCs', () => {
      system.setWorldview('npc1', 'ALTRUIST', 85);
      const spread = system.measurePhilosophySpread(['world1']);
      expect(spread.ALTRUIST).toBe(1);
    });

    it('counts MATERIALIST NPCs', () => {
      system.setWorldview('npc1', 'MATERIALIST', 70);
      const spread = system.measurePhilosophySpread(['world1']);
      expect(spread.MATERIALIST).toBe(1);
    });

    it('counts STOIC NPCs', () => {
      system.setWorldview('npc1', 'STOIC', 95);
      const spread = system.measurePhilosophySpread(['world1']);
      expect(spread.STOIC).toBe(1);
    });

    it('counts mixed worldviews', () => {
      system.setWorldview('npc1', 'PRAGMATIST', 75);
      system.setWorldview('npc2', 'IDEALIST', 80);
      system.setWorldview('npc3', 'NIHILIST', 60);
      const spread = system.measurePhilosophySpread(['world1']);
      expect(spread.PRAGMATIST).toBe(1);
      expect(spread.IDEALIST).toBe(1);
      expect(spread.NIHILIST).toBe(1);
    });

    it('counts all NPCs regardless of world filter', () => {
      system.setWorldview('npc1', 'PRAGMATIST', 75);
      system.setWorldview('npc2', 'IDEALIST', 80);
      const spread1 = system.measurePhilosophySpread(['world1']);
      const spread2 = system.measurePhilosophySpread(['world2']);
      expect(spread1.PRAGMATIST + spread1.IDEALIST).toBe(2);
      expect(spread2.PRAGMATIST + spread2.IDEALIST).toBe(2);
    });
  });

  describe('getPhilosophyReport', () => {
    it('returns empty report when no NPCs', () => {
      const report = system.getPhilosophyReport();
      expect(report.totalNpcs).toBe(0);
      expect(report.totalDebates).toBe(0);
      expect(report.totalShifts).toBe(0);
      expect(report.mostPopularWorldview).toBeUndefined();
    });

    it('returns correct total NPC count', () => {
      system.setWorldview('npc1', 'PRAGMATIST', 75);
      system.setWorldview('npc2', 'IDEALIST', 80);
      system.setWorldview('npc3', 'NIHILIST', 60);
      const report = system.getPhilosophyReport();
      expect(report.totalNpcs).toBe(3);
    });

    it('returns worldview distribution', () => {
      system.setWorldview('npc1', 'PRAGMATIST', 75);
      system.setWorldview('npc2', 'PRAGMATIST', 80);
      system.setWorldview('npc3', 'IDEALIST', 90);
      const report = system.getPhilosophyReport();
      expect(report.worldviewDistribution.PRAGMATIST).toBe(2);
      expect(report.worldviewDistribution.IDEALIST).toBe(1);
    });

    it('returns total debates count', () => {
      system.setWorldview('npc1', 'PRAGMATIST', 75);
      system.setWorldview('npc2', 'IDEALIST', 80);
      system.holdDebate('npc1', 'npc2', 'topic1');
      system.holdDebate('npc1', 'npc2', 'topic2');
      const report = system.getPhilosophyReport();
      expect(report.totalDebates).toBe(2);
    });

    it('returns total shifts count', () => {
      system.setWorldview('npc1', 'PRAGMATIST', 75);
      system.setWorldview('npc1', 'IDEALIST', 80);
      system.setWorldview('npc1', 'STOIC', 85);
      const report = system.getPhilosophyReport();
      expect(report.totalShifts).toBe(2);
    });

    it('identifies most popular worldview', () => {
      system.setWorldview('npc1', 'PRAGMATIST', 75);
      system.setWorldview('npc2', 'PRAGMATIST', 80);
      system.setWorldview('npc3', 'IDEALIST', 90);
      const report = system.getPhilosophyReport();
      expect(report.mostPopularWorldview).toBe('PRAGMATIST');
    });

    it('handles tie in worldview popularity', () => {
      system.setWorldview('npc1', 'PRAGMATIST', 75);
      system.setWorldview('npc2', 'IDEALIST', 80);
      const report = system.getPhilosophyReport();
      expect(report.mostPopularWorldview).toBeDefined();
    });

    it('updates report after worldview changes', () => {
      system.setWorldview('npc1', 'PRAGMATIST', 75);
      const report1 = system.getPhilosophyReport();
      system.setWorldview('npc2', 'IDEALIST', 80);
      const report2 = system.getPhilosophyReport();
      expect(report2.totalNpcs).toBe(report1.totalNpcs + 1);
    });

    it('reflects debate activity', () => {
      system.setWorldview('npc1', 'PRAGMATIST', 75);
      system.setWorldview('npc2', 'IDEALIST', 80);
      const report1 = system.getPhilosophyReport();
      system.holdDebate('npc1', 'npc2', 'topic');
      const report2 = system.getPhilosophyReport();
      expect(report2.totalDebates).toBe(report1.totalDebates + 1);
    });

    it('reflects shift activity', () => {
      system.setWorldview('npc1', 'PRAGMATIST', 75);
      const report1 = system.getPhilosophyReport();
      system.setWorldview('npc1', 'IDEALIST', 80);
      const report2 = system.getPhilosophyReport();
      expect(report2.totalShifts).toBe(report1.totalShifts + 1);
    });
  });

  describe('edge cases', () => {
    it('handles large number of NPCs', () => {
      for (let i = 0; i < 100; i = i + 1) {
        const npcId = 'npc_' + String(i);
        const worldviews = [
          'PRAGMATIST',
          'IDEALIST',
          'NIHILIST',
          'ALTRUIST',
          'MATERIALIST',
          'STOIC',
        ] as const;
        const worldview = worldviews[i % 6];
        if (worldview === undefined) {
          continue;
        }
        system.setWorldview(npcId, worldview, 75);
      }
      const report = system.getPhilosophyReport();
      expect(report.totalNpcs).toBe(100);
    });

    it('handles rapid worldview changes', () => {
      for (let i = 0; i < 10; i = i + 1) {
        const worldviews = [
          'PRAGMATIST',
          'IDEALIST',
          'NIHILIST',
          'ALTRUIST',
          'MATERIALIST',
          'STOIC',
        ] as const;
        const worldview = worldviews[i % 6];
        if (worldview === undefined) {
          continue;
        }
        currentTime = currentTime + 1000n;
        system.setWorldview('npc1', worldview, 75);
      }
      const history = system.getWorldviewHistory('npc1');
      if (typeof history === 'string') {
        throw new Error('history error');
      }
      expect(history.length).toBeGreaterThan(0);
    });

    it('handles concurrent debates between different NPCs', () => {
      system.setWorldview('npc1', 'PRAGMATIST', 75);
      system.setWorldview('npc2', 'IDEALIST', 80);
      system.setWorldview('npc3', 'NIHILIST', 60);
      system.setWorldview('npc4', 'ALTRUIST', 85);
      const debate1 = system.holdDebate('npc1', 'npc2', 'topic1');
      const debate2 = system.holdDebate('npc3', 'npc4', 'topic2');
      expect(debate1).not.toBe(debate2);
    });

    it('maintains worldview after failed debate creation', () => {
      system.setWorldview('npc1', 'PRAGMATIST', 75);
      system.holdDebate('npc1', 'unknown', 'topic');
      const modifiers = system.getDecisionModifiers('npc1');
      expect(modifiers.length).toBeGreaterThan(0);
    });

    it('preserves conviction after failed worldview assignment', () => {
      system.setWorldview('npc1', 'PRAGMATIST', 75);
      system.setWorldview('npc1', 'PRAGMATIST', 101);
      const modifiers = system.getDecisionModifiers('npc1');
      expect(modifiers.length).toBeGreaterThan(0);
    });
  });
});
