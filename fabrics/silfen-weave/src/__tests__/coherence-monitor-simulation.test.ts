import { describe, expect, it } from 'vitest';
import { createCoherenceMonitor, type CoherenceMonitorDeps } from '../coherence-monitor.js';

function makeDeps(): CoherenceMonitorDeps {
  let now = 1_000_000;
  return {
    clock: {
      nowMicroseconds: () => {
        now += 10_000;
        return now;
      },
    },
  };
}

describe('coherence-monitor simulation', () => {
  it('tracks mixed health and aggregates alerts by severity', () => {
    const monitor = createCoherenceMonitor(makeDeps());
    monitor.register({ subjectId: 'corridor-a', label: 'Corridor A' });
    monitor.register({ subjectId: 'corridor-b', label: 'Corridor B' });
    monitor.register({ subjectId: 'corridor-c', label: 'Corridor C' });

    monitor.recordSample({ subjectId: 'corridor-a', value: 0.93 });
    monitor.recordSample({ subjectId: 'corridor-b', value: 0.35 });
    monitor.recordSample({ subjectId: 'corridor-c', value: 0.08 });

    const stats = monitor.getStats();
    expect(stats.totalSubjects).toBe(3);
    expect(stats.totalAlerts).toBe(2);
    expect(stats.subjectsByLevel.nominal).toBe(1);
    expect(stats.subjectsByLevel.critical).toBe(1);
    expect(stats.subjectsByLevel.failed).toBe(1);
  });

  it('retains only configured number of samples per subject', () => {
    const monitor = createCoherenceMonitor(makeDeps(), { maxSamples: 2 });
    monitor.register({ subjectId: 'lock-1', label: 'Lock 1' });
    monitor.recordSample({ subjectId: 'lock-1', value: 0.9 });
    monitor.recordSample({ subjectId: 'lock-1', value: 0.8 });
    monitor.recordSample({ subjectId: 'lock-1', value: 0.7 });

    const subject = monitor.getSubject('lock-1');
    expect(subject?.samples).toHaveLength(2);
    expect(subject?.samples[0]?.value).toBe(0.8);
    expect(monitor.getLatestValue('lock-1')).toBe(0.7);
  });
});
