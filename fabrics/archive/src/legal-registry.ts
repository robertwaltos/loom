/**
 * legal-registry.ts — Legal entity, contract, and judgment registry.
 *
 * Tracks registered legal entities (dynasties, guilds, corporations, etc.),
 * contracts between parties, and judgments issued against contracts.
 * Enforces party validation, status transitions, and judgment lifecycle.
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

export type EntityId = string;
export type ContractId = string;
export type JudgmentId = string;

export type LegalError =
  | 'entity-not-found'
  | 'contract-not-found'
  | 'judgment-not-found'
  | 'already-registered'
  | 'invalid-status'
  | 'contract-expired';

export type LegalEntityType = 'DYNASTY' | 'GUILD' | 'CORPORATION' | 'GOVERNMENT' | 'INDIVIDUAL';

export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'BREACHED' | 'EXPIRED' | 'VOIDED';

export type LegalEntity = {
  entityId: EntityId;
  name: string;
  type: LegalEntityType;
  registeredAt: bigint;
  active: boolean;
};

export type LegalContract = {
  contractId: ContractId;
  parties: ReadonlyArray<EntityId>;
  title: string;
  terms: string;
  status: ContractStatus;
  createdAt: bigint;
  effectiveFrom: bigint;
  effectiveTo: bigint | null;
};

export type Judgment = {
  judgmentId: JudgmentId;
  contractId: ContractId;
  respondentId: EntityId;
  finding: 'GUILTY' | 'NOT_GUILTY' | 'SETTLED';
  penalty: bigint;
  issuedAt: bigint;
  enforcedAt: bigint | null;
};

// ============================================================================
// STATE
// ============================================================================

type LegalRegistryState = {
  entities: Map<EntityId, LegalEntity>;
  contracts: Map<ContractId, LegalContract>;
  judgments: Map<JudgmentId, Judgment>;
};

// ============================================================================
// SYSTEM INTERFACE
// ============================================================================

export type LegalRegistrySystem = {
  registerEntity(entityId: EntityId, name: string, type: LegalEntityType): LegalEntity | LegalError;
  deactivateEntity(entityId: EntityId): { success: true } | { success: false; error: LegalError };
  createContract(
    parties: ReadonlyArray<EntityId>,
    title: string,
    terms: string,
    effectiveFrom: bigint,
    effectiveTo: bigint | null,
  ): LegalContract | LegalError;
  activateContract(
    contractId: ContractId,
  ): { success: true } | { success: false; error: LegalError };
  breachContract(contractId: ContractId): { success: true } | { success: false; error: LegalError };
  completeContract(
    contractId: ContractId,
  ): { success: true } | { success: false; error: LegalError };
  issueJudgment(
    contractId: ContractId,
    respondentId: EntityId,
    finding: 'GUILTY' | 'NOT_GUILTY' | 'SETTLED',
    penalty: bigint,
  ): Judgment | LegalError;
  enforceJudgment(
    judgmentId: JudgmentId,
  ): { success: true } | { success: false; error: LegalError };
  getContract(contractId: ContractId): LegalContract | undefined;
  listContracts(entityId: EntityId): ReadonlyArray<LegalContract>;
  getJudgments(contractId: ContractId): ReadonlyArray<Judgment>;
};

// ============================================================================
// OPERATIONS
// ============================================================================

function registerEntity(
  state: LegalRegistryState,
  entityId: EntityId,
  name: string,
  type: LegalEntityType,
  clock: Clock,
  logger: Logger,
): LegalEntity | LegalError {
  if (state.entities.has(entityId)) return 'already-registered';

  const entity: LegalEntity = {
    entityId,
    name,
    type,
    registeredAt: clock.now(),
    active: true,
  };

  state.entities.set(entityId, entity);
  logger.info('Legal entity registered: ' + entityId + ' (' + type + ')');
  return entity;
}

function deactivateEntity(
  state: LegalRegistryState,
  entityId: EntityId,
  logger: Logger,
): { success: true } | { success: false; error: LegalError } {
  const entity = state.entities.get(entityId);
  if (!entity) return { success: false, error: 'entity-not-found' };

  entity.active = false;
  logger.warn('Legal entity deactivated: ' + entityId);
  return { success: true };
}

function validateParties(
  state: LegalRegistryState,
  parties: ReadonlyArray<EntityId>,
): LegalError | null {
  if (parties.length < 2) return 'invalid-status';

  for (const id of parties) {
    const entity = state.entities.get(id);
    if (!entity) return 'entity-not-found';
    if (!entity.active) return 'entity-not-found';
  }

  return null;
}

function createContract(
  state: LegalRegistryState,
  parties: ReadonlyArray<EntityId>,
  title: string,
  terms: string,
  effectiveFrom: bigint,
  effectiveTo: bigint | null,
  clock: Clock,
  idGen: IdGenerator,
  logger: Logger,
): LegalContract | LegalError {
  const partyError = validateParties(state, parties);
  if (partyError) return partyError;

  if (effectiveTo !== null && effectiveTo <= effectiveFrom) return 'invalid-status';

  const contract: LegalContract = {
    contractId: idGen.generate(),
    parties,
    title,
    terms,
    status: 'DRAFT',
    createdAt: clock.now(),
    effectiveFrom,
    effectiveTo,
  };

  state.contracts.set(contract.contractId, contract);
  logger.info('Contract created: ' + contract.contractId + ' (' + title + ')');
  return contract;
}

function transitionContract(
  state: LegalRegistryState,
  contractId: ContractId,
  from: ContractStatus,
  to: ContractStatus,
): { success: true } | { success: false; error: LegalError } {
  const contract = state.contracts.get(contractId);
  if (!contract) return { success: false, error: 'contract-not-found' };
  if (contract.status !== from) return { success: false, error: 'invalid-status' };

  (contract as { status: ContractStatus }).status = to;
  return { success: true };
}

function issueJudgment(
  state: LegalRegistryState,
  contractId: ContractId,
  respondentId: EntityId,
  finding: 'GUILTY' | 'NOT_GUILTY' | 'SETTLED',
  penalty: bigint,
  clock: Clock,
  idGen: IdGenerator,
  logger: Logger,
): Judgment | LegalError {
  const contract = state.contracts.get(contractId);
  if (!contract) return 'contract-not-found';

  const judgment: Judgment = {
    judgmentId: idGen.generate(),
    contractId,
    respondentId,
    finding,
    penalty,
    issuedAt: clock.now(),
    enforcedAt: null,
  };

  state.judgments.set(judgment.judgmentId, judgment);
  logger.info('Judgment issued: ' + judgment.judgmentId + ' (' + finding + ')');
  return judgment;
}

function enforceJudgment(
  state: LegalRegistryState,
  judgmentId: JudgmentId,
  clock: Clock,
): { success: true } | { success: false; error: LegalError } {
  const judgment = state.judgments.get(judgmentId);
  if (!judgment) return { success: false, error: 'judgment-not-found' };
  if (judgment.enforcedAt !== null) return { success: false, error: 'invalid-status' };

  (judgment as { enforcedAt: bigint | null }).enforcedAt = clock.now();
  return { success: true };
}

function listContracts(
  state: LegalRegistryState,
  entityId: EntityId,
): ReadonlyArray<LegalContract> {
  const results: LegalContract[] = [];
  for (const contract of state.contracts.values()) {
    if (contract.parties.includes(entityId)) results.push(contract);
  }
  return results;
}

function getJudgments(state: LegalRegistryState, contractId: ContractId): ReadonlyArray<Judgment> {
  const results: Judgment[] = [];
  for (const judgment of state.judgments.values()) {
    if (judgment.contractId === contractId) results.push(judgment);
  }
  return results;
}

// ============================================================================
// FACTORY
// ============================================================================

export type LegalRegistryDeps = {
  clock: Clock;
  idGen: IdGenerator;
  logger: Logger;
};

export function createLegalRegistrySystem(deps: LegalRegistryDeps): LegalRegistrySystem {
  const state: LegalRegistryState = {
    entities: new Map(),
    contracts: new Map(),
    judgments: new Map(),
  };

  return {
    registerEntity: (entityId, name, type) =>
      registerEntity(state, entityId, name, type, deps.clock, deps.logger),
    deactivateEntity: (entityId) => deactivateEntity(state, entityId, deps.logger),
    createContract: (parties, title, terms, effectiveFrom, effectiveTo) =>
      createContract(
        state,
        parties,
        title,
        terms,
        effectiveFrom,
        effectiveTo,
        deps.clock,
        deps.idGen,
        deps.logger,
      ),
    activateContract: (contractId) => transitionContract(state, contractId, 'DRAFT', 'ACTIVE'),
    breachContract: (contractId) => transitionContract(state, contractId, 'ACTIVE', 'BREACHED'),
    completeContract: (contractId) => transitionContract(state, contractId, 'ACTIVE', 'COMPLETED'),
    issueJudgment: (contractId, respondentId, finding, penalty) =>
      issueJudgment(
        state,
        contractId,
        respondentId,
        finding,
        penalty,
        deps.clock,
        deps.idGen,
        deps.logger,
      ),
    enforceJudgment: (judgmentId) => enforceJudgment(state, judgmentId, deps.clock),
    getContract: (contractId) => state.contracts.get(contractId),
    listContracts: (entityId) => listContracts(state, entityId),
    getJudgments: (contractId) => getJudgments(state, contractId),
  };
}
