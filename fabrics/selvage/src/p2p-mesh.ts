/**
 * p2p-mesh.ts — Peer-to-peer mesh for local interactions.
 *
 * NEXT-STEPS Phase 17.6: "P2P mesh for local interactions: reduce server
 * load for nearby players."
 *
 * Players within a proximity radius form a mesh group.  Minor
 * interactions (emotes, voice proximity, trading UI) route over direct
 * peer connections rather than round-tripping through the central server.
 *
 * Design:
 *   - `registerPeer(peerId, position)` — announce a peer to the mesh.
 *   - `updatePosition(peerId, position)` — update position; auto-join or
 *     leave mesh groups based on proximity radius.
 *   - `sendLocal(from, payload)` — fan-out to all peers in the same group.
 *   - `removePeer(peerId)` — peer disconnected; dissolve empty groups.
 *   - `getMeshGroups()` — current snapshot of all active groups.
 *   - `getStats()` — counters for monitoring.
 *
 * Thread: steel/selvage/p2p-mesh
 * Tier: 1
 */

// ── Types ──────────────────────────────────────────────────────────────

export type PeerId = string;
export type GroupId = string;

export interface PeerPosition {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface PeerRecord {
  readonly peerId: PeerId;
  readonly position: PeerPosition;
  readonly groupId: GroupId | undefined;
  readonly registeredAt: number;
}

export interface MeshGroup {
  readonly groupId: GroupId;
  readonly peers: readonly PeerId[];
  readonly createdAt: number;
}

export interface LocalMessage {
  readonly from: PeerId;
  readonly groupId: GroupId;
  readonly payload: unknown;
  readonly sentAt: number;
}

export interface P2pMeshStats {
  readonly peersTotal: number;
  readonly activeGroups: number;
  readonly messagesSent: number;
  readonly groupsMerged: number;
}

// ── Config ─────────────────────────────────────────────────────────────

export interface MeshConfig {
  /** Maximum distance (world units) to be in the same mesh group */
  readonly proximityRadius: number;
  /** Maximum group size; excess peers spill into adjacent groups */
  readonly maxGroupSize: number;
}

export const DEFAULT_MESH_CONFIG: MeshConfig = Object.freeze({
  proximityRadius: 50,
  maxGroupSize: 16,
});

// ── Ports ──────────────────────────────────────────────────────────────

export interface MeshClockPort { readonly nowMs: () => number; }
export interface MeshIdPort { readonly next: () => string; }
export interface MeshLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
}
export interface MeshDeliverPort {
  readonly deliver: (message: LocalMessage, recipientId: PeerId) => void;
}

export interface P2pMeshDeps {
  readonly clock: MeshClockPort;
  readonly id: MeshIdPort;
  readonly log: MeshLogPort;
  readonly deliver: MeshDeliverPort;
  readonly config?: Partial<MeshConfig>;
}

// ── Public interface ───────────────────────────────────────────────────

export interface P2pMesh {
  readonly registerPeer: (peerId: PeerId, position: PeerPosition) => PeerRecord;
  readonly updatePosition: (peerId: PeerId, position: PeerPosition) => void;
  readonly removePeer: (peerId: PeerId) => void;
  readonly sendLocal: (from: PeerId, payload: unknown) => LocalMessage | undefined;
  readonly getPeer: (peerId: PeerId) => PeerRecord | undefined;
  readonly getMeshGroups: () => readonly MeshGroup[];
  readonly getStats: () => P2pMeshStats;
}

// ── Helpers ────────────────────────────────────────────────────────────

function distance(a: PeerPosition, b: PeerPosition): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function resolveConfig(partial?: Partial<MeshConfig>): MeshConfig {
  return Object.freeze({ ...DEFAULT_MESH_CONFIG, ...partial });
}

function findGroupForPeer(
  groups: Map<GroupId, MeshGroup>,
  peers: Map<PeerId, PeerRecord>,
  pos: PeerPosition,
  cfg: MeshConfig,
): GroupId | undefined {
  for (const [groupId, group] of groups.entries()) {
    if (group.peers.length >= cfg.maxGroupSize) continue;
    const anyNear = group.peers.some((pid) => {
      const p = peers.get(pid);
      return p !== undefined && distance(p.position, pos) <= cfg.proximityRadius;
    });
    if (anyNear) return groupId;
  }
  return undefined;
}

// ── Internal state ─────────────────────────────────────────────────────

interface Internals {
  peers: Map<PeerId, PeerRecord>;
  groups: Map<GroupId, MeshGroup>;
  messagesSent: number;
  groupsMerged: number;
}

// ── Handler factories ──────────────────────────────────────────────────

function makeRegister(state: Internals, deps: P2pMeshDeps, cfg: MeshConfig) {
  return function registerPeer(peerId: PeerId, position: PeerPosition): PeerRecord {
    const now = deps.clock.nowMs();
    const groupId = findGroupForPeer(state.groups, state.peers, position, cfg);
    const record: PeerRecord = Object.freeze({ peerId, position, groupId, registeredAt: now });
    state.peers.set(peerId, record);

    if (groupId !== undefined) {
      const g = state.groups.get(groupId);
      if (g !== undefined) state.groups.set(groupId, Object.freeze({ ...g, peers: [...g.peers, peerId] }));
    } else {
      const newId = deps.id.next();
      state.groups.set(newId, Object.freeze({ groupId: newId, peers: [peerId], createdAt: now }));
      state.peers.set(peerId, Object.freeze({ ...record, groupId: newId }));
    }
    return state.peers.get(peerId) as PeerRecord;
  };
}

function makeUpdatePosition(state: Internals, deps: P2pMeshDeps, cfg: MeshConfig) {
  return function updatePosition(peerId: PeerId, position: PeerPosition): void {
    const existing = state.peers.get(peerId);
    if (existing === undefined) return;

    const newGroupId = findGroupForPeer(state.groups, state.peers, position, cfg);
    const same = newGroupId === existing.groupId;
    if (!same && existing.groupId !== undefined) {
      const old = state.groups.get(existing.groupId);
      if (old !== undefined) {
        const updated = old.peers.filter((p) => p !== peerId);
        if (updated.length === 0) {
          state.groups.delete(existing.groupId);
        } else {
          state.groups.set(existing.groupId, Object.freeze({ ...old, peers: updated }));
        }
      }
    }
    state.peers.set(peerId, Object.freeze({ ...existing, position, groupId: newGroupId ?? existing.groupId }));
    if (newGroupId !== undefined && !same) {
      const g = state.groups.get(newGroupId);
      if (g !== undefined) state.groups.set(newGroupId, Object.freeze({ ...g, peers: [...g.peers, peerId] }));
    }
    deps.log.info('Peer position updated', { peerId });
  };
}

function makeRemove(state: Internals) {
  return function removePeer(peerId: PeerId): void {
    const rec = state.peers.get(peerId);
    if (rec === undefined) return;
    if (rec.groupId !== undefined) {
      const g = state.groups.get(rec.groupId);
      if (g !== undefined) {
        const remaining = g.peers.filter((p) => p !== peerId);
        if (remaining.length === 0) {
          state.groups.delete(rec.groupId);
        } else {
          state.groups.set(rec.groupId, Object.freeze({ ...g, peers: remaining }));
        }
      }
    }
    state.peers.delete(peerId);
  };
}

function makeSendLocal(state: Internals, deps: P2pMeshDeps) {
  return function sendLocal(from: PeerId, payload: unknown): LocalMessage | undefined {
    const rec = state.peers.get(from);
    if (rec?.groupId === undefined) return undefined;
    const group = state.groups.get(rec.groupId);
    if (group === undefined) return undefined;
    const msg: LocalMessage = Object.freeze({ from, groupId: rec.groupId, payload, sentAt: deps.clock.nowMs() });
    for (const pid of group.peers) {
      if (pid !== from) deps.deliver.deliver(msg, pid);
    }
    state.messagesSent++;
    return msg;
  };
}

// ── Factory ────────────────────────────────────────────────────────────

export function createP2pMesh(deps: P2pMeshDeps): P2pMesh {
  const cfg = resolveConfig(deps.config);
  const state: Internals = { peers: new Map(), groups: new Map(), messagesSent: 0, groupsMerged: 0 };

  return Object.freeze({
    registerPeer: makeRegister(state, deps, cfg),
    updatePosition: makeUpdatePosition(state, deps, cfg),
    removePeer: makeRemove(state),
    sendLocal: makeSendLocal(state, deps),
    getPeer: (peerId: PeerId) => state.peers.get(peerId),
    getMeshGroups: () => Object.freeze([...state.groups.values()]),
    getStats: () => Object.freeze({
      peersTotal: state.peers.size,
      activeGroups: state.groups.size,
      messagesSent: state.messagesSent,
      groupsMerged: state.groupsMerged,
    }),
  });
}
