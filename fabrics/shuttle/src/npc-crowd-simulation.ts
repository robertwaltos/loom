/**
 * NPC Crowd Simulation — Flocking, grouping, and pathfinding behaviors.
 *
 * Implements Reynolds flocking rules (separation, alignment, cohesion)
 * combined with goal-seeking and obstacle avoidance for NPC crowds.
 *
 * Supports:
 *   - crowd      → Mass NPC movement with flocking
 *   - patrol     → Waypoint-based guard routes
 *   - gather     → NPCs converge on a point (market, event)
 *   - scatter    → NPCs flee from a threat
 *   - idle       → Random wandering within a zone
 *
 * Designed for the Mass Entity Framework tier (UE5 crowd rendering).
 *
 * Thread: cotton/shuttle/npc-crowd-simulation
 * Tier: 1
 */

// ── Ports ────────────────────────────────────────────────────────

export interface CrowdClockPort {
  readonly nowMicroseconds: () => number;
}

export interface CrowdIdPort {
  readonly generate: () => string;
}

export interface CrowdLogPort {
  readonly info: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
}

// ── Vector3 ──────────────────────────────────────────────────────

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

function vec3Add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function vec3Sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function vec3Scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function vec3Length(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function vec3Normalize(v: Vec3): Vec3 {
  const len = vec3Length(v);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return vec3Scale(v, 1 / len);
}

function vec3DistanceSq(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

function vec3Clamp(v: Vec3, maxLen: number): Vec3 {
  const len = vec3Length(v);
  if (len <= maxLen) return v;
  return vec3Scale(vec3Normalize(v), maxLen);
}

// ── Types ────────────────────────────────────────────────────────

export type CrowdBehavior = 'crowd' | 'patrol' | 'gather' | 'scatter' | 'idle';

export interface CrowdAgent {
  readonly agentId: string;
  readonly npcId: string;
  readonly position: Vec3;
  readonly velocity: Vec3;
  readonly behavior: CrowdBehavior;
  readonly groupId: string | null;
  readonly maxSpeed: number;
  readonly maxForce: number;
  readonly waypointIndex: number;
}

export interface CrowdGroup {
  readonly groupId: string;
  readonly behavior: CrowdBehavior;
  readonly agents: ReadonlySet<string>;
  readonly target: Vec3 | null;
  readonly waypoints: ReadonlyArray<Vec3>;
  readonly threatSource: Vec3 | null;
}

export interface CrowdObstacle {
  readonly obstacleId: string;
  readonly position: Vec3;
  readonly radius: number;
}

export interface CrowdConfig {
  readonly separationRadius: number;
  readonly alignmentRadius: number;
  readonly cohesionRadius: number;
  readonly separationWeight: number;
  readonly alignmentWeight: number;
  readonly cohesionWeight: number;
  readonly goalWeight: number;
  readonly obstacleAvoidanceWeight: number;
  readonly obstacleAvoidanceRadius: number;
  readonly wanderRadius: number;
  readonly defaultMaxSpeed: number;
  readonly defaultMaxForce: number;
}

const DEFAULT_CROWD_CONFIG: CrowdConfig = {
  separationRadius: 200,
  alignmentRadius: 400,
  cohesionRadius: 500,
  separationWeight: 1.5,
  alignmentWeight: 1.0,
  cohesionWeight: 1.0,
  goalWeight: 2.0,
  obstacleAvoidanceWeight: 3.0,
  obstacleAvoidanceRadius: 300,
  wanderRadius: 500,
  defaultMaxSpeed: 150,
  defaultMaxForce: 50,
};

// ── Flocking Forces ──────────────────────────────────────────────

function computeSeparation(
  agent: CrowdAgent,
  neighbors: ReadonlyArray<CrowdAgent>,
  radius: number,
): Vec3 {
  let steer: Vec3 = { x: 0, y: 0, z: 0 };
  let count = 0;
  const radiusSq = radius * radius;

  for (const other of neighbors) {
    if (other.agentId === agent.agentId) continue;
    const distSq = vec3DistanceSq(agent.position, other.position);
    if (distSq > 0 && distSq < radiusSq) {
      const diff = vec3Normalize(vec3Sub(agent.position, other.position));
      const scaled = vec3Scale(diff, 1 / Math.sqrt(distSq));
      steer = vec3Add(steer, scaled);
      count += 1;
    }
  }

  if (count > 0) {
    steer = vec3Scale(steer, 1 / count);
  }
  return steer;
}

function computeAlignment(
  agent: CrowdAgent,
  neighbors: ReadonlyArray<CrowdAgent>,
  radius: number,
): Vec3 {
  let avgVel: Vec3 = { x: 0, y: 0, z: 0 };
  let count = 0;
  const radiusSq = radius * radius;

  for (const other of neighbors) {
    if (other.agentId === agent.agentId) continue;
    const distSq = vec3DistanceSq(agent.position, other.position);
    if (distSq < radiusSq) {
      avgVel = vec3Add(avgVel, other.velocity);
      count += 1;
    }
  }

  if (count > 0) {
    avgVel = vec3Scale(avgVel, 1 / count);
    return vec3Normalize(avgVel);
  }
  return { x: 0, y: 0, z: 0 };
}

function computeCohesion(
  agent: CrowdAgent,
  neighbors: ReadonlyArray<CrowdAgent>,
  radius: number,
): Vec3 {
  let center: Vec3 = { x: 0, y: 0, z: 0 };
  let count = 0;
  const radiusSq = radius * radius;

  for (const other of neighbors) {
    if (other.agentId === agent.agentId) continue;
    const distSq = vec3DistanceSq(agent.position, other.position);
    if (distSq < radiusSq) {
      center = vec3Add(center, other.position);
      count += 1;
    }
  }

  if (count > 0) {
    center = vec3Scale(center, 1 / count);
    return vec3Normalize(vec3Sub(center, agent.position));
  }
  return { x: 0, y: 0, z: 0 };
}

// ── Goal Seeking ─────────────────────────────────────────────────

function computeGoalForce(agent: CrowdAgent, target: Vec3 | null): Vec3 {
  if (!target) return { x: 0, y: 0, z: 0 };
  const toTarget = vec3Sub(target, agent.position);
  return vec3Normalize(toTarget);
}

function computeFleeForce(agent: CrowdAgent, threat: Vec3): Vec3 {
  const away = vec3Sub(agent.position, threat);
  return vec3Normalize(away);
}

// ── Obstacle Avoidance ───────────────────────────────────────────

function computeObstacleAvoidance(
  agent: CrowdAgent,
  obstacles: ReadonlyArray<CrowdObstacle>,
  avoidanceRadius: number,
): Vec3 {
  let steer: Vec3 = { x: 0, y: 0, z: 0 };
  for (const obs of obstacles) {
    const toAgent = vec3Sub(agent.position, obs.position);
    const dist = vec3Length(toAgent) - obs.radius;
    if (dist < avoidanceRadius && dist > 0) {
      const force = vec3Scale(vec3Normalize(toAgent), 1 / dist);
      steer = vec3Add(steer, force);
    }
  }
  return steer;
}

// ── Wander ───────────────────────────────────────────────────────

let wanderSeed = 42;
function pseudoRandom(): number {
  wanderSeed = (wanderSeed * 1103515245 + 12345) & 0x7fffffff;
  return (wanderSeed / 0x7fffffff) * 2 - 1;
}

function computeWander(): Vec3 {
  return { x: pseudoRandom(), y: 0, z: pseudoRandom() };
}

// ── Simulation State ─────────────────────────────────────────────

interface CrowdSimState {
  readonly clock: CrowdClockPort;
  readonly id: CrowdIdPort;
  readonly log: CrowdLogPort;
  readonly config: CrowdConfig;
  readonly agents: Map<string, CrowdAgent>;
  readonly groups: Map<string, CrowdGroup>;
  readonly obstacles: Map<string, CrowdObstacle>;
}

// ── Agent Management ─────────────────────────────────────────────

function addAgent(
  state: CrowdSimState,
  npcId: string,
  position: Vec3,
  behavior: CrowdBehavior,
  groupId?: string,
): CrowdAgent {
  const agentId = state.id.generate();
  const agent: CrowdAgent = {
    agentId,
    npcId,
    position,
    velocity: { x: 0, y: 0, z: 0 },
    behavior,
    groupId: groupId ?? null,
    maxSpeed: state.config.defaultMaxSpeed,
    maxForce: state.config.defaultMaxForce,
    waypointIndex: 0,
  };
  state.agents.set(agentId, agent);

  if (groupId) {
    const group = state.groups.get(groupId);
    if (group) {
      (group.agents as Set<string>).add(agentId);
    }
  }

  return agent;
}

function removeAgent(state: CrowdSimState, agentId: string): boolean {
  const agent = state.agents.get(agentId);
  if (!agent) return false;

  if (agent.groupId) {
    const group = state.groups.get(agent.groupId);
    if (group) (group.agents as Set<string>).delete(agentId);
  }

  state.agents.delete(agentId);
  return true;
}

// ── Group Management ─────────────────────────────────────────────

function createGroup(
  state: CrowdSimState,
  behavior: CrowdBehavior,
  target?: Vec3,
  waypoints?: Vec3[],
): CrowdGroup {
  const groupId = state.id.generate();
  const group: CrowdGroup = {
    groupId,
    behavior,
    agents: new Set(),
    target: target ?? null,
    waypoints: waypoints ?? [],
    threatSource: null,
  };
  state.groups.set(groupId, group);
  return group;
}

function setGroupTarget(state: CrowdSimState, groupId: string, target: Vec3): boolean {
  const group = state.groups.get(groupId);
  if (!group) return false;
  (state.groups as Map<string, CrowdGroup>).set(groupId, { ...group, target });
  return true;
}

function setGroupThreat(
  state: CrowdSimState,
  groupId: string,
  threat: Vec3 | null,
): boolean {
  const group = state.groups.get(groupId);
  if (!group) return false;
  state.groups.set(groupId, { ...group, threatSource: threat, behavior: threat ? 'scatter' : group.behavior });
  return true;
}

// ── Obstacle Management ──────────────────────────────────────────

function addObstacle(
  state: CrowdSimState,
  position: Vec3,
  radius: number,
): CrowdObstacle {
  const obstacleId = state.id.generate();
  const obstacle: CrowdObstacle = { obstacleId, position, radius };
  state.obstacles.set(obstacleId, obstacle);
  return obstacle;
}

function removeObstacle(state: CrowdSimState, obstacleId: string): boolean {
  return state.obstacles.delete(obstacleId);
}

// ── Tick: Update All Agents ──────────────────────────────────────

function getAgentTarget(agent: CrowdAgent, state: CrowdSimState): Vec3 | null {
  if (!agent.groupId) return null;
  const group = state.groups.get(agent.groupId);
  if (!group) return null;

  if (group.behavior === 'patrol' && group.waypoints.length > 0) {
    return group.waypoints[agent.waypointIndex % group.waypoints.length];
  }

  return group.target;
}

function getAgentThreat(agent: CrowdAgent, state: CrowdSimState): Vec3 | null {
  if (!agent.groupId) return null;
  const group = state.groups.get(agent.groupId);
  return group?.threatSource ?? null;
}

function tickAgent(
  agent: CrowdAgent,
  state: CrowdSimState,
  deltaSeconds: number,
): CrowdAgent {
  const neighbors = getNeighbors(agent, state);
  const obstacles = [...state.obstacles.values()];
  const cfg = state.config;

  const separation = vec3Scale(
    computeSeparation(agent, neighbors, cfg.separationRadius),
    cfg.separationWeight,
  );
  const alignment = vec3Scale(
    computeAlignment(agent, neighbors, cfg.alignmentRadius),
    cfg.alignmentWeight,
  );
  const cohesion = vec3Scale(
    computeCohesion(agent, neighbors, cfg.cohesionRadius),
    cfg.cohesionWeight,
  );
  const avoidance = vec3Scale(
    computeObstacleAvoidance(agent, obstacles, cfg.obstacleAvoidanceRadius),
    cfg.obstacleAvoidanceWeight,
  );

  let goalForce: Vec3 = { x: 0, y: 0, z: 0 };
  const behavior = agent.groupId
    ? (state.groups.get(agent.groupId)?.behavior ?? agent.behavior)
    : agent.behavior;

  switch (behavior) {
    case 'crowd':
    case 'gather': {
      const target = getAgentTarget(agent, state);
      goalForce = vec3Scale(computeGoalForce(agent, target), cfg.goalWeight);
      break;
    }
    case 'patrol': {
      const target = getAgentTarget(agent, state);
      goalForce = vec3Scale(computeGoalForce(agent, target), cfg.goalWeight);
      break;
    }
    case 'scatter': {
      const threat = getAgentThreat(agent, state);
      if (threat) {
        goalForce = vec3Scale(computeFleeForce(agent, threat), cfg.goalWeight * 2);
      }
      break;
    }
    case 'idle':
      goalForce = vec3Scale(computeWander(), cfg.goalWeight * 0.3);
      break;
  }

  let totalForce = vec3Add(separation, alignment);
  totalForce = vec3Add(totalForce, cohesion);
  totalForce = vec3Add(totalForce, avoidance);
  totalForce = vec3Add(totalForce, goalForce);
  totalForce = vec3Clamp(totalForce, agent.maxForce);

  let newVelocity = vec3Add(agent.velocity, vec3Scale(totalForce, deltaSeconds));
  newVelocity = vec3Clamp(newVelocity, agent.maxSpeed);

  const newPosition = vec3Add(agent.position, vec3Scale(newVelocity, deltaSeconds));

  let waypointIndex = agent.waypointIndex;
  if (behavior === 'patrol' && agent.groupId) {
    const group = state.groups.get(agent.groupId);
    if (group && group.waypoints.length > 0) {
      const wp = group.waypoints[waypointIndex % group.waypoints.length];
      if (vec3DistanceSq(newPosition, wp) < 10_000) {
        waypointIndex = (waypointIndex + 1) % group.waypoints.length;
      }
    }
  }

  return {
    ...agent,
    position: newPosition,
    velocity: newVelocity,
    waypointIndex,
  };
}

function getNeighbors(
  agent: CrowdAgent,
  state: CrowdSimState,
): ReadonlyArray<CrowdAgent> {
  const maxRadiusSq = state.config.cohesionRadius * state.config.cohesionRadius;
  const result: CrowdAgent[] = [];
  for (const other of state.agents.values()) {
    if (other.agentId === agent.agentId) continue;
    if (vec3DistanceSq(agent.position, other.position) < maxRadiusSq) {
      result.push(other);
    }
  }
  return result;
}

function tickSimulation(state: CrowdSimState, deltaSeconds: number): void {
  const updated: CrowdAgent[] = [];
  for (const agent of state.agents.values()) {
    updated.push(tickAgent(agent, state, deltaSeconds));
  }
  for (const agent of updated) {
    state.agents.set(agent.agentId, agent);
  }
}

// ── Query ────────────────────────────────────────────────────────

function getAgentsInRadius(
  state: CrowdSimState,
  center: Vec3,
  radius: number,
): ReadonlyArray<CrowdAgent> {
  const radiusSq = radius * radius;
  const result: CrowdAgent[] = [];
  for (const agent of state.agents.values()) {
    if (vec3DistanceSq(agent.position, center) < radiusSq) {
      result.push(agent);
    }
  }
  return result;
}

// ── Public Interface ─────────────────────────────────────────────

export interface CrowdSimulation {
  readonly addAgent: (
    npcId: string,
    position: Vec3,
    behavior: CrowdBehavior,
    groupId?: string,
  ) => CrowdAgent;
  readonly removeAgent: (agentId: string) => boolean;
  readonly createGroup: (
    behavior: CrowdBehavior,
    target?: Vec3,
    waypoints?: Vec3[],
  ) => CrowdGroup;
  readonly setGroupTarget: (groupId: string, target: Vec3) => boolean;
  readonly setGroupThreat: (groupId: string, threat: Vec3 | null) => boolean;
  readonly addObstacle: (position: Vec3, radius: number) => CrowdObstacle;
  readonly removeObstacle: (obstacleId: string) => boolean;
  readonly tick: (deltaSeconds: number) => void;
  readonly getAgent: (agentId: string) => CrowdAgent | undefined;
  readonly getGroup: (groupId: string) => CrowdGroup | undefined;
  readonly getAgentsInRadius: (center: Vec3, radius: number) => ReadonlyArray<CrowdAgent>;
  readonly getAllAgents: () => ReadonlyArray<CrowdAgent>;
  readonly getAgentCount: () => number;
}

export interface CrowdSimDeps {
  readonly clock: CrowdClockPort;
  readonly id: CrowdIdPort;
  readonly log: CrowdLogPort;
  readonly config?: Partial<CrowdConfig>;
}

// ── Factory ──────────────────────────────────────────────────────

function createCrowdSimulation(deps: CrowdSimDeps): CrowdSimulation {
  const config: CrowdConfig = { ...DEFAULT_CROWD_CONFIG, ...deps.config };
  const state: CrowdSimState = {
    clock: deps.clock,
    id: deps.id,
    log: deps.log,
    config,
    agents: new Map(),
    groups: new Map(),
    obstacles: new Map(),
  };

  return {
    addAgent: (npcId, pos, beh, gId) => addAgent(state, npcId, pos, beh, gId),
    removeAgent: (id) => removeAgent(state, id),
    createGroup: (beh, tgt, wps) => createGroup(state, beh, tgt, wps),
    setGroupTarget: (gId, tgt) => setGroupTarget(state, gId, tgt),
    setGroupThreat: (gId, threat) => setGroupThreat(state, gId, threat),
    addObstacle: (pos, r) => addObstacle(state, pos, r),
    removeObstacle: (id) => removeObstacle(state, id),
    tick: (dt) => tickSimulation(state, dt),
    getAgent: (id) => state.agents.get(id),
    getGroup: (id) => state.groups.get(id),
    getAgentsInRadius: (center, r) => getAgentsInRadius(state, center, r),
    getAllAgents: () => [...state.agents.values()],
    getAgentCount: () => state.agents.size,
  };
}

// ── Exports ──────────────────────────────────────────────────────

export {
  createCrowdSimulation,
  DEFAULT_CROWD_CONFIG,
  vec3Add,
  vec3Sub,
  vec3Scale,
  vec3Length,
  vec3Normalize,
  vec3DistanceSq,
  vec3Clamp,
};
