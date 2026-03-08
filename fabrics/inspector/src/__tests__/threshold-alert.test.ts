import { describe, it, expect } from 'vitest';
import { createThresholdAlertService } from '../threshold-alert.js';
import type { ThresholdAlertDeps } from '../threshold-alert.js';

function makeDeps(): ThresholdAlertDeps {
  let time = 1_000_000;
  let idCounter = 0;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: { next: () => 'id-' + String(++idCounter) },
  };
}

describe('ThresholdAlert — rule management', () => {
  it('adds a rule', () => {
    const svc = createThresholdAlertService(makeDeps());
    const rule = svc.addRule({
      metricName: 'cpu',
      direction: 'above',
      threshold: 90,
      severity: 'critical',
    });
    expect(rule.ruleId).toBe('id-1');
    expect(rule.metricName).toBe('cpu');
  });

  it('removes a rule', () => {
    const svc = createThresholdAlertService(makeDeps());
    const rule = svc.addRule({ metricName: 'cpu', direction: 'above', threshold: 90, severity: 'warning' });
    expect(svc.removeRule(rule.ruleId)).toBe(true);
  });

  it('remove returns false for unknown', () => {
    const svc = createThresholdAlertService(makeDeps());
    expect(svc.removeRule('missing')).toBe(false);
  });
});

describe('ThresholdAlert — evaluate', () => {
  it('triggers alert when above threshold', () => {
    const svc = createThresholdAlertService(makeDeps());
    svc.addRule({ metricName: 'cpu', direction: 'above', threshold: 80, severity: 'warning' });
    const alerts = svc.evaluate({ metricName: 'cpu', value: 95 });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.severity).toBe('warning');
  });

  it('triggers alert when below threshold', () => {
    const svc = createThresholdAlertService(makeDeps());
    svc.addRule({ metricName: 'disk', direction: 'below', threshold: 10, severity: 'critical' });
    const alerts = svc.evaluate({ metricName: 'disk', value: 5 });
    expect(alerts).toHaveLength(1);
  });

  it('does not trigger when within bounds', () => {
    const svc = createThresholdAlertService(makeDeps());
    svc.addRule({ metricName: 'cpu', direction: 'above', threshold: 80, severity: 'warning' });
    const alerts = svc.evaluate({ metricName: 'cpu', value: 50 });
    expect(alerts).toHaveLength(0);
  });

  it('ignores rules for other metrics', () => {
    const svc = createThresholdAlertService(makeDeps());
    svc.addRule({ metricName: 'cpu', direction: 'above', threshold: 80, severity: 'warning' });
    const alerts = svc.evaluate({ metricName: 'memory', value: 99 });
    expect(alerts).toHaveLength(0);
  });
});

describe('ThresholdAlert — alert lifecycle', () => {
  it('acknowledges an alert', () => {
    const svc = createThresholdAlertService(makeDeps());
    svc.addRule({ metricName: 'cpu', direction: 'above', threshold: 80, severity: 'warning' });
    const alerts = svc.evaluate({ metricName: 'cpu', value: 95 });
    const alertId = alerts[0]?.alertId ?? '';
    expect(svc.acknowledge(alertId)).toBe(true);
    const listed = svc.listAlerts('acknowledged');
    expect(listed).toHaveLength(1);
  });

  it('resolves an alert', () => {
    const svc = createThresholdAlertService(makeDeps());
    svc.addRule({ metricName: 'cpu', direction: 'above', threshold: 80, severity: 'warning' });
    const alerts = svc.evaluate({ metricName: 'cpu', value: 95 });
    const alertId = alerts[0]?.alertId ?? '';
    expect(svc.resolve(alertId)).toBe(true);
    const active = svc.listAlerts('active');
    expect(active).toHaveLength(0);
  });

  it('returns false for unknown alert', () => {
    const svc = createThresholdAlertService(makeDeps());
    expect(svc.acknowledge('missing')).toBe(false);
  });

  it('lists all alerts without filter', () => {
    const svc = createThresholdAlertService(makeDeps());
    svc.addRule({ metricName: 'cpu', direction: 'above', threshold: 80, severity: 'warning' });
    svc.evaluate({ metricName: 'cpu', value: 95 });
    svc.evaluate({ metricName: 'cpu', value: 85 });
    expect(svc.listAlerts()).toHaveLength(2);
  });
});

describe('ThresholdAlert — stats', () => {
  it('starts with zero stats', () => {
    const svc = createThresholdAlertService(makeDeps());
    const stats = svc.getStats();
    expect(stats.totalRules).toBe(0);
    expect(stats.activeAlerts).toBe(0);
  });

  it('tracks aggregate stats', () => {
    const svc = createThresholdAlertService(makeDeps());
    svc.addRule({ metricName: 'cpu', direction: 'above', threshold: 80, severity: 'warning' });
    svc.evaluate({ metricName: 'cpu', value: 95 });
    const alerts = svc.evaluate({ metricName: 'cpu', value: 85 });
    const alertId = alerts[0]?.alertId ?? '';
    svc.resolve(alertId);
    const stats = svc.getStats();
    expect(stats.totalRules).toBe(1);
    expect(stats.activeAlerts).toBe(1);
    expect(stats.totalAlerts).toBe(2);
  });
});
