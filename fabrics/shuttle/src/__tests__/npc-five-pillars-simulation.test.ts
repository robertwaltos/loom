/**
 * NPC Five-Pillar Architecture — Simulation Tests
 *
 * Exercises the pillar profile validation: complete profiles, missing
 * individual pillars, empty descriptions, and mixed error cases.
 */

import { describe, it, expect } from 'vitest';
import { validatePillarProfile } from '../npc-five-pillars.js';
import type {
  FivePillarProfile,
  NpcWound,
  NpcLimitation,
  NpcCompetence,
  NpcQuestion,
  NpcSecret,
} from '../npc-five-pillars.js';

// ── Helpers ──────────────────────────────────────────────────────

function makeWound(overrides: Partial<NpcWound> = {}): NpcWound {
  return {
    description: overrides.description ?? 'Lost family in the war',
    origin: overrides.origin ?? 'childhood trauma',
    behavioralEffect: overrides.behavioralEffect ?? 'avoids attachment',
  };
}

function makeLimitation(overrides: Partial<NpcLimitation> = {}): NpcLimitation {
  return {
    description: overrides.description ?? 'Cannot read or write',
    scope: overrides.scope ?? 'cognitive',
    canBeOvercome: overrides.canBeOvercome ?? true,
  };
}

function makeCompetence(overrides: Partial<NpcCompetence> = {}): NpcCompetence {
  return {
    domain: overrides.domain ?? 'herbalism',
    proficiencyLevel: overrides.proficiencyLevel ?? 'expert',
    isRecognized: overrides.isRecognized ?? true,
  };
}

function makeQuestion(overrides: Partial<NpcQuestion> = {}): NpcQuestion {
  return {
    text: overrides.text ?? 'Am I worthy of forgiveness?',
    theme: overrides.theme ?? 'morality',
    canBeResolved: overrides.canBeResolved ?? true,
  };
}

function makeSecret(overrides: Partial<NpcSecret> = {}): NpcSecret {
  return {
    content: overrides.content ?? 'Poisoned the well during the siege',
    severity: overrides.severity ?? 'significant',
    discoverable: overrides.discoverable ?? true,
    triggerCondition: 'triggerCondition' in overrides
      ? overrides.triggerCondition!
      : 'player finds the journal',
  };
}

function makeFullProfile(overrides: Partial<FivePillarProfile> = {}): FivePillarProfile {
  return {
    npcId: overrides.npcId ?? 'npc-001',
    wound: overrides.wound ?? makeWound(),
    limitation: overrides.limitation ?? makeLimitation(),
    competence: overrides.competence ?? makeCompetence(),
    question: overrides.question ?? makeQuestion(),
    secret: overrides.secret ?? makeSecret(),
  };
}

// ── Tests ────────────────────────────────────────────────────────

describe('NPC Five-Pillar Architecture', () => {
  describe('validatePillarProfile', () => {
    it('returns no errors for a complete valid profile', () => {
      const profile = makeFullProfile();
      const errors = validatePillarProfile(profile);
      expect(errors).toEqual([]);
    });

    it('reports MISSING_WOUND when wound is absent', () => {
      const errors = validatePillarProfile({ ...makeFullProfile(), wound: undefined });
      expect(errors).toContain('MISSING_WOUND');
    });

    it('reports MISSING_LIMITATION when limitation is absent', () => {
      const errors = validatePillarProfile({ ...makeFullProfile(), limitation: undefined });
      expect(errors).toContain('MISSING_LIMITATION');
    });

    it('reports MISSING_COMPETENCE when competence is absent', () => {
      const errors = validatePillarProfile({ ...makeFullProfile(), competence: undefined });
      expect(errors).toContain('MISSING_COMPETENCE');
    });

    it('reports MISSING_QUESTION when question is absent', () => {
      const errors = validatePillarProfile({ ...makeFullProfile(), question: undefined });
      expect(errors).toContain('MISSING_QUESTION');
    });

    it('reports MISSING_SECRET when secret is absent', () => {
      const errors = validatePillarProfile({ ...makeFullProfile(), secret: undefined });
      expect(errors).toContain('MISSING_SECRET');
    });

    it('reports all five missing errors for empty profile', () => {
      const errors = validatePillarProfile({});
      expect(errors).toHaveLength(5);
      expect(errors).toContain('MISSING_WOUND');
      expect(errors).toContain('MISSING_LIMITATION');
      expect(errors).toContain('MISSING_COMPETENCE');
      expect(errors).toContain('MISSING_QUESTION');
      expect(errors).toContain('MISSING_SECRET');
    });

    it('reports EMPTY_DESCRIPTION for wound with empty description', () => {
      const profile = makeFullProfile({ wound: makeWound({ description: '' }) });
      const errors = validatePillarProfile(profile);
      expect(errors).toContain('EMPTY_DESCRIPTION');
    });

    it('reports EMPTY_DESCRIPTION for limitation with empty description', () => {
      const profile = makeFullProfile({ limitation: makeLimitation({ description: '' }) });
      const errors = validatePillarProfile(profile);
      expect(errors).toContain('EMPTY_DESCRIPTION');
    });

    it('reports EMPTY_DESCRIPTION for competence with empty domain', () => {
      const profile = makeFullProfile({ competence: makeCompetence({ domain: '' }) });
      const errors = validatePillarProfile(profile);
      expect(errors).toContain('EMPTY_DESCRIPTION');
    });

    it('reports EMPTY_DESCRIPTION for question with empty text', () => {
      const profile = makeFullProfile({ question: makeQuestion({ text: '' }) });
      const errors = validatePillarProfile(profile);
      expect(errors).toContain('EMPTY_DESCRIPTION');
    });

    it('reports EMPTY_DESCRIPTION for secret with empty content', () => {
      const profile = makeFullProfile({ secret: makeSecret({ content: '' }) });
      const errors = validatePillarProfile(profile);
      expect(errors).toContain('EMPTY_DESCRIPTION');
    });

    it('reports multiple EMPTY_DESCRIPTIONs for multiple empties', () => {
      const profile = makeFullProfile({
        wound: makeWound({ description: '' }),
        secret: makeSecret({ content: '' }),
      });
      const errors = validatePillarProfile(profile);
      const emptyCount = errors.filter(e => e === 'EMPTY_DESCRIPTION').length;
      expect(emptyCount).toBe(2);
    });

    it('reports both missing and empty errors together', () => {
      const errors = validatePillarProfile({
        wound: makeWound({ description: '' }),
        // limitation, competence, question, secret all missing
      });
      expect(errors).toContain('EMPTY_DESCRIPTION');
      expect(errors).toContain('MISSING_LIMITATION');
      expect(errors).toContain('MISSING_COMPETENCE');
      expect(errors).toContain('MISSING_QUESTION');
      expect(errors).toContain('MISSING_SECRET');
    });
  });

  // ── Type Structure ────────────────────────────────────────────

  describe('pillar type integrity', () => {
    it('wound has description, origin, and behavioralEffect', () => {
      const wound = makeWound();
      expect(wound.description).toBeTruthy();
      expect(wound.origin).toBeTruthy();
      expect(wound.behavioralEffect).toBeTruthy();
    });

    it('limitation has all scopes', () => {
      const scopes = ['physical', 'social', 'cognitive', 'moral'] as const;
      for (const scope of scopes) {
        const lim = makeLimitation({ scope });
        expect(lim.scope).toBe(scope);
      }
    });

    it('competence has all proficiency levels', () => {
      const levels = ['capable', 'skilled', 'expert', 'master'] as const;
      for (const level of levels) {
        const comp = makeCompetence({ proficiencyLevel: level });
        expect(comp.proficiencyLevel).toBe(level);
      }
    });

    it('question has all themes', () => {
      const themes = ['identity', 'purpose', 'morality', 'belonging', 'legacy'] as const;
      for (const theme of themes) {
        const q = makeQuestion({ theme });
        expect(q.theme).toBe(theme);
      }
    });

    it('secret has all severity levels', () => {
      const severities = ['minor', 'significant', 'world_altering'] as const;
      for (const severity of severities) {
        const s = makeSecret({ severity });
        expect(s.severity).toBe(severity);
      }
    });

    it('secret supports null triggerCondition', () => {
      const s = makeSecret({ triggerCondition: null });
      expect(s.triggerCondition).toBeNull();
    });
  });
});
