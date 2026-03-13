/**
 * Content Entries — Job Fair
 * World: Job Fair | Guide: Babatunde Afolabi | Subject: Careers / Work / Earning
 *
 * Four published entries spanning work, careers, and economic opportunity:
 *   1. Adam Smith's Pin Factory — the division of labour
 *   2. Child Labour Laws — when children stopped working
 *   3. The Gig Economy — new ways of working
 *   4. Equal Pay — the gap that persists
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Adam Smith's Pin Factory (Tier 1 — ages 5-6) ─────────

export const ENTRY_ADAM_SMITH_PIN_FACTORY: RealWorldEntry = {
  id: 'entry-adam-smith-pin-factory',
  type: 'person',
  title: 'The Factory That Made 48,000 Pins',
  year: 1776,
  yearDisplay: '1776 CE',
  era: 'enlightenment',
  descriptionChild:
    "Adam Smith visited a pin factory and noticed something remarkable: one worker making pins alone could make about 20 per day. But when ten workers each did one small part of the job, together they made 48,000 pins per day. Breaking a big job into small pieces makes everyone faster.",
  descriptionOlder:
    "Smith's observation in The Wealth of Nations (1776) became the foundational principle of modern economics. The division of labour increases productivity through specialisation, but Smith also warned of its costs: workers performing one tiny task all day could become mentally dulled. He advocated for education as a counterbalance. Babatunde teaches both sides.",
  descriptionParent:
    "Adam Smith's pin factory example is the most famous illustration in economic history. It demonstrates how specialisation multiplies output but also introduces the concept of alienated labour — workers who know their step but not the product. Smith's dual insight (efficiency gains AND human costs of hyper-specialisation) makes this a nuanced teaching moment about work, purpose, and the trade-offs inherent in industrial organisation.",
  realPeople: ['Adam Smith'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 56.3398, lng: -2.7967, name: 'Kirkcaldy, Scotland' },
  continent: 'Europe',
  subjectTags: ['division of labour', 'Adam Smith', 'economics', 'specialisation', 'productivity'],
  worldId: 'job-fair',
  guideId: 'babatunde-afolabi',
  adventureType: 'reenactment',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-child-labour-laws'],
  funFact:
    "Smith's pin factory employed ten workers who produced 48,000 pins per day — but none of those workers could have explained what a 'pin' was for. They knew their step, not the product. Babatunde says this is the risk of over-specialisation.",
  imagePrompt:
    "A bright career fair booth designed as a miniature pin factory: ten workers at stations each performing one step (drawing wire, cutting, pointing, attaching heads), a counter showing '48,000 PINS' versus a solo worker's station showing '20 PINS,' Babatunde standing at the entrance explaining with animated gestures, warm optimistic fair lighting, Studio Ghibli detailed industrial miniature",
  status: 'published',
};

// ─── Entry 2: Child Labour Laws (Tier 2 — ages 7-8) ────────────────

export const ENTRY_CHILD_LABOUR_LAWS: RealWorldEntry = {
  id: 'entry-child-labour-laws',
  type: 'cultural_milestone',
  title: 'The Right to Learn Instead of Work',
  year: 1833,
  yearDisplay: '1833 CE',
  era: 'industrial',
  descriptionChild:
    "A long time ago, children as young as five worked in factories, mines, and chimneys. It was dangerous and they couldn't go to school. People fought to change this. Now, in most countries, children have the right to learn instead of work. But in some places, children still work.",
  descriptionOlder:
    "The 1833 Factory Act was the first effective British child labour law, limiting working hours and banning children under nine from factories. Lord Shaftesbury spent decades campaigning for reforms. Today, the ILO estimates 160 million children worldwide still work, many in hazardous conditions. Babatunde teaches the history honestly: progress is real but incomplete.",
  descriptionParent:
    "Child labour reform is a story of incremental progress driven by moral advocacy, economic change, and political will. Lord Shaftesbury's campaigns transformed British labour law, but global child labour persists due to poverty, weak enforcement, and demand for cheap goods. Teaching children this history honestly — celebrating victories while acknowledging ongoing injustice — develops both historical awareness and ethical responsibility.",
  realPeople: ['Lord Shaftesbury (Anthony Ashley-Cooper)'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 51.5074, lng: -0.1278, name: 'London, England' },
  continent: 'Europe',
  subjectTags: ['child labour', 'workers rights', 'reform', 'education', 'history'],
  worldId: 'job-fair',
  guideId: 'babatunde-afolabi',
  adventureType: 'time_window',
  difficultyTier: 2,
  prerequisites: ['entry-adam-smith-pin-factory'],
  unlocks: ['entry-gig-economy'],
  funFact:
    "Before child labour laws, chimney sweeps as young as four were lowered into chimneys because they were small enough to fit. Some got stuck. Babatunde says: 'The Fair exists because people fought for your right to be here instead of in a factory.'",
  imagePrompt:
    "A Job Fair 'Time Window' booth showing an 1830s factory scene: small children operating dangerous machinery in dim light, contrasted with the bright modern fair where children hold books and explore career booths freely, Lord Shaftesbury's silhouette visible between the two eras, a banner reading 'The Right to Learn,' warm hopeful light on the modern side, dark industrial light on the historical side, Studio Ghibli historical contrast",
  status: 'published',
};

// ─── Entry 3: The Gig Economy (Tier 2 — ages 7-8) ──────────────────

export const ENTRY_GIG_ECONOMY: RealWorldEntry = {
  id: 'entry-gig-economy',
  type: 'cultural_milestone',
  title: 'A Thousand Small Jobs',
  year: 2009,
  yearDisplay: '2009–present',
  era: 'contemporary',
  descriptionChild:
    "Some people don't have one boss or one office. They do lots of different short jobs — driving people around, delivering food, designing websites — and they choose when and how much they work. This is called the 'gig economy.'",
  descriptionOlder:
    "The gig economy (Uber, DoorDash, Fiverr) offers flexibility but often without benefits, job security, or minimum wage guarantees. Workers are classified as 'independent contractors' rather than 'employees,' which reduces company obligations. The debate centres on whether gig work represents freedom or exploitation — or both, depending on the worker's circumstances.",
  descriptionParent:
    "The gig economy represents a fundamental shift in the employer-employee relationship, enabled by digital platforms. Classification of workers as independent contractors exempts companies from providing benefits, healthcare, and minimum wage protections. The regulatory response varies globally — some jurisdictions (California's AB5, EU directives) are reclassifying gig workers as employees. Teaching children about gig work develops understanding of labour rights, flexibility trade-offs, and the evolving nature of work.",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: null,
  continent: null,
  subjectTags: ['gig economy', 'work', 'flexibility', 'labour rights', 'technology'],
  worldId: 'job-fair',
  guideId: 'babatunde-afolabi',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-child-labour-laws'],
  unlocks: ['entry-equal-pay'],
  funFact:
    "Babatunde has changed careers seven times. He says each change taught him something the previous job couldn't. He also says: 'I was lucky. I chose to change. Not everyone gets that choice.'",
  imagePrompt:
    "A modern Job Fair booth styled as a digital gig board: multiple screens showing different short tasks (drive, deliver, design, write), a worker at the center choosing between them with freedom but also visible uncertainty (no health insurance card, no guaranteed hours), Babatunde facilitating a discussion group of children examining the trade-offs, contemporary office-meets-street lighting, Studio Ghibli modern work commentary",
  status: 'published',
};

// ─── Entry 4: Equal Pay (Tier 3 — ages 9-10) ───────────────────────

export const ENTRY_EQUAL_PAY: RealWorldEntry = {
  id: 'entry-equal-pay',
  type: 'cultural_milestone',
  title: 'Same Work, Different Wages',
  year: 1963,
  yearDisplay: '1963–present',
  era: 'contemporary',
  descriptionChild:
    "People doing the same job should earn the same money, no matter whether they're a boy or a girl. This sounds obvious, but for most of history — and in many places today — women earned less than men for the same work. It's getting better, but it's not fixed yet.",
  descriptionOlder:
    "The global gender pay gap stands at approximately 20% — women earn, on average, 80 cents for every dollar men earn. Causes include occupational segregation, differences in hours worked (often driven by unpaid caregiving), and direct discrimination. The gap is narrower in some countries (Iceland, Norway) and wider in others. Babatunde teaches that equal pay is both a fairness issue and an economic efficiency issue.",
  descriptionParent:
    "The gender pay gap persists due to a complex interaction of occupational segregation, negotiation dynamics, caregiving responsibilities (disproportionately borne by women), and direct discrimination. Policy responses range from transparency laws (UK's gender pay gap reporting) to Iceland's equal pay certification. Teaching children about the pay gap develops understanding of systemic inequality, the difference between formal equality and substantive equity, and the importance of measuring outcomes rather than just intentions.",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 64.1466, lng: -21.9426, name: 'Reykjavik, Iceland' },
  continent: 'Europe',
  subjectTags: ['equal pay', 'gender gap', 'fairness', 'labour rights', 'policy'],
  worldId: 'job-fair',
  guideId: 'babatunde-afolabi',
  adventureType: 'guided_expedition',
  difficultyTier: 3,
  prerequisites: ['entry-gig-economy'],
  unlocks: [],
  funFact:
    "Iceland became the first country to legally require companies to prove they pay equally regardless of gender (2018). Babatunde keeps a tiny Icelandic flag at his booth as an example of what 'fixed' can look like.",
  imagePrompt:
    "A Job Fair 'Equity Booth': two identical workstations with identical outputs, but one wage envelope is visibly thicker than the other, children examining the discrepancy with magnifying glasses, a small Icelandic flag on the desk, a global map showing pay gap percentages by country in gradient colors, Babatunde standing with arms crossed and a thoughtful expression, clear analytical light, Studio Ghibli fairness visualization",
  status: 'published',
};

// ─── Export ────────────────────────────────────────────────────────

export const JOB_FAIR_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_ADAM_SMITH_PIN_FACTORY,
  ENTRY_CHILD_LABOUR_LAWS,
  ENTRY_GIG_ECONOMY,
  ENTRY_EQUAL_PAY,
];

export const JOB_FAIR_ENTRY_IDS =
  JOB_FAIR_ENTRIES.map((e) => e.id);
