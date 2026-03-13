import { describe, expect, it } from 'vitest';
import { createNakamaOrchestrator } from '../nakama-orchestrator.js';

describe('nakama-orchestrator simulation', () => {
  it('simulates multi-tick world activity and integrity drift', () => {
    const presenceRecords: Array<{ dynastyId: string; worldId: string }> = [
      { dynastyId: 'a', worldId: 'earth' },
      { dynastyId: 'b', worldId: 'earth' },
    ];
    const worlds = new Map<string, number>([
      ['earth', 90],
      ['mars', 75],
    ]);

    const orch = createNakamaOrchestrator({
      presence: {
        sweepIdle: () => 0,
        listInWorld: (worldId: string) => presenceRecords.filter((p) => p.worldId === worldId),
        getStats: () => ({ onlineCount: presenceRecords.length, idleCount: 0 }),
      },
      continuity: {
        tick: () => ({ transitions: [], auctionsCreated: 0, auctionsCompleted: 0, chronicleEntries: 0 }),
      },
      lattice: {
        listWorlds: () => [...worlds.keys()],
        getIntegrity: (worldId: string) => worlds.get(worldId) ?? 0,
        restore: (worldId: string, amount: number) => {
          const prev = worlds.get(worldId) ?? 0;
          const next = Math.min(100, prev + amount);
          worlds.set(worldId, next);
          return { worldId, previousIntegrity: prev, newIntegrity: next };
        },
        degrade: (worldId: string, amount: number) => {
          const prev = worlds.get(worldId) ?? 0;
          const next = Math.max(0, prev - amount);
          worlds.set(worldId, next);
          return { worldId, previousIntegrity: prev, newIntegrity: next };
        },
      },
      chronicle: { append: () => 'chr-1' },
      clock: { nowMicroseconds: () => 1_000_000 },
    });

    orch.tick();
    const second = orch.tick();

    expect(second.tickNumber).toBe(2);
    expect(orch.getWorldActivity().find((w) => w.worldId === 'earth')?.activePlayers).toBe(2);
    expect(worlds.get('earth')).toBeGreaterThan(90);
    expect(worlds.get('mars')).toBeLessThan(75);
  });
});
