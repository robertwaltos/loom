import { describe, it, expect } from 'vitest';
import { createConstitutionVaultSystem } from '../constitution-vault.js';
import type { ConstitutionVaultSystem, Constitution, Amendment } from '../constitution-vault.js';

// ============================================================================
// HELPERS
// ============================================================================

function makeDeps() {
  let time = 1_000_000n;
  let counter = 0;
  const logs: string[] = [];
  return {
    clock: { now: () => time },
    idGen: {
      generate: () => {
        counter += 1;
        return 'id-' + String(counter);
      },
    },
    logger: {
      info: (msg: string) => {
        logs.push('INFO: ' + msg);
      },
      warn: (msg: string) => {
        logs.push('WARN: ' + msg);
      },
    },
    advance: (us: bigint) => {
      time += us;
    },
    getLogs: () => logs,
  };
}

function makeVault(): { vault: ConstitutionVaultSystem; deps: ReturnType<typeof makeDeps> } {
  const deps = makeDeps();
  return { vault: createConstitutionVaultSystem(deps), deps };
}

function isConstitution(r: Constitution | string): r is Constitution {
  return typeof r !== 'string';
}

function isAmendment(r: Amendment | string): r is Amendment {
  return typeof r !== 'string';
}

const ARTICLES = ['Article I: Sovereignty', 'Article II: Assembly', 'Article III: Commerce'];

// ============================================================================
// draftConstitution
// ============================================================================

describe('draftConstitution', () => {
  it('drafts a constitution for a world', () => {
    const { vault } = makeVault();
    const result = vault.draftConstitution(
      'world-1',
      'The Loom Charter',
      'We the people...',
      ARTICLES,
    );
    expect(isConstitution(result)).toBe(true);
    if (!isConstitution(result)) return;
    expect(result.worldId).toBe('world-1');
    expect(result.title).toBe('The Loom Charter');
    expect(result.status).toBe('DRAFT');
    expect(result.version).toBe(1);
    expect(result.ratifierIds).toHaveLength(0);
    expect(result.ratifiedAt).toBeNull();
  });

  it('returns already-exists for duplicate worldId', () => {
    const { vault } = makeVault();
    vault.draftConstitution('world-1', 'Charter A', 'preamble A', ARTICLES);
    const result = vault.draftConstitution('world-1', 'Charter B', 'preamble B', ARTICLES);
    expect(result).toBe('already-exists');
  });

  it('returns invalid-content for empty title', () => {
    const { vault } = makeVault();
    const result = vault.draftConstitution('world-1', '', 'preamble', ARTICLES);
    expect(result).toBe('invalid-content');
  });

  it('returns invalid-content for empty preamble', () => {
    const { vault } = makeVault();
    const result = vault.draftConstitution('world-1', 'Title', '', ARTICLES);
    expect(result).toBe('invalid-content');
  });

  it('stores articles correctly', () => {
    const { vault } = makeVault();
    const result = vault.draftConstitution('world-1', 'Title', 'Preamble', ARTICLES);
    if (!isConstitution(result)) return;
    expect(result.articles).toHaveLength(3);
    expect(result.articles[0]).toBe('Article I: Sovereignty');
  });
});

// ============================================================================
// ratifyConstitution
// ============================================================================

describe('ratifyConstitution', () => {
  it('adds a ratifier and returns ratified=false below quorum', () => {
    const { vault } = makeVault();
    const c = vault.draftConstitution('world-1', 'Charter', 'Preamble', ARTICLES);
    if (!isConstitution(c)) return;

    const result = vault.ratifyConstitution(c.constitutionId, 'ratifier-1', 3);
    expect(result).toEqual({ success: true, ratified: false });

    const updated = vault.getConstitution(c.constitutionId);
    expect(updated?.status).toBe('DRAFT');
    expect(updated?.ratifierIds).toHaveLength(1);
  });

  it('ratifies when quorum is met', () => {
    const { vault } = makeVault();
    const c = vault.draftConstitution('world-1', 'Charter', 'Preamble', ARTICLES);
    if (!isConstitution(c)) return;

    vault.ratifyConstitution(c.constitutionId, 'r1', 2);
    const result = vault.ratifyConstitution(c.constitutionId, 'r2', 2);
    expect(result).toEqual({ success: true, ratified: true });

    const updated = vault.getConstitution(c.constitutionId);
    expect(updated?.status).toBe('RATIFIED');
    expect(updated?.ratifiedAt).not.toBeNull();
  });

  it('returns already-ratified for duplicate ratifier', () => {
    const { vault } = makeVault();
    const c = vault.draftConstitution('world-1', 'Charter', 'Preamble', ARTICLES);
    if (!isConstitution(c)) return;

    vault.ratifyConstitution(c.constitutionId, 'r1', 3);
    const result = vault.ratifyConstitution(c.constitutionId, 'r1', 3);
    expect(result).toEqual({ success: false, error: 'already-ratified' });
  });

  it('returns constitution-not-found for unknown id', () => {
    const { vault } = makeVault();
    const result = vault.ratifyConstitution('unknown', 'r1', 1);
    expect(result).toEqual({ success: false, error: 'constitution-not-found' });
  });
});

// ============================================================================
// proposeAmendment
// ============================================================================

describe('proposeAmendment', () => {
  function makeRatifiedConstitution(vault: ConstitutionVaultSystem) {
    const c = vault.draftConstitution('world-1', 'Charter', 'Preamble', ARTICLES);
    if (!isConstitution(c)) throw new Error('setup failed');
    vault.ratifyConstitution(c.constitutionId, 'r1', 1);
    return c.constitutionId;
  }

  it('proposes an amendment to a ratified constitution', () => {
    const { vault } = makeVault();
    const cId = makeRatifiedConstitution(vault);
    const result = vault.proposeAmendment(
      cId,
      'r1',
      'Update sovereignty',
      0,
      'Article I: Enhanced Sovereignty',
    );
    expect(isAmendment(result)).toBe(true);
    if (!isAmendment(result)) return;
    expect(result.constitutionId).toBe(cId);
    expect(result.articleIndex).toBe(0);
    expect(result.ratifiedAt).toBeNull();
  });

  it('returns constitution-not-found for unknown constitution', () => {
    const { vault } = makeVault();
    const result = vault.proposeAmendment('nope', 'r1', 'desc', 0, 'text');
    expect(result).toBe('constitution-not-found');
  });

  it('returns invalid-content for DRAFT constitution', () => {
    const { vault } = makeVault();
    const c = vault.draftConstitution('world-1', 'Charter', 'Preamble', ARTICLES);
    if (!isConstitution(c)) return;
    const result = vault.proposeAmendment(c.constitutionId, 'r1', 'desc', 0, 'text');
    expect(result).toBe('invalid-content');
  });

  it('returns invalid-content for out-of-bounds articleIndex', () => {
    const { vault } = makeVault();
    const cId = makeRatifiedConstitution(vault);
    const result = vault.proposeAmendment(cId, 'r1', 'desc', 99, 'text');
    expect(result).toBe('invalid-content');
  });

  it('returns invalid-content for negative articleIndex', () => {
    const { vault } = makeVault();
    const cId = makeRatifiedConstitution(vault);
    const result = vault.proposeAmendment(cId, 'r1', 'desc', -1, 'text');
    expect(result).toBe('invalid-content');
  });
});

// ============================================================================
// ratifyAmendment
// ============================================================================

describe('ratifyAmendment', () => {
  function makeAmendment(vault: ConstitutionVaultSystem) {
    const c = vault.draftConstitution('world-1', 'Charter', 'Preamble', ARTICLES);
    if (!isConstitution(c)) throw new Error('setup failed');
    vault.ratifyConstitution(c.constitutionId, 'r1', 1);
    const amendment = vault.proposeAmendment(c.constitutionId, 'r1', 'Update', 0, 'New Article I');
    if (!isAmendment(amendment)) throw new Error('amendment setup failed');
    return { constitutionId: c.constitutionId, amendmentId: amendment.amendmentId };
  }

  it('ratifies an amendment when quorum is met', () => {
    const { vault } = makeVault();
    const { constitutionId, amendmentId } = makeAmendment(vault);
    const result = vault.ratifyAmendment(amendmentId, 'r1', 1);
    expect(result).toEqual({ success: true, ratified: true });

    const updated = vault.getConstitution(constitutionId);
    expect(updated?.status).toBe('AMENDED');
    expect(updated?.version).toBe(2);
    expect(updated?.articles[0]).toBe('New Article I');
  });

  it('does not ratify below quorum', () => {
    const { vault } = makeVault();
    const { amendmentId } = makeAmendment(vault);
    const result = vault.ratifyAmendment(amendmentId, 'r1', 3);
    expect(result).toEqual({ success: true, ratified: false });
  });

  it('returns already-ratified for duplicate ratifier', () => {
    const { vault } = makeVault();
    const { amendmentId } = makeAmendment(vault);
    vault.ratifyAmendment(amendmentId, 'r1', 3);
    const result = vault.ratifyAmendment(amendmentId, 'r1', 3);
    expect(result).toEqual({ success: false, error: 'already-ratified' });
  });

  it('returns amendment-not-found for unknown amendment', () => {
    const { vault } = makeVault();
    const result = vault.ratifyAmendment('nope', 'r1', 1);
    expect(result).toEqual({ success: false, error: 'amendment-not-found' });
  });

  it('increments constitution version per amendment', () => {
    const { vault } = makeVault();
    const { constitutionId } = makeAmendment(vault);
    const a2 = vault.proposeAmendment(constitutionId, 'r1', 'Update 2', 1, 'New Article II');
    if (!isAmendment(a2)) return;
    vault.ratifyAmendment(a2.amendmentId, 'r1', 1);

    const updated = vault.getConstitution(constitutionId);
    expect(updated?.version).toBe(2);
  });
});

// ============================================================================
// listAmendments / getAmendment
// ============================================================================

describe('listAmendments and getAmendment', () => {
  it('lists amendments for a constitution', () => {
    const { vault } = makeVault();
    const c = vault.draftConstitution('world-1', 'Charter', 'Preamble', ARTICLES);
    if (!isConstitution(c)) return;
    vault.ratifyConstitution(c.constitutionId, 'r1', 1);
    vault.proposeAmendment(c.constitutionId, 'r1', 'A1', 0, 'New I');
    vault.proposeAmendment(c.constitutionId, 'r1', 'A2', 1, 'New II');

    expect(vault.listAmendments(c.constitutionId)).toHaveLength(2);
  });

  it('returns empty for constitution with no amendments', () => {
    const { vault } = makeVault();
    const c = vault.draftConstitution('world-1', 'Charter', 'Preamble', ARTICLES);
    if (!isConstitution(c)) return;
    expect(vault.listAmendments(c.constitutionId)).toHaveLength(0);
  });

  it('returns undefined for unknown constitutionId in getConstitution', () => {
    const { vault } = makeVault();
    expect(vault.getConstitution('nope')).toBeUndefined();
  });

  it('returns undefined for unknown amendmentId in getAmendment', () => {
    const { vault } = makeVault();
    expect(vault.getAmendment('nope')).toBeUndefined();
  });

  it('allows amendments to AMENDED constitution', () => {
    const { vault } = makeVault();
    const c = vault.draftConstitution('world-1', 'Charter', 'Preamble', ARTICLES);
    if (!isConstitution(c)) return;
    vault.ratifyConstitution(c.constitutionId, 'r1', 1);

    const a1 = vault.proposeAmendment(c.constitutionId, 'r1', 'A1', 0, 'New I');
    if (!isAmendment(a1)) return;
    vault.ratifyAmendment(a1.amendmentId, 'r1', 1);

    const a2 = vault.proposeAmendment(c.constitutionId, 'r1', 'A2', 1, 'New II');
    expect(isAmendment(a2)).toBe(true);
  });
});
