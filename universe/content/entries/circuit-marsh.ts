/**
 * Content Entries — Circuit Marsh
 * World: The Circuit Marsh | Guide: Kofi Amponsah | Subject: Electricity / Circuits
 *
 * Four published entries spanning the history of electricity:
 *   1. Benjamin Franklin's kite — proving lightning is electrical
 *   2. Alessandro Volta and the first battery — the voltaic pile
 *   3. Edison, Latimer, and the practical light bulb — the forgotten engineer
 *   4. The solar panel — from laboratory to rooftop
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Franklin's Kite (Tier 1 — ages 5-6) ──────────────────

export const ENTRY_FRANKLIN_KITE: RealWorldEntry = {
  id: 'entry-franklin-kite',
  type: 'discovery',
  title: "The Kite That Tamed Lightning",
  year: 1752,
  yearDisplay: '1752 CE',
  era: 'enlightenment',
  descriptionChild:
    "Benjamin Franklin flew a kite in a thunderstorm to prove that lightning is electricity. He then invented the lightning rod — a metal spike that gives lightning a safe path to the ground, protecting buildings and ships. He made one of nature's most violent forces predictable.",
  descriptionOlder:
    "Franklin's experiment was genuinely dangerous. He survived. Russian physicist Georg Richmann, who tried to replicate it that same year, was killed. Franklin's insight that lightning is electrical discharged immediately enabled the lightning rod — which saved thousands of wooden buildings and sailing ships in the following decades.",
  descriptionParent:
    "Benjamin Franklin's 1752 kite experiment proved that lightning is an electrical phenomenon, directly leading to the invention of the lightning rod. The experiment was extremely dangerous — Georg Wilhelm Richmann died attempting a similar demonstration in St. Petersburg that same year. Franklin's contribution was not just scientific but practical: the lightning rod was one of the first technologies to protect human structures from natural forces. The story teaches observation-to-application thinking and the real risks early scientists accepted.",
  realPeople: ['Benjamin Franklin'],
  quote: "An ounce of prevention is worth a pound of cure.",
  quoteAttribution: 'Benjamin Franklin, 1736',
  geographicLocation: { lat: 39.9526, lng: -75.1652, name: 'Philadelphia, USA' },
  continent: 'North America',
  subjectTags: ['lightning', 'electricity', 'lightning rod', 'static electricity', 'safety'],
  worldId: 'circuit-marsh',
  guideId: 'kofi-amponsah',
  adventureType: 'reenactment',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-volta-battery'],
  funFact:
    "Church authorities initially opposed lightning rods because they believed lightning was God's punishment. Protecting against it seemed impious. The buildings they left unprotected kept burning down.",
  imagePrompt:
    'A kite flying above a marsh in a thunderstorm, copper wires glowing with electrical charge, reed circuits sparking below',
  status: 'published',
};

// ─── Entry 2: Volta and the First Battery (Tier 2 — ages 7-8) ──────

export const ENTRY_VOLTA_BATTERY: RealWorldEntry = {
  id: 'entry-volta-battery',
  type: 'invention',
  title: "The Argument That Built the First Battery",
  year: 1800,
  yearDisplay: '1800 CE',
  era: 'industrial',
  descriptionChild:
    "Two scientists argued about electricity. One thought it came from frogs' legs. The other thought it came from two different metals touching each other. The second one was right — and he built the first battery to prove it.",
  descriptionOlder:
    "Galvani's 'animal electricity' theory inspired Volta to test whether dissimilar metals could create current without biology. His voltaic pile — alternating zinc and copper discs separated by brine-soaked cloth — produced the first sustained electrical current. Napoleon was reportedly so impressed he personally watched the demonstration.",
  descriptionParent:
    "Alessandro Volta's voltaic pile (1800) was the first device to produce sustained electrical current, settling a scientific debate with Luigi Galvani over whether electricity was biological or chemical. The voltaic pile — alternating zinc and copper discs separated by brine-soaked cloth — demonstrated that chemical reactions between dissimilar metals produce electric current. This invention launched electrochemistry and made possible every battery-powered device that followed. The unit of electrical potential, the volt, bears his name.",
  realPeople: ['Alessandro Volta', 'Luigi Galvani'],
  quote: "The language of experiment is more authoritative than any reasoning.",
  quoteAttribution: 'Alessandro Volta (paraphrased)',
  geographicLocation: { lat: 45.1847, lng: 9.1582, name: 'Pavia, Italy' },
  continent: 'Europe',
  subjectTags: ['battery', 'voltaic pile', 'electrochemistry', 'electrical current', 'invention'],
  worldId: 'circuit-marsh',
  guideId: 'kofi-amponsah',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-franklin-kite'],
  unlocks: ['entry-edison-latimer-lightbulb'],
  funFact:
    "The unit of electrical potential — the volt — is named after Volta. Every phone charger in the world carries his name in its rating.",
  imagePrompt:
    'Stack of alternating copper and zinc discs with brine-soaked cloth between them, glowing amber in the marshland dusk, powering reed-circuit lights',
  status: 'published',
};

// ─── Entry 3: Edison, Latimer & the Light Bulb (Tier 2 — ages 7-8) ──

export const ENTRY_EDISON_LATIMER_LIGHTBULB: RealWorldEntry = {
  id: 'entry-edison-latimer-lightbulb',
  type: 'invention',
  title: "The Forgotten Engineer Who Made Light Last",
  year: 1882,
  yearDisplay: '1882 CE',
  era: 'industrial',
  descriptionChild:
    "Thomas Edison's team invented a light bulb, but early bulbs lasted only hours. Lewis Latimer — a Black engineer who had taught himself technical drawing — figured out how to make a carbon filament that made bulbs last for weeks. Latimer wrote the book, literally, on how to install electric lighting systems.",
  descriptionOlder:
    "Edison's bulb required thousands of failed attempts — the perseverance story is true. What is less often told: Latimer's improved carbon filament and his 1890 book 'Incandescent Electric Lighting' made the technology deployable at scale. Without Latimer, Edison's invention might have stayed a laboratory exhibit.",
  descriptionParent:
    "Thomas Edison's incandescent lamp required Lewis Latimer's improved carbon filament (patented 1882) to become commercially viable. Latimer's filament lasted weeks instead of hours, and his 1890 technical book became the industry standard for electrical installation. As one of the only Black members of the Edison Pioneers, Latimer's contributions were systematically underrecognised during his lifetime. The story teaches children that innovation is often collaborative and that historical credit is not always distributed fairly.",
  realPeople: ['Thomas Edison', 'Lewis Latimer'],
  quote: "I have only gotten this far by standing on the shoulders of those who came before me.",
  quoteAttribution: 'Lewis Latimer (attributed)',
  geographicLocation: { lat: 40.7128, lng: -74.006, name: 'New York, USA' },
  continent: 'North America',
  subjectTags: ['light bulb', 'filament', 'electrical engineering', 'Black inventors', 'innovation'],
  worldId: 'circuit-marsh',
  guideId: 'kofi-amponsah',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-franklin-kite'],
  unlocks: ['entry-solar-panel'],
  funFact:
    "Latimer was one of the only Black members of the Edison Pioneers. He was also an accomplished poet who published a collection of verse. His technical drawings were used as evidence in patent disputes Edison lost without him.",
  imagePrompt:
    'Marsh workshop with glowing carbon filament bulbs hanging from reed structures, warm amber light reflecting off still water',
  status: 'published',
};

// ─── Entry 4: The Solar Panel (Tier 3 — ages 9-10) ─────────────────

export const ENTRY_SOLAR_PANEL: RealWorldEntry = {
  id: 'entry-solar-panel',
  type: 'invention',
  title: "From Laboratory Curiosity to Rooftop Revolution",
  year: 1954,
  yearDisplay: '1954 CE',
  era: 'modern',
  descriptionChild:
    "Scientists discovered that sunlight hitting certain materials caused electricity to jump out of them. This became the solar panel — a way to make electricity directly from sunlight with no moving parts, no fuel, and no noise. Kofi's Solar Clearing runs entirely on this principle.",
  descriptionOlder:
    "The first practical solar cells were invented at Bell Labs in 1954 and were far too expensive for civilian use. The price has dropped 99.6% since then — one of the steepest cost curves of any technology in history, driven by manufacturing scale and international competition.",
  descriptionParent:
    "The silicon solar cell developed at Bell Labs in 1954 by Chapin, Fuller, and Pearson had an efficiency of about 6% and was prohibitively expensive. Since then, prices have dropped 99.6% while efficiency has quadrupled. Solar photovoltaics represent one of the most dramatic technology cost curves in history — driven by manufacturing scale, materials science, and international competition. The story teaches children that a technology's initial cost does not determine its future — and that the sun delivers more energy to Earth's surface in one hour than humanity uses in a year.",
  realPeople: ['Daryl Chapin', 'Calvin Fuller', 'Gerald Pearson'],
  quote: "The constraint has never been supply — only collection.",
  quoteAttribution: 'Kofi Amponsah, Guide of the Circuit Marsh',
  geographicLocation: { lat: 40.6836, lng: -74.4013, name: 'Bell Labs, New Jersey, USA' },
  continent: 'North America',
  subjectTags: ['solar energy', 'photovoltaics', 'renewable energy', 'cost curves', 'sustainability'],
  worldId: 'circuit-marsh',
  guideId: 'kofi-amponsah',
  adventureType: 'natural_exploration',
  difficultyTier: 3,
  prerequisites: ['entry-volta-battery', 'entry-edison-latimer-lightbulb'],
  unlocks: [],
  funFact:
    "The amount of solar energy hitting Earth's surface in one hour exceeds all the energy humanity uses in an entire year. The constraint has never been supply — only collection.",
  imagePrompt:
    'Solar panels angled on lily pads across a marsh clearing, sunlight converting to visible electrical current flowing through reed circuits',
  status: 'published',
};

// ─── Collected Exports ──────────────────────────────────────────────

export const CIRCUIT_MARSH_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_FRANKLIN_KITE,
  ENTRY_VOLTA_BATTERY,
  ENTRY_EDISON_LATIMER_LIGHTBULB,
  ENTRY_SOLAR_PANEL,
] as const;

export const CIRCUIT_MARSH_ENTRY_IDS: readonly string[] =
  CIRCUIT_MARSH_ENTRIES.map((e) => e.id);
