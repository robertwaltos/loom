import { describe, it, expect } from 'vitest';
import { createCoherenceMonitor } from '../coherence-monitor.js';
import type { CoherenceMonitorDeps } from '../coherence-monitor.js';

function makeDeps(): CoherenceMonitorDeps {
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
  };
}

describe('CoherenceMonitor — registration', () => {
  it('registers a subject', () => {
    const monitor = createCoherenceMonitor(makeDeps());
    expect(monitor.register({ subjectId: 'lock-1', label: 'Lock Alpha' })).toBe(true);
    expect(monitor.getStats().totalSubjects).toBe(1);
  });

  it('rejects duplicate registration', () => {
    const monitor = createCoherenceMonitor(makeDeps());
    monitor.register({ subjectId: 'lock-1', label: 'Lock Alpha' });
    expect(monitor.register({ subjectId: 'lock-1', label: 'Lock Alpha' })).toBe(false);
  });

  it('unregisters a subject', () => {
    const monitor = createCoherenceMonitor(makeDeps());
    monitor.register({ subjectId: 'lock-1', label: 'Lock Alpha' });
    expect(monitor.unregister('lock-1')).toBe(true);
    expect(monitor.getStats().totalSubjects).toBe(0);
  });

  it('returns false for unknown unregister', () => {
    const monitor = createCoherenceMonitor(makeDeps());
    expect(monitor.unregister('unknown')).toBe(false);
  });
});

describe('CoherenceMonitor — sample recording', () => {
  it('records a nominal sample without alert', () => {
    const monitor = createCoherenceMonitor(makeDeps());
    monitor.register({ subjectId: 's1', label: 'S1' });
    const alert = monitor.recordSample({ subjectId: 's1', value: 0.9 });
    expect(alert).toBeUndefined();
    expect(monitor.getStats().totalSamples).toBe(1);
  });

  it('returns alert for degraded sample', () => {
    const monitor = createCoherenceMonitor(makeDeps());
    monitor.register({ subjectId: 's1', label: 'S1' });
    const alert = monitor.recordSample({ subjectId: 's1', value: 0.5 });
    expect(alert).toBeDefined();
    expect(alert?.level).toBe('degraded');
  });

  it('returns alert for critical sample', () => {
    const monitor = createCoherenceMonitor(makeDeps());
    monitor.register({ subjectId: 's1', label: 'S1' });
    const alert = monitor.recordSample({ subjectId: 's1', value: 0.2 });
    expect(alert?.level).toBe('critical');
  });

  it('returns alert for failed sample', () => {
    const monitor = createCoherenceMonitor(makeDeps());
    monitor.register({ subjectId: 's1', label: 'S1' });
    const alert = monitor.recordSample({ subjectId: 's1', value: 0.05 });
    expect(alert?.level).toBe('failed');
  });

  it('returns undefined for unknown subject', () => {
    const monitor = createCoherenceMonitor(makeDeps());
    const alert = monitor.recordSample({ subjectId: 'unknown', value: 0.5 });
    expect(alert).toBeUndefined();
  });
});

describe('CoherenceMonitor — queries', () => {
  it('gets subject with samples', () => {
    const monitor = createCoherenceMonitor(makeDeps());
    monitor.register({ subjectId: 's1', label: 'S1' });
    monitor.recordSample({ subjectId: 's1', value: 0.8 });
    const subject = monitor.getSubject('s1');
    expect(subject?.label).toBe('S1');
    expect(subject?.samples).toHaveLength(1);
  });

  it('returns undefined for unknown subject', () => {
    const monitor = createCoherenceMonitor(makeDeps());
    expect(monitor.getSubject('unknown')).toBeUndefined();
  });

  it('gets current level', () => {
    const monitor = createCoherenceMonitor(makeDeps());
    monitor.register({ subjectId: 's1', label: 'S1' });
    monitor.recordSample({ subjectId: 's1', value: 0.3 });
    expect(monitor.getLevel('s1')).toBe('critical');
  });

  it('returns nominal for subject with no samples', () => {
    const monitor = createCoherenceMonitor(makeDeps());
    monitor.register({ subjectId: 's1', label: 'S1' });
    expect(monitor.getLevel('s1')).toBe('nominal');
  });

  it('gets latest value', () => {
    const monitor = createCoherenceMonitor(makeDeps());
    monitor.register({ subjectId: 's1', label: 'S1' });
    monitor.recordSample({ subjectId: 's1', value: 0.6 });
    monitor.recordSample({ subjectId: 's1', value: 0.4 });
    expect(monitor.getLatestValue('s1')).toBe(0.4);
  });

  it('returns undefined value for unknown subject', () => {
    const monitor = createCoherenceMonitor(makeDeps());
    expect(monitor.getLatestValue('unknown')).toBeUndefined();
  });
});

describe('CoherenceMonitor — level filtering', () => {
  it('lists subjects by level', () => {
    const monitor = createCoherenceMonitor(makeDeps());
    monitor.register({ subjectId: 's1', label: 'S1' });
    monitor.register({ subjectId: 's2', label: 'S2' });
    monitor.register({ subjectId: 's3', label: 'S3' });
    monitor.recordSample({ subjectId: 's1', value: 0.9 });
    monitor.recordSample({ subjectId: 's2', value: 0.3 });
    monitor.recordSample({ subjectId: 's3', value: 0.5 });
    expect(monitor.listByLevel('nominal')).toHaveLength(1);
    expect(monitor.listByLevel('critical')).toHaveLength(1);
    expect(monitor.listByLevel('degraded')).toHaveLength(1);
  });

  it('includes no-sample subjects as nominal', () => {
    const monitor = createCoherenceMonitor(makeDeps());
    monitor.register({ subjectId: 's1', label: 'S1' });
    expect(monitor.listByLevel('nominal')).toHaveLength(1);
  });
});

describe('CoherenceMonitor — alerts and stats', () => {
  it('accumulates alerts', () => {
    const monitor = createCoherenceMonitor(makeDeps());
    monitor.register({ subjectId: 's1', label: 'S1' });
    monitor.recordSample({ subjectId: 's1', value: 0.5 });
    monitor.recordSample({ subjectId: 's1', value: 0.2 });
    expect(monitor.getAlerts()).toHaveLength(2);
  });

  it('starts with zero stats', () => {
    const monitor = createCoherenceMonitor(makeDeps());
    const stats = monitor.getStats();
    expect(stats.totalSubjects).toBe(0);
    expect(stats.totalSamples).toBe(0);
    expect(stats.totalAlerts).toBe(0);
  });

  it('tracks aggregate stats', () => {
    const monitor = createCoherenceMonitor(makeDeps());
    monitor.register({ subjectId: 's1', label: 'S1' });
    monitor.register({ subjectId: 's2', label: 'S2' });
    monitor.recordSample({ subjectId: 's1', value: 0.9 });
    monitor.recordSample({ subjectId: 's2', value: 0.3 });
    const stats = monitor.getStats();
    expect(stats.totalSubjects).toBe(2);
    expect(stats.totalSamples).toBe(2);
    expect(stats.totalAlerts).toBe(1);
    expect(stats.subjectsByLevel.nominal).toBe(1);
    expect(stats.subjectsByLevel.critical).toBe(1);
  });

  it('respects max samples config', () => {
    const monitor = createCoherenceMonitor(makeDeps(), { maxSamples: 3 });
    monitor.register({ subjectId: 's1', label: 'S1' });
    for (let i = 0; i < 5; i++) {
      monitor.recordSample({ subjectId: 's1', value: 0.9 });
    }
    const subject = monitor.getSubject('s1');
    expect(subject?.samples).toHaveLength(3);
  });
});
