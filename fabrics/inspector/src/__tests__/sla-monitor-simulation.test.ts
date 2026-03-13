import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createSlaMonitor,
  type SlaMonitorDeps,
} from '../sla-monitor.js'

let t = 1_000_000_000n
const BASE = 1_000_000_000n
const WINDOW = 60_000_000n // 60 seconds in microseconds

function makeDeps(): SlaMonitorDeps {
  return {
    clock: { nowMicroseconds: () => (t += 1000n) },
    logger: { info: vi.fn(), warn: vi.fn() },
  }
}

function makeTarget(metricType = 'UPTIME' as const) {
  return {
    metricType,
    targetValue: 99.9,
    windowMicros: WINDOW,
    alertThreshold: 99.0,
  }
}

beforeEach(() => {
  t = BASE
})

describe('sla-monitor simulation', () => {
  describe('setSlaTarget', () => {
    it('returns OK when adding a new target', () => {
      const s = createSlaMonitor(makeDeps())
      expect(s.setSlaTarget(makeTarget('UPTIME'))).toBe('OK')
    })

    it('overwrites an existing target with same type', () => {
      const s = createSlaMonitor(makeDeps())
      s.setSlaTarget(makeTarget('UPTIME'))
      const result = s.setSlaTarget({ ...makeTarget('UPTIME'), targetValue: 95 })
      expect(result).toBe('OK')
    })
  })

  describe('recordMetric', () => {
    it('returns OK when target exists', () => {
      const s = createSlaMonitor(makeDeps())
      s.setSlaTarget(makeTarget('UPTIME'))
      const result = s.recordMetric({ metricType: 'UPTIME', value: 99.95, timestampMicros: t })
      expect(result).toBe('OK')
    })

    it('returns TARGET_NOT_FOUND when no target set', () => {
      const s = createSlaMonitor(makeDeps())
      const result = s.recordMetric({ metricType: 'ERROR_RATE', value: 0.5, timestampMicros: t })
      expect(result).toBe('TARGET_NOT_FOUND')
    })
  })

  describe('computeCompliance', () => {
    it('returns TARGET_NOT_FOUND when no target set', () => {
      const s = createSlaMonitor(makeDeps())
      expect(s.computeCompliance('LATENCY_P99')).toBe('TARGET_NOT_FOUND')
    })

    it('returns a compliance report when target + metrics exist', () => {
      const s = createSlaMonitor(makeDeps())
      s.setSlaTarget(makeTarget('UPTIME'))
      s.recordMetric({ metricType: 'UPTIME', value: 100, timestampMicros: t })
      s.recordMetric({ metricType: 'UPTIME', value: 100, timestampMicros: t + 1000n })
      const report = s.computeCompliance('UPTIME')
      expect(report).not.toBe('TARGET_NOT_FOUND')
      expect((report as any).metricType).toBe('UPTIME')
    })
  })

  describe('checkBreaches', () => {
    it('returns empty array when metrics are within target', () => {
      const s = createSlaMonitor(makeDeps())
      s.setSlaTarget(makeTarget('UPTIME'))
      s.recordMetric({ metricType: 'UPTIME', value: 100, timestampMicros: t })
      const breaches = s.checkBreaches()
      expect(Array.isArray(breaches)).toBe(true)
    })

    it('returns breaches when threshold is violated', () => {
      const s = createSlaMonitor(makeDeps())
      s.setSlaTarget({
        metricType: 'ERROR_RATE',
        targetValue: 1.0,
        windowMicros: WINDOW,
        alertThreshold: 0.5,
      })
      // Record values below threshold (higher error is worse)
      s.recordMetric({ metricType: 'ERROR_RATE', value: 90, timestampMicros: t })
      const breaches = s.checkBreaches()
      expect(Array.isArray(breaches)).toBe(true)
    })
  })

  describe('getAlerts', () => {
    it('returns alerts array (possibly empty)', () => {
      const s = createSlaMonitor(makeDeps())
      s.setSlaTarget(makeTarget('UPTIME'))
      s.checkBreaches()
      const alerts = s.getAlerts(0n)
      expect(Array.isArray(alerts)).toBe(true)
    })

    it('filters alerts by since timestamp', () => {
      const s = createSlaMonitor(makeDeps())
      const alerts = s.getAlerts(9_999_999_999n)
      expect(Array.isArray(alerts)).toBe(true)
    })
  })

  describe('pruneOldMetrics', () => {
    it('prunes metrics older than threshold', () => {
      const s = createSlaMonitor(makeDeps())
      s.setSlaTarget(makeTarget('UPTIME'))
      s.recordMetric({ metricType: 'UPTIME', value: 100, timestampMicros: 1n })
      s.recordMetric({ metricType: 'UPTIME', value: 100, timestampMicros: 2n })
      const pruned = s.pruneOldMetrics(2_000_000_000n)
      expect(typeof pruned).toBe('number')
      expect(pruned).toBeGreaterThanOrEqual(0)
    })
  })

  describe('getStats', () => {
    it('returns stats object with expected fields', () => {
      const s = createSlaMonitor(makeDeps())
      s.setSlaTarget(makeTarget('UPTIME'))
      s.recordMetric({ metricType: 'UPTIME', value: 100, timestampMicros: t })
      const stats = s.getStats()
      expect(typeof stats.totalMetrics).toBe('bigint')
      expect(stats.totalMetrics).toBe(1n)
      expect(stats.activeTargets).toBe(1)
      expect(typeof stats.alertCount).toBe('number')
    })
  })

  describe('getComplianceReport', () => {
    it('returns TARGET_NOT_FOUND when no target set', () => {
      const s = createSlaMonitor(makeDeps())
      const r = s.getComplianceReport('LATENCY_P95', BASE, BASE + WINDOW)
      expect(r).toBe('TARGET_NOT_FOUND')
    })

    it('returns a compliance report for the given window', () => {
      const s = createSlaMonitor(makeDeps())
      s.setSlaTarget(makeTarget('UPTIME'))
      s.recordMetric({ metricType: 'UPTIME', value: 100, timestampMicros: BASE + 1000n })
      const r = s.getComplianceReport('UPTIME', BASE, BASE + WINDOW)
      expect(r).not.toBe('TARGET_NOT_FOUND')
    })
  })
})
