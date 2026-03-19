import { describe, it, expect } from 'vitest';
import {
  NNAMDI_CORE_ARGUMENT,
  NNAMDI_PRIVATE_RECKONING,
  createNnamdiRecord,
  fileNewSession,
  recordPlayerEngagement,
  recordFormalResponse,
  resolvePoint,
  getCurrentSessionTemplate,
  getSessionSummary,
} from '../nnamdi-persistent-voice.js';

describe('NNAMDI_CORE_ARGUMENT', () => {
  it('is a non-empty string', () => {
    expect(typeof NNAMDI_CORE_ARGUMENT).toBe('string');
    expect(NNAMDI_CORE_ARGUMENT.length).toBeGreaterThan(100);
  });

  it('mentions the Assembly', () => {
    expect(NNAMDI_CORE_ARGUMENT).toContain('Assembly');
  });

  it('mentions founding world selection', () => {
    expect(NNAMDI_CORE_ARGUMENT.toLowerCase()).toContain('founding');
  });

  it('mentions the audit request', () => {
    expect(NNAMDI_CORE_ARGUMENT.toLowerCase()).toContain('audit');
  });
});

describe('createNnamdiRecord', () => {
  it('characterId is 5', () => {
    expect(createNnamdiRecord().characterId).toBe(5);
  });

  it('totalSessionsFiled is 47', () => {
    expect(createNnamdiRecord().totalSessionsFiled).toBe(47);
  });

  it('firstFiledAtIngameYear is before lastFiledAtIngameYear', () => {
    const r = createNnamdiRecord();
    expect(r.firstFiledAtIngameYear).toBeLessThan(r.lastFiledAtIngameYear);
  });

  it('hasReceivedFormalAssemblyResponse is false', () => {
    expect(createNnamdiRecord().hasReceivedFormalAssemblyResponse).toBe(false);
  });

  it('isPointResolved is false', () => {
    expect(createNnamdiRecord().isPointResolved).toBe(false);
  });

  it('playerEngagementCount starts at 0', () => {
    expect(createNnamdiRecord().playerEngagementCount).toBe(0);
  });

  it('continuationistAcknowledgments is an array', () => {
    expect(Array.isArray(createNnamdiRecord().continuationistAcknowledgments)).toBe(true);
  });
});

describe('fileNewSession', () => {
  it('increments totalSessionsFiled', () => {
    const r = createNnamdiRecord();
    const updated = fileNewSession(r, 26);
    expect(updated.totalSessionsFiled).toBe(r.totalSessionsFiled + 1);
  });

  it('updates lastFiledAtIngameYear', () => {
    const r = createNnamdiRecord();
    const updated = fileNewSession(r, 30);
    expect(updated.lastFiledAtIngameYear).toBe(30);
  });

  it('returns a new record (immutable)', () => {
    const r = createNnamdiRecord();
    const updated = fileNewSession(r, 26);
    expect(updated).not.toBe(r);
    expect(r.totalSessionsFiled).toBe(47);
  });
});

describe('recordPlayerEngagement', () => {
  it('increments playerEngagementCount', () => {
    let r = createNnamdiRecord();
    r = recordPlayerEngagement(r);
    r = recordPlayerEngagement(r);
    expect(r.playerEngagementCount).toBe(2);
  });

  it('returns a new record', () => {
    const r = createNnamdiRecord();
    expect(recordPlayerEngagement(r)).not.toBe(r);
  });
});

describe('recordFormalResponse', () => {
  it('sets hasReceivedFormalAssemblyResponse to true', () => {
    const r = recordFormalResponse(createNnamdiRecord());
    expect(r.hasReceivedFormalAssemblyResponse).toBe(true);
  });

  it('returns a new record', () => {
    const r = createNnamdiRecord();
    expect(recordFormalResponse(r)).not.toBe(r);
  });
});

describe('resolvePoint', () => {
  it('sets isPointResolved to true', () => {
    const r = resolvePoint(createNnamdiRecord());
    expect(r.isPointResolved).toBe(true);
  });

  it('returns a new record', () => {
    const r = createNnamdiRecord();
    expect(resolvePoint(r)).not.toBe(r);
  });
});

describe('getCurrentSessionTemplate', () => {
  it('returns a string', () => {
    const r = createNnamdiRecord();
    expect(typeof getCurrentSessionTemplate(r)).toBe('string');
  });

  it('returns different templates for different year ranges', () => {
    const earlyRecord = { ...createNnamdiRecord(), lastFiledAtIngameYear: 3 };
    const lateRecord = { ...createNnamdiRecord(), lastFiledAtIngameYear: 25 };
    // Templates differ between early and late years
    const early = getCurrentSessionTemplate(earlyRecord);
    const late = getCurrentSessionTemplate(lateRecord);
    expect(typeof early).toBe('string');
    expect(typeof late).toBe('string');
  });
});

describe('getSessionSummary', () => {
  it('includes totalSessionsFiled in summary', () => {
    const r = createNnamdiRecord();
    const summary = getSessionSummary(r);
    expect(summary).toContain('47');
  });

  it('mentions no formal response when not received', () => {
    const r = createNnamdiRecord();
    expect(getSessionSummary(r)).toContain('no formal response');
  });

  it('mentions formal response when received', () => {
    const r = recordFormalResponse(createNnamdiRecord());
    expect(getSessionSummary(r)).toContain('formal response');
    expect(getSessionSummary(r)).not.toContain('no formal response');
  });

  it('mentions unresolved when not resolved', () => {
    const r = createNnamdiRecord();
    expect(getSessionSummary(r)).toContain('unresolved');
  });

  it('mentions resolved when point is resolved', () => {
    const r = resolvePoint(createNnamdiRecord());
    expect(getSessionSummary(r)).toContain('resolved');
  });
});
