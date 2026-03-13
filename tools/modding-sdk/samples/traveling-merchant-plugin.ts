/**
 * Sample Plugin 2 — Traveling Merchant NPC
 *
 * Demonstrates how to register a custom NPC using the Modding SDK.
 * The traveling merchant appears in the target world with a full
 * dialogue tree and reacts to TRADE world events.
 *
 * Register with: `registerTravelingMerchantPlugin(sdk, worldId)`
 */

import type { ModdingSdk, CustomNpcDef, WorldHookDef } from '../index.js';

const MOD_ID = 'sample:traveling-merchant';
const MOD_VERSION = '1.0.0';

const MERCHANT_NPC: CustomNpcDef = Object.freeze({
  npcId: 'npc:ozymandias-the-wanderer',
  archetype: 'merchant' as const,
  name: 'Ozymandias the Wanderer',
  worldId: '',
  dialogueLines: Object.freeze([
    { trigger: 'greeting', response: "I've seen things you wouldn't believe. Buy something.", emotionHint: 'mysterious' },
    { trigger: 'trade', response: 'A fair exchange leaves both richer. Name your price.', emotionHint: 'friendly' },
    { trigger: 'farewell', response: 'The road calls me onward. Until we meet again.', emotionHint: 'wistful' },
  ]),
  traitOverrides: Object.freeze({ charisma: 0.9, bargaining: 0.85 }),
});

function buildTradeHook(): WorldHookDef {
  return {
    hookId: 'merchant:on-trade',
    category: 'TRADE_COMPLETED',
    description: 'Ozymandias reacts to major trade events in the world.',
    handler: () => { /* Merchant adjusts inventory in response to market shifts */ },
  };
}

export function registerTravelingMerchantPlugin(sdk: ModdingSdk, worldId: string): void {
  const npc: CustomNpcDef = Object.freeze({ ...MERCHANT_NPC, worldId });
  const result = sdk.registerMod({
    modId: MOD_ID,
    version: MOD_VERSION,
    hooks: [buildTradeHook()],
    npcs: [npc],
    quests: [],
  });

  if (typeof result === 'object' && 'code' in result) {
    throw new Error(`[${MOD_ID}] registration failed: ${result.code}`);
  }
}
