/**
 * Content Entries — Frost Peaks
 * World: The Frost Peaks | Guide: Mira Petrov | Subject: Geology / Rocks & Minerals
 *
 * Four published entries spanning the history of geology:
 *   1. Mary Anning and the Age of Reptiles — the fossil hunter denied credit
 *   2. Alfred Wegener and continental drift — laughed at for 50 years
 *   3. Ice cores — 800,000 years of climate in a cylinder
 *   4. The Ring of Fire — where tectonic plates collide
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Mary Anning (Tier 1 — ages 5-6) ──────────────────────

export const ENTRY_MARY_ANNING: RealWorldEntry = {
  id: 'entry-mary-anning',
  type: 'person',
  title: "The Fossil Hunter Who Changed What We Know",
  year: 1811,
  yearDisplay: '1811 CE',
  era: 'industrial',
  descriptionChild:
    "Mary Anning grew up poor and spent her days searching the sea cliffs of southern England for fossils to sell. Before she was 13 she had found a complete skeleton of an ichthyosaur — a giant sea reptile no one knew had ever existed. She kept finding things.",
  descriptionOlder:
    "Anning discovered the first complete Ichthyosaurus, the first Plesiosaur, and the first British Pterodactyl. She was denied publication rights because she was a woman and working class. The men who presented her discoveries to learned societies received the credit. 'She sells seashells by the seashore' is almost certainly about her.",
  descriptionParent:
    "Mary Anning (1799–1847) was one of the most important fossil hunters in history. Working the Jurassic Coast near Lyme Regis, she discovered the first complete Ichthyosaurus, the first Plesiosaur, and the first British Pterodactyl — each reshaping paleontological understanding. As a working-class woman, she was systematically excluded from the scientific establishment. Men who purchased and presented her discoveries received credit. The Geological Society of London, which relied on her expertise, did not admit women until 1904. Her story teaches children about scientific contribution, credit, and structural exclusion.",
  realPeople: ['Mary Anning'],
  quote: "She has contributed more to geology than any other person in England.",
  quoteAttribution: 'Fellow of the Geological Society, at a meeting Anning was not allowed to attend',
  geographicLocation: { lat: 50.7256, lng: -2.9366, name: 'Lyme Regis, England' },
  continent: 'Europe',
  subjectTags: ['fossils', 'paleontology', 'Jurassic Coast', 'women in science', 'ichthyosaur'],
  worldId: 'frost-peaks',
  guideId: 'mira-petrov',
  adventureType: 'guided_expedition',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-wegener-continental-drift'],
  funFact:
    "In a speech to the Geological Society, a fellow remarked that Anning had 'contributed more to geology than any other person in England.' He said this at a meeting she was not allowed to attend.",
  imagePrompt:
    'Young woman carefully excavating a giant marine reptile skeleton from alpine cliff face, thin light illuminating ancient bone in rock layers',
  status: 'published',
};

// ─── Entry 2: Wegener and Continental Drift (Tier 2 — ages 7-8) ────

export const ENTRY_WEGENER_CONTINENTAL_DRIFT: RealWorldEntry = {
  id: 'entry-wegener-continental-drift',
  type: 'discovery',
  title: "The Puzzle Pieces That Took 50 Years to Believe",
  year: 1912,
  yearDisplay: '1912 CE',
  era: 'modern',
  descriptionChild:
    "Alfred Wegener noticed that South America and Africa look like puzzle pieces that fit together. He said all the continents were once one supercontinent that broke apart and slowly drifted. Scientists mocked him for decades. Then they found the proof. Then they stopped laughing.",
  descriptionOlder:
    "Wegener had compelling evidence but no mechanism to explain how continents could move — that came 50 years later with plate tectonics and seafloor spreading. The hostility he faced shows how science sometimes rejects correct ideas when a mechanism is missing.",
  descriptionParent:
    "Alfred Wegener's 1912 hypothesis of continental drift — that all continents were once joined as a supercontinent (Pangaea) and have since moved apart — was rejected for decades because he could not explain the mechanism. The discovery of seafloor spreading and plate tectonics in the 1960s vindicated him entirely. Wegener's story demonstrates that evidence without mechanism is often dismissed, and that being correct is not the same as being believed. Pangaea existed approximately 335 million years ago — Wegener's estimate was accurate to within 20%.",
  realPeople: ['Alfred Wegener'],
  quote: "Scientists still do not appear to understand sufficiently that all earth sciences must contribute evidence toward unveiling the state of our planet.",
  quoteAttribution: 'Alfred Wegener, The Origin of Continents and Oceans, 1915',
  geographicLocation: { lat: 51.0504, lng: 13.7373, name: 'Germany' },
  continent: 'Europe',
  subjectTags: ['continental drift', 'plate tectonics', 'Pangaea', 'geology history', 'scientific rejection'],
  worldId: 'frost-peaks',
  guideId: 'mira-petrov',
  adventureType: 'natural_exploration',
  difficultyTier: 2,
  prerequisites: ['entry-mary-anning'],
  unlocks: ['entry-ice-cores-climate'],
  funFact:
    "Pangaea, the supercontinent Wegener proposed, means 'all Earth' in Greek. It is now known to have existed about 335 million years ago — one of Wegener's estimates was accurate to within 20%.",
  imagePrompt:
    'Mountain peak with continental shapes visible in the rock strata, puzzle-piece coastlines glowing where they once fit together',
  status: 'published',
};

// ─── Entry 3: Ice Cores (Tier 2 — ages 7-8) ────────────────────────

export const ENTRY_ICE_CORES_CLIMATE: RealWorldEntry = {
  id: 'entry-ice-cores-climate',
  type: 'discovery',
  title: "800,000 Years of Climate in a Cylinder",
  year: 1960,
  yearDisplay: '1960s CE',
  era: 'modern',
  descriptionChild:
    "Scientists drill into ancient Antarctic ice, pulling out cylinders hundreds of thousands of years old. Trapped inside are tiny bubbles of ancient air. By analysing them, scientists can tell what Earth's climate was like long before any person was alive.",
  descriptionOlder:
    "The longest ice core extracted to date goes back 800,000 years, spanning eight ice ages. It contains a record of atmospheric CO₂ that shows present levels are higher than at any point in the entire record. The Ice Core Library holds the longest climate story human beings have ever read.",
  descriptionParent:
    "Ice core research, pioneered in the 1960s in Antarctica and Greenland, extracts cylinders of compacted snow containing trapped atmospheric gases spanning hundreds of millennia. The longest continuous record covers 800,000 years and eight glacial cycles. Analysis reveals that current atmospheric CO₂ concentrations (~420 ppm) exceed anything in the 800,000-year record — providing one of the most compelling datasets for understanding anthropogenic climate change. Teaching children to read 'the longest story ever preserved' builds both scientific literacy and environmental awareness.",
  realPeople: [],
  quote: "The ice remembers what we forgot.",
  quoteAttribution: 'Mira Petrov, Guide of the Frost Peaks',
  geographicLocation: { lat: -75.1, lng: 123.35, name: 'Antarctica' },
  continent: 'Antarctica',
  subjectTags: ['ice cores', 'climate science', 'atmosphere', 'CO2', 'paleoclimatology'],
  worldId: 'frost-peaks',
  guideId: 'mira-petrov',
  adventureType: 'guided_expedition',
  difficultyTier: 2,
  prerequisites: ['entry-mary-anning'],
  unlocks: ['entry-ring-of-fire'],
  funFact:
    "Ice cores from before 1750 contain air from before the Industrial Revolution. Comparing those pre-industrial bubbles to today's air is one of the clearest proofs of human-caused climate change available.",
  imagePrompt:
    'Translucent ice cylinder held up to alpine light, tiny bubbles of ancient air visible inside, surrounded by deep ice layers in various shades of blue',
  status: 'published',
};

// ─── Entry 4: The Ring of Fire (Tier 3 — ages 9-10) ────────────────

export const ENTRY_RING_OF_FIRE: RealWorldEntry = {
  id: 'entry-ring-of-fire',
  type: 'natural_wonder',
  title: "Where the Earth Tears Itself Apart",
  year: 0,
  yearDisplay: 'Ongoing',
  era: 'modern',
  descriptionChild:
    "Seventy-five percent of the world's volcanoes and ninety percent of its earthquakes happen in a ring around the edges of the Pacific Ocean. Where tectonic plates push into one another, they release enormous stored energy — as fire from below or shaking from the sides.",
  descriptionOlder:
    "The Ring of Fire is where the Pacific Plate subducts beneath surrounding plates. Subduction generates magma, which produces volcanoes. The friction generates earthquakes. Several hundred million people live within its active zones.",
  descriptionParent:
    "The Ring of Fire is a 40,000 km horseshoe-shaped zone of intense seismic and volcanic activity encircling the Pacific Basin. It marks the boundaries where the Pacific Plate subducts beneath continental and oceanic plates. This zone contains 75% of the world's active volcanoes and generates 90% of earthquakes. The 1991 eruption of Mount Pinatubo ejected enough sulfur dioxide into the stratosphere to cool global temperatures by 0.5°C for two years. Hundreds of millions of people live within the Ring of Fire's active zones, making geological literacy a survival skill.",
  realPeople: [],
  quote: "The Earth is not finished building itself.",
  quoteAttribution: 'Mira Petrov, Guide of the Frost Peaks',
  geographicLocation: null,
  continent: 'Global',
  subjectTags: ['Ring of Fire', 'volcanoes', 'earthquakes', 'plate tectonics', 'subduction'],
  worldId: 'frost-peaks',
  guideId: 'mira-petrov',
  adventureType: 'field_trip',
  difficultyTier: 3,
  prerequisites: ['entry-wegener-continental-drift', 'entry-ice-cores-climate'],
  unlocks: [],
  funFact:
    "Mount Pinatubo (Philippines) erupted in 1991 with enough force to cool the entire Earth by 0.5°C for two years by injecting sulfur dioxide into the stratosphere.",
  imagePrompt:
    'Volcanic caldera at the peak of a frozen mountain, lava meeting ice, glowing Ring of Fire circuit visible in the distance around a vast ocean',
  status: 'published',
};

// ─── Collected Exports ──────────────────────────────────────────────

export const FROST_PEAKS_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_MARY_ANNING,
  ENTRY_WEGENER_CONTINENTAL_DRIFT,
  ENTRY_ICE_CORES_CLIMATE,
  ENTRY_RING_OF_FIRE,
] as const;

export const FROST_PEAKS_ENTRY_IDS: readonly string[] =
  FROST_PEAKS_ENTRIES.map((e) => e.id);
