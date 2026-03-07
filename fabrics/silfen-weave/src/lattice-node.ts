/**
 * Lattice Node Registry — Topology and frequency signatures of the Silfen Weave.
 *
 * Bible v1.1 Part 8: Every world is a node in the Lattice. Nodes carry a
 * FrequencySignature that determines resonance compatibility for transit.
 * ResonanceBeacons are deployed on nodes to improve transit precision.
 *
 * Node distance (light-years) directly affects lock duration.
 * Field strength and beacon status affect coherence quality.
 */

import {
  nodeNotFound,
  nodeAlreadyExists,
  beaconInvalidStatus,
} from './weave-errors.js';

// ─── Types ───────────────────────────────────────────────────────────

export type BeaconStatus = 'active' | 'degraded' | 'compromised' | 'destroyed';

export type PrecisionRating = 'exact' | 'high' | 'moderate' | 'low' | 'unknown';

export interface FrequencySignature {
  readonly primary: bigint;
  readonly harmonics: ReadonlyArray<number>;
  readonly fieldStrength: number;
}

export interface ResonanceBeacon {
  readonly beaconId: string;
  readonly nodeId: string;
  readonly status: BeaconStatus;
  readonly deployedAt: number;
}

export interface LatticeNode {
  readonly nodeId: string;
  readonly worldId: string;
  readonly signature: FrequencySignature;
  readonly precisionRating: PrecisionRating;
  readonly beacon: ResonanceBeacon | null;
  readonly registeredAt: number;
}

export interface LatticeRoute {
  readonly originId: string;
  readonly destinationId: string;
  readonly distanceLY: number;
  readonly resonanceCompatibility: number;
}

export interface RegisterNodeParams {
  readonly nodeId: string;
  readonly worldId: string;
  readonly signature: FrequencySignature;
  readonly precisionRating?: PrecisionRating;
}

export interface LatticeNodeRegistry {
  registerNode(params: RegisterNodeParams): LatticeNode;
  getNode(nodeId: string): LatticeNode;
  tryGetNode(nodeId: string): LatticeNode | undefined;
  deployBeacon(nodeId: string, beaconId: string): ResonanceBeacon;
  setBeaconStatus(nodeId: string, status: BeaconStatus): ResonanceBeacon;
  setPrecisionRating(nodeId: string, rating: PrecisionRating): LatticeNode;
  registerRoute(originId: string, destinationId: string, distanceLY: number): LatticeRoute;
  getRoute(originId: string, destinationId: string): LatticeRoute | undefined;
  calculateResonance(originId: string, destinationId: string): number;
  listNodes(): ReadonlyArray<LatticeNode>;
  count(): number;
}

// ─── Constants ───────────────────────────────────────────────────────

const BEACON_STATUS_ORDER: ReadonlyArray<BeaconStatus> = [
  'active', 'degraded', 'compromised', 'destroyed',
];

const PRECISION_MULTIPLIER: Readonly<Record<PrecisionRating, number>> = {
  exact: 1.0,
  high: 0.85,
  moderate: 0.65,
  low: 0.40,
  unknown: 0.20,
};

// ─── State ───────────────────────────────────────────────────────────

interface MutableBeacon {
  readonly beaconId: string;
  readonly nodeId: string;
  status: BeaconStatus;
  readonly deployedAt: number;
}

interface MutableNode {
  readonly nodeId: string;
  readonly worldId: string;
  readonly signature: FrequencySignature;
  precisionRating: PrecisionRating;
  beacon: MutableBeacon | null;
  readonly registeredAt: number;
}

interface RegistryState {
  readonly nodes: Map<string, MutableNode>;
  readonly routes: Map<string, MutableRoute>;
  readonly clock: { nowMicroseconds(): number };
}

interface MutableRoute {
  readonly originId: string;
  readonly destinationId: string;
  readonly distanceLY: number;
  resonanceCompatibility: number;
}

// ─── Factory ─────────────────────────────────────────────────────────

export function createLatticeNodeRegistry(deps: {
  readonly clock: { nowMicroseconds(): number };
}): LatticeNodeRegistry {
  const state: RegistryState = {
    nodes: new Map(),
    routes: new Map(),
    clock: deps.clock,
  };

  return {
    registerNode: (p) => registerNodeImpl(state, p),
    getNode: (id) => getNodeImpl(state, id),
    tryGetNode: (id) => tryGetNodeImpl(state, id),
    deployBeacon: (nId, bId) => deployBeaconImpl(state, nId, bId),
    setBeaconStatus: (nId, s) => setBeaconStatusImpl(state, nId, s),
    setPrecisionRating: (nId, r) => setPrecisionImpl(state, nId, r),
    registerRoute: (o, d, ly) => registerRouteImpl(state, o, d, ly),
    getRoute: (o, d) => getRouteImpl(state, o, d),
    calculateResonance: (o, d) => calculateResonanceImpl(state, o, d),
    listNodes: () => [...state.nodes.values()].map(toReadonlyNode),
    count: () => state.nodes.size,
  };
}

// ─── Node Operations ─────────────────────────────────────────────────

function registerNodeImpl(state: RegistryState, params: RegisterNodeParams): LatticeNode {
  if (state.nodes.has(params.nodeId)) {
    throw nodeAlreadyExists(params.nodeId);
  }
  const node: MutableNode = {
    nodeId: params.nodeId,
    worldId: params.worldId,
    signature: params.signature,
    precisionRating: params.precisionRating ?? 'unknown',
    beacon: null,
    registeredAt: state.clock.nowMicroseconds(),
  };
  state.nodes.set(params.nodeId, node);
  return toReadonlyNode(node);
}

function getNodeImpl(state: RegistryState, nodeId: string): LatticeNode {
  const node = state.nodes.get(nodeId);
  if (node === undefined) throw nodeNotFound(nodeId);
  return toReadonlyNode(node);
}

function tryGetNodeImpl(state: RegistryState, nodeId: string): LatticeNode | undefined {
  const node = state.nodes.get(nodeId);
  return node !== undefined ? toReadonlyNode(node) : undefined;
}

// ─── Beacon Operations ──────────────────────────────────────────────

function deployBeaconImpl(
  state: RegistryState,
  nodeId: string,
  beaconId: string,
): ResonanceBeacon {
  const node = getMutableNode(state, nodeId);
  const beacon: MutableBeacon = {
    beaconId,
    nodeId,
    status: 'active',
    deployedAt: state.clock.nowMicroseconds(),
  };
  node.beacon = beacon;
  return toReadonlyBeacon(beacon);
}

function setBeaconStatusImpl(
  state: RegistryState,
  nodeId: string,
  status: BeaconStatus,
): ResonanceBeacon {
  const node = getMutableNode(state, nodeId);
  if (node.beacon === null) {
    throw beaconInvalidStatus(nodeId, 'no beacon deployed');
  }
  validateBeaconTransition(nodeId, node.beacon.status, status);
  node.beacon.status = status;
  return toReadonlyBeacon(node.beacon);
}

function validateBeaconTransition(nodeId: string, from: BeaconStatus, to: BeaconStatus): void {
  const fromIdx = BEACON_STATUS_ORDER.indexOf(from);
  const toIdx = BEACON_STATUS_ORDER.indexOf(to);
  if (toIdx < fromIdx) {
    throw beaconInvalidStatus(nodeId, `cannot transition from ${from} to ${to}`);
  }
}

// ─── Precision ──────────────────────────────────────────────────────

function setPrecisionImpl(
  state: RegistryState,
  nodeId: string,
  rating: PrecisionRating,
): LatticeNode {
  const node = getMutableNode(state, nodeId);
  node.precisionRating = rating;
  return toReadonlyNode(node);
}

// ─── Route Operations ───────────────────────────────────────────────

function registerRouteImpl(
  state: RegistryState,
  originId: string,
  destinationId: string,
  distanceLY: number,
): LatticeRoute {
  getMutableNode(state, originId);
  getMutableNode(state, destinationId);
  const compatibility = calculateResonanceImpl(state, originId, destinationId);
  const route: MutableRoute = {
    originId,
    destinationId,
    distanceLY,
    resonanceCompatibility: compatibility,
  };
  state.routes.set(routeKey(originId, destinationId), route);
  return toReadonlyRoute(route);
}

function getRouteImpl(
  state: RegistryState,
  originId: string,
  destinationId: string,
): LatticeRoute | undefined {
  const route = state.routes.get(routeKey(originId, destinationId));
  return route !== undefined ? toReadonlyRoute(route) : undefined;
}

// ─── Resonance Calculation ──────────────────────────────────────────

function calculateResonanceImpl(
  state: RegistryState,
  originId: string,
  destinationId: string,
): number {
  const origin = getMutableNode(state, originId);
  const dest = getMutableNode(state, destinationId);
  return computeResonanceScore(origin, dest);
}

function computeResonanceScore(origin: MutableNode, dest: MutableNode): number {
  const harmonicOverlap = calculateHarmonicOverlap(
    origin.signature.harmonics,
    dest.signature.harmonics,
  );
  const fieldAvg = (origin.signature.fieldStrength + dest.signature.fieldStrength) / 2;
  const precisionAvg = averagePrecision(origin.precisionRating, dest.precisionRating);
  const beaconBonus = calculateBeaconBonus(origin, dest);
  return clampZeroOne(harmonicOverlap * fieldAvg * precisionAvg + beaconBonus);
}

function calculateHarmonicOverlap(
  a: ReadonlyArray<number>,
  b: ReadonlyArray<number>,
): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const shared = b.filter((h) => setA.has(h)).length;
  const total = new Set([...a, ...b]).size;
  return total > 0 ? shared / total : 0;
}

function averagePrecision(a: PrecisionRating, b: PrecisionRating): number {
  return (PRECISION_MULTIPLIER[a] + PRECISION_MULTIPLIER[b]) / 2;
}

function calculateBeaconBonus(origin: MutableNode, dest: MutableNode): number {
  let bonus = 0;
  if (origin.beacon !== null && origin.beacon.status === 'active') bonus += 0.05;
  if (dest.beacon !== null && dest.beacon.status === 'active') bonus += 0.05;
  return bonus;
}

// ─── Helpers ────────────────────────────────────────────────────────

function getMutableNode(state: RegistryState, nodeId: string): MutableNode {
  const node = state.nodes.get(nodeId);
  if (node === undefined) throw nodeNotFound(nodeId);
  return node;
}

function routeKey(originId: string, destinationId: string): string {
  return `${originId}:${destinationId}`;
}

function clampZeroOne(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function toReadonlyNode(node: MutableNode): LatticeNode {
  return {
    nodeId: node.nodeId,
    worldId: node.worldId,
    signature: node.signature,
    precisionRating: node.precisionRating,
    beacon: node.beacon !== null ? toReadonlyBeacon(node.beacon) : null,
    registeredAt: node.registeredAt,
  };
}

function toReadonlyBeacon(beacon: MutableBeacon): ResonanceBeacon {
  return {
    beaconId: beacon.beaconId,
    nodeId: beacon.nodeId,
    status: beacon.status,
    deployedAt: beacon.deployedAt,
  };
}

function toReadonlyRoute(route: MutableRoute): LatticeRoute {
  return {
    originId: route.originId,
    destinationId: route.destinationId,
    distanceLY: route.distanceLY,
    resonanceCompatibility: route.resonanceCompatibility,
  };
}
