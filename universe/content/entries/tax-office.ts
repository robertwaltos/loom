/**
 * Content Entries — Tax Office
 * World: Tax Office | Guide: Sam Worthington | Subject: Taxation / Public Finance
 *
 * Four published entries spanning taxation and public finance:
 *   1. Why Taxes Exist — the social contract
 *   2. Progressive vs Flat Tax — fairness and structure
 *   3. The Boston Tea Party — taxation without representation
 *   4. How Countries Spend Tax Money — where it goes
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Why Taxes Exist (Tier 1 — ages 5-6) ──────────────────

export const ENTRY_WHY_TAXES_EXIST: RealWorldEntry = {
  id: 'entry-why-taxes-exist',
  type: 'scientific_principle',
  title: 'The Deal We All Make Together',
  year: null,
  yearDisplay: 'Historical — ongoing',
  era: 'enlightenment',
  descriptionChild:
    "Taxes are the money everyone puts in to pay for things we all share — roads, schools, hospitals, fire trucks, parks. Nobody could build all those things alone. So we agree: everyone puts in a little, and everyone gets to use a lot.",
  descriptionOlder:
    "The 'Social Contract' (Locke, Rousseau) proposes that citizens give up some money and freedom in exchange for public services and protection. Taxes fund infrastructure (roads, bridges), education, healthcare, defence, and safety nets. Sam teaches that taxes are not punishment — they are the mechanism by which societies pool resources for shared benefit.",
  descriptionParent:
    "Taxation is the practical expression of the social contract — the agreement between citizens and government that underpins modern societies. Understanding taxation develops civic literacy: why we pay, who decides how much, and what happens when the contract breaks down (corruption, tax avoidance, revolt). Teaching children about taxes early normalises civic participation and demystifies a system that affects every aspect of adult life.",
  realPeople: ['John Locke', 'Jean-Jacques Rousseau'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: null,
  continent: null,
  subjectTags: ['taxation', 'social contract', 'public services', 'civic duty', 'government'],
  worldId: 'tax-office',
  guideId: 'sam-worthington',
  adventureType: 'guided_expedition',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-progressive-vs-flat-tax'],
  funFact:
    "Sam has a giant jar at the Tax Office entrance where every child deposits a token. At the end of the day, the jar buys something for the whole group — a demonstration of collective contribution. 'See? Nobody could afford this alone. Together, easy.'",
  imagePrompt:
    "A friendly civic building entrance: a giant glass jar filling with colorful tokens from children, the tokens flowing into pipes that connect to models of schools, hospitals, roads, and parks, Sam Worthington standing beside the jar explaining enthusiastically, warm institutional light with civic pride aesthetic, Studio Ghibli public service visualization",
  status: 'published',
};

// ─── Entry 2: Progressive vs Flat Tax (Tier 2 — ages 7-8) ──────────

export const ENTRY_PROGRESSIVE_VS_FLAT_TAX: RealWorldEntry = {
  id: 'entry-progressive-vs-flat-tax',
  type: 'scientific_principle',
  title: 'Should Everyone Pay the Same?',
  year: null,
  yearDisplay: 'Historical — ongoing',
  era: 'modern',
  descriptionChild:
    "Imagine two people. One earns a little and one earns a lot. Should they both put in the same amount? Or should the richer person put in more? Countries around the world answer this question differently — and it changes everything.",
  descriptionOlder:
    "Progressive taxation (higher earners pay a higher percentage) is used in most democracies on the principle that those who benefit more from society should contribute more. Flat taxation (everyone pays the same percentage) is simpler but critics argue it burdens lower earners disproportionately. Sam presents both sides: fairness means different things to different people.",
  descriptionParent:
    "The progressive vs flat tax debate encapsulates fundamental questions about equity, efficiency, and the role of government. Progressive taxation (championed by economists from Adam Smith to Thomas Piketty) follows the 'ability to pay' principle. Flat tax advocates emphasise simplicity and equal treatment. Teaching both perspectives develops nuanced thinking about fairness — there is no single 'right' answer, only trade-offs.",
  realPeople: ['Adam Smith', 'Thomas Piketty'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: null,
  continent: null,
  subjectTags: ['progressive tax', 'flat tax', 'fairness', 'economics', 'policy'],
  worldId: 'tax-office',
  guideId: 'sam-worthington',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-why-taxes-exist'],
  unlocks: ['entry-boston-tea-party'],
  funFact:
    "Sam runs a simulation where children earn different amounts of 'Tax Office Tokens' and then vote on whether taxation should be flat or progressive. He says: 'Every class votes differently. That's the point.'",
  imagePrompt:
    "A Tax Office classroom: two giant pie charts on the wall — one showing progressive taxation (larger slices from wealthier figures) and one showing flat taxation (equal-sized slices), children at desks debating with raised hands, Sam at the center mediating, balanced institutional lighting with debate energy, Studio Ghibli civic education scene",
  status: 'published',
};

// ─── Entry 3: The Boston Tea Party (Tier 2 — ages 7-8) ─────────────

export const ENTRY_BOSTON_TEA_PARTY: RealWorldEntry = {
  id: 'entry-boston-tea-party',
  type: 'event',
  title: 'Taxation Without Representation',
  year: 1773,
  yearDisplay: '1773 CE',
  era: 'enlightenment',
  descriptionChild:
    "A long time ago, American colonists were forced to pay taxes to the King of England — but they had no say in how the money was spent. They got so angry that they dumped 342 chests of tea into Boston Harbor. It started a revolution.",
  descriptionOlder:
    "The Boston Tea Party (1773) was a protest against the Tea Act, which gave the East India Company a monopoly on tea sales in the colonies. 'No taxation without representation' became the rallying cry. The act of destruction was strategic: the colonists weren't anti-tax, they were anti-taxation-without-consent. Sam teaches that the issue was voice, not money.",
  descriptionParent:
    "The Boston Tea Party illustrates a foundational democratic principle: taxation requires consent of the governed. The colonists' objection was procedural, not monetary — they had no elected representatives in the British Parliament. This event catalysed the American Revolution and established a principle now embedded in most democracies: the right to vote on how taxes are set and spent. Teaching this develops understanding of democratic accountability.",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 42.3601, lng: -71.0589, name: 'Boston, Massachusetts, USA' },
  continent: 'North America',
  subjectTags: ['Boston Tea Party', 'revolution', 'representation', 'democracy', 'protest'],
  worldId: 'tax-office',
  guideId: 'sam-worthington',
  adventureType: 'time_window',
  difficultyTier: 2,
  prerequisites: ['entry-progressive-vs-flat-tax'],
  unlocks: ['entry-how-countries-spend-taxes'],
  funFact:
    "The 342 chests of tea dumped into Boston Harbor were worth about $1.7 million in today's money. Sam keeps a tiny model ship at his desk with the inscription: 'The most expensive cup of tea never drunk.'",
  imagePrompt:
    "A Tax Office 'Time Window' showing Boston Harbor in 1773: colonists in period dress dumping wooden tea chests into moonlit water, the phrase 'No Taxation Without Representation' visible on a banner, Sam watching from the modern Tax Office doorway with a model ship in his hand, dramatic moonlit harbor scene with revolutionary energy, Studio Ghibli historical protest aesthetic",
  status: 'published',
};

// ─── Entry 4: How Countries Spend Tax Money (Tier 3 — ages 9-10) ───

export const ENTRY_HOW_COUNTRIES_SPEND_TAXES: RealWorldEntry = {
  id: 'entry-how-countries-spend-taxes',
  type: 'cultural_milestone',
  title: 'Where Does All the Money Go?',
  year: null,
  yearDisplay: 'Contemporary',
  era: 'contemporary',
  descriptionChild:
    "Different countries spend their tax money on different things. Some spend a lot on schools and hospitals. Some spend a lot on armies. Some spend a lot on roads. You can tell what a country cares about by looking at where the money goes.",
  descriptionOlder:
    "Nordic countries (Sweden, Denmark, Norway) tax heavily (45-55% of GDP) but provide free healthcare, education, and generous social safety nets. The US taxes less (27% of GDP) but spends heavily on defence (38% of federal discretionary spending). Japan spends the most on debt service. Sam teaches that budgets are moral documents: they reveal priorities.",
  descriptionParent:
    "Comparative tax spending reveals profound differences in national priorities. Nordic social democracies demonstrate that high taxation can correlate with high quality of life (top of happiness indices). The US model prioritises military spending and individual freedom over universal services. Understanding these trade-offs develops informed citizenship: every budget is a statement of values. Teaching children to read budgets as moral documents develops critical civic literacy.",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: null,
  continent: null,
  subjectTags: ['government spending', 'budget', 'priorities', 'comparison', 'civic literacy'],
  worldId: 'tax-office',
  guideId: 'sam-worthington',
  adventureType: 'guided_expedition',
  difficultyTier: 3,
  prerequisites: ['entry-boston-tea-party'],
  unlocks: [],
  funFact:
    "Sam has a giant interactive pie chart where children can allocate a national budget: 'You have 100 coins. How would you spend them? Education? Health? Defence? Roads?' Nobody ever gives the same answer. Sam says: 'Now you understand democracy.'",
  imagePrompt:
    "A Tax Office comparison room: giant wall displays showing pie charts from different countries (Sweden, USA, Japan, Nigeria) with different spending proportions, children at a control panel allocating their own 100-coin budget, Sam reviewing results with an approving nod, warm analytical light with civic engagement energy, Studio Ghibli comparative civics visualization",
  status: 'published',
};

// ─── Export ────────────────────────────────────────────────────────

export const TAX_OFFICE_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_WHY_TAXES_EXIST,
  ENTRY_PROGRESSIVE_VS_FLAT_TAX,
  ENTRY_BOSTON_TEA_PARTY,
  ENTRY_HOW_COUNTRIES_SPEND_TAXES,
];

export const TAX_OFFICE_ENTRY_IDS =
  TAX_OFFICE_ENTRIES.map((e) => e.id);
