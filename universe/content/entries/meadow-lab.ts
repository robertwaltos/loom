/**
 * Content Entries — The Meadow Lab
 * World: The Meadow Lab | Guide: Baxter | Subject: Plant Biology / Ecology
 *
 * Four published entries spanning botanical discovery and ecology:
 *   1. Gregor Mendel and the Laws of Inheritance — genetics before DNA
 *   2. Wangari Maathai and the Green Belt Movement — trees as resistance
 *   3. Mycorrhizal Networks — the Wood Wide Web beneath the forest floor
 *   4. Colony Collapse Disorder — when the bees disappeared
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Mendel's Pea Plants (Tier 1 — ages 5-6) ─────────────

export const ENTRY_MENDEL_INHERITANCE: RealWorldEntry = {
  id: 'entry-mendel-inheritance',
  type: 'discovery',
  title: 'The Monk Who Read Seeds',
  year: 1866,
  yearDisplay: '1866 CE',
  era: 'industrial',
  descriptionChild:
    "A monk named Gregor Mendel grew thousands of pea plants and kept careful notes about which ones were tall or short, purple-flowered or white. He discovered that traits pass from parents to children following predictable patterns — like a quiet rule hiding inside every seed.",
  descriptionOlder:
    "Mendel discovered the laws of genetics 40 years before scientists knew DNA existed. By crossing pea plants and meticulously recording the results across generations, he identified dominant and recessive traits and their 3:1 ratios. His work was ignored in his lifetime and rediscovered only in 1900 — after his death. The Growth Chamber in the Meadow Lab recreates his original crossing experiments so children can predict results before they see them.",
  descriptionParent:
    "Mendel's experiments (1856–1863, published 1866) established the foundations of genetics through rigorous quantitative biology. His discovery of discrete hereditary 'factors' (now called genes) contradicted the prevailing blending theory of inheritance. The 34-year gap between publication and recognition illustrates how paradigm-shifting discoveries can be invisible to contemporaries. Children engaging with this entry practice hypothesis formation and data recording — the same skills Mendel used.",
  realPeople: ['Gregor Mendel'],
  quote: "My scientific studies have afforded me great gratification.",
  quoteAttribution: 'Gregor Mendel',
  geographicLocation: { lat: 49.1951, lng: 16.6068, name: 'Brno, Moravia (Czech Republic)' },
  continent: 'Europe',
  subjectTags: ['genetics', 'inheritance', 'pea plants', 'scientific method', 'biology'],
  worldId: 'meadow-lab',
  guideId: 'baxter',
  adventureType: 'reenactment',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-maathai-green-belt'],
  funFact:
    'Mendel worked with 29,000 pea plants over eight years. His record-keeping was so precise that some modern statisticians suspect his results were too clean. The debate continues.',
  imagePrompt:
    "A sunlit monastery garden in 1860s Moravia, rows upon rows of pea plants with purple and white flowers, Gregor Mendel in simple monk's robes kneeling to examine a pod with a magnifying glass, a leather notebook open beside him filled with careful tally marks, the monastery visible behind stone walls, warm golden afternoon light, bees visiting the flowers, Studio Ghibli botanical realism with scientific precision",
  status: 'published',
};

// ─── Entry 2: Wangari Maathai (Tier 2 — ages 7-8) ─────────────────

export const ENTRY_MAATHAI_GREEN_BELT: RealWorldEntry = {
  id: 'entry-maathai-green-belt',
  type: 'person',
  title: 'The Woman Who Planted 51 Million Trees',
  year: 1977,
  yearDisplay: '1977 CE',
  era: 'contemporary',
  descriptionChild:
    "A scientist named Wangari Maathai noticed that Kenyan women couldn't find firewood or clean water because forests had been cut down. She started asking women to plant trees. They planted over 51 million. She was arrested for it. She kept going.",
  descriptionOlder:
    "Maathai connected environmental restoration to democracy and women's rights. Her Green Belt Movement was explicitly political: a colonised landscape, she argued, reflects a colonised people. She was imprisoned, beaten, and publicly mocked by the Kenyan government for decades. She won the Nobel Peace Prize in 2004 — the first African woman to receive it. Baxter leads children along the Canopy Walk, planting virtual trees that grow in real time and restore ecosystem connections visible in the Root Lab below.",
  descriptionParent:
    "Wangari Maathai's Green Belt Movement (1977–present) demonstrates the intersection of ecology, feminism, and political activism. Her insight — that environmental degradation and social injustice share common roots — anticipated modern intersectional environmentalism by decades. The movement empowered rural Kenyan women economically (they were paid to grow seedlings) while simultaneously restoring degraded watersheds. It shows children that science, activism, and community can be inseparable.",
  realPeople: ['Wangari Maathai'],
  quote: "When we plant trees, we plant the seeds of peace.",
  quoteAttribution: 'Wangari Maathai',
  geographicLocation: { lat: -1.2864, lng: 36.8172, name: 'Nairobi, Kenya' },
  continent: 'Africa',
  subjectTags: ['reforestation', 'activism', 'ecology', 'Nobel Prize', 'community'],
  worldId: 'meadow-lab',
  guideId: 'baxter',
  adventureType: 'guided_expedition',
  difficultyTier: 2,
  prerequisites: ['entry-mendel-inheritance'],
  unlocks: ['entry-mycorrhizal-networks'],
  funFact:
    "Maathai described the act of planting trees as 'the most obvious thing to do.' She said that if you want to change the world, pick up a seed.",
  imagePrompt:
    "Kenyan hillside transitioning from barren eroded brown earth on the left to lush green forest on the right, Wangari Maathai in traditional dress planting a seedling alongside a group of determined Kenyan women, each woman carrying burlap sacks of seedlings, the planted trees on the right side showing different stages of growth from sapling to canopy, distant view of a restored watershed with clear water, warm equatorial light, Studio Ghibli environmental storytelling with photographic dignity",
  status: 'published',
};

// ─── Entry 3: Mycorrhizal Networks (Tier 2 — ages 7-8) ─────────────

export const ENTRY_MYCORRHIZAL_NETWORKS: RealWorldEntry = {
  id: 'entry-mycorrhizal-networks',
  type: 'discovery',
  title: 'The Secret Internet Under the Forest',
  year: 1997,
  yearDisplay: '1997 CE',
  era: 'contemporary',
  descriptionChild:
    "Trees in a forest are secretly connected underground through a network of mushroom threads. They share food and sugar through this web. A big 'mother tree' sends food to baby trees growing in the dark. The forest is a family — and you can see it in the Root Lab floor.",
  descriptionOlder:
    "Suzanne Simard proved that old-growth forests have complex underground communication systems. Trees exchange carbon, water, and chemical warning signals via mycorrhizal fungi — threadlike organisms that connect root systems across entire forests. A single 'mother tree' can be connected to hundreds of younger trees, sending them nutrients through the network. Logging a mother tree doesn't just remove one tree — it disrupts the network for dozens of others.",
  descriptionParent:
    "Simard's research (1997–present) demonstrated that forests function as cooperative superorganisms rather than collections of competing individuals. Mycorrhizal networks facilitate resource sharing, chemical signaling (warning of pest attacks), and even nutrient transfer from dying trees to healthy neighbors. This challenges the Darwinian model of pure competition and introduces children to systems thinking — understanding emergent properties that arise from connections, not just components.",
  realPeople: ['Suzanne Simard'],
  quote: "A forest is a cooperative system.",
  quoteAttribution: 'Suzanne Simard',
  geographicLocation: { lat: 49.2608, lng: -123.2460, name: 'British Columbia, Canada' },
  continent: 'North America',
  subjectTags: ['mycorrhizal networks', 'fungi', 'ecology', 'forest science', 'systems thinking'],
  worldId: 'meadow-lab',
  guideId: 'baxter',
  adventureType: 'natural_exploration',
  difficultyTier: 2,
  prerequisites: ['entry-maathai-green-belt'],
  unlocks: ['entry-colony-collapse'],
  funFact:
    'A single teaspoon of healthy forest soil contains several kilometres of fungal threads. The network under one hectare of old-growth forest is more complex than the internet.',
  imagePrompt:
    "Cross-section view of a forest floor in British Columbia, massive old-growth trees towering above with roots visible below the soil line, glowing golden mycorrhizal threads connecting every root system in an intricate web, a smaller seedling in shade receiving a visible pulse of golden nutrients from a large mother tree through the fungal network, mushroom fruiting bodies at the surface, earthworms and soil organisms visible, warm underground amber glow contrasted with cool forest green above, Studio Ghibli magical realism with scientific cross-section cutaway",
  status: 'published',
};

// ─── Entry 4: Colony Collapse Disorder (Tier 3 — ages 9-10) ────────

export const ENTRY_COLONY_COLLAPSE: RealWorldEntry = {
  id: 'entry-colony-collapse',
  type: 'event',
  title: 'The Year the Bees Stopped Coming Home',
  year: 2006,
  yearDisplay: '2006 CE',
  era: 'contemporary',
  descriptionChild:
    "Since 2006, billions of honeybees have simply not returned to their hives. Bees pollinate a third of everything we eat. Baxter goes quiet when this topic comes up. Without bees, many fruits and vegetables would disappear from the world.",
  descriptionOlder:
    "Colony collapse disorder has multiple suspected causes: pesticides (especially neonicotinoids), parasitic mites (Varroa destructor), habitat loss, monoculture farming, and climate change. No single cause has been confirmed — it appears to be a cascade of interacting stressors. The crisis connects chemistry, biology, economics, and politics, and demonstrates that an ecosystem problem rarely has a single answer. Baxter maintains the Meadow Lab's beehives as a living demonstration of pollination networks.",
  descriptionParent:
    "Colony collapse disorder (CCD) is a case study in complex systems failure. It demonstrates how multiple sub-lethal stressors can combine to cause catastrophic ecosystem disruption. The economic impact is staggering: honeybee pollination contributes an estimated $15 billion annually to US agriculture alone. The CCD crisis teaches children that real-world problems are rarely single-cause, that ecosystems are interconnected, and that human agricultural practices have consequences that ripple through natural systems.",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: null,
  continent: 'North America',
  subjectTags: ['pollinators', 'bees', 'ecosystem collapse', 'agriculture', 'environmental crisis'],
  worldId: 'meadow-lab',
  guideId: 'baxter',
  adventureType: 'natural_exploration',
  difficultyTier: 3,
  prerequisites: ['entry-mycorrhizal-networks'],
  unlocks: [],
  funFact:
    "Einstein is often credited with saying 'If the bee disappeared, man would have only four years to live.' He almost certainly never said this — but the ecological substance is accurate enough to take seriously.",
  imagePrompt:
    "Split-scene image of two beehives: on the left, a thriving hive surrounded by wildflowers with bees busily entering and leaving, golden honeycomb visible inside, fruit trees bearing heavy fruit behind; on the right, an abandoned hive with no activity, withered flowers, bare fruit trees with fallen unpollinated blossoms, Baxter the golden retriever sitting between both scenes with his head lowered sadly, warm and cold lighting contrasted, Studio Ghibli emotional environmental storytelling",
  status: 'published',
};

// ─── Export ────────────────────────────────────────────────────────

export const MEADOW_LAB_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_MENDEL_INHERITANCE,
  ENTRY_MAATHAI_GREEN_BELT,
  ENTRY_MYCORRHIZAL_NETWORKS,
  ENTRY_COLONY_COLLAPSE,
];

export const MEADOW_LAB_ENTRY_IDS = MEADOW_LAB_ENTRIES.map((e) => e.id);
