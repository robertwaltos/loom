import { describe, it, expect } from 'vitest';
import {
  DIPLOMATIC_CONTACT_REQUIREMENT_YEARS,
  createDiplomaticContact,
  recordContact,
  fileInChronicle,
  informAssembly,
  lapseDiplomaticContact,
  checkQualification,
  buildDelegationChronicleEntry,
  ASCENDANCY_DOOR_DELEGATION_EVENT,
  type DiplomaticContact,
  type ContactLogEntry,
} from '../ascendancy-diplomatic-contact.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeLog(id: string, year: number, hostile = false): ContactLogEntry {
  return { entryId: id, inGameYear: year, summary: `Contact at year ${year}`, wasHostile: hostile };
}

function makeContact(firstYear = 1): DiplomaticContact {
  return createDiplomaticContact('dynasty-test', firstYear);
}

// ── Constants ─────────────────────────────────────────────────────────────────

describe('DIPLOMATIC_CONTACT_REQUIREMENT_YEARS', () => {
  it('equals 20', () => {
    expect(DIPLOMATIC_CONTACT_REQUIREMENT_YEARS).toBe(20);
  });
});

describe('ASCENDANCY_DOOR_DELEGATION_EVENT', () => {
  it('has correct eventType', () => {
    expect(ASCENDANCY_DOOR_DELEGATION_EVENT.eventType).toBe('ASCENDANCY_DELEGATION_ARRIVED');
  });

  it('has correct hubStation', () => {
    expect(ASCENDANCY_DOOR_DELEGATION_EVENT.hubStation).toBe('Hub Station Vela');
  });

  it('has correct technicalAppendixSignatory', () => {
    expect(ASCENDANCY_DOOR_DELEGATION_EVENT.technicalAppendixSignatory).toBe('Kwame Osei-Adeyemi');
  });
});

// ── createDiplomaticContact ───────────────────────────────────────────────────

describe('createDiplomaticContact', () => {
  it('creates contact with correct dynastyId', () => {
    const c = makeContact();
    expect(c.dynastyId).toBe('dynasty-test');
  });

  it('initialises firstContactAtIngameYear', () => {
    const c = createDiplomaticContact('d', 15);
    expect(c.firstContactAtIngameYear).toBe(15);
  });

  it('sets status to ACTIVE initially', () => {
    expect(makeContact().status).toBe('ACTIVE');
  });

  it('starts with empty contactLogs', () => {
    expect(makeContact().contactLogs).toHaveLength(0);
  });

  it('starts with contactYearsElapsed = 0', () => {
    expect(makeContact().contactYearsElapsed).toBe(0);
  });

  it('starts unfiled in chronicle', () => {
    expect(makeContact().isFiledInChronicle).toBe(false);
  });

  it('starts with assembly not informed', () => {
    expect(makeContact().hasInformedAssembly).toBe(false);
  });
});

// ── recordContact ─────────────────────────────────────────────────────────────

describe('recordContact', () => {
  it('appends the log entry', () => {
    const c = makeContact(1);
    const updated = recordContact(c, makeLog('e1', 10));
    expect(updated.contactLogs).toHaveLength(1);
    expect(updated.contactLogs[0]?.entryId).toBe('e1');
  });

  it('updates lastContactAtIngameYear', () => {
    const c = makeContact(1);
    const updated = recordContact(c, makeLog('e1', 10));
    expect(updated.lastContactAtIngameYear).toBe(10);
  });

  it('computes contactYearsElapsed as lastYear - firstYear', () => {
    const c = makeContact(1);
    const updated = recordContact(c, makeLog('e1', 11));
    expect(updated.contactYearsElapsed).toBe(10);
  });

  it('does not reduce lastContactYear when older log is added', () => {
    const c = makeContact(1);
    const after10 = recordContact(c, makeLog('e1', 10));
    const after5 = recordContact(after10, makeLog('e2', 5));
    expect(after5.lastContactAtIngameYear).toBe(10);
  });

  it('does not change a LAPSED contact status on record', () => {
    const lapsed = { ...makeContact(1), status: 'LAPSED' as const, contactYearsElapsed: 0 };
    const updated = recordContact(lapsed, makeLog('e1', 25));
    expect(updated.status).toBe('LAPSED');
  });

  it('accumulates multiple logs', () => {
    let c = makeContact(1);
    c = recordContact(c, makeLog('e1', 5));
    c = recordContact(c, makeLog('e2', 12));
    expect(c.contactLogs).toHaveLength(2);
  });
});

// ── fileInChronicle ───────────────────────────────────────────────────────────

describe('fileInChronicle', () => {
  it('sets isFiledInChronicle to true', () => {
    const updated = fileInChronicle(makeContact());
    expect(updated.isFiledInChronicle).toBe(true);
  });

  it('does not change LAPSED status', () => {
    const lapsed = { ...makeContact(), status: 'LAPSED' as const };
    expect(fileInChronicle(lapsed).status).toBe('LAPSED');
  });

  it('returns ACTIVE when years not yet met even after filing', () => {
    const c = makeContact(1);
    const filed = fileInChronicle(c);
    expect(filed.status).toBe('ACTIVE');
  });
});

// ── informAssembly ────────────────────────────────────────────────────────────

describe('informAssembly', () => {
  it('sets hasInformedAssembly to true', () => {
    const updated = informAssembly(makeContact());
    expect(updated.hasInformedAssembly).toBe(true);
  });

  it('does not change LAPSED status', () => {
    const lapsed = { ...makeContact(), status: 'LAPSED' as const };
    expect(informAssembly(lapsed).status).toBe('LAPSED');
  });
});

// ── lapseDiplomaticContact ────────────────────────────────────────────────────

describe('lapseDiplomaticContact', () => {
  it('returns same contact when gap is exactly 5 years', () => {
    const c = { ...makeContact(1), lastContactAtIngameYear: 10 };
    const result = lapseDiplomaticContact(c, 15);
    expect(result).toBe(c);
  });

  it('returns same contact when gap is less than 5 years', () => {
    const c = { ...makeContact(1), lastContactAtIngameYear: 10 };
    const result = lapseDiplomaticContact(c, 14);
    expect(result).toBe(c);
  });

  it('lapses when gap exceeds 5 years', () => {
    const c = { ...makeContact(1), lastContactAtIngameYear: 10 };
    const result = lapseDiplomaticContact(c, 16);
    expect(result.status).toBe('LAPSED');
  });

  it('resets contactYearsElapsed to 0 on lapse', () => {
    const c = { ...makeContact(1), lastContactAtIngameYear: 10, contactYearsElapsed: 9 };
    const result = lapseDiplomaticContact(c, 20);
    expect(result.contactYearsElapsed).toBe(0);
  });
});

// ── checkQualification ────────────────────────────────────────────────────────

describe('checkQualification', () => {
  it('returns not qualified when nothing is met', () => {
    const result = checkQualification(makeContact(1));
    expect(result.qualified).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('includes lapse reason when contact is LAPSED', () => {
    const lapsed = { ...makeContact(), status: 'LAPSED' as const };
    const result = checkQualification(lapsed);
    expect(result.reasons.some((r) => r.includes('lapsed'))).toBe(true);
  });

  it('includes reason for insufficient years when elapsed < 20', () => {
    const c = makeContact(1);
    const result = checkQualification(c);
    expect(result.reasons.some((r) => r.includes('Insufficient'))).toBe(true);
  });

  it('includes reason for missing chronicle filing', () => {
    const c = makeContact(1);
    const result = checkQualification(c);
    expect(result.reasons.some((r) => r.includes('Chronicle'))).toBe(true);
  });

  it('includes reason for assembly not informed', () => {
    const c = makeContact(1);
    const result = checkQualification(c);
    expect(result.reasons.some((r) => r.includes('Assembly'))).toBe(true);
  });

  it('qualifies when all conditions are met', () => {
    let c = makeContact(1);
    // advance 21 years
    c = recordContact(c, makeLog('e1', 22));
    c = fileInChronicle(c);
    c = informAssembly(c);
    const result = checkQualification(c);
    expect(result.qualified).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it('remains unqualified when years met but chronicle not filed', () => {
    let c = makeContact(1);
    c = recordContact(c, makeLog('e1', 22));
    c = informAssembly(c);
    const result = checkQualification(c);
    expect(result.qualified).toBe(false);
  });
});

// ── Full qualification path ───────────────────────────────────────────────────

describe('full qualification path', () => {
  it('transitions to QUALIFIED only after all three conditions satisfied', () => {
    let c = makeContact(1);
    c = recordContact(c, makeLog('e1', 25));
    expect(c.status).toBe('ACTIVE');
    c = fileInChronicle(c);
    expect(c.status).toBe('ACTIVE');
    c = informAssembly(c);
    expect(c.status).toBe('QUALIFIED');
  });
});

// ── buildDelegationChronicleEntry ─────────────────────────────────────────────

describe('buildDelegationChronicleEntry', () => {
  it('returns isPublic true', () => {
    expect(buildDelegationChronicleEntry().isPublic).toBe(true);
  });

  it('title mentions Hub Station Vela', () => {
    expect(buildDelegationChronicleEntry().title).toContain('Hub Station Vela');
  });

  it('body mentions Kwame Osei-Adeyemi', () => {
    expect(buildDelegationChronicleEntry().body).toContain('Kwame Osei-Adeyemi');
  });

  it('body mentions Assembly Representation', () => {
    expect(buildDelegationChronicleEntry().body).toContain('Assembly Representation');
  });
});
