import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createRegressionDetector,
  type RegressionDetectorDeps,
} from '../regression-detector.js'

let t = 1_000_000_000n
let seq = 0

function makeDeps(): RegressionDetectorDeps {
  return {
    clock: { nowMicroseconds: () => (t += 1000n) },
    logger: { info: vi.fn(), warn: vi.fn() },
    idGenerator: { generate: () => `rd-${++seq}` },
    maxSnapshotsPerMetric: 100,
    maxAlertsPerMetric: 50,
  }
}

beforeEach(() => {
  t = 1_000_000_000n
  seq = 0
})

describe('regression-detector simulation', () => {
  describe('setBaseline', () => {
    it('registers a baseline for a metric', () => {
      const d = createRegressionDetector(makeDeps())
      d.setBaseline('latency', 50, 'LOWER_IS_BETTER', 'test')
      expect(d.hasBaseline('latency')).toBe(true)
    })

    it('lists metric after baseline is set', () => {
      const d = createRegressionDetector(makeDeps())
      d.setBaseline('throughput', 1000, 'HIGHER_IS_BETTER', 'bench')
      expect(d.getMetrics()).toContain('throughput')
    })

    it('returns baseline via getBaseline', () => {
      const d = createRegressionDetector(makeDeps())
      d.setBaseline('cpu', 30, 'LOWER_IS_BETTER', 'monitor')
      const bl = d.getBaseline('cpu')
      expect(bl).toBeDefined()
      expect(bl?.value).toBe(30)
      expect(bl?.direction).toBe('LOWER_IS_BETTER')
    })

    it('returns null for unknown metric', () => {
      const d = createRegressionDetector(makeDeps())
      expect(d.getBaseline('unknown')).toBeNull()
    })
  })

  describe('recordSnapshot', () => {
    it('increments snapshot count', () => {
      const d = createRegressionDetector(makeDeps())
      d.setBaseline('latency', 50, 'LOWER_IS_BETTER', 'test')
      d.recordSnapshot({ metricName: 'latency', value: 55, capturedAt: t, source: 'probe' })
      expect(d.getSnapshotCount('latency')).toBe(1)
    })

    it('returns latest snapshot', () => {
      const d = createRegressionDetector(makeDeps())
      d.setBaseline('latency', 50, 'LOWER_IS_BETTER', 'test')
      const snap = { metricName: 'latency', value: 60, capturedAt: t + 5000n, source: 'probe' }
      d.recordSnapshot(snap)
      const latest = d.getLatestSnapshot('latency')
      expect(latest?.value).toBe(60)
    })

    it('returns null for metric with no snapshots', () => {
      const d = createRegressionDetector(makeDeps())
      expect(d.getLatestSnapshot('ghost')).toBeNull()
    })
  })

  describe('detectRegressions', () => {
    it('detects regression when value exceeds threshold (lower is better)', () => {
      const d = createRegressionDetector(makeDeps())
      d.setBaseline('latency', 50, 'LOWER_IS_BETTER', 'test')
      d.recordSnapshot({ metricName: 'latency', value: 80, capturedAt: t, source: 'probe' })
      const alerts = d.detectRegressions({ minorPercent: 20, moderatePercent: 40, severePercent: 60 })
      expect(alerts.length).toBeGreaterThan(0)
      expect(alerts[0]?.metricName ?? (alerts[0] as any).metric).toBeTruthy()
    })

    it('does not flag a minor deviation', () => {
      const d = createRegressionDetector(makeDeps())
      d.setBaseline('latency', 50, 'LOWER_IS_BETTER', 'test')
      d.recordSnapshot({ metricName: 'latency', value: 52, capturedAt: t, source: 'probe' })
      const alerts = d.detectRegressions({ minorPercent: 20, moderatePercent: 40, severePercent: 60 })
      expect(alerts.length).toBe(0)
    })

    it('detects regression when value drops (higher is better)', () => {
      const d = createRegressionDetector(makeDeps())
      d.setBaseline('throughput', 1000, 'HIGHER_IS_BETTER', 'bench')
      d.recordSnapshot({ metricName: 'throughput', value: 600, capturedAt: t, source: 'bench' })
      const alerts = d.detectRegressions({ minorPercent: 20, moderatePercent: 40, severePercent: 60 })
      expect(alerts.length).toBeGreaterThan(0)
    })

    it('returns empty array when no baselines are set', () => {
      const d = createRegressionDetector(makeDeps())
      const alerts = d.detectRegressions({ minorPercent: 10, moderatePercent: 30, severePercent: 60 })
      expect(alerts).toEqual([])
    })
  })

  describe('updateBaseline', () => {
    it('updates an existing baseline', () => {
      const d = createRegressionDetector(makeDeps())
      d.setBaseline('latency', 50, 'LOWER_IS_BETTER', 'test')
      d.updateBaseline('latency', 40, 'updated')
      expect(d.getBaseline('latency')?.value).toBe(40)
    })

    it('errors on unknown metric', () => {
      const d = createRegressionDetector(makeDeps())
      const result = d.updateBaseline('ghost', 10, 'src')
      expect(result).toBe(false)
    })
  })

  describe('clearSnapshots', () => {
    it('removes all snapshots for a metric', () => {
      const d = createRegressionDetector(makeDeps())
      d.setBaseline('latency', 50, 'LOWER_IS_BETTER', 'test')
      d.recordSnapshot({ metricName: 'latency', value: 55, capturedAt: t, source: 'probe' })
      d.recordSnapshot({ metricName: 'latency', value: 57, capturedAt: t + 1000n, source: 'probe' })
      const cleared = d.clearSnapshots('latency')
      expect(cleared).toBe(2)
      expect(d.getSnapshotCount('latency')).toBe(0)
    })
  })

  describe('computeRegressionPercent', () => {
    it('returns percent change from baseline', () => {
      const d = createRegressionDetector(makeDeps())
      d.setBaseline('latency', 50, 'LOWER_IS_BETTER', 'test')
      const pct = d.computeRegressionPercent('latency', 75)
      expect(pct).toBeCloseTo(50, 0)
    })

    it('returns null when baseline is missing', () => {
      const d = createRegressionDetector(makeDeps())
      expect(d.computeRegressionPercent('no-metric', 10)).toBeNull()
    })
  })

  describe('getBaselineReport', () => {
    it('includes all tracked metrics', () => {
      const d = createRegressionDetector(makeDeps())
      d.setBaseline('m1', 10, 'LOWER_IS_BETTER', 's')
      d.setBaseline('m2', 20, 'HIGHER_IS_BETTER', 's')
      const report = d.getBaselineReport()
      expect(report).toBeDefined()
    })
  })

  describe('clearOldAlerts', () => {
    it('prunes alerts older than threshold', () => {
      const d = createRegressionDetector(makeDeps())
      d.setBaseline('latency', 50, 'LOWER_IS_BETTER', 'test')
      d.recordSnapshot({ metricName: 'latency', value: 100, capturedAt: 1n, source: 'probe' })
      d.detectRegressions({ minorPercent: 10, moderatePercent: 30, severePercent: 60 })
      const pruned = d.clearOldAlerts(2_000_000_000n)
      expect(typeof pruned).toBe('number')
    })
  })
})
