/**
 * Sample Plugin 5 — Seasonal Festival Events
 *
 * Demonstrates how to publish periodic custom events that trigger a
 * seasonal festival in the world. Hooks into WORLD lifecycle events
 * (TICK equivalent) to detect the start of each in-game season and
 * fire a `festival:season-start` custom event.
 *
 * Register with: `registerFestivalEventsPlugin(sdk, worldId)`
 */

import type { ModdingSdk, WorldEvent } from '../index.js';

const MOD_ID = 'sample:festival-events';
const MOD_VERSION = '1.0.0';

type Season = 'spring' | 'summer' | 'autumn' | 'winter';

function detectSeason(payload: Readonly<Record<string, unknown>>): Season | null {
  const month = payload['gameMonth'];
  if (typeof month !== 'number') return null;
  if (month >= 1 && month <= 3) return 'spring';
  if (month >= 4 && month <= 6) return 'summer';
  if (month >= 7 && month <= 9) return 'autumn';
  if (month >= 10 && month <= 12) return 'winter';
  return null;
}

function buildFestivalHandler(sdk: ModdingSdk, worldId: string) {
  let lastSeason: Season | null = null;
  return (event: WorldEvent): void => {
    const season = detectSeason(event.payload);
    if (season === null || season === lastSeason) return;
    lastSeason = season;
    sdk.emit({
      eventType: `${MOD_ID}:festival-season-start`,
      payload: { season, worldId, triggeredBy: event.entityId ?? 'world-clock' },
      worldId,
    });
  };
}

export function registerFestivalEventsPlugin(sdk: ModdingSdk, worldId: string): void {
  const result = sdk.registerMod({
    modId: MOD_ID,
    version: MOD_VERSION,
    hooks: [
      {
        hookId: 'festival:on-world-tick',
        category: 'WORLD_TICK',
        description: 'Detects season changes and fires festival:season-start events.',
        handler: buildFestivalHandler(sdk, worldId),
      },
    ],
    npcs: [],
    quests: [],
  });

  if (typeof result === 'object' && 'code' in result) {
    throw new Error(`[${MOD_ID}] registration failed: ${result.code}`);
  }
}
