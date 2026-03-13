/**
 * Sample Plugin 1 — Weather Events Logger
 *
 * Demonstrates how to hook into WEATHER world events and react to
 * dynamic weather changes. Publishes a custom analytics event on
 * each severe weather occurrence.
 *
 * Register with: `registerWeatherEventsPlugin(sdk, worldId)`
 */

import type { ModdingSdk, WorldEvent, CustomEventDef } from '../index.js';

const MOD_ID = 'sample:weather-events';
const MOD_VERSION = '1.0.0';

function isSevere(payload: Readonly<Record<string, unknown>>): boolean {
  return payload['intensity'] === 'severe' || payload['intensity'] === 'catastrophic';
}

function buildSevereAlert(event: WorldEvent): CustomEventDef {
  return {
    eventType: `${MOD_ID}:severe-weather-alert`,
    payload: { sourceEventId: event.entityId, worldId: event.worldId, intensity: event.payload['intensity'] },
    worldId: event.worldId,
  };
}

export function registerWeatherEventsPlugin(sdk: ModdingSdk, worldId: string): void {
  const result = sdk.registerMod({
    modId: MOD_ID,
    version: MOD_VERSION,
    hooks: [
      {
        hookId: 'weather:on-change',
        category: 'SEASON_CHANGE',
        description: 'Fires on every weather change; publishes alert on severe events.',
        handler: (event: WorldEvent) => {
          if (isSevere(event.payload)) sdk.emit(buildSevereAlert(event));
        },
      },
    ],
    npcs: [],
    quests: [],
  });

  if (typeof result === 'object' && 'code' in result) {
    throw new Error(`[${MOD_ID}] registration failed: ${result.code}`);
  }

  void worldId;
}
