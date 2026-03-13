/**
 * Content Entries — The Budget Kitchen
 * World: The Budget Kitchen | Guide: Priya Nair | Subject: Budgeting / Resource Allocation
 *
 * Four published entries spanning the history and principles of budgeting:
 *   1. The Ration Book — WWII families as budget experts
 *   2. Muhammad Yunus and Microfinance — $27 that changed the world
 *   3. Opportunity Cost — the invisible price of every choice
 *   4. The Columbian Exchange of Spices — how trade shaped kitchens
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: WWII Ration Book (Tier 1 — ages 5-6) ────────────────

export const ENTRY_RATION_BOOK: RealWorldEntry = {
  id: 'entry-ration-book',
  type: 'event',
  title: 'The Little Book That Fed a Nation',
  year: 1940,
  yearDisplay: '1940 CE',
  era: 'modern',
  descriptionChild:
    "During World War II, food was scarce because the ships that normally brought it were needed for the war. Every family got a special booklet with stamps for their fair share of bread, butter, meat, and sugar. Families learned to cook amazing meals with less. Priya calls them the greatest budget managers in history.",
  descriptionOlder:
    "WWII rationing forced ordinary households to become expert budget managers. Women running homes during rationing mastered the skills of substitution, preservation, and zero-waste cooking at a level that professional chefs admire. The ration book wasn't just about scarcity — it was about fairness. Rich and poor received the same stamps. Rationing demonstrated that when resources are limited, creative budgeting isn't optional — it's survival.",
  descriptionParent:
    "WWII rationing is a powerful teaching case for resource allocation under constraints — the core of budgeting. It demonstrates that budgeting is not about deprivation but about intelligent allocation. The psychological insight is that constraints can actually increase creativity: wartime recipe books are celebrated for their ingenuity. The fairness dimension (equal rations regardless of wealth) introduces children to concepts of equitable resource distribution that connect to broader economic and social questions.",
  realPeople: [],
  quote: 'Make do and mend.',
  quoteAttribution: 'British Ministry of Information, 1943',
  geographicLocation: { lat: 51.5074, lng: -0.1278, name: 'United Kingdom' },
  continent: 'Europe',
  subjectTags: ['rationing', 'budgeting', 'WWII', 'resource allocation', 'fairness'],
  worldId: 'budget-kitchen',
  guideId: 'priya-nair',
  adventureType: 'reenactment',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-yunus-microfinance'],
  funFact:
    "British rationing began in January 1940 and didn't fully end until July 1954 — nine years after the war itself ended. An entire generation grew up never knowing unrationed food.",
  imagePrompt:
    "1940s British kitchen, warm but modest, a mother and daughter at a wooden table planning the week's meals with a ration book open between them showing colorful stamps, limited but carefully arranged ingredients on the counter — a small pat of butter, a cup of sugar, a modest cut of meat — the mother writing a meal plan on a chalkboard with calculated portions, blackout curtains at the window, warm tungsten light, atmosphere of determined ingenuity, Studio Ghibli domestic warmth with wartime restraint",
  status: 'published',
};

// ─── Entry 2: Muhammad Yunus and Microfinance (Tier 2 — ages 7-8) ──

export const ENTRY_YUNUS_MICROFINANCE: RealWorldEntry = {
  id: 'entry-yunus-microfinance',
  type: 'person',
  title: 'Twenty-Seven Dollars That Changed the World',
  year: 1983,
  yearDisplay: '1983 CE',
  era: 'contemporary',
  descriptionChild:
    "A professor named Muhammad Yunus lent $27 to 42 basket-weavers who couldn't afford to buy their own supplies. They made their baskets, sold them, and paid him back with interest. He realized that tiny loans could change whole communities — and he started a bank specifically for people with no money.",
  descriptionOlder:
    "The Grameen Bank ('Village Bank') proved that poor people are creditworthy — they repay loans at higher rates than wealthy borrowers. Yunus discovered that the banking system's refusal to lend to the poor was based on prejudice, not data. His model — small loans, group accountability, no collateral — has since been deployed in over 100 countries and reached hundreds of millions of people. He won the Nobel Peace Prize in 2006.",
  descriptionParent:
    "Yunus's microfinance model challenges fundamental assumptions about financial risk and creditworthiness. The Grameen Bank demonstrated that poverty is not a character flaw but a systems failure — people are poor because financial infrastructure excludes them. The model connects budgeting (recipients must plan how to use the loan productively) with entrepreneurship (the loan funds income-generating activity) and community (group lending creates social accountability). It's a complete economic lesson in $27.",
  realPeople: ['Muhammad Yunus'],
  quote: "Poor people are bonsai people. There is nothing wrong with their seeds. Only the pot is too small.",
  quoteAttribution: 'Muhammad Yunus',
  geographicLocation: { lat: 22.3569, lng: 91.7832, name: 'Chittagong, Bangladesh' },
  continent: 'Asia',
  subjectTags: ['microfinance', 'Grameen Bank', 'poverty', 'lending', 'Nobel Prize'],
  worldId: 'budget-kitchen',
  guideId: 'priya-nair',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-ration-book'],
  unlocks: ['entry-opportunity-cost'],
  funFact:
    "The original $27 loan is displayed at the Grameen Bank headquarters. The entire global microfinance movement — hundreds of millions of borrowers across 100+ countries — traces back to a single afternoon with 42 people and a notebook.",
  imagePrompt:
    "A Bangladeshi village in the 1980s, Professor Yunus sitting on the ground with a group of women basket-weavers in a circle, a small stack of taka bills ($27 worth) being counted out carefully, finished beautiful baskets piled beside each woman, a simple notebook recording each loan, warm golden afternoon light through bamboo, the women's expressions showing dignity and determination not charity, one woman already weaving with newly purchased materials, Studio Ghibli human dignity realism",
  status: 'published',
};

// ─── Entry 3: Opportunity Cost (Tier 2 — ages 7-8) ─────────────────

export const ENTRY_OPPORTUNITY_COST: RealWorldEntry = {
  id: 'entry-opportunity-cost',
  type: 'scientific_principle',
  title: 'The Invisible Price of Every Choice',
  year: null,
  yearDisplay: 'Timeless Principle',
  era: 'contemporary',
  descriptionChild:
    "Every time you spend money on one thing, you're choosing NOT to spend it on something else. That invisible cost — the thing you gave up — is called opportunity cost. Priya calculates it for every item she buys at the market. She doesn't just ask 'can I afford this?' She asks 'what am I giving up?'",
  descriptionOlder:
    "Opportunity cost is the foundation of economic thinking. It applies not just to money but to time, attention, and energy. Every 'yes' is a silent 'no' to everything else you could have done with those resources. When you spend an hour watching a video, the opportunity cost is whatever else you could have done with that hour. Learning to weigh the invisible price is the beginning of financial wisdom — and it's a skill most adults still struggle with.",
  descriptionParent:
    "Opportunity cost is arguably the single most important concept in economics and one of the most neglected in everyday decision-making. Economist Richard Thaler's research (Nobel Prize, 2017) demonstrated that humans are systematically poor at calculating opportunity cost intuitively — we focus on the visible price and ignore the invisible alternative. This entry uses Priya's kitchen as a concrete context: every ingredient purchased means another ingredient not purchased, every meal cooked means another meal not cooked. Making the invisible visible is the core pedagogical goal.",
  realPeople: ['Richard Thaler'],
  quote: 'The cost of a thing is the amount of life you exchange for it.',
  quoteAttribution: 'Henry David Thoreau',
  geographicLocation: null,
  continent: null,
  subjectTags: ['opportunity cost', 'economics', 'decision making', 'budgeting', 'trade-offs'],
  worldId: 'budget-kitchen',
  guideId: 'priya-nair',
  adventureType: 'guided_expedition',
  difficultyTier: 2,
  prerequisites: ['entry-yunus-microfinance'],
  unlocks: ['entry-spice-trade-kitchens'],
  funFact:
    "Economist Richard Thaler won a Nobel Prize for showing that humans are systematically bad at calculating opportunity cost intuitively. We have to practice. Priya's Kitchen is that practice.",
  imagePrompt:
    "Inside Priya's Budget Kitchen, a market stall scene with colorful ingredients laid out, Priya Nair standing at a crossroads of two market aisles, one leading to a basket of fresh vegetables and the other to a bag of rice, translucent ghost-images of the unchosen items floating faintly above the chosen ones showing what was given up, a chalkboard behind showing a simple budget with arrows connecting choices to consequences, warm kitchen market light, Studio Ghibli educational warmth with gentle mathematical visualization",
  status: 'published',
};

// ─── Entry 4: The Spice Trade and Kitchen History (Tier 3 — ages 9-10)

export const ENTRY_SPICE_TRADE_KITCHENS: RealWorldEntry = {
  id: 'entry-spice-trade-kitchens',
  type: 'event',
  title: 'How Trade Changed What the World Eats',
  year: 1492,
  yearDisplay: '1492 CE onward',
  era: 'renaissance',
  descriptionChild:
    "Before global trade, people could only cook with ingredients that grew near them. When traders sailed between continents, they brought spices, vegetables, and grains from one side of the world to the other. Tomatoes went from Mexico to Italy. Chilli peppers went from the Americas to India. Priya's kitchen exists because the world learned to share ingredients.",
  descriptionOlder:
    "The Columbian Exchange — the transfer of plants, animals, and foods between the Americas and the rest of the world after 1492 — transformed every kitchen on Earth. Italian cuisine without tomatoes, Indian cuisine without chillies, Irish cuisine without potatoes — none of these existed before 1500. But the exchange came with devastating costs: European diseases killed up to 90% of Indigenous Americans. Priya teaches that every ingredient has a history, and that history includes both wonder and injustice.",
  descriptionParent:
    "This entry connects food budgeting to global history and trade economics. It demonstrates that the ingredients available in any kitchen are the result of centuries of trade, migration, colonization, and cultural exchange. Half of the world's major food crops originated in the Americas. The entry teaches children to think about supply chains — where food comes from, who grew it, and how it reached their table. It also introduces the ethical complexity of historical trade: abundance for some often came at devastating cost to others.",
  realPeople: ['Christopher Columbus'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: null,
  continent: null,
  subjectTags: ['Columbian Exchange', 'spice trade', 'food history', 'global trade', 'kitchen history'],
  worldId: 'budget-kitchen',
  guideId: 'priya-nair',
  adventureType: 'artifact_hunt',
  difficultyTier: 3,
  prerequisites: ['entry-opportunity-cost'],
  unlocks: [],
  funFact:
    "Half of the world's major food crops today originated in the Americas — including the potato, which became the staple food of Ireland, Germany, and Russia within two centuries of contact. Italian pasta sauce didn't have tomatoes until the 1600s.",
  imagePrompt:
    "Priya's Budget Kitchen transformed into a world map, ingredients floating along trade route lines connecting continents — tomatoes sailing from Mexico to Italy, chilli peppers traveling to India, potatoes heading to Ireland, spices crossing the Indian Ocean — each ingredient glowing its natural color along a golden trade line, Priya standing at the center tracing routes with her finger, the kitchen shelves showing ingredients organized by continent of origin, warm inviting light, Studio Ghibli cartographic food illustration",
  status: 'published',
};

// ─── Export ────────────────────────────────────────────────────────

export const BUDGET_KITCHEN_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_RATION_BOOK,
  ENTRY_YUNUS_MICROFINANCE,
  ENTRY_OPPORTUNITY_COST,
  ENTRY_SPICE_TRADE_KITCHENS,
];

export const BUDGET_KITCHEN_ENTRY_IDS = BUDGET_KITCHEN_ENTRIES.map((e) => e.id);
