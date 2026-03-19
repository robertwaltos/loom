import { describe, it, expect } from 'vitest';
import {
  createInheritanceLinkRegistry,
  addInheritanceLink,
  acknowledgeCompletion,
  generateCompletionEntry,
  getLinksForDynasty,
  getActiveChildLinks,
  countGenerationsSpanned,
} from '../dynasty-inheritance-chronicle.js';
import type {
  InheritanceLink,
  InheritanceLinkRegistry,
} from '../dynasty-inheritance-chronicle.js';

function makeLink(overrides: Partial<Omit<InheritanceLink, 'isActive' | 'completionAcknowledgedAtMs'>> = {}): Omit<InheritanceLink, 'isActive' | 'completionAcknowledgedAtMs'> {
  return {
    linkId: 'link-001',
    parentDynastyId: 'dynasty-parent',
    childDynastyId: 'dynasty-child',
    linkType: 'PARENT_CHILD',
    establishedAtIngameYear: 10,
    chronicleEntryId: null,
    ...overrides,
  };
}

function populatedRegistry(): InheritanceLinkRegistry {
  let reg = createInheritanceLinkRegistry();
  reg = addInheritanceLink(reg, makeLink({ linkId: 'link-001' }));
  return reg;
}

// ─── createInheritanceLinkRegistry ───────────────────────────────────────────

describe('createInheritanceLinkRegistry', () => {
  it('creates a registry with empty links', () => {
    const reg = createInheritanceLinkRegistry();
    expect(reg.links).toHaveLength(0);
  });
});

// ─── addInheritanceLink ───────────────────────────────────────────────────────

describe('addInheritanceLink', () => {
  it('adds a link to the registry', () => {
    const reg = addInheritanceLink(createInheritanceLinkRegistry(), makeLink());
    expect(reg.links).toHaveLength(1);
  });

  it('newly added link is active', () => {
    const reg = addInheritanceLink(createInheritanceLinkRegistry(), makeLink());
    expect(reg.links[0]?.isActive).toBe(true);
  });

  it('newly added link has null completionAcknowledgedAtMs', () => {
    const reg = addInheritanceLink(createInheritanceLinkRegistry(), makeLink());
    expect(reg.links[0]?.completionAcknowledgedAtMs).toBeNull();
  });

  it('adding multiple links accumulates them', () => {
    let reg = createInheritanceLinkRegistry();
    reg = addInheritanceLink(reg, makeLink({ linkId: 'l1' }));
    reg = addInheritanceLink(reg, makeLink({ linkId: 'l2' }));
    reg = addInheritanceLink(reg, makeLink({ linkId: 'l3' }));
    expect(reg.links).toHaveLength(3);
  });

  it('does not mutate the original registry', () => {
    const original = createInheritanceLinkRegistry();
    addInheritanceLink(original, makeLink());
    expect(original.links).toHaveLength(0);
  });

  it('link preserves all provided fields', () => {
    const reg = addInheritanceLink(
      createInheritanceLinkRegistry(),
      makeLink({
        linkId: 'lx',
        linkType: 'MENTOR_STUDENT',
        chronicleEntryId: 'chronicle-ref-42',
        establishedAtIngameYear: 55,
      }),
    );
    const link = reg.links[0]!;
    expect(link.linkType).toBe('MENTOR_STUDENT');
    expect(link.chronicleEntryId).toBe('chronicle-ref-42');
    expect(link.establishedAtIngameYear).toBe(55);
  });
});

// ─── acknowledgeCompletion ────────────────────────────────────────────────────

describe('acknowledgeCompletion', () => {
  it('marks the link as inactive', () => {
    const reg = populatedRegistry();
    const { registry: updated } = acknowledgeCompletion(reg, 'link-001', 1_000_000);
    const link = updated.links.find((l) => l.linkId === 'link-001');
    expect(link?.isActive).toBe(false);
  });

  it('sets completionAcknowledgedAtMs correctly', () => {
    const reg = populatedRegistry();
    const { registry: updated } = acknowledgeCompletion(reg, 'link-001', 999_999);
    const link = updated.links.find((l) => l.linkId === 'link-001');
    expect(link?.completionAcknowledgedAtMs).toBe(999_999);
  });

  it('returns a CompletionChronicleEntry', () => {
    const reg = populatedRegistry();
    const { completionEntry } = acknowledgeCompletion(reg, 'link-001', 1_000_000);
    expect(completionEntry).toBeDefined();
    expect(completionEntry.parentDynastyId).toBe('dynasty-parent');
    expect(completionEntry.childDynastyId).toBe('dynasty-child');
  });

  it('completion entry is permanently pinned and public', () => {
    const reg = populatedRegistry();
    const { completionEntry } = acknowledgeCompletion(reg, 'link-001', 1_000_000);
    expect(completionEntry.isPublic).toBe(true);
    expect(completionEntry.permanentlyPinned).toBe(true);
  });

  it('throws for unknown linkId', () => {
    const reg = createInheritanceLinkRegistry();
    expect(() => acknowledgeCompletion(reg, 'link-nonexistent', 0)).toThrow('not found');
  });

  it('throws when acknowledging an already-inactive link', () => {
    const reg = populatedRegistry();
    const { registry: updated } = acknowledgeCompletion(reg, 'link-001', 100);
    expect(() => acknowledgeCompletion(updated, 'link-001', 200)).toThrow('already inactive');
  });

  it('does not mutate the original registry', () => {
    const reg = populatedRegistry();
    acknowledgeCompletion(reg, 'link-001', 100);
    expect(reg.links[0]?.isActive).toBe(true);
  });
});

// ─── generateCompletionEntry ──────────────────────────────────────────────────

describe('generateCompletionEntry', () => {
  it('produces an entry with unique entryId', () => {
    const link: InheritanceLink = {
      ...makeLink(),
      isActive: false,
      completionAcknowledgedAtMs: 12345,
    };
    const entry = generateCompletionEntry(link, 12345);
    expect(entry.entryId).toContain('link-001');
    expect(entry.entryId).toContain('12345');
  });

  it('PARENT_CHILD body contains "lineage continues"', () => {
    const link: InheritanceLink = {
      ...makeLink({ linkType: 'PARENT_CHILD' }),
      isActive: false,
      completionAcknowledgedAtMs: 1,
    };
    const entry = generateCompletionEntry(link, 1);
    expect(entry.body).toContain('The lineage continues');
  });

  it('MENTOR_STUDENT body mentions knowledge transfer', () => {
    const link: InheritanceLink = {
      ...makeLink({ linkType: 'MENTOR_STUDENT' }),
      isActive: false,
      completionAcknowledgedAtMs: 1,
    };
    const entry = generateCompletionEntry(link, 1);
    expect(entry.body).toContain('knowledge');
  });

  it('FOUNDING_LINE body mentions founding', () => {
    const link: InheritanceLink = {
      ...makeLink({ linkType: 'FOUNDING_LINE' }),
      isActive: false,
      completionAcknowledgedAtMs: 1,
    };
    const entry = generateCompletionEntry(link, 1);
    expect(entry.body).toContain('founding');
  });

  it('title encodes parentDynastyId and linkType', () => {
    const link: InheritanceLink = {
      ...makeLink({ linkType: 'PARENT_CHILD' }),
      isActive: false,
      completionAcknowledgedAtMs: 1,
    };
    const entry = generateCompletionEntry(link, 1);
    expect(entry.title).toContain('dynasty-parent');
    expect(entry.title).toContain('PARENT_CHILD');
  });
});

// ─── getLinksForDynasty ───────────────────────────────────────────────────────

describe('getLinksForDynasty', () => {
  it('returns links where dynasty is parent or child', () => {
    let reg = createInheritanceLinkRegistry();
    reg = addInheritanceLink(reg, makeLink({ linkId: 'l1', parentDynastyId: 'p1', childDynastyId: 'c1' }));
    reg = addInheritanceLink(reg, makeLink({ linkId: 'l2', parentDynastyId: 'p2', childDynastyId: 'p1' }));
    reg = addInheritanceLink(reg, makeLink({ linkId: 'l3', parentDynastyId: 'other', childDynastyId: 'other' }));
    const links = getLinksForDynasty(reg, 'p1');
    expect(links).toHaveLength(2);
  });

  it('returns empty array for dynasty not in any link', () => {
    const reg = populatedRegistry();
    expect(getLinksForDynasty(reg, 'dynasty-unknown')).toHaveLength(0);
  });
});

// ─── getActiveChildLinks ──────────────────────────────────────────────────────

describe('getActiveChildLinks', () => {
  it('returns active child links for a parent', () => {
    let reg = createInheritanceLinkRegistry();
    reg = addInheritanceLink(reg, makeLink({ linkId: 'l1', parentDynastyId: 'p', childDynastyId: 'c1' }));
    reg = addInheritanceLink(reg, makeLink({ linkId: 'l2', parentDynastyId: 'p', childDynastyId: 'c2' }));
    const { registry: updatedReg } = acknowledgeCompletion(reg, 'l2', 0);
    const active = getActiveChildLinks(updatedReg, 'p');
    expect(active).toHaveLength(1);
    expect(active[0]?.linkId).toBe('l1');
  });

  it('returns empty for unknown parent', () => {
    const reg = populatedRegistry();
    expect(getActiveChildLinks(reg, 'nobody')).toHaveLength(0);
  });
});

// ─── countGenerationsSpanned ──────────────────────────────────────────────────

describe('countGenerationsSpanned', () => {
  it('returns 0 for a root with no children', () => {
    const reg = createInheritanceLinkRegistry();
    expect(countGenerationsSpanned(reg, 'root')).toBe(0);
  });

  it('returns 1 for root with one child', () => {
    let reg = createInheritanceLinkRegistry();
    reg = addInheritanceLink(reg, makeLink({ linkId: 'l1', parentDynastyId: 'root', childDynastyId: 'child' }));
    expect(countGenerationsSpanned(reg, 'root')).toBe(1);
  });

  it('counts 2 for root → child → grandchild chain', () => {
    let reg = createInheritanceLinkRegistry();
    reg = addInheritanceLink(reg, makeLink({ linkId: 'l1', parentDynastyId: 'root', childDynastyId: 'child' }));
    reg = addInheritanceLink(reg, makeLink({ linkId: 'l2', parentDynastyId: 'child', childDynastyId: 'grandchild' }));
    expect(countGenerationsSpanned(reg, 'root')).toBe(2);
  });

  it('counts 3 for a 4-generation chain', () => {
    let reg = createInheritanceLinkRegistry();
    reg = addInheritanceLink(reg, makeLink({ linkId: 'l1', parentDynastyId: 'a', childDynastyId: 'b' }));
    reg = addInheritanceLink(reg, makeLink({ linkId: 'l2', parentDynastyId: 'b', childDynastyId: 'c' }));
    reg = addInheritanceLink(reg, makeLink({ linkId: 'l3', parentDynastyId: 'c', childDynastyId: 'd' }));
    expect(countGenerationsSpanned(reg, 'a')).toBe(3);
  });

  it('does not traverse inactive links', () => {
    let reg = createInheritanceLinkRegistry();
    reg = addInheritanceLink(reg, makeLink({ linkId: 'l1', parentDynastyId: 'root', childDynastyId: 'child' }));
    const { registry: updated } = acknowledgeCompletion(reg, 'l1', 0);
    expect(countGenerationsSpanned(updated, 'root')).toBe(0);
  });
});
