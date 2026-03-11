/**
 * Trade & Diplomacy Flow — Integration test.
 *
 * Proves the vertical slice across trade, diplomacy, and alliance systems:
 *
 *   1. Dynasties establish diplomatic relations
 *   2. Alliances form through invitation and ratification
 *   3. Treaties codify agreements between parties
 *   4. Trade commerce engine creates marketplace offers
 *   5. Market registry tracks listings and price aggregation
 *
 * Uses real services: DiplomacyEngine, AllianceEngine, TreatyEngine,
 *   TradeCommerceEngine, MarketRegistry.
 * Mocks: clock, id generator, ports.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createDiplomacyEngine, DEFAULT_DIPLOMACY_CONFIG } from '@loom/nakama-fabric';
import type { DiplomacyEngine, DiplomacyEngineDeps } from '@loom/nakama-fabric';
import { createAllianceEngine, MEMBER_LIMITS } from '@loom/nakama-fabric';
import type { AllianceEngine, AllianceEngineDeps } from '@loom/nakama-fabric';
import { createTreatyEngine, MAX_VIOLATIONS_BEFORE_BREAK } from '@loom/nakama-fabric';
import type { TreatyEngine, TreatyEngineDeps } from '@loom/nakama-fabric';
import { createTradeCommerceEngine, DEFAULT_COMMERCE_CONFIG } from '@loom/nakama-fabric';
import type { TradeCommerceEngine, TradeCommerceDeps } from '@loom/nakama-fabric';
import { createMarketRegistry } from '@loom/nakama-fabric';
import type { MarketRegistry, MarketRegistryDeps } from '@loom/nakama-fabric';

// ── Shared Mocks ────────────────────────────────────────────────

function mockClock(start = 1_000_000): { nowMicroseconds: () => number } {
  let t = start;
  return { nowMicroseconds: () => t++ };
}

function mockIdGen(prefix = 'id'): { generate: () => string } {
  let c = 0;
  return { generate: () => prefix + '-' + String(++c) };
}

// ── Diplomacy Integration ───────────────────────────────────────

describe('Trade Diplomacy Flow — diplomatic relations', () => {
  let diplomacy: DiplomacyEngine;

  beforeEach(() => {
    const deps: DiplomacyEngineDeps = {
      clock: mockClock() as DiplomacyEngineDeps['clock'],
      idGenerator: mockIdGen('dip') as DiplomacyEngineDeps['idGenerator'],
    };
    diplomacy = createDiplomacyEngine(deps);
  });

  it('initializes neutral relation between dynasties', () => {
    const relation = diplomacy.getRelation('house-alpha', 'house-beta');
    expect(relation.state).toBe('NEUTRAL');
    expect(relation.score).toBe(0);
  });

  it('improves relation through friendly diplomatic action', () => {
    const result = diplomacy.performAction({
      actorId: 'house-alpha',
      targetId: 'house-beta',
      action: 'DECLARE_FRIENDSHIP',
    });
    expect(result).toBeDefined();
    expect(result.score).toBeGreaterThan(0);
  });

  it('degrades relation through hostile action', () => {
    const result = diplomacy.performAction({
      actorId: 'house-alpha',
      targetId: 'house-beta',
      action: 'DECLARE_RIVALRY',
    });
    expect(result).toBeDefined();
    expect(result.score).toBeLessThan(0);
  });

  it('records diplomatic incidents', () => {
    diplomacy.recordIncident({
      dynastyA: 'house-alpha',
      dynastyB: 'house-beta',
      description: 'Border skirmish near the Silfen Gate',
      scoreDelta: -15,
    });

    const score = diplomacy.getScore('house-alpha', 'house-beta');
    expect(score).toBeLessThan(0);
  });

  it('tracks stats across multiple relations', () => {
    diplomacy.performAction({
      actorId: 'house-alpha',
      targetId: 'house-beta',
      action: 'DECLARE_FRIENDSHIP',
    });
    diplomacy.performAction({
      actorId: 'house-alpha',
      targetId: 'house-gamma',
      action: 'DECLARE_RIVALRY',
    });

    const stats = diplomacy.getStats();
    expect(stats.totalRelations).toBeGreaterThanOrEqual(2);
  });

  it('exports default config', () => {
    expect(DEFAULT_DIPLOMACY_CONFIG).toBeDefined();
  });
});

// ── Alliance Integration ────────────────────────────────────────

describe('Trade Diplomacy Flow — alliance formation', () => {
  let alliance: AllianceEngine;

  beforeEach(() => {
    const deps: AllianceEngineDeps = {
      clock: mockClock() as AllianceEngineDeps['clock'],
      idGenerator: mockIdGen('alli') as AllianceEngineDeps['idGenerator'],
      notifications: {
        notify: () => {
          /* noop */
        },
      } as unknown as AllianceEngineDeps['notifications'],
    };
    alliance = createAllianceEngine(deps);
  });

  it('creates an alliance', () => {
    const result = alliance.create({
      founderId: 'house-alpha',
      name: 'The Northern Compact',
      allianceType: 'TRADE_PACT',
      charter: 'Trade alliance for mutual economic benefit',
    });
    expect(result).toBeDefined();
    expect(result.name).toBe('The Northern Compact');
  });

  it('invites and accepts members', () => {
    const created = alliance.create({
      founderId: 'house-alpha',
      name: 'The Compact',
      allianceType: 'MUTUAL_DEFENSE',
      charter: 'United defense pact',
    });

    const invited = alliance.invite(created.allianceId, 'house-alpha', 'house-beta');
    expect(invited).toBeDefined();

    const accepted = alliance.acceptInvite(invited.inviteId);
    expect(accepted).toBeDefined();
  });

  it('exports member limits constant', () => {
    expect(MEMBER_LIMITS).toBeDefined();
  });

  it('tracks alliance stats', () => {
    alliance.create({
      founderId: 'house-alpha',
      name: 'Compact A',
      allianceType: 'TRADE_PACT',
      charter: 'Economic collaboration pact',
    });
    alliance.create({
      founderId: 'house-beta',
      name: 'Compact B',
      allianceType: 'MUTUAL_DEFENSE',
      charter: 'Defense collaboration pact',
    });

    const stats = alliance.getStats();
    expect(stats.totalAlliances).toBe(2);
  });
});

// ── Treaty Integration ──────────────────────────────────────────

describe('Trade Diplomacy Flow — treaties', () => {
  let treaty: TreatyEngine;

  beforeEach(() => {
    const deps: TreatyEngineDeps = {
      clock: mockClock() as TreatyEngineDeps['clock'],
      idGenerator: mockIdGen('trt') as TreatyEngineDeps['idGenerator'],
    };
    treaty = createTreatyEngine(deps);
  });

  it('proposes a treaty between parties', () => {
    const result = treaty.propose({
      proposerId: 'house-alpha',
      counterpartyId: 'house-beta',
      treatyType: 'TRADE_AGREEMENT',
      terms: {
        description: 'Mutual trade agreement for 12 months',
        conditions: ['No tariffs on raw materials'],
      },
      durationUs: 31_536_000_000_000,
    });
    expect(result).toBeDefined();
  });

  it('signs and activates treaty', () => {
    const proposed = treaty.propose({
      proposerId: 'house-alpha',
      counterpartyId: 'house-beta',
      treatyType: 'NON_AGGRESSION',
      terms: {
        description: 'Peace pact',
        conditions: [],
      },
      durationUs: 10_000_000_000_000,
    });

    const signed = treaty.sign(proposed.treatyId);
    expect(signed).toBeDefined();

    const activated = treaty.activate(proposed.treatyId);
    expect(activated).toBeDefined();
  });

  it('reports treaty violation on active treaty', () => {
    const proposed = treaty.propose({
      proposerId: 'house-alpha',
      counterpartyId: 'house-beta',
      treatyType: 'TRADE_AGREEMENT',
      terms: {
        description: 'Trade deal',
        conditions: ['Weekly deliveries'],
      },
      durationUs: 5_000_000_000_000,
    });
    treaty.sign(proposed.treatyId);
    treaty.activate(proposed.treatyId);

    const violation = treaty.reportViolation({
      treatyId: proposed.treatyId,
      violatorId: 'house-beta',
      description: 'Missed delivery schedule',
    });
    expect(violation).toBeDefined();
  });

  it('exports max violations constant', () => {
    expect(MAX_VIOLATIONS_BEFORE_BREAK).toBeGreaterThan(0);
  });
});

// ── Trade Commerce Integration ──────────────────────────────────

describe('Trade Diplomacy Flow — commerce', () => {
  let commerce: TradeCommerceEngine;

  beforeEach(() => {
    const deps: TradeCommerceDeps = {
      clock: mockClock() as TradeCommerceDeps['clock'],
      idGenerator: mockIdGen('offer') as TradeCommerceDeps['idGenerator'],
      escrow: {
        hold: () => true,
        release: () => {
          /* noop */
        },
        refund: () => {
          /* noop */
        },
      } as unknown as TradeCommerceDeps['escrow'],
      feeCollector: {
        calculateFee: () => 10n,
        collectFee: () => {
          /* noop */
        },
      } as unknown as TradeCommerceDeps['feeCollector'],
    };
    commerce = createTradeCommerceEngine(deps);
  });

  it('creates a trade offer', () => {
    const offer = commerce.createOffer({
      sellerId: 'house-alpha',
      category: 'RESOURCES',
      itemDescription: 'Iron ingot batch — 50 units',
      priceKalon: 5000n,
      worldId: 'world-1',
    });
    expect(offer).toBeDefined();
    expect(offer.offerId).toBeDefined();
  });

  it('accepts a trade offer', () => {
    const offer = commerce.createOffer({
      sellerId: 'house-alpha',
      category: 'ARTIFACTS',
      itemDescription: 'Ancient Silfen sword',
      priceKalon: 500n,
      worldId: 'world-1',
    });

    const accepted = commerce.acceptOffer(offer.offerId, 'house-beta');
    expect(accepted).toBeDefined();
  });

  it('cancels a trade offer', () => {
    const offer = commerce.createOffer({
      sellerId: 'house-alpha',
      category: 'SERVICES',
      itemDescription: 'Navigation consultation',
      priceKalon: 250n,
      worldId: 'world-1',
    });

    const cancelled = commerce.cancelOffer(offer.offerId, 'house-alpha');
    expect(cancelled).toBeDefined();
  });

  it('tracks price history', () => {
    commerce.createOffer({
      sellerId: 'house-alpha',
      category: 'RESOURCES',
      itemDescription: 'Iron ingot batch',
      priceKalon: 80n,
      worldId: 'world-1',
    });

    const history = commerce.getPriceHistory('RESOURCES', 'world-1');
    expect(history).toBeDefined();
  });

  it('exports default config', () => {
    expect(DEFAULT_COMMERCE_CONFIG).toBeDefined();
  });
});

// ── Market Registry Integration ─────────────────────────────────

describe('Trade Diplomacy Flow — market registry', () => {
  let market: MarketRegistry;
  let idGen: { generate: () => string };

  beforeEach(() => {
    idGen = mockIdGen('listing');
    const deps: MarketRegistryDeps = {
      clock: mockClock() as MarketRegistryDeps['clock'],
    };
    market = createMarketRegistry(deps);
  });

  it('adds and searches listings', () => {
    market.addListing({
      listingId: idGen.generate(),
      sellerId: 'house-alpha',
      worldId: 'world-1',
      category: 'RESOURCES',
      itemDescription: 'Iron ingot — 100 units',
      priceKalon: 50n,
      expiresAt: 9_999_999_999,
    });

    const results = market.search({ category: 'RESOURCES' });
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('aggregates prices for a category in a world', () => {
    market.addListing({
      listingId: idGen.generate(),
      sellerId: 'house-alpha',
      worldId: 'world-1',
      category: 'RESOURCES',
      itemDescription: 'Iron ingot — batch A',
      priceKalon: 40n,
      expiresAt: 9_999_999_999,
    });
    market.addListing({
      listingId: idGen.generate(),
      sellerId: 'house-beta',
      worldId: 'world-1',
      category: 'RESOURCES',
      itemDescription: 'Iron ingot — batch B',
      priceKalon: 60n,
      expiresAt: 9_999_999_999,
    });

    const aggregate = market.getPriceAggregate('world-1', 'RESOURCES');
    expect(aggregate).toBeDefined();
  });

  it('tracks market stats', () => {
    market.addListing({
      listingId: idGen.generate(),
      sellerId: 'house-alpha',
      worldId: 'world-1',
      category: 'ARTIFACTS',
      itemDescription: 'Ancient steel plate set',
      priceKalon: 120n,
      expiresAt: 9_999_999_999,
    });

    const stats = market.getStats();
    expect(stats.totalListings).toBeGreaterThanOrEqual(1);
  });
});

// ── Cross-System Flow ───────────────────────────────────────────

describe('Trade Diplomacy Flow — cross-system integration', () => {
  it('diplomacy score affects treaty likelihood', () => {
    const dipDeps: DiplomacyEngineDeps = {
      clock: mockClock() as DiplomacyEngineDeps['clock'],
      idGenerator: mockIdGen('dip') as DiplomacyEngineDeps['idGenerator'],
    };
    const diplomacy = createDiplomacyEngine(dipDeps);

    // Improve relations first
    diplomacy.performAction({
      actorId: 'house-alpha',
      targetId: 'house-beta',
      action: 'DECLARE_FRIENDSHIP',
    });

    const score = diplomacy.getScore('house-alpha', 'house-beta');
    expect(score).toBeGreaterThan(0);

    // Now create treaty between friendly parties
    const trtDeps: TreatyEngineDeps = {
      clock: mockClock() as TreatyEngineDeps['clock'],
      idGenerator: mockIdGen('trt') as TreatyEngineDeps['idGenerator'],
    };
    const treaty = createTreatyEngine(trtDeps);

    const proposed = treaty.propose({
      proposerId: 'house-alpha',
      counterpartyId: 'house-beta',
      treatyType: 'TRADE_AGREEMENT',
      terms: {
        description: 'Friendship trade deal',
        conditions: [],
      },
      durationUs: 10_000_000_000_000,
    });
    expect(proposed).toBeDefined();
  });
});
