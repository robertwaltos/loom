/**
 * Content Entries — Investment Greenhouse
 * World: Investment Greenhouse | Guide: Jin-ho Park | Subject: Investing / Risk & Reward
 *
 * Four published entries spanning investing and financial growth:
 *   1. Warren Buffett's first investment — patience beats timing
 *   2. The Invention of Insurance — sharing risk after the Great Fire
 *   3. Hyperinflation in Zimbabwe — when trust in money collapses
 *   4. Index Funds and John Bogle — buy the whole garden
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Warren Buffett (Tier 1 — ages 5-6) ───────────────────

export const ENTRY_WARREN_BUFFETT: RealWorldEntry = {
  id: 'entry-warren-buffett',
  type: 'person',
  title: 'The Boy Who Bought His First Stock at Eleven',
  year: 1941,
  yearDisplay: '1941 CE',
  era: 'modern',
  descriptionChild:
    "Warren Buffett bought his first stock when he was 11 years old — three shares of a company. He bought low and sold when the price went up a little. Then the price went way up. He learned that patience is the most important investing skill.",
  descriptionOlder:
    "He sold those shares for a $5 profit. If he had waited, they would have been worth much more. At 11, he learned the most important lesson in investing: patience beats timing. Buffett went on to become one of the wealthiest people in history by buying good companies and holding them for decades.",
  descriptionParent:
    "Buffett's story illustrates the core investing principle of long-term value: the advantage of patient capital over reactive trading. His early mistake — selling too soon — became the foundation of his entire investment philosophy. For children, the lesson is concrete: waiting is an active skill, and the hardest part of investing is doing nothing when impulse says otherwise.",
  realPeople: ['Warren Buffett'],
  quote: "The stock market is a device for transferring money from the impatient to the patient.",
  quoteAttribution: 'Warren Buffett',
  geographicLocation: { lat: 41.2565, lng: -95.9345, name: 'Omaha, Nebraska, USA' },
  continent: 'North America',
  subjectTags: ['investing', 'patience', 'stock market', 'value investing', 'finance'],
  worldId: 'investment-greenhouse',
  guideId: 'jin-ho-park',
  adventureType: 'reenactment',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-invention-of-insurance'],
  funFact:
    "Buffett filed his first tax return at age 13, deducting his bicycle as a work expense. He used it to deliver newspapers — his first business.",
  imagePrompt:
    "A warm greenhouse with investment 'plants' — small seedlings in pots labelled with stock ticker symbols, an 11-year-old boy carefully tending a tiny sprout, a clock on the wall with 'PATIENCE' written where the numbers should be, mature trees visible through the glass walls representing decades of growth, golden afternoon light streaming through greenhouse panels, Studio Ghibli gentle wonder",
  status: 'published',
};

// ─── Entry 2: The Invention of Insurance (Tier 2 — ages 7-8) ───────

export const ENTRY_INVENTION_OF_INSURANCE: RealWorldEntry = {
  id: 'entry-invention-of-insurance',
  type: 'invention',
  title: 'The Coffee Shop That Tamed Fire',
  year: 1666,
  yearDisplay: '1666 CE',
  era: 'enlightenment',
  descriptionChild:
    "After the Great Fire of London burned down most of the city, people invented a way to share risk. Everyone pays a little, and if your house burns, the pool of money helps you rebuild. It started in a coffee shop where ship owners gathered.",
  descriptionOlder:
    "Insurance is a bet. You bet something bad will happen. The company bets it won't. Both sides benefit because certainty has value — even if nothing goes wrong. Lloyd's of London started as Edward Lloyd's coffee shop where ship owners, merchants, and underwriters met to share the risk of ocean voyages.",
  descriptionParent:
    "Insurance is one of civilisation's most important financial inventions — a mechanism for distributing risk across a pool of participants so that no single event destroys any individual. The mathematical foundations (actuarial science, probability theory) emerged alongside insurance itself. For children, insurance introduces risk management, probability thinking, and the power of collective action — everyone paying a small cost to protect against catastrophic individual loss.",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 51.5127, lng: -0.0826, name: 'London, England' },
  continent: 'Europe',
  subjectTags: ['insurance', 'risk', 'Great Fire of London', 'finance', 'Lloyds'],
  worldId: 'investment-greenhouse',
  guideId: 'jin-ho-park',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-warren-buffett'],
  unlocks: ['entry-zimbabwe-hyperinflation'],
  funFact:
    "Lloyd's of London started in a coffee shop where ship owners gathered to share risk on voyages. Today it insures everything from satellites to celebrity body parts. The tradition of doing business over coffee survived for centuries.",
  imagePrompt:
    "17th-century London coffee shop interior, merchants and ship owners gathered around wooden tables covered with ledgers and quill pens, a view through the window showing the city being rebuilt after the Great Fire, smoke still faintly visible on the horizon, a chalkboard showing 'Risk Shared = Risk Reduced,' warm candlelight and coffee steam, Studio Ghibli historical atmosphere with financial gravitas",
  status: 'published',
};

// ─── Entry 3: Zimbabwe Hyperinflation (Tier 2 — ages 7-8) ──────────

export const ENTRY_ZIMBABWE_HYPERINFLATION: RealWorldEntry = {
  id: 'entry-zimbabwe-hyperinflation',
  type: 'event',
  title: 'When a Trillion Dollars Cannot Buy Bread',
  year: 2008,
  yearDisplay: '2008 CE',
  era: 'contemporary',
  descriptionChild:
    "Zimbabwe printed so much money that prices doubled every day. People needed wheelbarrows of cash to buy bread. It showed that money is only worth what people believe it's worth.",
  descriptionOlder:
    "At its peak, Zimbabwe experienced 79.6 billion percent monthly inflation. A 100-trillion-dollar bill wouldn't buy a bus ticket. It's the most extreme modern example of what happens when trust in money collapses completely.",
  descriptionParent:
    "Zimbabwe's hyperinflation (2007-2009) is a case study in monetary policy failure. Excessive money printing without corresponding economic output destroyed the currency's purchasing power. The crisis forced Zimbabweans to adopt foreign currencies (US dollar, South African rand) for daily transactions. For children, it's a vivid demonstration that money's value is based entirely on collective trust — and that trust, once broken, is extraordinarily difficult to rebuild.",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: -17.8252, lng: 31.0335, name: 'Harare, Zimbabwe' },
  continent: 'Africa',
  subjectTags: ['hyperinflation', 'money', 'trust', 'Zimbabwe', 'economics'],
  worldId: 'investment-greenhouse',
  guideId: 'jin-ho-park',
  adventureType: 'guided_expedition',
  difficultyTier: 2,
  prerequisites: ['entry-invention-of-insurance'],
  unlocks: ['entry-index-funds'],
  funFact:
    "Zimbabwe issued a 100-trillion-dollar banknote. It's now worth more as a collector's item than it ever was as currency. Jin-ho keeps one in the Greenhouse as a reminder that numbers on paper only matter if trust backs them up.",
  imagePrompt:
    "A greenhouse section where plants have wilted and price tags keep multiplying — a small tomato plant with a tag reading '$100 TRILLION,' wheelbarrows overflowing with worthless banknotes used as mulch, a single loaf of bread on a high shelf with an impossibly long price tag trailing to the floor, a contrast panel showing the same bread at a normal price in a healthy greenhouse section, Studio Ghibli economic parable visualization",
  status: 'published',
};

// ─── Entry 4: Index Funds and John Bogle (Tier 3 — ages 9-10) ──────

export const ENTRY_INDEX_FUNDS: RealWorldEntry = {
  id: 'entry-index-funds',
  type: 'invention',
  title: 'Buy the Whole Garden',
  year: 1976,
  yearDisplay: '1976 CE',
  era: 'contemporary',
  descriptionChild:
    "Instead of trying to pick the best stocks, John Bogle said: buy a little bit of everything. He invented a simple way to invest that beats most professional stock pickers. It's like planting every kind of seed instead of guessing which one will grow tallest.",
  descriptionOlder:
    "Bogle's insight was that most professional investors can't consistently beat the market average. So he created a fund that simply buys the entire market. Over decades, this approach outperforms the vast majority of actively managed funds — with lower fees and less effort.",
  descriptionParent:
    "The index fund is arguably the most important financial innovation of the 20th century for ordinary investors. By tracking the entire market rather than attempting to beat it, index funds offer diversification, low fees, and historically superior long-term returns compared to actively managed alternatives. Bogle deliberately structured Vanguard as a client-owned company — investors own the company that manages their money, eliminating the conflict of interest inherent in for-profit fund management.",
  realPeople: ['John Bogle'],
  quote: "Don't look for the needle in the haystack. Just buy the haystack.",
  quoteAttribution: 'John Bogle',
  geographicLocation: { lat: 40.0379, lng: -75.5149, name: 'Valley Forge, Pennsylvania, USA' },
  continent: 'North America',
  subjectTags: ['index funds', 'investing', 'Vanguard', 'diversification', 'finance'],
  worldId: 'investment-greenhouse',
  guideId: 'jin-ho-park',
  adventureType: 'reenactment',
  difficultyTier: 3,
  prerequisites: ['entry-zimbabwe-hyperinflation'],
  unlocks: [],
  funFact:
    "Bogle's company, Vanguard, now manages over $7 trillion. He deliberately structured it so that it's owned by its investors, not by shareholders. Jin-ho considers this the most elegant financial design ever created.",
  imagePrompt:
    "A magnificent greenhouse viewed from above, showing two approaches side by side: on the left, a gardener frantically moving from pot to pot trying to pick winners (some growing, many wilting), on the right, a calm gardener standing before a lush garden of EVERY plant species growing together in harmony, a sign reading 'Buy the Whole Garden,' Vanguard ship logo subtly visible on a watering can, warm golden light, Studio Ghibli split-comparison composition",
  status: 'published',
};

// ─── Export ────────────────────────────────────────────────────────

export const INVESTMENT_GREENHOUSE_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_WARREN_BUFFETT,
  ENTRY_INVENTION_OF_INSURANCE,
  ENTRY_ZIMBABWE_HYPERINFLATION,
  ENTRY_INDEX_FUNDS,
];

export const INVESTMENT_GREENHOUSE_ENTRY_IDS =
  INVESTMENT_GREENHOUSE_ENTRIES.map((e) => e.id);
