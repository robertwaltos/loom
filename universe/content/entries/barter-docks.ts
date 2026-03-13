/**
 * Content Entries — Barter Docks
 * World: Barter Docks | Guide: Tomás Reyes | Subject: History of Money / Trade
 *
 * Four published entries spanning barter and the evolution of currency:
 *   1. Double Coincidence of Wants — why money was invented
 *   2. Yapese Rai Stones — giant money and abstract ownership
 *   3. The Trans-Saharan Salt Trade — geographic arbitrage
 *   4. Barter in Modern Crises — when money stops working
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Double Coincidence of Wants (Tier 1 — ages 5-6) ──────

export const ENTRY_DOUBLE_COINCIDENCE: RealWorldEntry = {
  id: 'entry-double-coincidence',
  type: 'scientific_principle',
  title: 'The Problem That Invented Money',
  year: null,
  yearDisplay: 'Timeless Principle',
  era: 'ancient',
  descriptionChild:
    "Imagine you have apples and you want fish. But the fisherman doesn't want apples — he wants shoes. You have to find someone who wants apples AND has shoes, then trade with them, then trade the shoes for fish. It's exhausting. This problem is why money was invented.",
  descriptionOlder:
    "The 'double coincidence of wants' problem explains why pure barter economies are inefficient: a trade only works when both parties want exactly what the other has. Money solves this by acting as a universal intermediary. Tomás lets children discover this problem independently, then watches them invent token-based currencies — which they reliably do.",
  descriptionParent:
    "The double coincidence of wants is a foundational concept in monetary theory, explaining why every complex society eventually develops a medium of exchange. It demonstrates that money is not an arbitrary social construct but a practical solution to a real coordination problem. Children who experience the frustration of pure barter intuitively understand why currency emerged independently across civilisations.",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: null,
  continent: null,
  subjectTags: ['barter', 'money', 'trade', 'economics', 'currency'],
  worldId: 'barter-docks',
  guideId: 'tomas-reyes',
  adventureType: 'reenactment',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-yapese-rai-stones'],
  funFact:
    "Economies have used salt, tea bricks, cowrie shells, giant stone discs (the Yapese rai), and cigarettes as money. The material doesn't matter — the agreement does. Tomás has a collection of 200 'monies' from around the world.",
  imagePrompt:
    "A bustling historical port dock with confused traders: one holding apples wanting fish, a fisherman holding fish wanting shoes, a cobbler holding shoes wanting cloth — arrows of failed trades crisscrossing between them, a single bright coin in the center that could solve everything, wooden dock planks and sailing ships in the background, warm frustrated-yet-hopeful light, Studio Ghibli economic storytelling",
  status: 'published',
};

// ─── Entry 2: Yapese Rai Stones (Tier 2 — ages 7-8) ────────────────

export const ENTRY_YAPESE_RAI_STONES: RealWorldEntry = {
  id: 'entry-yapese-rai-stones',
  type: 'cultural_milestone',
  title: 'Money Too Heavy to Move',
  year: null,
  yearDisplay: 'Pre-contact Era',
  era: 'ancient',
  descriptionChild:
    "On a tiny island in the Pacific, people used enormous stone disks as money — some as big as a car and too heavy to move. Instead of carrying the money, they just agreed on who owned which stone. The stone stayed in one place forever. Ownership moved; the money didn't.",
  descriptionOlder:
    "Rai stones operate on the same principle as modern digital banking: the physical object doesn't need to move; only the record of ownership changes. One famous rai stone sank to the ocean floor during transport but was still considered valid currency — everyone agreed it existed and who owned it. This is arguably the world's first example of trust-based, non-physical money.",
  descriptionParent:
    "The Yapese rai stone system is a remarkable pre-modern example of abstract monetary theory in practice. The value of a rai was determined partly by its size but also by its history — the difficulty of quarrying and transporting it from Palau, hundreds of kilometres away. A stone lost at sea retained its value because the community's collective memory served as the ledger. This system anticipated concepts we now associate with blockchain: decentralised consensus on ownership without physical transfer.",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 9.537, lng: 138.1292, name: 'Yap Island, Micronesia' },
  continent: 'Oceania',
  subjectTags: ['Yap', 'rai stones', 'money', 'abstract value', 'Pacific Islands'],
  worldId: 'barter-docks',
  guideId: 'tomas-reyes',
  adventureType: 'guided_expedition',
  difficultyTier: 2,
  prerequisites: ['entry-double-coincidence'],
  unlocks: ['entry-trans-saharan-salt-trade'],
  funFact:
    "Some rai stones are over 3.6 meters in diameter and weigh over 4 tons. They were quarried on a different island and transported by canoe across open ocean. The effort of creation was part of the value. Tomás asks: 'Is the effort or the stone the money?'",
  imagePrompt:
    "Tropical Pacific island village with enormous circular stone discs (rai stones) standing along pathways — some as tall as a person, carved from limestone with central holes, villagers pointing at stones and exchanging verbal agreements of ownership, one stone visible underwater in the shallows still 'owned' by someone on shore, palm trees and traditional meeting houses, warm tropical light with ocean breeze, Studio Ghibli Pacific Island cultural detail",
  status: 'published',
};

// ─── Entry 3: Trans-Saharan Salt Trade (Tier 2 — ages 7-8) ─────────

export const ENTRY_TRANS_SAHARAN_SALT_TRADE: RealWorldEntry = {
  id: 'entry-trans-saharan-salt-trade',
  type: 'cultural_milestone',
  title: 'When Salt Was Worth Its Weight in Gold',
  year: null,
  yearDisplay: '8th–16th Century CE',
  era: 'medieval',
  descriptionChild:
    "In ancient West Africa, salt was so valuable that it was traded pound for pound with gold. Caravans of thousands of camels carried slabs of salt across the Sahara Desert. In places with lots of gold but no salt, salt was literally worth its weight in gold.",
  descriptionOlder:
    "The trans-Saharan salt-gold trade illustrates relative scarcity: gold was abundant in the forests of West Africa but salt was scarce, while in the Sahara the reverse was true. Traders exploited this differential, creating wealth through geographic arbitrage. The trade routes built empires — Ghana, Mali, Songhai — and financed the legendary centres of learning at Timbuktu.",
  descriptionParent:
    "The trans-Saharan trade networks demonstrate how geographic scarcity differentials drive commerce and empire-building. The silent barter custom (one side lays goods, withdraws; the other places counter-offer) shows that trade can function without shared language or even direct contact — trust and convention suffice. These trade routes shaped West African civilisation for over a millennium and connected sub-Saharan Africa to the Mediterranean world.",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 16.7735, lng: -3.0074, name: 'Timbuktu, Mali' },
  continent: 'Africa',
  subjectTags: ['salt trade', 'Sahara', 'gold', 'trade routes', 'West Africa', 'Timbuktu'],
  worldId: 'barter-docks',
  guideId: 'tomas-reyes',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-yapese-rai-stones'],
  unlocks: ['entry-barter-modern-crises'],
  funFact:
    "Merchants in Timbuktu conducted trade through a 'silent barter' custom: one side would lay out their goods and withdraw. The other side would place their offer beside it. If the first party accepted, they took the offer. If not, they adjusted. No words were spoken. Trust worked.",
  imagePrompt:
    "A vast Saharan caravan scene: thousands of camels in a long line stretching to the horizon, each carrying enormous slabs of white salt, traders at a market point exchanging salt blocks for gold dust weighed on delicate scales, Timbuktu's mud-brick architecture and minarets visible in the distance, golden desert light with deep blue sky, Studio Ghibli epic scale with NatGeo documentary authenticity",
  status: 'published',
};

// ─── Entry 4: Barter in Modern Crises (Tier 3 — ages 9-10) ─────────

export const ENTRY_BARTER_MODERN_CRISES: RealWorldEntry = {
  id: 'entry-barter-modern-crises',
  type: 'cultural_milestone',
  title: 'When Money Stops Working',
  year: 2001,
  yearDisplay: '2001 CE',
  era: 'contemporary',
  descriptionChild:
    "When Argentina's money stopped working in 2001, people went back to trading things directly. 'I'll fix your plumbing if you teach my daughter piano.' Millions of people joined barter clubs because trading skills and goods can work even when money doesn't.",
  descriptionOlder:
    "Argentina's 2001 economic crisis collapsed the peso, froze bank accounts, and erased savings. In response, over 6 million people joined 'trueque' (barter) clubs, trading goods and services using community-created vouchers. These clubs demonstrated that economic activity can continue without official currency — if community trust exists. Similar barter networks emerge in every severe economic crisis.",
  descriptionParent:
    "Argentina's trueque clubs represent spontaneous institutional innovation under economic collapse — communities creating parallel economic systems when the official one fails. The phenomenon has recurred globally (Greece 2012, Venezuela 2016+, during COVID-19 disruptions). It demonstrates that the fundamental unit of economics is not money but trust and mutual need. For children, it's a powerful lesson that skills are the most reliable currency.",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: -34.6037, lng: -58.3816, name: 'Buenos Aires, Argentina' },
  continent: 'South America',
  subjectTags: ['barter', 'economic crisis', 'Argentina', 'community', 'resilience'],
  worldId: 'barter-docks',
  guideId: 'tomas-reyes',
  adventureType: 'reenactment',
  difficultyTier: 3,
  prerequisites: ['entry-trans-saharan-salt-trade'],
  unlocks: [],
  funFact:
    "During Argentina's crisis, dentists traded dental work for groceries. Teachers traded lessons for haircuts. An entire parallel economy ran on human trust. Tomás says this proves his favourite point: 'money is a convenience, not a necessity.'",
  imagePrompt:
    "A Buenos Aires community hall converted into a barter club (trueque), people trading skills and goods directly — a plumber fixing a sink while a piano teacher gives a lesson in the corner, hand-drawn vouchers on a bulletin board, shelves of traded goods (jams, bread, repairs), community members shaking hands over exchanges, warm communal light despite economic hardship, Studio Ghibli human resilience warmth",
  status: 'published',
};

// ─── Export ────────────────────────────────────────────────────────

export const BARTER_DOCKS_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_DOUBLE_COINCIDENCE,
  ENTRY_YAPESE_RAI_STONES,
  ENTRY_TRANS_SAHARAN_SALT_TRADE,
  ENTRY_BARTER_MODERN_CRISES,
];

export const BARTER_DOCKS_ENTRY_IDS =
  BARTER_DOCKS_ENTRIES.map((e) => e.id);
