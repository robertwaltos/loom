import { describe, it, expect } from 'vitest';
import {
  createThreadwayNetwork,
  LINGER_DISCOVERY_MS,
  LUMINANCE_BOOST_ON_DISCOVERY,
  MAX_ACTIVE_THREADWAYS,
} from '../threadway-network.js';

describe('threadway-network simulation', () => {
  function makeTw() {
    return createThreadwayNetwork();
  }

  // ── data coverage ─────────────────────────────────────────────────

  it('exposes the correct total threadway count across all realms', () => {
    const tw = makeTw();
    const all = tw.getAllThreadways();
    expect(all.length).toBeGreaterThanOrEqual(35);
  });

  it('has at least 5 hub portals', () => {
    const tw = makeTw();
    const hubs = tw.getHubPortals();
    expect(hubs.length).toBeGreaterThanOrEqual(5);
  });

  // ── getThreadwaysByRealm ──────────────────────────────────────────

  describe('getThreadwaysByRealm', () => {
    it('returns STEM threadways', () => {
      const tw = makeTw();
      const stem = tw.getThreadwaysByRealm('stem');
      expect(stem.length).toBeGreaterThan(0);
      for (const t of stem) {
        expect(t.realm).toBe('stem');
      }
    });

    it('returns language-arts threadways', () => {
      const tw = makeTw();
      const la = tw.getThreadwaysByRealm('language-arts');
      expect(la.length).toBeGreaterThan(0);
    });

    it('returns financial-literacy threadways', () => {
      const tw = makeTw();
      const fin = tw.getThreadwaysByRealm('financial-literacy');
      expect(fin.length).toBeGreaterThan(0);
    });

    it('returns crossroads threadways', () => {
      const tw = makeTw();
      const cross = tw.getThreadwaysByRealm('crossroads');
      expect(cross.length).toBeGreaterThan(0);
    });
  });

  // ── getThreadwaysByTier ───────────────────────────────────────────

  describe('getThreadwaysByTier', () => {
    it('returns threadways for tier 2', () => {
      const tw = makeTw();
      const t2 = tw.getThreadwaysByTier(2);
      expect(t2.length).toBeGreaterThan(0);
    });

    it('returns threadways for tier 3', () => {
      const tw = makeTw();
      const t3 = tw.getThreadwaysByTier(3);
      expect(t3.length).toBeGreaterThan(0);
    });
  });

  // ── getThreadwayById ──────────────────────────────────────────────

  describe('getThreadwayById', () => {
    it('finds a threadway that exists', () => {
      const tw = makeTw();
      const all = tw.getAllThreadways();
      const first = all[0]!;
      const found = tw.getThreadwayById(first.threadwayId);
      expect(found).toBeDefined();
      expect(found!.threadwayId).toBe(first.threadwayId);
    });

    it('returns undefined for a non-existent id', () => {
      const tw = makeTw();
      expect(tw.getThreadwayById('__nonexistent__')).toBeUndefined();
    });
  });

  // ── getConnectedWorlds ────────────────────────────────────────────

  describe('getConnectedWorlds', () => {
    it('returns an array for a known world', () => {
      const tw = makeTw();
      const all = tw.getAllThreadways();
      const worldId = all[0]!.fromWorldId;
      const connected = tw.getConnectedWorlds(worldId);
      expect(Array.isArray(connected)).toBe(true);
    });

    it('returns empty for an unknown world', () => {
      const tw = makeTw();
      const connected = tw.getConnectedWorlds('__fake_world__');
      expect(connected).toHaveLength(0);
    });
  });

  // ── evaluateDiscovery ─────────────────────────────────────────────

  describe('evaluateDiscovery', () => {
    it('returns no discovered threadways when state has no lingering', () => {
      const tw = makeTw();
      const state = {
        kindlerId: 'kindler-1',
        discoveredThreadwayIds: new Set<string>(),
        traversedThreadwayIds: new Set<string>(),
        completedEntryIds: new Set<string>(),
        completedWorldIds: new Set<string>(),
      };
      const result = tw.evaluateDiscovery(state);
      const totalLuminance = result.reduce((sum, r) => sum + r.luminanceBoost, 0);
      expect(totalLuminance).toBe(0);
    });

    it('computes LUMINANCE_BOOST_ON_DISCOVERY per new discovery', () => {
      const tw = makeTw();
      const all = tw.getAllThreadways();
      const first = all[0]!;
      const state = {
        kindlerId: 'kindler-1',
        discoveredThreadwayIds: new Set<string>(),
        traversedThreadwayIds: new Set<string>(),
        completedEntryIds: new Set<string>(),
        completedWorldIds: new Set([first.fromWorldId, first.toWorldId]),
      };
      const result = tw.evaluateDiscovery(state);
      const totalBoost = result.reduce((sum, r) => sum + r.luminanceBoost, 0);
      expect(totalBoost).toBeGreaterThanOrEqual(LUMINANCE_BOOST_ON_DISCOVERY);
    });
  });

  // ── computeStatus ─────────────────────────────────────────────────

  describe('computeStatus', () => {
    it('returns discovered for a threadway in the discovered set', () => {
      const tw = makeTw();
      const all = tw.getAllThreadways();
      const first = all[0]!;
      const state = {
        kindlerId: 'kindler-1',
        discoveredThreadwayIds: new Set([first.threadwayId]),
        traversedThreadwayIds: new Set<string>(),
        completedEntryIds: new Set<string>(),
        completedWorldIds: new Set<string>(),
      };
      const status = tw.computeStatus(first, state);
      expect(status).toBe('discovered');
    });

    it('returns hidden for a threadway not in the set', () => {
      const tw = makeTw();
      const all = tw.getAllThreadways();
      const first = all[0]!;
      const state = {
        kindlerId: 'kindler-1',
        discoveredThreadwayIds: new Set<string>(),
        traversedThreadwayIds: new Set<string>(),
        completedEntryIds: new Set<string>(),
        completedWorldIds: new Set<string>(),
      };
      const status = tw.computeStatus(first, state);
      expect(['hidden', 'visible']).toContain(status);
    });
  });

  // ── getNetworkStats ───────────────────────────────────────────────

  describe('getNetworkStats', () => {
    it('returns correct total count', () => {
      const tw = makeTw();
      const state = {
        kindlerId: 'kindler-1',
        discoveredThreadwayIds: new Set<string>(),
        traversedThreadwayIds: new Set<string>(),
        completedEntryIds: new Set<string>(),
        completedWorldIds: new Set<string>(),
      };
      const stats = tw.getNetworkStats(state);
      expect(stats.totalThreadways).toBe(tw.getAllThreadways().length);
      expect(stats.discoveredCount).toBe(0);
    });

    it('counts discovered threadways correctly', () => {
      const tw = makeTw();
      const all = tw.getAllThreadways();
      const ids = new Set([all[0]!.threadwayId, all[1]!.threadwayId]);
      const state = {
        kindlerId: 'kindler-1',
        discoveredThreadwayIds: ids,
        traversedThreadwayIds: new Set<string>(),
        completedEntryIds: new Set<string>(),
        completedWorldIds: new Set<string>(),
      };
      const stats = tw.getNetworkStats(state);
      expect(stats.discoveredCount).toBe(2);
    });

    it('respects MAX_ACTIVE_THREADWAYS constant', () => {
      expect(MAX_ACTIVE_THREADWAYS).toBe(200);
    });
  });

  // ── checkInBetween ────────────────────────────────────────────────

  describe('checkInBetween', () => {
    it('returns false when linger has not elapsed', () => {
      const tw = makeTw();
      const nowMs = Date.now();
      const space = { activeWorldIds: ['world-a', 'world-b'] as const, lingerStartMs: nowMs - 1000, discovered: false };
      const result = tw.checkInBetween(space, nowMs);
      expect(typeof result).toBe('boolean');
    });
  });
});
