import { describe, it, expect, vi } from 'vitest';
import {
  createNetworkConditionSim,
  PROFILE_PERFECT,
  PROFILE_BROADBAND,
  PROFILE_4G,
  PROFILE_3G,
  PROFILE_SATELLITE,
  PROFILE_BAD,
} from '../network-condition-sim.js';

describe('network-condition-sim', () => {
  describe('presets', () => {
    it('PROFILE_PERFECT has 0 loss rate and delay', () => {
      expect(PROFILE_PERFECT.lossRate).toBe(0);
      expect(PROFILE_PERFECT.delayMs).toBe(0);
    });

    it('PROFILE_BAD has high loss rate', () => {
      expect(PROFILE_BAD.lossRate).toBeGreaterThan(0.1);
    });

    it('PROFILE_SATELLITE has >500ms delay', () => {
      expect(PROFILE_SATELLITE.delayMs).toBeGreaterThanOrEqual(500);
    });

    it('all 6 profiles are exported with names', () => {
      const names = [
        PROFILE_PERFECT, PROFILE_BROADBAND, PROFILE_4G,
        PROFILE_3G, PROFILE_SATELLITE, PROFILE_BAD,
      ].map((p) => p.name);
      expect(names).toEqual(['perfect', 'broadband', '4g', '3g', 'satellite', 'bad']);
    });
  });

  describe('createNetworkConditionSim — perfect profile', () => {
    it('delivers packets immediately with zero delay', () => {
      let t = 0;
      const sim = createNetworkConditionSim<string>(PROFILE_PERFECT, {
        clock: () => t,
        random: () => 0.5,
      });
      const pkts = sim.send('hello');
      expect(pkts).toHaveLength(1);
      t = 1;
      const delivered = sim.tick();
      expect(delivered).toHaveLength(1);
      expect(delivered[0]!.payload).toBe('hello');
    });

    it('has no drops with perfect profile (loss=0)', () => {
      let t = 0;
      const sim = createNetworkConditionSim<number>(PROFILE_PERFECT, {
        clock: () => t,
        random: () => 0.5,
      });
      for (let i = 0; i < 50; i++) sim.send(i);
      expect(sim.getStats().dropped).toBe(0);
    });
  });

  describe('createNetworkConditionSim — forced loss', () => {
    it('drops packet when random < lossRate', () => {
      const profile = { ...PROFILE_4G, lossRate: 0.9 };
      const sim = createNetworkConditionSim<string>(profile, {
        clock: () => 0,
        random: () => 0.05,  // 0.05 < 0.9 → drop
      });
      const pkts = sim.send('data');
      expect(pkts).toHaveLength(0);
      expect(sim.getStats().dropped).toBe(1);
    });

    it('delivers packet when random >= lossRate', () => {
      const profile = { ...PROFILE_4G, lossRate: 0.1 };
      const sim = createNetworkConditionSim<string>(profile, {
        clock: () => 0,
        random: () => 0.5,  // 0.5 >= 0.1 → keep
      });
      const pkts = sim.send('data');
      expect(pkts).toHaveLength(1);
      expect(pkts[0]!.dropped).toBe(false);
    });
  });

  describe('createNetworkConditionSim — duplication', () => {
    it('returns 2 packets when random falls in duplication window', () => {
      // random sequence: first call (lossRate check) >> 0.5, second call (dupRate) << 0.001
      let callCount = 0;
      const sim = createNetworkConditionSim<string>(PROFILE_BROADBAND, {
        clock: () => 0,
        random: () => {
          callCount++;
          if (callCount === 1) return 0.5;  // not lost
          if (callCount === 2) return 0.00001;  // duplicated (< 0.0001)
          return 0.5;
        },
      });
      const pkts = sim.send('dup-me');
      expect(pkts).toHaveLength(2);
      expect(pkts[1]!.duplicated).toBe(true);
    });
  });

  describe('tick()', () => {
    it('removes packets from pending when delivered', () => {
      let t = 0;
      const profile = { ...PROFILE_PERFECT, delayMs: 100 };
      const sim = createNetworkConditionSim<number>(profile, {
        clock: () => t,
        random: () => 0.5,
      });
      sim.send(1);
      // Before delay passes — nothing delivered
      const before = sim.tick();
      expect(before).toHaveLength(0);
      // After delay passes
      t = 200;
      const after = sim.tick();
      expect(after).toHaveLength(1);
      // Second tick — queue is empty
      const empty = sim.tick();
      expect(empty).toHaveLength(0);
    });
  });

  describe('getDeliveredPackets()', () => {
    it('returns delivered packets without removing them', () => {
      let t = 0;
      const profile = { ...PROFILE_PERFECT, delayMs: 50 };
      const sim = createNetworkConditionSim<string>(profile, {
        clock: () => t,
        random: () => 0.5,
      });
      sim.send('test');
      t = 200;
      const delivered = sim.getDeliveredPackets();
      expect(delivered).toHaveLength(1);
    });
  });

  describe('getStats()', () => {
    it('tracks sent count correctly', () => {
      const sim = createNetworkConditionSim<string>(PROFILE_PERFECT, {
        clock: () => 0,
        random: () => 0.5,
      });
      sim.send('a');
      sim.send('b');
      sim.send('c');
      expect(sim.getStats().sent).toBe(3);
    });

    it('effectiveLossRate is 0 when no packets sent', () => {
      const sim = createNetworkConditionSim<string>(PROFILE_PERFECT);
      expect(sim.getStats().effectiveLossRate).toBe(0);
    });

    it('avgDelayMs is 0 when no packets delivered', () => {
      const sim = createNetworkConditionSim<string>(PROFILE_PERFECT);
      expect(sim.getStats().avgDelayMs).toBe(0);
    });
  });

  describe('setProfile()', () => {
    it('hot-swaps to a new profile mid-sim', () => {
      const sim = createNetworkConditionSim<string>(PROFILE_PERFECT, {
        clock: () => 0,
        random: () => 0.05, // < BAD lossRate (0.15) → will drop after swap
      });
      sim.setProfile(PROFILE_BAD);
      const pkts = sim.send('after-swap');
      expect(pkts).toHaveLength(0);
      expect(sim.getStats().dropped).toBe(1);
    });
  });
});
