/**
 * Characters Engine Bootstrap
 *
 * Wires all implemented character prompt builders into a CharactersEngine instance.
 * Import this at application startup to get a ready-to-use engine.
 *
 * As new character prompt files are added, append their builders here.
 *
 * Thread: silk/game-characters
 * Tier: 1
 */

import { createCharactersEngine } from '../characters/engine.js';
import type { CharactersEngine } from '../characters/engine.js';
import type { AdaptivePromptLayer, CharacterSystemPrompt } from '../characters/types.js';

// ── Realm of Discovery (STEM) ─────────────────────────────────────
import { buildNimbusSysPrompt } from '../characters/prompts/professor-nimbus.js';
import { buildZaraSysPrompt } from '../characters/prompts/zara-ngozi.js';
import { buildSukiSysPrompt } from '../characters/prompts/suki-tanaka-reyes.js';
import { buildBaxterSysPrompt } from '../characters/prompts/baxter.js';
import { buildRikuSysPrompt } from '../characters/prompts/riku-osei.js';
import { buildDottieSysPrompt } from '../characters/prompts/dottie-chakravarti.js';
import { buildCalSysPrompt } from '../characters/prompts/cal.js';
import { buildLenaSysPrompt } from '../characters/prompts/lena-sundstrom.js';
import { buildKofiSysPrompt } from '../characters/prompts/kofi-amponsah.js';
import { buildPixelSysPrompt } from '../characters/prompts/pixel.js';
import { buildEmekaSysPrompt } from '../characters/prompts/dr-emeka-obi.js';
import { buildMiraSysPrompt } from '../characters/prompts/mira-petrov.js';
import { buildHugoSysPrompt } from '../characters/prompts/hugo-fontaine.js';
import { buildYukiSysPrompt } from '../characters/prompts/yuki.js';
import { buildAtlasSysPrompt } from '../characters/prompts/atlas.js';

// ── Realm of Expression (Language Arts) ──────────────────────────
import { buildAnayaSysPrompt } from '../characters/prompts/grandmother-anaya.js';
import { buildFelixSysPrompt } from '../characters/prompts/felix-barbosa.js';
import { buildAmaraSysPrompt } from '../characters/prompts/amara-diallo.js';
import { buildBirchSysPrompt } from '../characters/prompts/captain-birch.js';
import { buildHassanSysPrompt } from '../characters/prompts/hassan-yilmaz.js';
import { buildFarahSysPrompt } from '../characters/prompts/farah-al-rashid.js';
import { buildNadiaSysPrompt } from '../characters/prompts/nadia-volkov.js';
import { buildOliverSysPrompt } from '../characters/prompts/oliver-marsh.js';
import { buildKwameSysPrompt } from '../characters/prompts/kwame-asante.js';
import { buildLilaSysPrompt } from '../characters/prompts/lila-johansson-park.js';
import { buildTheoSysPrompt } from '../characters/prompts/theo-papadopoulos.js';
import { buildInesSysPrompt } from '../characters/prompts/ines-moreau.js';
import { buildWrenSysPrompt } from '../characters/prompts/wren-calloway.js';
import { buildBennySysPrompt } from '../characters/prompts/benny-okafor-williams.js';
import { buildRosieSysPrompt } from '../characters/prompts/rosie-chen.js';

// ── Realm of Exchange (Financial Literacy) ────────────────────────
import { buildCarmenSysPrompt } from '../characters/prompts/tia-carmen-herrera.js';
import { buildAbernathySysPrompt } from '../characters/prompts/mr-abernathy.js';
import { buildDiegoSysPrompt } from '../characters/prompts/diego-montoya-silva.js';
import { buildTomasSysPrompt } from '../characters/prompts/tomas-reyes.js';
import { buildSamSysPrompt } from '../characters/prompts/sam-worthington.js';
import { buildPriyaSysPrompt } from '../characters/prompts/priya-nair.js';
import { buildNiaSysPrompt } from '../characters/prompts/nia-oduya.js';
import { buildJinhoSysPrompt } from '../characters/prompts/jin-ho-park.js';
import { buildElsaSysPrompt } from '../characters/prompts/elsa-lindgren.js';
import { buildBabatundeSysPrompt } from '../characters/prompts/babatunde-afolabi.js';
import { buildMeiLinSysPrompt } from '../characters/prompts/mei-lin-wu.js';

// ── The Crossroads ────────────────────────────────────────────────
import { buildLunaSysPrompt } from '../characters/prompts/luna.js';
import { buildOldRowanSysPrompt } from '../characters/prompts/old-rowan.js';
import { buildHanaSysPrompt } from '../characters/prompts/hana.js';
import { buildRamiSysPrompt } from '../characters/prompts/rami.js';
import { buildKenzoSysPrompt } from '../characters/prompts/kenzo-nakamura-osei.js';
import { buildSolanaBrightSysPrompt } from '../characters/prompts/solana-bright.js';

// ── Hub ───────────────────────────────────────────────────────────
import { buildLibrarianSysPrompt } from '../characters/prompts/the-librarian.js';
import { buildCompassSysPrompt } from '../characters/prompts/compass.js';

// ─── Builder Registry ─────────────────────────────────────────────

type Builder = (layer: AdaptivePromptLayer) => CharacterSystemPrompt;

const CORE_BUILDERS: ReadonlyArray<[string, Builder]> = [
  // Discovery
  ['professor-nimbus',      buildNimbusSysPrompt],
  ['zara-ngozi',            buildZaraSysPrompt],
  ['suki-tanaka-reyes',     buildSukiSysPrompt],
  ['baxter',                buildBaxterSysPrompt],
  ['riku-osei',             buildRikuSysPrompt],
  ['dottie-chakravarti',    buildDottieSysPrompt],
  ['cal',                   buildCalSysPrompt],
  ['lena-sundstrom',        buildLenaSysPrompt],
  ['kofi-amponsah',         buildKofiSysPrompt],
  ['pixel',                 buildPixelSysPrompt],
  ['dr-emeka-obi',          buildEmekaSysPrompt],
  ['mira-petrov',           buildMiraSysPrompt],
  ['hugo-fontaine',         buildHugoSysPrompt],
  ['yuki',                  buildYukiSysPrompt],
  ['atlas',                 buildAtlasSysPrompt],
  // Expression
  ['grandmother-anaya',     buildAnayaSysPrompt],
  ['felix-barbosa',         buildFelixSysPrompt],
  ['amara-diallo',          buildAmaraSysPrompt],
  ['captain-birch',         buildBirchSysPrompt],
  ['hassan-yilmaz',         buildHassanSysPrompt],
  ['farah-al-rashid',       buildFarahSysPrompt],
  ['nadia-volkov',          buildNadiaSysPrompt],
  ['oliver-marsh',          buildOliverSysPrompt],
  ['kwame-asante',          buildKwameSysPrompt],
  ['lila-johansson-park',   buildLilaSysPrompt],
  ['theo-papadopoulos',     buildTheoSysPrompt],
  ['ines-moreau',           buildInesSysPrompt],
  ['wren-calloway',         buildWrenSysPrompt],
  ['benny-okafor-williams', buildBennySysPrompt],
  ['rosie-chen',            buildRosieSysPrompt],
  // Exchange
  ['tia-carmen-herrera',    buildCarmenSysPrompt],
  ['mr-abernathy',          buildAbernathySysPrompt],
  ['diego-montoya-silva',   buildDiegoSysPrompt],
  ['tomas-reyes',           buildTomasSysPrompt],
  ['sam-worthington',       buildSamSysPrompt],
  ['priya-nair',            buildPriyaSysPrompt],
  ['nia-oduya',             buildNiaSysPrompt],
  ['jin-ho-park',           buildJinhoSysPrompt],
  ['elsa-lindgren',         buildElsaSysPrompt],
  ['babatunde-afolabi',     buildBabatundeSysPrompt],
  ['mei-lin-wu',            buildMeiLinSysPrompt],
  // Crossroads
  ['luna',                  buildLunaSysPrompt],
  ['old-rowan',             buildOldRowanSysPrompt],
  ['hana',                  buildHanaSysPrompt],
  ['rami',                  buildRamiSysPrompt],
  ['kenzo-nakamura-osei',   buildKenzoSysPrompt],
  ['solana-bright',         buildSolanaBrightSysPrompt],
  // Hub
  ['the-librarian',         buildLibrarianSysPrompt],
  ['compass',               buildCompassSysPrompt],
];

// ─── Factory ──────────────────────────────────────────────────────

export function createBootstrappedCharactersEngine(): CharactersEngine {
  return createCharactersEngine({
    builders: new Map(CORE_BUILDERS),
  });
}

export function getImplementedCharacterCount(): number {
  return CORE_BUILDERS.length;
}
