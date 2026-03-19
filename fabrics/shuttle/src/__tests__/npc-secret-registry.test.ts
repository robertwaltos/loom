import { describe, it, expect, beforeEach } from 'vitest';
import {
  NPC_SECRETS,
  getSecret,
  getSecretsByConsequence,
  getSecretsForChar,
  SECRET_COUNT,
  type NpcSecret,
  type SecretConsequence,
} from '../npc-secret-registry.js';

describe('npc-secret-registry', () => {
  describe('NPC_SECRETS constant', () => {
    it('contains exactly SECRET_COUNT entries', () => {
      expect(NPC_SECRETS.length).toBe(SECRET_COUNT);
    });

    it('has SECRET_COUNT equal to 24', () => {
      expect(SECRET_COUNT).toBe(24);
    });

    it('every entry has pillar set to SECRET', () => {
      for (const s of NPC_SECRETS) {
        expect(s.pillar).toBe('SECRET');
      }
    });

    it('all ids are unique', () => {
      const ids = NPC_SECRETS.map((s) => s.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it('every entry has a non-empty secret string', () => {
      for (const s of NPC_SECRETS) {
        expect(s.secret.length).toBeGreaterThan(0);
      }
    });

    it('every entry has a non-empty revealedConsequence', () => {
      for (const s of NPC_SECRETS) {
        expect(s.revealedConsequence.length).toBeGreaterThan(0);
      }
    });

    it('every entry has a valid consequence type', () => {
      const validConsequences: ReadonlyArray<SecretConsequence> = [
        'political',
        'economic',
        'social',
        'historical',
        'structural',
      ];
      for (const s of NPC_SECRETS) {
        expect(validConsequences).toContain(s.consequence);
      }
    });
  });

  describe('getSecret', () => {
    it('returns the correct entry for ID_SEC_001', () => {
      const result = getSecret('ID_SEC_001');
      expect(result).toBeDefined();
      if (result) {
        expect(result.charName).toBe('Speaker Chidi Okafor-Vasquez');
        expect(result.consequence).toBe('historical');
      }
    });

    it('returns undefined for an unknown id', () => {
      expect(getSecret('ID_SEC_MISSING')).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(getSecret('')).toBeUndefined();
    });

    it('returns correct entry for last item ID_SEC_024', () => {
      const result = getSecret('ID_SEC_024');
      expect(result).toBeDefined();
      if (result) {
        expect(result.charName).toBe('Cartographer Yusuf');
        expect(result.consequence).toBe('historical');
      }
    });
  });

  describe('getSecretsByConsequence', () => {
    it('returns political secrets', () => {
      const results = getSecretsByConsequence('political');
      expect(results.length).toBeGreaterThan(0);
      for (const s of results) {
        expect(s.consequence).toBe('political');
      }
    });

    it('returns historical secrets', () => {
      const results = getSecretsByConsequence('historical');
      expect(results.length).toBeGreaterThan(0);
      for (const s of results) {
        expect(s.consequence).toBe('historical');
      }
    });

    it('returns structural secrets', () => {
      const results = getSecretsByConsequence('structural');
      expect(results.length).toBeGreaterThan(0);
      for (const s of results) {
        expect(s.consequence).toBe('structural');
      }
    });

    it('returns social secrets', () => {
      const results = getSecretsByConsequence('social');
      expect(results.length).toBeGreaterThan(0);
      for (const s of results) {
        expect(s.consequence).toBe('social');
      }
    });

    it('returns empty for economic (none defined)', () => {
      const results = getSecretsByConsequence('economic');
      expect(results.length).toBe(0);
    });

    it('all consequence results sum to SECRET_COUNT', () => {
      const consequences: ReadonlyArray<SecretConsequence> = [
        'political',
        'economic',
        'social',
        'historical',
        'structural',
      ];
      let total = 0;
      for (const con of consequences) {
        total += getSecretsByConsequence(con).length;
      }
      expect(total).toBe(SECRET_COUNT);
    });
  });

  describe('getSecretsForChar', () => {
    it('returns secrets for charId 171', () => {
      const results = getSecretsForChar(171);
      expect(results.length).toBeGreaterThan(0);
      for (const s of results) {
        expect(s.charId).toBe(171);
      }
    });

    it('returns empty array for unknown charId', () => {
      expect(getSecretsForChar(999999)).toEqual([]);
    });

    it('does not match null charId entries', () => {
      expect(getSecretsForChar(0)).toEqual([]);
    });

    it('returns correct entry for charId 101', () => {
      const results = getSecretsForChar(101);
      expect(results.length).toBe(1);
      const first = results[0];
      if (first) {
        expect(first.id).toBe('ID_SEC_023');
      }
    });

    it('returns correct entry for charId 244', () => {
      const results = getSecretsForChar(244);
      expect(results.length).toBe(1);
      const first = results[0];
      if (first) {
        expect(first.id).toBe('ID_SEC_024');
      }
    });
  });
});
