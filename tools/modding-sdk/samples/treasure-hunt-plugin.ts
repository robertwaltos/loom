/**
 * Sample Plugin 3 — Treasure Hunt Quest
 *
 * Demonstrates how to register a multi-step quest template.
 * Players must INVESTIGATE an ancient ruin, then FETCH the relic,
 * then DELIVER it to a scholar NPC for a Kalon reward.
 *
 * Register with: `registerTreasureHuntPlugin(sdk, worldId)`
 */

import type { ModdingSdk, QuestTemplateDef } from '../index.js';

const MOD_ID = 'sample:treasure-hunt';
const MOD_VERSION = '1.0.0';

function buildTreasureSteps() {
  return Object.freeze([
    {
      stepId: 'step:investigate-spire',
      type: 'INVESTIGATE' as const,
      description: 'Search the Spire of Echoes for signs of the relic.',
      targetEntityId: 'location:spire-of-echoes',
    },
    {
      stepId: 'step:fetch-relic',
      type: 'FETCH' as const,
      description: 'Retrieve the Aethermoor Crystal from the vault.',
      targetEntityId: 'item:aethermoor-crystal',
      quantity: 1,
    },
    {
      stepId: 'step:deliver-to-scholar',
      type: 'DELIVER' as const,
      description: 'Bring the crystal to Scholar Veyrin in Ironhaven.',
      targetEntityId: 'npc:scholar-veyrin',
    },
  ]);
}

function buildTreasureQuest(worldId: string): QuestTemplateDef {
  return Object.freeze({
    questId: 'quest:lost-relic-of-aethermoor',
    title: 'The Lost Relic of Aethermoor',
    description: 'An ancient relic lies hidden in the ruined Spire of Echoes. Recover it.',
    worldId,
    minPlayerLevel: 5,
    steps: buildTreasureSteps(),
    reward: Object.freeze({
      kalon: 500,
      items: Object.freeze(['item:veyrin-letter-of-commendation']),
      reputationGain: 25,
    }),
  });
}

export function registerTreasureHuntPlugin(sdk: ModdingSdk, worldId: string): void {
  const result = sdk.registerMod({
    modId: MOD_ID,
    version: MOD_VERSION,
    hooks: [],
    npcs: [],
    quests: [buildTreasureQuest(worldId)],
  });

  if (typeof result === 'object' && 'code' in result) {
    throw new Error(`[${MOD_ID}] registration failed: ${result.code}`);
  }
}
