import { describe, it, expect, beforeEach } from 'vitest'
import { createUptimeMonitor } from '../uptime-monitor.js'

let t = 1_000_000
let seq = 0

function makeDeps() {
  return {
    clock: { nowMicroseconds: () => (t += 1000) },
    idGenerator: { next: () => `um-${++seq}` },
  }
}

beforeEach(() => {
  t = 1_000_000
  seq = 0
})

describe('uptime-monitor simulation', () => {
  describe('register', () => {
    it('registers a service and returns its id', () => {
      const m = createUptimeMonitor(makeDeps())
      const id = m.register({ name: 'api', heartbeatIntervalMicro: 10_000 })
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(0)
    })

    it('registers multiple services independently', () => {
      const m = createUptimeMonitor(makeDeps())
      const id1 = m.register({ name: 'api', heartbeatIntervalMicro: 10_000 })
      const id2 = m.register({ name: 'worker', heartbeatIntervalMicro: 5_000 })
      expect(id1).not.toBe(id2)
    })
  })

  describe('heartbeat', () => {
    it('returns true for a registered service', () => {
      const m = createUptimeMonitor(makeDeps())
      const id = m.register({ name: 'api', heartbeatIntervalMicro: 10_000 })
      expect(m.heartbeat(id)).toBe(true)
    })

    it('returns false for unknown service', () => {
      const m = createUptimeMonitor(makeDeps())
      expect(m.heartbeat('no-such-id')).toBe(false)
    })

    it('marks service as up after heartbeat', () => {
      const m = createUptimeMonitor(makeDeps())
      const id = m.register({ name: 'api', heartbeatIntervalMicro: 10_000 })
      m.heartbeat(id)
      const snap = m.getSnapshot(id)
      expect(snap?.state).toBe('up')
    })
  })

  describe('markDown', () => {
    it('returns true for a registered service', () => {
      const m = createUptimeMonitor(makeDeps())
      const id = m.register({ name: 'api', heartbeatIntervalMicro: 10_000 })
      expect(m.markDown(id)).toBe(true)
    })

    it('returns false for unknown service', () => {
      const m = createUptimeMonitor(makeDeps())
      expect(m.markDown('ghost')).toBe(false)
    })

    it('sets service state to down', () => {
      const m = createUptimeMonitor(makeDeps())
      const id = m.register({ name: 'api', heartbeatIntervalMicro: 10_000 })
      m.markDown(id)
      const snap = m.getSnapshot(id)
      expect(snap?.state).toBe('down')
    })
  })

  describe('getSnapshot', () => {
    it('returns snapshot for registered service', () => {
      const m = createUptimeMonitor(makeDeps())
      const id = m.register({ name: 'api', heartbeatIntervalMicro: 10_000 })
      const snap = m.getSnapshot(id)
      expect(snap).toBeDefined()
      expect(snap?.serviceId).toBe(id)
      expect(snap?.name).toBe('api')
    })

    it('returns undefined for unknown service', () => {
      const m = createUptimeMonitor(makeDeps())
      expect(m.getSnapshot('ghost')).toBeUndefined()
    })

    it('includes uptimePercent', () => {
      const m = createUptimeMonitor(makeDeps())
      const id = m.register({ name: 'api', heartbeatIntervalMicro: 10_000 })
      m.heartbeat(id)
      const snap = m.getSnapshot(id)
      expect(typeof snap?.uptimePercent).toBe('number')
    })
  })

  describe('sweep', () => {
    it('returns an array (possibly empty when services are healthy)', () => {
      const m = createUptimeMonitor(makeDeps())
      const id = m.register({ name: 'api', heartbeatIntervalMicro: 10_000 })
      m.heartbeat(id)
      const downed = m.sweep()
      expect(Array.isArray(downed)).toBe(true)
    })

    it('marks stale services as down', () => {
      const m = createUptimeMonitor(makeDeps())
      const id = m.register({ name: 'stale', heartbeatIntervalMicro: 1_000 })
      m.heartbeat(id)
      // Advance clock past heartbeat interval
      t += 100_000_000
      const downed = m.sweep()
      expect(Array.isArray(downed)).toBe(true)
      // Service should be downed or already in down state
      const snap = m.getSnapshot(id)
      expect(snap?.state).toBe('down')
    })
  })

  describe('getStats', () => {
    it('reflects registered services', () => {
      const m = createUptimeMonitor(makeDeps())
      m.register({ name: 'api', heartbeatIntervalMicro: 10_000 })
      m.register({ name: 'worker', heartbeatIntervalMicro: 5_000 })
      const stats = m.getStats()
      expect(stats.totalServices).toBe(2)
    })

    it('counts up and down services', () => {
      const m = createUptimeMonitor(makeDeps())
      const id1 = m.register({ name: 'api', heartbeatIntervalMicro: 10_000 })
      const id2 = m.register({ name: 'worker', heartbeatIntervalMicro: 5_000 })
      m.heartbeat(id1)
      m.markDown(id2)
      const stats = m.getStats()
      expect(stats.upCount).toBeGreaterThanOrEqual(1)
      expect(stats.downCount).toBeGreaterThanOrEqual(1)
    })
  })
})
