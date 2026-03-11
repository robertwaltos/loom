/**
 * dynasty-espionage.ts
 * Spy networks, intelligence gathering, counter-espionage
 */

// ============================================================================
// Ports (defined locally per hexagonal architecture)
// ============================================================================

interface EspionageClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface EspionageIdPort {
  readonly generate: () => string;
}

interface EspionageLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

// ============================================================================
// Types
// ============================================================================

type AgentStatus = 'ACTIVE' | 'COMPROMISED' | 'RECALLED' | 'CAPTURED';

type MissionOutcome = 'SUCCESS' | 'PARTIAL' | 'FAILURE' | 'BLOWN';

type MissionType =
  | 'GATHER_INTELLIGENCE'
  | 'SABOTAGE'
  | 'ASSASSINATE'
  | 'STEAL_DOCUMENTS'
  | 'PLANT_EVIDENCE';

type CounterLevel = 'MINIMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';

interface SpyAgent {
  readonly agentId: string;
  readonly dynastyId: string;
  readonly worldId: string;
  readonly skillLevel: number;
  readonly status: AgentStatus;
  readonly plantedAtMicros: bigint;
  readonly coverIdentity: string;
}

interface EspionageMission {
  readonly missionId: string;
  readonly agentId: string;
  readonly dynastyId: string;
  readonly worldId: string;
  readonly missionType: MissionType;
  readonly targetDynastyId: string;
  readonly startedAtMicros: bigint;
  readonly completedAtMicros: bigint | null;
  readonly outcome: MissionOutcome | null;
}

interface SpyNetwork {
  readonly dynastyId: string;
  readonly worldId: string;
  readonly activeAgents: number;
  readonly compromisedAgents: number;
  readonly totalMissions: number;
  readonly successfulMissions: number;
  readonly counterLevel: CounterLevel;
}

interface CounterEspionage {
  readonly worldId: string;
  readonly dynastyId: string;
  readonly level: CounterLevel;
  readonly detectionChance: number;
  readonly lastUpdateMicros: bigint;
}

// ============================================================================
// State
// ============================================================================

interface EspionageState {
  readonly agents: Map<string, SpyAgent>;
  readonly missions: Map<string, EspionageMission>;
  readonly networks: Map<string, SpyNetwork>;
  readonly counterMeasures: Map<string, CounterEspionage>;
}

// ============================================================================
// Dependencies
// ============================================================================

interface DynastyEspionageDeps {
  readonly clock: EspionageClockPort;
  readonly idGen: EspionageIdPort;
  readonly logger: EspionageLoggerPort;
}

// ============================================================================
// Constants
// ============================================================================

const DETECTION_BASE_MINIMAL = 0.05;
const DETECTION_BASE_LOW = 0.15;
const DETECTION_BASE_MODERATE = 0.3;
const DETECTION_BASE_HIGH = 0.5;
const DETECTION_BASE_EXTREME = 0.75;

// ============================================================================
// Core Functions
// ============================================================================

function getNetworkKey(dynastyId: string, worldId: string): string {
  return dynastyId + ':' + worldId;
}

function getCounterKey(dynastyId: string, worldId: string): string {
  return dynastyId + ':' + worldId;
}

function plantAgent(
  state: EspionageState,
  deps: DynastyEspionageDeps,
  params: {
    dynastyId: string;
    worldId: string;
    skillLevel: number;
    coverIdentity: string;
  },
): { agentId: string; agent: SpyAgent } {
  const agentId = deps.idGen.generate();
  const nowMicros = deps.clock.nowMicroseconds();

  const agent: SpyAgent = {
    agentId,
    dynastyId: params.dynastyId,
    worldId: params.worldId,
    skillLevel: params.skillLevel,
    status: 'ACTIVE',
    plantedAtMicros: nowMicros,
    coverIdentity: params.coverIdentity,
  };

  state.agents.set(agentId, agent);

  const networkKey = getNetworkKey(params.dynastyId, params.worldId);
  const network = state.networks.get(networkKey);

  if (network === undefined) {
    const newNetwork: SpyNetwork = {
      dynastyId: params.dynastyId,
      worldId: params.worldId,
      activeAgents: 1,
      compromisedAgents: 0,
      totalMissions: 0,
      successfulMissions: 0,
      counterLevel: 'MINIMAL',
    };
    state.networks.set(networkKey, newNetwork);
  } else {
    const updated: SpyNetwork = {
      ...network,
      activeAgents: network.activeAgents + 1,
    };
    state.networks.set(networkKey, updated);
  }

  deps.logger.info('Agent planted', {
    agentId,
    dynastyId: params.dynastyId,
    worldId: params.worldId,
  });

  return { agentId, agent };
}

function getDetectionChance(level: CounterLevel): number {
  if (level === 'MINIMAL') return DETECTION_BASE_MINIMAL;
  if (level === 'LOW') return DETECTION_BASE_LOW;
  if (level === 'MODERATE') return DETECTION_BASE_MODERATE;
  if (level === 'HIGH') return DETECTION_BASE_HIGH;
  return DETECTION_BASE_EXTREME;
}

function calculateMissionOutcome(agentSkill: number, counterChance: number): MissionOutcome {
  const roll = Math.random();
  const adjustedChance = counterChance * (1.0 - agentSkill / 100.0);

  if (roll < adjustedChance) {
    return 'BLOWN';
  }

  if (roll < adjustedChance + 0.1) {
    return 'FAILURE';
  }

  if (roll < adjustedChance + 0.25) {
    return 'PARTIAL';
  }

  return 'SUCCESS';
}

function runMission(
  state: EspionageState,
  deps: DynastyEspionageDeps,
  params: {
    agentId: string;
    missionType: MissionType;
    targetDynastyId: string;
  },
): string | { missionId: string; outcome: MissionOutcome } {
  const agent = state.agents.get(params.agentId);

  if (agent === undefined) {
    return 'AGENT_NOT_FOUND';
  }

  if (agent.status !== 'ACTIVE') {
    return 'AGENT_NOT_ACTIVE';
  }

  const counterKey = getCounterKey(params.targetDynastyId, agent.worldId);
  const counter = state.counterMeasures.get(counterKey);
  const counterLevel = counter === undefined ? 'MINIMAL' : counter.level;
  const detectionChance = getDetectionChance(counterLevel);

  const outcome = calculateMissionOutcome(agent.skillLevel, detectionChance);

  const missionId = deps.idGen.generate();
  const nowMicros = deps.clock.nowMicroseconds();

  const mission: EspionageMission = {
    missionId,
    agentId: params.agentId,
    dynastyId: agent.dynastyId,
    worldId: agent.worldId,
    missionType: params.missionType,
    targetDynastyId: params.targetDynastyId,
    startedAtMicros: nowMicros,
    completedAtMicros: nowMicros,
    outcome,
  };

  state.missions.set(missionId, mission);

  if (outcome === 'BLOWN') {
    const updatedAgent: SpyAgent = {
      ...agent,
      status: 'COMPROMISED',
    };
    state.agents.set(params.agentId, updatedAgent);

    const networkKey = getNetworkKey(agent.dynastyId, agent.worldId);
    const network = state.networks.get(networkKey);
    if (network !== undefined) {
      const updated: SpyNetwork = {
        ...network,
        activeAgents: network.activeAgents - 1,
        compromisedAgents: network.compromisedAgents + 1,
        totalMissions: network.totalMissions + 1,
      };
      state.networks.set(networkKey, updated);
    }

    deps.logger.warn('Mission blown', { missionId, agentId: params.agentId });
  } else {
    const networkKey = getNetworkKey(agent.dynastyId, agent.worldId);
    const network = state.networks.get(networkKey);
    if (network !== undefined) {
      const success = outcome === 'SUCCESS' ? 1 : 0;
      const updated: SpyNetwork = {
        ...network,
        totalMissions: network.totalMissions + 1,
        successfulMissions: network.successfulMissions + success,
      };
      state.networks.set(networkKey, updated);
    }

    deps.logger.info('Mission completed', {
      missionId,
      outcome,
      agentId: params.agentId,
    });
  }

  return { missionId, outcome };
}

function detectAgent(
  state: EspionageState,
  deps: DynastyEspionageDeps,
  params: { agentId: string },
): string | { detected: true; agent: SpyAgent } {
  const agent = state.agents.get(params.agentId);

  if (agent === undefined) {
    return 'AGENT_NOT_FOUND';
  }

  if (agent.status !== 'ACTIVE') {
    return 'AGENT_ALREADY_COMPROMISED';
  }

  const updated: SpyAgent = {
    ...agent,
    status: 'CAPTURED',
  };
  state.agents.set(params.agentId, updated);

  const networkKey = getNetworkKey(agent.dynastyId, agent.worldId);
  const network = state.networks.get(networkKey);
  if (network !== undefined) {
    const updatedNet: SpyNetwork = {
      ...network,
      activeAgents: network.activeAgents - 1,
      compromisedAgents: network.compromisedAgents + 1,
    };
    state.networks.set(networkKey, updatedNet);
  }

  deps.logger.warn('Agent captured', {
    agentId: params.agentId,
    dynastyId: agent.dynastyId,
  });

  return { detected: true, agent: updated };
}

function setCounterLevel(
  state: EspionageState,
  deps: DynastyEspionageDeps,
  params: { dynastyId: string; worldId: string; level: CounterLevel },
): { updated: true } {
  const key = getCounterKey(params.dynastyId, params.worldId);
  const nowMicros = deps.clock.nowMicroseconds();
  const detectionChance = getDetectionChance(params.level);

  const counter: CounterEspionage = {
    worldId: params.worldId,
    dynastyId: params.dynastyId,
    level: params.level,
    detectionChance,
    lastUpdateMicros: nowMicros,
  };

  state.counterMeasures.set(key, counter);

  deps.logger.info('Counter-espionage level set', {
    dynastyId: params.dynastyId,
    worldId: params.worldId,
    level: params.level,
  });

  return { updated: true };
}

function getNetworkStatus(
  state: EspionageState,
  deps: DynastyEspionageDeps,
  params: { dynastyId: string; worldId: string },
): string | SpyNetwork {
  const key = getNetworkKey(params.dynastyId, params.worldId);
  const network = state.networks.get(key);

  if (network === undefined) {
    return 'NO_NETWORK';
  }

  return network;
}

function recallAgent(
  state: EspionageState,
  deps: DynastyEspionageDeps,
  params: { agentId: string },
): string | { recalled: true; agent: SpyAgent } {
  const agent = state.agents.get(params.agentId);

  if (agent === undefined) {
    return 'AGENT_NOT_FOUND';
  }

  if (agent.status === 'CAPTURED') {
    return 'AGENT_CAPTURED';
  }

  const updated: SpyAgent = {
    ...agent,
    status: 'RECALLED',
  };
  state.agents.set(params.agentId, updated);

  if (agent.status === 'ACTIVE') {
    const networkKey = getNetworkKey(agent.dynastyId, agent.worldId);
    const network = state.networks.get(networkKey);
    if (network !== undefined) {
      const updatedNet: SpyNetwork = {
        ...network,
        activeAgents: network.activeAgents - 1,
      };
      state.networks.set(networkKey, updatedNet);
    }
  }

  deps.logger.info('Agent recalled', {
    agentId: params.agentId,
    dynastyId: agent.dynastyId,
  });

  return { recalled: true, agent: updated };
}

function getMissionHistory(
  state: EspionageState,
  deps: DynastyEspionageDeps,
  params: { dynastyId: string; limit: number },
): EspionageMission[] {
  const results: EspionageMission[] = [];

  for (const mission of state.missions.values()) {
    if (mission.dynastyId === params.dynastyId) {
      results.push(mission);
    }
  }

  results.sort((a, b) => {
    if (a.startedAtMicros > b.startedAtMicros) return -1;
    if (a.startedAtMicros < b.startedAtMicros) return 1;
    return 0;
  });

  return results.slice(0, params.limit);
}

function getAgentsByStatus(
  state: EspionageState,
  deps: DynastyEspionageDeps,
  params: { dynastyId: string; worldId: string; status: AgentStatus },
): SpyAgent[] {
  const results: SpyAgent[] = [];

  for (const agent of state.agents.values()) {
    if (agent.dynastyId !== params.dynastyId) continue;
    if (agent.worldId !== params.worldId) continue;
    if (agent.status !== params.status) continue;
    results.push(agent);
  }

  return results;
}

// ============================================================================
// Module Factory
// ============================================================================

export interface DynastyEspionageModule {
  readonly plantAgent: (params: {
    dynastyId: string;
    worldId: string;
    skillLevel: number;
    coverIdentity: string;
  }) => { agentId: string; agent: SpyAgent };
  readonly runMission: (params: {
    agentId: string;
    missionType: MissionType;
    targetDynastyId: string;
  }) => string | { missionId: string; outcome: MissionOutcome };
  readonly detectAgent: (params: {
    agentId: string;
  }) => string | { detected: true; agent: SpyAgent };
  readonly setCounterLevel: (params: {
    dynastyId: string;
    worldId: string;
    level: CounterLevel;
  }) => { updated: true };
  readonly getNetworkStatus: (params: {
    dynastyId: string;
    worldId: string;
  }) => string | SpyNetwork;
  readonly recallAgent: (params: {
    agentId: string;
  }) => string | { recalled: true; agent: SpyAgent };
  readonly getMissionHistory: (params: { dynastyId: string; limit: number }) => EspionageMission[];
  readonly getAgentsByStatus: (params: {
    dynastyId: string;
    worldId: string;
    status: AgentStatus;
  }) => SpyAgent[];
}

export function createDynastyEspionage(deps: DynastyEspionageDeps): DynastyEspionageModule {
  const state: EspionageState = {
    agents: new Map(),
    missions: new Map(),
    networks: new Map(),
    counterMeasures: new Map(),
  };

  return {
    plantAgent: (params) => plantAgent(state, deps, params),
    runMission: (params) => runMission(state, deps, params),
    detectAgent: (params) => detectAgent(state, deps, params),
    setCounterLevel: (params) => setCounterLevel(state, deps, params),
    getNetworkStatus: (params) => getNetworkStatus(state, deps, params),
    recallAgent: (params) => recallAgent(state, deps, params),
    getMissionHistory: (params) => getMissionHistory(state, deps, params),
    getAgentsByStatus: (params) => getAgentsByStatus(state, deps, params),
  };
}

export type {
  SpyAgent,
  AgentStatus,
  EspionageMission,
  MissionOutcome,
  MissionType,
  CounterLevel,
  SpyNetwork,
  CounterEspionage,
  DynastyEspionageDeps,
};
