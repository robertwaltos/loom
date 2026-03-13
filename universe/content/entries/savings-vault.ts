/**
 * Content Entries — The Savings Vault
 * World: The Savings Vault | Guide: Mr. Abernathy | Subject: Saving / Compound Interest
 *
 * Four published entries spanning the history and principles of saving:
 *   1. The Piggy Bank — psychology of separating saved from spendable money
 *   2. The Bank of Amsterdam — trust as infrastructure
 *   3. Compound Interest — the eighth wonder of the world
 *   4. The Freedman's Bank — financial freedom and systemic barriers
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: The Piggy Bank (Tier 1 — ages 5-6) ───────────────────

export const ENTRY_PIGGY_BANK_HISTORY: RealWorldEntry = {
  id: 'entry-piggy-bank-history',
  type: 'cultural_milestone',
  title: 'Why Is It Shaped Like a Pig?',
  year: null,
  yearDisplay: '~15th Century',
  era: 'medieval',
  descriptionChild:
    "A long time ago in England, cheap orange clay was called 'pygg.' People kept spare coins in jars made from pygg clay — 'pygg jars.' Over time, potters started making the jars shaped like actual pigs because the names sounded the same! That's how piggy banks became pig-shaped.",
  descriptionOlder:
    "The pygg-to-pig etymology is one widely-cited theory. Another traces piggy banks independently to China and Germany, where pig-shaped containers symbolized prosperity. What matters more than the origin story is the psychological principle: physically separating saved money from spendable money makes saving easier. The act of 'breaking' a piggy bank to access savings creates a satisfying cycle — save, accumulate, access, restart. Mr. Abernathy designed his Vault to make this principle visible at every scale.",
  descriptionParent:
    "Piggy banks teach behavioral economics before children know the term. The 'mental accounting' principle (Thaler, 1985) shows that people treat money differently depending on which 'account' they place it in — even when the money is fungible. A physical container for savings exploits this cognitive bias positively: money placed 'inside the pig' feels categorically different from pocket money, reducing the temptation to spend it. The 'breaking' ritual adds a friction cost to accessing savings, which research shows increases savings rates.",
  realPeople: [],
  quote: 'A penny saved is a penny earned.',
  quoteAttribution: 'Benjamin Franklin',
  geographicLocation: null,
  continent: 'Europe',
  subjectTags: ['piggy bank', 'saving', 'behavioral economics', 'mental accounting', 'money history'],
  worldId: 'savings-vault',
  guideId: 'mr-abernathy',
  adventureType: 'reenactment',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-bank-of-amsterdam'],
  funFact:
    "In Guatemala, piggy banks are traditionally shaped like chickens. In the Philippines, like water buffalo. The animal changes from culture to culture. The principle — separating saved money from spendable money — doesn't.",
  imagePrompt:
    "Medieval English pottery workshop, warm firelight, a potter shaping orange pygg clay into a pig-shaped jar with a coin slot on top, shelves of plain pygg clay jars alongside the newer pig-shaped ones, copper and silver coins scattered on the wooden workbench, the potter smiling at the pig shape as if realizing a pun, warm earthen tones, Studio Ghibli craftsmanship aesthetic with historical detail",
  status: 'published',
};

// ─── Entry 2: The Bank of Amsterdam (Tier 2 — ages 7-8) ────────────

export const ENTRY_BANK_OF_AMSTERDAM: RealWorldEntry = {
  id: 'entry-bank-of-amsterdam',
  type: 'invention',
  title: 'The Bank That Trusted Numbers Over Coins',
  year: 1609,
  yearDisplay: '1609 CE',
  era: 'renaissance',
  descriptionChild:
    "Hundreds of years ago, every city had different coins with different values — it was confusing! The Bank of Amsterdam solved this by accepting all coins and keeping careful, honest records of how much everyone had. People trusted the bank to remember. You didn't need to carry heavy coins anymore. The bank's ledger was your money.",
  descriptionOlder:
    "The Wisselbank (Exchange Bank) of Amsterdam separated 'money as physical object' from 'money as record of value.' Depositors' balances existed as entries in a ledger, not as piles of coins in a vault. This abstraction — money as information rather than metal — is the foundation of modern banking, credit cards, and digital payments. The Wisselbank worked because people trusted its records. Trust was the actual product. The bank operated for 170 years before mismanagement brought it down.",
  descriptionParent:
    "The Bank of Amsterdam (1609) represents a pivotal moment in financial history: the formalization of fractional banking and the abstraction of money from physical currency to ledger entries. It standardized exchange rates across hundreds of coin types, reducing transaction costs and enabling Amsterdam's dominance in global trade. The institution demonstrates that financial systems are fundamentally trust systems — they work only as long as participants believe the records are honest. Its eventual collapse (1790s) due to undisclosed loans to the Dutch East India Company reinforces the importance of transparency.",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 52.3676, lng: 4.9041, name: 'Amsterdam, Netherlands' },
  continent: 'Europe',
  subjectTags: ['banking history', 'money abstraction', 'trust systems', 'ledger', 'financial infrastructure'],
  worldId: 'savings-vault',
  guideId: 'mr-abernathy',
  adventureType: 'guided_expedition',
  difficultyTier: 2,
  prerequisites: ['entry-piggy-bank-history'],
  unlocks: ['entry-compound-interest'],
  funFact:
    "Mr. Abernathy lost his own savings when his bank collapsed. He rebuilt the Vault to be transparent — every mechanism is visible through glass walls. He says: 'A vault you can see through is a vault you can trust.'",
  imagePrompt:
    "Interior of the Bank of Amsterdam 1609, a grand Dutch Renaissance hall with high windows letting in golden canal-side light, clerks at long wooden desks writing in enormous leather-bound ledgers with quill pens, merchants from many nations presenting diverse coins at a counter, the coins being weighed on brass scales, a large chalkboard showing exchange rates, atmosphere of order and quiet industry, Studio Ghibli European historical realism with warm amber lighting",
  status: 'published',
};

// ─── Entry 3: Compound Interest (Tier 2 — ages 7-8) ────────────────

export const ENTRY_COMPOUND_INTEREST: RealWorldEntry = {
  id: 'entry-compound-interest',
  type: 'scientific_principle',
  title: 'The Trees That Grow Trees',
  year: null,
  yearDisplay: 'Timeless Principle',
  era: 'modern',
  descriptionChild:
    "If you save $100 and earn interest, you get extra money. But here's the magic: next year, you earn interest on your original $100 PLUS the interest you already earned. Your money grows money, and then the new money grows more money. It's like planting a tree that drops seeds that grow into more trees.",
  descriptionOlder:
    "Compound interest is exponential growth applied to money. At a 7% annual return, money doubles roughly every 10 years — this is called the 'Rule of 72' (divide 72 by the interest rate to find how many years to double). A 25-year-old who saves $5,000 per year until age 65 ends up with approximately $1 million. A 35-year-old saving the same amount ends up with approximately $500,000. The ten-year head start is worth half a million dollars. Mr. Abernathy demonstrates this with savings trees that grow at visibly different rates.",
  descriptionParent:
    "Compound interest is the single most important concept in personal finance and one of the clearest real-world examples of exponential growth. The key pedagogical insight is the power of time: early saving produces disproportionately large results due to the compounding effect. This entry uses Mr. Abernathy's 'savings trees' metaphor — trees planted at different times growing to physically different sizes — to make the abstract mathematical relationship visceral. The 'Rule of 72' provides a simple mental tool children can use throughout life.",
  realPeople: ['Albert Einstein'],
  quote: "Compound interest is the eighth wonder of the world.",
  quoteAttribution: 'Attributed to Albert Einstein (probably apocryphal)',
  geographicLocation: null,
  continent: null,
  subjectTags: ['compound interest', 'exponential growth', 'saving', 'Rule of 72', 'time value of money'],
  worldId: 'savings-vault',
  guideId: 'mr-abernathy',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-bank-of-amsterdam'],
  unlocks: ['entry-freedmans-bank'],
  funFact:
    "Einstein supposedly called compound interest 'the eighth wonder of the world.' He probably never actually said this — there is no verified source. But the math is true regardless of who said it.",
  imagePrompt:
    "Inside Mr. Abernathy's Savings Vault, two golden savings trees side by side — one planted 'ten years earlier' towering with thick trunk and heavy golden leaf-coins, the other planted later with a thinner trunk and fewer leaves, both growing from soil made of stacked coins, Mr. Abernathy standing between them with a measuring stick showing the difference, amber vault lighting reflecting off polished brass walls, floating numbers showing compound growth, Studio Ghibli magical realism with financial education warmth",
  status: 'published',
};

// ─── Entry 4: The Freedman's Bank (Tier 3 — ages 9-10) ─────────────

export const ENTRY_FREEDMANS_BANK: RealWorldEntry = {
  id: 'entry-freedmans-bank',
  type: 'cultural_milestone',
  title: 'When Freedom Meant Learning to Save',
  year: 1865,
  yearDisplay: '1865 CE',
  era: 'industrial',
  descriptionChild:
    "On June 19, 1865, enslaved people in Texas finally learned they were free — two and a half years after the Emancipation Proclamation. Freedom meant many things, but one of the first was the right to earn, save, and decide what to do with your own money. The Freedman's Bank was created to help. Saving is a freedom.",
  descriptionOlder:
    "After emancipation, formerly enslaved people faced systemic economic barriers — no inherited wealth, no property, and widespread discrimination. The Freedman's Savings Bank (1865–1874) was created by Congress to help Black Americans build financial stability. At its peak, it held deposits from over 61,000 people. But white bank trustees made reckless investments and committed fraud. The bank collapsed, devastating its depositors. Frederick Douglass briefly served as president and used his own money trying to save it. He couldn't. The story of financial freedom is inseparable from the struggle for civil rights.",
  descriptionParent:
    "The Freedman's Bank story teaches the intersection of financial literacy, systemic inequality, and institutional trust. It demonstrates that access to savings infrastructure is not equally distributed — and that trust, once broken, has generational consequences. Research shows that the bank's failure contributed to persistent distrust of financial institutions in Black communities. Mr. Abernathy keeps a page from the bank's ledger in his Vault's Trust Memorial as a reminder that financial systems must earn and maintain the trust of every depositor, especially the most vulnerable.",
  realPeople: ['Frederick Douglass'],
  quote: "Where justice is denied, where poverty is enforced, neither persons nor property will be safe.",
  quoteAttribution: 'Frederick Douglass',
  geographicLocation: { lat: 29.3013, lng: -94.7977, name: 'Galveston, Texas, USA' },
  continent: 'North America',
  subjectTags: ['financial freedom', 'Juneteenth', 'civil rights', 'banking trust', 'systemic inequality'],
  worldId: 'savings-vault',
  guideId: 'mr-abernathy',
  adventureType: 'remembrance_wall',
  difficultyTier: 3,
  prerequisites: ['entry-compound-interest'],
  unlocks: [],
  funFact:
    "The Freedman's Bank failure wiped out savings of over 61,000 depositors. Frederick Douglass, briefly the bank's president, used his own money to try to save it. He couldn't. Mr. Abernathy keeps the bank's ledger page as a reminder.",
  imagePrompt:
    "Interior of Mr. Abernathy's Trust Memorial room in the Vault, a solemn but warm space, a framed historical ledger page from the Freedman's Savings Bank mounted on a polished brass wall, names and deposit amounts visible in faded ink, beside it a portrait of Frederick Douglass looking resolute, Mr. Abernathy standing respectfully with hand over heart, warm amber vault lighting through stained glass showing scenes of emancipation and rebuilding, Studio Ghibli emotional historical realism, atmosphere of remembrance and resolve",
  status: 'published',
};

// ─── Export ────────────────────────────────────────────────────────

export const SAVINGS_VAULT_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_PIGGY_BANK_HISTORY,
  ENTRY_BANK_OF_AMSTERDAM,
  ENTRY_COMPOUND_INTEREST,
  ENTRY_FREEDMANS_BANK,
];

export const SAVINGS_VAULT_ENTRY_IDS = SAVINGS_VAULT_ENTRIES.map((e) => e.id);
