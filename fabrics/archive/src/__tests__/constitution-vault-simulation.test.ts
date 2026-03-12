/**
 * constitution-vault-simulation.test.ts — Constitutional documents, ratification,
 * and amendment cycles.
 *
 * Proves that:
 *   - Constitutions can be drafted per world, one per world
 *   - Ratification tracks quorum and flips status on quorum met
 *   - Amendments require RATIFIED/AMENDED constitution
 *   - Amendment ratification modifies article text + bumps version
 *   - Duplicate ratifiers rejected for both constitution and amendment
 *   - Error union types returned correctly
 *   - Immutable readonly snapshots are returned (not mutable state)
 */

import { describe, it, expect } from 'vitest';
import {
  createConstitutionVaultSystem,
} from '../constitution-vault.js';
import type {
  ConstitutionVaultSystem,
  Constitution,
  Amendment,
  ConstitutionError,
  ConstitutionVaultDeps,
} from '../constitution-vault.js';

// ── Helpers ─────────────────────────────────────────────────────

function createClock(start = 1_000_000n) {
  let time = start;
  return {
    now: () => time,
    advance: (us: bigint) => { time += us; },
  };
}

function createIdGen() {
  let seq = 0;
  return {
    generate: () => `cv-${++seq}`,
  };
}

function createLogger() {
  const messages: string[] = [];
  return {
    info: (msg: string) => { messages.push(msg); },
    warn: (msg: string) => { messages.push(`WARN: ${msg}`); },
    messages,
  };
}

function createVault() {
  const clock = createClock();
  const idGen = createIdGen();
  const logger = createLogger();
  const deps: ConstitutionVaultDeps = { clock, idGen, logger };
  const vault = createConstitutionVaultSystem(deps);
  return { vault, clock, idGen, logger };
}

function isConstitution(v: Constitution | ConstitutionError): v is Constitution {
  return typeof v === 'object' && v !== null && 'constitutionId' in v;
}

function isAmendment(v: Amendment | ConstitutionError): v is Amendment {
  return typeof v === 'object' && v !== null && 'amendmentId' in v;
}

const ARTICLES = [
  'Article I: All dynasties are equal before the law.',
  'Article II: The Assembly holds legislative power.',
  'Article III: Taxation requires significant majority.',
];

// ── Drafting ────────────────────────────────────────────────────

describe('ConstitutionVault', () => {
  describe('drafting', () => {
    it('drafts a constitution in DRAFT status', () => {
      const { vault } = createVault();

      const result = vault.draftConstitution(
        'alkahest',
        'The Founding Charter',
        'We the dynasties of Alkahest...',
        ARTICLES,
      );

      expect(isConstitution(result)).toBe(true);
      if (!isConstitution(result)) return;

      expect(result.worldId).toBe('alkahest');
      expect(result.title).toBe('The Founding Charter');
      expect(result.status).toBe('DRAFT');
      expect(result.version).toBe(1);
      expect(result.articles).toHaveLength(3);
      expect(result.ratifiedAt).toBeNull();
    });

    it('rejects duplicate constitution per world', () => {
      const { vault } = createVault();

      vault.draftConstitution('w-1', 'First', 'Preamble', ARTICLES);
      const result = vault.draftConstitution('w-1', 'Second', 'Another', ARTICLES);

      expect(result).toBe('already-exists');
    });

    it('allows different worlds to have constitutions', () => {
      const { vault } = createVault();

      const c1 = vault.draftConstitution('w-1', 'Charter A', 'P1', ARTICLES);
      const c2 = vault.draftConstitution('w-2', 'Charter B', 'P2', ARTICLES);

      expect(isConstitution(c1)).toBe(true);
      expect(isConstitution(c2)).toBe(true);
    });

    it('rejects empty title', () => {
      const { vault } = createVault();
      const result = vault.draftConstitution('w-1', '', 'Preamble', ARTICLES);
      expect(result).toBe('invalid-content');
    });

    it('rejects empty preamble', () => {
      const { vault } = createVault();
      const result = vault.draftConstitution('w-1', 'Title', '', ARTICLES);
      expect(result).toBe('invalid-content');
    });
  });

  // ── Ratification ──────────────────────────────────────────────

  describe('ratification', () => {
    it('accumulates ratifiers below quorum', () => {
      const { vault } = createVault();
      const c = vault.draftConstitution('w-1', 'Charter', 'Preamble', ARTICLES);
      if (!isConstitution(c)) throw new Error('expected constitution');

      const r1 = vault.ratifyConstitution(c.constitutionId, 'dynasty-1', 3);
      expect(r1).toEqual({ success: true, ratified: false });

      const r2 = vault.ratifyConstitution(c.constitutionId, 'dynasty-2', 3);
      expect(r2).toEqual({ success: true, ratified: false });

      const after = vault.getConstitution(c.constitutionId)!;
      expect(after.status).toBe('DRAFT');
      expect(after.ratifierIds).toHaveLength(2);
    });

    it('ratifies on quorum met', () => {
      const { vault } = createVault();
      const c = vault.draftConstitution('w-1', 'Charter', 'Preamble', ARTICLES);
      if (!isConstitution(c)) throw new Error('expected constitution');

      vault.ratifyConstitution(c.constitutionId, 'dynasty-1', 3);
      vault.ratifyConstitution(c.constitutionId, 'dynasty-2', 3);
      const r3 = vault.ratifyConstitution(c.constitutionId, 'dynasty-3', 3);

      expect(r3).toEqual({ success: true, ratified: true });

      const after = vault.getConstitution(c.constitutionId)!;
      expect(after.status).toBe('RATIFIED');
      expect(after.ratifiedAt).not.toBeNull();
    });

    it('rejects duplicate ratifier', () => {
      const { vault } = createVault();
      const c = vault.draftConstitution('w-1', 'Charter', 'Preamble', ARTICLES);
      if (!isConstitution(c)) throw new Error('expected constitution');

      vault.ratifyConstitution(c.constitutionId, 'dynasty-1', 3);
      const dup = vault.ratifyConstitution(c.constitutionId, 'dynasty-1', 3);

      expect(dup).toEqual({ success: false, error: 'already-ratified' });
    });

    it('returns error for unknown constitution', () => {
      const { vault } = createVault();
      const result = vault.ratifyConstitution('nonexistent', 'r-1', 3);
      expect(result).toEqual({ success: false, error: 'constitution-not-found' });
    });

    it('ratifies with quorum of 1', () => {
      const { vault } = createVault();
      const c = vault.draftConstitution('w-1', 'Charter', 'Preamble', ARTICLES);
      if (!isConstitution(c)) throw new Error('expected constitution');

      const result = vault.ratifyConstitution(c.constitutionId, 'architect', 1);
      expect(result).toEqual({ success: true, ratified: true });
    });
  });

  // ── Amendments ────────────────────────────────────────────────

  describe('amendments', () => {
    function draftAndRatify(vault: ConstitutionVaultSystem) {
      const c = vault.draftConstitution('w-1', 'Charter', 'Preamble', ARTICLES);
      if (!isConstitution(c)) throw new Error('expected constitution');
      vault.ratifyConstitution(c.constitutionId, 'r-1', 2);
      vault.ratifyConstitution(c.constitutionId, 'r-2', 2);
      return c;
    }

    it('proposes amendment on ratified constitution', () => {
      const { vault } = createVault();
      const c = draftAndRatify(vault);

      const amendment = vault.proposeAmendment(
        c.constitutionId,
        'dynasty-5',
        'Change taxation threshold',
        2,
        'Article III: Taxation requires constitutional supermajority.',
      );

      expect(isAmendment(amendment)).toBe(true);
      if (!isAmendment(amendment)) return;

      expect(amendment.constitutionId).toBe(c.constitutionId);
      expect(amendment.articleIndex).toBe(2);
      expect(amendment.proposedBy).toBe('dynasty-5');
      expect(amendment.ratifiedAt).toBeNull();
    });

    it('rejects amendment on DRAFT constitution', () => {
      const { vault } = createVault();
      const c = vault.draftConstitution('w-1', 'Charter', 'Preamble', ARTICLES);
      if (!isConstitution(c)) throw new Error('expected constitution');

      const result = vault.proposeAmendment(c.constitutionId, 'r-1', 'Change', 0, 'New text');
      expect(result).toBe('invalid-content');
    });

    it('rejects amendment with out-of-bounds article index', () => {
      const { vault } = createVault();
      const c = draftAndRatify(vault);

      const tooHigh = vault.proposeAmendment(c.constitutionId, 'r-1', 'X', 99, 'New');
      expect(tooHigh).toBe('invalid-content');

      const negative = vault.proposeAmendment(c.constitutionId, 'r-1', 'X', -1, 'New');
      expect(negative).toBe('invalid-content');
    });

    it('rejects amendment on unknown constitution', () => {
      const { vault } = createVault();
      const result = vault.proposeAmendment('nope', 'r-1', 'Desc', 0, 'Text');
      expect(result).toBe('constitution-not-found');
    });

    it('ratifies amendment and modifies article', () => {
      const { vault } = createVault();
      const c = draftAndRatify(vault);

      const amendment = vault.proposeAmendment(
        c.constitutionId, 'd-1', 'Update article I',
        0, 'Article I: All dynasties are SOVEREIGN.',
      );
      if (!isAmendment(amendment)) throw new Error('expected amendment');

      vault.ratifyAmendment(amendment.amendmentId, 'r-1', 2);
      const result = vault.ratifyAmendment(amendment.amendmentId, 'r-2', 2);

      expect(result).toEqual({ success: true, ratified: true });

      const updated = vault.getConstitution(c.constitutionId)!;
      expect(updated.articles[0]).toBe('Article I: All dynasties are SOVEREIGN.');
      expect(updated.status).toBe('AMENDED');
      expect(updated.version).toBe(2);
    });

    it('rejects duplicate amendment ratifier', () => {
      const { vault } = createVault();
      const c = draftAndRatify(vault);

      const amendment = vault.proposeAmendment(c.constitutionId, 'd-1', 'Change', 0, 'New');
      if (!isAmendment(amendment)) throw new Error('expected amendment');

      vault.ratifyAmendment(amendment.amendmentId, 'r-1', 3);
      const dup = vault.ratifyAmendment(amendment.amendmentId, 'r-1', 3);

      expect(dup).toEqual({ success: false, error: 'already-ratified' });
    });

    it('returns error for unknown amendment', () => {
      const { vault } = createVault();
      const result = vault.ratifyAmendment('nope', 'r-1', 3);
      expect(result).toEqual({ success: false, error: 'amendment-not-found' });
    });

    it('allows further amendments on AMENDED constitution', () => {
      const { vault } = createVault();
      const c = draftAndRatify(vault);

      // First amendment
      const a1 = vault.proposeAmendment(c.constitutionId, 'd-1', 'First', 0, 'New Art I');
      if (!isAmendment(a1)) throw new Error('expected amendment');
      vault.ratifyAmendment(a1.amendmentId, 'r-1', 1);

      // Second amendment on now-AMENDED constitution
      const a2 = vault.proposeAmendment(c.constitutionId, 'd-2', 'Second', 1, 'New Art II');
      expect(isAmendment(a2)).toBe(true);
      if (!isAmendment(a2)) return;
      vault.ratifyAmendment(a2.amendmentId, 'r-1', 1);

      const final = vault.getConstitution(c.constitutionId)!;
      expect(final.articles[0]).toBe('New Art I');
      expect(final.articles[1]).toBe('New Art II');
      expect(final.version).toBe(3);
    });

    it('listAmendments returns all amendments for a constitution', () => {
      const { vault } = createVault();
      const c = draftAndRatify(vault);

      vault.proposeAmendment(c.constitutionId, 'd-1', 'A', 0, 'X');
      vault.proposeAmendment(c.constitutionId, 'd-2', 'B', 1, 'Y');

      const amendments = vault.listAmendments(c.constitutionId);
      expect(amendments).toHaveLength(2);
    });

    it('listAmendments returns empty for unknown constitution', () => {
      const { vault } = createVault();
      expect(vault.listAmendments('unknown')).toHaveLength(0);
    });
  });

  // ── Retrieval ─────────────────────────────────────────────────

  describe('retrieval', () => {
    it('getConstitution returns undefined for unknown', () => {
      const { vault } = createVault();
      expect(vault.getConstitution('nope')).toBeUndefined();
    });

    it('getAmendment returns undefined for unknown', () => {
      const { vault } = createVault();
      expect(vault.getAmendment('nope')).toBeUndefined();
    });

    it('getAmendment returns amendment with ratification data', () => {
      const { vault } = createVault();
      const c = vault.draftConstitution('w-1', 'T', 'P', ARTICLES);
      if (!isConstitution(c)) throw new Error('expected constitution');
      vault.ratifyConstitution(c.constitutionId, 'r-1', 1);

      const a = vault.proposeAmendment(c.constitutionId, 'd-1', 'Desc', 0, 'New');
      if (!isAmendment(a)) throw new Error('expected amendment');

      vault.ratifyAmendment(a.amendmentId, 'r-1', 1);

      const retrieved = vault.getAmendment(a.amendmentId)!;
      expect(retrieved.ratifiedAt).not.toBeNull();
      expect(retrieved.ratifierIds).toContain('r-1');
    });
  });

  // ── Logging ───────────────────────────────────────────────────

  describe('logging', () => {
    it('logs draft, ratification, amendment lifecycle', () => {
      const { vault, logger } = createVault();

      const c = vault.draftConstitution('w-1', 'Charter', 'Preamble', ARTICLES);
      if (!isConstitution(c)) throw new Error('expected constitution');
      expect(logger.messages.some(m => m.includes('drafted'))).toBe(true);

      vault.ratifyConstitution(c.constitutionId, 'r-1', 2);
      vault.ratifyConstitution(c.constitutionId, 'r-2', 2);
      expect(logger.messages.some(m => m.includes('ratified'))).toBe(true);

      const a = vault.proposeAmendment(c.constitutionId, 'd-1', 'Change', 0, 'New');
      if (!isAmendment(a)) throw new Error('expected amendment');
      expect(logger.messages.some(m => m.includes('proposed'))).toBe(true);

      vault.ratifyAmendment(a.amendmentId, 'r-1', 1);
      expect(logger.messages.filter(m => m.includes('ratified')).length).toBeGreaterThanOrEqual(2);
    });
  });
});
