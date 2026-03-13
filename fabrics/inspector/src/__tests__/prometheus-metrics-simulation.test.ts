import { beforeEach, describe, expect, it, vi } from 'vitest';

const promState = vi.hoisted(() => ({
  collectDefaultMetricsCalls: [] as Array<{ register: unknown; prefix: string }>,
  counterConfigs: [] as Array<{ name: string; help: string; labelNames: string[]; registers: unknown[] }>,
  gaugeConfigs: [] as Array<{ name: string; help: string; labelNames: string[]; registers: unknown[] }>,
  histogramConfigs: [] as Array<{ name: string; help: string; buckets: number[]; labelNames: string[]; registers: unknown[] }>,
  counterIncCalls: [] as number[],
  counterLabelCalls: [] as Record<string, string>[],
  counterLabelIncCalls: [] as number[],
  gaugeSetCalls: [] as number[],
  gaugeIncCalls: [] as number[],
  gaugeDecCalls: [] as number[],
  gaugeLabelCalls: [] as Record<string, string>[],
  gaugeLabelSetCalls: [] as number[],
  gaugeLabelIncCalls: [] as number[],
  gaugeLabelDecCalls: [] as number[],
  histogramObserveCalls: [] as number[],
  histogramLabelCalls: [] as Record<string, string>[],
  histogramLabelObserveCalls: [] as number[],
  defaultLabels: [] as Array<Record<string, string>>,
}));

vi.mock('prom-client', () => {
  class Registry {
    public readonly contentType = 'text/plain; version=0.0.4';

    setDefaultLabels(labels: Record<string, string>): void {
      promState.defaultLabels.push(labels);
    }

    async metrics(): Promise<string> {
      return 'mock_metrics 1\n';
    }
  }

  class Counter {
    constructor(config: { name: string; help: string; labelNames: string[]; registers: unknown[] }) {
      promState.counterConfigs.push(config);
    }

    inc(value = 1): void {
      promState.counterIncCalls.push(value);
    }

    labels(labels: Record<string, string>): { inc: (value?: number) => void } {
      promState.counterLabelCalls.push(labels);
      return {
        inc: (value = 1) => {
          promState.counterLabelIncCalls.push(value);
        },
      };
    }
  }

  class Gauge {
    constructor(config: { name: string; help: string; labelNames: string[]; registers: unknown[] }) {
      promState.gaugeConfigs.push(config);
    }

    set(value: number): void {
      promState.gaugeSetCalls.push(value);
    }

    inc(value = 1): void {
      promState.gaugeIncCalls.push(value);
    }

    dec(value = 1): void {
      promState.gaugeDecCalls.push(value);
    }

    labels(labels: Record<string, string>): {
      set: (value: number) => void;
      inc: (value?: number) => void;
      dec: (value?: number) => void;
    } {
      promState.gaugeLabelCalls.push(labels);
      return {
        set: (value: number) => {
          promState.gaugeLabelSetCalls.push(value);
        },
        inc: (value = 1) => {
          promState.gaugeLabelIncCalls.push(value);
        },
        dec: (value = 1) => {
          promState.gaugeLabelDecCalls.push(value);
        },
      };
    }
  }

  class Histogram {
    constructor(config: { name: string; help: string; buckets: number[]; labelNames: string[]; registers: unknown[] }) {
      promState.histogramConfigs.push(config);
    }

    observe(value: number): void {
      promState.histogramObserveCalls.push(value);
    }

    labels(labels: Record<string, string>): { observe: (value: number) => void } {
      promState.histogramLabelCalls.push(labels);
      return {
        observe: (value: number) => {
          promState.histogramLabelObserveCalls.push(value);
        },
      };
    }
  }

  return {
    Registry,
    Counter,
    Gauge,
    Histogram,
    collectDefaultMetrics: (args: { register: unknown; prefix: string }) => {
      promState.collectDefaultMetricsCalls.push(args);
    },
  };
});

import { createPrometheusAdapter } from '../prometheus-metrics.js';

describe('Prometheus Metrics Simulation', () => {
  beforeEach(() => {
    promState.collectDefaultMetricsCalls.length = 0;
    promState.counterConfigs.length = 0;
    promState.gaugeConfigs.length = 0;
    promState.histogramConfigs.length = 0;
    promState.counterIncCalls.length = 0;
    promState.counterLabelCalls.length = 0;
    promState.counterLabelIncCalls.length = 0;
    promState.gaugeSetCalls.length = 0;
    promState.gaugeIncCalls.length = 0;
    promState.gaugeDecCalls.length = 0;
    promState.gaugeLabelCalls.length = 0;
    promState.gaugeLabelSetCalls.length = 0;
    promState.gaugeLabelIncCalls.length = 0;
    promState.gaugeLabelDecCalls.length = 0;
    promState.histogramObserveCalls.length = 0;
    promState.histogramLabelCalls.length = 0;
    promState.histogramLabelObserveCalls.length = 0;
    promState.defaultLabels.length = 0;
  });

  it('initializes registry with default labels and collects default metrics when enabled', async () => {
    const adapter = createPrometheusAdapter({
      prefix: 'inspector_',
      defaultLabels: { fabric: 'inspector', env: 'test' },
      collectDefaults: true,
    });

    const text = await adapter.metrics();

    expect(promState.defaultLabels).toEqual([{ fabric: 'inspector', env: 'test' }]);
    expect(promState.collectDefaultMetricsCalls).toHaveLength(1);
    expect(promState.collectDefaultMetricsCalls[0]?.prefix).toBe('inspector_');
    expect(adapter.contentType).toBe('text/plain; version=0.0.4');
    expect(text).toContain('mock_metrics');
  });

  it('does not collect default metrics when collectDefaults is false', () => {
    createPrometheusAdapter({ collectDefaults: false });

    expect(promState.collectDefaultMetricsCalls).toHaveLength(0);
  });

  it('creates counters and routes labeled/unlabeled increments with defaults', () => {
    const adapter = createPrometheusAdapter({ prefix: 'loom_' });
    const requests = adapter.counter('requests_total', 'Total requests', ['route']);

    requests.inc();
    requests.inc(undefined, 3);
    requests.inc({ route: '/status' }, 5);

    expect(promState.counterConfigs[0]?.name).toBe('loom_requests_total');
    expect(promState.counterConfigs[0]?.labelNames).toEqual(['route']);
    expect(promState.counterIncCalls).toEqual([1, 3]);
    expect(promState.counterLabelCalls).toEqual([{ route: '/status' }]);
    expect(promState.counterLabelIncCalls).toEqual([5]);
  });

  it('creates gauges and histograms and records all labeled and unlabeled writes', () => {
    const adapter = createPrometheusAdapter({ prefix: 'loom_' });
    const inFlight = adapter.gauge('inflight', 'In-flight operations', ['service']);
    const latency = adapter.histogram('latency_seconds', 'Latency', [0.1, 0.5, 1], ['route']);

    inFlight.set(4);
    inFlight.set(2, { service: 'matchmaker' });
    inFlight.inc(undefined, 2);
    inFlight.inc({ service: 'matchmaker' }, 3);
    inFlight.dec();
    inFlight.dec({ service: 'matchmaker' }, 2);

    latency.observe(0.2);
    latency.observe(0.9, { route: '/craft' });

    expect(promState.gaugeConfigs[0]?.name).toBe('loom_inflight');
    expect(promState.gaugeConfigs[0]?.labelNames).toEqual(['service']);
    expect(promState.histogramConfigs[0]?.buckets).toEqual([0.1, 0.5, 1]);
    expect(promState.gaugeSetCalls).toEqual([4]);
    expect(promState.gaugeLabelSetCalls).toEqual([2]);
    expect(promState.gaugeIncCalls).toEqual([2]);
    expect(promState.gaugeLabelIncCalls).toEqual([3]);
    expect(promState.gaugeDecCalls).toEqual([1]);
    expect(promState.gaugeLabelDecCalls).toEqual([2]);
    expect(promState.histogramObserveCalls).toEqual([0.2]);
    expect(promState.histogramLabelObserveCalls).toEqual([0.9]);
  });

  it('applies default latency buckets when histogram buckets are not provided', () => {
    const adapter = createPrometheusAdapter();

    adapter.histogram('op_latency', 'operation latency');

    expect(promState.histogramConfigs[0]?.buckets).toEqual([
      0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
    ]);
  });
});
