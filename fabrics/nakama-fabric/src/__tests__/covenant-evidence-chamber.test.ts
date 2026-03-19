import { describe, it, expect } from 'vitest';
import {
  BONE_CHORUS_FREQUENCY,
  CHAMBER_SIX_SOVEREIGNTY_REQUIREMENT,
  CHAMBER_SIX_COVENANT_REPORTS_REQUIREMENT,
  EKUNDAYO_RESPONSE,
  THE_SIGNAL_LOG_ENTRY,
  checkConditions,
  createChamberSixRecord,
  evaluateAndTransition,
  logSignal,
  consultEkundayo,
  notifyAssembly,
  buildSignalChronicleEntry,
  ChamberSixError,
  type ChamberSixConditions,
  type ChamberSixRecord,
} from '../covenant-evidence-chamber.js';

// ── Constants ─────────────────────────────────────────────────────────────────

describe('exported constants', () => {
  it('BONE_CHORUS_FREQUENCY is 3.14', () => {
    expect(BONE_CHORUS_FREQUENCY).toBe(3.14);
  });

  it('CHAMBER_SIX_SOVEREIGNTY_REQUIREMENT is 20', () => {
    expect(CHAMBER_SIX_SOVEREIGNTY_REQUIREMENT).toBe(20);
  });

  it('CHAMBER_SIX_COVENANT_REPORTS_REQUIREMENT is 5', () => {
    expect(CHAMBER_SIX_COVENANT_REPORTS_REQUIREMENT).toBe(5);
  });

  it('EKUNDAYO_RESPONSE contains "Three hundred years"', () => {
    expect(EKUNDAYO_RESPONSE).toContain('Three hundred years');
  });

  it('EKUNDAYO_RESPONSE begins with silence annotation', () => {
    expect(EKUNDAYO_RESPONSE).toContain('47 seconds of silence');
  });

  it('THE_SIGNAL_LOG_ENTRY mentions 3.14 kHz frequency', () => {
    expect(THE_SIGNAL_LOG_ENTRY).toContain('3.14 kHz');
  });

  it('THE_SIGNAL_LOG_ENTRY mentions WORLD 19', () => {
    expect(THE_SIGNAL_LOG_ENTRY).toContain('WORLD 19');
  });

  it('THE_SIGNAL_LOG_ENTRY contains CRITICAL anomaly flag', () => {
    expect(THE_SIGNAL_LOG_ENTRY).toContain('CRITICAL');
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function allMet(): ChamberSixConditions {
  return {
    boneChorussWorldSovereigntyYears: 20,
    latticeCovenantResearchReports: 5,
    isEkundayoAlive: true,
    isFrequencyConfirmed: true,
  };
}

function noneMet(): ChamberSixConditions {
  return {
    boneChorussWorldSovereigntyYears: 0,
    latticeCovenantResearchReports: 0,
    isEkundayoAlive: false,
    isFrequencyConfirmed: false,
  };
}

// ── checkConditions ───────────────────────────────────────────────────────────

describe('checkConditions', () => {
  it('met = true when all four conditions satisfied', () => {
    expect(checkConditions(allMet()).met).toBe(true);
  });

  it('partialCount = 4 when all met', () => {
    expect(checkConditions(allMet()).partialCount).toBe(4);
  });

  it('met = false when none are satisfied', () => {
    expect(checkConditions(noneMet()).met).toBe(false);
  });

  it('partialCount = 0 when none met', () => {
    expect(checkConditions(noneMet()).partialCount).toBe(0);
  });

  it('missingConditions is empty when all met', () => {
    expect(checkConditions(allMet()).missingConditions).toHaveLength(0);
  });

  it('lists missing sovereignty years when insufficient', () => {
    const c = { ...allMet(), boneChorussWorldSovereigntyYears: 10 };
    expect(checkConditions(c).missingConditions.some((m) => m.includes('sovereignty'))).toBe(true);
  });

  it('lists missing covenant reports when insufficient', () => {
    const c = { ...allMet(), latticeCovenantResearchReports: 2 };
    expect(checkConditions(c).missingConditions.some((m) => m.includes('Covenant reports'))).toBe(true);
  });

  it('lists Ekundayo alive as missing when dead', () => {
    const c = { ...allMet(), isEkundayoAlive: false };
    expect(checkConditions(c).missingConditions.some((m) => m.includes('Ekundayo'))).toBe(true);
  });

  it('lists frequency confirmation as missing', () => {
    const c = { ...allMet(), isFrequencyConfirmed: false };
    expect(checkConditions(c).missingConditions.some((m) => m.includes('3.14 kHz'))).toBe(true);
  });
});

// ── createChamberSixRecord ────────────────────────────────────────────────────

describe('createChamberSixRecord', () => {
  it('starts with LOCKED status', () => {
    expect(createChamberSixRecord().status).toBe('LOCKED');
  });

  it('signalLoggedAtMs is null', () => {
    expect(createChamberSixRecord().signalLoggedAtMs).toBeNull();
  });

  it('ekundayoConsultationResponse is null', () => {
    expect(createChamberSixRecord().ekundayoConsultationResponse).toBeNull();
  });

  it('assemblyNotifiedAtMs is null', () => {
    expect(createChamberSixRecord().assemblyNotifiedAtMs).toBeNull();
  });
});

// ── evaluateAndTransition ─────────────────────────────────────────────────────

describe('evaluateAndTransition', () => {
  it('transitions LOCKED → CONDITIONS_MET when all conditions met', () => {
    const record = createChamberSixRecord();
    const updated = evaluateAndTransition(record, allMet());
    expect(updated.status).toBe('CONDITIONS_MET');
  });

  it('transitions LOCKED → CONDITIONS_PARTIAL when not all met', () => {
    const record = createChamberSixRecord();
    const updated = evaluateAndTransition(record, noneMet());
    expect(updated.status).toBe('CONDITIONS_PARTIAL');
  });

  it('transitions CONDITIONS_PARTIAL → CONDITIONS_MET', () => {
    const record = { ...createChamberSixRecord(), status: 'CONDITIONS_PARTIAL' as const };
    const updated = evaluateAndTransition(record, allMet());
    expect(updated.status).toBe('CONDITIONS_MET');
  });

  it('returns unchanged record when status is SIGNAL_LOGGED', () => {
    const signaled: ChamberSixRecord = {
      ...createChamberSixRecord(),
      status: 'SIGNAL_LOGGED',
      signalLoggedAtMs: 1000,
      signalSourceDescription: 'Outside the 600-world survey arc',
    };
    const updated = evaluateAndTransition(signaled, allMet());
    expect(updated).toBe(signaled);
  });
});

// ── logSignal ─────────────────────────────────────────────────────────────────

describe('logSignal', () => {
  it('transitions CONDITIONS_MET → SIGNAL_LOGGED', () => {
    const record = { ...createChamberSixRecord(), status: 'CONDITIONS_MET' as const };
    const updated = logSignal(record, 1_000_000);
    expect(updated.status).toBe('SIGNAL_LOGGED');
  });

  it('sets signalLoggedAtMs', () => {
    const record = { ...createChamberSixRecord(), status: 'CONDITIONS_MET' as const };
    const updated = logSignal(record, 9_999);
    expect(updated.signalLoggedAtMs).toBe(9_999);
  });

  it('sets signalSourceDescription', () => {
    const record = { ...createChamberSixRecord(), status: 'CONDITIONS_MET' as const };
    const updated = logSignal(record, 1000);
    expect(updated.signalSourceDescription).toBe('Outside the 600-world survey arc');
  });

  it('throws ChamberSixError with CONDITIONS_NOT_MET when not ready', () => {
    const record = createChamberSixRecord(); // LOCKED
    expect(() => logSignal(record, 1000)).toThrow(ChamberSixError);
  });
});

// ── consultEkundayo ───────────────────────────────────────────────────────────

describe('consultEkundayo', () => {
  it('sets ekundayoConsultationResponse to canonical response', () => {
    const signaled: ChamberSixRecord = {
      ...createChamberSixRecord(),
      status: 'SIGNAL_LOGGED',
      signalLoggedAtMs: 1000,
      signalSourceDescription: 'Outside the 600-world survey arc',
    };
    const updated = consultEkundayo(signaled);
    expect(updated.ekundayoConsultationResponse).toBe(EKUNDAYO_RESPONSE);
  });

  it('throws ChamberSixError when status is not SIGNAL_LOGGED', () => {
    const record = createChamberSixRecord();
    expect(() => consultEkundayo(record)).toThrow(ChamberSixError);
  });
});

// ── notifyAssembly ────────────────────────────────────────────────────────────

describe('notifyAssembly', () => {
  it('transitions SIGNAL_LOGGED → ASSEMBLY_NOTIFIED after Ekundayo consulted', () => {
    const record: ChamberSixRecord = {
      status: 'SIGNAL_LOGGED',
      signalLoggedAtMs: 1000,
      signalSourceDescription: 'Outside the 600-world survey arc',
      ekundayoConsultationResponse: EKUNDAYO_RESPONSE,
      assemblyNotifiedAtMs: null,
    };
    const updated = notifyAssembly(record, 2000);
    expect(updated.status).toBe('ASSEMBLY_NOTIFIED');
    expect(updated.assemblyNotifiedAtMs).toBe(2000);
  });

  it('throws EKUNDAYO_NOT_CONSULTED when no consultation response', () => {
    const record: ChamberSixRecord = {
      status: 'SIGNAL_LOGGED',
      signalLoggedAtMs: 1000,
      signalSourceDescription: 'Outside the 600-world survey arc',
      ekundayoConsultationResponse: null,
      assemblyNotifiedAtMs: null,
    };
    expect(() => notifyAssembly(record, 2000)).toThrow(ChamberSixError);
  });

  it('throws INVALID_STATUS_TRANSITION when status is not SIGNAL_LOGGED', () => {
    const record = createChamberSixRecord();
    expect(() => notifyAssembly(record, 2000)).toThrow(ChamberSixError);
  });
});

// ── buildSignalChronicleEntry ─────────────────────────────────────────────────

describe('buildSignalChronicleEntry', () => {
  it('returns null when status is not ASSEMBLY_NOTIFIED', () => {
    const record = createChamberSixRecord();
    expect(buildSignalChronicleEntry(record)).toBeNull();
  });

  it('returns chronicle entry for ASSEMBLY_NOTIFIED status', () => {
    const record: ChamberSixRecord = {
      status: 'ASSEMBLY_NOTIFIED',
      signalLoggedAtMs: 1_000_000,
      signalSourceDescription: 'Outside the 600-world survey arc',
      ekundayoConsultationResponse: EKUNDAYO_RESPONSE,
      assemblyNotifiedAtMs: 2_000_000,
    };
    const entry = buildSignalChronicleEntry(record);
    expect(entry).not.toBeNull();
    expect(entry?.isPublic).toBe(true);
  });

  it('entry title mentions THE SIGNAL', () => {
    const record: ChamberSixRecord = {
      status: 'ASSEMBLY_NOTIFIED',
      signalLoggedAtMs: 1_000_000,
      signalSourceDescription: 'Outside the 600-world survey arc',
      ekundayoConsultationResponse: EKUNDAYO_RESPONSE,
      assemblyNotifiedAtMs: 2_000_000,
    };
    const entry = buildSignalChronicleEntry(record);
    expect(entry?.title).toContain('THE SIGNAL');
  });

  it('entry body contains Ekundayo response', () => {
    const record: ChamberSixRecord = {
      status: 'ASSEMBLY_NOTIFIED',
      signalLoggedAtMs: 1_000_000,
      signalSourceDescription: 'Outside the 600-world survey arc',
      ekundayoConsultationResponse: EKUNDAYO_RESPONSE,
      assemblyNotifiedAtMs: 2_000_000,
    };
    const entry = buildSignalChronicleEntry(record);
    expect(entry?.body).toContain('Three hundred years');
  });
});

// ── ChamberSixError ───────────────────────────────────────────────────────────

describe('ChamberSixError', () => {
  it('has name ChamberSixError', () => {
    const err = new ChamberSixError('CONDITIONS_NOT_MET', 'test');
    expect(err.name).toBe('ChamberSixError');
  });

  it('exposes code', () => {
    const err = new ChamberSixError('INVALID_STATUS_TRANSITION', 'bad');
    expect(err.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('is instanceof Error', () => {
    expect(new ChamberSixError('EKUNDAYO_NOT_CONSULTED', 'x')).toBeInstanceOf(Error);
  });
});
