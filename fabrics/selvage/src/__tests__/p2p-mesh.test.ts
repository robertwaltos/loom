import { describe, it, expect, beforeEach } from 'vitest';
import {
  createP2pMesh,
  type P2pMesh,
  type P2pMeshDeps,
  type PeerPosition,
  type LocalMessage,
  type PeerId,
} from '../p2p-mesh.js';

// ── Helpers ───────────────────────────────────────────────────────────

function pos(x: number, y = 0, z = 0): PeerPosition {
  return Object.freeze({ x, y, z });
}

function makeDeps(proximityRadius = 100): P2pMeshDeps & { delivered: Array<{ msg: LocalMessage; to: PeerId }> } {
  let seq = 0;
  const delivered: Array<{ msg: LocalMessage; to: PeerId }> = [];
  return {
    clock: { nowMs: () => 1_000_000 },
    id: { next: () => `grp-${String(++seq)}` },
    log: { info: () => undefined },
    deliver: { deliver: (msg, to) => { delivered.push({ msg, to }); } },
    config: { proximityRadius, maxGroupSize: 16 },
    delivered,
  };
}

// ── registerPeer ──────────────────────────────────────────────────────

describe('registerPeer', () => {
  it('creates a new group for the first peer', () => {
    const deps = makeDeps();
    const mesh = createP2pMesh(deps);
    mesh.registerPeer('peer-A', pos(0));
    expect(mesh.getMeshGroups()).toHaveLength(1);
  });

  it('places a nearby peer in the same group', () => {
    const deps = makeDeps(100);
    const mesh = createP2pMesh(deps);
    mesh.registerPeer('peer-A', pos(0));
    mesh.registerPeer('peer-B', pos(10)); // within 100 units
    expect(mesh.getMeshGroups()).toHaveLength(1);
    expect(mesh.getMeshGroups().at(0)?.peers).toHaveLength(2);
  });

  it('places a far-away peer in a separate group', () => {
    const deps = makeDeps(10);
    const mesh = createP2pMesh(deps);
    mesh.registerPeer('peer-A', pos(0));
    mesh.registerPeer('peer-B', pos(500)); // way beyond radius
    expect(mesh.getMeshGroups()).toHaveLength(2);
  });
});

// ── updatePosition ────────────────────────────────────────────────────

describe('updatePosition', () => {
  let mesh: P2pMesh;
  let deps: ReturnType<typeof makeDeps>;

  beforeEach(() => {
    deps = makeDeps(50);
    mesh = createP2pMesh(deps);
    mesh.registerPeer('peer-A', pos(0));
    mesh.registerPeer('peer-B', pos(200)); // separate group
  });

  it('does nothing for an unregistered peer', () => {
    expect(() => { mesh.updatePosition('no-one', pos(0)); }).not.toThrow();
  });

  it('records the new position', () => {
    mesh.updatePosition('peer-A', pos(5));
    expect(mesh.getPeer('peer-A')?.position.x).toBe(5);
  });
});

// ── removePeer ────────────────────────────────────────────────────────

describe('removePeer', () => {
  it('deletes empty group when last peer leaves', () => {
    const deps = makeDeps();
    const mesh = createP2pMesh(deps);
    mesh.registerPeer('peer-A', pos(0));
    mesh.removePeer('peer-A');
    expect(mesh.getMeshGroups()).toHaveLength(0);
  });

  it('keeps group alive with remaining peers', () => {
    const deps = makeDeps();
    const mesh = createP2pMesh(deps);
    mesh.registerPeer('A', pos(0));
    mesh.registerPeer('B', pos(10));
    mesh.removePeer('A');
    expect(mesh.getMeshGroups()).toHaveLength(1);
    expect(mesh.getMeshGroups().at(0)?.peers).toHaveLength(1);
  });

  it('silently ignores unknown peerId', () => {
    const mesh = createP2pMesh(makeDeps());
    expect(() => { mesh.removePeer('ghost'); }).not.toThrow();
  });
});

// ── sendLocal ─────────────────────────────────────────────────────────

describe('sendLocal', () => {
  it('delivers message to all group peers except sender', () => {
    const deps = makeDeps();
    const mesh = createP2pMesh(deps);
    mesh.registerPeer('A', pos(0));
    mesh.registerPeer('B', pos(10));
    mesh.registerPeer('C', pos(20));
    mesh.sendLocal('A', { type: 'emote', value: 'wave' });
    const recipients = deps.delivered.map((d) => d.to);
    expect(recipients).toContain('B');
    expect(recipients).toContain('C');
    expect(recipients).not.toContain('A');
  });

  it('returns undefined for a peer not in a group', () => {
    const mesh = createP2pMesh(makeDeps());
    const result = mesh.sendLocal('nobody', 'hi');
    expect(result).toBeUndefined();
  });

  it('increments messagesSent counter', () => {
    const deps = makeDeps();
    const mesh = createP2pMesh(deps);
    mesh.registerPeer('A', pos(0));
    mesh.registerPeer('B', pos(5));
    mesh.sendLocal('A', 'ping');
    expect(mesh.getStats().messagesSent).toBe(1);
  });
});

// ── getStats ──────────────────────────────────────────────────────────

describe('getStats', () => {
  it('starts at zeros', () => {
    const s = createP2pMesh(makeDeps()).getStats();
    expect(s.peersTotal).toBe(0);
    expect(s.activeGroups).toBe(0);
    expect(s.messagesSent).toBe(0);
  });

  it('reflects registered peers and groups', () => {
    const deps = makeDeps(10);
    const mesh = createP2pMesh(deps);
    mesh.registerPeer('A', pos(0));
    mesh.registerPeer('B', pos(200));
    const s = mesh.getStats();
    expect(s.peersTotal).toBe(2);
    expect(s.activeGroups).toBe(2);
  });
});
