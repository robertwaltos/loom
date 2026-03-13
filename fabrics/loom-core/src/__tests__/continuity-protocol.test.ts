/**
 * Tests for continuity-protocol.ts
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createContinuityProtocolService,
  DEFAULT_VIGIL_THRESHOLD_DAYS,
  MAX_CONTINUITY_BONDS,
  NEURAL_MAP_MIN_FIDELITY,
  MS_PER_DAY,
  type ContinuityProtocolDeps,
  type ContinuityChronicleEntry,
} from '../continuity-protocol.js';

// ── Test Helpers ────────────────────────────────────────────────────────────

class TestClock {
  ms = 1_000_000;
  nowMs(): number { return this.ms; }
  nowUs(): number { return this.ms * 1000; }
  advance(n: number): void { this.ms += n; }
  advanceDays(days: number): void { this.ms += days * MS_PER_DAY; }
}

class TestIdGen {
  n = 0;
  next(): string { return `id-${++this.n}`; }
}

function makeDeps(
  clock: TestClock,
  idGen: TestIdGen,
  chronicle: ContinuityChronicleEntry[],
): ContinuityProtocolDeps {
  return {
    clock,
    idGenerator: idGen,
    vigilThresholdDays: DEFAULT_VIGIL_THRESHOLD_DAYS,
    chronicle: { emit: e => chronicle.push(e) },
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('continuity-protocol', () => {
  let clock: TestClock;
  let idGen: TestIdGen;
  let chronicle: ContinuityChronicleEntry[];

  beforeEach(() => {
    clock = new TestClock();
    idGen = new TestIdGen();
    chronicle = [];
  });

  // ── initDynasty ─────────────────────────────────────────────────────────

  describe('initDynasty', () => {
    it('creates a fresh dynasty record with default bonds', () => {
      const svc = createContinuityProtocolService(makeDeps(clock, idGen, chronicle));
      const result = svc.initDynasty('dynasty-alpha');
      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;
      expect(result.dynastyId).toBe('dynasty-alpha');
      expect(result.vigilState).toBe('ACTIVE');
      expect(result.continuityBonds).toBe(3);
      expect(result.neuralMaps).toHaveLength(0);
    });

    it('respects a custom initial bond count', () => {
      const svc = createContinuityProtocolService(makeDeps(clock, idGen, chronicle));
      const result = svc.initDynasty('dynasty-beta', 5);
      if (typeof result === 'string') return;
      expect(result.continuityBonds).toBe(5);
    });

    it('clamps initial bonds to MAX_CONTINUITY_BONDS', () => {
      const svc = createContinuityProtocolService(makeDeps(clock, idGen, chronicle));
      const result = svc.initDynasty('dynasty-gamma', 99);
      if (typeof result === 'string') return;
      expect(result.continuityBonds).toBe(MAX_CONTINUITY_BONDS);
    });

    it('rejects duplicate dynasty initialisation', () => {
      const svc = createContinuityProtocolService(makeDeps(clock, idGen, chronicle));
      svc.initDynasty('dynasty-delta');
      const result = svc.initDynasty('dynasty-delta');
      expect(typeof result).toBe('string');
    });
  });

  // ── recordLogin ──────────────────────────────────────────────────────────

  describe('recordLogin', () => {
    it('updates lastLoginMs on active dynasty', () => {
      const svc = createContinuityProtocolService(makeDeps(clock, idGen, chronicle));
      svc.initDynasty('dynasty-a');
      clock.advance(5_000);
      const result = svc.recordLogin('dynasty-a');
      if (typeof result === 'string') return;
      expect(result.lastLoginMs).toBe(clock.ms);
    });

    it('transitions VIGIL → RENEWED and emits Chronicle entry', () => {
      const svc = createContinuityProtocolService(makeDeps(clock, idGen, chronicle));
      svc.initDynasty('dynasty-b');
      clock.advanceDays(DEFAULT_VIGIL_THRESHOLD_DAYS + 1);
      svc.evaluateVigilState('dynasty-b');
      chronicle.length = 0; // clear vigil-entered entry

      const result = svc.recordLogin('dynasty-b');
      if (typeof result === 'string') return;
      expect(result.vigilState).toBe('RENEWED');
      expect(chronicle).toHaveLength(1);
      expect(chronicle[0]!.entryType).toBe('CONTINUITY_VIGIL_RENEWED');
    });

    it('returns error for unknown dynasty', () => {
      const svc = createContinuityProtocolService(makeDeps(clock, idGen, chronicle));
      const result = svc.recordLogin('nobody');
      expect(typeof result).toBe('string');
    });
  });

  // ── evaluateVigilState ───────────────────────────────────────────────────

  describe('evaluateVigilState', () => {
    it('stays ACTIVE when recently logged in', () => {
      const svc = createContinuityProtocolService(makeDeps(clock, idGen, chronicle));
      svc.initDynasty('dy-1');
      clock.advanceDays(5);
      const result = svc.evaluateVigilState('dy-1');
      if (typeof result === 'string') return;
      expect(result.vigilState).toBe('ACTIVE');
    });

    it('moves to WATCH at 70% of vigil threshold', () => {
      const svc = createContinuityProtocolService(makeDeps(clock, idGen, chronicle));
      svc.initDynasty('dy-2');
      clock.advanceDays(Math.ceil(DEFAULT_VIGIL_THRESHOLD_DAYS * 0.72));
      const result = svc.evaluateVigilState('dy-2');
      if (typeof result === 'string') return;
      expect(result.vigilState).toBe('WATCH');
    });

    it('enters VIGIL and emits Chronicle entry at threshold', () => {
      const svc = createContinuityProtocolService(makeDeps(clock, idGen, chronicle));
      svc.initDynasty('dy-3');
      clock.advanceDays(DEFAULT_VIGIL_THRESHOLD_DAYS + 1);
      const result = svc.evaluateVigilState('dy-3');
      if (typeof result === 'string') return;
      expect(result.vigilState).toBe('VIGIL');
      expect(chronicle).toHaveLength(1);
      expect(chronicle[0]!.entryType).toBe('CONTINUITY_VIGIL_ENTERED');
    });

    it('enters CRISIS at 3× threshold and emits Chronicle entry', () => {
      const svc = createContinuityProtocolService(makeDeps(clock, idGen, chronicle));
      svc.initDynasty('dy-4');
      clock.advanceDays(DEFAULT_VIGIL_THRESHOLD_DAYS * 3 + 1);
      const result = svc.evaluateVigilState('dy-4');
      if (typeof result === 'string') return;
      expect(result.vigilState).toBe('CRISIS');
      expect(chronicle.some(e => e.entryType === 'CONTINUITY_VIGIL_CRISIS')).toBe(true);
    });

    it('does not re-emit vigil entry on repeated evaluation', () => {
      const svc = createContinuityProtocolService(makeDeps(clock, idGen, chronicle));
      svc.initDynasty('dy-5');
      clock.advanceDays(DEFAULT_VIGIL_THRESHOLD_DAYS + 1);
      svc.evaluateVigilState('dy-5');
      svc.evaluateVigilState('dy-5');
      const vigilEntries = chronicle.filter(e => e.entryType === 'CONTINUITY_VIGIL_ENTERED');
      expect(vigilEntries).toHaveLength(1);
    });
  });

  // ── fileNeuralMap ────────────────────────────────────────────────────────

  describe('fileNeuralMap', () => {
    it('files a neural map and sets it as primary when fidelity is sufficient', () => {
      const svc = createContinuityProtocolService(makeDeps(clock, idGen, chronicle));
      svc.initDynasty('dy-nm-1');
      const result = svc.fileNeuralMap({ dynastyId: 'dy-nm-1', fidelityScore: 0.97 });
      if (typeof result === 'string') return;
      expect(result.fidelityScore).toBe(0.97);
      const record = svc.getDynastyRecord('dy-nm-1')!;
      expect(record.primaryMapId).toBe(result.mapId);
    });

    it('does not set primary when fidelity is below minimum', () => {
      const svc = createContinuityProtocolService(makeDeps(clock, idGen, chronicle));
      svc.initDynasty('dy-nm-2');
      svc.fileNeuralMap({ dynastyId: 'dy-nm-2', fidelityScore: NEURAL_MAP_MIN_FIDELITY - 0.01 });
      const record = svc.getDynastyRecord('dy-nm-2')!;
      expect(record.primaryMapId).toBeUndefined();
    });

    it('emits a chronicle entry on filing', () => {
      const svc = createContinuityProtocolService(makeDeps(clock, idGen, chronicle));
      svc.initDynasty('dy-nm-3');
      chronicle.length = 0;
      svc.fileNeuralMap({ dynastyId: 'dy-nm-3', fidelityScore: 0.92 });
      expect(chronicle).toHaveLength(1);
      expect(chronicle[0]!.entryType).toBe('CONTINUITY_NEURAL_MAP_FILED');
    });

    it('rejects filing for unknown dynasty', () => {
      const svc = createContinuityProtocolService(makeDeps(clock, idGen, chronicle));
      const result = svc.fileNeuralMap({ dynastyId: 'ghost', fidelityScore: 0.9 });
      expect(typeof result).toBe('string');
    });

    it('preserves capturedByVesselId when provided', () => {
      const svc = createContinuityProtocolService(makeDeps(clock, idGen, chronicle));
      svc.initDynasty('dy-nm-4');
      const result = svc.fileNeuralMap({
        dynastyId: 'dy-nm-4',
        fidelityScore: 0.9,
        capturedByVesselId: 'vessel-007',
      });
      if (typeof result === 'string') return;
      expect(result.capturedByVesselId).toBe('vessel-007');
    });
  });

  // ── recordSubstrateTransfer ──────────────────────────────────────────────

  describe('recordSubstrateTransfer', () => {
    it('records an UNRESOLVED substrate transfer and emits chronicle entry', () => {
      const svc = createContinuityProtocolService(makeDeps(clock, idGen, chronicle));
      svc.initDynasty('dy-st-1');
      const mapResult = svc.fileNeuralMap({ dynastyId: 'dy-st-1', fidelityScore: 0.93 });
      if (typeof mapResult === 'string') return;
      chronicle.length = 0;

      const transferResult = svc.recordSubstrateTransfer({
        dynastyId: 'dy-st-1',
        mapId: mapResult.mapId,
        continuityStatus: 'UNRESOLVED',
      });
      if (typeof transferResult === 'string') return;
      expect(chronicle).toHaveLength(1);
      expect(chronicle[0]!.entryType).toBe('CONTINUITY_SUBSTRATE_TRANSFER');
    });

    it('updates map substrate status', () => {
      const svc = createContinuityProtocolService(makeDeps(clock, idGen, chronicle));
      svc.initDynasty('dy-st-2');
      const mapResult = svc.fileNeuralMap({ dynastyId: 'dy-st-2', fidelityScore: 0.95 });
      if (typeof mapResult === 'string') return;

      svc.recordSubstrateTransfer({
        dynastyId: 'dy-st-2',
        mapId: mapResult.mapId,
        continuityStatus: 'PRESUMED_CONTINUOUS',
      });

      const record = svc.getDynastyRecord('dy-st-2')!;
      const map = record.neuralMaps.find(m => m.mapId === mapResult.mapId)!;
      expect(map.substrateStatus).toBe('PRESUMED_CONTINUOUS');
    });

    it('rejects transfer with invalid map id', () => {
      const svc = createContinuityProtocolService(makeDeps(clock, idGen, chronicle));
      svc.initDynasty('dy-st-3');
      const result = svc.recordSubstrateTransfer({
        dynastyId: 'dy-st-3',
        mapId: 'no-such-map',
        continuityStatus: 'UNRESOLVED',
      });
      expect(typeof result).toBe('string');
    });
  });

  // ── ContinuityBonds ──────────────────────────────────────────────────────

  describe('consumeContinuityBond', () => {
    it('decrements bond count and emits chronicle entry', () => {
      const svc = createContinuityProtocolService(makeDeps(clock, idGen, chronicle));
      svc.initDynasty('dy-cb-1', 3);
      chronicle.length = 0;
      const result = svc.consumeContinuityBond('dy-cb-1');
      if (typeof result === 'string') return;
      expect(result.continuityBonds).toBe(2);
      expect(chronicle[0]!.entryType).toBe('CONTINUITY_BOND_CONSUMED');
    });

    it('rejects consumption when no bonds remain', () => {
      const svc = createContinuityProtocolService(makeDeps(clock, idGen, chronicle));
      svc.initDynasty('dy-cb-2', 0);
      const result = svc.consumeContinuityBond('dy-cb-2');
      expect(typeof result).toBe('string');
    });
  });

  describe('awardContinuityBonds', () => {
    it('awards bonds up to the cap', () => {
      const svc = createContinuityProtocolService(makeDeps(clock, idGen, chronicle));
      svc.initDynasty('dy-aw-1', 5);
      const result = svc.awardContinuityBonds('dy-aw-1', 10);
      if (typeof result === 'string') return;
      expect(result.continuityBonds).toBe(MAX_CONTINUITY_BONDS);
    });
  });

  // ── getVigilDynasties ────────────────────────────────────────────────────

  describe('getVigilDynasties', () => {
    it('returns only VIGIL and CRISIS dynasties', () => {
      const svc = createContinuityProtocolService(makeDeps(clock, idGen, chronicle));
      svc.initDynasty('healthy');
      svc.initDynasty('inactive');
      clock.advanceDays(DEFAULT_VIGIL_THRESHOLD_DAYS + 1);
      svc.evaluateVigilState('inactive');
      const vigils = svc.getVigilDynasties();
      expect(vigils).toHaveLength(1);
      expect(vigils[0]!.dynastyId).toBe('inactive');
    });
  });

  // ── getContinuityStats ───────────────────────────────────────────────────

  describe('getContinuityStats', () => {
    it('reports accurate stats across a mixed network', () => {
      const svc = createContinuityProtocolService(makeDeps(clock, idGen, chronicle));
      svc.initDynasty('active-1');
      svc.initDynasty('vigil-1');
      svc.initDynasty('vigil-2');
      clock.advanceDays(DEFAULT_VIGIL_THRESHOLD_DAYS + 1);
      svc.evaluateVigilState('vigil-1');
      svc.evaluateVigilState('vigil-2');
      svc.fileNeuralMap({ dynastyId: 'active-1', fidelityScore: 0.95 });

      const stats = svc.getContinuityStats();
      expect(stats.totalDynasties).toBe(3);
      expect(stats.activeDynasties).toBe(1);
      expect(stats.vigilDynasties).toBe(2);
      expect(stats.totalNeuralMaps).toBe(1);
    });
  });
});
