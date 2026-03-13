import { describe, it, expect, beforeEach } from 'vitest'
import { createThresholdAlertService } from '../threshold-alert.js'

let t = 1_000_000
let seq = 0

function makeDeps() {
  return {
    clock: { nowMicroseconds: () => (t += 1000) },
    idGenerator: { next: () => `ta-${++seq}` },
  }
}

beforeEach(() => {
  t = 1_000_000
  seq = 0
})

describe('threshold-alert simulation', () => {
  describe('addRule', () => {
    it('creates a rule and returns it', () => {
      const svc = createThresholdAlertService(makeDeps())
      const rule = svc.addRule({
        metricName: 'cpu',
        direction: 'above',
        threshold: 90,
        severity: 'warning',
      })
      expect(rule.metricName).toBe('cpu')
      expect(rule.direction).toBe('above')
      expect(rule.threshold).toBe(90)
      expect(rule.severity).toBe('warning')
      expect(typeof rule.ruleId).toBe('string')
    })

    it('adds multiple rules', () => {
      const svc = createThresholdAlertService(makeDeps())
      svc.addRule({ metricName: 'cpu', direction: 'above', threshold: 90, severity: 'warning' })
      svc.addRule({ metricName: 'memory', direction: 'above', threshold: 80, severity: 'critical' })
      expect(svc.getStats().totalRules).toBe(2)
    })
  })

  describe('removeRule', () => {
    it('removes an existing rule and returns true', () => {
      const svc = createThresholdAlertService(makeDeps())
      const rule = svc.addRule({ metricName: 'cpu', direction: 'above', threshold: 90, severity: 'warning' })
      expect(svc.removeRule(rule.ruleId)).toBe(true)
      expect(svc.getStats().totalRules).toBe(0)
    })

    it('returns false for unknown ruleId', () => {
      const svc = createThresholdAlertService(makeDeps())
      expect(svc.removeRule('no-such-rule')).toBe(false)
    })
  })

  describe('evaluate', () => {
    it('fires an alert when value exceeds above-threshold', () => {
      const svc = createThresholdAlertService(makeDeps())
      svc.addRule({ metricName: 'cpu', direction: 'above', threshold: 90, severity: 'warning' })
      const alerts = svc.evaluate({ metricName: 'cpu', value: 95 })
      expect(alerts.length).toBe(1)
      expect(alerts[0]!.metricName).toBe('cpu')
      expect(alerts[0]!.status).toBe('active')
    })

    it('fires an alert when value is below threshold (below direction)', () => {
      const svc = createThresholdAlertService(makeDeps())
      svc.addRule({ metricName: 'uptime', direction: 'below', threshold: 99, severity: 'critical' })
      const alerts = svc.evaluate({ metricName: 'uptime', value: 95 })
      expect(alerts.length).toBe(1)
    })

    it('does not fire when below threshold (above direction)', () => {
      const svc = createThresholdAlertService(makeDeps())
      svc.addRule({ metricName: 'cpu', direction: 'above', threshold: 90, severity: 'warning' })
      const alerts = svc.evaluate({ metricName: 'cpu', value: 70 })
      expect(alerts.length).toBe(0)
    })

    it('returns empty array for unknown metric', () => {
      const svc = createThresholdAlertService(makeDeps())
      expect(svc.evaluate({ metricName: 'ghost', value: 100 }).length).toBe(0)
    })
  })

  describe('acknowledge', () => {
    it('acknowledges an active alert', () => {
      const svc = createThresholdAlertService(makeDeps())
      svc.addRule({ metricName: 'cpu', direction: 'above', threshold: 90, severity: 'warning' })
      const alerts = svc.evaluate({ metricName: 'cpu', value: 95 })
      expect(svc.acknowledge(alerts[0]!.alertId)).toBe(true)
      const acked = svc.listAlerts('acknowledged')
      expect(acked.length).toBe(1)
    })

    it('returns false for unknown alertId', () => {
      const svc = createThresholdAlertService(makeDeps())
      expect(svc.acknowledge('no-such-alert')).toBe(false)
    })
  })

  describe('resolve', () => {
    it('resolves an active alert', () => {
      const svc = createThresholdAlertService(makeDeps())
      svc.addRule({ metricName: 'cpu', direction: 'above', threshold: 90, severity: 'warning' })
      const alerts = svc.evaluate({ metricName: 'cpu', value: 95 })
      expect(svc.resolve(alerts[0]!.alertId)).toBe(true)
      const resolved = svc.listAlerts('resolved')
      expect(resolved.length).toBe(1)
    })

    it('returns false for unknown alertId', () => {
      const svc = createThresholdAlertService(makeDeps())
      expect(svc.resolve('no-such-alert')).toBe(false)
    })
  })

  describe('listAlerts', () => {
    it('returns all alerts when no filter given', () => {
      const svc = createThresholdAlertService(makeDeps())
      svc.addRule({ metricName: 'cpu', direction: 'above', threshold: 90, severity: 'warning' })
      svc.evaluate({ metricName: 'cpu', value: 95 })
      const all = svc.listAlerts()
      expect(all.length).toBe(1)
    })

    it('filters by status', () => {
      const svc = createThresholdAlertService(makeDeps())
      svc.addRule({ metricName: 'cpu', direction: 'above', threshold: 90, severity: 'warning' })
      const alerts = svc.evaluate({ metricName: 'cpu', value: 95 })
      svc.acknowledge(alerts[0]!.alertId)
      expect(svc.listAlerts('active').length).toBe(0)
      expect(svc.listAlerts('acknowledged').length).toBe(1)
    })
  })

  describe('getStats', () => {
    it('reflects current rule and alert counts', () => {
      const svc = createThresholdAlertService(makeDeps())
      svc.addRule({ metricName: 'cpu', direction: 'above', threshold: 90, severity: 'warning' })
      svc.evaluate({ metricName: 'cpu', value: 95 })
      const stats = svc.getStats()
      expect(stats.totalRules).toBe(1)
      expect(stats.activeAlerts).toBe(1)
      expect(stats.totalAlerts).toBe(1)
    })
  })
})
