/**
 * Content Entries — Greenhouse Spiral
 * World: The Greenhouse Spiral | Guide: Hugo Fontaine | Subject: Chemistry / Mixtures & Materials
 *
 * Four published entries spanning the history of chemistry:
 *   1. Mendeleev and the Periodic Table — predicting elements before they were found
 *   2. Marie-Anne Paulze Lavoisier — the drawings that taught chemistry to the world
 *   3. The discovery of oxygen — observing and interpreting are different skills
 *   4. Photosynthesis — how plants eat light
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Mendeleev's Periodic Table (Tier 1 — ages 5-6) ───────

export const ENTRY_MENDELEEV_PERIODIC_TABLE: RealWorldEntry = {
  id: 'entry-mendeleev-periodic-table',
  type: 'discovery',
  title: "The Table That Predicted the Future",
  year: 1869,
  yearDisplay: '1869 CE',
  era: 'industrial',
  descriptionChild:
    "A chemistry professor needed to write a textbook and didn't like how elements were organised. He arranged them by weight and found a beautiful hidden pattern — elements in the same column behaved the same way. He even predicted elements that hadn't been discovered yet and left gaps for them. Every single gap was eventually filled.",
  descriptionOlder:
    "Mendeleev's table was accepted not because it was tidy, but because it predicted missing elements — gallium, scandium, germanium — discovered decades after his table was published. Prediction is the highest test of a scientific theory.",
  descriptionParent:
    "Dmitri Mendeleev's periodic table (1869) arranged elements by atomic weight and chemical properties, revealing a repeating pattern that predicted the existence of undiscovered elements. His predictions of gallium (1875), scandium (1879), and germanium (1886) — including their approximate atomic weights and chemical behaviours — provided powerful validation. At least six other scientists independently created similar arrangements, but Mendeleev's table became canonical because it made successful predictions. The story teaches children that a theory's value lies not in describing the past but in predicting the future.",
  realPeople: ['Dmitri Mendeleev'],
  quote: "I saw in a dream a table where all elements fell into place as required.",
  quoteAttribution: 'Dmitri Mendeleev (attributed)',
  geographicLocation: { lat: 59.9343, lng: 30.3351, name: 'St. Petersburg, Russia' },
  continent: 'Europe',
  subjectTags: ['periodic table', 'elements', 'chemistry', 'prediction', 'scientific theory'],
  worldId: 'greenhouse-spiral',
  guideId: 'hugo-fontaine',
  adventureType: 'guided_expedition',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-lavoisier-chemistry-revolution'],
  funFact:
    'At least six other scientists independently created similar element arrangements around the same time as Mendeleev. His table became famous because it made predictions. Others described the past. His described the future.',
  imagePrompt:
    'Spiral greenhouse with element tiles as stepping stones through growing plants, gaps glowing where undiscovered elements will be, warm afternoon light',
  status: 'published',
};

// ─── Entry 2: Marie-Anne Paulze Lavoisier (Tier 2 — ages 7-8) ──────

export const ENTRY_LAVOISIER_CHEMISTRY_REVOLUTION: RealWorldEntry = {
  id: 'entry-lavoisier-chemistry-revolution',
  type: 'person',
  title: "The Drawings That Taught Chemistry to the World",
  year: 1789,
  yearDisplay: '1780s CE',
  era: 'enlightenment',
  descriptionChild:
    "Marie-Anne Paulze taught herself Latin and English to translate important science papers that her chemist husband couldn't read himself. She also drew every experiment in their laboratory. Her drawings were how the whole world learned what modern chemistry looked like.",
  descriptionOlder:
    "Marie-Anne is recognised as an equal partner in the Lavoisier laboratory — conducting experiments, translating Priestley and Cavendish, and creating the illustrations in 'Traité élémentaire de chimie,' the textbook that launched modern chemistry. Antoine was guillotined in the Revolution. She preserved and published his work.",
  descriptionParent:
    "Marie-Anne Paulze Lavoisier (1758–1836) was an equal partner in the laboratory that founded modern chemistry. She translated the works of Priestley and Cavendish from English, conducted experiments, and created the detailed illustrations for 'Traité élémentaire de chimie' (1789) — the textbook that established the chemical nomenclature still used today. When Antoine Lavoisier was guillotined during the Terror, Marie-Anne preserved and ultimately published his unpublished works. A judge reportedly said 'The Republic has no need of scientists.' The story teaches collaboration, preservation of knowledge, and the cost of anti-intellectualism.",
  realPeople: ['Marie-Anne Paulze Lavoisier', 'Antoine Lavoisier'],
  quote: "The Republic has no need of scientists.",
  quoteAttribution: 'Judge at Antoine Lavoisier\'s tribunal (attributed)',
  geographicLocation: { lat: 48.8566, lng: 2.3522, name: 'Paris, France' },
  continent: 'Europe',
  subjectTags: ['chemistry revolution', 'scientific illustration', 'women in science', 'French Revolution', 'nomenclature'],
  worldId: 'greenhouse-spiral',
  guideId: 'hugo-fontaine',
  adventureType: 'guided_expedition',
  difficultyTier: 2,
  prerequisites: ['entry-mendeleev-periodic-table'],
  unlocks: ['entry-discovery-of-oxygen'],
  funFact:
    "When Antoine was condemned, a judge reportedly said 'The Republic has no need of scientists.' Within 18 months, the Tribunal that killed him had itself been abolished.",
  imagePrompt:
    'Lavoisier Wing of the greenhouse with detailed illustrated manuscripts displayed on glass panels, chemical apparatus among growing plants',
  status: 'published',
};

// ─── Entry 3: The Discovery of Oxygen (Tier 2 — ages 7-8) ──────────

export const ENTRY_DISCOVERY_OF_OXYGEN: RealWorldEntry = {
  id: 'entry-discovery-of-oxygen',
  type: 'discovery',
  title: "Observing and Interpreting Are Different Skills",
  year: 1774,
  yearDisplay: '1774 CE',
  era: 'enlightenment',
  descriptionChild:
    "Before 1774, nobody truly understood what fire needed to burn or what kept animals alive in sealed containers. Joseph Priestley discovered a part of air that made candles burn brighter and mice live longer. Lavoisier named it oxygen and understood what it did.",
  descriptionOlder:
    "Priestley discovered oxygen but called it 'dephlogisticated air' — he couldn't explain it, because he still believed in phlogiston (the wrong theory of combustion). Lavoisier recognised its significance and overturned the phlogiston theory entirely. The discovery shows that observing and interpreting are different skills and can belong to different people.",
  descriptionParent:
    "The discovery of oxygen (1774) demonstrates a critical lesson in scientific methodology: observation and interpretation are distinct skills. Joseph Priestley isolated the gas and observed its properties (brighter flame, sustained life) but interpreted it through phlogiston theory. Antoine Lavoisier recognised its true significance, named it 'oxygen,' and used it to overthrow the phlogiston paradigm entirely. Carl Wilhelm Scheele had independently isolated it even earlier but published later. The story teaches that being first to observe is not the same as being first to understand.",
  realPeople: ['Joseph Priestley', 'Carl Wilhelm Scheele', 'Antoine Lavoisier', 'Marie-Anne Paulze Lavoisier'],
  quote: "I have discovered an air five or six times as good as common air.",
  quoteAttribution: 'Joseph Priestley, 1774',
  geographicLocation: { lat: 51.5074, lng: -0.1278, name: 'England / France' },
  continent: 'Europe',
  subjectTags: ['oxygen', 'combustion', 'phlogiston', 'gas chemistry', 'scientific paradigm shifts'],
  worldId: 'greenhouse-spiral',
  guideId: 'hugo-fontaine',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-mendeleev-periodic-table'],
  unlocks: ['entry-photosynthesis'],
  funFact:
    'Priestley also invented carbonated water. He lived next to a brewery, noticed the gas hovering over fermenting vats, dissolved it in water, and found it pleasant to drink. He gave the method away for free.',
  imagePrompt:
    'Sealed glass chambers in the greenhouse with candles burning at different brightnesses, mice visible in one chamber breathing the new air',
  status: 'published',
};

// ─── Entry 4: Photosynthesis (Tier 3 — ages 9-10) ──────────────────

export const ENTRY_PHOTOSYNTHESIS: RealWorldEntry = {
  id: 'entry-photosynthesis',
  type: 'scientific_principle',
  title: "How Plants Eat Light",
  year: 1779,
  yearDisplay: '1779 CE',
  era: 'enlightenment',
  descriptionChild:
    "Plants make their own food from sunlight, water, and air. Light hits the green parts and turns invisible air (carbon dioxide) into sugar. The leftover part — oxygen — is breathed out as waste. Our oxygen is a plant's garbage, and we are entirely dependent on it.",
  descriptionOlder:
    "Dutch physician Jan Ingenhousz demonstrated in 1779 that plants produce oxygen in sunlight and consume it in darkness. The full biochemistry of the Calvin cycle wasn't understood until the 1950s. Hugo's Three Seeds grow because of a single six-step chemical reaction — and so does everything else that eats.",
  descriptionParent:
    "Photosynthesis — the conversion of light energy, water, and CO₂ into glucose and oxygen — is the foundational biochemical reaction sustaining nearly all life on Earth. Jan Ingenhousz demonstrated in 1779 that plants produce oxygen only in sunlight, establishing the light-dependent nature of the process. The full Calvin cycle was not elucidated until the 1950s. Photosynthesis produces approximately 300 billion tonnes of organic carbon annually. Every food chain on Earth — every animal, fungus, and heterotrophic bacterium — depends on this reaction occurring in chloroplasts.",
  realPeople: ['Jan Ingenhousz'],
  quote: "Our oxygen is a plant's garbage.",
  quoteAttribution: 'Hugo Fontaine, Guide of the Greenhouse Spiral',
  geographicLocation: null,
  continent: 'Global',
  subjectTags: ['photosynthesis', 'plants', 'oxygen production', 'Calvin cycle', 'carbon cycle'],
  worldId: 'greenhouse-spiral',
  guideId: 'hugo-fontaine',
  adventureType: 'guided_expedition',
  difficultyTier: 3,
  prerequisites: ['entry-lavoisier-chemistry-revolution', 'entry-discovery-of-oxygen'],
  unlocks: [],
  funFact:
    'Photosynthesis produces roughly 300 billion tonnes of organic carbon per year globally. Every food chain on Earth depends on this one reaction happening in chloroplasts.',
  imagePrompt:
    'Cross-section view of a giant leaf in the greenhouse spiral, CO2 molecules entering and glucose forming, oxygen bubbles floating upward through golden light',
  status: 'published',
};

// ─── Collected Exports ──────────────────────────────────────────────

export const GREENHOUSE_SPIRAL_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_MENDELEEV_PERIODIC_TABLE,
  ENTRY_LAVOISIER_CHEMISTRY_REVOLUTION,
  ENTRY_DISCOVERY_OF_OXYGEN,
  ENTRY_PHOTOSYNTHESIS,
] as const;

export const GREENHOUSE_SPIRAL_ENTRY_IDS: readonly string[] =
  GREENHOUSE_SPIRAL_ENTRIES.map((e) => e.id);
