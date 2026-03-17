/**
 * Chronicle Moderation Service ΓÇö Okafor Constant Pipeline.
 *
 * Player-authored Chronicle entry moderation pipeline:
 *   1. Entry submitted
 *   2. Profanity/hate filter (regex patterns)
 *   3. Okafor Constant check (game-specific abuse: NPC impersonation, false claims, etc.)
 *   4. Clean ΓåÆ auto-approve (<100ms target)
 *   5. Flagged ΓåÆ hold for human review (24hr SLA)
 *   6. Severe ΓåÆ immediate hold + account flag
 *   7. Human approve / reject / edit-and-approve
 *   8. Appeals: one per entry; second decision is final
 *
 * The Okafor Constant is named after Dr. Amara Okafor-Nwosu, who authored
 * the first Chronicle integrity policy in Year 3 of The Concord.
 */

// ΓöÇΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type ChronicleEntryStatus =
  | 'PENDING_MODERATION'
  | 'AUTO_APPROVED'
  | 'FLAGGED_REVIEW'
  | 'FLAGGED_SEVERE'
  | 'APPROVED_BY_HUMAN'
  | 'REJECTED'
  | 'APPEALED'
  | 'APPEAL_RESOLVED';

export type OkaforViolationType =
  | 'NPC_IMPERSONATION'
  | 'ARCHITECT_IMPERSONATION'
  | 'FALSE_MARKS_CLAIM'
  | 'OUT_OF_CHARACTER_MECHANICS'
  | 'REAL_WORLD_ADVERTISING'
  | 'ASSEMBLY_IMPERSONATION';

export type ChronicleCategory =
  | 'HISTORY'
  | 'MEMOIR'
  | 'POLITICAL'
  | 'SURVEY'
  | 'MEMORIAL'
  | 'CORRESPONDENCE';

export interface ChronicleSubmission {
  readonly submissionId: string;
  readonly dynastyId: string;
  readonly worldId: string | null;
  readonly entryText: string;
  readonly category: ChronicleCategory;
  readonly submittedAt: string;
}

export interface ModerationFlag {
  readonly type: 'PROFANITY' | 'HATE_SPEECH' | 'OKAFOR_CONSTANT' | 'SPAM' | 'SEVERE';
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly detail: string;
  readonly confidence: number;
}

export interface ModerationResult {
  readonly submissionId: string;
  readonly status: ChronicleEntryStatus;
  readonly processingTimeMs: number;
  readonly autoApproved: boolean;
  readonly flags: ModerationFlag[];
  readonly processedAt: string;
}

export interface AppealRecord {
  readonly submissionId: string;
  readonly appealText: string;
  readonly submittedAt: string;
  readonly isSecondAppeal: boolean;
}

// ΓöÇΓöÇΓöÇ Ports ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface ChronicleClockPort {
  readonly nowMs: () => number;
  readonly nowIso: () => string;
}

export interface ChronicleIdPort {
  readonly next: () => string;
}

export interface ChronicleLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
}

// ΓöÇΓöÇΓöÇ Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const KNOWN_NPC_NAMES = [
  'The Architect',
  'Itoro Adeyemi',
  'Amara Okafor',
  'Nnamdi Achebe',
  'Seren Vael',
  'Kwame Osei-Adeyemi',
] as const;

const ARCHITECT_PREFIXES = [
  'Quarterly Report',
  'Technical Note:',
  'Assembly Notification',
] as const;

const MARKS_CLAIM_PATTERNS = [/I was awarded the FOUNDING MARK/i, /received SURVEY MARK/i] as const;

const OOC_MECHANICS_PATTERN = /\b(bug|exploit|cheat|hack|admin|GM)\b/i;

const REAL_WORLD_AD_PATTERN =
  /https?:\/\/|www\.|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|\+?[\d][\d\s\-().]{7,}/;

const PROFANITY_PATTERN = /\b(fuck|shit|asshole|bitch|bastard|damn|cunt|piss)\b/i;

const HATE_SPEECH_PATTERN = /\b(nigger|faggot|kike|chink|spic|wetback|tranny)\b/i;

// ΓöÇΓöÇΓöÇ Detection helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function checkNpcImpersonation(text: string): ModerationFlag | undefined {
  for (const name of KNOWN_NPC_NAMES) {
    const impersonates = new RegExp(
      `(I am ${name}|As ${name},? I (declare|proclaim|announce|state))`,
      'i',
    );
    if (impersonates.test(text)) {
      return {
        type: 'OKAFOR_CONSTANT',
        severity: 'critical',
        detail: 'NPC_IMPERSONATION',
        confidence: 0.97,
      };
    }
  }
  return undefined;
}

function checkArchitectImpersonation(text: string): ModerationFlag | undefined {
  for (const prefix of ARCHITECT_PREFIXES) {
    if (text.startsWith(prefix)) {
      const detail: OkaforViolationType =
        prefix === 'Assembly Notification' ? 'ASSEMBLY_IMPERSONATION' : 'ARCHITECT_IMPERSONATION';
      return {
        type: 'OKAFOR_CONSTANT',
        severity: 'critical',
        detail,
        confidence: 0.99,
      };
    }
  }
  return undefined;
}

function checkFalseMarksClaim(text: string): ModerationFlag | undefined {
  for (const pattern of MARKS_CLAIM_PATTERNS) {
    if (pattern.test(text)) {
      return {
        type: 'OKAFOR_CONSTANT',
        severity: 'high',
        detail: 'FALSE_MARKS_CLAIM',
        confidence: 0.85,
      };
    }
  }
  return undefined;
}

function checkOutOfCharacterMechanics(text: string): ModerationFlag | undefined {
  if (!OOC_MECHANICS_PATTERN.test(text)) return undefined;
  return {
    type: 'OKAFOR_CONSTANT',
    severity: 'medium',
    detail: 'OUT_OF_CHARACTER_MECHANICS',
    confidence: 0.75,
  };
}

function checkRealWorldAdvertising(text: string): ModerationFlag | undefined {
  if (!REAL_WORLD_AD_PATTERN.test(text)) return undefined;
  return {
    type: 'SPAM',
    severity: 'high',
    detail: 'REAL_WORLD_ADVERTISING',
    confidence: 0.92,
  };
}

// ΓöÇΓöÇΓöÇ Pure analysis functions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function runProfanityCheck(text: string): ModerationFlag[] {
  const flags: ModerationFlag[] = [];
  if (HATE_SPEECH_PATTERN.test(text)) {
    flags.push({
      type: 'HATE_SPEECH',
      severity: 'high',
      detail: 'hate-speech-detected',
      confidence: 0.95,
    });
  }
  if (PROFANITY_PATTERN.test(text)) {
    flags.push({
      type: 'PROFANITY',
      severity: 'low',
      detail: 'profanity-detected',
      confidence: 0.9,
    });
  }
  return flags;
}

export function runOkaforConstantCheck(
  text: string,
  _category: ChronicleCategory,
): ModerationFlag[] {
  const candidates = [
    checkNpcImpersonation(text),
    checkArchitectImpersonation(text),
    checkFalseMarksClaim(text),
    checkOutOfCharacterMechanics(text),
    checkRealWorldAdvertising(text),
  ];
  return candidates.filter((f): f is ModerationFlag => f !== undefined);
}

export function determineStatus(flags: ModerationFlag[]): ChronicleEntryStatus {
  if (flags.length === 0) return 'AUTO_APPROVED';

  const hasSevere = flags.some((f) => f.severity === 'critical' || f.type === 'SEVERE');
  if (hasSevere) return 'FLAGGED_SEVERE';

  return 'FLAGGED_REVIEW';
}

// ΓöÇΓöÇΓöÇ State ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface ChronicleModerationState {
  readonly results: Map<string, ModerationResult>;
  readonly appeals: Map<string, AppealRecord>;
}

export function createChronicleModerationState(): ChronicleModerationState {
  return {
    results: new Map(),
    appeals: new Map(),
  };
}

// ΓöÇΓöÇΓöÇ Service methods (state-first, functions under 30 lines) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function buildResult(
  submission: ChronicleSubmission,
  flags: ModerationFlag[],
  processingTimeMs: number,
  clock: ChronicleClockPort,
): ModerationResult {
  const status = determineStatus(flags);
  return {
    submissionId: submission.submissionId,
    status,
    processingTimeMs,
    autoApproved: status === 'AUTO_APPROVED',
    flags,
    processedAt: clock.nowIso(),
  };
}

export function submitEntry(
  state: ChronicleModerationState,
  submission: ChronicleSubmission,
  clock: ChronicleClockPort,
  log: ChronicleLogPort,
): ModerationResult {
  const start = clock.nowMs();
  if (submission.entryText.length > 5000) {
    throw new Error(`Entry exceeds 5000 character limit: ${submission.submissionId}`);
  }
  const allFlags = [
    ...runProfanityCheck(submission.entryText),
    ...runOkaforConstantCheck(submission.entryText, submission.category),
  ];
  const result = buildResult(submission, allFlags, clock.nowMs() - start, clock);
  state.results.set(submission.submissionId, result);
  log.info('chronicle-entry-moderated', {
    submissionId: submission.submissionId,
    status: result.status,
    flagCount: allFlags.length,
    processingTimeMs: result.processingTimeMs,
  });
  return result;
}

export function approveEntry(
  state: ChronicleModerationState,
  submissionId: string,
  moderatorId: string,
  clock: ChronicleClockPort,
  log: ChronicleLogPort,
): ModerationResult {
  const existing = state.results.get(submissionId);
  if (existing === undefined) throw new Error(`Submission ${submissionId} not found`);

  const updated: ModerationResult = {
    ...existing,
    status: 'APPROVED_BY_HUMAN',
    processedAt: clock.nowIso(),
  };

  state.results.set(submissionId, updated);
  log.info('chronicle-entry-approved', { submissionId, moderatorId });
  return updated;
}

export function rejectEntry(
  state: ChronicleModerationState,
  submissionId: string,
  moderatorId: string,
  reason: string,
  clock: ChronicleClockPort,
  log: ChronicleLogPort,
): ModerationResult {
  const existing = state.results.get(submissionId);
  if (existing === undefined) throw new Error(`Submission ${submissionId} not found`);

  const updated: ModerationResult = {
    ...existing,
    status: 'REJECTED',
    processedAt: clock.nowIso(),
  };

  state.results.set(submissionId, updated);
  log.warn('chronicle-entry-rejected', { submissionId, moderatorId, reason });
  return updated;
}

function validateAppealEligibility(
  state: ChronicleModerationState,
  submissionId: string,
): ModerationResult {
  const existing = state.results.get(submissionId);
  if (existing === undefined) throw new Error(`Submission ${submissionId} not found`);
  if (existing.status !== 'REJECTED') {
    throw new Error(`Cannot appeal entry with status ${existing.status}`);
  }
  const priorAppeal = state.appeals.get(submissionId);
  if (priorAppeal?.isSecondAppeal === true) {
    throw new Error(`Second appeal already resolved for ${submissionId}; decision is final`);
  }
  return existing;
}

export function submitAppeal(
  state: ChronicleModerationState,
  submissionId: string,
  appealText: string,
  clock: ChronicleClockPort,
  log: ChronicleLogPort,
): ModerationResult {
  const existing = validateAppealEligibility(state, submissionId);
  const isSecondAppeal = state.appeals.get(submissionId) !== undefined;
  state.appeals.set(submissionId, {
    submissionId,
    appealText,
    submittedAt: clock.nowIso(),
    isSecondAppeal,
  });
  const updated: ModerationResult = {
    ...existing,
    status: 'APPEALED',
    processedAt: clock.nowIso(),
  };
  state.results.set(submissionId, updated);
  log.info('chronicle-appeal-submitted', { submissionId, isSecondAppeal });
  return updated;
}

export function resolveAppeal(
  state: ChronicleModerationState,
  submissionId: string,
  approved: boolean,
  clock: ChronicleClockPort,
  log: ChronicleLogPort,
): ModerationResult {
  const existing = state.results.get(submissionId);
  if (existing === undefined) throw new Error(`Submission ${submissionId} not found`);

  const appeal = state.appeals.get(submissionId);
  if (appeal === undefined) throw new Error(`No appeal found for ${submissionId}`);

  const resolvedStatus: ChronicleEntryStatus = approved ? 'APPROVED_BY_HUMAN' : 'REJECTED';
  const resolvedAppeal: AppealRecord = { ...appeal, isSecondAppeal: true };
  state.appeals.set(submissionId, resolvedAppeal);

  const updated: ModerationResult = {
    ...existing,
    status: 'APPEAL_RESOLVED',
    processedAt: clock.nowIso(),
  };

  state.results.set(submissionId, updated);
  log.info('chronicle-appeal-resolved', { submissionId, approved, resolvedStatus });
  return updated;
}

export function getResult(
  state: ChronicleModerationState,
  submissionId: string,
): ModerationResult | undefined {
  return state.results.get(submissionId);
}
