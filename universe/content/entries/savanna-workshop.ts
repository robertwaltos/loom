/**
 * Content Entries — Savanna Workshop
 * World: Savanna Workshop | Guide: Zara Ngozi | Subject: Engineering / Simple Machines
 *
 * Four published entries spanning the history of human engineering:
 *   1. Archimedes and the lever — give me a long enough lever and a place to stand
 *   2. Nok iron smelting — Africa's forgotten metallurgical revolution
 *   3. Great Zimbabwe walls — engineering without mortar, without blueprints
 *   4. The Wright Brothers' workshop — twelve seconds that changed everything
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Archimedes and the Lever (Tier 1 — ages 5-6) ─────────

export const ENTRY_ARCHIMEDES_LEVER: RealWorldEntry = {
  id: 'entry-archimedes-lever',
  type: 'discovery',
  title: "The Lever: One Tool That Could Move the World",
  year: -250,
  yearDisplay: 'c. 250 BCE',
  era: 'classical',
  descriptionChild:
    "Have you ever used a see-saw? That's a lever! A brilliant inventor named Archimedes figured out the rules of levers over 2,000 years ago. He said something amazing: 'Give me a long enough lever and a place to stand, and I could move the whole Earth.' He wasn't being silly — he was right about the math. Levers make heavy things easier to lift.",
  descriptionOlder:
    "Archimedes of Syracuse was one of the greatest mathematicians and engineers of the ancient world. Around 250 BCE, he formulated the mathematical principles of the lever — that the force times its distance from the fulcrum on each side must be equal. He used this to design war machines, including catapults and a device that could lift Roman ships from the harbor. His principle ('Give me a lever long enough and a fulcrum on which to place it, and I shall move the world') wasn't hyperbole — it was a mathematical proof.",
  descriptionParent:
    "Archimedes' work on levers (c. 260 BCE, described in 'On the Equilibrium of Planes') is among the earliest formal mechanical science. His insight that mechanical advantage is created by the ratio of effort arm to load arm forms the foundation of all simple machines. Teaching the lever to young children introduces ratio, balance, and the idea that physics has discoverable rules — 'the universe is rule-following and we can find the rules.'",
  realPeople: ['Archimedes of Syracuse'],
  quote: "Give me a place to stand and a lever long enough, and I shall move the world.",
  quoteAttribution: 'Archimedes of Syracuse, c. 250 BCE',
  geographicLocation: { lat: 37.0755, lng: 15.2866, name: 'Syracuse, Sicily' },
  continent: 'Europe',
  subjectTags: ['levers', 'simple machines', 'mechanical advantage', 'physics', 'ancient engineering'],
  worldId: 'savanna-workshop',
  guideId: 'zara-ngozi',
  adventureType: 'reenactment',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-nok-iron-smelting'],
  funFact: "Archimedes used his engineering knowledge to defend his city of Syracuse against the Roman invasion — for years. His machines were so terrifying that Roman soldiers reportedly fled when they saw any rope or plank moving near the city walls, thinking it was one of his inventions.",
  imagePrompt:
    "Ancient Syracuse harbor at golden hour, Archimedes in simple Greek robes at a large lever and fulcrum system made of wood and stone, demonstrating how a small child pushing one end can lift a massive stone block on the other, the wide sparkling Mediterranean behind them, acacia trees and warm ochre stone, expression of pure mathematical delight, Ghibli painterly warmth with architectural precision, dust motes in the air",
  status: 'published',
};

// ─── Entry 2: Nok Iron Smelting (Tier 2 — ages 7-8) ────────────────

export const ENTRY_NOK_IRON_SMELTING: RealWorldEntry = {
  id: 'entry-nok-iron-smelting',
  type: 'discovery',
  title: "Africa's Forgotten Iron Age",
  year: -500,
  yearDisplay: 'c. 500 BCE',
  era: 'ancient',
  descriptionChild:
    "Thousands of years ago, a culture called Nok lived in what is now Nigeria. They discovered something most people don't know: the ability to turn rock into iron. They built furnaces hot enough to smelt iron ore — even before most of Europe or Asia had learned how. Nok metalworkers made tools, weapons, and art. Their iron technology spread across Africa, and it was independently invented — they figured it out themselves.",
  descriptionOlder:
    "The Nok culture (c. 1500 BCE–500 CE) in the Jos Plateau region of modern Nigeria was among the earliest iron-smelting societies in sub-Saharan Africa, with evidence dating to at least 500 BCE. Their furnace technology — reducing iron ore using charcoal in large clay furnaces — was independently developed, not copied from the Near East as was once assumed. The Nok also produced extraordinary terracotta sculptures with detailed features, suggesting a sophisticated civilization. Their iron technology was the foundation for later West African states. This story directly contradicts the colonial-era myth that Africa was a passive receiver of technology.",
  descriptionParent:
    "The Nok iron tradition is historically significant for two reasons: it demonstrates independent technological invention in Africa at least as early as Europe, and it exemplifies the spread of metallurgical knowledge across sub-Saharan Africa that enabled later civilizations like the Yoruba kingdoms, Mali, and Great Zimbabwe. Including this entry ensures children encounter a non-European engineering tradition early. The Nok also produced the oldest sub-Saharan African figurative sculpture, so their entry bridges engineering and art.",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 9.8965, lng: 8.8583, name: 'Jos Plateau, Nigeria' },
  continent: 'Africa',
  subjectTags: ['iron smelting', 'metallurgy', 'Nok culture', 'furnace technology', 'African engineering'],
  worldId: 'savanna-workshop',
  guideId: 'zara-ngozi',
  adventureType: 'field_trip',
  difficultyTier: 2,
  prerequisites: ['entry-archimedes-lever'],
  unlocks: ['entry-great-zimbabwe-walls'],
  funFact: "Nok terracotta sculptures made over 2,500 years ago are so detailed that some show people wearing what appear to be hearing aids — small rolls in the ear cavity. Archaeologists are still debating what these were.",
  imagePrompt:
    "West African savanna at firelit dusk, Nok culture iron smelting furnace glowing molten orange, clay furnace taller than a person with bellows made of animal hide being worked, skilled craftsworkers in earth-toned cloth monitoring the smelt, sparks and orange smoke curling into the cobalt sky, terracotta sculptures visible nearby — human figures with elaborate hairstyles, acacia trees silhouetted, rich ochre and amber light, Ghibli-NatGeo painterly dignity",
  status: 'published',
};

// ─── Entry 3: Great Zimbabwe Walls (Tier 2 — ages 7-8) ──────────────

export const ENTRY_GREAT_ZIMBABWE_WALLS: RealWorldEntry = {
  id: 'entry-great-zimbabwe-walls',
  type: 'place',
  title: "The Walls Built Without Mortar",
  year: 1100,
  yearDisplay: 'c. 1100–1450 CE',
  era: 'medieval',
  descriptionChild:
    "In southern Africa, a great city rose between 1100 and 1450. Its builders made walls over 11 meters tall and 250 meters long — without any glue, cement, or mortar. They fit the granite stones so perfectly together that the walls have stood for 900 years. Scientists call this 'dry-stone construction.' The city was the capital of a wealthy trading empire. Its name means 'Great Stone House' in Shona.",
  descriptionOlder:
    "Great Zimbabwe was the capital of the Kingdom of Zimbabwe — a major trading power that linked the East African coast's gold and ivory trade to global networks reaching Arabia, India, and China. The stone enclosures, built without mortar through a technique called dry-stone masonry, demonstrate sophisticated knowledge of load distribution and stone selection — only certain granite blocks were used, selected for how they naturally split into flat-faced slabs. The complex covers 722 hectares and was home to approximately 18,000 people at its peak. Colonial archaeologists notoriously tried to attribute it to Phoenicians or Arabs, unable to credit sub-Saharan Africans — a claim comprehensively disproved by modern archaeology.",
  descriptionParent:
    "Great Zimbabwe teaches structural engineering through a non-European lens: dry-stone construction is a technically demanding method requiring precise understanding of gravity, load distribution, and material properties. It also introduces the history of archaeological bias — the colonial denial of African authorship is a story about how assumptions corrupt science. Zimbabwe's national flag and emblem feature the Zimbabwe Bird recovered from the site. The entry connects to trade networks (exchange realm), stone technology (engineering), and historiography (critical thinking about sources).",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: -20.2676, lng: 30.9337, name: 'Great Zimbabwe, Zimbabwe' },
  continent: 'Africa',
  subjectTags: ['dry-stone masonry', 'structural engineering', 'Great Zimbabwe', 'African history', 'trade'],
  worldId: 'savanna-workshop',
  guideId: 'zara-ngozi',
  adventureType: 'field_trip',
  difficultyTier: 2,
  prerequisites: ['entry-nok-iron-smelting'],
  unlocks: ['entry-wright-brothers-workshop'],
  funFact: "The walls of Great Zimbabwe were built to be seen, not defended — they have no arrow slits and are very thick at the base but have no battlements. Archaeologists believe they were built to show power and wealth, not to stop armies.",
  imagePrompt:
    "Great Zimbabwe stone complex at golden afternoon light, massive curved granite walls nearly 11 meters high built from perfectly fitted rough-hewn stones without mortar, the Great Enclosure visible in background, a master builder examining the wall texture with hands, studying how the stones lock together, warm savanna golden light, Zimbabwe bird stone sculpture visible on a wall, acacia and mopane trees surrounding, atmosphere of engineering wonder and dignity, Ghibli-NatGeo painterly grandeur",
  status: 'published',
};

// ─── Entry 4: Wright Brothers' Workshop (Tier 3 — ages 9-10) ────────

export const ENTRY_WRIGHT_BROTHERS_WORKSHOP: RealWorldEntry = {
  id: 'entry-wright-brothers-workshop',
  type: 'invention',
  title: "Twelve Seconds at Kitty Hawk",
  year: 1903,
  yearDisplay: 'December 17, 1903',
  era: 'industrial',
  descriptionChild:
    "On December 17, 1903, two bicycle mechanics from Ohio named Wilbur and Orville Wright built something that had never existed: a powered flying machine. Their first flight lasted 12 seconds and traveled 37 meters — less than the length of a typical classroom. They weren't engineers with university degrees. They were mechanics who built things, broke them, studied why, and tried again. By the end of the day, they had flown four times.",
  descriptionOlder:
    "The Wright Brothers' success came from a systematic engineering approach that their competitors lacked. While others tried to copy birds, the Wrights focused on control — specifically, wing warping for lateral stability. They built a wind tunnel to test 200 different wing designs systematically. They designed and built their own lightweight engine when commercial ones were too heavy. Kitty Hawk was chosen for its consistent 13-mph winds. The Flyer I had a 12-horsepower engine, weighed 274 kg with pilot, and flew 260 meters on its fourth flight. The US Army rejected their invention for five years.",
  descriptionParent:
    "The Wright Brothers' story is ideal for teaching systematic problem-solving: they kept logbooks, built testing equipment (the wind tunnel), iterated on designs, and learned from failures — the scientific method applied to engineering. It also teaches persistence under rejection (the Army and major newspapers ignored them). The bicycle shop background demonstrates that domain expertise doesn't always predict breakthrough innovation; careful method and deep curiosity matter more. The four flights of December 17 were witnessed by only 5 people.",
  realPeople: ['Orville Wright', 'Wilbur Wright'],
  quote: "If we all worked on the assumption that what is accepted as true is really true, there would be little hope of advance.",
  quoteAttribution: 'Orville Wright',
  geographicLocation: { lat: 36.0275, lng: -75.6693, name: 'Kill Devil Hills, North Carolina' },
  continent: 'North America',
  subjectTags: ['flight', 'aerodynamics', 'engineering process', 'iteration', 'wind tunnel'],
  worldId: 'savanna-workshop',
  guideId: 'zara-ngozi',
  adventureType: 'reenactment',
  difficultyTier: 3,
  prerequisites: ['entry-great-zimbabwe-walls'],
  unlocks: [],
  funFact: "The Wright Brothers' sister Katharine mortgaged the family home to fund their experiments. When Orville finally got a US Army contract in 1908, he brought Katharine to Paris for the demonstration — and she became a celebrity in her own right, meeting the President of France.",
  imagePrompt:
    "Kill Devil Hills beach December 1903, cold gray Atlantic morning, the Flyer I just lifting 37 meters above the sand, Orville prone at controls, Wilbur running alongside, 5 witnesses at the edge looking up with awe, telegraph station in background, the wooden and fabric flying machine impossibly fragile against the winter sky, dunes and Atlantic behind, Studio Ghibli motion capture of historical moment, reverent sense of the threshold being crossed",
  status: 'published',
};

// ─── Export ────────────────────────────────────────────────────────

export const SAVANNA_WORKSHOP_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_ARCHIMEDES_LEVER,
  ENTRY_NOK_IRON_SMELTING,
  ENTRY_GREAT_ZIMBABWE_WALLS,
  ENTRY_WRIGHT_BROTHERS_WORKSHOP,
];

export const SAVANNA_WORKSHOP_ENTRY_IDS = SAVANNA_WORKSHOP_ENTRIES.map((e) => e.id);
