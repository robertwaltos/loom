/**
 * governance-engine-simulation.test.ts — GovernanceEngine: elections,
 * legislation, disputes, debates, and sessions.
 *
 * Proves that:
 *   - Elections: call → register → endorse → campaign → vote → conclude
 *   - tick() advances election phases by time thresholds
 *   - Legislation: enact → apply world params → revoke
 *   - Disputes: file → assign panel → rule / appeal / dismiss
 *   - Debates: open → submit entries → retrieve
 *   - Sessions: start → end → getActive
 *   - Stats aggregate correctly across all subsystems
 */

import { describe, it, expect } from 'vitest';
import {
  createGovernanceEngine,
} from '../governance-engine.js';
import type {
  GovernanceEngineDeps,
  GovernanceEngineConfig,
  GovernanceEngine,
} from '../governance-engine.js';

// ── Helpers ─────────────────────────────────────────────────────

function createClock(startMicroseconds = 1_000_000_000) {
  let time = startMicroseconds;
  return {
    nowMicroseconds: () => time,
    advanceMicros: (us: number) => { time += us; },
    advanceMs: (ms: number) => { time += ms * 1_000; },
  };
}

function createIdGenerator() {
  let seq = 0;
  return {
    generate: () => `id-${++seq}`,
    last: () => `id-${seq}`,
  };
}

function createFakeLogger() {
  const entries: Array<{ level: string; ctx: Record<string, unknown>; msg: string }> = [];
  return {
    info: (ctx: Readonly<Record<string, unknown>>, msg: string) => {
      entries.push({ level: 'info', ctx: { ...ctx }, msg });
    },
    warn: (ctx: Readonly<Record<string, unknown>>, msg: string) => {
      entries.push({ level: 'warn', ctx: { ...ctx }, msg });
    },
    entries,
  };
}

function createFakeWorld() {
  const params = new Map<string, Map<string, number>>();
  return {
    applyParameter: (worldId: string, key: string, value: number) => {
      if (!params.has(worldId)) params.set(worldId, new Map());
      params.get(worldId)!.set(key, value);
    },
    getParameter: (worldId: string, key: string) => {
      return params.get(worldId)?.get(key) ?? 0;
    },
    params,
  };
}

function createFakeNotifications() {
  const sent: Array<{ target: string; notification: { type: string; title: string } }> = [];
  return {
    notifyWorld: (worldId: string, notification: { type: string; title: string; details: Record<string, unknown> }) => {
      sent.push({ target: worldId, notification });
    },
    notifyDynasty: (dynastyId: string, notification: { type: string; title: string; details: Record<string, unknown> }) => {
      sent.push({ target: dynastyId, notification });
    },
    sent,
  };
}

function createTestEngine(configOverrides?: Partial<GovernanceEngineConfig>) {
  const clock = createClock();
  const idGen = createIdGenerator();
  const logger = createFakeLogger();
  const world = createFakeWorld();
  const notifications = createFakeNotifications();

  const deps: GovernanceEngineDeps = {
    clock,
    idGenerator: idGen,
    logger,
    world,
    notifications,
  };

  const engine = createGovernanceEngine(deps, configOverrides);
  return { engine, clock, idGen, logger, world, notifications };
}

// Shorten durations for faster tick-based tests
const FAST_CONFIG: Partial<GovernanceEngineConfig> = {
  electionRegistrationDurationMs: 100,
  electionCampaignDurationMs: 100,
  electionVotingDurationMs: 100,
  regularSessionDurationMs: 100,
};

// ── Elections ───────────────────────────────────────────────────

describe('GovernanceEngine', () => {
  describe('elections', () => {
    it('calls an election in REGISTRATION phase', () => {
      const { engine } = createTestEngine();

      const election = engine.callElection('alkahest', 'GOVERNOR');

      expect(election.phase).toBe('REGISTRATION');
      expect(election.worldId).toBe('alkahest');
      expect(election.role).toBe('GOVERNOR');
      expect(election.winnerId).toBeNull();
      expect(election.candidates).toHaveLength(0);
    });

    it('registers candidates during REGISTRATION phase', () => {
      const { engine } = createTestEngine();
      const election = engine.callElection('w-1', 'GOVERNOR');

      const updated = engine.registerCandidate({
        electionId: election.electionId,
        dynastyId: 'd-1',
        displayName: 'Lord Vance',
        platform: 'Lower taxes for merchants',
      });

      expect(updated.candidates).toHaveLength(1);
      expect(updated.candidates[0]!.dynastyId).toBe('d-1');
      expect(updated.candidates[0]!.platform).toBe('Lower taxes for merchants');
    });

    it('rejects duplicate candidate registrations', () => {
      const { engine } = createTestEngine();
      const election = engine.callElection('w-1', 'GOVERNOR');

      engine.registerCandidate({
        electionId: election.electionId,
        dynastyId: 'd-1', displayName: 'A', platform: 'X',
      });

      expect(() => engine.registerCandidate({
        electionId: election.electionId,
        dynastyId: 'd-1', displayName: 'A2', platform: 'X2',
      })).toThrow('already registered');
    });

    it('enforces max candidates per election', () => {
      const { engine } = createTestEngine({
        maxCandidatesPerElection: 2,
      });
      const election = engine.callElection('w-1', 'GOVERNOR');

      engine.registerCandidate({
        electionId: election.electionId,
        dynastyId: 'd-1', displayName: 'A', platform: 'X',
      });
      engine.registerCandidate({
        electionId: election.electionId,
        dynastyId: 'd-2', displayName: 'B', platform: 'Y',
      });

      expect(() => engine.registerCandidate({
        electionId: election.electionId,
        dynastyId: 'd-3', displayName: 'C', platform: 'Z',
      })).toThrow('Maximum candidates');
    });

    it('endorses candidates', () => {
      const { engine } = createTestEngine();
      const election = engine.callElection('w-1', 'GOVERNOR');

      engine.registerCandidate({
        electionId: election.electionId,
        dynastyId: 'd-1', displayName: 'A', platform: 'X',
      });

      const updated = engine.endorseCandidate(
        election.electionId, 'd-2', 'd-1',
      );

      expect(updated.candidates[0]!.endorsements).toContain('d-2');
    });

    it('prevents double endorsement', () => {
      const { engine } = createTestEngine();
      const election = engine.callElection('w-1', 'GOVERNOR');

      engine.registerCandidate({
        electionId: election.electionId,
        dynastyId: 'd-1', displayName: 'A', platform: 'X',
      });

      engine.endorseCandidate(election.electionId, 'd-2', 'd-1');

      expect(() => engine.endorseCandidate(
        election.electionId, 'd-2', 'd-1',
      )).toThrow('Already endorsed');
    });

    it('rejects votes in non-VOTING phase', () => {
      const { engine } = createTestEngine();
      const election = engine.callElection('w-1', 'GOVERNOR');

      engine.registerCandidate({
        electionId: election.electionId,
        dynastyId: 'd-1', displayName: 'A', platform: 'X',
      });

      expect(() => engine.castElectionVote({
        electionId: election.electionId,
        voterId: 'v-1', candidateId: 'd-1', weight: 1,
      })).toThrow('not in voting phase');
    });

    it('full election lifecycle with tick-based phase transitions', () => {
      const { engine, clock } = createTestEngine(FAST_CONFIG);
      const election = engine.callElection('w-1', 'TREASURER');

      // Registration phase: add candidates
      engine.registerCandidate({
        electionId: election.electionId,
        dynastyId: 'd-1', displayName: 'Candidate A', platform: 'Low taxes',
      });
      engine.registerCandidate({
        electionId: election.electionId,
        dynastyId: 'd-2', displayName: 'Candidate B', platform: 'More soldiers',
      });

      // Advance past registration → campaigning
      clock.advanceMs(101);
      engine.tick();
      const afterCampaign = engine.getElection(election.electionId)!;
      expect(afterCampaign.phase).toBe('CAMPAIGNING');

      // Advance past campaign → voting
      clock.advanceMs(101);
      engine.tick();
      const afterVoting = engine.getElection(election.electionId)!;
      expect(afterVoting.phase).toBe('VOTING');

      // Cast votes
      engine.castElectionVote({
        electionId: election.electionId,
        voterId: 'v-1', candidateId: 'd-1', weight: 3,
      });
      engine.castElectionVote({
        electionId: election.electionId,
        voterId: 'v-2', candidateId: 'd-2', weight: 1,
      });
      engine.castElectionVote({
        electionId: election.electionId,
        voterId: 'v-3', candidateId: 'd-1', weight: 2,
      });

      // Advance past voting → auto-conclude via tick
      clock.advanceMs(101);
      engine.tick();
      const concluded = engine.getElection(election.electionId)!;
      expect(concluded.phase).toBe('CONCLUDED');
      expect(concluded.winnerId).toBe('d-1'); // 5 vs 1
      expect(concluded.totalVotes).toBe(3);
    });

    it('rejects concluding with fewer than minCandidates', () => {
      const { engine } = createTestEngine({ minCandidatesForElection: 2 });
      const election = engine.callElection('w-1', 'GOVERNOR');

      engine.registerCandidate({
        electionId: election.electionId,
        dynastyId: 'd-1', displayName: 'Solo', platform: 'Me',
      });

      expect(() => engine.concludeElection(election.electionId))
        .toThrow('Not enough candidates');
    });

    it('rejects duplicate voter', () => {
      const { engine, clock } = createTestEngine(FAST_CONFIG);
      const election = engine.callElection('w-1', 'JUDGE');

      engine.registerCandidate({ electionId: election.electionId, dynastyId: 'd-1', displayName: 'A', platform: 'X' });
      engine.registerCandidate({ electionId: election.electionId, dynastyId: 'd-2', displayName: 'B', platform: 'Y' });

      clock.advanceMs(101);
      engine.tick(); // → CAMPAIGNING
      clock.advanceMs(101);
      engine.tick(); // → VOTING

      engine.castElectionVote({ electionId: election.electionId, voterId: 'v-1', candidateId: 'd-1', weight: 1 });

      expect(() => engine.castElectionVote({
        electionId: election.electionId, voterId: 'v-1', candidateId: 'd-2', weight: 1,
      })).toThrow('already voted');
    });

    it('rejects vote for non-existent candidate', () => {
      const { engine, clock } = createTestEngine(FAST_CONFIG);
      const election = engine.callElection('w-1', 'SPEAKER');

      engine.registerCandidate({ electionId: election.electionId, dynastyId: 'd-1', displayName: 'A', platform: 'X' });
      engine.registerCandidate({ electionId: election.electionId, dynastyId: 'd-2', displayName: 'B', platform: 'Y' });

      clock.advanceMs(101);
      engine.tick(); // → CAMPAIGNING
      clock.advanceMs(101);
      engine.tick(); // → VOTING

      expect(() => engine.castElectionVote({
        electionId: election.electionId, voterId: 'v-1', candidateId: 'd-999', weight: 1,
      })).toThrow('not in election');
    });

    it('getElection returns undefined for unknown id', () => {
      const { engine } = createTestEngine();
      expect(engine.getElection('nope')).toBeUndefined();
    });

    it('sends notifications on call and conclude', () => {
      const { engine, clock, notifications } = createTestEngine(FAST_CONFIG);
      const election = engine.callElection('w-1', 'MARSHAL');

      expect(notifications.sent.some(n => n.notification.type === 'election.called')).toBe(true);

      engine.registerCandidate({ electionId: election.electionId, dynastyId: 'd-1', displayName: 'A', platform: 'X' });
      engine.registerCandidate({ electionId: election.electionId, dynastyId: 'd-2', displayName: 'B', platform: 'Y' });

      clock.advanceMs(101);
      engine.tick(); // → CAMPAIGNING
      clock.advanceMs(101);
      engine.tick(); // → VOTING
      clock.advanceMs(101);
      engine.tick(); // → CONCLUDED

      expect(notifications.sent.some(n => n.notification.type === 'election.concluded')).toBe(true);
    });
  });

  // ── Legislation ────────────────────────────────────────────────

  describe('legislation', () => {
    it('enacts legislation and applies world parameters', () => {
      const { engine, world } = createTestEngine();

      const law = engine.enactLegislation(
        'alkahest', 'prop-1', 'TAX_RATE',
        'Merchant Tax', 'Tax merchants at 15%',
        { merchantTaxRate: 15, importDuty: 5 },
        'governor-1',
      );

      expect(law.type).toBe('TAX_RATE');
      expect(law.title).toBe('Merchant Tax');
      expect(law.enactedBy).toBe('governor-1');
      expect(world.getParameter('alkahest', 'merchantTaxRate')).toBe(15);
      expect(world.getParameter('alkahest', 'importDuty')).toBe(5);
    });

    it('getActiveLegislation returns only non-revoked, non-expired', () => {
      const { engine, clock } = createTestEngine({ legislationDefaultDurationMs: 100 });

      engine.enactLegislation('w-1', 'p-1', 'TRADE_TARIFF', 'Tariff A', '', { rate: 10 }, 'gov');
      engine.enactLegislation('w-1', 'p-2', 'BUILDING_PERMIT', 'Permit B', '', { fee: 5 }, 'gov');

      expect(engine.getActiveLegislation('w-1')).toHaveLength(2);

      // Revoke one
      const laws = engine.getActiveLegislation('w-1');
      engine.revokeLegislation(laws[0]!.legislationId);

      expect(engine.getActiveLegislation('w-1')).toHaveLength(1);

      // Expire the other
      clock.advanceMs(101);
      expect(engine.getActiveLegislation('w-1')).toHaveLength(0);
    });

    it('revokeLegislation returns false for already-revoked law', () => {
      const { engine } = createTestEngine();
      const law = engine.enactLegislation('w-1', 'p-1', 'TAX_RATE', 'Tax', '', { r: 10 }, 'gov');

      expect(engine.revokeLegislation(law.legislationId)).toBe(true);
      expect(engine.revokeLegislation(law.legislationId)).toBe(false);
    });

    it('revokeLegislation returns false for unknown ID', () => {
      const { engine } = createTestEngine();
      expect(engine.revokeLegislation('nonexistent')).toBe(false);
    });

    it('getActiveLegislation scopes by world', () => {
      const { engine } = createTestEngine();
      engine.enactLegislation('w-1', 'p', 'TAX_RATE', 'A', '', { r: 1 }, 'g');
      engine.enactLegislation('w-2', 'p', 'TAX_RATE', 'B', '', { r: 2 }, 'g');

      expect(engine.getActiveLegislation('w-1')).toHaveLength(1);
      expect(engine.getActiveLegislation('w-2')).toHaveLength(1);
      expect(engine.getActiveLegislation('w-3')).toHaveLength(0);
    });
  });

  // ── Disputes ──────────────────────────────────────────────────

  describe('disputes', () => {
    it('files a dispute in FILED status', () => {
      const { engine } = createTestEngine();

      const dispute = engine.fileDispute({
        worldId: 'w-1',
        plaintiffId: 'd-1',
        defendantId: 'd-2',
        category: 'trade_violation',
        description: 'Sold counterfeit goods',
        evidence: ['receipt-1', 'witness-A'],
      });

      expect(dispute.status).toBe('FILED');
      expect(dispute.plaintiffId).toBe('d-1');
      expect(dispute.evidence).toHaveLength(2);
    });

    it('assigns arbitration panel', () => {
      const { engine } = createTestEngine();
      const dispute = engine.fileDispute({
        worldId: 'w-1', plaintiffId: 'd-1', defendantId: 'd-2',
        category: 'theft', description: 'Stolen goods', evidence: [],
      });

      const updated = engine.assignArbitrationPanel(
        dispute.disputeId,
        ['j-1', 'j-2', 'j-3'],
      );

      expect(updated.status).toBe('ARBITRATION');
      expect(updated.panelJudgeIds).toHaveLength(3);
    });

    it('rejects wrong panel size', () => {
      const { engine } = createTestEngine({ arbitrationPanelSize: 3 });
      const dispute = engine.fileDispute({
        worldId: 'w-1', plaintiffId: 'd-1', defendantId: 'd-2',
        category: 'x', description: '', evidence: [],
      });

      expect(() => engine.assignArbitrationPanel(
        dispute.disputeId, ['j-1', 'j-2'],
      )).toThrow('exactly 3 judges');
    });

    it('rules on a dispute in ARBITRATION', () => {
      const { engine } = createTestEngine();
      const dispute = engine.fileDispute({
        worldId: 'w-1', plaintiffId: 'd-1', defendantId: 'd-2',
        category: 'fraud', description: '', evidence: [],
      });

      engine.assignArbitrationPanel(dispute.disputeId, ['j-1', 'j-2', 'j-3']);
      const ruled = engine.ruleOnDispute(dispute.disputeId, 'Defendant guilty, pay 500 KALON');

      expect(ruled.status).toBe('RESOLVED');
      expect(ruled.ruling).toBe('Defendant guilty, pay 500 KALON');
    });

    it('rejects rule on non-arbitration dispute', () => {
      const { engine } = createTestEngine();
      const dispute = engine.fileDispute({
        worldId: 'w-1', plaintiffId: 'd-1', defendantId: 'd-2',
        category: 'x', description: '', evidence: [],
      });

      expect(() => engine.ruleOnDispute(dispute.disputeId, 'ruling'))
        .toThrow('not in arbitration');
    });

    it('appeals a resolved dispute', () => {
      const { engine } = createTestEngine();
      const dispute = engine.fileDispute({
        worldId: 'w-1', plaintiffId: 'd-1', defendantId: 'd-2',
        category: 'x', description: '', evidence: [],
      });

      engine.assignArbitrationPanel(dispute.disputeId, ['j-1', 'j-2', 'j-3']);
      engine.ruleOnDispute(dispute.disputeId, 'Guilty');

      const appealed = engine.appealDispute(dispute.disputeId);
      expect(appealed.status).toBe('APPEALED');
      expect(appealed.ruling).toBeNull();
    });

    it('rejects appeal of non-resolved dispute', () => {
      const { engine } = createTestEngine();
      const dispute = engine.fileDispute({
        worldId: 'w-1', plaintiffId: 'a', defendantId: 'b',
        category: 'x', description: '', evidence: [],
      });

      expect(() => engine.appealDispute(dispute.disputeId))
        .toThrow('not resolved');
    });

    it('dismisses a dispute', () => {
      const { engine } = createTestEngine();
      const dispute = engine.fileDispute({
        worldId: 'w-1', plaintiffId: 'a', defendantId: 'b',
        category: 'x', description: '', evidence: [],
      });

      const dismissed = engine.dismissDispute(dispute.disputeId);
      expect(dismissed.status).toBe('DISMISSED');
    });

    it('getDispute returns undefined for unknown', () => {
      const { engine } = createTestEngine();
      expect(engine.getDispute('nope')).toBeUndefined();
    });
  });

  // ── Debates ───────────────────────────────────────────────────

  describe('debates', () => {
    it('opens a debate and submits entries', () => {
      const { engine } = createTestEngine();

      engine.openDebate('prop-1');

      const entry1 = engine.submitDebateEntry('prop-1', 's-1', 'for', 'I support this motion.');
      const entry2 = engine.submitDebateEntry('prop-1', 's-2', 'against', 'This is reckless.');
      const entry3 = engine.submitDebateEntry('prop-1', 's-3', 'question', 'What about the cost?');

      expect(entry1.position).toBe('for');
      expect(entry2.position).toBe('against');
      expect(entry3.position).toBe('question');

      const entries = engine.getDebateEntries('prop-1');
      expect(entries).toHaveLength(3);
    });

    it('auto-opens unknown proposal debates on entry', () => {
      const { engine } = createTestEngine();

      // submit without prior openDebate
      engine.submitDebateEntry('prop-new', 's-1', 'for', 'Go for it');

      const entries = engine.getDebateEntries('prop-new');
      expect(entries).toHaveLength(1);
    });

    it('returns empty array for no debate', () => {
      const { engine } = createTestEngine();
      expect(engine.getDebateEntries('unknown')).toHaveLength(0);
    });
  });

  // ── Sessions ──────────────────────────────────────────────────

  describe('sessions', () => {
    it('starts a session', () => {
      const { engine } = createTestEngine();

      const session = engine.startSession('alkahest', 'REGULAR', [
        'Trade discussion',
        'Military budget',
      ]);

      expect(session.sessionType).toBe('REGULAR');
      expect(session.active).toBe(true);
      expect(session.agenda).toHaveLength(2);
    });

    it('ends a session', () => {
      const { engine } = createTestEngine();
      const session = engine.startSession('w-1', 'EMERGENCY', ['Crisis']);

      const ended = engine.endSession(session.sessionId);
      expect(ended.active).toBe(false);
    });

    it('getActiveSession returns current session', () => {
      const { engine } = createTestEngine();
      engine.startSession('w-1', 'REGULAR', ['Agenda']);

      expect(engine.getActiveSession('w-1')).toBeDefined();
      expect(engine.getActiveSession('w-2')).toBeUndefined();
    });

    it('tick expires sessions past duration', () => {
      const { engine, clock } = createTestEngine(FAST_CONFIG);

      engine.startSession('w-1', 'REGULAR', ['Agenda']);
      expect(engine.getActiveSession('w-1')).toBeDefined();

      clock.advanceMs(101);
      engine.tick();

      expect(engine.getActiveSession('w-1')).toBeUndefined();
    });

    it('throws on end unknown session', () => {
      const { engine } = createTestEngine();
      expect(() => engine.endSession('nope')).toThrow('not found');
    });
  });

  // ── Stats ─────────────────────────────────────────────────────

  describe('stats', () => {
    it('aggregates all subsystems', () => {
      const { engine, clock } = createTestEngine(FAST_CONFIG);

      // Election (active)
      const e = engine.callElection('w-1', 'GOVERNOR');
      engine.registerCandidate({ electionId: e.electionId, dynastyId: 'd-1', displayName: 'A', platform: 'X' });
      engine.registerCandidate({ electionId: e.electionId, dynastyId: 'd-2', displayName: 'B', platform: 'Y' });

      // Legislation
      engine.enactLegislation('w-1', 'p-1', 'TAX_RATE', 'Tax', '', { r: 10 }, 'gov');

      // Dispute filed + resolved
      const d = engine.fileDispute({
        worldId: 'w-1', plaintiffId: 'a', defendantId: 'b',
        category: 'x', description: '', evidence: [],
      });
      engine.assignArbitrationPanel(d.disputeId, ['j-1', 'j-2', 'j-3']);
      engine.ruleOnDispute(d.disputeId, 'guilty');

      // Debate
      engine.submitDebateEntry('prop-1', 's-1', 'for', 'Good idea');

      // Session
      engine.startSession('w-1', 'REGULAR', ['item']);

      const stats = engine.getStats();
      expect(stats.totalElections).toBe(1);
      expect(stats.activeElections).toBe(1);
      expect(stats.totalLegislation).toBe(1);
      expect(stats.activeLegislation).toBe(1);
      expect(stats.totalDisputes).toBe(1);
      expect(stats.resolvedDisputes).toBe(1);
      expect(stats.totalDebateEntries).toBe(1);
      expect(stats.activeSessions).toBe(1);
    });

    it('stats reflect concluded elections', () => {
      const { engine, clock } = createTestEngine(FAST_CONFIG);

      const e = engine.callElection('w-1', 'JUDGE');
      engine.registerCandidate({ electionId: e.electionId, dynastyId: 'd-1', displayName: 'A', platform: 'X' });
      engine.registerCandidate({ electionId: e.electionId, dynastyId: 'd-2', displayName: 'B', platform: 'Y' });

      // Advance through all phases (tick advances one phase per call)
      clock.advanceMs(101);
      engine.tick(); // → CAMPAIGNING
      clock.advanceMs(101);
      engine.tick(); // → VOTING
      clock.advanceMs(101);
      engine.tick(); // → CONCLUDED

      const stats = engine.getStats();
      expect(stats.totalElections).toBe(1);
      expect(stats.activeElections).toBe(0);
    });
  });

  // ── Tick Phase Transitions ────────────────────────────────────

  describe('tick phase transitions', () => {
    it('REGISTRATION → CAMPAIGNING at registration deadline', () => {
      const { engine, clock } = createTestEngine(FAST_CONFIG);
      const e = engine.callElection('w-1', 'GOVERNOR');

      clock.advanceMs(101);
      engine.tick();

      expect(engine.getElection(e.electionId)!.phase).toBe('CAMPAIGNING');
    });

    it('does not advance phase before deadline', () => {
      const { engine, clock } = createTestEngine(FAST_CONFIG);
      const e = engine.callElection('w-1', 'GOVERNOR');

      clock.advanceMs(50);
      engine.tick();

      expect(engine.getElection(e.electionId)!.phase).toBe('REGISTRATION');
    });

    it('CAMPAIGNING → VOTING at campaign deadline', () => {
      const { engine, clock } = createTestEngine(FAST_CONFIG);
      const e = engine.callElection('w-1', 'GOVERNOR');

      clock.advanceMs(101);
      engine.tick(); // → CAMPAIGNING
      clock.advanceMs(101);
      engine.tick(); // → VOTING

      expect(engine.getElection(e.electionId)!.phase).toBe('VOTING');
    });

    it('VOTING → auto-conclude at voting deadline', () => {
      const { engine, clock } = createTestEngine(FAST_CONFIG);
      const e = engine.callElection('w-1', 'GOVERNOR');

      engine.registerCandidate({ electionId: e.electionId, dynastyId: 'd-1', displayName: 'A', platform: 'X' });
      engine.registerCandidate({ electionId: e.electionId, dynastyId: 'd-2', displayName: 'B', platform: 'Y' });

      clock.advanceMs(101);
      engine.tick(); // → CAMPAIGNING
      clock.advanceMs(101);
      engine.tick(); // → VOTING
      clock.advanceMs(101);
      engine.tick(); // → CONCLUDED

      expect(engine.getElection(e.electionId)!.phase).toBe('CONCLUDED');
    });
  });

  // ── Logging ───────────────────────────────────────────────────

  describe('logging', () => {
    it('logs election call', () => {
      const { engine, logger } = createTestEngine();
      engine.callElection('w-1', 'GOVERNOR');

      expect(logger.entries.some(e => e.msg === 'governance.election.called')).toBe(true);
    });

    it('logs legislation enacted', () => {
      const { engine, logger } = createTestEngine();
      engine.enactLegislation('w-1', 'p', 'TAX_RATE', 'T', '', { r: 1 }, 'g');

      expect(logger.entries.some(e => e.msg === 'governance.legislation.enacted')).toBe(true);
    });

    it('logs dispute filed', () => {
      const { engine, logger } = createTestEngine();
      engine.fileDispute({
        worldId: 'w-1', plaintiffId: 'a', defendantId: 'b',
        category: 'x', description: '', evidence: [],
      });

      expect(logger.entries.some(e => e.msg === 'governance.dispute.filed')).toBe(true);
    });

    it('logs session lifecycle', () => {
      const { engine, logger } = createTestEngine();
      const s = engine.startSession('w-1', 'REGULAR', ['agenda']);
      engine.endSession(s.sessionId);

      expect(logger.entries.some(e => e.msg === 'governance.session.started')).toBe(true);
      expect(logger.entries.some(e => e.msg === 'governance.session.ended')).toBe(true);
    });
  });
});
