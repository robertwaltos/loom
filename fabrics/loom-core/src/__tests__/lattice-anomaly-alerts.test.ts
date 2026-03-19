import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAlertPriority,
  getAlertChannels,
  buildLatticeAnomalyAlert,
  buildNgoziPersonalAlert,
  getAlertsForDynasty,
  isAlertActive,
  buildCascadeEmergencyFiling,
} from '../lattice-anomaly-alerts.js';
import type {
  LatticeAnomalyAlert,
  NgoziPersonalAlert,
  AlertRecipient,
  AlertChannel,
} from '../lattice-anomaly-alerts.js';
import type { NgozoAnomalyLevel } from '../lattice-frequency-engine.js';

function makeAlert(
  overrides: Partial<LatticeAnomalyAlert> = {},
): LatticeAnomalyAlert {
  const issuedAt = new Date('2350-01-01T00:00:00Z');
  return {
    alertId: 'alert-1',
    worldId: 'world-33',
    level: 'NOTABLE_ANOMALY' as NgozoAnomalyLevel,
    currentHz: 848.6,
    baseHz: 847.1,
    deltaHz: 1.5,
    priority: 'ELEVATED',
    channels: ['CHRONICLE', 'ASSEMBLY_BULLETIN'],
    headlineText: 'test headline',
    bodyText: 'test body',
    issuedAt,
    expiresAt: new Date(issuedAt.getTime() + 48 * 60 * 60 * 1000),
    requiresNgoziBiblio: false,
    ...overrides,
  };
}

describe('lattice-anomaly-alerts', () => {
  let now: Date;

  beforeEach(() => {
    now = new Date('2350-01-01T00:00:00Z');
  });

  describe('getAlertPriority', () => {
    it('should return ROUTINE for BASELINE', () => {
      expect(getAlertPriority('BASELINE')).toBe('ROUTINE');
    });

    it('should return ROUTINE for MINOR_ANOMALY', () => {
      expect(getAlertPriority('MINOR_ANOMALY')).toBe('ROUTINE');
    });

    it('should return ELEVATED for NOTABLE_ANOMALY', () => {
      expect(getAlertPriority('NOTABLE_ANOMALY')).toBe('ELEVATED');
    });

    it('should return ELEVATED for SIGNIFICANT', () => {
      expect(getAlertPriority('SIGNIFICANT')).toBe('ELEVATED');
    });

    it('should return URGENT for CRITICAL', () => {
      expect(getAlertPriority('CRITICAL')).toBe('URGENT');
    });

    it('should return EMERGENCY for CASCADE_RISK', () => {
      expect(getAlertPriority('CASCADE_RISK')).toBe('EMERGENCY');
    });
  });

  describe('getAlertChannels', () => {
    it('should return only CHRONICLE for BASELINE', () => {
      const channels = getAlertChannels('BASELINE', false);
      expect(channels).toEqual(['CHRONICLE']);
    });

    it('should return CHRONICLE and ASSEMBLY_BULLETIN for MINOR_ANOMALY', () => {
      const channels = getAlertChannels('MINOR_ANOMALY', false);
      expect(channels).toContain('CHRONICLE');
      expect(channels).toContain('ASSEMBLY_BULLETIN');
    });

    it('should not include PERSONAL for MINOR_ANOMALY even if Ngozi reader', () => {
      const channels = getAlertChannels('MINOR_ANOMALY', true);
      expect(channels).not.toContain('PERSONAL');
    });

    it('should include PERSONAL for NOTABLE_ANOMALY when Ngozi reader', () => {
      const channels = getAlertChannels('NOTABLE_ANOMALY', true);
      expect(channels).toContain('PERSONAL');
    });

    it('should not include PERSONAL for NOTABLE_ANOMALY when not Ngozi reader', () => {
      const channels = getAlertChannels('NOTABLE_ANOMALY', false);
      expect(channels).not.toContain('PERSONAL');
    });

    it('should include PERSONAL for CASCADE_RISK when Ngozi reader', () => {
      const channels = getAlertChannels('CASCADE_RISK', true);
      expect(channels).toContain('PERSONAL');
    });
  });

  describe('buildLatticeAnomalyAlert', () => {
    it('should calculate deltaHz correctly', () => {
      const alert = buildLatticeAnomalyAlert({
        alertId: 'a-1',
        worldId: 'world-33',
        level: 'SIGNIFICANT',
        currentHz: 850.1,
        baseHz: 847.1,
        issuedAt: now,
      });
      expect(alert.deltaHz).toBe(3.0);
    });

    it('should set expiresAt to 48 hours after issuedAt', () => {
      const alert = buildLatticeAnomalyAlert({
        alertId: 'a-2',
        worldId: 'world-33',
        level: 'BASELINE',
        currentHz: 847.1,
        baseHz: 847.1,
        issuedAt: now,
      });
      const expected = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      expect(alert.expiresAt.getTime()).toBe(expected.getTime());
    });

    it('should set requiresNgoziBiblio to false', () => {
      const alert = buildLatticeAnomalyAlert({
        alertId: 'a-3',
        worldId: 'world-33',
        level: 'CRITICAL',
        currentHz: 854.1,
        baseHz: 847.1,
        issuedAt: now,
      });
      expect(alert.requiresNgoziBiblio).toBe(false);
    });

    it('should set correct headline for CRITICAL', () => {
      const alert = buildLatticeAnomalyAlert({
        alertId: 'a-4',
        worldId: 'world-33',
        level: 'CRITICAL',
        currentHz: 854.1,
        baseHz: 847.1,
        issuedAt: now,
      });
      expect(alert.headlineText).toContain('Critical');
    });

    it('should set correct headline for CASCADE_RISK', () => {
      const alert = buildLatticeAnomalyAlert({
        alertId: 'a-5',
        worldId: 'world-33',
        level: 'CASCADE_RISK',
        currentHz: 860.0,
        baseHz: 847.1,
        issuedAt: now,
      });
      expect(alert.headlineText).toContain('EMERGENCY');
    });
  });

  describe('buildNgoziPersonalAlert', () => {
    it('should return null for BASELINE', () => {
      const alert = makeAlert({ level: 'BASELINE' });
      expect(buildNgoziPersonalAlert(alert)).toBeNull();
    });

    it('should return null for MINOR_ANOMALY', () => {
      const alert = makeAlert({ level: 'MINOR_ANOMALY' });
      expect(buildNgoziPersonalAlert(alert)).toBeNull();
    });

    it('should return a personal alert for NOTABLE_ANOMALY', () => {
      const alert = makeAlert({ level: 'NOTABLE_ANOMALY' });
      const personal = buildNgoziPersonalAlert(alert);
      expect(personal).not.toBeNull();
      if (personal) {
        expect(personal.channel).toBe('PERSONAL');
        expect(personal.requiresNgoziBiblio).toBe(true);
      }
    });

    it('should include journal page for SIGNIFICANT', () => {
      const alert = makeAlert({ level: 'SIGNIFICANT' });
      const personal = buildNgoziPersonalAlert(alert);
      expect(personal).not.toBeNull();
      if (personal) {
        expect(personal.ngozJournalPage).toBe(388);
      }
    });

    it('should include journal quote for CRITICAL', () => {
      const alert = makeAlert({ level: 'CRITICAL' });
      const personal = buildNgoziPersonalAlert(alert);
      expect(personal).not.toBeNull();
      if (personal) {
        expect(personal.journalQuote).toContain('I know what the number means');
      }
    });

    it('should include personal note text', () => {
      const alert = makeAlert({ level: 'CASCADE_RISK' });
      const personal = buildNgoziPersonalAlert(alert);
      expect(personal).not.toBeNull();
      if (personal) {
        expect(personal.ngozPersonalNote).toContain('Sister Ngozi');
      }
    });
  });

  describe('getAlertsForDynasty', () => {
    it('should return empty array for BASELINE level', () => {
      const recipient: AlertRecipient = {
        dynastyId: 'dynasty-1',
        hasReadNgoziJournal: false,
        alertsReceived: [],
      };
      const alert = makeAlert({ level: 'BASELINE' });
      const result = getAlertsForDynasty(recipient, alert, null);
      expect(result.length).toBe(0);
    });

    it('should return only standard alert for non-Ngozi reader', () => {
      const recipient: AlertRecipient = {
        dynastyId: 'dynasty-2',
        hasReadNgoziJournal: false,
        alertsReceived: [],
      };
      const alert = makeAlert({ level: 'CRITICAL' });
      const personal = buildNgoziPersonalAlert(alert);
      const result = getAlertsForDynasty(recipient, alert, personal);
      expect(result.length).toBe(1);
    });

    it('should return standard and personal alert for Ngozi reader', () => {
      const recipient: AlertRecipient = {
        dynastyId: 'dynasty-3',
        hasReadNgoziJournal: true,
        alertsReceived: [],
      };
      const alert = makeAlert({ level: 'CRITICAL' });
      const personal = buildNgoziPersonalAlert(alert);
      const result = getAlertsForDynasty(recipient, alert, personal);
      expect(result.length).toBe(2);
    });

    it('should return only standard if personal is null', () => {
      const recipient: AlertRecipient = {
        dynastyId: 'dynasty-4',
        hasReadNgoziJournal: true,
        alertsReceived: [],
      };
      const alert = makeAlert({ level: 'MINOR_ANOMALY' });
      const result = getAlertsForDynasty(recipient, alert, null);
      expect(result.length).toBe(1);
    });
  });

  describe('isAlertActive', () => {
    it('should return true before expiry', () => {
      const alert = makeAlert();
      expect(isAlertActive(alert, now)).toBe(true);
    });

    it('should return false after expiry', () => {
      const alert = makeAlert();
      const after = new Date(alert.expiresAt.getTime() + 1000);
      expect(isAlertActive(alert, after)).toBe(false);
    });

    it('should return false exactly at expiry', () => {
      const alert = makeAlert();
      expect(isAlertActive(alert, alert.expiresAt)).toBe(false);
    });
  });

  describe('buildCascadeEmergencyFiling', () => {
    it('should set category to EMERGENCY', () => {
      const alert = makeAlert({ level: 'CASCADE_RISK' });
      const filing = buildCascadeEmergencyFiling(alert);
      expect(filing.category).toBe('EMERGENCY');
    });

    it('should set autoFiled to true', () => {
      const alert = makeAlert({ level: 'CASCADE_RISK' });
      const filing = buildCascadeEmergencyFiling(alert);
      expect(filing.autoFiled).toBe(true);
    });

    it('should include the worldId', () => {
      const alert = makeAlert({ worldId: 'world-33', level: 'CASCADE_RISK' });
      const filing = buildCascadeEmergencyFiling(alert);
      expect(filing.worldId).toBe('world-33');
    });

    it('should include frequency details in filerNote', () => {
      const alert = makeAlert({
        currentHz: 860.0,
        baseHz: 847.1,
        deltaHz: 12.9,
      });
      const filing = buildCascadeEmergencyFiling(alert);
      expect(filing.filerNote).toContain('860');
      expect(filing.filerNote).toContain('847.1');
    });

    it('should reference Standing Rule 14', () => {
      const alert = makeAlert();
      const filing = buildCascadeEmergencyFiling(alert);
      expect(filing.filerNote).toContain('Standing Rule 14');
    });
  });
});
