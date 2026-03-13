/**
 * Content Entries — Thinking Grove
 * World: Thinking Grove | Guide: Old Rowan | Subject: Ethics / Critical Thinking
 *
 * Four published entries spanning philosophy, ethics, and critical thinking:
 *   1. The Ship of Theseus — identity and paradox
 *   2. Hammurabi's Code — the concept of justice
 *   3. The Golden Rule Across Cultures — universal morality
 *   4. The Prisoner's Dilemma — cooperation vs self-interest
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: The Ship of Theseus (Tier 1 — ages 5-6) ──────────────

export const ENTRY_SHIP_OF_THESEUS: RealWorldEntry = {
  id: 'entry-ship-of-theseus',
  type: 'scientific_principle',
  title: 'Is It Still the Same Ship?',
  year: null,
  yearDisplay: '~500 BCE — ongoing',
  era: 'ancient',
  descriptionChild:
    "If you replace every plank on a ship, one at a time, until no original plank remains — is it still the same ship? There's no right answer. That's the point.",
  descriptionOlder:
    "This paradox has been discussed for 2,500 years. It applies to everything: your body replaces most of its cells every seven to ten years. Are you the same person you were at age three? Old Rowan has been thinking about this particular question for 200 of their 400 years. The Grove doesn't give answers — it grows better questions.",
  descriptionParent:
    "The Ship of Theseus is a foundational paradox in philosophy of identity, applicable to personal identity, legal ownership, and organisational continuity. It teaches children that some of the most important questions have no definitive answer — and that sitting with ambiguity is itself a form of intellectual maturity. Old Rowan models this: no quiz, no score, just thinking.",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 37.9715, lng: 23.7267, name: 'Athens, Greece' },
  continent: 'Europe',
  subjectTags: ['philosophy', 'identity', 'paradox', 'critical thinking', 'questions'],
  worldId: 'thinking-grove',
  guideId: 'old-rowan',
  adventureType: 'guided_expedition',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-hammurabis-code'],
  funFact:
    "Old Rowan has been thinking about this particular question for 200 of their 400 years. They still haven't decided on an answer. They consider this progress.",
  imagePrompt:
    "An ancient forest grove: a wooden ship in a clearing with planks being replaced one by one, old planks stacked beside new ones, Old Rowan (an ancient sentient tree) watching thoughtfully, dappled philosophical light filtering through canopy, children sitting in a circle debating, Studio Ghibli contemplative forest aesthetic",
  status: 'published',
};

// ─── Entry 2: Hammurabi's Code (Tier 2 — ages 7-8) ─────────────────

export const ENTRY_HAMMURABIS_CODE: RealWorldEntry = {
  id: 'entry-hammurabis-code',
  type: 'artifact',
  title: 'The First Written Laws',
  year: -1754,
  yearDisplay: '~1754 BCE',
  era: 'ancient',
  descriptionChild:
    "Almost 4,000 years ago, a king wrote down 282 rules so everyone would know what was fair. It was the first time laws were written down for everyone to see.",
  descriptionOlder:
    "Hammurabi's Code included the concept of 'innocent until proven guilty' and scaled punishments to the crime. It also had deeply unfair elements — different rules for rich and poor, men and women. It teaches that justice evolves. What was 'fair' then is not 'fair' now. Old Rowan uses this to show that progress means questioning yesterday's answers.",
  descriptionParent:
    "Hammurabi's Code is both a landmark in legal history and a window into the moral limitations of its era. Teaching children that this 'fair' system contained systemic inequality develops the ability to evaluate systems critically rather than accepting them as given. The code's dual nature — progressive for its time, unjust by modern standards — models how ethical standards evolve across centuries.",
  realPeople: ['Hammurabi'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 32.5355, lng: 44.4209, name: 'Babylon, modern Iraq' },
  continent: 'Asia',
  subjectTags: ['justice', 'law', 'Hammurabi', 'ancient civilisation', 'fairness'],
  worldId: 'thinking-grove',
  guideId: 'old-rowan',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-ship-of-theseus'],
  unlocks: ['entry-golden-rule-across-cultures'],
  funFact:
    "The code was carved on a stone stele over two metres tall and is now in the Louvre in Paris. Old Rowan says: 'They carved justice into stone so it couldn't be changed. But justice is a living thing. It must change.'",
  imagePrompt:
    "A Thinking Grove clearing with a life-sized stone stele: 282 laws etched in cuneiform, children at a debate table discussing which rules are fair and which aren't, Old Rowan's roots curving around the base of the stele, ancient amber light mixing with forest green, Studio Ghibli ethical archaeology aesthetic",
  status: 'published',
};

// ─── Entry 3: The Golden Rule Across Cultures (Tier 2 — ages 7-8) ──

export const ENTRY_GOLDEN_RULE_ACROSS_CULTURES: RealWorldEntry = {
  id: 'entry-golden-rule-across-cultures',
  type: 'scientific_principle',
  title: 'The Rule Every Culture Found',
  year: null,
  yearDisplay: '~2000 BCE — ongoing',
  era: 'ancient',
  descriptionChild:
    "Almost every culture in the world has the same basic rule: treat others the way you want to be treated. It appeared independently everywhere — in China, India, the Middle East, Africa, the Americas. Nobody copied it. Everyone discovered it.",
  descriptionOlder:
    "Confucius, Jesus, Hillel, Muhammad, the Buddha, the Mahabharata, and indigenous traditions worldwide all contain versions of the Golden Rule. It is the closest thing to a universal moral principle humanity has ever produced. The fact that it emerged independently across unconnected cultures suggests something fundamental about human moral intuition.",
  descriptionParent:
    "The convergent emergence of the Golden Rule across unconnected cultures is one of the strongest arguments for innate human moral reasoning. Teaching children this cross-cultural convergence develops respect for diverse traditions while revealing their common foundation. The oldest known version comes from ancient Egypt (~2000 BCE), predating all major religious texts. Old Rowan considers this the most important fact in the Grove.",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: null,
  continent: null,
  subjectTags: ['Golden Rule', 'ethics', 'cross-cultural', 'morality', 'universal'],
  worldId: 'thinking-grove',
  guideId: 'old-rowan',
  adventureType: 'artifact_hunt',
  difficultyTier: 2,
  prerequisites: ['entry-hammurabis-code'],
  unlocks: ['entry-prisoners-dilemma'],
  funFact:
    "The oldest known version comes from ancient Egypt, around 2000 BCE. Old Rowan has a root in every culture that discovered the rule. 'They all grew toward the same light,' Old Rowan says. 'That tells you something about the light.'",
  imagePrompt:
    "A Thinking Grove artifact trail: ten carved stones hidden among the roots and branches, each bearing the Golden Rule in a different language and script (Chinese, Arabic, Sanskrit, Hebrew, Greek, Egyptian hieroglyphs, Cherokee, etc.), children collecting them with field journals, Old Rowan's branches forming a canopy that connects all the stones, warm multicultural forest light, Studio Ghibli ethical treasure hunt aesthetic",
  status: 'published',
};

// ─── Entry 4: The Prisoner's Dilemma (Tier 3 — ages 9-10) ──────────

export const ENTRY_PRISONERS_DILEMMA: RealWorldEntry = {
  id: 'entry-prisoners-dilemma',
  type: 'scientific_principle',
  title: 'To Cooperate or to Compete?',
  year: 1950,
  yearDisplay: '1950 CE',
  era: 'contemporary',
  descriptionChild:
    "Imagine two friends both have a choice: help each other or help only yourself. If both help, everyone wins. If one cheats, the cheater wins big. If both cheat, everyone loses. What do you do?",
  descriptionOlder:
    "The Prisoner's Dilemma shows why cooperation is hard even when it benefits everyone. It appears in economics, biology, politics, and everyday life. In tournaments with repeated rounds, the simplest strategy — 'cooperate first, then copy whatever the other person did' — consistently wins. Understanding this helps explain everything from arms races to climate negotiations.",
  descriptionParent:
    "The Prisoner's Dilemma is the foundational model of game theory, with applications across economics, evolutionary biology, international relations, and daily social interaction. Robert Axelrod's tournaments demonstrated that tit-for-tat (cooperate first, then reciprocate) outperforms both purely selfish and purely generous strategies over time. Teaching children this develops strategic thinking, empathy, and understanding of why cooperation requires trust-building mechanisms.",
  realPeople: ['Merrill Flood', 'Melvin Dresher'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 34.1478, lng: -118.1445, name: 'Santa Monica, California, USA' },
  continent: 'North America',
  subjectTags: ['game theory', 'cooperation', 'strategy', 'dilemma', 'decision-making'],
  worldId: 'thinking-grove',
  guideId: 'old-rowan',
  adventureType: 'reenactment',
  difficultyTier: 3,
  prerequisites: ['entry-golden-rule-across-cultures'],
  unlocks: [],
  funFact:
    "In tournaments, the simplest strategy — 'cooperate first, then copy whatever the other person did' (tit-for-tat) — consistently wins. Old Rowan says: 'Start kind. Stay fair. Forgive quickly. That is 2,500 years of philosophy in four sentences.'",
  imagePrompt:
    "A Thinking Grove game clearing: two children at opposite sides of a stone table with choice tokens (cooperate/defect), a branching tree overhead whose branches visually show outcomes of different choices, Old Rowan's face visible in the trunk observing, children at round tables playing repeated rounds, warm strategic light, Studio Ghibli game theory visualization",
  status: 'published',
};

// ─── Export ────────────────────────────────────────────────────────

export const THINKING_GROVE_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_SHIP_OF_THESEUS,
  ENTRY_HAMMURABIS_CODE,
  ENTRY_GOLDEN_RULE_ACROSS_CULTURES,
  ENTRY_PRISONERS_DILEMMA,
];

export const THINKING_GROVE_ENTRY_IDS =
  THINKING_GROVE_ENTRIES.map((e) => e.id);
