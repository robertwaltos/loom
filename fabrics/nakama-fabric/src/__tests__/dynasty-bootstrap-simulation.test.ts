import { describe, expect, it } from 'vitest';
import { createDynastyBootstrapService } from '../dynasty-bootstrap.js';
import { createDynastyRegistry } from '../dynasty.js';
import { createContinuityEngine } from '../dynasty-continuity.js';
import { createMarksRegistry } from '../marks-registry.js';
import { kalonToMicro } from '../kalon-constants.js';

describe('dynasty bootstrap simulation', () => {
  it('simulates mixed eligibility onboarding wave', () => {
    let markId = 0;
    let chronicleId = 0;
    const accounts = new Map<string, bigint>();

    const depsBase = {
      clock: { nowMicroseconds: () => 1_000_000 },
      dynastyRegistry: createDynastyRegistry({ clock: { nowMicroseconds: () => 1_000_000 } }),
      continuityEngine: createContinuityEngine({ clock: { nowMicroseconds: () => 1_000_000 } }),
      kalonLedger: {
        createAccount: (id: string) => accounts.set(id, 0n),
        mint: (id: string, amount: bigint) => accounts.set(id, (accounts.get(id) ?? 0n) + amount),
      },
      genesisVault: { allocateNewDynasty: () => 500n },
      chronicle: {
        append: () => {
          chronicleId += 1;
          return 'chronicle-' + String(chronicleId);
        },
      },
      marksRegistry: createMarksRegistry({
        idGenerator: { next: () => 'mark-' + String(++markId) },
        clock: { nowMicroseconds: () => 1_000_000 },
      }),
      kalonToMicro,
    };

    const eligible = createDynastyBootstrapService({
      ...depsBase,
      foundingEligibility: { isEligible: () => true },
    });
    const ineligible = createDynastyBootstrapService({
      ...depsBase,
      foundingEligibility: { isEligible: () => false },
    });

    const first = eligible.foundDynasty({ dynastyId: 'b1', name: 'Founders', homeWorldId: 'earth' });
    const second = ineligible.foundDynasty({ dynastyId: 'b2', name: 'Settlers', homeWorldId: 'mars' });

    expect(first.foundingMark?.markType).toBe('FOUNDING');
    expect(second.foundingMark).toBeNull();
    expect(accounts.get(first.kalonAccountId)).toBe(kalonToMicro(500n));
    expect(accounts.get(second.kalonAccountId)).toBe(kalonToMicro(500n));
  });
});
