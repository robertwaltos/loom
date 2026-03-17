/**
 * Dynasty Bootstrap Orchestrator ΓÇö Complete player onboarding flow.
 *
 * Bible v1.1 Part 10: Mandatory Initiation. Tracks every stage from account
 * creation to first Chronicle entry, issuing Genesis KALON along the way.
 *
 * Stages (in order):
 *   ACCOUNT_CREATED ΓåÆ SUBSCRIPTION_CHOSEN ΓåÆ DYNASTY_NAMED ΓåÆ
 *   HOME_WORLD_SELECTED ΓåÆ GENESIS_KALON_GRANTED ΓåÆ FIRST_ENTRY_PROMPTED ΓåÆ
 *   FIRST_ENTRY_FILED ΓåÆ WELCOME_COMPLETE
 *
 * This module owns session state and stage sequencing. External systems
 * (KALON Ledger, Genesis Vault) are injected ports.
 */

// ΓöÇΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type BootstrapStage =
  | 'ACCOUNT_CREATED'
  | 'SUBSCRIPTION_CHOSEN'
  | 'DYNASTY_NAMED'
  | 'HOME_WORLD_SELECTED'
  | 'GENESIS_KALON_GRANTED'
  | 'FIRST_ENTRY_PROMPTED'
  | 'FIRST_ENTRY_FILED'
  | 'WELCOME_COMPLETE';

export interface BootstrapSession {
  readonly sessionId: string;
  readonly dynastyId: string;
  readonly stage: BootstrapStage;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly homeWorldId?: string;
  readonly subscriptionTier?: string;
  readonly genesisKalonGranted?: bigint;
  readonly firstEntryId?: string;
  readonly completionTimeMs?: number;
}

export interface FirstEntryPrompt {
  readonly promptText: string;
  readonly worldContext: string;
  readonly exampleEntry: string;
  readonly minLength: number; // 50 chars
  readonly maxLength: number; // 500 chars
  readonly category: 'MEMOIR';
}

// ΓöÇΓöÇΓöÇ Errors ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export class BootstrapError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'SESSION_NOT_FOUND'
      | 'INVALID_STAGE_TRANSITION'
      | 'ENTRY_TOO_SHORT'
      | 'ENTRY_TOO_LONG',
  ) {
    super(message);
    this.name = 'BootstrapError';
  }
}

// ΓöÇΓöÇΓöÇ Stage Ordering ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const STAGE_ORDER: ReadonlyArray<BootstrapStage> = [
  'ACCOUNT_CREATED',
  'SUBSCRIPTION_CHOSEN',
  'DYNASTY_NAMED',
  'HOME_WORLD_SELECTED',
  'GENESIS_KALON_GRANTED',
  'FIRST_ENTRY_PROMPTED',
  'FIRST_ENTRY_FILED',
  'WELCOME_COMPLETE',
];

function stageIndex(stage: BootstrapStage): number {
  return STAGE_ORDER.indexOf(stage);
}

function isValidTransition(from: BootstrapStage, to: BootstrapStage): boolean {
  return stageIndex(to) === stageIndex(from) + 1;
}

// ΓöÇΓöÇΓöÇ First Entry Prompts ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const FIRST_ENTRY_MIN_LENGTH = 50;
const FIRST_ENTRY_MAX_LENGTH = 500;

export type WorldType = 'ALKAHEST' | 'SURVEY' | 'ASCENDANCY_BOUNDARY' | 'DEFAULT';

function detectWorldType(worldId: string): WorldType {
  if (worldId === 'alkahest' || worldId.toLowerCase().includes('alkahest')) return 'ALKAHEST';
  if (worldId.toLowerCase().startsWith('survey-') || worldId.toLowerCase().includes('survey')) {
    return 'SURVEY';
  }
  if (worldId.toLowerCase().includes('ascendancy') || worldId.toLowerCase().includes('boundary')) {
    return 'ASCENDANCY_BOUNDARY';
  }
  return 'DEFAULT';
}

function buildPromptForWorldType(worldType: WorldType, worldId: string): FirstEntryPrompt {
  const prompts: Record<
    WorldType,
    Omit<FirstEntryPrompt, 'minLength' | 'maxLength' | 'category'>
  > = {
    ALKAHEST: {
      promptText:
        'You are standing in the basement of the research building where everything began. The door that was opened is three floors above you. Write about what brought you here.',
      worldContext:
        'Alkahest is the home world of the Gate. This is where the wound opened. The research station still stands.',
      exampleEntry:
        "I came because my grandfather's records led me here. He was in the building that day. His name is not in any official account.",
    },
    SURVEY: {
      promptText:
        "The Survey Corps logged this world's first entry fourteen years ago. There are eleven dynasties here. You are the twelfth. Write your arrival.",
      worldContext: `${worldId} was catalogued by the Survey Corps. It has been inhabited for over a decade. You are not the first, but you chose it anyway.`,
      exampleEntry:
        'I read the first Survey log before I came. I wanted to see it before it changed. It has already changed.',
    },
    ASCENDANCY_BOUNDARY: {
      promptText:
        'This world sits at the edge of what is claimed and what is contested. You arrived knowing that. Write about why.',
      worldContext: `${worldId} is at the boundary of Ascendancy influence. Presence here is a political statement whether intended or not.`,
      exampleEntry:
        'I did not come to make a statement. I came because the boundary is where things are still undecided.',
    },
    DEFAULT: {
      promptText:
        'You have arrived. The Chronicle is open. This is the first entry your dynasty will ever write. It will be here forever. Write honestly.',
      worldContext: `${worldId} is your starting point. Everything your dynasty does from here will be recorded.`,
      exampleEntry:
        'This is our beginning. We do not know yet what we will become. We are writing it down so we remember that we did not know.',
    },
  };

  const base = prompts[worldType];
  return {
    ...base,
    minLength: FIRST_ENTRY_MIN_LENGTH,
    maxLength: FIRST_ENTRY_MAX_LENGTH,
    category: 'MEMOIR',
  };
}

// ΓöÇΓöÇΓöÇ Ports ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface GenesisVaultPort {
  allocateNewDynasty(): bigint;
}

export interface ChroniclePort {
  append(worldId: string, dynastyId: string, category: string, content: string): string;
}

export interface IdGeneratorPort {
  generate(): string;
}

// ΓöÇΓöÇΓöÇ Service State ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface BootstrapOrchestratorDeps {
  readonly genesisVault: GenesisVaultPort;
  readonly chronicle: ChroniclePort;
  readonly idGenerator: IdGeneratorPort;
  readonly nowMs: () => number;
}

interface OrchestratorState {
  readonly sessions: Map<string, BootstrapSession>;
}

export interface DynastyBootstrapOrchestrator {
  startBootstrap(dynastyId: string): BootstrapSession;
  advanceStage(sessionId: string, stage: BootstrapStage): BootstrapSession;
  chooseHomeWorld(sessionId: string, worldId: string): BootstrapSession;
  grantGenesisKalon(sessionId: string): BootstrapSession;
  generateFirstEntryPrompt(worldId: string): FirstEntryPrompt;
  fileFirstEntry(sessionId: string, entryText: string): BootstrapSession;
  completeBootstrap(sessionId: string): BootstrapSession;
  getSession(sessionId: string): BootstrapSession | undefined;
}

// ΓöÇΓöÇΓöÇ Factory ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function createDynastyBootstrapOrchestrator(
  deps: BootstrapOrchestratorDeps,
): DynastyBootstrapOrchestrator {
  const state: OrchestratorState = { sessions: new Map() };

  return {
    startBootstrap: (dynastyId) => startBootstrap(state, deps, dynastyId),
    advanceStage: (sessionId, stage) => advanceStage(state, sessionId, stage),
    chooseHomeWorld: (sessionId, worldId) => chooseHomeWorld(state, sessionId, worldId),
    grantGenesisKalon: (sessionId) => grantGenesisKalon(state, deps, sessionId),
    generateFirstEntryPrompt: (worldId) => generateFirstEntryPrompt(worldId),
    fileFirstEntry: (sessionId, entryText) => fileFirstEntry(state, deps, sessionId, entryText),
    completeBootstrap: (sessionId) => completeBootstrap(state, deps, sessionId),
    getSession: (sessionId) => state.sessions.get(sessionId),
  };
}

// ΓöÇΓöÇΓöÇ Implementations ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function startBootstrap(
  state: OrchestratorState,
  deps: BootstrapOrchestratorDeps,
  dynastyId: string,
): BootstrapSession {
  const sessionId = deps.idGenerator.generate();
  const session: BootstrapSession = {
    sessionId,
    dynastyId,
    stage: 'ACCOUNT_CREATED',
    startedAt: new Date(deps.nowMs()).toISOString(),
  };
  state.sessions.set(sessionId, session);
  return session;
}

function requireSession(state: OrchestratorState, sessionId: string): BootstrapSession {
  const session = state.sessions.get(sessionId);
  if (session === undefined) {
    throw new BootstrapError(`Session not found: ${sessionId}`, 'SESSION_NOT_FOUND');
  }
  return session;
}

function saveSession(state: OrchestratorState, session: BootstrapSession): BootstrapSession {
  state.sessions.set(session.sessionId, session);
  return session;
}

function advanceStage(
  state: OrchestratorState,
  sessionId: string,
  stage: BootstrapStage,
): BootstrapSession {
  const current = requireSession(state, sessionId);
  if (!isValidTransition(current.stage, stage)) {
    throw new BootstrapError(
      `Invalid stage transition: ${current.stage} ΓåÆ ${stage}`,
      'INVALID_STAGE_TRANSITION',
    );
  }
  return saveSession(state, { ...current, stage });
}

function chooseHomeWorld(
  state: OrchestratorState,
  sessionId: string,
  worldId: string,
): BootstrapSession {
  const current = requireSession(state, sessionId);
  if (!isValidTransition(current.stage, 'HOME_WORLD_SELECTED')) {
    throw new BootstrapError(
      `Must be at DYNASTY_NAMED stage to choose home world, currently: ${current.stage}`,
      'INVALID_STAGE_TRANSITION',
    );
  }
  return saveSession(state, { ...current, stage: 'HOME_WORLD_SELECTED', homeWorldId: worldId });
}

function grantGenesisKalon(
  state: OrchestratorState,
  deps: BootstrapOrchestratorDeps,
  sessionId: string,
): BootstrapSession {
  const current = requireSession(state, sessionId);
  if (!isValidTransition(current.stage, 'GENESIS_KALON_GRANTED')) {
    throw new BootstrapError(
      `Must be at HOME_WORLD_SELECTED stage to grant genesis KALON, currently: ${current.stage}`,
      'INVALID_STAGE_TRANSITION',
    );
  }
  const granted = deps.genesisVault.allocateNewDynasty();
  return saveSession(state, {
    ...current,
    stage: 'GENESIS_KALON_GRANTED',
    genesisKalonGranted: granted,
  });
}

export function generateFirstEntryPrompt(worldId: string): FirstEntryPrompt {
  const worldType = detectWorldType(worldId);
  return buildPromptForWorldType(worldType, worldId);
}

function validateEntryLength(entryText: string): void {
  if (entryText.length < FIRST_ENTRY_MIN_LENGTH) {
    throw new BootstrapError(
      `Entry too short: ${entryText.length} chars (minimum ${FIRST_ENTRY_MIN_LENGTH})`,
      'ENTRY_TOO_SHORT',
    );
  }
  if (entryText.length > FIRST_ENTRY_MAX_LENGTH) {
    throw new BootstrapError(
      `Entry too long: ${entryText.length} chars (maximum ${FIRST_ENTRY_MAX_LENGTH})`,
      'ENTRY_TOO_LONG',
    );
  }
}

function fileFirstEntry(
  state: OrchestratorState,
  deps: BootstrapOrchestratorDeps,
  sessionId: string,
  entryText: string,
): BootstrapSession {
  const current = requireSession(state, sessionId);
  if (!isValidTransition(current.stage, 'FIRST_ENTRY_FILED')) {
    throw new BootstrapError(
      `Must be at FIRST_ENTRY_PROMPTED stage to file entry, currently: ${current.stage}`,
      'INVALID_STAGE_TRANSITION',
    );
  }
  validateEntryLength(entryText);

  const worldId = current.homeWorldId ?? 'unknown';
  const entryId = deps.chronicle.append(worldId, current.dynastyId, 'MEMOIR', entryText);
  return saveSession(state, { ...current, stage: 'FIRST_ENTRY_FILED', firstEntryId: entryId });
}

function completeBootstrap(
  state: OrchestratorState,
  deps: BootstrapOrchestratorDeps,
  sessionId: string,
): BootstrapSession {
  const current = requireSession(state, sessionId);
  if (!isValidTransition(current.stage, 'WELCOME_COMPLETE')) {
    throw new BootstrapError(
      `Must be at FIRST_ENTRY_FILED stage to complete bootstrap, currently: ${current.stage}`,
      'INVALID_STAGE_TRANSITION',
    );
  }
  const completedAt = new Date(deps.nowMs()).toISOString();
  const startMs = new Date(current.startedAt).getTime();
  const completionTimeMs = deps.nowMs() - startMs;
  return saveSession(state, {
    ...current,
    stage: 'WELCOME_COMPLETE',
    completedAt,
    completionTimeMs,
  });
}
