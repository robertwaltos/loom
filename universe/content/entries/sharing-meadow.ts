/**
 * Content Entries — Sharing Meadow
 * World: Sharing Meadow | Guide: Auntie Bee | Subject: Community Economics
 *
 * Four published entries spanning generosity and cooperative economics:
 *   1. The Commons — resources that belong to everyone (Elinor Ostrom)
 *   2. The Gift Economy — giving without expecting return
 *   3. The Cooperative Movement — Rochdale Pioneers
 *   4. Open Source — sharing in the digital age
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: The Commons (Tier 1 — ages 5-6) ──────────────────────

export const ENTRY_THE_COMMONS: RealWorldEntry = {
  id: 'entry-the-commons',
  type: 'scientific_principle',
  title: 'The Land That Belongs to Everyone',
  year: null,
  yearDisplay: 'Timeless Principle',
  era: 'contemporary',
  descriptionChild:
    "Some things don't belong to any one person — parks, lakes, forests, the ocean, the air. These shared resources are called 'the commons.' Auntie Bee says the most important question about shared things is: how do we make sure nobody takes too much?",
  descriptionOlder:
    "Garrett Hardin's 'Tragedy of the Commons' (1968) argued that shared resources are inevitably overused and destroyed. Elinor Ostrom proved him wrong by studying communities worldwide that successfully managed commons for centuries through collective governance rules. She won the Nobel Prize in Economics for showing that people can cooperate without privatisation or government control — if they have the right institutions.",
  descriptionParent:
    "Ostrom's work is foundational to environmental economics, political science, and public policy. Her eight design principles for managing commons — including clearly defined boundaries, collective-choice arrangements, and graduated sanctions — offer an empirical framework for cooperation that transcends ideology. Teaching children about the commons introduces stewardship, collective action problems, and the nuance that neither pure privatisation nor centralised control is always the answer.",
  realPeople: ['Elinor Ostrom', 'Garrett Hardin'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: null,
  continent: null,
  subjectTags: ['commons', 'cooperation', 'shared resources', 'economics', 'governance'],
  worldId: 'sharing-meadow',
  guideId: 'auntie-bee',
  adventureType: 'guided_expedition',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-gift-economy'],
  funFact:
    "Ostrom's eight principles for successful commons management include 'clearly defined boundaries,' 'collective-choice arrangements,' and 'graduated sanctions.' Auntie Bee has them embroidered on her quilt. She says they also apply to families.",
  imagePrompt:
    "A sun-drenched communal meadow stretching to the horizon, a shared fishing pond in the center with crystal-clear water, diverse community members tending gardens and sharing harvests, a patchwork quilt draped over a fence with embroidered text of Ostrom's principles, no fences dividing the land, wildflowers blooming everywhere, warm golden community light, Studio Ghibli pastoral warmth",
  status: 'published',
};

// ─── Entry 2: The Gift Economy (Tier 2 — ages 7-8) ─────────────────

export const ENTRY_GIFT_ECONOMY: RealWorldEntry = {
  id: 'entry-gift-economy',
  type: 'cultural_milestone',
  title: 'The Richest Person Gives the Most',
  year: null,
  yearDisplay: 'Ancient Tradition',
  era: 'ancient',
  descriptionChild:
    "In some cultures, the richest person isn't the one who has the most — it's the one who gives the most away. A potlatch is a celebration where the host gives gifts to everyone who comes. The more you give, the more respected you are.",
  descriptionOlder:
    "Gift economies operate on different logic than market economies. The Kwakiutl potlatch, Melanesian kula ring, and many Indigenous systems distributed wealth through obligation, reciprocity, and social capital. These systems predate market economics and survived alongside them for millennia. The insight: economic systems built on generosity are not naive — they're sophisticated alternatives with different success metrics.",
  descriptionParent:
    "Gift economies challenge the foundational assumption of classical economics that humans are purely self-interested. Anthropological evidence from Marcel Mauss (The Gift, 1925) and subsequent researchers demonstrates that gift-based systems create social bonds, redistribute wealth, and sustain communities through mechanisms that market economies cannot replicate. Teaching children about gift economies expands their understanding of what 'economy' can mean.",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: null,
  continent: null,
  subjectTags: ['gift economy', 'potlatch', 'generosity', 'community', 'anthropology'],
  worldId: 'sharing-meadow',
  guideId: 'auntie-bee',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-the-commons'],
  unlocks: ['entry-cooperative-movement'],
  funFact:
    "In some potlatch traditions, the host would deliberately destroy valuable objects to demonstrate that generosity mattered more than accumulation. Auntie Bee doesn't destroy things, but she does let the flowers spread freely. The Meadow has no fences.",
  imagePrompt:
    "A vibrant outdoor celebration in a Pacific Northwest Indigenous setting, a generous host distributing beautifully crafted gifts (carved boxes, woven blankets, copper shields) to gathered community members, totem poles in the background, a great fire burning at the center, the host's hands open in giving, expressions of gratitude and respect, warm firelight against twilight sky, Studio Ghibli cultural reverence with anthropological detail",
  status: 'published',
};

// ─── Entry 3: The Cooperative Movement (Tier 2 — ages 7-8) ─────────

export const ENTRY_COOPERATIVE_MOVEMENT: RealWorldEntry = {
  id: 'entry-cooperative-movement',
  type: 'cultural_milestone',
  title: 'The Shop That Belongs to Everyone',
  year: 1844,
  yearDisplay: '1844 CE',
  era: 'industrial',
  descriptionChild:
    "In 1844, 28 workers pooled their money to open a small shop where everyone shared the profits equally. It was called a co-operative — a business owned by everyone who uses it. Today, over 3 million cooperatives exist worldwide, owned by more than a billion people.",
  descriptionOlder:
    "The Rochdale Pioneers established principles — voluntary membership, democratic control (one member, one vote), equitable profit distribution — that still govern cooperatives today. Co-ops emerged as a third option between pure capitalism and state socialism: community ownership with market participation. The model is used for everything from grocery stores to banks to electrical utilities.",
  descriptionParent:
    "The cooperative movement represents one of the most successful economic experiments in history: a democratic, member-owned alternative to investor-owned business that has scaled globally. The Rochdale Principles remain the foundation of cooperative governance worldwide. Teaching children about cooperatives introduces concepts of democratic decision-making, equitable distribution, and the idea that business structures shape outcomes.",
  realPeople: ['The Rochdale Pioneers'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 53.611, lng: -2.1575, name: 'Rochdale, England' },
  continent: 'Europe',
  subjectTags: ['cooperatives', 'democracy', 'community', 'economics', 'Rochdale'],
  worldId: 'sharing-meadow',
  guideId: 'auntie-bee',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-gift-economy'],
  unlocks: ['entry-open-source'],
  funFact:
    "The Rochdale shop's first inventory was butter, sugar, flour, oatmeal, and candles. They couldn't afford much. Within ten years, they had 1,400 members. Auntie Bee says every big thing starts with a small pot of butter.",
  imagePrompt:
    "19th-century English industrial town, a modest stone-fronted cooperative shop with 'Rochdale Equitable Pioneers' painted on the sign, 28 workers standing proudly in front in period clothing, shelves visible through the window holding butter, flour, sugar, oatmeal, and candles, a small chalkboard showing equal profit shares, cobblestone street with gas lamps, warm amber light of early morning possibility, Studio Ghibli historical warmth",
  status: 'published',
};

// ─── Entry 4: Open Source (Tier 3 — ages 9-10) ─────────────────────

export const ENTRY_OPEN_SOURCE: RealWorldEntry = {
  id: 'entry-open-source',
  type: 'cultural_milestone',
  title: 'The Meadow That Covered the World',
  year: 1991,
  yearDisplay: '1983–present',
  era: 'contemporary',
  descriptionChild:
    "Some computer programmes are 'open source' — anyone can look at how they work, change them, and share them for free. Wikipedia, Firefox, and Linux all work this way. People build them together because they believe knowledge should be shared.",
  descriptionOlder:
    "The open source movement applied cooperative economics to software. Linux (the operating system powering most of the internet) was built by thousands of volunteers contributing code without payment. The model proved that complex, high-quality products can be created without private ownership. The debate — free sharing versus profit incentive — continues. Auntie Bee sees open source as the digital version of a commune.",
  descriptionParent:
    "Open source software represents the most successful application of commons-based peer production in modern history. Linux powers over 90% of the world's supercomputers, most web servers, all Android phones, and the International Space Station. The movement demonstrates that intrinsic motivation, reputation, and collaborative governance can produce outcomes that rival (and often exceed) proprietary alternatives. For children, it's a concrete example that sharing can scale globally.",
  realPeople: ['Richard Stallman', 'Linus Torvalds'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: null,
  continent: null,
  subjectTags: ['open source', 'Linux', 'collaboration', 'digital commons', 'software'],
  worldId: 'sharing-meadow',
  guideId: 'auntie-bee',
  adventureType: 'guided_expedition',
  difficultyTier: 3,
  prerequisites: ['entry-cooperative-movement'],
  unlocks: [],
  funFact:
    "Linux runs on over 90% of the world's supercomputers, most web servers, all Android phones, and the International Space Station. No one owns it. Auntie Bee calls this 'the meadow that covered the world.'",
  imagePrompt:
    "A digital meadow visualization: a small patch of green code-grass growing from a laptop screen, expanding outward in all directions and covering the Earth visible in the background, contributors from around the world planting 'code flowers' — each flower a different color representing a different language and culture, the Linux penguin (Tux) sitting contentedly in the middle, servers and space stations visible at the edges, warm collaborative light, Studio Ghibli digital-nature fusion",
  status: 'published',
};

// ─── Export ────────────────────────────────────────────────────────

export const SHARING_MEADOW_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_THE_COMMONS,
  ENTRY_GIFT_ECONOMY,
  ENTRY_COOPERATIVE_MOVEMENT,
  ENTRY_OPEN_SOURCE,
];

export const SHARING_MEADOW_ENTRY_IDS =
  SHARING_MEADOW_ENTRIES.map((e) => e.id);
