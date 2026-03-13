/**
 * Content Entries — Body Atlas
 * World: The Body Atlas | Guide: Dr. Emeka Obi | Subject: Human Body / Health Science
 *
 * Four published entries spanning the history of medicine and the human body:
 *   1. William Harvey and the circulation of blood — proving the heart pumps in a loop
 *   2. Edward Jenner and the first vaccine — milkmaids, cowpox, and eradication
 *   3. Rosalind Franklin and Photo 51 — the secret shape of DNA
 *   4. The Human Microbiome — you are a whole ecosystem
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Harvey and Blood Circulation (Tier 1 — ages 5-6) ─────

export const ENTRY_HARVEY_BLOOD_CIRCULATION: RealWorldEntry = {
  id: 'entry-harvey-blood-circulation',
  type: 'discovery',
  title: "The Heart Pumps in a Loop, Not Tides",
  year: 1628,
  yearDisplay: '1628 CE',
  era: 'renaissance',
  descriptionChild:
    "For 1,400 years, people thought blood moved through the body like tides in an ocean — back and forth, never going in a circle. William Harvey proved that the heart pumps blood in a continuous loop, around and around, endlessly. He proved it with careful timing and measurement.",
  descriptionOlder:
    "Harvey's discovery contradicted Galen — whose authority was so immense that challenging him felt close to heresy. Harvey trusted his experiments over tradition. He proved a thing that should have been obvious, but wasn't observed correctly for 14 centuries.",
  descriptionParent:
    "William Harvey's De Motu Cordis (1628) demonstrated that the heart functions as a pump driving blood in a continuous circuit through the body — overturning Galen's 1,400-year model of tidal blood flow. Harvey proved it mathematically: he measured the volume of blood per heartbeat and showed more blood passes through the heart in an hour than exists in the entire body, meaning it must recirculate. His work established the experimental method in medicine and teaches children that authority is not a substitute for evidence.",
  realPeople: ['William Harvey'],
  quote: "I profess to learn and teach anatomy not from books but from dissections.",
  quoteAttribution: 'William Harvey, De Motu Cordis, 1628',
  geographicLocation: { lat: 51.5074, lng: -0.1278, name: 'London, England' },
  continent: 'Europe',
  subjectTags: ['circulatory system', 'heart', 'blood flow', 'anatomy', 'scientific method'],
  worldId: 'body-atlas',
  guideId: 'dr-emeka-obi',
  adventureType: 'guided_expedition',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-jenner-first-vaccine'],
  funFact:
    'The heart beats about 100,000 times per day. Over a lifetime, that is approximately 2.5 billion beats, without pause, without maintenance, from before birth to the last moment.',
  imagePrompt:
    'Holographic cross-section of human circulatory system glowing in a museum space, blood cells flowing through luminous vessels in a continuous loop',
  status: 'published',
};

// ─── Entry 2: Jenner and the First Vaccine (Tier 2 — ages 7-8) ─────

export const ENTRY_JENNER_FIRST_VACCINE: RealWorldEntry = {
  id: 'entry-jenner-first-vaccine',
  type: 'discovery',
  title: "The Milkmaid Observation That Saved Millions",
  year: 1796,
  yearDisplay: '1796 CE',
  era: 'enlightenment',
  descriptionChild:
    "Edward Jenner noticed that milkmaids who caught a mild disease called cowpox never got the deadly smallpox. He deliberately gave a boy cowpox, then exposed him to smallpox. The boy was protected. Jenner had invented the vaccine — and within two centuries, smallpox was gone from the Earth forever.",
  descriptionOlder:
    "Smallpox killed 300–500 million people in the 20th century alone. It was declared eradicated in 1980 — the only human disease in history to be fully eliminated. Every vaccination programme traces back to one country doctor and one milkmaid's observation.",
  descriptionParent:
    "Edward Jenner's 1796 experiment — inoculating eight-year-old James Phipps with cowpox material, then demonstrating immunity to smallpox — launched the era of vaccination. Smallpox, which killed approximately 300–500 million people in the 20th century alone, was declared eradicated by the WHO in 1980 through global vaccination campaigns. It remains the only human infectious disease to be completely eliminated. The story teaches pattern recognition (observing milkmaids' immunity), hypothesis testing, and the power of preventive medicine.",
  realPeople: ['Edward Jenner'],
  quote: "The deviation of man from the state in which he was originally placed by nature seems to have proved to him a prolific source of diseases.",
  quoteAttribution: 'Edward Jenner, 1798',
  geographicLocation: { lat: 51.7, lng: -2.2, name: 'Gloucestershire, England' },
  continent: 'Europe',
  subjectTags: ['vaccination', 'smallpox', 'immune system', 'disease eradication', 'public health'],
  worldId: 'body-atlas',
  guideId: 'dr-emeka-obi',
  adventureType: 'natural_exploration',
  difficultyTier: 2,
  prerequisites: ['entry-harvey-blood-circulation'],
  unlocks: ['entry-franklin-photo51-dna'],
  funFact:
    "The word 'vaccine' comes from the Latin 'vacca' — cow. Every injection in every clinic in the world is etymologically thanking a cow.",
  imagePrompt:
    'Holographic immune system forest inside the Body Atlas, antibody trees defending against invader cells, warm medical white lighting',
  status: 'published',
};

// ─── Entry 3: Rosalind Franklin and Photo 51 (Tier 2 — ages 7-8) ───

export const ENTRY_FRANKLIN_PHOTO51_DNA: RealWorldEntry = {
  id: 'entry-franklin-photo51-dna',
  type: 'discovery',
  title: "The Photograph That Revealed Life's Secret Shape",
  year: 1952,
  yearDisplay: '1952 CE',
  era: 'modern',
  descriptionChild:
    "Rosalind Franklin took a photograph of DNA that showed its shape for the very first time. Two other scientists saw her photograph without asking her, used her discovery to build their famous model, and won the Nobel Prize. Her name wasn't mentioned in their announcement. Now it is said first.",
  descriptionOlder:
    "Photo 51, taken by Franklin using X-ray crystallography, definitively revealed the double-helix structure. Watson and Crick used it — without her knowledge — as the key evidence for their model. Franklin died at 37 in 1958, four years before the Nobel was awarded. The prize is not given posthumously.",
  descriptionParent:
    "Rosalind Franklin's Photo 51 (1952) — an X-ray diffraction image of DNA — was the critical evidence establishing the double-helix structure. James Watson and Francis Crick accessed the image without Franklin's knowledge via Maurice Wilkins and used it as the basis for their famous model. Franklin died of ovarian cancer at 37 in 1958, four years before the Nobel Prize was awarded to Watson, Crick, and Wilkins. The prize cannot be awarded posthumously. Her story teaches children about scientific credit, ethics in research, and the importance of acknowledging all contributors.",
  realPeople: ['Rosalind Franklin', 'James Watson', 'Francis Crick', 'Maurice Wilkins'],
  quote: "Science and everyday life cannot and should not be separated.",
  quoteAttribution: 'Rosalind Franklin',
  geographicLocation: { lat: 51.5115, lng: -0.1160, name: "King's College London, England" },
  continent: 'Europe',
  subjectTags: ['DNA', 'double helix', 'X-ray crystallography', 'genetics', 'women in science'],
  worldId: 'body-atlas',
  guideId: 'dr-emeka-obi',
  adventureType: 'guided_expedition',
  difficultyTier: 2,
  prerequisites: ['entry-harvey-blood-circulation'],
  unlocks: ['entry-human-microbiome'],
  funFact:
    "When asked about Photo 51 years later, Watson acknowledged it was 'the key event' in discovering DNA's structure. Franklin was never told her data had been used until much later — and never received formal credit in her lifetime.",
  imagePrompt:
    'Giant glowing DNA double helix spiral rising through a holographic anatomy display, X-ray photograph projected on the wall',
  status: 'published',
};

// ─── Entry 4: The Human Microbiome (Tier 3 — ages 9-10) ────────────

export const ENTRY_HUMAN_MICROBIOME: RealWorldEntry = {
  id: 'entry-human-microbiome',
  type: 'discovery',
  title: "You Are a Whole Ecosystem",
  year: 2007,
  yearDisplay: '2007 CE',
  era: 'modern',
  descriptionChild:
    "Your body contains more bacteria than human cells — and most of them help you. They digest food, protect against disease, and may even affect your mood. You are never alone inside your own skin. You are a whole ecosystem carrying yourself around.",
  descriptionOlder:
    "The Human Microbiome Project mapped trillions of microorganisms living in and on the human body. The gut microbiome influences immune function, mental health via the gut-brain axis, and metabolic processes in ways science is still mapping. The microbiome is as individual as a fingerprint.",
  descriptionParent:
    "The Human Microbiome Project (2007–2016) catalogued the trillions of microorganisms inhabiting the human body. Findings revealed that gut bacteria influence immune function, mental health (via the vagus nerve and gut-brain axis), metabolic processes, and even drug efficacy. Each person's microbiome is unique — shaped by diet, environment, birth method, and genetics. The microbiome changes measurably within 24 hours of dietary changes. The story fundamentally reframes the human body as an ecosystem rather than a single organism.",
  realPeople: [],
  quote: "You are never alone inside your own skin.",
  quoteAttribution: 'Dr. Emeka Obi, Guide of the Body Atlas',
  geographicLocation: null,
  continent: 'Global',
  subjectTags: ['microbiome', 'bacteria', 'gut health', 'ecosystem', 'symbiosis'],
  worldId: 'body-atlas',
  guideId: 'dr-emeka-obi',
  adventureType: 'natural_exploration',
  difficultyTier: 3,
  prerequisites: ['entry-jenner-first-vaccine', 'entry-franklin-photo51-dna'],
  unlocks: [],
  funFact:
    "Your gut microbiome weighs about 1.5 kilograms. It changes based on what you eat within 24 hours.",
  imagePrompt:
    'Microscopic view inside the Body Atlas, colorful symbiotic bacteria communities glowing in a cross-section of the human gut, child-sized explorer walking among them',
  status: 'published',
};

// ─── Collected Exports ──────────────────────────────────────────────

export const BODY_ATLAS_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_HARVEY_BLOOD_CIRCULATION,
  ENTRY_JENNER_FIRST_VACCINE,
  ENTRY_FRANKLIN_PHOTO51_DNA,
  ENTRY_HUMAN_MICROBIOME,
] as const;

export const BODY_ATLAS_ENTRY_IDS: readonly string[] =
  BODY_ATLAS_ENTRIES.map((e) => e.id);
