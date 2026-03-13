/**
 * Content Entries — Nonfiction Fleet
 * World: The Nonfiction Fleet | Guide: Captain Birch | Subject: Research Skills / Nonfiction Reading
 *
 * Four published entries spanning the history of nonfiction writing and inquiry:
 *   1. Pliny the Elder — the first encyclopaedist
 *   2. Mary Wollstonecraft — nonfiction as revolution
 *   3. The Encyclopédie — when knowledge became dangerous
 *   4. Rachel Carson — the book that started a movement
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Pliny the Elder (Tier 1) ──────────────────────────────

export const ENTRY_PLINY_NATURAL_HISTORY: RealWorldEntry = {
  id: 'entry-pliny-natural-history',
  type: 'person',
  title: "The Man Who Tried to Write Down Everything",
  year: 77,
  yearDisplay: '77 CE',
  era: 'classical',
  descriptionChild:
    "Pliny the Elder tried to write down everything anyone knew about the natural world — animals, plants, minerals, stars, medicine, art. His Naturalis Historia had 37 books and covered everything from elephants to gold mines. He died investigating the eruption of Mount Vesuvius because he just had to see it up close.",
  descriptionOlder:
    "Pliny's Naturalis Historia (77 CE) is the first systematic encyclopedia — 37 volumes covering cosmology, geography, zoology, botany, pharmacology, mining, and art. He consulted over 2,000 books by 100+ authors, creating a monument to the Roman belief that knowledge should be comprehensive and catalogued. His death in the eruption of Vesuvius (79 CE), while investigating the phenomenon as a naval commander, embodies the researcher's ultimate commitment: he sailed toward the eruption while everyone else fled.",
  descriptionParent:
    "Pliny the Elder's Naturalis Historia (77 CE) is the earliest surviving encyclopedic work in European literature. Spanning 37 books and citing over 2,000 works by more than 100 authors, it established the template for comprehensive knowledge organisation that persisted through the medieval Speculum tradition to Diderot's Encyclopédie. Pliny's approach — citing sources, cross-referencing, and acknowledging uncertainty — prefigures modern research methodology. His death during the Vesuvius eruption (79 CE), recorded by Pliny the Younger in letters to Tacitus, made him Western civilisation's patron saint of curiosity-driven inquiry. The story teaches children that nonfiction begins with asking questions and having the courage to find answers.",
  realPeople: ['Pliny the Elder', 'Pliny the Younger'],
  quote: "He sailed toward the eruption while everyone else fled.",
  quoteAttribution: 'Captain Birch, Guide of the Nonfiction Fleet',
  geographicLocation: { lat: 40.7505, lng: 14.4866, name: 'Bay of Naples, Italy' },
  continent: 'Europe',
  subjectTags: ['Pliny', 'encyclopedia', 'Naturalis Historia', 'Roman', 'nonfiction'],
  worldId: 'nonfiction-fleet',
  guideId: 'captain-birch',
  adventureType: 'guided_expedition',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-wollstonecraft-vindication'],
  funFact:
    "Pliny the Younger wrote letters to the historian Tacitus describing his uncle's death during Vesuvius. Those letters are the only surviving eyewitness account of the eruption — making the nephew a nonfiction writer too.",
  imagePrompt:
    'Flagship of the Nonfiction Fleet with 37 scrolls in the rigging, volcanic eruption on the horizon, Pliny at the prow with notebook, ancient Roman harbour, dramatic warm light',
  status: 'published',
};

// ─── Entry 2: Mary Wollstonecraft (Tier 2) ──────────────────────────

export const ENTRY_WOLLSTONECRAFT_VINDICATION: RealWorldEntry = {
  id: 'entry-wollstonecraft-vindication',
  type: 'person',
  title: "The First Argument for Equal Education",
  year: 1792,
  yearDisplay: '1792 CE',
  era: 'enlightenment',
  descriptionChild:
    "In 1792, Mary Wollstonecraft wrote a book arguing that girls deserved the same education as boys. Many people were furious. But she used facts and logic to make her case, and her ideas changed the world.",
  descriptionOlder:
    "A Vindication of the Rights of Woman (1792) is one of the most important nonfiction works ever written. Wollstonecraft didn't just argue for women's rights — she argued for equal education, using Enlightenment reasoning to dismantle claims that women were naturally inferior. She wrote it in six weeks, fuelled by outrage at Talleyrand's proposal to limit girls' education to domestic skills. The book's power comes from its method: logical argument built on evidence, not emotion.",
  descriptionParent:
    "Mary Wollstonecraft's A Vindication of the Rights of Woman (1792) represents nonfiction writing as revolutionary act. Written in six weeks in response to Talleyrand's report to the French National Assembly recommending domestic-only education for girls, it applies Enlightenment rational argumentation to gender inequality. Wollstonecraft's method — building systematic arguments from evidence, anticipating counterarguments, and demanding consistency in the application of Enlightenment ideals — makes it a masterclass in persuasive nonfiction. The work teaches children that nonfiction writing can be an act of courage with real-world consequences.",
  realPeople: ['Mary Wollstonecraft'],
  quote: "Nonfiction writing can be an act of courage with real-world consequences.",
  quoteAttribution: 'Captain Birch, Guide of the Nonfiction Fleet',
  geographicLocation: { lat: 51.5074, lng: -0.1278, name: 'London, England' },
  continent: 'Europe',
  subjectTags: ['Wollstonecraft', 'feminism', 'nonfiction', 'equal education', 'Enlightenment'],
  worldId: 'nonfiction-fleet',
  guideId: 'captain-birch',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-pliny-natural-history'],
  unlocks: ['entry-rachel-carson-silent-spring'],
  funFact:
    "Wollstonecraft wrote the entire book in about six weeks, fuelled by outrage at a French proposal to limit girls' education to homemaking. Her daughter, Mary Shelley, went on to write Frankenstein — one of the most important novels in literary history.",
  imagePrompt:
    'Ship cabin study in the Fleet with quill and manuscript pages, 18th-century London visible through the porthole, stacks of Enlightenment texts, determined candlelight',
  status: 'published',
};

// ─── Entry 3: The Encyclopédie (Tier 2) ──────────────────────────────

export const ENTRY_ENCYCLOPEDIE: RealWorldEntry = {
  id: 'entry-encyclopedie',
  type: 'invention',
  title: "The Book That Was Too Dangerous to Print",
  year: 1751,
  yearDisplay: '1751–1772 CE',
  era: 'enlightenment',
  descriptionChild:
    "In France, Denis Diderot and Jean d'Alembert created the Encyclopédie — a book that tried to include all human knowledge. The King and the Church tried to ban it because it encouraged people to think for themselves. But the authors kept publishing it in secret.",
  descriptionOlder:
    "The Encyclopédie, ou Dictionnaire raisonné des sciences, des arts et des métiers (1751–1772) was the Enlightenment's greatest nonfiction project. Its 28 volumes and 71,818 articles, written by 150+ contributors including Voltaire, Rousseau, and Montesquieu, systematised human knowledge while subtly challenging royal and religious authority. Twice suppressed by the French crown, its publication required smuggling, coded language, and private financing. The Encyclopédie didn't just organise knowledge — it democratised it.",
  descriptionParent:
    "Diderot and d'Alembert's Encyclopédie (1751–1772) stands as the Enlightenment's most ambitious nonfiction undertaking. Its 28 volumes of text and 3,129 plates, contributed by over 150 authors, represented a systematic attempt to organise all human knowledge along rational principles. Twice suppressed by royal decree (1752 and 1759), its continued publication required clandestine printing, coded cross-references to evade censors, and private financial backing. The project pioneered the idea that knowledge should be publicly accessible and organised by rational taxonomy rather than religious hierarchy. The story teaches children that compiling knowledge can itself be an act of defiance.",
  realPeople: ['Denis Diderot', "Jean le Rond d'Alembert", 'Voltaire'],
  quote: "Compiling knowledge can itself be an act of defiance.",
  quoteAttribution: 'Captain Birch, Guide of the Nonfiction Fleet',
  geographicLocation: { lat: 48.8566, lng: 2.3522, name: 'Paris, France' },
  continent: 'Europe',
  subjectTags: ['Encyclopédie', 'Diderot', 'Enlightenment', 'censorship', 'knowledge democratisation'],
  worldId: 'nonfiction-fleet',
  guideId: 'captain-birch',
  adventureType: 'artifact_hunt',
  difficultyTier: 2,
  prerequisites: ['entry-pliny-natural-history'],
  unlocks: ['entry-rachel-carson-silent-spring'],
  funFact:
    "Diderot used clever cross-references to sneak forbidden ideas past the censors. An innocent article about a type of hat might cross-reference a radical essay on freedom — the censors didn't follow the links, but curious readers did.",
  imagePrompt:
    'Smuggling ship in the Fleet carrying forbidden volumes, crates of Encyclopédie plates being loaded by night, candlelit harbour with censorship banners on shore',
  status: 'published',
};

// ─── Entry 4: Rachel Carson — Silent Spring (Tier 3) ────────────────

export const ENTRY_RACHEL_CARSON_SILENT_SPRING: RealWorldEntry = {
  id: 'entry-rachel-carson-silent-spring',
  type: 'person',
  title: "The Book That Saved the Birds",
  year: 1962,
  yearDisplay: '1962 CE',
  era: 'contemporary',
  descriptionChild:
    "Rachel Carson noticed that birds were dying because of a chemical called DDT that farmers sprayed on their crops. She wrote a book called Silent Spring warning that one day spring might come without any birdsong. The chemical companies tried to silence her, but her book changed the law.",
  descriptionOlder:
    "Silent Spring (1962) showed that DDT was accumulating in food chains, killing birds, fish, and insects. Carson faced a massive industry campaign to discredit her science and her personally — she was called hysterical, a Communist, and a bad scientist. But her research was meticulous, and her writing was powerful. President Kennedy ordered an investigation that confirmed her findings. DDT was banned in the US in 1972, and Silent Spring is credited with launching the modern environmental movement.",
  descriptionParent:
    "Rachel Carson's Silent Spring (1962) demonstrates the power of rigorously researched nonfiction to reshape public policy. Carson documented biomagnification of DDT through food chains using peer-reviewed scientific evidence presented in accessible literary prose. The chemical industry mounted a $250,000 campaign to discredit her, attacking both her science and her gender. President Kennedy's Science Advisory Committee vindicated her findings, leading to the EPA's establishment (1970) and the domestic DDT ban (1972). The story teaches children that nonfiction writing backed by evidence can change laws, industries, and the relationship between humanity and the natural world.",
  realPeople: ['Rachel Carson', 'John F. Kennedy'],
  quote: "In nature, nothing exists alone.",
  quoteAttribution: 'Rachel Carson, Silent Spring, 1962',
  geographicLocation: { lat: 38.9072, lng: -77.0369, name: 'Washington, D.C., USA' },
  continent: 'North America',
  subjectTags: ['Rachel Carson', 'Silent Spring', 'DDT', 'environment', 'nonfiction impact'],
  worldId: 'nonfiction-fleet',
  guideId: 'captain-birch',
  adventureType: 'field_trip',
  difficultyTier: 3,
  prerequisites: ['entry-wollstonecraft-vindication', 'entry-encyclopedie'],
  unlocks: [],
  funFact:
    "The chemical industry spent $250,000 (equivalent to millions today) trying to discredit Carson. They called her \"a hysterical woman.\" But her research was so thorough that a presidential investigation confirmed every major finding. The EPA was created partly because of her book.",
  imagePrompt:
    'Research vessel in the Fleet studying silent shoreline, birds returning to trees as DDT recedes, Carson in the lab with microscope and manuscript, hopeful morning light',
  status: 'published',
};

// ─── Collected Exports ──────────────────────────────────────────────

export const NONFICTION_FLEET_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_PLINY_NATURAL_HISTORY,
  ENTRY_WOLLSTONECRAFT_VINDICATION,
  ENTRY_ENCYCLOPEDIE,
  ENTRY_RACHEL_CARSON_SILENT_SPRING,
] as const;

export const NONFICTION_FLEET_ENTRY_IDS: readonly string[] =
  NONFICTION_FLEET_ENTRIES.map((e) => e.id);
