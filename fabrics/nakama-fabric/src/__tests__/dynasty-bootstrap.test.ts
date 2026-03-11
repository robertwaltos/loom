import { describe, it, expect } from 'vitest';
import { createDynastyBootstrapService } from '../dynasty-bootstrap.js';
import { createDynastyRegistry } from '../dynasty.js';
import { createContinuityEngine } from '../dynasty-continuity.js';
import { createMarksRegistry } from '../marks-registry.js';
import { kalonToMicro } from '../kalon-constants.js';
import type {
  DynastyBootstrapDeps,
  DynastyBootstrapService,
  KalonLedgerPort,
  ChroniclePort,
} from '../dynasty-bootstrap.js';

let idCounter = 0;
let chronicleCounter = 0;

function createMockLedger(): KalonLedgerPort & { accounts: Map<string, bigint> } {
  const accounts = new Map<string, bigint>();
  return {
    accounts,
    createAccount(accountId: string) {
      accounts.set(accountId, 0n);
    },
    mint(accountId: string, amount: bigint) {
      const current = accounts.get(accountId) ?? 0n;
      accounts.set(accountId, current + amount);
    },
  };
}

function createMockChronicle(): ChroniclePort & { entries: string[] } {
  const entries: string[] = [];
  return {
    entries,
    append(_entry) {
      chronicleCounter += 1;
      const id = 'chronicle-' + String(chronicleCounter);
      entries.push(id);
      return id;
    },
  };
}

function createTestDeps(foundingEligible = false): DynastyBootstrapDeps & {
  ledger: ReturnType<typeof createMockLedger>;
  chronicle: ReturnType<typeof createMockChronicle>;
} {
  idCounter = 0;
  chronicleCounter = 0;

  const clock = { nowMicroseconds: () => 1_000_000 };
  const ledger = createMockLedger();
  const chronicle = createMockChronicle();

  return {
    dynastyRegistry: createDynastyRegistry({ clock }),
    continuityEngine: createContinuityEngine({ clock }),
    kalonLedger: ledger,
    genesisVault: { allocateNewDynasty: () => 500n },
    chronicle,
    marksRegistry: createMarksRegistry({
      idGenerator: {
        next() {
          idCounter += 1;
          return 'mark-' + String(idCounter);
        },
      },
      clock,
    }),
    foundingEligibility: { isEligible: () => foundingEligible },
    kalonToMicro,
    ledger,
  };
}

function createBootstrapService(foundingEligible = false): {
  service: DynastyBootstrapService;
  deps: ReturnType<typeof createTestDeps>;
} {
  const deps = createTestDeps(foundingEligible);
  const service = createDynastyBootstrapService(deps);
  return { service, deps };
}

// ─── Basic Bootstrap ───────────────────────────────────────────────

describe('Dynasty bootstrap basics', () => {
  it('creates a dynasty record', () => {
    const { service } = createBootstrapService();
    const result = service.foundDynasty({
      dynastyId: 'dyn-1',
      name: 'House Kaisa',
      homeWorldId: 'earth',
    });
    expect(result.dynasty.dynastyId).toBe('dyn-1');
    expect(result.dynasty.name).toBe('House Kaisa');
    expect(result.dynasty.homeWorldId).toBe('earth');
    expect(result.dynasty.status).toBe('active');
  });

  it('creates KALON account with genesis grant', () => {
    const { service, deps } = createBootstrapService();
    const result = service.foundDynasty({
      dynastyId: 'dyn-1',
      name: 'House Kaisa',
      homeWorldId: 'earth',
    });
    expect(result.genesisGrantKalon).toBe(500n);
    const balance = deps.ledger.accounts.get(result.kalonAccountId);
    expect(balance).toBe(kalonToMicro(500n));
  });

  it('initializes continuity record', () => {
    const { service } = createBootstrapService();
    const result = service.foundDynasty({
      dynastyId: 'dyn-1',
      name: 'House Kaisa',
      homeWorldId: 'earth',
    });
    expect(result.continuityRecord.dynastyId).toBe('dyn-1');
    expect(result.continuityRecord.state).toBe('active');
  });

  it('appends Chronicle birth entry', () => {
    const { service, deps } = createBootstrapService();
    const result = service.foundDynasty({
      dynastyId: 'dyn-1',
      name: 'House Kaisa',
      homeWorldId: 'earth',
    });
    expect(result.chronicleEntryId).toBe('chronicle-1');
    expect(deps.chronicle.entries).toHaveLength(1);
  });
});

// ─── Subscription Tier ─────────────────────────────────────────────

describe('Dynasty bootstrap subscription tier', () => {
  it('defaults to free tier', () => {
    const { service } = createBootstrapService();
    const result = service.foundDynasty({
      dynastyId: 'dyn-1',
      name: 'House Free',
      homeWorldId: 'earth',
    });
    expect(result.dynasty.subscriptionTier).toBe('free');
  });

  it('accepts explicit tier', () => {
    const { service } = createBootstrapService();
    const result = service.foundDynasty({
      dynastyId: 'dyn-1',
      name: 'House Patron',
      homeWorldId: 'earth',
      subscriptionTier: 'patron',
    });
    expect(result.dynasty.subscriptionTier).toBe('patron');
  });
});

// ─── Founding Mark ─────────────────────────────────────────────────

describe('Dynasty bootstrap founding mark', () => {
  it('awards no mark when not eligible', () => {
    const { service } = createBootstrapService(false);
    const result = service.foundDynasty({
      dynastyId: 'dyn-1',
      name: 'House Late',
      homeWorldId: 'earth',
    });
    expect(result.foundingMark).toBeNull();
  });

  it('awards FOUNDING mark when eligible', () => {
    const { service } = createBootstrapService(true);
    const result = service.foundDynasty({
      dynastyId: 'dyn-1',
      name: 'House Pioneer',
      homeWorldId: 'earth',
    });
    expect(result.foundingMark).not.toBeNull();
    expect(result.foundingMark?.markType).toBe('FOUNDING');
    expect(result.foundingMark?.dynastyId).toBe('dyn-1');
  });
});

// ─── Error Cases ───────────────────────────────────────────────────

describe('Dynasty bootstrap errors', () => {
  it('rejects duplicate dynasty ID', () => {
    const { service } = createBootstrapService();
    service.foundDynasty({ dynastyId: 'dyn-1', name: 'First', homeWorldId: 'earth' });
    expect(() =>
      service.foundDynasty({
        dynastyId: 'dyn-1',
        name: 'Duplicate',
        homeWorldId: 'earth',
      }),
    ).toThrow();
  });
});

// ─── Multiple Bootstraps ───────────────────────────────────────────

describe('Dynasty bootstrap multiple dynasties', () => {
  it('bootstraps multiple independent dynasties', () => {
    const { service, deps } = createBootstrapService();
    const r1 = service.foundDynasty({ dynastyId: 'd1', name: 'First', homeWorldId: 'earth' });
    const r2 = service.foundDynasty({ dynastyId: 'd2', name: 'Second', homeWorldId: 'mars' });
    expect(r1.dynasty.dynastyId).toBe('d1');
    expect(r2.dynasty.dynastyId).toBe('d2');
    expect(deps.ledger.accounts.size).toBe(2);
    expect(deps.chronicle.entries).toHaveLength(2);
  });
});
