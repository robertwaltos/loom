/**
 * Sample Plugin 4 — Combat Logger
 *
 * Demonstrates how to observe COMBAT events and aggregate per-session
 * statistics. Publishes a custom summary event after every 10 combat
 * events to enable external analytics dashboards.
 *
 * Register with: `registerCombatLoggerPlugin(sdk, worldId)`
 */

import type { ModdingSdk, WorldEvent } from '../index.js';

const MOD_ID = 'sample:combat-logger';
const MOD_VERSION = '1.0.0';
const FLUSH_INTERVAL = 10;

function buildCombatHandler(sdk: ModdingSdk, worldId: string) {
  let count = 0;
  return (event: WorldEvent): void => {
    count++;
    if (count % FLUSH_INTERVAL === 0) {
      sdk.emit({
        eventType: `${MOD_ID}:combat-batch`,
        payload: { batchSize: FLUSH_INTERVAL, lastEntityId: event.entityId ?? 'unknown', totalSeen: count },
        worldId,
      });
    }
  };
}

export function registerCombatLoggerPlugin(sdk: ModdingSdk, worldId: string): void {
  const result = sdk.registerMod({
    modId: MOD_ID,
    version: MOD_VERSION,
    hooks: [
      {
        hookId: 'combat:on-event',
        category: 'ENTITY_DEATH',
        description: 'Aggregates combat events; publishes batch summary every 10 events.',
        handler: buildCombatHandler(sdk, worldId),
      },
    ],
    npcs: [],
    quests: [],
  });

  if (typeof result === 'object' && 'code' in result) {
    throw new Error(`[${MOD_ID}] registration failed: ${result.code}`);
  }
}
