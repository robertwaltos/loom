import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateEstateValuation,
  getMinimumBid,
  buildChronicleSealing,
  startExtinctionFlow,
  applyEstateValuation,
  openAuction,
  closeAuction,
  sealChronicle,
  finalizeExtinction,
  AUCTION_WINDOW_MS,
  ESTATE_BASE_VALUE_MICRO,
  KALON_PER_WORLD_HOLDING,
  KALON_PER_CHRONICLE_ENTRY,
  KALON_PER_SEALED_CHAMBER_CONNECTION,
  AUCTION_MIN_BID_MICRO,
  FAILED_AUCTION_OUTCOME,
  type EstateValuation,
  type ExtinctionFlowRecord,
  type ChronicleSealing,
} from '../dynasty-extinction-flow.js';

describe('dynasty-extinction-flow', () => {
  describe('constants', () => {
    it('AUCTION_WINDOW_MS equals 7 days', () => {
      expect(AUCTION_WINDOW_MS).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('ESTATE_BASE_VALUE_MICRO has values for tiers 2, 3, 4', () => {
      expect(ESTATE_BASE_VALUE_MICRO[2]).toBe(500_000_000_000n);
      expect(ESTATE_BASE_VALUE_MICRO[3]).toBe(50_000_000_000n);
      expect(ESTATE_BASE_VALUE_MICRO[4]).toBe(5_000_000_000_000n);
    });

    it('AUCTION_MIN_BID_MICRO has values for tiers 2, 3, 4', () => {
      expect(AUCTION_MIN_BID_MICRO[2]).toBe(500_000_000_000n);
      expect(AUCTION_MIN_BID_MICRO[3]).toBe(50_000_000_000n);
      expect(AUCTION_MIN_BID_MICRO[4]).toBe(5_000_000_000_000n);
    });

    it('FAILED_AUCTION_OUTCOME is a non-empty string', () => {
      expect(FAILED_AUCTION_OUTCOME.length).toBeGreaterThan(0);
    });
  });

  describe('calculateEstateValuation', () => {
    it('computes base value only when counts are zero', () => {
      const val = calculateEstateValuation(1, 'Test', 3, 0, 0, 0);
      expect(val.totalValueMicro).toBe(ESTATE_BASE_VALUE_MICRO[3]);
      expect(val.worldHoldingValueMicro).toBe(0n);
      expect(val.chronicleEntryValueMicro).toBe(0n);
      expect(val.sealedChamberValueMicro).toBe(0n);
    });

    it('adds world holding value correctly', () => {
      const val = calculateEstateValuation(1, 'Test', 3, 5, 0, 0);
      expect(val.worldHoldingValueMicro).toBe(5n * KALON_PER_WORLD_HOLDING);
    });

    it('adds chronicle entry value correctly', () => {
      const val = calculateEstateValuation(1, 'Test', 3, 0, 10, 0);
      expect(val.chronicleEntryValueMicro).toBe(10n * KALON_PER_CHRONICLE_ENTRY);
    });

    it('adds sealed chamber value correctly', () => {
      const val = calculateEstateValuation(1, 'Test', 3, 0, 0, 2);
      expect(val.sealedChamberValueMicro).toBe(2n * KALON_PER_SEALED_CHAMBER_CONNECTION);
    });

    it('sums all components into totalValueMicro', () => {
      const val = calculateEstateValuation(1, 'Test', 2, 3, 7, 1);
      const expected =
        ESTATE_BASE_VALUE_MICRO[2] +
        3n * KALON_PER_WORLD_HOLDING +
        7n * KALON_PER_CHRONICLE_ENTRY +
        1n * KALON_PER_SEALED_CHAMBER_CONNECTION;
      expect(val.totalValueMicro).toBe(expected);
    });

    it('preserves characterId and displayName', () => {
      const val = calculateEstateValuation(42, 'Elder Olabisi', 2, 0, 0, 0);
      expect(val.characterId).toBe(42);
      expect(val.displayName).toBe('Elder Olabisi');
      expect(val.tier).toBe(2);
    });

    it('preserves count fields', () => {
      const val = calculateEstateValuation(1, 'Test', 3, 4, 8, 2);
      expect(val.worldCount).toBe(4);
      expect(val.chronicleEntryCount).toBe(8);
      expect(val.sealedChamberConnectionCount).toBe(2);
    });
  });

  describe('getMinimumBid', () => {
    it('returns correct bid for tier 2', () => {
      expect(getMinimumBid(2)).toBe(500_000_000_000n);
    });

    it('returns correct bid for tier 3', () => {
      expect(getMinimumBid(3)).toBe(50_000_000_000n);
    });

    it('returns correct bid for tier 4', () => {
      expect(getMinimumBid(4)).toBe(5_000_000_000_000n);
    });
  });

  describe('buildChronicleSealing', () => {
    it('creates sealing with correct fields', () => {
      const seal = buildChronicleSealing(1, 'Elder Test', 310, 50, '2300-01-01T00:00:00Z');
      expect(seal.characterId).toBe(1);
      expect(seal.displayName).toBe('Elder Test');
      expect(seal.entryCount).toBe(50);
      expect(seal.sealedAt).toBe('2300-01-01T00:00:00Z');
      expect(seal.permanentlyPreserved).toBe(true);
    });

    it('formats sealTag with name and year', () => {
      const seal = buildChronicleSealing(1, 'Elder Olabisi', 310, 10, '2300-01-01T00:00:00Z');
      expect(seal.sealTag).toContain('Elder Olabisi');
      expect(seal.sealTag).toContain('310');
    });
  });

  describe('startExtinctionFlow', () => {
    it('creates a flow in VIGIL_COMPLETE state', () => {
      const flow = startExtinctionFlow('flow-1', 100, 'Elder Test', '2300-01-01T00:00:00Z');
      expect(flow.flowId).toBe('flow-1');
      expect(flow.characterId).toBe(100);
      expect(flow.displayName).toBe('Elder Test');
      expect(flow.state).toBe('VIGIL_COMPLETE');
      expect(flow.startedAt).toBe('2300-01-01T00:00:00Z');
    });

    it('initializes all nullable fields to null', () => {
      const flow = startExtinctionFlow('f', 1, 'T', '2300-01-01T00:00:00Z');
      expect(flow.estateValuation).toBeNull();
      expect(flow.auctionOpensAt).toBeNull();
      expect(flow.auctionClosesAt).toBeNull();
      expect(flow.winnerId).toBeNull();
      expect(flow.winningBidMicro).toBeNull();
      expect(flow.chronicleSealedAt).toBeNull();
      expect(flow.extinctionfinalizedAt).toBeNull();
    });

    it('initializes marksAwardedToVigilDynasty to false', () => {
      const flow = startExtinctionFlow('f', 1, 'T', '2300-01-01T00:00:00Z');
      expect(flow.marksAwardedToVigilDynasty).toBe(false);
    });
  });

  describe('applyEstateValuation', () => {
    it('transitions to ESTATE_VALUATION and attaches valuation', () => {
      const flow = startExtinctionFlow('f', 1, 'T', '2300-01-01T00:00:00Z');
      const val = calculateEstateValuation(1, 'T', 3, 2, 5, 0);
      const updated = applyEstateValuation(flow, val, '2300-02-01T00:00:00Z');
      expect(updated.state).toBe('ESTATE_VALUATION');
      expect(updated.estateValuation).not.toBeNull();
      if (updated.estateValuation) {
        expect(updated.estateValuation.totalValueMicro).toBeGreaterThan(0n);
      }
    });
  });

  describe('openAuction', () => {
    it('transitions to AUCTION_OPEN and sets close time', () => {
      const flow = startExtinctionFlow('f', 1, 'T', '2300-01-01T00:00:00Z');
      const now = '2300-03-01T00:00:00Z';
      const updated = openAuction(flow, now);
      expect(updated.state).toBe('AUCTION_OPEN');
      expect(updated.auctionOpensAt).toBe(now);
      expect(updated.auctionClosesAt).not.toBeNull();
    });

    it('sets auctionClosesAt to 7 days after now', () => {
      const now = '2300-03-01T00:00:00Z';
      const flow = startExtinctionFlow('f', 1, 'T', '2300-01-01T00:00:00Z');
      const updated = openAuction(flow, now);
      const expected = new Date(new Date(now).getTime() + AUCTION_WINDOW_MS).toISOString();
      expect(updated.auctionClosesAt).toBe(expected);
    });
  });

  describe('closeAuction', () => {
    it('transitions to AUCTION_CLOSED with winner', () => {
      const flow = startExtinctionFlow('f', 1, 'T', '2300-01-01T00:00:00Z');
      const closed = closeAuction(flow, 'dynasty-5', 100_000_000_000n, '2300-04-01T00:00:00Z');
      expect(closed.state).toBe('AUCTION_CLOSED');
      expect(closed.winnerId).toBe('dynasty-5');
      expect(closed.winningBidMicro).toBe(100_000_000_000n);
    });

    it('transitions to AUCTION_CLOSED with null winner for no bids', () => {
      const flow = startExtinctionFlow('f', 1, 'T', '2300-01-01T00:00:00Z');
      const closed = closeAuction(flow, null, null, '2300-04-01T00:00:00Z');
      expect(closed.state).toBe('AUCTION_CLOSED');
      expect(closed.winnerId).toBeNull();
      expect(closed.winningBidMicro).toBeNull();
    });
  });

  describe('sealChronicle', () => {
    it('transitions to CHRONICLE_SEALED and sets timestamp', () => {
      const flow = startExtinctionFlow('f', 1, 'T', '2300-01-01T00:00:00Z');
      const now = '2300-05-01T00:00:00Z';
      const sealed = sealChronicle(flow, now);
      expect(sealed.state).toBe('CHRONICLE_SEALED');
      expect(sealed.chronicleSealedAt).toBe(now);
    });
  });

  describe('finalizeExtinction', () => {
    it('transitions to DYNASTY_EXTINCT', () => {
      const flow = startExtinctionFlow('f', 1, 'T', '2300-01-01T00:00:00Z');
      const now = '2300-06-01T00:00:00Z';
      const extinct = finalizeExtinction(flow, true, now);
      expect(extinct.state).toBe('DYNASTY_EXTINCT');
      expect(extinct.extinctionfinalizedAt).toBe(now);
      expect(extinct.marksAwardedToVigilDynasty).toBe(true);
    });

    it('sets marksAwardedToVigilDynasty to false when specified', () => {
      const flow = startExtinctionFlow('f', 1, 'T', '2300-01-01T00:00:00Z');
      const extinct = finalizeExtinction(flow, false, '2300-06-01T00:00:00Z');
      expect(extinct.marksAwardedToVigilDynasty).toBe(false);
    });
  });

  describe('full flow integration', () => {
    it('progresses through all states', () => {
      let flow = startExtinctionFlow('flow-1', 42, 'Elder Olabisi', '2300-01-01T00:00:00Z');
      expect(flow.state).toBe('VIGIL_COMPLETE');

      const val = calculateEstateValuation(42, 'Elder Olabisi', 2, 3, 10, 1);
      flow = applyEstateValuation(flow, val, '2300-02-01T00:00:00Z');
      expect(flow.state).toBe('ESTATE_VALUATION');

      flow = openAuction(flow, '2300-03-01T00:00:00Z');
      expect(flow.state).toBe('AUCTION_OPEN');

      flow = closeAuction(flow, 'dynasty-7', 600_000_000_000n, '2300-03-08T00:00:00Z');
      expect(flow.state).toBe('AUCTION_CLOSED');

      flow = sealChronicle(flow, '2300-04-01T00:00:00Z');
      expect(flow.state).toBe('CHRONICLE_SEALED');

      flow = finalizeExtinction(flow, true, '2300-05-01T00:00:00Z');
      expect(flow.state).toBe('DYNASTY_EXTINCT');
      expect(flow.marksAwardedToVigilDynasty).toBe(true);
    });
  });
});
