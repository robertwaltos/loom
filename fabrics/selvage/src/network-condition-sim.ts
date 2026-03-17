/**
 * network-condition-sim.ts — Network Condition Simulation (Phase 17.3)
 *
 * Simulates network conditions including latency, jitter, packet loss, and
 * duplication. Supports preset profiles and hot-swappable profiles. All
 * randomness is injectable for deterministic testing.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type NetworkProfile = {
  name: string;
  delayMs: number;
  jitterMs: number;
  lossRate: number;
  duplicationRate: number;
  bandwidthKbps: number;
};

export type NetworkPacket<T> = {
  packetId: string;
  payload: T;
  sentAt: number;
  deliveredAt?: number;
  dropped: boolean;
  duplicated: boolean;
};

export type NetworkSimStats = {
  sent: number;
  dropped: number;
  duplicated: number;
  avgDelayMs: number;
  effectiveLossRate: number;
};

export type NetworkConditionSimulator<T> = {
  send(payload: T): NetworkPacket<T>[];
  getDeliveredPackets(): NetworkPacket<T>[];
  tick(): NetworkPacket<T>[];
  getStats(): NetworkSimStats;
  setProfile(profile: NetworkProfile): void;
};

// ── Preset Profiles ──────────────────────────────────────────────────────────

export const PROFILE_PERFECT: NetworkProfile = {
  name: 'perfect',
  delayMs: 0,
  jitterMs: 0,
  lossRate: 0,
  duplicationRate: 0,
  bandwidthKbps: 1_000_000,
};

export const PROFILE_BROADBAND: NetworkProfile = {
  name: 'broadband',
  delayMs: 20,
  jitterMs: 5,
  lossRate: 0.001,
  duplicationRate: 0.0001,
  bandwidthKbps: 100_000,
};

export const PROFILE_4G: NetworkProfile = {
  name: '4g',
  delayMs: 50,
  jitterMs: 15,
  lossRate: 0.01,
  duplicationRate: 0.002,
  bandwidthKbps: 20_000,
};

export const PROFILE_3G: NetworkProfile = {
  name: '3g',
  delayMs: 150,
  jitterMs: 30,
  lossRate: 0.03,
  duplicationRate: 0.005,
  bandwidthKbps: 5_000,
};

export const PROFILE_SATELLITE: NetworkProfile = {
  name: 'satellite',
  delayMs: 550,
  jitterMs: 50,
  lossRate: 0.02,
  duplicationRate: 0.003,
  bandwidthKbps: 5_000,
};

export const PROFILE_BAD: NetworkProfile = {
  name: 'bad',
  delayMs: 200,
  jitterMs: 100,
  lossRate: 0.15,
  duplicationRate: 0.01,
  bandwidthKbps: 1_000,
};

// ── State ────────────────────────────────────────────────────────────────────

interface SimState<T> {
  profile: NetworkProfile;
  clock: () => number;
  random: () => number;
  pending: NetworkPacket<T>[];
  sent: number;
  dropped: number;
  duplicated: number;
  totalDelayMs: number;
  physicalPackets: number;
  packetCounter: number;
}

// ── Factory ──────────────────────────────────────────────────────────────────

export function createNetworkConditionSim<T>(
  profile: NetworkProfile,
  opts?: { clock?: () => number; random?: () => number },
): NetworkConditionSimulator<T> {
  const state: SimState<T> = {
    profile,
    clock: opts?.clock ?? (() => Date.now()),
    random: opts?.random ?? (() => Math.random()),
    pending: [],
    sent: 0,
    dropped: 0,
    duplicated: 0,
    totalDelayMs: 0,
    physicalPackets: 0,
    packetCounter: 0,
  };

  function makePacket(
    baseId: string,
    payload: T,
    sentAt: number,
    isDuplicated: boolean,
    copyIndex: number,
  ): NetworkPacket<T> {
    const jitterOffset = (state.random() * 2 - 1) * state.profile.jitterMs;
    const effectiveDelay = Math.max(0, state.profile.delayMs + jitterOffset);
    const deliveredAt = sentAt + effectiveDelay;
    state.totalDelayMs += effectiveDelay;
    state.physicalPackets++;
    return {
      packetId: copyIndex === 0 ? baseId : `${baseId}-dup`,
      payload,
      sentAt,
      deliveredAt,
      dropped: false,
      duplicated: isDuplicated && copyIndex === 1,
    };
  }

  return {
    send(payload: T): NetworkPacket<T>[] {
      state.sent++;
      const sentAt = state.clock();
      const baseId = `pkt-${++state.packetCounter}`;

      if (state.random() < state.profile.lossRate) {
        state.dropped++;
        return [];
      }

      const isDuplicated = state.random() < state.profile.duplicationRate;
      if (isDuplicated) {
        state.duplicated++;
      }

      const count = isDuplicated ? 2 : 1;
      const result: NetworkPacket<T>[] = [];

      for (let i = 0; i < count; i++) {
        const pkt = makePacket(baseId, payload, sentAt, isDuplicated, i);
        state.pending.push(pkt);
        result.push(pkt);
      }

      return result;
    },

    getDeliveredPackets(): NetworkPacket<T>[] {
      const now = state.clock();
      return state.pending.filter(
        (p) => p.deliveredAt !== undefined && p.deliveredAt <= now,
      );
    },

    tick(): NetworkPacket<T>[] {
      const now = state.clock();
      const deliverable: NetworkPacket<T>[] = [];
      const remaining: NetworkPacket<T>[] = [];

      for (const pkt of state.pending) {
        if (pkt.deliveredAt !== undefined && pkt.deliveredAt <= now) {
          deliverable.push(pkt);
        } else {
          remaining.push(pkt);
        }
      }

      state.pending = remaining;
      return deliverable;
    },

    getStats(): NetworkSimStats {
      const avgDelayMs =
        state.physicalPackets > 0 ? state.totalDelayMs / state.physicalPackets : 0;
      const effectiveLossRate = state.sent > 0 ? state.dropped / state.sent : 0;
      return {
        sent: state.sent,
        dropped: state.dropped,
        duplicated: state.duplicated,
        avgDelayMs,
        effectiveLossRate,
      };
    },

    setProfile(newProfile: NetworkProfile): void {
      state.profile = newProfile;
    },
  };
}
