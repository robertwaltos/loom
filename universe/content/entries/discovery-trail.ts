/**
 * Content Entries — Discovery Trail
 * World: Discovery Trail | Guide: Solana Bright | Subject: Scientific Method
 *
 * Four published entries spanning the scientific method and its practice:
 *   1. The Scientific Method — how we know what we know
 *   2. Citizen Science — everyone can contribute
 *   3. Failure in Science — experiments that taught us more
 *   4. The Replication Crisis — can we repeat the results?
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: The Scientific Method (Tier 1 — ages 5-6) ────────────

export const ENTRY_SCIENTIFIC_METHOD: RealWorldEntry = {
  id: 'entry-scientific-method',
  type: 'scientific_principle',
  title: 'How We Know What We Know',
  year: 1011,
  yearDisplay: '~1011 CE / 1620 CE',
  era: 'medieval',
  descriptionChild:
    "Scientists don't just guess — they follow steps. Watch something. Ask a question. Guess an answer (that's a hypothesis). Test it. Look at what happened. Tell everyone what you found. If it doesn't work, try again. That's the scientific method.",
  descriptionOlder:
    "Ibn al-Haytham's Book of Optics (~1011 CE) is considered the first systematic application of the scientific method: controlled experiments, reproducible results, and willingness to reject authority in favour of evidence. Bacon formalised inductive reasoning in Novum Organum (1620). Galileo demonstrated that observation trumps tradition. Solana treats the Trail itself as a living experiment: every step is a hypothesis about what comes next.",
  descriptionParent:
    "The scientific method is humanity's most reliable tool for understanding reality. Its development spans cultures and centuries — from Ibn al-Haytham's rigorous empiricism to Bacon's inductive framework to Popper's falsifiability criterion. Teaching children the method early builds epistemic humility: the understanding that knowledge must be tested, replicated, and revised. This is the foundation for all critical thinking.",
  realPeople: ['Ibn al-Haytham', 'Francis Bacon', 'Galileo Galilei'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: null,
  continent: null,
  subjectTags: ['scientific method', 'empiricism', 'hypothesis', 'experiments', 'evidence'],
  worldId: 'discovery-trail',
  guideId: 'solana-bright',
  adventureType: 'guided_expedition',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-citizen-science'],
  funFact:
    "Ibn al-Haytham proved that vision works by light entering the eye, not by 'visual rays' emanating from it — overturning Ptolemy and Euclid. He did this by sitting in a dark room (a camera obscura) and watching light behave. Solana says: 'The truth doesn't care what famous people believed.'",
  imagePrompt:
    "A winding trail through varied terrain: observation stations at intervals, a notebook pinned to a tree trunk showing the steps (observe → question → hypothesise → test → conclude), Solana Bright crouching beside a magnifying glass examining something unexpected, crisp morning expedition light, Studio Ghibli scientific adventure aesthetic",
  status: 'published',
};

// ─── Entry 2: Citizen Science (Tier 2 — ages 7-8) ──────────────────

export const ENTRY_CITIZEN_SCIENCE: RealWorldEntry = {
  id: 'entry-citizen-science',
  type: 'cultural_milestone',
  title: 'Everyone Can Contribute',
  year: 1900,
  yearDisplay: '1900–present',
  era: 'contemporary',
  descriptionChild:
    "You don't need a lab coat or a degree to do real science. Regular people count birds, watch stars, track butterflies, measure rainfall, and report earthquakes — and scientists use this data to understand the world.",
  descriptionOlder:
    "Citizen science projects like eBird, Galaxy Zoo, iNaturalist, and Zooniverse have produced peer-reviewed discoveries that professional scientists alone could not have achieved. Christmas Bird Count data (since 1900) has tracked avian population changes for over a century. Galaxy Zoo volunteers discovered a new class of galaxy. The model demonstrates that science is a practice, not a title.",
  descriptionParent:
    "Citizen science democratises the research process while producing data at scales impossible for professional scientists alone. The Christmas Bird Count (1900–present) is the longest-running citizen science project, generating continuous ecological data for over a century. Teaching children that their observations can contribute to real science builds agency and demystifies expertise — you don't need permission to look at the world carefully.",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: null,
  continent: null,
  subjectTags: ['citizen science', 'community', 'data', 'observation', 'participation'],
  worldId: 'discovery-trail',
  guideId: 'solana-bright',
  adventureType: 'natural_exploration',
  difficultyTier: 2,
  prerequisites: ['entry-scientific-method'],
  unlocks: ['entry-failure-in-science'],
  funFact:
    "In 2007, a Dutch schoolteacher named Hanny van Arkel discovered a previously unknown astronomical object through Galaxy Zoo. It was named 'Hanny's Voorwerp' (Hanny's Object). Solana considers this the best argument for citizen science: the universe rewards the attentive amateur.",
  imagePrompt:
    "A Discovery Trail open-air data station: children with binoculars counting birds, a digital board aggregating data from around the world, a Galaxy Zoo star map with Hanny's Voorwerp highlighted, Solana reviewing field notebooks with children, outdoor dawn light with scientific energy, Studio Ghibli community science aesthetic",
  status: 'published',
};

// ─── Entry 3: Failure in Science (Tier 2 — ages 7-8) ───────────────

export const ENTRY_FAILURE_IN_SCIENCE: RealWorldEntry = {
  id: 'entry-failure-in-science',
  type: 'scientific_principle',
  title: 'The Experiments That Went Wrong',
  year: null,
  yearDisplay: 'Historical — ongoing',
  era: 'modern',
  descriptionChild:
    "Some of the greatest discoveries happened by accident. A messy lab gave us penicillin. A melted chocolate bar in a pocket led to the microwave oven. A glowing screen in a dark room revealed X-rays. Mistakes and surprises are part of science — sometimes the most important part.",
  descriptionOlder:
    "Fleming's discovery of penicillin (1928) resulted from a contaminated petri dish he'd left uncovered. Spencer noticed his candy bar melting near a magnetron and invented the microwave (1945). Röntgen discovered X-rays (1895) while investigating cathode rays. None of these were planned discoveries — but all required scientists observant enough to notice the anomaly and curious enough to investigate it. Solana calls this 'prepared serendipity.'",
  descriptionParent:
    "Serendipitous discoveries reveal a critical principle: scientific breakthroughs often come not from following the plan but from noticing when the plan fails. Fleming, Spencer, and Röntgen succeeded because they had the training to recognise significance in anomalies. Teaching children that 'wrong' results can be more valuable than 'right' ones develops intellectual flexibility and resilience — essential traits for any form of inquiry.",
  realPeople: ['Alexander Fleming', 'Percy Spencer', 'Wilhelm Röntgen'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: null,
  continent: null,
  subjectTags: ['serendipity', 'failure', 'discovery', 'penicillin', 'accidents'],
  worldId: 'discovery-trail',
  guideId: 'solana-bright',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-citizen-science'],
  unlocks: ['entry-replication-crisis'],
  funFact:
    "3M's Post-it Note was invented from a 'failed' adhesive that wouldn't stick permanently. Spencer Silver considered it a failure for years until Art Fry realised a not-very-sticky glue was exactly what he needed for bookmarking hymnal pages. Solana keeps a Post-it on the Trail entrance that reads: 'Best failure ever.'",
  imagePrompt:
    "A Discovery Trail 'Serendipity Station': three glass cases showing famous accidents — a contaminated petri dish with mould, a melted chocolate bar beside a magnetron, a glowing cathode ray tube — Solana pointing to a Post-it note on the wall reading 'Best failure ever,' bright laboratory-meets-nature light, Studio Ghibli scientific wonder aesthetic",
  status: 'published',
};

// ─── Entry 4: The Replication Crisis (Tier 3 — ages 9-10) ──────────

export const ENTRY_REPLICATION_CRISIS: RealWorldEntry = {
  id: 'entry-replication-crisis',
  type: 'cultural_milestone',
  title: 'Can We Repeat the Results?',
  year: 2015,
  yearDisplay: '2010s–present',
  era: 'contemporary',
  descriptionChild:
    "Science is supposed to work the same way every time you do it. If a scientist says 'plants grow faster with music,' other scientists should be able to test it and get the same result. But when researchers tried to repeat many studies, they couldn't get the same answers. This is a big problem, and scientists are working to fix it.",
  descriptionOlder:
    "In 2015, the Open Science Collaboration attempted to replicate 100 published psychology studies and succeeded in only 36%. Similar crises appeared in medicine, economics, and other fields. Causes include small sample sizes, publication bias, p-hacking, and perverse incentives (publish or perish). The crisis has led to reforms: pre-registration of studies, open data, and a growing culture of replication. Solana calls it 'science healing itself.'",
  descriptionParent:
    "The replication crisis reveals systemic problems in how research is conducted and published. It's also evidence that science's self-correction mechanisms, though slow, function: the crisis was identified by scientists, investigated using the scientific method, and is being addressed through structural reforms. Teaching children about the crisis develops sophisticated understanding of how knowledge systems work — and how they can fail and recover.",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: null,
  continent: null,
  subjectTags: ['replication', 'reproducibility', 'open science', 'integrity', 'reform'],
  worldId: 'discovery-trail',
  guideId: 'solana-bright',
  adventureType: 'guided_expedition',
  difficultyTier: 3,
  prerequisites: ['entry-failure-in-science'],
  unlocks: [],
  funFact:
    "John Ioannidis's paper 'Why Most Published Research Findings Are False' (2005) is one of the most cited scientific papers in history. Its title sounds alarming, but its conclusion is constructive: we can fix the problem by changing how we do science. Solana has the title pinned to the Trail's signboard.",
  imagePrompt:
    "A Discovery Trail research station: two identical experiment setups producing different results, a large board showing '36 out of 100 replicated' with a progress bar, Solana leading a discussion about why results diverge, children examining sample sizes with magnifying glasses, analytical but hopeful light, Studio Ghibli scientific integrity aesthetic",
  status: 'published',
};

// ─── Export ────────────────────────────────────────────────────────

export const DISCOVERY_TRAIL_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_SCIENTIFIC_METHOD,
  ENTRY_CITIZEN_SCIENCE,
  ENTRY_FAILURE_IN_SCIENCE,
  ENTRY_REPLICATION_CRISIS,
];

export const DISCOVERY_TRAIL_ENTRY_IDS =
  DISCOVERY_TRAIL_ENTRIES.map((e) => e.id);
