/**
 * constitution-vault.ts — Immutable constitutional documents with amendment tracking.
 *
 * Constitutions are drafted per world and ratified by quorum. Once ratified,
 * amendments can be proposed and ratified to modify individual articles.
 * Each ratified amendment increments the constitution version and updates the article.
 */

// ============================================================================
// PORTS
// ============================================================================

export type Clock = {
  now(): bigint;
};

export type IdGenerator = {
  generate(): string;
};

export type Logger = {
  info(message: string): void;
  warn(message: string): void;
};

// ============================================================================
// TYPES
// ============================================================================

export type ConstitutionId = string;
export type AmendmentId = string;
export type RatifierId = string;

export type ConstitutionError =
  | 'constitution-not-found'
  | 'amendment-not-found'
  | 'already-ratified'
  | 'invalid-content'
  | 'quorum-not-met'
  | 'already-exists';

export type ConstitutionStatus = 'DRAFT' | 'RATIFIED' | 'AMENDED' | 'SUPERSEDED';

export type Constitution = {
  constitutionId: ConstitutionId;
  worldId: string;
  title: string;
  preamble: string;
  articles: ReadonlyArray<string>;
  status: ConstitutionStatus;
  ratifiedAt: bigint | null;
  ratifierIds: ReadonlyArray<RatifierId>;
  version: number;
};

export type Amendment = {
  amendmentId: AmendmentId;
  constitutionId: ConstitutionId;
  proposedBy: RatifierId;
  description: string;
  articleIndex: number;
  newText: string;
  proposedAt: bigint;
  ratifiedAt: bigint | null;
  ratifierIds: ReadonlyArray<RatifierId>;
};

// ============================================================================
// STATE
// ============================================================================

type MutableConstitution = {
  constitutionId: ConstitutionId;
  worldId: string;
  title: string;
  preamble: string;
  articles: string[];
  status: ConstitutionStatus;
  ratifiedAt: bigint | null;
  ratifierIds: RatifierId[];
  version: number;
};

type MutableAmendment = {
  amendmentId: AmendmentId;
  constitutionId: ConstitutionId;
  proposedBy: RatifierId;
  description: string;
  articleIndex: number;
  newText: string;
  proposedAt: bigint;
  ratifiedAt: bigint | null;
  ratifierIds: RatifierId[];
};

type ConstitutionVaultState = {
  constitutions: Map<ConstitutionId, MutableConstitution>;
  worldIndex: Map<string, ConstitutionId>;
  amendments: Map<AmendmentId, MutableAmendment>;
};

// ============================================================================
// SYSTEM INTERFACE
// ============================================================================

export type ConstitutionVaultSystem = {
  draftConstitution(
    worldId: string,
    title: string,
    preamble: string,
    articles: ReadonlyArray<string>,
  ): Constitution | ConstitutionError;
  ratifyConstitution(
    constitutionId: ConstitutionId,
    ratifierId: RatifierId,
    quorumRequired: number,
  ): { success: true; ratified: boolean } | { success: false; error: ConstitutionError };
  proposeAmendment(
    constitutionId: ConstitutionId,
    proposedBy: RatifierId,
    description: string,
    articleIndex: number,
    newText: string,
  ): Amendment | ConstitutionError;
  ratifyAmendment(
    amendmentId: AmendmentId,
    ratifierId: RatifierId,
    quorumRequired: number,
  ): { success: true; ratified: boolean } | { success: false; error: ConstitutionError };
  getConstitution(constitutionId: ConstitutionId): Constitution | undefined;
  getAmendment(amendmentId: AmendmentId): Amendment | undefined;
  listAmendments(constitutionId: ConstitutionId): ReadonlyArray<Amendment>;
};

// ============================================================================
// HELPERS
// ============================================================================

function toConstitution(m: MutableConstitution): Constitution {
  return {
    constitutionId: m.constitutionId,
    worldId: m.worldId,
    title: m.title,
    preamble: m.preamble,
    articles: [...m.articles],
    status: m.status,
    ratifiedAt: m.ratifiedAt,
    ratifierIds: [...m.ratifierIds],
    version: m.version,
  };
}

function toAmendment(m: MutableAmendment): Amendment {
  return {
    amendmentId: m.amendmentId,
    constitutionId: m.constitutionId,
    proposedBy: m.proposedBy,
    description: m.description,
    articleIndex: m.articleIndex,
    newText: m.newText,
    proposedAt: m.proposedAt,
    ratifiedAt: m.ratifiedAt,
    ratifierIds: [...m.ratifierIds],
  };
}

// ============================================================================
// OPERATIONS
// ============================================================================

function draftConstitution(
  state: ConstitutionVaultState,
  worldId: string,
  title: string,
  preamble: string,
  articles: ReadonlyArray<string>,
  clock: Clock,
  idGen: IdGenerator,
  logger: Logger,
): Constitution | ConstitutionError {
  if (!title || !preamble) return 'invalid-content';
  if (state.worldIndex.has(worldId)) return 'already-exists';

  const constitution: MutableConstitution = {
    constitutionId: idGen.generate(),
    worldId,
    title,
    preamble,
    articles: [...articles],
    status: 'DRAFT',
    ratifiedAt: null,
    ratifierIds: [],
    version: 1,
  };

  state.constitutions.set(constitution.constitutionId, constitution);
  state.worldIndex.set(worldId, constitution.constitutionId);
  logger.info('Constitution drafted for world: ' + worldId);
  return toConstitution(constitution);
}

function ratifyConstitution(
  state: ConstitutionVaultState,
  constitutionId: ConstitutionId,
  ratifierId: RatifierId,
  quorumRequired: number,
  clock: Clock,
  logger: Logger,
): { success: true; ratified: boolean } | { success: false; error: ConstitutionError } {
  const constitution = state.constitutions.get(constitutionId);
  if (!constitution) return { success: false, error: 'constitution-not-found' };
  if (constitution.ratifierIds.includes(ratifierId)) {
    return { success: false, error: 'already-ratified' };
  }

  constitution.ratifierIds.push(ratifierId);

  if (constitution.ratifierIds.length >= quorumRequired) {
    constitution.status = 'RATIFIED';
    constitution.ratifiedAt = clock.now();
    logger.info('Constitution ratified: ' + constitutionId);
    return { success: true, ratified: true };
  }

  return { success: true, ratified: false };
}

function proposeAmendment(
  state: ConstitutionVaultState,
  constitutionId: ConstitutionId,
  proposedBy: RatifierId,
  description: string,
  articleIndex: number,
  newText: string,
  clock: Clock,
  idGen: IdGenerator,
  logger: Logger,
): Amendment | ConstitutionError {
  const constitution = state.constitutions.get(constitutionId);
  if (!constitution) return 'constitution-not-found';

  const isRatifiable = constitution.status === 'RATIFIED' || constitution.status === 'AMENDED';
  if (!isRatifiable) return 'invalid-content';
  if (articleIndex < 0 || articleIndex >= constitution.articles.length) return 'invalid-content';

  const amendment: MutableAmendment = {
    amendmentId: idGen.generate(),
    constitutionId,
    proposedBy,
    description,
    articleIndex,
    newText,
    proposedAt: clock.now(),
    ratifiedAt: null,
    ratifierIds: [],
  };

  state.amendments.set(amendment.amendmentId, amendment);
  logger.info('Amendment proposed: ' + amendment.amendmentId);
  return toAmendment(amendment);
}

function applyAmendmentToConstitution(
  constitution: MutableConstitution,
  amendment: MutableAmendment,
  now: bigint,
): void {
  constitution.articles[amendment.articleIndex] = amendment.newText;
  constitution.status = 'AMENDED';
  constitution.version += 1;
  amendment.ratifiedAt = now;
}

function ratifyAmendment(
  state: ConstitutionVaultState,
  amendmentId: AmendmentId,
  ratifierId: RatifierId,
  quorumRequired: number,
  clock: Clock,
  logger: Logger,
): { success: true; ratified: boolean } | { success: false; error: ConstitutionError } {
  const amendment = state.amendments.get(amendmentId);
  if (!amendment) return { success: false, error: 'amendment-not-found' };
  if (amendment.ratifierIds.includes(ratifierId)) {
    return { success: false, error: 'already-ratified' };
  }

  amendment.ratifierIds.push(ratifierId);

  if (amendment.ratifierIds.length >= quorumRequired) {
    const constitution = state.constitutions.get(amendment.constitutionId);
    if (constitution) {
      applyAmendmentToConstitution(constitution, amendment, clock.now());
      logger.info('Amendment ratified: ' + amendmentId);
    }
    return { success: true, ratified: true };
  }

  return { success: true, ratified: false };
}

function listAmendments(
  state: ConstitutionVaultState,
  constitutionId: ConstitutionId,
): ReadonlyArray<Amendment> {
  const results: Amendment[] = [];
  for (const amendment of state.amendments.values()) {
    if (amendment.constitutionId === constitutionId) results.push(toAmendment(amendment));
  }
  return results;
}

// ============================================================================
// FACTORY
// ============================================================================

export type ConstitutionVaultDeps = {
  clock: Clock;
  idGen: IdGenerator;
  logger: Logger;
};

export function createConstitutionVaultSystem(
  deps: ConstitutionVaultDeps,
): ConstitutionVaultSystem {
  const state: ConstitutionVaultState = {
    constitutions: new Map(),
    worldIndex: new Map(),
    amendments: new Map(),
  };

  return {
    draftConstitution: (worldId, title, preamble, articles) =>
      draftConstitution(
        state,
        worldId,
        title,
        preamble,
        articles,
        deps.clock,
        deps.idGen,
        deps.logger,
      ),
    ratifyConstitution: (constitutionId, ratifierId, quorumRequired) =>
      ratifyConstitution(
        state,
        constitutionId,
        ratifierId,
        quorumRequired,
        deps.clock,
        deps.logger,
      ),
    proposeAmendment: (constitutionId, proposedBy, description, articleIndex, newText) =>
      proposeAmendment(
        state,
        constitutionId,
        proposedBy,
        description,
        articleIndex,
        newText,
        deps.clock,
        deps.idGen,
        deps.logger,
      ),
    ratifyAmendment: (amendmentId, ratifierId, quorumRequired) =>
      ratifyAmendment(state, amendmentId, ratifierId, quorumRequired, deps.clock, deps.logger),
    getConstitution: (constitutionId) => {
      const c = state.constitutions.get(constitutionId);
      return c ? toConstitution(c) : undefined;
    },
    getAmendment: (amendmentId) => {
      const a = state.amendments.get(amendmentId);
      return a ? toAmendment(a) : undefined;
    },
    listAmendments: (constitutionId) => listAmendments(state, constitutionId),
  };
}
