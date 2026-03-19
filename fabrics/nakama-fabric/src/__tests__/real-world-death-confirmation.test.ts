import { describe, it, expect } from 'vitest';
import {
  REVIEW_WINDOW_MS,
  createDeathConfirmation,
  beginReview,
  confirmDeath,
  activateHeir,
  fileMemorial,
  transitionToVigil,
  generateMemorialEntry,
  getPublicRecord,
} from '../real-world-death-confirmation.js';

const NOW = 1_000_000;

function makeConfirmation() {
  return createDeathConfirmation('dyn-1', 'Kwame Osei', 'Ama Osei', 30, 150, 25, NOW);
}

describe('REVIEW_WINDOW_MS', () => {
  it('is 24 hours in ms', () => {
    expect(REVIEW_WINDOW_MS).toBe(86_400_000);
  });
});

describe('createDeathConfirmation', () => {
  it('initial status is FAMILY_SUBMITTED', () => {
    expect(makeConfirmation().status).toBe('FAMILY_SUBMITTED');
  });

  it('stores dynastyId and playerDisplayName', () => {
    const c = makeConfirmation();
    expect(c.dynastyId).toBe('dyn-1');
    expect(c.playerDisplayName).toBe('Kwame Osei');
  });

  it('stores submittedByName', () => {
    expect(makeConfirmation().submittedByName).toBe('Ama Osei');
  });

  it('submittedAtMs is nowMs', () => {
    expect(makeConfirmation().submittedAtMs).toBe(NOW);
  });

  it('confirmedAtMs and heirDynastyId and memorialEntryId are null', () => {
    const c = makeConfirmation();
    expect(c.confirmedAtMs).toBeNull();
    expect(c.heirDynastyId).toBeNull();
    expect(c.memorialEntryId).toBeNull();
  });

  it('isAnonymised defaults to false', () => {
    expect(makeConfirmation().isAnonymised).toBe(false);
  });

  it('stores inGameYearsActive and chronicleEntriesCount and assemblyYearsActive', () => {
    const c = makeConfirmation();
    expect(c.inGameYearsActive).toBe(30);
    expect(c.chronicleEntriesCount).toBe(150);
    expect(c.assemblyYearsActive).toBe(25);
  });
});

describe('beginReview', () => {
  it('transitions FAMILY_SUBMITTED → UNDER_REVIEW', () => {
    const c = beginReview(makeConfirmation(), NOW + 100);
    expect(c.status).toBe('UNDER_REVIEW');
  });

  it('throws if not in FAMILY_SUBMITTED', () => {
    const c = beginReview(makeConfirmation(), NOW);
    expect(() => beginReview(c, NOW)).toThrow();
  });
});

describe('confirmDeath', () => {
  it('transitions UNDER_REVIEW → CONFIRMED', () => {
    let c = makeConfirmation();
    c = beginReview(c, NOW);
    c = confirmDeath(c, NOW + 200);
    expect(c.status).toBe('CONFIRMED');
    expect(c.confirmedAtMs).toBe(NOW + 200);
  });

  it('throws if not UNDER_REVIEW', () => {
    expect(() => confirmDeath(makeConfirmation(), NOW)).toThrow();
  });
});

describe('activateHeir', () => {
  it('transitions CONFIRMED → HEIR_ACTIVATED', () => {
    let c = makeConfirmation();
    c = beginReview(c, NOW); c = confirmDeath(c, NOW);
    c = activateHeir(c, 'dyn-heir-1', NOW);
    expect(c.status).toBe('HEIR_ACTIVATED');
    expect(c.heirDynastyId).toBe('dyn-heir-1');
  });

  it('throws if not CONFIRMED', () => {
    expect(() => activateHeir(makeConfirmation(), 'dyn-2', NOW)).toThrow();
  });
});

describe('fileMemorial', () => {
  it('transitions CONFIRMED → MEMORIAL_FILED', () => {
    let c = makeConfirmation();
    c = beginReview(c, NOW); c = confirmDeath(c, NOW);
    c = fileMemorial(c, 'entry-1', NOW);
    expect(c.status).toBe('MEMORIAL_FILED');
    expect(c.memorialEntryId).toBe('entry-1');
  });

  it('also transitions HEIR_ACTIVATED → MEMORIAL_FILED', () => {
    let c = makeConfirmation();
    c = beginReview(c, NOW); c = confirmDeath(c, NOW);
    c = activateHeir(c, 'heir', NOW);
    c = fileMemorial(c, 'entry-2', NOW);
    expect(c.status).toBe('MEMORIAL_FILED');
  });

  it('throws if not CONFIRMED or HEIR_ACTIVATED', () => {
    expect(() => fileMemorial(makeConfirmation(), 'e', NOW)).toThrow();
  });
});

describe('transitionToVigil', () => {
  it('transitions HEIR_ACTIVATED → VIGIL_DYNASTY', () => {
    let c = makeConfirmation();
    c = beginReview(c, NOW); c = confirmDeath(c, NOW);
    c = activateHeir(c, 'heir', NOW);
    c = transitionToVigil(c, NOW);
    expect(c.status).toBe('VIGIL_DYNASTY');
  });

  it('throws if not HEIR_ACTIVATED', () => {
    expect(() => transitionToVigil(makeConfirmation(), NOW)).toThrow();
  });
});

describe('generateMemorialEntry', () => {
  it('title contains In Memoriam and player name', () => {
    const entry = generateMemorialEntry(makeConfirmation());
    expect(entry.title).toContain('In Memoriam');
    expect(entry.title).toContain('Kwame Osei');
  });

  it('permanentlyPinned is always true', () => {
    expect(generateMemorialEntry(makeConfirmation()).permanentlyPinned).toBe(true);
  });

  it('isPublic is true for non-anonymised', () => {
    expect(generateMemorialEntry(makeConfirmation()).isPublic).toBe(true);
  });

  it('isPublic is false for anonymised', () => {
    const c = { ...makeConfirmation(), isAnonymised: true };
    expect(generateMemorialEntry(c).isPublic).toBe(false);
  });

  it('anonymised title uses generic subject', () => {
    const c = { ...makeConfirmation(), isAnonymised: true };
    const entry = generateMemorialEntry(c);
    expect(entry.title).not.toContain('Kwame');
    expect(entry.body).toContain('A member');
  });

  it('uses deep chronicle template for long-term players with many entries', () => {
    const c = { ...makeConfirmation(), inGameYearsActive: 50, chronicleEntriesCount: 150 };
    const entry = generateMemorialEntry(c);
    expect(entry.body).toContain('Chronicle entries');
  });

  it('uses assembly template for long assembly service', () => {
    const c = { ...makeConfirmation(), inGameYearsActive: 10, chronicleEntriesCount: 5, assemblyYearsActive: 25 };
    const entry = generateMemorialEntry(c);
    expect(entry.body).toContain('Assembly');
  });

  it('uses presence template for moderate years, few entries', () => {
    const c = { ...makeConfirmation(), inGameYearsActive: 25, chronicleEntriesCount: 50, assemblyYearsActive: 0 };
    const entry = generateMemorialEntry(c);
    expect(entry.body).toContain('witnessed');
  });

  it('uses default template for short service', () => {
    const c = { ...makeConfirmation(), inGameYearsActive: 5, chronicleEntriesCount: 10, assemblyYearsActive: 0 };
    const entry = generateMemorialEntry(c);
    expect(entry.body).toContain('remembered');
  });

  it('body ends with "The Chronicle remembers."', () => {
    expect(generateMemorialEntry(makeConfirmation()).body).toContain('The Chronicle remembers.');
  });
});

describe('getPublicRecord', () => {
  it('omits submittedByName', () => {
    const pub = getPublicRecord(makeConfirmation());
    expect(pub).not.toHaveProperty('submittedByName');
  });

  it('includes dynastyId and status', () => {
    const pub = getPublicRecord(makeConfirmation());
    expect(pub.dynastyId).toBe('dyn-1');
    expect(pub.status).toBe('FAMILY_SUBMITTED');
  });

  it('includes all other fields', () => {
    const pub = getPublicRecord(makeConfirmation());
    expect(pub).toHaveProperty('inGameYearsActive');
    expect(pub).toHaveProperty('chronicleEntriesCount');
    expect(pub).toHaveProperty('memorialEntryId');
  });
});
