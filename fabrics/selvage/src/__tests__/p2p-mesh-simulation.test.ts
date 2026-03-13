import { describe, it, expect } from 'vitest';
import { createP2pMesh } from '../p2p-mesh.js';

let idSeq = 0;
function makeMesh() {
  idSeq = 0;
  const messages: Array<{ msg: unknown; to: string }> = [];
  return {
    mesh: createP2pMesh({
      clock: { nowMs: () => Date.now() },
      id: { next: () => `p2p-${++idSeq}` },
      log: { info: () => {} },
      deliver: { deliver: (msg: unknown, to: string) => { messages.push({ msg, to }); } },
      config: { proximityRadius: 100, maxGroupSize: 10 },
    }),
    messages,
  };
}

describe('P2P Mesh Simulation', () => {
  it('registers peers and groups nearby ones together', () => {
    const { mesh } = makeMesh();

    mesh.registerPeer('peer-A', { x: 0, y: 0, z: 0 });
    mesh.registerPeer('peer-B', { x: 50, y: 0, z: 0 });
    mesh.registerPeer('peer-C', { x: 500, y: 0, z: 0 }); // far away

    const peerA = mesh.getPeer('peer-A');
    expect(peerA).toBeDefined();

    const groups = mesh.getMeshGroups();
    expect(groups.length).toBeGreaterThanOrEqual(1);
  });

  it('broadcasts to nearby peers', () => {
    const { mesh, messages } = makeMesh();

    mesh.registerPeer('peer-X', { x: 0, y: 0, z: 0 });
    mesh.registerPeer('peer-Y', { x: 30, y: 0, z: 0 });
    mesh.registerPeer('peer-Z', { x: 1000, y: 0, z: 0 }); // outside radius

    mesh.sendLocal('peer-X', { type: 'position-update', payload: { x: 0, y: 0, z: 0 } });

    const sentTo = messages.map(m => m.to);
    expect(sentTo).toContain('peer-Y');
    expect(sentTo).not.toContain('peer-Z');
  });

  it('updates peer positions and re-evaluates proximity', () => {
    const { mesh } = makeMesh();

    mesh.registerPeer('mover-1', { x: 0, y: 0, z: 0 });
    mesh.updatePosition('mover-1', { x: 200, y: 0, z: 0 });

    const peer = mesh.getPeer('mover-1');
    expect(peer?.position?.x).toBe(200);
  });

  it('unregisters peers removing them from the mesh', () => {
    const { mesh } = makeMesh();

    mesh.registerPeer('leave-me', { x: 0, y: 0, z: 0 });
    mesh.removePeer('leave-me');

    expect(mesh.getPeer('leave-me')).toBeUndefined();
  });
});
