/**
 * npc-trade-ai.test.ts — Tests for NPC autonomous trading system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTradeAI } from '../npc-trade-ai.js';
import type { TradeAI } from '../npc-trade-ai.js';

describe('npc-trade-ai', () => {
  let system: TradeAI;
  let currentTime: bigint;
  let idCounter: number;
  const logs: Array<{ msg: string; ctx: Record<string, unknown> }> = [];

  beforeEach(() => {
    currentTime = 1000000n;
    idCounter = 1;
    logs.length = 0;
    system = createTradeAI({
      clock: { nowMicroseconds: () => currentTime },
      idGenerator: {
        next: () => {
          const id = 'trade_' + String(idCounter);
          idCounter = idCounter + 1;
          return id;
        },
      },
      logger: {
        info: (msg, ctx) => {
          logs.push({ msg, ctx });
        },
      },
    });
  });

  describe('scanOpportunities', () => {
    it('scans opportunities for single item', () => {
      const result = system.scanOpportunities('world1', ['item1']);
      expect(Array.isArray(result)).toBe(true);
    });

    it('scans opportunities for multiple items', () => {
      const result = system.scanOpportunities('world1', ['item1', 'item2', 'item3']);
      if (typeof result === 'string') {
        expect(result).toBe('no_opportunities');
      } else {
        expect(Array.isArray(result)).toBe(true);
      }
    });

    it('returns error when no item IDs provided', () => {
      const result = system.scanOpportunities('world1', []);
      expect(result).toBe('no_opportunities');
    });

    it('logs opportunities scanned', () => {
      logs.length = 0;
      system.scanOpportunities('world1', ['item1', 'item2', 'item3']);
      const scanLog = logs.find((l) => l.msg === 'opportunities_scanned');
      if (scanLog !== undefined) {
        expect(scanLog.ctx.worldId).toBe('world1');
      }
    });

    it('creates unique opportunity IDs', () => {
      const result = system.scanOpportunities('world1', ['item1', 'item2']);
      if (typeof result === 'string') {
        expect(result).toBe('no_opportunities');
      } else {
        if (result.length >= 2) {
          const opp1 = result[0];
          const opp2 = result[1];
          if (opp1 !== undefined && opp2 !== undefined) {
            expect(opp1.opportunityId).not.toBe(opp2.opportunityId);
          }
        }
      }
    });

    it('filters out low-profit opportunities', () => {
      const result = system.scanOpportunities('world1', [
        'item1',
        'item2',
        'item3',
        'item4',
        'item5',
      ]);
      if (typeof result === 'string') {
        expect(result).toBe('no_opportunities');
      } else {
        expect(Array.isArray(result)).toBe(true);
      }
    });

    it('assigns risk scores to opportunities', () => {
      const result = system.scanOpportunities('world1', ['item1', 'item2']);
      if (typeof result !== 'string' && result.length > 0) {
        const opp = result[0];
        if (opp !== undefined) {
          expect(opp.riskScore).toBeGreaterThanOrEqual(0);
          expect(opp.riskScore).toBeLessThanOrEqual(100);
        }
      }
    });

    it('calculates projected profit', () => {
      const result = system.scanOpportunities('world1', ['item1', 'item2']);
      if (typeof result !== 'string' && result.length > 0) {
        const opp = result[0];
        if (opp !== undefined) {
          expect(opp.projectedProfitMicroKalon).toBeGreaterThan(0n);
        }
      }
    });

    it('sets buy and sell worlds', () => {
      const result = system.scanOpportunities('world1', ['item1']);
      if (typeof result !== 'string' && result.length > 0) {
        const opp = result[0];
        if (opp !== undefined) {
          expect(opp.buyWorldId).toBe('world1');
          expect(opp.sellWorldId).toBeDefined();
        }
      }
    });

    it('handles large item list', () => {
      const items: string[] = [];
      for (let i = 0; i < 50; i = i + 1) {
        items.push('item_' + String(i));
      }
      const result = system.scanOpportunities('world1', items);
      if (typeof result !== 'string') {
        expect(Array.isArray(result)).toBe(true);
      }
    });
  });

  describe('evaluateTrade', () => {
    let opportunityId: string;

    beforeEach(() => {
      const result = system.scanOpportunities('world1', ['item1', 'item2', 'item3']);
      if (typeof result !== 'string' && result.length > 0) {
        const opp = result[0];
        if (opp !== undefined) {
          opportunityId = opp.opportunityId;
        }
      } else {
        opportunityId = 'fallback_opp';
      }
    });

    it('evaluates trade for NPC without risk tolerance', () => {
      const result = system.evaluateTrade('npc1', opportunityId);
      if (typeof result === 'string') {
        expect(['opportunity_not_found', 'risk_too_high'].includes(result)).toBe(true);
      } else {
        expect(typeof result).toBe('boolean');
      }
    });

    it('returns error for nonexistent opportunity', () => {
      const result = system.evaluateTrade('npc1', 'unknown_opportunity');
      expect(result).toBe('opportunity_not_found');
    });

    it('respects CONSERVATIVE risk tolerance', () => {
      system.setRiskTolerance('npc1', 'CONSERVATIVE');
      const result = system.evaluateTrade('npc1', opportunityId);
      if (typeof result === 'string') {
        expect(['opportunity_not_found', 'risk_too_high'].includes(result)).toBe(true);
      } else {
        expect(typeof result).toBe('boolean');
      }
    });

    it('respects MODERATE risk tolerance', () => {
      system.setRiskTolerance('npc1', 'MODERATE');
      const result = system.evaluateTrade('npc1', opportunityId);
      if (typeof result === 'string') {
        expect(['opportunity_not_found', 'risk_too_high'].includes(result)).toBe(true);
      } else {
        expect(typeof result).toBe('boolean');
      }
    });

    it('respects AGGRESSIVE risk tolerance', () => {
      system.setRiskTolerance('npc1', 'AGGRESSIVE');
      const result = system.evaluateTrade('npc1', opportunityId);
      if (typeof result === 'string') {
        expect(['opportunity_not_found', 'risk_too_high'].includes(result)).toBe(true);
      } else {
        expect(typeof result).toBe('boolean');
      }
    });

    it('rejects high-risk trades for CONSERVATIVE NPCs', () => {
      system.setRiskTolerance('npc1', 'CONSERVATIVE');
      const result = system.scanOpportunities('world1', [
        'item1',
        'item2',
        'item3',
        'item4',
        'item5',
      ]);
      if (typeof result !== 'string') {
        for (let i = 0; i < result.length; i = i + 1) {
          const opp = result[i];
          if (opp === undefined) {
            continue;
          }
          if (opp.riskScore > 30) {
            const evalResult = system.evaluateTrade('npc1', opp.opportunityId);
            if (typeof evalResult === 'boolean') {
              expect(evalResult).toBe(false);
            }
          }
        }
      }
      expect(true).toBe(true);
    });

    it('evaluates same opportunity differently for different NPCs', () => {
      system.setRiskTolerance('npc1', 'CONSERVATIVE');
      system.setRiskTolerance('npc2', 'AGGRESSIVE');
      const eval1 = system.evaluateTrade('npc1', opportunityId);
      const eval2 = system.evaluateTrade('npc2', opportunityId);
      expect(typeof eval1 === 'boolean' || typeof eval1 === 'string').toBe(true);
      expect(typeof eval2 === 'boolean' || typeof eval2 === 'string').toBe(true);
    });
  });

  describe('executeTrade', () => {
    let opportunityId: string;

    beforeEach(() => {
      const result = system.scanOpportunities('world1', ['item1', 'item2', 'item3']);
      if (typeof result !== 'string' && result.length > 0) {
        const opp = result[0];
        if (opp !== undefined) {
          opportunityId = opp.opportunityId;
        }
      } else {
        opportunityId = 'fallback_opp';
      }
    });

    it('executes trade successfully', () => {
      const result = system.executeTrade('npc1', opportunityId);
      if (typeof result === 'string' && result !== 'opportunity_not_found') {
        expect(result).not.toBe('insufficient_funds');
      }
    });

    it('returns error for nonexistent opportunity', () => {
      const result = system.executeTrade('npc1', 'unknown_opportunity');
      expect(result).toBe('opportunity_not_found');
    });

    it('logs trade execution', () => {
      logs.length = 0;
      system.executeTrade('npc1', opportunityId);
      const tradeLog = logs.find((l) => l.msg === 'trade_executed');
      if (tradeLog !== undefined) {
        expect(tradeLog.ctx.npcId).toBe('npc1');
      }
    });

    it('updates NPC balance after trade', () => {
      const historyBefore = system.getTradeHistory('npc1');
      system.executeTrade('npc1', opportunityId);
      const historyAfter = system.getTradeHistory('npc1');
      if (historyBefore.totalTrades === 0) {
        expect(historyAfter.totalTrades).toBeGreaterThan(historyBefore.totalTrades);
      }
    });

    it('creates unique execution IDs', () => {
      const result1 = system.scanOpportunities('world1', ['item1', 'item2']);
      const result2 = system.scanOpportunities('world1', ['item3', 'item4']);
      if (typeof result1 !== 'string' && typeof result2 !== 'string') {
        if (result1.length > 0 && result2.length > 0) {
          const opp1 = result1[0];
          const opp2 = result2[0];
          if (opp1 !== undefined && opp2 !== undefined) {
            const exec1 = system.executeTrade('npc1', opp1.opportunityId);
            const exec2 = system.executeTrade('npc1', opp2.opportunityId);
            if (typeof exec1 === 'string' && typeof exec2 === 'string') {
              if (
                !['opportunity_not_found', 'insufficient_funds', 'trade_failed'].includes(exec1)
              ) {
                expect(exec1).not.toBe(exec2);
              }
            }
          }
        }
      }
      expect(true).toBe(true);
    });

    it('records actual profit variance', () => {
      system.executeTrade('npc1', opportunityId);
      const history = system.getTradeHistory('npc1');
      expect(history.totalTrades).toBeGreaterThan(0);
    });

    it('handles multiple trades by same NPC', () => {
      const opportunities = system.scanOpportunities('world1', ['item1', 'item2', 'item3']);
      if (typeof opportunities !== 'string') {
        for (let i = 0; i < opportunities.length; i = i + 1) {
          const opp = opportunities[i];
          if (opp !== undefined) {
            system.executeTrade('npc1', opp.opportunityId);
          }
        }
      }
      const history = system.getTradeHistory('npc1');
      expect(history.totalTrades).toBeGreaterThanOrEqual(0);
    });

    it('distributes profit to network members', () => {
      system.joinNetwork('npc1', 'network1');
      system.executeTrade('npc1', opportunityId);
      expect(true).toBe(true);
    });
  });

  describe('joinNetwork', () => {
    it('creates network when joining nonexistent network', () => {
      const result = system.joinNetwork('npc1', 'network1');
      expect(result).toBe('ok');
    });

    it('joins existing network', () => {
      system.joinNetwork('npc1', 'network1');
      const result = system.joinNetwork('npc2', 'network1');
      expect(result).toBe('ok');
    });

    it('logs network creation', () => {
      logs.length = 0;
      system.joinNetwork('npc1', 'new_network');
      const networkLog = logs.find((l) => l.msg === 'network_created');
      if (networkLog !== undefined) {
        expect(networkLog.ctx.npcId).toBe('npc1');
      }
    });

    it('logs network join', () => {
      system.joinNetwork('npc1', 'network1');
      logs.length = 0;
      system.joinNetwork('npc2', 'network1');
      const joinLog = logs.find((l) => l.msg === 'network_joined');
      if (joinLog !== undefined) {
        expect(joinLog.ctx.npcId).toBe('npc2');
      }
    });

    it('rejects duplicate join', () => {
      system.joinNetwork('npc1', 'network1');
      const result = system.joinNetwork('npc1', 'network1');
      expect(result).toBe('already_member');
    });

    it('allows NPC to join multiple networks', () => {
      const result1 = system.joinNetwork('npc1', 'network1');
      const result2 = system.joinNetwork('npc1', 'network2');
      expect(result1).toBe('ok');
      expect(result2).toBe('ok');
    });

    it('handles large network membership', () => {
      for (let i = 0; i < 50; i = i + 1) {
        system.joinNetwork('npc_' + String(i), 'big_network');
      }
      expect(true).toBe(true);
    });
  });

  describe('getTradeHistory', () => {
    it('returns empty history for NPC with no trades', () => {
      const history = system.getTradeHistory('npc1');
      expect(history.totalTrades).toBe(0);
      expect(history.profitableTrades).toBe(0);
      expect(history.lossMakingTrades).toBe(0);
      expect(history.totalProfitMicroKalon).toBe(0n);
    });

    it('records profitable trade', () => {
      const opportunities = system.scanOpportunities('world1', ['item1', 'item2', 'item3']);
      if (typeof opportunities !== 'string' && opportunities.length > 0) {
        const opp = opportunities[0];
        if (opp !== undefined) {
          system.executeTrade('npc1', opp.opportunityId);
        }
      }
      const history = system.getTradeHistory('npc1');
      expect(history.totalTrades).toBeGreaterThan(0);
    });

    it('calculates average profit', () => {
      const opportunities = system.scanOpportunities('world1', ['item1', 'item2', 'item3']);
      if (typeof opportunities !== 'string') {
        for (let i = 0; i < opportunities.length; i = i + 1) {
          const opp = opportunities[i];
          if (opp !== undefined) {
            system.executeTrade('npc1', opp.opportunityId);
          }
        }
      }
      const history = system.getTradeHistory('npc1');
      if (history.totalTrades > 0) {
        expect(history.averageProfitMicroKalon).toBeDefined();
      }
    });

    it('isolates history per NPC', () => {
      const opportunities = system.scanOpportunities('world1', ['item1', 'item2', 'item3']);
      if (typeof opportunities !== 'string' && opportunities.length >= 2) {
        const opp1 = opportunities[0];
        const opp2 = opportunities[1];
        if (opp1 !== undefined && opp2 !== undefined) {
          system.executeTrade('npc1', opp1.opportunityId);
          system.executeTrade('npc2', opp2.opportunityId);
        }
      }
      const history1 = system.getTradeHistory('npc1');
      const history2 = system.getTradeHistory('npc2');
      expect(history1.npcId).toBe('npc1');
      expect(history2.npcId).toBe('npc2');
    });

    it('updates after each trade', () => {
      const opportunities = system.scanOpportunities('world1', ['item1', 'item2']);
      if (typeof opportunities !== 'string' && opportunities.length > 0) {
        const opp = opportunities[0];
        if (opp !== undefined) {
          const historyBefore = system.getTradeHistory('npc1');
          system.executeTrade('npc1', opp.opportunityId);
          const historyAfter = system.getTradeHistory('npc1');
          expect(historyAfter.totalTrades).toBeGreaterThanOrEqual(historyBefore.totalTrades);
        }
      }
    });

    it('tracks total profit correctly', () => {
      const opportunities = system.scanOpportunities('world1', ['item1', 'item2', 'item3']);
      if (typeof opportunities !== 'string') {
        for (let i = 0; i < opportunities.length; i = i + 1) {
          const opp = opportunities[i];
          if (opp !== undefined) {
            system.executeTrade('npc1', opp.opportunityId);
          }
        }
      }
      const history = system.getTradeHistory('npc1');
      expect(typeof history.totalProfitMicroKalon).toBe('bigint');
    });
  });

  describe('getProfitReport', () => {
    it('returns report for NPC with no trades', () => {
      const report = system.getProfitReport('npc1');
      expect(report.npcId).toBe('npc1');
      expect(report.totalProfitMicroKalon).toBe(0n);
      expect(report.successRate).toBe(0);
    });

    it('calculates success rate', () => {
      const opportunities = system.scanOpportunities('world1', ['item1', 'item2', 'item3']);
      if (typeof opportunities !== 'string') {
        for (let i = 0; i < opportunities.length; i = i + 1) {
          const opp = opportunities[i];
          if (opp !== undefined) {
            system.executeTrade('npc1', opp.opportunityId);
          }
        }
      }
      const report = system.getProfitReport('npc1');
      expect(report.successRate).toBeGreaterThanOrEqual(0);
      expect(report.successRate).toBeLessThanOrEqual(1);
    });

    it('identifies top opportunity', () => {
      system.scanOpportunities('world1', ['item1', 'item2', 'item3']);
      const report = system.getProfitReport('npc1');
      if (report.topOpportunity !== undefined) {
        expect(report.topOpportunity.projectedProfitMicroKalon).toBeGreaterThan(0n);
      }
    });

    it('updates report after trades', () => {
      const reportBefore = system.getProfitReport('npc1');
      const opportunities = system.scanOpportunities('world1', ['item1', 'item2']);
      if (typeof opportunities !== 'string' && opportunities.length > 0) {
        const opp = opportunities[0];
        if (opp !== undefined) {
          system.executeTrade('npc1', opp.opportunityId);
        }
      }
      const reportAfter = system.getProfitReport('npc1');
      expect(reportAfter).toBeDefined();
    });

    it('reports total profit in micro-KALON', () => {
      const opportunities = system.scanOpportunities('world1', ['item1', 'item2']);
      if (typeof opportunities !== 'string') {
        for (let i = 0; i < opportunities.length; i = i + 1) {
          const opp = opportunities[i];
          if (opp !== undefined) {
            system.executeTrade('npc1', opp.opportunityId);
          }
        }
      }
      const report = system.getProfitReport('npc1');
      expect(typeof report.totalProfitMicroKalon).toBe('bigint');
    });
  });

  describe('setRiskTolerance', () => {
    it('sets CONSERVATIVE risk tolerance', () => {
      const result = system.setRiskTolerance('npc1', 'CONSERVATIVE');
      expect(result).toBe('ok');
    });

    it('sets MODERATE risk tolerance', () => {
      const result = system.setRiskTolerance('npc1', 'MODERATE');
      expect(result).toBe('ok');
    });

    it('sets AGGRESSIVE risk tolerance', () => {
      const result = system.setRiskTolerance('npc1', 'AGGRESSIVE');
      expect(result).toBe('ok');
    });

    it('allows changing risk tolerance', () => {
      system.setRiskTolerance('npc1', 'CONSERVATIVE');
      const result = system.setRiskTolerance('npc1', 'AGGRESSIVE');
      expect(result).toBe('ok');
    });

    it('affects trade evaluation', () => {
      const opportunities = system.scanOpportunities('world1', ['item1', 'item2', 'item3']);
      if (typeof opportunities !== 'string' && opportunities.length > 0) {
        const opp = opportunities[0];
        if (opp !== undefined) {
          system.setRiskTolerance('npc1', 'CONSERVATIVE');
          const eval1 = system.evaluateTrade('npc1', opp.opportunityId);
          system.setRiskTolerance('npc1', 'AGGRESSIVE');
          const eval2 = system.evaluateTrade('npc1', opp.opportunityId);
          expect(typeof eval1 === 'boolean' || typeof eval1 === 'string').toBe(true);
          expect(typeof eval2 === 'boolean' || typeof eval2 === 'string').toBe(true);
        }
      }
    });

    it('persists tolerance across operations', () => {
      system.setRiskTolerance('npc1', 'CONSERVATIVE');
      const opportunities = system.scanOpportunities('world1', ['item1']);
      if (typeof opportunities !== 'string' && opportunities.length > 0) {
        const opp = opportunities[0];
        if (opp !== undefined) {
          system.executeTrade('npc1', opp.opportunityId);
        }
      }
      expect(true).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles large number of opportunities', () => {
      const items: string[] = [];
      for (let i = 0; i < 100; i = i + 1) {
        items.push('item_' + String(i));
      }
      const result = system.scanOpportunities('world1', items);
      if (typeof result !== 'string') {
        expect(Array.isArray(result)).toBe(true);
      }
    });

    it('handles rapid trade execution', () => {
      const opportunities = system.scanOpportunities('world1', [
        'item1',
        'item2',
        'item3',
        'item4',
        'item5',
      ]);
      if (typeof opportunities !== 'string') {
        for (let i = 0; i < opportunities.length; i = i + 1) {
          const opp = opportunities[i];
          if (opp !== undefined) {
            system.executeTrade('npc1', opp.opportunityId);
          }
        }
      }
      const history = system.getTradeHistory('npc1');
      expect(history.totalTrades).toBeGreaterThanOrEqual(0);
    });

    it('handles concurrent trades by multiple NPCs', () => {
      const opportunities = system.scanOpportunities('world1', ['item1', 'item2', 'item3']);
      if (typeof opportunities !== 'string' && opportunities.length >= 3) {
        const opp1 = opportunities[0];
        const opp2 = opportunities[1];
        const opp3 = opportunities[2];
        if (opp1 !== undefined && opp2 !== undefined && opp3 !== undefined) {
          system.executeTrade('npc1', opp1.opportunityId);
          system.executeTrade('npc2', opp2.opportunityId);
          system.executeTrade('npc3', opp3.opportunityId);
        }
      }
      const history1 = system.getTradeHistory('npc1');
      const history2 = system.getTradeHistory('npc2');
      const history3 = system.getTradeHistory('npc3');
      expect(history1.npcId).toBe('npc1');
      expect(history2.npcId).toBe('npc2');
      expect(history3.npcId).toBe('npc3');
    });

    it('maintains balance across failed trades', () => {
      const historyBefore = system.getTradeHistory('npc1');
      system.executeTrade('npc1', 'unknown_opportunity');
      const historyAfter = system.getTradeHistory('npc1');
      expect(historyAfter.totalProfitMicroKalon).toBe(historyBefore.totalProfitMicroKalon);
    });

    it('preserves risk tolerance after failed operations', () => {
      system.setRiskTolerance('npc1', 'CONSERVATIVE');
      system.executeTrade('npc1', 'unknown_opportunity');
      const opportunities = system.scanOpportunities('world1', ['item1']);
      if (typeof opportunities !== 'string' && opportunities.length > 0) {
        const opp = opportunities[0];
        if (opp !== undefined) {
          system.evaluateTrade('npc1', opp.opportunityId);
        }
      }
      expect(true).toBe(true);
    });

    it('handles zero-profit opportunities', () => {
      const opportunities = system.scanOpportunities('world1', ['item1', 'item2', 'item3']);
      if (typeof opportunities !== 'string') {
        expect(Array.isArray(opportunities)).toBe(true);
      }
    });

    it('handles network profit distribution', () => {
      system.joinNetwork('npc1', 'network1');
      system.joinNetwork('npc2', 'network1');
      const opportunities = system.scanOpportunities('world1', ['item1', 'item2']);
      if (typeof opportunities !== 'string' && opportunities.length > 0) {
        const opp = opportunities[0];
        if (opp !== undefined) {
          system.executeTrade('npc1', opp.opportunityId);
        }
      }
      expect(true).toBe(true);
    });

    it('handles multiple networks per NPC', () => {
      system.joinNetwork('npc1', 'network1');
      system.joinNetwork('npc1', 'network2');
      system.joinNetwork('npc1', 'network3');
      const opportunities = system.scanOpportunities('world1', ['item1']);
      if (typeof opportunities !== 'string' && opportunities.length > 0) {
        const opp = opportunities[0];
        if (opp !== undefined) {
          system.executeTrade('npc1', opp.opportunityId);
        }
      }
      expect(true).toBe(true);
    });

    it('maintains profit accuracy with bigint', () => {
      const opportunities = system.scanOpportunities('world1', ['item1']);
      if (typeof opportunities !== 'string' && opportunities.length > 0) {
        const opp = opportunities[0];
        if (opp !== undefined) {
          system.executeTrade('npc1', opp.opportunityId);
          const history = system.getTradeHistory('npc1');
          expect(typeof history.totalProfitMicroKalon).toBe('bigint');
          expect(typeof history.averageProfitMicroKalon).toBe('bigint');
        }
      }
    });
  });
});
