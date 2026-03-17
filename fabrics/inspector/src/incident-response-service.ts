/**
 * Incident Response Service ΓÇö Automated detection and response for 4 incident tiers.
 *
 * Tier 1 ΓÇö Economy incident (duplication bug, runaway levy):
 *   Automatic transaction freeze, on-call page, Assembly notification,
 *   Architect's bulletin, post-mortem within 72 hours.
 *
 * Tier 2 ΓÇö Lattice integrity incident (beacon compromised):
 *   Node flagged COMPROMISED, transits suspended, world isolated,
 *   investigation opened as Chronicle entry.
 *
 * Tier 3 ΓÇö Data loss incident:
 *   Foundation archive failover, Assembly notified within 2 hours,
 *   public status page updated in real-time.
 *
 * Tier 4 ΓÇö Studio financial crisis:
 *   Permanence Covenant provisions activate, 30-day countdown,
 *   MARKS migration, Chronicle archive published.
 *   These are automated ΓÇö they do not require a human decision.
 *
 * "The Inspector catches every break before it unravels the weave."
 */

// ΓöÇΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type IncidentTier = 1 | 2 | 3 | 4;

export type IncidentStatus =
  | 'DETECTED'
  | 'RESPONDING'
  | 'CONTAINED'
  | 'RESOLVED'
  | 'POST_MORTEM_PENDING';

export type IncidentActionType =
  | 'TRANSACTION_FREEZE'
  | 'ONCALL_PAGE'
  | 'ASSEMBLY_NOTIFICATION'
  | 'ARCHITECT_BULLETIN'
  | 'LATTICE_NODE_ISOLATE'
  | 'WORLD_ISOLATE'
  | 'CHRONICLE_INVESTIGATION'
  | 'ARCHIVE_FAILOVER'
  | 'STATUS_PAGE_UPDATE'
  | 'PERMANENCE_COVENANT_ACTIVATE'
  | 'SOURCE_CODE_RELEASE_COUNTDOWN'
  | 'MARKS_MIGRATION_INITIATE';

export interface IncidentAction {
  readonly actionId: string;
  readonly type: IncidentActionType;
  readonly executedAt: string;
  readonly result: 'success' | 'failed' | 'pending';
  readonly notes: string;
}

export interface Incident {
  readonly incidentId: string;
  readonly tier: IncidentTier;
  readonly title: string;
  readonly description: string;
  readonly detectedAt: string; // ISO timestamp
  readonly status: IncidentStatus;
  readonly affectedSystems: string[];
  readonly actions: IncidentAction[];
  readonly resolvedAt?: string;
}

// ΓöÇΓöÇΓöÇ Response Sequences ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const TIER_RESPONSE_SEQUENCES: Record<IncidentTier, IncidentActionType[]> = {
  1: ['TRANSACTION_FREEZE', 'ONCALL_PAGE', 'ASSEMBLY_NOTIFICATION', 'ARCHITECT_BULLETIN'],
  2: ['LATTICE_NODE_ISOLATE', 'WORLD_ISOLATE', 'CHRONICLE_INVESTIGATION'],
  3: ['ARCHIVE_FAILOVER', 'ASSEMBLY_NOTIFICATION', 'STATUS_PAGE_UPDATE'],
  4: [
    'PERMANENCE_COVENANT_ACTIVATE',
    'SOURCE_CODE_RELEASE_COUNTDOWN',
    'MARKS_MIGRATION_INITIATE',
    'STATUS_PAGE_UPDATE',
  ],
};

// ΓöÇΓöÇΓöÇ Ports ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface IncidentResponseDeps {
  readonly idGenerator: { generate(): string };
  readonly clock: { nowIso(): string };
  readonly actionExecutor: (type: IncidentActionType, incident: Incident) => Promise<string>;
  readonly logger: { info(msg: string, ctx?: Record<string, unknown>): void };
}

// ΓöÇΓöÇΓöÇ Service Interface ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface IncidentResponseService {
  detectIncident(
    tier: IncidentTier,
    title: string,
    description: string,
    affectedSystems: string[],
  ): Incident;
  executeAutomaticResponse(incident: Incident): Promise<Incident>;
  updateStatus(incidentId: string, status: IncidentStatus): Incident;
  addAction(incidentId: string, action: IncidentAction): Incident;
  getOpenIncidents(): Incident[];
  getIncident(incidentId: string): Incident | undefined;
  resolveIncident(incidentId: string): Incident;
}

// ΓöÇΓöÇΓöÇ State ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

interface ServiceState {
  readonly incidents: Map<string, Incident>;
  readonly deps: IncidentResponseDeps;
}

// ΓöÇΓöÇΓöÇ Factory ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function createIncidentResponseService(deps: IncidentResponseDeps): IncidentResponseService {
  const state: ServiceState = {
    incidents: new Map(),
    deps,
  };
  return {
    detectIncident: (tier, title, description, affectedSystems) =>
      detectIncident(state, tier, title, description, affectedSystems),
    executeAutomaticResponse: (incident) => executeAutomaticResponse(state, incident),
    updateStatus: (incidentId, status) => updateStatus(state, incidentId, status),
    addAction: (incidentId, action) => addAction(state, incidentId, action),
    getOpenIncidents: () => getOpenIncidents(state),
    getIncident: (incidentId) => state.incidents.get(incidentId),
    resolveIncident: (incidentId) => resolveIncident(state, incidentId),
  };
}

// ΓöÇΓöÇΓöÇ Detection ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function detectIncident(
  state: ServiceState,
  tier: IncidentTier,
  title: string,
  description: string,
  affectedSystems: string[],
): Incident {
  const incident: Incident = {
    incidentId: state.deps.idGenerator.generate(),
    tier,
    title,
    description,
    detectedAt: state.deps.clock.nowIso(),
    status: 'DETECTED',
    affectedSystems,
    actions: [],
  };
  state.incidents.set(incident.incidentId, incident);
  state.deps.logger.info('Incident detected', { incidentId: incident.incidentId, tier, title });
  return incident;
}

// ΓöÇΓöÇΓöÇ Automatic Response ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

async function executeAutomaticResponse(
  state: ServiceState,
  incident: Incident,
): Promise<Incident> {
  const responding = replaceIncident(state, { ...incident, status: 'RESPONDING' });
  const sequence = TIER_RESPONSE_SEQUENCES[incident.tier];
  let current = responding;
  for (const actionType of sequence) {
    current = await executeAction(state, current, actionType);
  }
  return current;
}

async function executeAction(
  state: ServiceState,
  incident: Incident,
  actionType: IncidentActionType,
): Promise<Incident> {
  const actionId = state.deps.idGenerator.generate();
  const executedAt = state.deps.clock.nowIso();
  let result: 'success' | 'failed' = 'success';
  let notes = '';
  try {
    notes = await state.deps.actionExecutor(actionType, incident);
  } catch (err) {
    result = 'failed';
    notes = err instanceof Error ? err.message : 'Unknown error';
  }
  const action: IncidentAction = { actionId, type: actionType, executedAt, result, notes };
  return addAction(state, incident.incidentId, action);
}

// ΓöÇΓöÇΓöÇ Status Management ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function updateStatus(state: ServiceState, incidentId: string, status: IncidentStatus): Incident {
  const incident = requireIncident(state, incidentId);
  return replaceIncident(state, { ...incident, status });
}

function addAction(state: ServiceState, incidentId: string, action: IncidentAction): Incident {
  const incident = requireIncident(state, incidentId);
  const updated: Incident = { ...incident, actions: [...incident.actions, action] };
  return replaceIncident(state, updated);
}

function resolveIncident(state: ServiceState, incidentId: string): Incident {
  const incident = requireIncident(state, incidentId);
  const resolved: Incident = {
    ...incident,
    status: 'RESOLVED',
    resolvedAt: state.deps.clock.nowIso(),
  };
  return replaceIncident(state, resolved);
}

// ΓöÇΓöÇΓöÇ Queries ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function getOpenIncidents(state: ServiceState): Incident[] {
  return [...state.incidents.values()].filter(
    (i) => i.status !== 'RESOLVED' && i.status !== 'POST_MORTEM_PENDING',
  );
}

// ΓöÇΓöÇΓöÇ Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function requireIncident(state: ServiceState, incidentId: string): Incident {
  const incident = state.incidents.get(incidentId);
  if (!incident) throw new Error(`Incident not found: ${incidentId}`);
  return incident;
}

function replaceIncident(state: ServiceState, incident: Incident): Incident {
  state.incidents.set(incident.incidentId, incident);
  return incident;
}

// ΓöÇΓöÇΓöÇ Tier Metadata ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function getTierResponseSequence(tier: IncidentTier): IncidentActionType[] {
  return [...TIER_RESPONSE_SEQUENCES[tier]];
}
