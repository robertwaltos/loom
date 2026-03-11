/**
 * Governance Engine — Elections, legislation, and judicial system.
 *
 * Extends the Assembly with:
 *   - Election campaigns: candidate registration, platform, voting
 *   - Legislation execution: enacted laws modify world parameters
 *   - Judicial system: disputes, appeals, arbitration panels
 *   - Debate phase: structured discussion before voting
 *   - Constitutional amendments: supermajority + ratification period
 *   - Session scheduling: weekly cycles, emergency sessions
 *
 * Integrates with the existing Assembly for the core voting engine.
 */

// ── Ports ────────────────────────────────────────────────────────

export interface GovernanceClockPort {
  readonly nowMicroseconds: () => number;
}

export interface GovernanceIdPort {
  readonly generate: () => string;
}

export interface GovernanceLogPort {
  readonly info: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
  readonly warn: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
}

export interface GovernanceWorldPort {
  readonly applyParameter: (worldId: string, key: string, value: number) => void;
  readonly getParameter: (worldId: string, key: string) => number;
}

export interface GovernanceNotificationPort {
  readonly notifyWorld: (worldId: string, notification: GovernanceNotification) => void;
  readonly notifyDynasty: (dynastyId: string, notification: GovernanceNotification) => void;
}

export interface GovernanceNotification {
  readonly type: string;
  readonly title: string;
  readonly details: Readonly<Record<string, unknown>>;
}

// ── Types ────────────────────────────────────────────────────────

export type ElectionPhase =
  | 'REGISTRATION'
  | 'CAMPAIGNING'
  | 'VOTING'
  | 'CONCLUDED';

export type GovernanceRole =
  | 'GOVERNOR'
  | 'TREASURER'
  | 'JUDGE'
  | 'MARSHAL'
  | 'SPEAKER';

export type DisputeStatus =
  | 'FILED'
  | 'REVIEW'
  | 'ARBITRATION'
  | 'APPEALED'
  | 'RESOLVED'
  | 'DISMISSED';

export type LegislationType =
  | 'TAX_RATE'
  | 'TRADE_TARIFF'
  | 'BUILDING_PERMIT'
  | 'ZONE_RESTRICTION'
  | 'RESOURCE_QUOTA'
  | 'IMMIGRATION_POLICY'
  | 'MILITARY_BUDGET'
  | 'PUBLIC_WORKS';

export type SessionType = 'REGULAR' | 'EMERGENCY' | 'SPECIAL';

export type DebatePhaseStatus = 'OPEN' | 'CLOSED' | 'EXTENDED';

// ── Election Types ───────────────────────────────────────────────

export interface ElectionCandidate {
  readonly dynastyId: string;
  readonly displayName: string;
  readonly platform: string;
  readonly registeredAt: number;
  readonly endorsements: ReadonlyArray<string>;
}

export interface ElectionRecord {
  readonly electionId: string;
  readonly worldId: string;
  readonly role: GovernanceRole;
  readonly phase: ElectionPhase;
  readonly candidates: ReadonlyArray<ElectionCandidate>;
  readonly registrationEndsAt: number;
  readonly campaignEndsAt: number;
  readonly votingEndsAt: number;
  readonly winnerId: string | null;
  readonly totalVotes: number;
  readonly turnout: number;
}

export interface RegisterCandidateParams {
  readonly electionId: string;
  readonly dynastyId: string;
  readonly displayName: string;
  readonly platform: string;
}

export interface CastElectionVoteParams {
  readonly electionId: string;
  readonly voterId: string;
  readonly candidateId: string;
  readonly weight: number;
}

// ── Legislation Types ────────────────────────────────────────────

export interface Legislation {
  readonly legislationId: string;
  readonly worldId: string;
  readonly type: LegislationType;
  readonly title: string;
  readonly description: string;
  readonly parameters: Readonly<Record<string, number>>;
  readonly proposalId: string;
  readonly enactedAt: number;
  readonly expiresAt: number;
  readonly enactedBy: string;
}

// ── Dispute Types ────────────────────────────────────────────────

export interface Dispute {
  readonly disputeId: string;
  readonly worldId: string;
  readonly plaintiffId: string;
  readonly defendantId: string;
  readonly category: string;
  readonly description: string;
  readonly evidence: ReadonlyArray<string>;
  readonly status: DisputeStatus;
  readonly filedAt: number;
  readonly panelJudgeIds: ReadonlyArray<string>;
  readonly ruling: string | null;
  readonly ruledAt: number;
}

export interface FileDisputeParams {
  readonly worldId: string;
  readonly plaintiffId: string;
  readonly defendantId: string;
  readonly category: string;
  readonly description: string;
  readonly evidence: ReadonlyArray<string>;
}

// ── Debate Types ─────────────────────────────────────────────────

export interface DebateEntry {
  readonly debateId: string;
  readonly proposalId: string;
  readonly speakerId: string;
  readonly position: 'for' | 'against' | 'question';
  readonly content: string;
  readonly timestamp: number;
}

// ── Session Types ────────────────────────────────────────────────

export interface GovernanceSession {
  readonly sessionId: string;
  readonly worldId: string;
  readonly sessionType: SessionType;
  readonly startedAt: number;
  readonly endsAt: number;
  readonly agenda: ReadonlyArray<string>;
  readonly active: boolean;
}

// ── Config ───────────────────────────────────────────────────────

export interface GovernanceEngineConfig {
  readonly electionRegistrationDurationMs: number;
  readonly electionCampaignDurationMs: number;
  readonly electionVotingDurationMs: number;
  readonly debateDurationMs: number;
  readonly regularSessionIntervalMs: number;
  readonly regularSessionDurationMs: number;
  readonly maxCandidatesPerElection: number;
  readonly minCandidatesForElection: number;
  readonly arbitrationPanelSize: number;
  readonly legislationDefaultDurationMs: number;
}

const DEFAULT_CONFIG: GovernanceEngineConfig = {
  electionRegistrationDurationMs: 7 * 24 * 60 * 60 * 1_000,
  electionCampaignDurationMs: 3 * 24 * 60 * 60 * 1_000,
  electionVotingDurationMs: 2 * 24 * 60 * 60 * 1_000,
  debateDurationMs: 3 * 24 * 60 * 60 * 1_000,
  regularSessionIntervalMs: 7 * 24 * 60 * 60 * 1_000,
  regularSessionDurationMs: 24 * 60 * 60 * 1_000,
  maxCandidatesPerElection: 10,
  minCandidatesForElection: 2,
  arbitrationPanelSize: 3,
  legislationDefaultDurationMs: 30 * 24 * 60 * 60 * 1_000,
};

// ── Stats ────────────────────────────────────────────────────────

export interface GovernanceEngineStats {
  readonly totalElections: number;
  readonly activeElections: number;
  readonly totalLegislation: number;
  readonly activeLegislation: number;
  readonly totalDisputes: number;
  readonly resolvedDisputes: number;
  readonly totalDebateEntries: number;
  readonly activeSessions: number;
}

// ── Public API ───────────────────────────────────────────────────

export interface GovernanceEngine {
  // Elections
  readonly callElection: (worldId: string, role: GovernanceRole) => ElectionRecord;
  readonly registerCandidate: (params: RegisterCandidateParams) => ElectionRecord;
  readonly endorseCandidate: (
    electionId: string,
    endorserId: string,
    candidateId: string,
  ) => ElectionRecord;
  readonly castElectionVote: (params: CastElectionVoteParams) => void;
  readonly concludeElection: (electionId: string) => ElectionRecord;
  readonly getElection: (electionId: string) => ElectionRecord | undefined;

  // Legislation
  readonly enactLegislation: (
    worldId: string,
    proposalId: string,
    type: LegislationType,
    title: string,
    description: string,
    parameters: Readonly<Record<string, number>>,
    enactedBy: string,
  ) => Legislation;
  readonly revokeLegislation: (legislationId: string) => boolean;
  readonly getActiveLegislation: (worldId: string) => ReadonlyArray<Legislation>;

  // Disputes
  readonly fileDispute: (params: FileDisputeParams) => Dispute;
  readonly assignArbitrationPanel: (disputeId: string, judgeIds: ReadonlyArray<string>) => Dispute;
  readonly ruleOnDispute: (disputeId: string, ruling: string) => Dispute;
  readonly appealDispute: (disputeId: string) => Dispute;
  readonly dismissDispute: (disputeId: string) => Dispute;
  readonly getDispute: (disputeId: string) => Dispute | undefined;

  // Debate
  readonly openDebate: (proposalId: string) => void;
  readonly submitDebateEntry: (
    proposalId: string,
    speakerId: string,
    position: 'for' | 'against' | 'question',
    content: string,
  ) => DebateEntry;
  readonly getDebateEntries: (proposalId: string) => ReadonlyArray<DebateEntry>;

  // Sessions
  readonly startSession: (worldId: string, sessionType: SessionType, agenda: ReadonlyArray<string>) => GovernanceSession;
  readonly endSession: (sessionId: string) => GovernanceSession;
  readonly getActiveSession: (worldId: string) => GovernanceSession | undefined;

  // Lifecycle
  readonly tick: () => void;
  readonly getStats: () => GovernanceEngineStats;
}

// ── Deps ─────────────────────────────────────────────────────────

export interface GovernanceEngineDeps {
  readonly clock: GovernanceClockPort;
  readonly idGenerator: GovernanceIdPort;
  readonly logger: GovernanceLogPort;
  readonly world: GovernanceWorldPort;
  readonly notifications: GovernanceNotificationPort;
}

// ── Mutable State ────────────────────────────────────────────────

interface MutableElection {
  readonly electionId: string;
  readonly worldId: string;
  readonly role: GovernanceRole;
  phase: ElectionPhase;
  readonly candidates: MutableCandidate[];
  readonly registrationEndsAt: number;
  readonly campaignEndsAt: number;
  readonly votingEndsAt: number;
  winnerId: string | null;
  readonly votes: Map<string, { candidateId: string; weight: number }>;
  totalVotes: number;
  eligibleVoters: number;
}

interface MutableCandidate {
  readonly dynastyId: string;
  readonly displayName: string;
  readonly platform: string;
  readonly registeredAt: number;
  readonly endorsements: string[];
}

interface MutableDispute {
  readonly disputeId: string;
  readonly worldId: string;
  readonly plaintiffId: string;
  readonly defendantId: string;
  readonly category: string;
  readonly description: string;
  readonly evidence: ReadonlyArray<string>;
  status: DisputeStatus;
  readonly filedAt: number;
  readonly panelJudgeIds: string[];
  ruling: string | null;
  ruledAt: number;
}

interface MutableSession {
  readonly sessionId: string;
  readonly worldId: string;
  readonly sessionType: SessionType;
  readonly startedAt: number;
  readonly endsAt: number;
  readonly agenda: ReadonlyArray<string>;
  active: boolean;
}

interface MutableLegislation {
  readonly legislationId: string;
  readonly worldId: string;
  readonly type: LegislationType;
  readonly title: string;
  readonly description: string;
  readonly parameters: Readonly<Record<string, number>>;
  readonly proposalId: string;
  readonly enactedAt: number;
  readonly expiresAt: number;
  readonly enactedBy: string;
  revoked: boolean;
}

// ── Factory ──────────────────────────────────────────────────────

export function createGovernanceEngine(
  deps: GovernanceEngineDeps,
  config?: Partial<GovernanceEngineConfig>,
): GovernanceEngine {
  const cfg: GovernanceEngineConfig = { ...DEFAULT_CONFIG, ...config };
  const elections = new Map<string, MutableElection>();
  const legislation = new Map<string, MutableLegislation>();
  const disputes = new Map<string, MutableDispute>();
  const debates = new Map<string, DebateEntry[]>();
  const sessions = new Map<string, MutableSession>();
  let totalDebateEntries = 0;

  // ── Elections ────────────────────────────────────────────────

  function callElection(worldId: string, role: GovernanceRole): ElectionRecord {
    const now = deps.clock.nowMicroseconds();
    const nowMs = now / 1_000;
    const electionId = deps.idGenerator.generate();

    const election: MutableElection = {
      electionId,
      worldId,
      role,
      phase: 'REGISTRATION',
      candidates: [],
      registrationEndsAt: nowMs + cfg.electionRegistrationDurationMs,
      campaignEndsAt: nowMs + cfg.electionRegistrationDurationMs + cfg.electionCampaignDurationMs,
      votingEndsAt:
        nowMs +
        cfg.electionRegistrationDurationMs +
        cfg.electionCampaignDurationMs +
        cfg.electionVotingDurationMs,
      winnerId: null,
      votes: new Map(),
      totalVotes: 0,
      eligibleVoters: 0,
    };

    elections.set(electionId, election);
    deps.notifications.notifyWorld(worldId, {
      type: 'election.called',
      title: `Election for ${role}`,
      details: { electionId, role },
    });
    deps.logger.info({ electionId, worldId, role }, 'governance.election.called');
    return electionToReadonly(election);
  }

  function registerCandidate(params: RegisterCandidateParams): ElectionRecord {
    const election = requireElection(params.electionId);
    if (election.phase !== 'REGISTRATION') {
      throw new Error(`Election ${params.electionId} not in registration phase`);
    }
    if (election.candidates.length >= cfg.maxCandidatesPerElection) {
      throw new Error('Maximum candidates reached');
    }
    if (election.candidates.some((c) => c.dynastyId === params.dynastyId)) {
      throw new Error(`Dynasty ${params.dynastyId} already registered`);
    }

    election.candidates.push({
      dynastyId: params.dynastyId,
      displayName: params.displayName,
      platform: params.platform,
      registeredAt: deps.clock.nowMicroseconds(),
      endorsements: [],
    });

    return electionToReadonly(election);
  }

  function endorseCandidate(
    electionId: string,
    endorserId: string,
    candidateId: string,
  ): ElectionRecord {
    const election = requireElection(electionId);
    const candidate = election.candidates.find((c) => c.dynastyId === candidateId);
    if (!candidate) throw new Error(`Candidate ${candidateId} not found`);
    if (candidate.endorsements.includes(endorserId)) {
      throw new Error('Already endorsed');
    }
    candidate.endorsements.push(endorserId);
    return electionToReadonly(election);
  }

  function castElectionVote(params: CastElectionVoteParams): void {
    const election = requireElection(params.electionId);
    if (election.phase !== 'VOTING') {
      throw new Error(`Election ${params.electionId} not in voting phase`);
    }
    if (election.votes.has(params.voterId)) {
      throw new Error(`Voter ${params.voterId} already voted`);
    }
    if (!election.candidates.some((c) => c.dynastyId === params.candidateId)) {
      throw new Error(`Candidate ${params.candidateId} not in election`);
    }

    election.votes.set(params.voterId, {
      candidateId: params.candidateId,
      weight: params.weight,
    });
    election.totalVotes++;
  }

  function concludeElection(electionId: string): ElectionRecord {
    const election = requireElection(electionId);
    if (election.candidates.length < cfg.minCandidatesForElection) {
      throw new Error('Not enough candidates');
    }

    // Tally weighted votes per candidate
    const tally = new Map<string, number>();
    for (const candidate of election.candidates) {
      tally.set(candidate.dynastyId, 0);
    }
    for (const vote of election.votes.values()) {
      tally.set(vote.candidateId, (tally.get(vote.candidateId) ?? 0) + vote.weight);
    }

    let maxVotes = 0;
    let winnerId: string | null = null;
    for (const [candidateId, votes] of tally) {
      if (votes > maxVotes) {
        maxVotes = votes;
        winnerId = candidateId;
      }
    }

    election.winnerId = winnerId;
    election.phase = 'CONCLUDED';

    deps.notifications.notifyWorld(election.worldId, {
      type: 'election.concluded',
      title: `${election.role} elected`,
      details: { electionId, winnerId, role: election.role },
    });
    deps.logger.info({ electionId, winnerId, role: election.role }, 'governance.election.concluded');
    return electionToReadonly(election);
  }

  function getElection(electionId: string): ElectionRecord | undefined {
    const e = elections.get(electionId);
    return e ? electionToReadonly(e) : undefined;
  }

  // ── Legislation ──────────────────────────────────────────────

  function enactLegislation(
    worldId: string,
    proposalId: string,
    type: LegislationType,
    title: string,
    description: string,
    parameters: Readonly<Record<string, number>>,
    enactedBy: string,
  ): Legislation {
    const now = deps.clock.nowMicroseconds();
    const nowMs = now / 1_000;
    const legislationId = deps.idGenerator.generate();

    const law: MutableLegislation = {
      legislationId,
      worldId,
      type,
      title,
      description,
      parameters,
      proposalId,
      enactedAt: now,
      expiresAt: nowMs + cfg.legislationDefaultDurationMs,
      enactedBy,
      revoked: false,
    };

    legislation.set(legislationId, law);

    // Apply world parameters
    for (const [key, value] of Object.entries(parameters)) {
      deps.world.applyParameter(worldId, key, value);
    }

    deps.logger.info({ legislationId, worldId, type, title }, 'governance.legislation.enacted');
    return legislationToReadonly(law);
  }

  function revokeLegislation(legislationId: string): boolean {
    const law = legislation.get(legislationId);
    if (!law || law.revoked) return false;
    law.revoked = true;
    deps.logger.info({ legislationId }, 'governance.legislation.revoked');
    return true;
  }

  function getActiveLegislation(worldId: string): ReadonlyArray<Legislation> {
    const result: Legislation[] = [];
    const nowMs = deps.clock.nowMicroseconds() / 1_000;
    for (const law of legislation.values()) {
      if (law.worldId === worldId && !law.revoked && law.expiresAt > nowMs) {
        result.push(legislationToReadonly(law));
      }
    }
    return result;
  }

  // ── Disputes ─────────────────────────────────────────────────

  function fileDispute(params: FileDisputeParams): Dispute {
    const disputeId = deps.idGenerator.generate();
    const dispute: MutableDispute = {
      disputeId,
      worldId: params.worldId,
      plaintiffId: params.plaintiffId,
      defendantId: params.defendantId,
      category: params.category,
      description: params.description,
      evidence: params.evidence,
      status: 'FILED',
      filedAt: deps.clock.nowMicroseconds(),
      panelJudgeIds: [],
      ruling: null,
      ruledAt: 0,
    };
    disputes.set(disputeId, dispute);
    deps.logger.info({ disputeId, category: params.category }, 'governance.dispute.filed');
    return disputeToReadonly(dispute);
  }

  function assignArbitrationPanel(
    disputeId: string,
    judgeIds: ReadonlyArray<string>,
  ): Dispute {
    const dispute = requireDispute(disputeId);
    if (judgeIds.length !== cfg.arbitrationPanelSize) {
      throw new Error(`Panel must have exactly ${cfg.arbitrationPanelSize} judges`);
    }
    dispute.panelJudgeIds.push(...judgeIds);
    dispute.status = 'ARBITRATION';
    return disputeToReadonly(dispute);
  }

  function ruleOnDispute(disputeId: string, ruling: string): Dispute {
    const dispute = requireDispute(disputeId);
    if (dispute.status !== 'ARBITRATION') {
      throw new Error(`Dispute ${disputeId} not in arbitration`);
    }
    dispute.ruling = ruling;
    dispute.ruledAt = deps.clock.nowMicroseconds();
    dispute.status = 'RESOLVED';
    deps.logger.info({ disputeId, ruling }, 'governance.dispute.resolved');
    return disputeToReadonly(dispute);
  }

  function appealDispute(disputeId: string): Dispute {
    const dispute = requireDispute(disputeId);
    if (dispute.status !== 'RESOLVED') {
      throw new Error(`Dispute ${disputeId} not resolved — cannot appeal`);
    }
    dispute.status = 'APPEALED';
    dispute.ruling = null;
    dispute.ruledAt = 0;
    return disputeToReadonly(dispute);
  }

  function dismissDispute(disputeId: string): Dispute {
    const dispute = requireDispute(disputeId);
    dispute.status = 'DISMISSED';
    return disputeToReadonly(dispute);
  }

  function getDispute(disputeId: string): Dispute | undefined {
    const d = disputes.get(disputeId);
    return d ? disputeToReadonly(d) : undefined;
  }

  // ── Debate ───────────────────────────────────────────────────

  function openDebate(proposalId: string): void {
    if (!debates.has(proposalId)) {
      debates.set(proposalId, []);
    }
  }

  function submitDebateEntry(
    proposalId: string,
    speakerId: string,
    position: 'for' | 'against' | 'question',
    content: string,
  ): DebateEntry {
    let entries = debates.get(proposalId);
    if (!entries) {
      entries = [];
      debates.set(proposalId, entries);
    }
    const entry: DebateEntry = {
      debateId: deps.idGenerator.generate(),
      proposalId,
      speakerId,
      position,
      content,
      timestamp: deps.clock.nowMicroseconds(),
    };
    entries.push(entry);
    totalDebateEntries++;
    return entry;
  }

  function getDebateEntries(proposalId: string): ReadonlyArray<DebateEntry> {
    return debates.get(proposalId) ?? [];
  }

  // ── Sessions ─────────────────────────────────────────────────

  function startSession(
    worldId: string,
    sessionType: SessionType,
    agenda: ReadonlyArray<string>,
  ): GovernanceSession {
    const now = deps.clock.nowMicroseconds();
    const nowMs = now / 1_000;
    const sessionId = deps.idGenerator.generate();
    const session: MutableSession = {
      sessionId,
      worldId,
      sessionType,
      startedAt: now,
      endsAt: nowMs + cfg.regularSessionDurationMs,
      agenda,
      active: true,
    };
    sessions.set(sessionId, session);
    deps.logger.info({ sessionId, worldId, sessionType }, 'governance.session.started');
    return sessionToReadonly(session);
  }

  function endSession(sessionId: string): GovernanceSession {
    const session = sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    session.active = false;
    deps.logger.info({ sessionId }, 'governance.session.ended');
    return sessionToReadonly(session);
  }

  function getActiveSession(worldId: string): GovernanceSession | undefined {
    for (const session of sessions.values()) {
      if (session.worldId === worldId && session.active) {
        return sessionToReadonly(session);
      }
    }
    return undefined;
  }

  // ── Tick ─────────────────────────────────────────────────────

  function tick(): void {
    const nowMs = deps.clock.nowMicroseconds() / 1_000;

    // Advance election phases
    for (const election of elections.values()) {
      if (election.phase === 'REGISTRATION' && nowMs >= election.registrationEndsAt) {
        election.phase = 'CAMPAIGNING';
      } else if (election.phase === 'CAMPAIGNING' && nowMs >= election.campaignEndsAt) {
        election.phase = 'VOTING';
      } else if (election.phase === 'VOTING' && nowMs >= election.votingEndsAt) {
        concludeElection(election.electionId);
      }
    }

    // End expired sessions
    for (const session of sessions.values()) {
      if (session.active && nowMs >= session.endsAt) {
        session.active = false;
      }
    }
  }

  // ── Stats ────────────────────────────────────────────────────

  function getStats(): GovernanceEngineStats {
    let activeElections = 0;
    let activeLeg = 0;
    let resolvedDisputes = 0;
    let activeSessions = 0;
    const nowMs = deps.clock.nowMicroseconds() / 1_000;

    for (const e of elections.values()) {
      if (e.phase !== 'CONCLUDED') activeElections++;
    }
    for (const l of legislation.values()) {
      if (!l.revoked && l.expiresAt > nowMs) activeLeg++;
    }
    for (const d of disputes.values()) {
      if (d.status === 'RESOLVED' || d.status === 'DISMISSED') resolvedDisputes++;
    }
    for (const s of sessions.values()) {
      if (s.active) activeSessions++;
    }

    return {
      totalElections: elections.size,
      activeElections,
      totalLegislation: legislation.size,
      activeLegislation: activeLeg,
      totalDisputes: disputes.size,
      resolvedDisputes,
      totalDebateEntries,
      activeSessions,
    };
  }

  // ── Helpers ──────────────────────────────────────────────────

  function requireElection(id: string): MutableElection {
    const e = elections.get(id);
    if (!e) throw new Error(`Election ${id} not found`);
    return e;
  }

  function requireDispute(id: string): MutableDispute {
    const d = disputes.get(id);
    if (!d) throw new Error(`Dispute ${id} not found`);
    return d;
  }

  return {
    callElection,
    registerCandidate,
    endorseCandidate,
    castElectionVote,
    concludeElection,
    getElection,
    enactLegislation,
    revokeLegislation,
    getActiveLegislation,
    fileDispute,
    assignArbitrationPanel,
    ruleOnDispute,
    appealDispute,
    dismissDispute,
    getDispute,
    openDebate,
    submitDebateEntry,
    getDebateEntries,
    startSession,
    endSession,
    getActiveSession,
    tick,
    getStats,
  };
}

// ── Readonly Converters ──────────────────────────────────────────

function electionToReadonly(e: MutableElection): ElectionRecord {
  return {
    electionId: e.electionId,
    worldId: e.worldId,
    role: e.role,
    phase: e.phase,
    candidates: e.candidates.map((c) => ({
      dynastyId: c.dynastyId,
      displayName: c.displayName,
      platform: c.platform,
      registeredAt: c.registeredAt,
      endorsements: [...c.endorsements],
    })),
    registrationEndsAt: e.registrationEndsAt,
    campaignEndsAt: e.campaignEndsAt,
    votingEndsAt: e.votingEndsAt,
    winnerId: e.winnerId,
    totalVotes: e.totalVotes,
    turnout: e.eligibleVoters > 0 ? e.totalVotes / e.eligibleVoters : 0,
  };
}

function legislationToReadonly(l: MutableLegislation): Legislation {
  return {
    legislationId: l.legislationId,
    worldId: l.worldId,
    type: l.type,
    title: l.title,
    description: l.description,
    parameters: l.parameters,
    proposalId: l.proposalId,
    enactedAt: l.enactedAt,
    expiresAt: l.expiresAt,
    enactedBy: l.enactedBy,
  };
}

function disputeToReadonly(d: MutableDispute): Dispute {
  return {
    disputeId: d.disputeId,
    worldId: d.worldId,
    plaintiffId: d.plaintiffId,
    defendantId: d.defendantId,
    category: d.category,
    description: d.description,
    evidence: d.evidence,
    status: d.status,
    filedAt: d.filedAt,
    panelJudgeIds: [...d.panelJudgeIds],
    ruling: d.ruling,
    ruledAt: d.ruledAt,
  };
}

function sessionToReadonly(s: MutableSession): GovernanceSession {
  return {
    sessionId: s.sessionId,
    worldId: s.worldId,
    sessionType: s.sessionType,
    startedAt: s.startedAt,
    endsAt: s.endsAt,
    agenda: s.agenda,
    active: s.active,
  };
}
