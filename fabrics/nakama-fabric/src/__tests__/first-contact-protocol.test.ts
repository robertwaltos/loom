import { describe, it, expect } from 'vitest';
import {
  FIRST_CONTACT_CHRONICLE_MIN_LENGTH,
  CONTACT_VERIFICATION_WINDOW_DAYS,
  INDIGENOUS_SPECIES_REGISTER,
  getSpeciesInfoForWorld,
  createFirstContactClaim,
  linkChronicleEntry,
  verifyClaim,
  contestClaim,
  rejectClaim,
  buildFirstContactChronicleEntry,
  FirstContactError,
  type FirstContactClaim,
} from '../first-contact-protocol.js';

// ── Constants ─────────────────────────────────────────────────────────────────

describe('constants', () => {
  it('FIRST_CONTACT_CHRONICLE_MIN_LENGTH is 500', () => {
    expect(FIRST_CONTACT_CHRONICLE_MIN_LENGTH).toBe(500);
  });

  it('CONTACT_VERIFICATION_WINDOW_DAYS is 30', () => {
    expect(CONTACT_VERIFICATION_WINDOW_DAYS).toBe(30);
  });

  it('INDIGENOUS_SPECIES_REGISTER contains world-014', () => {
    expect(INDIGENOUS_SPECIES_REGISTER.has('world-014')).toBe(true);
  });

  it('INDIGENOUS_SPECIES_REGISTER contains The Bone Chorus entry', () => {
    const entry = INDIGENOUS_SPECIES_REGISTER.get('world-014');
    expect(entry).toContain('Bone Chorus');
  });

  it('INDIGENOUS_SPECIES_REGISTER has at least 5 worlds', () => {
    expect(INDIGENOUS_SPECIES_REGISTER.size).toBeGreaterThanOrEqual(5);
  });
});

// ── getSpeciesInfoForWorld ────────────────────────────────────────────────────

describe('getSpeciesInfoForWorld', () => {
  it('returns species info for world-014', () => {
    const info = getSpeciesInfoForWorld('world-014');
    expect(info).not.toBeNull();
    expect(info).toContain('Bone Chorus');
  });

  it('returns null for unknown world', () => {
    expect(getSpeciesInfoForWorld('world-999')).toBeNull();
  });
});

// ── createFirstContactClaim ───────────────────────────────────────────────────

const NOW = 1_700_000_000_000;
const VALID_DESC = 'We landed on the northern plateau and first detected the signal using passive sensors.';

describe('createFirstContactClaim', () => {
  it('creates a claim with UNVERIFIED status', () => {
    const claim = createFirstContactClaim('d-001', 'world-055', VALID_DESC, NOW);
    expect(claim.status).toBe('UNVERIFIED');
  });

  it('generates a claimId', () => {
    const claim = createFirstContactClaim('d-001', 'world-055', VALID_DESC, NOW);
    expect(claim.claimId).toContain('d-001');
    expect(claim.claimId).toContain('world-055');
  });

  it('stores dynastyId and worldId', () => {
    const claim = createFirstContactClaim('d-001', 'world-055', VALID_DESC, NOW);
    expect(claim.dynastyId).toBe('d-001');
    expect(claim.worldId).toBe('world-055');
  });

  it('stores claimedAtMs', () => {
    const claim = createFirstContactClaim('d-001', 'world-055', VALID_DESC, NOW);
    expect(claim.claimedAtMs).toBe(NOW);
  });

  it('chronicleEntryId starts as null', () => {
    const claim = createFirstContactClaim('d-001', 'world-055', VALID_DESC, NOW);
    expect(claim.chronicleEntryId).toBeNull();
  });

  it('markAwardedAtMs starts as null', () => {
    const claim = createFirstContactClaim('d-001', 'world-055', VALID_DESC, NOW);
    expect(claim.markAwardedAtMs).toBeNull();
  });

  it('throws FirstContactError when description is too short', () => {
    expect(() => createFirstContactClaim('d-001', 'world-055', 'short', NOW)).toThrow(FirstContactError);
  });

  it('throws DESCRIPTION_TOO_SHORT error code', () => {
    try {
      createFirstContactClaim('d-001', 'world-055', 'short', NOW);
    } catch (e) {
      expect((e as FirstContactError).code).toBe('DESCRIPTION_TOO_SHORT');
    }
  });

  it('throws DESCRIPTION_TOO_LONG when description exceeds max', () => {
    const long = 'x'.repeat(2001);
    expect(() => createFirstContactClaim('d-001', 'world-055', long, NOW)).toThrow(FirstContactError);
  });
});

// ── linkChronicleEntry ────────────────────────────────────────────────────────

describe('linkChronicleEntry', () => {
  const baseClaim = createFirstContactClaim('d-001', 'world-055', VALID_DESC, NOW);

  it('sets status to SURVEY_CORPS_REVIEW', () => {
    const updated = linkChronicleEntry(baseClaim, 'chr-001', 600);
    expect(updated.status).toBe('SURVEY_CORPS_REVIEW');
  });

  it('stores chronicleEntryId', () => {
    const updated = linkChronicleEntry(baseClaim, 'chr-001', 600);
    expect(updated.chronicleEntryId).toBe('chr-001');
  });

  it('throws FirstContactError when chronicle entry is too short', () => {
    expect(() => linkChronicleEntry(baseClaim, 'chr-001', 100)).toThrow(FirstContactError);
  });

  it('throws CHRONICLE_ENTRY_TOO_SHORT error code', () => {
    try {
      linkChronicleEntry(baseClaim, 'chr-001', 10);
    } catch (e) {
      expect((e as FirstContactError).code).toBe('CHRONICLE_ENTRY_TOO_SHORT');
    }
  });
});

// ── verifyClaim ───────────────────────────────────────────────────────────────

describe('verifyClaim', () => {
  const reviewClaim: FirstContactClaim = {
    ...createFirstContactClaim('d-001', 'world-055', VALID_DESC, NOW),
    status: 'SURVEY_CORPS_REVIEW',
    chronicleEntryId: 'chr-001',
  };

  it('sets status to VERIFIED', () => {
    const updated = verifyClaim(reviewClaim, 'All checks passed.', NOW + 1000);
    expect(updated.status).toBe('VERIFIED');
  });

  it('stores verificationNotes', () => {
    const updated = verifyClaim(reviewClaim, 'All checks passed.', NOW + 1000);
    expect(updated.verificationNotes).toBe('All checks passed.');
  });

  it('stores markAwardedAtMs', () => {
    const updated = verifyClaim(reviewClaim, 'ok', NOW + 500);
    expect(updated.markAwardedAtMs).toBe(NOW + 500);
  });

  it('throws INVALID_STATUS_TRANSITION when status is UNVERIFIED', () => {
    const unverified = createFirstContactClaim('d-001', 'world-055', VALID_DESC, NOW);
    expect(() => verifyClaim(unverified, 'notes', NOW)).toThrow(FirstContactError);
  });
});

// ── contestClaim ──────────────────────────────────────────────────────────────

describe('contestClaim', () => {
  const reviewClaim: FirstContactClaim = {
    ...createFirstContactClaim('d-001', 'world-055', VALID_DESC, NOW),
    status: 'SURVEY_CORPS_REVIEW',
    chronicleEntryId: 'chr-001',
  };

  it('sets status to CONTESTED', () => {
    const updated = contestClaim(reviewClaim, 'd-rival', 'We were there first.');
    expect(updated.status).toBe('CONTESTED');
  });

  it('stores contesting dynasty in verificationNotes', () => {
    const updated = contestClaim(reviewClaim, 'd-rival', 'We were there first.');
    expect(updated.verificationNotes).toContain('d-rival');
  });

  it('throws INVALID_STATUS_TRANSITION for non-SURVEY_CORPS_REVIEW status', () => {
    const unverified = createFirstContactClaim('d-001', 'world-055', VALID_DESC, NOW);
    expect(() => contestClaim(unverified, 'd-rival', 'notes')).toThrow(FirstContactError);
  });
});

// ── rejectClaim ───────────────────────────────────────────────────────────────

describe('rejectClaim', () => {
  it('sets status to REJECTED', () => {
    const unverified = createFirstContactClaim('d-001', 'world-055', VALID_DESC, NOW);
    const updated = rejectClaim(unverified, 'Insufficient evidence.');
    expect(updated.status).toBe('REJECTED');
  });

  it('stores rejection reason', () => {
    const unverified = createFirstContactClaim('d-001', 'world-055', VALID_DESC, NOW);
    const updated = rejectClaim(unverified, 'Insufficient evidence.');
    expect(updated.verificationNotes).toBe('Insufficient evidence.');
  });

  it('throws INVALID_STATUS_TRANSITION when claim is already VERIFIED', () => {
    const reviewClaim: FirstContactClaim = {
      ...createFirstContactClaim('d-001', 'world-055', VALID_DESC, NOW),
      status: 'VERIFIED',
    };
    expect(() => rejectClaim(reviewClaim, 'reason')).toThrow(FirstContactError);
  });

  it('throws INVALID_STATUS_TRANSITION when claim is already REJECTED', () => {
    const rejectedClaim: FirstContactClaim = {
      ...createFirstContactClaim('d-001', 'world-055', VALID_DESC, NOW),
      status: 'REJECTED',
    };
    expect(() => rejectClaim(rejectedClaim, 'reason')).toThrow(FirstContactError);
  });
});

// ── buildFirstContactChronicleEntry ──────────────────────────────────────────

describe('buildFirstContactChronicleEntry', () => {
  const verifiedClaim: FirstContactClaim = {
    claimId: 'fc-d-001-world-014-1234',
    dynastyId: 'd-001',
    worldId: 'world-014',
    claimedAtMs: NOW,
    contactDescription: VALID_DESC,
    chronicleEntryId: 'chr-001',
    status: 'VERIFIED',
    markAwardedAtMs: NOW + 1000,
    verificationNotes: 'Verified by Survey Corps.',
  };

  it('returns isPublic true', () => {
    const entry = buildFirstContactChronicleEntry(verifiedClaim, 'Starborn Dynasty');
    expect(entry.isPublic).toBe(true);
  });

  it('title contains FIRST CONTACT', () => {
    const entry = buildFirstContactChronicleEntry(verifiedClaim, 'Starborn Dynasty');
    expect(entry.title).toContain('FIRST CONTACT');
  });

  it('title contains world id', () => {
    const entry = buildFirstContactChronicleEntry(verifiedClaim, 'Starborn Dynasty');
    expect(entry.title).toContain('world-014');
  });

  it('body contains dynasty name', () => {
    const entry = buildFirstContactChronicleEntry(verifiedClaim, 'Starborn Dynasty');
    expect(entry.body).toContain('Starborn Dynasty');
  });

  it('body contains known species info for world-014', () => {
    const entry = buildFirstContactChronicleEntry(verifiedClaim, 'Starborn Dynasty');
    expect(entry.body).toContain('Bone Chorus');
  });

  it('body contains contact description', () => {
    const entry = buildFirstContactChronicleEntry(verifiedClaim, 'Starborn Dynasty');
    expect(entry.body).toContain(VALID_DESC);
  });

  it('body contains Survey Corps notes', () => {
    const entry = buildFirstContactChronicleEntry(verifiedClaim, 'Starborn Dynasty');
    expect(entry.body).toContain('Verified by Survey Corps.');
  });
});

// ── FirstContactError ─────────────────────────────────────────────────────────

describe('FirstContactError', () => {
  it('has name FirstContactError', () => {
    const err = new FirstContactError('DESCRIPTION_TOO_SHORT', 'msg');
    expect(err.name).toBe('FirstContactError');
  });

  it('exposes code', () => {
    const err = new FirstContactError('INVALID_STATUS_TRANSITION', 'msg');
    expect(err.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('is instanceof Error', () => {
    expect(new FirstContactError('DESCRIPTION_TOO_LONG', 'x')).toBeInstanceOf(Error);
  });
});
