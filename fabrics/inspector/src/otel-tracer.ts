/**
 * OpenTelemetry Tracer Adapter — Bridges the inspector TraceCollector
 * to OpenTelemetry for distributed tracing export.
 *
 * Initialises the OTel NodeTracerProvider and exports spans via
 * OTLP/gRPC. Provides a thin wrapper that the Loom can use to
 * create spans without importing OTel directly, preserving the
 * hexagonal boundary.
 *
 * Thread: steel/inspector/otel-tracer
 * Tier: 1
 */

import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import type { Tracer, Span, SpanOptions, Context } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { resourceFromAttributes } from '@opentelemetry/resources';

// ─── Configuration ──────────────────────────────────────────────

export interface OtelTracerConfig {
  readonly serviceName: string;
  readonly serviceVersion?: string | undefined;
  readonly otlpEndpoint?: string | undefined;
  readonly batchTimeoutMs?: number | undefined;
  readonly maxExportBatchSize?: number | undefined;
}

// ─── Adapter Interface ──────────────────────────────────────────

export interface OtelTracerAdapter {
  readonly startSpan: (name: string, options?: SpanOptions) => OtelSpanHandle;
  readonly withSpan: <T>(name: string, fn: (span: OtelSpanHandle) => T) => T;
  readonly shutdown: () => Promise<void>;
}

export interface OtelSpanHandle {
  readonly setAttribute: (key: string, value: string | number | boolean) => void;
  readonly addEvent: (name: string, attributes?: Record<string, string | number | boolean>) => void;
  readonly setStatus: (code: 'ok' | 'error', message?: string) => void;
  readonly end: () => void;
  readonly context: Context;
}

// ─── Factory ────────────────────────────────────────────────────

export function createOtelTracer(config: OtelTracerConfig): OtelTracerAdapter {
  const resource = resourceFromAttributes({
    'service.name': config.serviceName,
    'service.version': config.serviceVersion ?? '0.0.0',
  });

  const exporter = new OTLPTraceExporter({
    url: config.otlpEndpoint ?? 'http://localhost:4317',
  });

  const provider = new NodeTracerProvider({
    resource,
    spanProcessors: [
      new BatchSpanProcessor(exporter, {
        scheduledDelayMillis: config.batchTimeoutMs ?? 5000,
        maxExportBatchSize: config.maxExportBatchSize ?? 512,
      }),
    ],
  });

  provider.register();

  const tracer: Tracer = trace.getTracer(config.serviceName, config.serviceVersion);

  return {
    startSpan: (name, options) => wrapSpan(tracer.startSpan(name, options)),
    withSpan: (name, fn) => {
      const span = tracer.startSpan(name);
      const ctx = trace.setSpan(context.active(), span);
      try {
        return context.with(ctx, () => fn(wrapSpan(span)));
      } finally {
        span.end();
      }
    },
    shutdown: () => provider.shutdown(),
  };
}

// ─── Span Wrapper ───────────────────────────────────────────────

function wrapSpan(span: Span): OtelSpanHandle {
  return {
    setAttribute: (key, value) => span.setAttribute(key, value),
    addEvent: (name, attributes) => span.addEvent(name, attributes),
    setStatus: (code, message) => {
      span.setStatus({
        code: code === 'ok' ? SpanStatusCode.OK : SpanStatusCode.ERROR,
        message,
      });
    },
    end: () => span.end(),
    context: trace.setSpan(context.active(), span),
  };
}
