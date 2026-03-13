import { describe, expect, it } from 'vitest';
import { createMortalityConnectAdapter } from '../mortality-connect-adapter.js';

describe('mortality-connect-adapter simulation', () => {
  it('simulates login recovery plus disconnect propagation through lifecycle hooks', () => {
    const disconnected: string[] = [];
    const adapter = createMortalityConnectAdapter({
      mortality: {
        recordLogin: (dynastyId) => ({ dynastyId, from: 'dormant_7', to: 'active' }),
      },
      connectionResolver: {
        getDynastyForConnection: () => 'dynasty-a',
      },
      presence: {
        disconnect: (dynastyId) => {
          disconnected.push(dynastyId);
        },
      },
    });

    adapter.lifecycle.onConnect('dynasty-a', 'earth');
    adapter.lifecycle.onDisconnect('conn-1');
    const stats = adapter.getStats();

    expect(stats.loginsRecorded).toBe(1);
    expect(stats.loginsRecovered).toBe(1);
    expect(disconnected).toEqual(['dynasty-a']);
  });
});
