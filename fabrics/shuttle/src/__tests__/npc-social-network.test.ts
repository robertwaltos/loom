import { describe, it, expect, beforeEach } from 'vitest';
import { createNpcSocialNetworkSystem } from '../npc-social-network.js';
import type { NpcSocialNetworkDeps, NpcSocialNetworkSystem } from '../npc-social-network.js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createMockDeps(): NpcSocialNetworkDeps {
  let time = 1_000_000n;
  let counter = 0;
  return {
    clock: {
      now: () => {
        time = time + 1000n;
        return time;
      },
    },
    idGen: { generate: () => 'conn-' + String(++counter) },
    logger: { info: () => undefined, error: () => undefined },
  };
}

// ============================================================================
// TESTS: REGISTRATION
// ============================================================================

describe('NpcSocialNetwork - Registration', () => {
  let sys: NpcSocialNetworkSystem;

  beforeEach(() => {
    sys = createNpcSocialNetworkSystem(createMockDeps());
  });

  it('should register a new NPC successfully', () => {
    const result = sys.registerNpc('npc-1');
    expect(result.success).toBe(true);
  });

  it('should return already-registered for duplicate NPC', () => {
    sys.registerNpc('npc-1');
    const result = sys.registerNpc('npc-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('already-registered');
  });

  it('should allow multiple distinct NPCs', () => {
    const r1 = sys.registerNpc('npc-1');
    const r2 = sys.registerNpc('npc-2');
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
  });
});

// ============================================================================
// TESTS: CONNECT / DISCONNECT
// ============================================================================

describe('NpcSocialNetwork - Connect & Disconnect', () => {
  let sys: NpcSocialNetworkSystem;

  beforeEach(() => {
    sys = createNpcSocialNetworkSystem(createMockDeps());
    sys.registerNpc('npc-1');
    sys.registerNpc('npc-2');
    sys.registerNpc('npc-3');
  });

  it('should connect two registered NPCs', () => {
    const result = sys.connect('npc-1', 'npc-2', 'WEAK');
    if (typeof result === 'string') throw new Error('expected connection');
    expect(result.strength).toBe('WEAK');
    expect(result.interactionCount).toBe(0);
  });

  it('should return self-connection error when connecting NPC to itself', () => {
    const result = sys.connect('npc-1', 'npc-1', 'WEAK');
    expect(result).toBe('self-connection');
  });

  it('should return npc-not-found when connecting unregistered NPC', () => {
    const result = sys.connect('npc-1', 'ghost', 'WEAK');
    expect(result).toBe('npc-not-found');
  });

  it('should return already-connected for duplicate connection', () => {
    sys.connect('npc-1', 'npc-2', 'WEAK');
    const result = sys.connect('npc-1', 'npc-2', 'STRONG');
    expect(result).toBe('already-connected');
  });

  it('should retrieve connection symmetrically (A,B) === (B,A)', () => {
    sys.connect('npc-1', 'npc-2', 'MODERATE');
    const ab = sys.getConnection('npc-1', 'npc-2');
    const ba = sys.getConnection('npc-2', 'npc-1');
    expect(ab).toBeDefined();
    expect(ba).toBeDefined();
    expect(ab?.connectionId).toBe(ba?.connectionId);
  });

  it('should disconnect two connected NPCs', () => {
    sys.connect('npc-1', 'npc-2', 'WEAK');
    const result = sys.disconnect('npc-1', 'npc-2');
    expect(result.success).toBe(true);
    expect(sys.getConnection('npc-1', 'npc-2')).toBeUndefined();
  });

  it('should return not-connected when disconnecting unlinked NPCs', () => {
    const result = sys.disconnect('npc-1', 'npc-2');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('not-connected');
  });
});

// ============================================================================
// TESTS: RECORD INTERACTION & STRENGTH UPGRADES
// ============================================================================

describe('NpcSocialNetwork - Record Interaction', () => {
  let sys: NpcSocialNetworkSystem;

  beforeEach(() => {
    sys = createNpcSocialNetworkSystem(createMockDeps());
    sys.registerNpc('npc-1');
    sys.registerNpc('npc-2');
    sys.connect('npc-1', 'npc-2', 'WEAK');
  });

  it('should increment interaction count', () => {
    sys.recordInteraction('npc-1', 'npc-2');
    const conn = sys.getConnection('npc-1', 'npc-2');
    expect(conn?.interactionCount).toBe(1);
  });

  it('should upgrade WEAK to MODERATE at 5 interactions', () => {
    for (let i = 0; i < 5; i++) sys.recordInteraction('npc-1', 'npc-2');
    const result = sys.recordInteraction('npc-1', 'npc-2');
    if (!result.success) throw new Error('expected success');
    // 6 interactions should still be MODERATE (>= 5)
    expect(result.newStrength).toBe('MODERATE');
  });

  it('should upgrade MODERATE to STRONG at 15 interactions', () => {
    for (let i = 0; i < 15; i++) sys.recordInteraction('npc-1', 'npc-2');
    const conn = sys.getConnection('npc-1', 'npc-2');
    expect(conn?.strength).toBe('STRONG');
  });

  it('should upgrade STRONG to BOND at 30 interactions', () => {
    for (let i = 0; i < 30; i++) sys.recordInteraction('npc-1', 'npc-2');
    const conn = sys.getConnection('npc-1', 'npc-2');
    expect(conn?.strength).toBe('BOND');
  });

  it('should return not-connected for unlinked pair', () => {
    sys.registerNpc('npc-3');
    const result = sys.recordInteraction('npc-1', 'npc-3');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('not-connected');
  });
});

// ============================================================================
// TESTS: COMPUTE INFLUENCE
// ============================================================================

describe('NpcSocialNetwork - Compute Influence', () => {
  let sys: NpcSocialNetworkSystem;

  beforeEach(() => {
    sys = createNpcSocialNetworkSystem(createMockDeps());
    ['npc-1', 'npc-2', 'npc-3', 'npc-4'].forEach((id) => sys.registerNpc(id));
  });

  it('should return npc-not-found for unregistered NPC', () => {
    const result = sys.computeInfluence('ghost', 2);
    expect(result).toBe('npc-not-found');
  });

  it('should compute direct connections at hop 1', () => {
    sys.connect('npc-1', 'npc-2', 'WEAK');
    sys.connect('npc-1', 'npc-3', 'WEAK');
    const result = sys.computeInfluence('npc-1', 1);
    if (typeof result === 'string') throw new Error('expected result');
    expect(result.directConnections).toBe(2);
    expect(result.indirectConnections).toBe(0);
    expect(result.reachCount).toBe(2);
  });

  it('should compute indirect connections at hop 2', () => {
    sys.connect('npc-1', 'npc-2', 'WEAK');
    sys.connect('npc-2', 'npc-3', 'WEAK');
    const result = sys.computeInfluence('npc-1', 2);
    if (typeof result === 'string') throw new Error('expected result');
    expect(result.directConnections).toBe(1);
    expect(result.indirectConnections).toBe(1);
    expect(result.reachCount).toBe(2);
  });

  it('should respect maxHops limit', () => {
    sys.connect('npc-1', 'npc-2', 'WEAK');
    sys.connect('npc-2', 'npc-3', 'WEAK');
    sys.connect('npc-3', 'npc-4', 'WEAK');
    const result = sys.computeInfluence('npc-1', 1);
    if (typeof result === 'string') throw new Error('expected result');
    expect(result.directConnections).toBe(1);
    expect(result.indirectConnections).toBe(0);
  });

  it('should return zero reach for isolated NPC', () => {
    const result = sys.computeInfluence('npc-1', 3);
    if (typeof result === 'string') throw new Error('expected result');
    expect(result.reachCount).toBe(0);
  });
});

// ============================================================================
// TESTS: DETECT CLUSTERS
// ============================================================================

describe('NpcSocialNetwork - Detect Clusters', () => {
  let sys: NpcSocialNetworkSystem;

  beforeEach(() => {
    sys = createNpcSocialNetworkSystem(createMockDeps());
    ['a', 'b', 'c', 'd', 'e'].forEach((id) => sys.registerNpc(id));
  });

  it('should detect a cluster of connected NPCs', () => {
    sys.connect('a', 'b', 'WEAK');
    sys.connect('b', 'c', 'WEAK');
    const clusters = sys.detectClusters(2);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.memberIds).toContain('a');
    expect(clusters[0]?.memberIds).toContain('b');
    expect(clusters[0]?.memberIds).toContain('c');
  });

  it('should compute cluster density correctly for fully connected group', () => {
    sys.connect('a', 'b', 'WEAK');
    sys.connect('b', 'c', 'WEAK');
    sys.connect('a', 'c', 'WEAK');
    const clusters = sys.detectClusters(3);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.density).toBeCloseTo(1.0);
  });

  it('should exclude clusters below minSize', () => {
    sys.connect('a', 'b', 'WEAK');
    const clusters = sys.detectClusters(3);
    expect(clusters).toHaveLength(0);
  });

  it('should detect separate disconnected clusters', () => {
    sys.connect('a', 'b', 'WEAK');
    sys.connect('c', 'd', 'WEAK');
    const clusters = sys.detectClusters(2);
    expect(clusters).toHaveLength(2);
  });
});

// ============================================================================
// TESTS: STATS
// ============================================================================

describe('NpcSocialNetwork - Stats', () => {
  it('should report zero stats on empty system', () => {
    const sys = createNpcSocialNetworkSystem(createMockDeps());
    const stats = sys.getStats();
    expect(stats.totalNpcs).toBe(0);
    expect(stats.totalConnections).toBe(0);
    expect(stats.averageConnectionsPerNpc).toBe(0);
    expect(stats.strongBondCount).toBe(0);
  });

  it('should count NPCs, connections, and average connections', () => {
    const sys = createNpcSocialNetworkSystem(createMockDeps());
    sys.registerNpc('a');
    sys.registerNpc('b');
    sys.registerNpc('c');
    sys.connect('a', 'b', 'WEAK');
    sys.connect('b', 'c', 'WEAK');
    const stats = sys.getStats();
    expect(stats.totalNpcs).toBe(3);
    expect(stats.totalConnections).toBe(2);
    // 2 connections * 2 / 3 NPCs = 4/3 ≈ 1.33
    expect(stats.averageConnectionsPerNpc).toBeCloseTo(4 / 3);
  });

  it('should count BOND connections in strongBondCount', () => {
    const sys = createNpcSocialNetworkSystem(createMockDeps());
    sys.registerNpc('a');
    sys.registerNpc('b');
    sys.connect('a', 'b', 'BOND');
    const stats = sys.getStats();
    expect(stats.strongBondCount).toBe(1);
  });

  it('should get all connections for a specific NPC', () => {
    const sys = createNpcSocialNetworkSystem(createMockDeps());
    sys.registerNpc('a');
    sys.registerNpc('b');
    sys.registerNpc('c');
    sys.connect('a', 'b', 'WEAK');
    sys.connect('a', 'c', 'STRONG');
    const conns = sys.getConnectionsForNpc('a');
    expect(conns).toHaveLength(2);
  });
});
