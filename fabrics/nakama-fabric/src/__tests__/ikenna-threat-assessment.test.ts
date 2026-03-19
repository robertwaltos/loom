import { describe, it, expect } from 'vitest';
import {
  createIkennaThreatModel,
  getCurrentAssessment,
  getPublicAssessment,
  getPrivateAssessment,
  countUnpublishedRevisions,
  VERSION_14_SPECIFIC_PREDICTION,
} from '../ikenna-threat-assessment.js';

describe('VERSION_14_SPECIFIC_PREDICTION', () => {
  it('is a non-empty string', () => {
    expect(typeof VERSION_14_SPECIFIC_PREDICTION).toBe('string');
    expect(VERSION_14_SPECIFIC_PREDICTION.length).toBeGreaterThan(0);
  });

  it('mentions the Kwame signature', () => {
    expect(VERSION_14_SPECIFIC_PREDICTION).toContain('Kwame');
  });

  it('mentions constitutional significance', () => {
    expect(VERSION_14_SPECIFIC_PREDICTION.toLowerCase()).toContain('constitutional');
  });
});

describe('createIkennaThreatModel', () => {
  it('currentVersion is 14', () => {
    expect(createIkennaThreatModel().currentVersion).toBe(14);
  });

  it('has exactly 14 assessments', () => {
    expect(createIkennaThreatModel().assessments).toHaveLength(14);
  });

  it('hasPublicVersionBeenUpdated is false', () => {
    expect(createIkennaThreatModel().hasPublicVersionBeenUpdated).toBe(false);
  });

  it('daysUntilPoliticalMove is null initially', () => {
    expect(createIkennaThreatModel().daysUntilPoliticalMove).toBeNull();
  });

  it('assessments are ordered version 1 through 14', () => {
    const model = createIkennaThreatModel();
    const versions = model.assessments.map(a => a.version);
    for (let i = 0; i < versions.length; i++) {
      expect(versions[i]).toBe(i + 1);
    }
  });
});

describe('getCurrentAssessment', () => {
  it('returns the version-14 assessment', () => {
    const model = createIkennaThreatModel();
    const assessment = getCurrentAssessment(model);
    expect(assessment.version).toBe(14);
  });

  it('throws if currentVersion is not found', () => {
    const model = { ...createIkennaThreatModel(), currentVersion: 99 };
    expect(() => getCurrentAssessment(model)).toThrow();
  });
});

describe('getPublicAssessment', () => {
  it('returns CONTAINED as public threat level', () => {
    const model = createIkennaThreatModel();
    const pub = getPublicAssessment(model);
    expect(pub.threatLevel).toBe('CONTAINED');
  });

  it('public assessment has a non-empty summary', () => {
    const pub = getPublicAssessment(createIkennaThreatModel());
    expect(typeof pub.summary).toBe('string');
    expect(pub.summary.length).toBeGreaterThan(0);
  });

  it('public assessment does NOT reveal IMMINENT_POLITICAL', () => {
    const pub = getPublicAssessment(createIkennaThreatModel());
    expect(pub.threatLevel).not.toBe('IMMINENT_POLITICAL');
  });
});

describe('getPrivateAssessment', () => {
  it('private threatLevel is IMMINENT_POLITICAL for version 14', () => {
    const priv = getPrivateAssessment(createIkennaThreatModel());
    expect(priv.threatLevel).toBe('IMMINENT_POLITICAL');
  });

  it('specificPoliticalMove is set for version 14', () => {
    const priv = getPrivateAssessment(createIkennaThreatModel());
    expect(priv.specificPoliticalMove).not.toBeNull();
  });

  it('specificPoliticalMove contains VERSION_14_SPECIFIC_PREDICTION text', () => {
    const priv = getPrivateAssessment(createIkennaThreatModel());
    expect(priv.specificPoliticalMove).toContain('Kwame');
  });

  it('private and public assessments diverge at version 14', () => {
    const model = createIkennaThreatModel();
    const pub = getPublicAssessment(model);
    const priv = getPrivateAssessment(model);
    expect(pub.threatLevel).not.toBe(priv.threatLevel);
  });
});

describe('countUnpublishedRevisions', () => {
  it('returns 6 (versions 9-14 are unpublished)', () => {
    expect(countUnpublishedRevisions(createIkennaThreatModel())).toBe(6);
  });

  it('published versions (1-8) are all isPublished=true', () => {
    const model = createIkennaThreatModel();
    const published = model.assessments.filter(a => a.isPublished);
    expect(published).toHaveLength(8);
    published.forEach(a => expect(a.version).toBeLessThanOrEqual(8));
  });

  it('unpublished versions (9-14) are all isPublished=false', () => {
    const model = createIkennaThreatModel();
    const unpublished = model.assessments.filter(a => !a.isPublished);
    unpublished.forEach(a => expect(a.version).toBeGreaterThanOrEqual(9));
  });
});

describe('threat model progression', () => {
  it('early versions have HOSTILE public assessment', () => {
    const model = createIkennaThreatModel();
    const v1 = model.assessments.find(a => a.version === 1)!;
    expect(v1.publicAssessment.threatLevel).toBe('HOSTILE');
  });

  it('version 14 inGameYear is 80', () => {
    const assessment = getCurrentAssessment(createIkennaThreatModel());
    expect(assessment.inGameYear).toBe(80);
  });

  it('all assessments have a non-empty deltaFromPrevious except possibly v1', () => {
    const model = createIkennaThreatModel();
    const afterV1 = model.assessments.filter(a => a.version > 1);
    afterV1.forEach(a => {
      expect(typeof a.deltaFromPrevious).toBe('string');
    });
  });
});
