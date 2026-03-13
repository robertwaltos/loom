/**
 * samples/index.ts — Re-exports all 5 Loom Modding SDK sample plugins.
 *
 * Each plugin demonstrates a different SDK capability:
 *  1. weather-events   — WEATHER hooks + custom event emit
 *  2. traveling-merchant — custom NPC with dialogue tree
 *  3. treasure-hunt    — multi-step quest template (FETCH/INVESTIGATE/DELIVER)
 *  4. combat-logger    — COMBAT aggregation + analytics events
 *  5. festival-events  — WORLD tick hooks + season detection
 */

export { registerWeatherEventsPlugin } from './weather-events-plugin.js';
export { registerTravelingMerchantPlugin } from './traveling-merchant-plugin.js';
export { registerTreasureHuntPlugin } from './treasure-hunt-plugin.js';
export { registerCombatLoggerPlugin } from './combat-logger-plugin.js';
export { registerFestivalEventsPlugin } from './festival-events-plugin.js';
