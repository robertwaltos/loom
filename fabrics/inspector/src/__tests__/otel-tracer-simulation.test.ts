import { beforeEach, describe, expect, it, vi } from 'vitest';

const otelState = vi.hoisted(() => ({
  exporterUrls: [] as string[],
  batchConfigs: [] as Array<{ scheduledDelayMillis: number; maxExportBatchSize: number }>,
  providerRegisters: 0,
  providerShutdowns: 0,
  tracerCalls: [] as Array<{ serviceName: string; serviceVersion: string | undefined }>,
  startedSpanNames: [] as string[],
  spanAttributes: [] as Array<{ key: string; value: string | number | boolean }>,
  spanEvents: [] as Array<{ name: string; attributes?: Record<string, string | number | boolean> }>,
  spanStatuses: [] as Array<{ code: number; message?: string }>,
  spanEnds: 0,
  contextWithCalls: [] as Array<Record<string, unknown>>,
  resources: [] as Array<Record<string, string>>,
}));

vi.mock('@opentelemetry/api', () => {
  const SpanStatusCode = {
    OK: 1,
    ERROR: 2,
  } as const;

  interface FakeSpan {
    setAttribute: (key: string, value: string | number | boolean) => void;
    addEvent: (name: string, attributes?: Record<string, string | number | boolean>) => void;
    setStatus: (status: { code: number; message?: string }) => void;
    end: () => void;
  }

  const trace = {
    getTracer: (serviceName: string, serviceVersion?: string) => {
      otelState.tracerCalls.push({ serviceName, serviceVersion });
      return {
        startSpan: (name: string): FakeSpan => {
          otelState.startedSpanNames.push(name);
          return {
            setAttribute: (key, value) => {
              otelState.spanAttributes.push({ key, value });
            },
            addEvent: (eventName, attributes) => {
              otelState.spanEvents.push({ name: eventName, attributes });
            },
            setStatus: status => {
              otelState.spanStatuses.push(status);
            },
            end: () => {
              otelState.spanEnds += 1;
            },
          };
        },
      };
    },
    setSpan: (ctx: Record<string, unknown>, _span: FakeSpan) => ({ ...ctx, bound: true }),
  };

  const context = {
    active: () => ({ active: true } as Record<string, unknown>),
    with: <T>(ctx: Record<string, unknown>, fn: () => T): T => {
      otelState.contextWithCalls.push(ctx);
      return fn();
    },
  };

  return {
    trace,
    context,
    SpanStatusCode,
  };
});

vi.mock('@opentelemetry/sdk-trace-node', () => {
  class BatchSpanProcessor {
    constructor(_exporter: unknown, config: { scheduledDelayMillis: number; maxExportBatchSize: number }) {
      otelState.batchConfigs.push(config);
    }
  }

  class NodeTracerProvider {
    constructor(_config: { resource: unknown; spanProcessors: unknown[] }) {}

    register(): void {
      otelState.providerRegisters += 1;
    }

    async shutdown(): Promise<void> {
      otelState.providerShutdowns += 1;
    }
  }

  return {
    BatchSpanProcessor,
    NodeTracerProvider,
  };
});

vi.mock('@opentelemetry/exporter-trace-otlp-grpc', () => {
  class OTLPTraceExporter {
    constructor(config: { url: string }) {
      otelState.exporterUrls.push(config.url);
    }
  }

  return {
    OTLPTraceExporter,
  };
});

vi.mock('@opentelemetry/resources', () => ({
  resourceFromAttributes: (attributes: Record<string, string>) => {
    otelState.resources.push(attributes);
    return { attributes };
  },
}));

import { createOtelTracer } from '../otel-tracer.js';

describe('OTel Tracer Simulation', () => {
  beforeEach(() => {
    otelState.exporterUrls.length = 0;
    otelState.batchConfigs.length = 0;
    otelState.providerRegisters = 0;
    otelState.providerShutdowns = 0;
    otelState.tracerCalls.length = 0;
    otelState.startedSpanNames.length = 0;
    otelState.spanAttributes.length = 0;
    otelState.spanEvents.length = 0;
    otelState.spanStatuses.length = 0;
    otelState.spanEnds = 0;
    otelState.contextWithCalls.length = 0;
    otelState.resources.length = 0;
  });

  it('initializes exporter, batch processor, provider register, and tracer with config values', () => {
    createOtelTracer({
      serviceName: 'inspector-service',
      serviceVersion: '2.4.0',
      otlpEndpoint: 'http://collector:4317',
      batchTimeoutMs: 1500,
      maxExportBatchSize: 128,
    });

    expect(otelState.exporterUrls).toEqual(['http://collector:4317']);
    expect(otelState.batchConfigs).toEqual([{ scheduledDelayMillis: 1500, maxExportBatchSize: 128 }]);
    expect(otelState.providerRegisters).toBe(1);
    expect(otelState.tracerCalls).toEqual([{ serviceName: 'inspector-service', serviceVersion: '2.4.0' }]);
    expect(otelState.resources[0]).toEqual({ 'service.name': 'inspector-service', 'service.version': '2.4.0' });
  });

  it('wraps startSpan operations and maps status values to OTel codes', () => {
    const adapter = createOtelTracer({ serviceName: 'inspector-service' });

    const span = adapter.startSpan('matchmaking.lookup');
    span.setAttribute('queue.size', 42);
    span.addEvent('cache_miss', { region: 'eu-west', retries: 1 });
    span.setStatus('error', 'timeout');
    span.end();

    expect(otelState.startedSpanNames).toEqual(['matchmaking.lookup']);
    expect(otelState.spanAttributes).toEqual([{ key: 'queue.size', value: 42 }]);
    expect(otelState.spanEvents).toEqual([{ name: 'cache_miss', attributes: { region: 'eu-west', retries: 1 } }]);
    expect(otelState.spanStatuses).toEqual([{ code: 2, message: 'timeout' }]);
    expect(otelState.spanEnds).toBe(1);
    expect(typeof span.context).toBe('object');
  });

  it('runs withSpan inside active context and always ends the span', () => {
    const adapter = createOtelTracer({ serviceName: 'inspector-service' });

    const result = adapter.withSpan('economy.compute', wrapped => {
      wrapped.setStatus('ok');
      return 'done';
    });

    expect(result).toBe('done');
    expect(otelState.startedSpanNames).toContain('economy.compute');
    expect(otelState.contextWithCalls.length).toBe(1);
    expect(otelState.spanStatuses).toContainEqual({ code: 1, message: undefined });
    expect(otelState.spanEnds).toBe(1);
  });

  it('ends spans even when withSpan callback throws', () => {
    const adapter = createOtelTracer({ serviceName: 'inspector-service' });

    expect(() => {
      adapter.withSpan('failing.flow', () => {
        throw new Error('boom');
      });
    }).toThrow('boom');

    expect(otelState.startedSpanNames).toContain('failing.flow');
    expect(otelState.spanEnds).toBe(1);
  });

  it('delegates shutdown to provider shutdown', async () => {
    const adapter = createOtelTracer({ serviceName: 'inspector-service' });

    await adapter.shutdown();

    expect(otelState.providerShutdowns).toBe(1);
  });
});
