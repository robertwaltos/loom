import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDynastyEspionage } from '../dynasty-espionage.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('dynasty espionage simulation', () => {
  it('simulates mission pipeline with a successful and blown operation', () => {
    let id = 0;
    const module = createDynastyEspionage({
      clock: { nowMicroseconds: () => 1_000_000n },
      idGen: { generate: () => 'id-' + String(id++) },
      logger: { info: () => {}, warn: () => {} },
    });

    module.setCounterLevel({ dynastyId: 'target', worldId: 'earth', level: 'EXTREME' });

    const a1 = module.plantAgent({ dynastyId: 'source', worldId: 'earth', skillLevel: 95, coverIdentity: 'merchant' });
    const a2 = module.plantAgent({ dynastyId: 'source', worldId: 'earth', skillLevel: 10, coverIdentity: 'scribe' });

    vi.spyOn(Math, 'random').mockReturnValueOnce(0.99).mockReturnValueOnce(0.01);

    const success = module.runMission({
      agentId: a1.agentId,
      missionType: 'GATHER_INTELLIGENCE',
      targetDynastyId: 'target',
    });
    const blown = module.runMission({
      agentId: a2.agentId,
      missionType: 'SABOTAGE',
      targetDynastyId: 'target',
    });

    expect(typeof success).toBe('object');
    expect(typeof blown).toBe('object');
    if (typeof blown === 'object') {
      expect(blown.outcome).toBe('BLOWN');
    }

    const compromised = module.getAgentsByStatus({ dynastyId: 'source', worldId: 'earth', status: 'COMPROMISED' });
    expect(compromised).toHaveLength(1);

    const net = module.getNetworkStatus({ dynastyId: 'source', worldId: 'earth' });
    expect(typeof net).toBe('object');
    if (typeof net === 'object') {
      expect(net.totalMissions).toBe(2);
      expect(net.compromisedAgents).toBe(1);
    }
  });
});
