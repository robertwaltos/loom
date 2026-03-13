/**
 * Content Entries — Debt Glacier
 * World: Debt Glacier | Guide: Elsa Lindgren | Subject: Borrowing / Debt Management
 *
 * Four published entries spanning debt, interest, and financial responsibility:
 *   1. The Concept of Interest — renting money since Mesopotamia
 *   2. The Credit Score — your financial reputation (FICO)
 *   3. The 2008 Financial Crisis — when debt broke the world
 *   4. Student Debt and the Cost of Education
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: The Concept of Interest (Tier 1 — ages 5-6) ──────────

export const ENTRY_CONCEPT_OF_INTEREST: RealWorldEntry = {
  id: 'entry-concept-of-interest',
  type: 'scientific_principle',
  title: 'Renting Money',
  year: -3000,
  yearDisplay: '~3000 BCE',
  era: 'ancient',
  descriptionChild:
    "When you borrow money, you have to pay back more than you borrowed. The extra is called interest — it's like rent for using someone else's money. The Sumerians invented this idea 5,000 years ago, and it still works the same way.",
  descriptionOlder:
    "Interest evolved independently across civilisations as a mechanism to compensate lenders for the risk of non-repayment and the opportunity cost of not using their money elsewhere. The Sumerian word for interest — 'mas' — also meant 'calf,' suggesting the concept originated from livestock lending: borrow a cow, return it with a calf. Elsa teaches interest without judgment — it's a tool, not a trap, unless misused.",
  descriptionParent:
    "Interest is one of the oldest financial concepts in recorded history, with evidence from Sumerian clay tablets dating to 3000 BCE. The evolution from livestock lending (where natural reproduction provided the 'interest') to monetary interest represents a fundamental abstraction in economic thinking. Understanding interest — both as a cost of borrowing and a reward for saving — is foundational to financial literacy and underpins every modern financial system.",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 31.3217, lng: 45.637, name: 'Mesopotamia (modern Iraq)' },
  continent: 'Asia',
  subjectTags: ['interest', 'debt', 'Sumerians', 'Mesopotamia', 'finance'],
  worldId: 'debt-glacier',
  guideId: 'elsa-lindgren',
  adventureType: 'guided_expedition',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-credit-score'],
  funFact:
    "Most major religions historically banned or restricted interest (called 'usury'). Islam still prohibits it, developing alternative financing models like profit-sharing. Elsa respects all systems and teaches the principles behind each.",
  imagePrompt:
    "An icy glacier landscape with a calm demonstration area: Elsa showing a small ice block (loan) that slowly grows larger as interest accumulates, ancient Sumerian clay tablets with cuneiform markings visible in a display case, a cow and calf carved in ice nearby representing the original concept, cold blue light with clinical precision, Studio Ghibli arctic beauty with educational clarity",
  status: 'published',
};

// ─── Entry 2: The Credit Score (Tier 2 — ages 7-8) ─────────────────

export const ENTRY_CREDIT_SCORE: RealWorldEntry = {
  id: 'entry-credit-score',
  type: 'invention',
  title: 'Your Financial Report Card',
  year: 1956,
  yearDisplay: '1956 CE',
  era: 'contemporary',
  descriptionChild:
    "When you want to borrow money — for a house, a car, or school — the lender checks a number called your credit score. It's a measure of how reliably you've paid back money before. The higher the number, the more trust people have in you.",
  descriptionOlder:
    "Credit scoring condenses a person's entire borrowing history into a three-digit number (300-850 for FICO). The system has been criticised for embedding historical inequities: communities denied credit for decades (through practices like redlining) start with lower scores, creating a feedback loop. Elsa teaches credit with full context — the mechanism, the benefits, the biases, and the ongoing debate about fairness.",
  descriptionParent:
    "The FICO score (Fair, Isaac, and Company) standardised credit assessment, replacing subjective banker decisions with algorithmic evaluation. While reducing some forms of discrimination, the system created new concerns: historical redlining and discriminatory lending practices depressed credit scores for entire communities, creating intergenerational disadvantage. Teaching children about credit scores within their full historical context develops critical thinking about how systems can be simultaneously better than what preceded them and still deeply flawed.",
  realPeople: ['Bill Fair', 'Earl Isaac'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 37.3382, lng: -121.8863, name: 'San Jose, California, USA' },
  continent: 'North America',
  subjectTags: ['credit score', 'FICO', 'borrowing', 'trust', 'finance'],
  worldId: 'debt-glacier',
  guideId: 'elsa-lindgren',
  adventureType: 'guided_expedition',
  difficultyTier: 2,
  prerequisites: ['entry-concept-of-interest'],
  unlocks: ['entry-2008-financial-crisis'],
  funFact:
    "The first FICO score was calculated in 1989. Before that, loan decisions were made by bank managers who used 'gut feeling' — which often meant discriminating based on race, gender, and neighbourhood. The score was an improvement. It was not a solution.",
  imagePrompt:
    "A glacier observation point with a large thermometer-style display showing a credit score from 300 (deep ice blue) to 850 (warm gold), Elsa pointing to the middle range explaining the mechanism, historical panels showing the evolution from subjective banker decisions to algorithmic scoring, ice formations shaped like ledger books and bank buildings, cold analytical light, Studio Ghibli precision with financial education",
  status: 'published',
};

// ─── Entry 3: The 2008 Financial Crisis (Tier 2 — ages 7-8) ────────

export const ENTRY_2008_FINANCIAL_CRISIS: RealWorldEntry = {
  id: 'entry-2008-financial-crisis',
  type: 'event',
  title: 'The Day the Ice Cracked',
  year: 2008,
  yearDisplay: '2007–2009 CE',
  era: 'contemporary',
  descriptionChild:
    "Banks lent money for houses to people who couldn't afford to pay it back. When millions of people couldn't pay, the banks ran out of money, and the problems spread around the whole world. Many people lost their homes.",
  descriptionOlder:
    "The 2008 crisis resulted from a chain: banks issued subprime mortgages (high-risk loans), bundled them into complex securities (CDOs), and sold them to investors who didn't understand the underlying risk. When housing prices fell, the securities became worthless, and banks that held them collapsed. The crisis demonstrated how excessive debt, inadequate regulation, and misaligned incentives can create systemic risk.",
  descriptionParent:
    "The 2008 Global Financial Crisis is the defining economic event of the 21st century. Its causes — moral hazard, regulatory capture, excessive leverage, and opacity in structured financial products — illustrate systemic vulnerabilities that persist in modern finance. The crisis erased trillions in wealth, caused millions of foreclosures, and triggered the worst global recession since the 1930s. Teaching children about 2008 in age-appropriate terms builds understanding of interconnected risk and the importance of responsible borrowing and lending.",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 40.7061, lng: -74.0088, name: 'Wall Street, New York, USA' },
  continent: 'North America',
  subjectTags: ['financial crisis', '2008', 'debt', 'banking', 'systemic risk'],
  worldId: 'debt-glacier',
  guideId: 'elsa-lindgren',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-credit-score'],
  unlocks: ['entry-student-debt'],
  funFact:
    "Iceland's three largest banks collapsed in 2008. The country's response was unusual: they let the banks fail, protected domestic depositors, and put several bankers in prison. Elsa keeps an Icelandic króna in a display case as a reminder.",
  imagePrompt:
    "A massive glacier cracking apart: ice blocks labelled 'Mortgages,' 'CDOs,' 'Banks' tumbling in a chain reaction, tiny houses sliding off the edge, Elsa standing at a safe observation point with children watching the cascade of failures, an Icelandic króna coin in a glass case at her feet, cold blue crisis light transitioning to rebuilding warmth at the edges, Studio Ghibli economic disaster visualization with hope",
  status: 'published',
};

// ─── Entry 4: Student Debt (Tier 3 — ages 9-10) ────────────────────

export const ENTRY_STUDENT_DEBT: RealWorldEntry = {
  id: 'entry-student-debt',
  type: 'cultural_milestone',
  title: 'Two Paths on the Glacier',
  year: 1965,
  yearDisplay: '1965–present',
  era: 'contemporary',
  descriptionChild:
    "Going to university costs a lot of money. Many students borrow money to pay for it and spend years paying it back after they finish. Some people think education should be free. Others think students should pay because they benefit from it. Elsa says both sides have real points.",
  descriptionOlder:
    "U.S. student debt exceeds $1.7 trillion, held by over 44 million borrowers. Average debt per borrower is approximately $37,000. Some countries (Germany, Norway, Finland) offer free or very low-cost university education, funded by taxes. The debate centres on whether education is a personal investment (the borrower benefits and should pay) or a public good (society benefits and should fund it).",
  descriptionParent:
    "Student debt policy sits at the intersection of education policy, economic opportunity, and intergenerational equity. The US model (heavy individual borrowing) and the Nordic model (tax-funded universal access) represent fundamentally different answers to who should pay for education. Both have trade-offs. Teaching children about this debate develops the ability to hold multiple legitimate perspectives simultaneously — a crucial skill for civic participation.",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: null,
  continent: null,
  subjectTags: ['student debt', 'education', 'borrowing', 'public good', 'policy'],
  worldId: 'debt-glacier',
  guideId: 'elsa-lindgren',
  adventureType: 'guided_expedition',
  difficultyTier: 3,
  prerequisites: ['entry-2008-financial-crisis'],
  unlocks: [],
  funFact:
    "In medieval Europe, universities were often free because the Church funded them. The concept of students paying tuition is more recent than most people assume. Elsa says the history of education funding is the history of who society believes deserves to learn.",
  imagePrompt:
    "A glacier with two clear paths diverging: the left path (debt path) shows a student climbing uphill with a growing ice block of debt on their back, the right path (shared path) shows multiple people carrying small, manageable ice chips together, both paths arriving at the same university on the peak, flags from Germany, Norway, and Finland on the shared path, Studio Ghibli split-path moral visualization, cold but hopeful light",
  status: 'published',
};

// ─── Export ────────────────────────────────────────────────────────

export const DEBT_GLACIER_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_CONCEPT_OF_INTEREST,
  ENTRY_CREDIT_SCORE,
  ENTRY_2008_FINANCIAL_CRISIS,
  ENTRY_STUDENT_DEBT,
];

export const DEBT_GLACIER_ENTRY_IDS =
  DEBT_GLACIER_ENTRIES.map((e) => e.id);
