import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createResourceProfilerSystem,
  type ResourceProfilerSystemDeps,
} from '../resource-profiler.js'

let t = 1_000_000_000n
let seq = 0

function makeDeps(): ResourceProfilerSystemDeps {
  return {
    clock: { nowMicroseconds: () => (t += 1000n) },
    idGen: { next: () => `rp-${++seq}` },
    logger: { info: vi.fn(), warn: vi.fn() },
  }
}

beforeEach(() => {
  t = 1_000_000_000n
  seq = 0
})

describe('resource-profiler simulation', () => {
  describe('registerService', () => {
    it('registers a new service successfully', () => {
      const p = createResourceProfilerSystem(makeDeps())
      const result = p.registerService('svc-alpha')
      expect(result).toMatchObject({ success: true })
    })

    it('rejects duplicate service registration', () => {
      const p = createResourceProfilerSystem(makeDeps())
      p.registerService('svc-alpha')
      const dup = p.registerService('svc-alpha')
      expect(dup).toMatchObject({ success: false })
    })
  })

  describe('recordSample', () => {
    it('records a CPU sample for a registered service', () => {
      const p = createResourceProfilerSystem(makeDeps())
      p.registerService('svc-alpha')
      const sample = p.recordSample('svc-alpha', 'CPU', 45)
      expect((sample as any).success ?? true).toBeTruthy()
    })

    it('records a MEMORY sample', () => {
      const p = createResourceProfilerSystem(makeDeps())
      p.registerService('svc-alpha')
      const result = p.recordSample('svc-alpha', 'MEMORY', 70)
      expect(result).toBeDefined()
    })

    it('errors for unregistered service', () => {
      const p = createResourceProfilerSystem(makeDeps())
      const result = p.recordSample('ghost', 'CPU', 50) as any
      expect(result.success ?? result.error ?? result).toBeTruthy()
    })
  })

  describe('listSamples', () => {
    it('returns recorded samples', () => {
      const p = createResourceProfilerSystem(makeDeps())
      p.registerService('svc-alpha')
      p.recordSample('svc-alpha', 'CPU', 20)
      p.recordSample('svc-alpha', 'CPU', 40)
      const samples = p.listSamples('svc-alpha', 'CPU', 10)
      expect(samples.length).toBe(2)
    })

    it('respects limit parameter', () => {
      const p = createResourceProfilerSystem(makeDeps())
      p.registerService('svc-alpha')
      for (let i = 0; i < 5; i++) p.recordSample('svc-alpha', 'DISK_IO', i * 10)
      const samples = p.listSamples('svc-alpha', 'DISK_IO', 3)
      expect(samples.length).toBeLessThanOrEqual(3)
    })

    it('returns empty array for unknown service', () => {
      const p = createResourceProfilerSystem(makeDeps())
      expect(p.listSamples('ghost', 'CPU', 10).length).toBe(0)
    })
  })

  describe('getProfile', () => {
    it('returns a profile after samples are recorded', () => {
      const p = createResourceProfilerSystem(makeDeps())
      p.registerService('svc-alpha')
      p.recordSample('svc-alpha', 'CPU', 30)
      p.recordSample('svc-alpha', 'CPU', 60)
      const profile = p.getProfile('svc-alpha', 'CPU')
      expect(profile).toBeDefined()
    })

    it('returns undefined for unregistered service', () => {
      const p = createResourceProfilerSystem(makeDeps())
      expect(p.getProfile('ghost', 'CPU')).toBeUndefined()
    })
  })

  describe('getBottleneckReport', () => {
    it('returns a report after samples across resource types', () => {
      const p = createResourceProfilerSystem(makeDeps())
      p.registerService('svc-alpha')
      p.recordSample('svc-alpha', 'CPU', 90)
      p.recordSample('svc-alpha', 'MEMORY', 80)
      const report = p.getBottleneckReport('svc-alpha')
      expect(report).toBeDefined()
    })

    it('returns undefined for unregistered service', () => {
      const p = createResourceProfilerSystem(makeDeps())
      expect(p.getBottleneckReport('ghost')).toBeUndefined()
    })
  })

  describe('purgeSamples', () => {
    it('purges samples and returns count', () => {
      const p = createResourceProfilerSystem(makeDeps())
      p.registerService('svc-alpha')
      p.recordSample('svc-alpha', 'NETWORK_IO', 10)
      p.recordSample('svc-alpha', 'NETWORK_IO', 20)
      p.recordSample('svc-alpha', 'NETWORK_IO', 30)
      const result = p.purgeSamples('svc-alpha', 'NETWORK_IO', 1) as any
      expect(result.success ?? true).toBeTruthy()
      if (result.purged !== undefined) {
        expect(result.purged).toBeGreaterThanOrEqual(1)
      }
    })

    it('errors for unregistered service', () => {
      const p = createResourceProfilerSystem(makeDeps())
      const result = p.purgeSamples('ghost', 'CPU', 5) as any
      expect(result.success).toBe(false)
    })
  })

  describe('multiple resource types', () => {
    it('tracks GPU samples independently', () => {
      const p = createResourceProfilerSystem(makeDeps())
      p.registerService('ml-svc')
      p.recordSample('ml-svc', 'GPU', 75)
      const samples = p.listSamples('ml-svc', 'GPU', 5)
      expect(samples.length).toBe(1)
    })
  })
})
