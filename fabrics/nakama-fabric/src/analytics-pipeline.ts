export type AnalyticsEventType =
  | 'game_start'
  | 'game_end'
  | 'world_enter'
  | 'world_exit'
  | 'player_death'
  | 'economy_tx'
  | 'achievement_unlock'
  | 'chronicle_submit'
  | 'support_report'
  | 'auth_register'
  | 'auth_login'
  | 'matchmaking_join'
  | 'matchmaking_match'
  | 'error_occurred';

export interface AnalyticsEvent {
  readonly eventId: string;
  readonly eventType: AnalyticsEventType;
  readonly playerId: string | null;
  readonly worldId: string | null;
  readonly sessionId: string | null;
  readonly properties: Readonly<Record<string, string | number | boolean>>;
  readonly serverTime: string;
}

export type AnalyticsSink = (events: ReadonlyArray<AnalyticsEvent>) => Promise<void> | void;

export interface AnalyticsPipeline {
  /** Track an event. Batches internally. */
  track(
    eventType: AnalyticsEventType,
    playerId: string | null,
    properties?: Record<string, string | number | boolean>,
    context?: { worldId?: string; sessionId?: string },
  ): void;
  /** Add a sink to receive flushed batches. */
  addSink(sink: AnalyticsSink): void;
  /** Flush all buffered events to all sinks. */
  flush(): Promise<void>;
  /** Current buffer size. */
  pendingCount(): number;
  /** Events tracked since creation. */
  totalTracked(): number;
}

export interface AnalyticsPipelineConfig {
  readonly batchSize?: number;
  readonly flushIntervalMs?: number;
  readonly idGenerator?: () => string;
  readonly clock?: { now(): string };
}

function makeCounterIdGenerator(): () => string {
  let n = 0;
  return (): string => {
    n += 1;
    return `event-${n}`;
  };
}

const systemClock: { now(): string } = {
  now: (): string => new Date().toISOString(),
};

export function createAnalyticsPipeline(config?: AnalyticsPipelineConfig): AnalyticsPipeline {
  const batchSize: number = config?.batchSize ?? 50;
  const idGen: () => string = config?.idGenerator ?? makeCounterIdGenerator();
  const clock: { now(): string } = config?.clock ?? systemClock;

  const sinks: AnalyticsSink[] = [];
  let buffer: AnalyticsEvent[] = [];
  let total = 0;

  function dispatchFireAndForget(batch: ReadonlyArray<AnalyticsEvent>): void {
    for (const sink of sinks) {
      try {
        const r = sink(batch);
        if (r instanceof Promise) {
          r.catch((err: unknown) => {
            console.error('Analytics sink error:', err);
          });
        }
      } catch (err) {
        console.error('Analytics sink error:', err);
      }
    }
  }

  async function dispatchAndAwait(batch: ReadonlyArray<AnalyticsEvent>): Promise<void> {
    await Promise.all(
      sinks.map(async (sink) => {
        try {
          await sink(batch);
        } catch (err) {
          console.error('Analytics sink error:', err);
        }
      }),
    );
  }

  return {
    track(eventType, playerId, properties, context): void {
      const propsSnapshot: Record<string, string | number | boolean> =
        properties !== undefined ? { ...properties } : {};
      buffer.push({
        eventId: idGen(),
        eventType,
        playerId,
        worldId: context?.worldId ?? null,
        sessionId: context?.sessionId ?? null,
        properties: Object.freeze(propsSnapshot),
        serverTime: clock.now(),
      });
      total += 1;
      if (buffer.length >= batchSize) {
        const batch = buffer;
        buffer = [];
        dispatchFireAndForget(batch);
      }
    },

    addSink(sink): void {
      sinks.push(sink);
    },

    async flush(): Promise<void> {
      if (buffer.length === 0) return;
      const batch = buffer;
      buffer = [];
      await dispatchAndAwait(batch);
    },

    pendingCount(): number {
      return buffer.length;
    },

    totalTracked(): number {
      return total;
    },
  };
}
