/**
 * Heir Protocol Engine ΓÇö Real-world heir designation for dynasty continuation.
 *
 * From the Multigenerational Design Bible:
 * "If a player passes away in the real world (as confirmed by family), their
 * dynasty can be maintained by a designated heir ΓÇö a real-world person who was
 * named in the dynasty's Heir Protocol."
 *
 * Heirs are filed in the Chronicle. Designations require witnesses. Activation
 * is triggered by player passing, incapacity, or Vigil continuation.
 */

// ΓöÇΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type HeirDesignationType =
  | 'PRIMARY' // First in line
  | 'SECONDARY' // If primary cannot accept
  | 'EMERGENCY'; // Any family member, no protocol needed

export interface DesignatedHeir {
  readonly heirId: string;
  readonly dynastyId: string;
  readonly designationType: HeirDesignationType;
  readonly realWorldContact: string; // Email or encrypted reference (never stored as plain PII)
  readonly inGameDynastyId?: string; // If heir is already a player
  readonly designatedAt: string;
  readonly witnessedBy: string[]; // dynastyIds of Chronicle witnesses
  readonly heirProtocolText: string; // The heir's acceptance text (filed in Chronicle)
  readonly isActive: boolean;
}

export interface HeirActivation {
  readonly activationId: string;
  readonly dynastyId: string;
  readonly activatedHeirId: string;
  readonly reason: 'PLAYER_PASSING' | 'PLAYER_INCAPACITY' | 'VIGIL_CONTINUATION';
  readonly activatedAt: string;
  readonly chronicleEntryId: string; // The transition Chronicle entry
  readonly previousPlayerId: string;
  readonly newPlayerId?: string; // May be null if heir is new to the game
}

export type HeirProtocolResult =
  | 'success'
  | 'heir-not-found'
  | 'heir-already-active'
  | 'no-active-heir'
  | 'already-witnessed'
  | 'heir-already-revoked';

// ΓöÇΓöÇΓöÇ Internal State ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

interface MutableHeir {
  heirId: string;
  dynastyId: string;
  designationType: HeirDesignationType;
  realWorldContact: string;
  inGameDynastyId?: string;
  designatedAt: string;
  witnessedBy: string[];
  heirProtocolText: string;
  isActive: boolean;
}

interface ProtocolState {
  readonly heirs: Map<string, MutableHeir>;
  readonly activations: Map<string, HeirActivation>;
  readonly clock: { nowIso(): string };
  readonly idGen: { next(): string };
}

// ΓöÇΓöÇΓöÇ Factory ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface HeirProtocolEngine {
  designateHeir(
    dynastyId: string,
    params: {
      designationType: HeirDesignationType;
      realWorldContact: string;
      inGameDynastyId?: string;
      heirProtocolText: string;
    },
  ): DesignatedHeir;

  activateHeir(
    dynastyId: string,
    reason: HeirActivation['reason'],
    evidence: { previousPlayerId: string; newPlayerId?: string },
  ): HeirActivation | 'no-active-heir';

  witnessDesignation(heirId: string, witnessId: string): DesignatedHeir | HeirProtocolResult;

  revokeDesignation(heirId: string): DesignatedHeir | HeirProtocolResult;

  getHeirChain(dynastyId: string): DesignatedHeir[];
}

export function createHeirProtocolEngine(deps: {
  readonly clock: { nowIso(): string };
  readonly idGen: { next(): string };
}): HeirProtocolEngine {
  const state: ProtocolState = {
    heirs: new Map(),
    activations: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
  };

  return {
    designateHeir: (dynastyId, params) => designateHeirImpl(state, dynastyId, params),
    activateHeir: (dynastyId, reason, evidence) =>
      activateHeirImpl(state, dynastyId, reason, evidence),
    witnessDesignation: (heirId, witnessId) => witnessDesignationImpl(state, heirId, witnessId),
    revokeDesignation: (heirId) => revokeDesignationImpl(state, heirId),
    getHeirChain: (dynastyId) => getHeirChainImpl(state, dynastyId),
  };
}

// ΓöÇΓöÇΓöÇ Implementations ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function designateHeirImpl(
  state: ProtocolState,
  dynastyId: string,
  params: {
    designationType: HeirDesignationType;
    realWorldContact: string;
    inGameDynastyId?: string;
    heirProtocolText: string;
  },
): DesignatedHeir {
  const heirId = state.idGen.next();
  const heir: MutableHeir = {
    heirId,
    dynastyId,
    designationType: params.designationType,
    realWorldContact: params.realWorldContact,
    inGameDynastyId: params.inGameDynastyId,
    designatedAt: state.clock.nowIso(),
    witnessedBy: [],
    heirProtocolText: params.heirProtocolText,
    isActive: true,
  };
  state.heirs.set(heirId, heir);
  return toReadonlyHeir(heir);
}

function activateHeirImpl(
  state: ProtocolState,
  dynastyId: string,
  reason: HeirActivation['reason'],
  evidence: { previousPlayerId: string; newPlayerId?: string },
): HeirActivation | 'no-active-heir' {
  const chain = getHeirChainImpl(state, dynastyId);
  const primary = chain.find((h) => h.designationType === 'PRIMARY' && h.isActive);
  const heir = primary ?? chain.find((h) => h.designationType === 'SECONDARY' && h.isActive);
  const activatedHeir = heir ?? chain.find((h) => h.designationType === 'EMERGENCY' && h.isActive);

  if (activatedHeir === undefined) return 'no-active-heir';

  const activationId = state.idGen.next();
  const chronicleEntryId = `chronicle-heir-activation-${activationId}`;
  const activation: HeirActivation = {
    activationId,
    dynastyId,
    activatedHeirId: activatedHeir.heirId,
    reason,
    activatedAt: state.clock.nowIso(),
    chronicleEntryId,
    previousPlayerId: evidence.previousPlayerId,
    newPlayerId: evidence.newPlayerId,
  };
  state.activations.set(activationId, activation);
  return activation;
}

function witnessDesignationImpl(
  state: ProtocolState,
  heirId: string,
  witnessId: string,
): DesignatedHeir | HeirProtocolResult {
  const heir = state.heirs.get(heirId);
  if (heir === undefined) return 'heir-not-found';
  if (!heir.isActive) return 'heir-already-revoked';
  if (heir.witnessedBy.includes(witnessId)) return 'already-witnessed';
  heir.witnessedBy.push(witnessId);
  return toReadonlyHeir(heir);
}

function revokeDesignationImpl(
  state: ProtocolState,
  heirId: string,
): DesignatedHeir | HeirProtocolResult {
  const heir = state.heirs.get(heirId);
  if (heir === undefined) return 'heir-not-found';
  if (!heir.isActive) return 'heir-already-revoked';
  heir.isActive = false;
  return toReadonlyHeir(heir);
}

function getHeirChainImpl(state: ProtocolState, dynastyId: string): DesignatedHeir[] {
  const order: HeirDesignationType[] = ['PRIMARY', 'SECONDARY', 'EMERGENCY'];
  const all: DesignatedHeir[] = [];
  for (const heir of state.heirs.values()) {
    if (heir.dynastyId === dynastyId && heir.isActive) {
      all.push(toReadonlyHeir(heir));
    }
  }
  all.sort((a, b) => order.indexOf(a.designationType) - order.indexOf(b.designationType));
  return all;
}

// ΓöÇΓöÇΓöÇ Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function toReadonlyHeir(heir: MutableHeir): DesignatedHeir {
  return {
    heirId: heir.heirId,
    dynastyId: heir.dynastyId,
    designationType: heir.designationType,
    realWorldContact: heir.realWorldContact,
    inGameDynastyId: heir.inGameDynastyId,
    designatedAt: heir.designatedAt,
    witnessedBy: [...heir.witnessedBy],
    heirProtocolText: heir.heirProtocolText,
    isActive: heir.isActive,
  };
}
