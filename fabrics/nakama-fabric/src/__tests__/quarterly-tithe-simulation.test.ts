import { describe, expect, it } from 'vitest';
import { WEALTH_ZONE_PPM } from '../wealth-zones.js';
import { kalonToMicro } from '../kalon-constants.js';
import { TITHE_RATES, createQuarterlyTitheEngine } from '../quarterly-tithe.js';
import type { QuarterlyTitheDeps } from '../quarterly-tithe.js';

describe('quarterly-tithe simulation', () => {
  const totalSupply = kalonToMicro(1_000_000_000n);
  const threshold = (totalSupply * WEALTH_ZONE_PPM.prosperityMax) / WEALTH_ZONE_PPM.scale;

  const setup = () => {
    const balances = new Map<string, bigint>();
    let cycle = 0;

    const deps: QuarterlyTitheDeps = {
      ledger: {
        getBalance: (id) => balances.get(id) ?? 0n,
        transfer: (from, to, amount) => {
          balances.set(from, (balances.get(from) ?? 0n) - amount);
          balances.set(to, (balances.get(to) ?? 0n) + amount);
        },
      },
      dynastyPort: {
        getActiveDynastyAccounts: () => [...balances.keys()].filter((id) => id !== 'commons:global'),
      },
      supplyPort: { getTotalSupply: () => totalSupply },
      clock: { nowMicroseconds: () => 1_000_000 },
      idGen: { generate: () => `cycle-${++cycle}` },
    };

    return { balances, deps };
  };

  it('simulates quarterly collection from mixed-wealth dynasties', () => {
    const { balances, deps } = setup();
    balances.set('commons:global', 0n);
    balances.set('dyn-rich', threshold + kalonToMicro(50_000n));
    balances.set('dyn-mid', threshold + kalonToMicro(10_000n));
    balances.set('dyn-low', kalonToMicro(500n));

    const engine = createQuarterlyTitheEngine(deps);
    const cycle = engine.collectForWorld('earth', 'commons:global');

    expect(cycle.dynastiesAssessed).toBe(2);
    expect(cycle.dynastiesExempt).toBe(1);
    expect(cycle.totalCollected).toBeGreaterThan(0n);
    expect(balances.get('commons:global')!).toBe(cycle.totalCollected);
  });

  it('simulates architect rate escalation and increased burden on prosperity surplus', () => {
    const { deps } = setup();
    const engine = createQuarterlyTitheEngine(deps);
    const holdings = threshold + kalonToMicro(20_000n);

    const base = engine.assess('dyn-1', holdings, totalSupply).titheOwed;
    engine.setArchitectRate(TITHE_RATES.maximum);
    const escalated = engine.assess('dyn-1', holdings, totalSupply).titheOwed;

    expect(escalated > base).toBe(true);
  });

  it('simulates zero-supply era with no taxable output', () => {
    const { deps } = setup();
    const engine = createQuarterlyTitheEngine(deps);

    const assessment = engine.assess('dyn-1', kalonToMicro(99_000n), 0n);
    expect(assessment.titheableAmount).toBe(0n);
    expect(assessment.titheOwed).toBe(0n);
  });
});
