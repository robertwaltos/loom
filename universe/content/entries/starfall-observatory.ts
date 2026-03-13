/**
 * Content Entries — Starfall Observatory
 * World: Starfall Observatory | Guide: Riku Osei | Subject: Space Science / Astronomy
 *
 * Four published entries spanning the history of astronomical discovery:
 *   1. Ibn al-Haytham's Book of Optics — how we came to understand light and lenses
 *   2. Galileo discovers Jupiter's moons — the night the Earth lost its centrality
 *   3. Henrietta Leavitt's Cepheids — how one woman measured the size of the universe
 *   4. The James Webb Space Telescope — looking 13 billion years into the past
 *
 * NOTE: Riku is blind from birth. All entries in this world use tactile
 * and sound-based description language alongside visual. Riku's Observatory
 * has tactile star maps, sonified data feeds, and raised-relief planet models.
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Ibn al-Haytham and Light (Tier 1 — ages 5-6) ──────────

export const ENTRY_IBN_AL_HAYTHAM_OPTICS: RealWorldEntry = {
  id: 'entry-ibn-al-haytham-optics',
  type: 'person',
  title: "The Scientist Who Proved We See With Our Brains",
  year: 1011,
  yearDisplay: '1011 CE',
  era: 'medieval',
  descriptionChild:
    "Over 1,000 years ago in Egypt, a scientist named Ibn al-Haytham asked a question nobody had thought to test: where does seeing happen? In your eyes? Or somewhere else? He found out eyes collect light — but the brain is what SEES. He proved this by building a camera obscura — a dark room with a tiny hole that projects an upside-down picture on the opposite wall. Without his discoveries, we couldn't build telescopes, cameras, or glasses.",
  descriptionOlder:
    "Abu Ali al-Hasan ibn al-Haytham (Alhazen), working from Cairo around 1011 CE, wrote 'Kitab al-Manazir' (Book of Optics) — a seven-volume work that fundamentally transformed understanding of light, vision, and optics. He disproved the prevailing Greek theory that eyes emit rays to 'feel' objects, proving that light travels INTO the eye. He described the anatomy of the visual system, explained refraction and reflection using geometry, and described the pin-hole camera effect. His work was translated into Latin and became the foundational optics text in Europe for 500 years, directly enabling Kepler's work on telescopes.",
  descriptionParent:
    "Ibn al-Haytham's story introduces the Islamic Golden Age as a period of major scientific progress, corrects the common misconception that modern science began in Western Europe, and demonstrates the foundational role of optics in astronomy. His experimental method — build apparatus, observe, measure, theorize — predates Francis Bacon by 600 years. For children with visual impairments, Riku's discussion of how Ibn al-Haytham proved that 'seeing happens in the brain, not the eye' is especially meaningful: what we perceive and what light does are different things.",
  realPeople: ['Ibn al-Haytham (Alhazen)'],
  quote: "The duty of the man who investigates the writings of scientists is to make himself their enemy.",
  quoteAttribution: 'Ibn al-Haytham, c. 1027 CE',
  geographicLocation: { lat: 30.0444, lng: 31.2357, name: 'Cairo, Egypt' },
  continent: 'Africa',
  subjectTags: ['optics', 'light', 'vision', 'Islamic Golden Age', 'scientific method', 'camera obscura'],
  worldId: 'starfall-observatory',
  guideId: 'riku-osei',
  adventureType: 'guided_expedition',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-galileo-jupiter-moons'],
  funFact: "Ibn al-Haytham placed himself under voluntary house arrest for a decade — he had originally told the Caliph of Egypt he could control the Nile River floods (he couldn't). So he faked madness to avoid execution, and used his house-arrest years to write the Book of Optics.",
  imagePrompt:
    "Cairo 1011 CE, a large stone room converted into a camera obscura, a small hole in the shuttered wall projecting a bright upside-down image of the street outside onto the opposite wall, Ibn al-Haytham in Abbasid-era robes studying the projection with intense focus, geometric diagrams of light rays scratched on the plaster wall beside him, warm honey-colored light from the single projected image, Ghibli painterly warmth with architectural detail of Islamic Golden Age scholarship",
  status: 'published',
};

// ─── Entry 2: Galileo's Jupiter Moons (Tier 2 — ages 7-8) ───────────

export const ENTRY_GALILEO_JUPITER_MOONS: RealWorldEntry = {
  id: 'entry-galileo-jupiter-moons',
  type: 'discovery',
  title: "The Night Everything Moved",
  year: 1610,
  yearDisplay: 'January 7, 1610',
  era: 'renaissance',
  descriptionChild:
    "On January 7, 1610, Galileo pointed his telescope at Jupiter and saw something that had never been seen before: four tiny bright dots arranged around it. He watched every night for weeks. The dots moved. Around Jupiter, not around Earth. He had just proved that not everything in the sky moves around the Earth. The Church was furious. Galileo was right. Those four moons are still called the Galilean moons.",
  descriptionOlder:
    "Galileo Galilei built a refracting telescope with 20x magnification in 1609 and turned it systematically toward the sky. On January 7, 1610, he observed three small fixed stars near Jupiter in a line. Over subsequent nights, a fourth appeared, and all four moved relative to Jupiter while Jupiter moved relative to the background stars. He published his observations in 'Sidereus Nuncius' (Starry Messenger) in March 1610, 60 days later. His conclusion: these were four moons orbiting Jupiter — proving that celestial bodies did not all orbit the Earth. The Church's Inquisition eventually forced him to recant. He was 67 years old when placed under house arrest. He never left.",
  descriptionParent:
    "Galileo's discovery of the Galilean moons (Io, Europa, Ganymede, Callisto) is a gateway to teaching heliocentrism vs. geocentrism, the evidence-based scientific method, and the social consequences of scientific discovery. Europa is now considered one of the best candidates for extraterrestrial life (liquid ocean under ice). Callisto is the most heavily cratered body in the solar system. Ganymede is larger than Mercury. The story raises a critical thinking question: when someone in authority says the sky is one way and your own observation says another, how do you decide who is right?",
  realPeople: ['Galileo Galilei', 'Johannes Kepler'],
  quote: "And yet it moves.",
  quoteAttribution: 'Attributed to Galileo Galilei (possibly apocryphal, but widely reported)',
  geographicLocation: { lat: 45.4063, lng: 11.8765, name: 'Padua, Italy' },
  continent: 'Europe',
  subjectTags: ['Jupiter', 'moons', 'telescopes', 'heliocentrism', 'observation', 'Galileo'],
  worldId: 'starfall-observatory',
  guideId: 'riku-osei',
  adventureType: 'time_window',
  difficultyTier: 2,
  prerequisites: ['entry-ibn-al-haytham-optics'],
  unlocks: ['entry-henrietta-leavitt-cepheids'],
  funFact: "Galileo named the four moons the 'Medicean Stars' to flatter the Medici family and get their support. It didn't save him from the Inquisition, but his name stuck — we call them the Galilean moons.",
  imagePrompt:
    "Padua Italy 1610 at midnight, Galileo in his tower observatory bending over a refracting telescope pointed at a brilliant Jupiter, his notebook open beside him with ink sketches of four dot positions marked across four different nights with dates, candle burning low, the actual moons visible in the night sky as faint golden dots around Jupiter's disc, warm candlelight on his face of intense discovery, atmosphere of world-changing moment in a modest room, Ghibli painterly drama",
  status: 'published',
};

// ─── Entry 3: Henrietta Leavitt's Cepheids (Tier 2 — ages 7-8) ──────

export const ENTRY_HENRIETTA_LEAVITT_CEPHEIDS: RealWorldEntry = {
  id: 'entry-henrietta-leavitt-cepheids',
  type: 'discovery',
  title: "The Woman Who Measured the Universe",
  year: 1908,
  yearDisplay: '1908 CE',
  era: 'modern',
  descriptionChild:
    "In 1908, a scientist named Henrietta Leavitt had a job that most male scientists thought was boring: measuring the brightness of thousands of stars from photographs. But Henrietta was doing something they didn't notice — she was discovering a pattern. She found that certain pulsing stars (called Cepheids) always pulsed at the same speed as their true brightness. This meant she could measure how far away any galaxy was. She gave astronomers a ruler for the universe. She was never given the Nobel Prize for it.",
  descriptionOlder:
    "Henrietta Swan Leavitt worked as a 'computer' at Harvard Observatory — one of a group of women hired to measure and catalog stars from photographic plates, paid 25 cents per hour. In 1908, she published her discovery of the period-luminosity relationship in Cepheid variable stars: the longer the pulsation period, the greater the true luminosity. This 'Cepheid yardstick' allowed Edwin Hubble in 1924 to measure the distance to the Andromeda Galaxy and prove it lay far outside the Milky Way — establishing that the universe contained billions of galaxies. Leavitt was also deaf. She died in 1921, before Hubble's use of her work became famous; had she lived, she would almost certainly have won the Nobel Prize.",
  descriptionParent:
    "Leavitt's story is among the most important in astronomy and in the history of women in science. The 'Harvard Computers' — women hired for low-paid measurement work who frequently made major discoveries — represent a pattern of uncredited scientific labor that is worth discussing explicitly with children. Leavitt's deafness is largely uncovered in popular accounts. The Cepheid method she developed remained the primary cosmological distance measurement for 50 years. Edwin Hubble acknowledged her contribution. The Nobel Committee was notified of her work after her death but the prize cannot be awarded posthumously.",
  realPeople: ['Henrietta Swan Leavitt', 'Edwin Hubble', 'Edward Charles Pickering'],
  quote: "It is worthy of notice that — the brighter variables have the longer periods.",
  quoteAttribution: 'Henrietta Swan Leavitt, 1912',
  geographicLocation: { lat: 42.3736, lng: -71.1097, name: 'Harvard Observatory, Cambridge, Massachusetts' },
  continent: 'North America',
  subjectTags: ['Cepheid stars', 'variable stars', 'distance measurement', 'cosmology', 'women in science'],
  worldId: 'starfall-observatory',
  guideId: 'riku-osei',
  adventureType: 'remembrance_wall',
  difficultyTier: 2,
  prerequisites: ['entry-galileo-jupiter-moons'],
  unlocks: ['entry-james-webb-telescope'],
  funFact: "Leavitt was also deaf, and used her hearing aids at work — though her colleagues rarely mentioned this. Riku always mentions it. He says: 'She measured the size of the universe while listening to it differently than everyone else.'",
  imagePrompt:
    "Harvard Observatory 1908, a large table covered in hundreds of glass photographic plates of stars, Henrietta Leavitt in Edwardian dress bending over a magnifying glass examining one plate, her logbook open with hand-plotted graphs showing pulsation period vs. brightness, a faint smile of someone who has just seen something important, rows of filing cabinets behind her, oil lamp and early electric light mixing, dignified and quiet atmosphere of discovery through patience, Ghibli painterly realism",
  status: 'published',
};

// ─── Entry 4: James Webb Space Telescope (Tier 3 — ages 9-10) ───────

export const ENTRY_JAMES_WEBB_TELESCOPE: RealWorldEntry = {
  id: 'entry-james-webb-telescope',
  type: 'invention',
  title: "Eyes That See 13 Billion Years Ago",
  year: 2021,
  yearDisplay: 'December 25, 2021',
  era: 'contemporary',
  descriptionChild:
    "On Christmas Day 2021, the James Webb Space Telescope launched. It flew a million miles from Earth and unfolded — like an origami golden flower — into a mirror the size of a tennis court. JWST doesn't see light we can see. It sees infrared light — which is actually heat. And because light takes time to travel, when JWST shows us a galaxy, it's showing us what that galaxy looked like 13 BILLION years ago. It's a time machine that only looks backward.",
  descriptionOlder:
    "JWST's 6.5-meter segmented primary mirror, kept at -233°C in permanent shadow by a 5-layer sunshield the size of a tennis court, collects infrared light with a sensitivity 100x greater than Hubble. Its L2 orbit (1.5 million km from Earth, beyond the Moon's shadow) ensures stable conditions. First images released July 12, 2022 showed galaxy cluster SMACS 0723 — light that left those galaxies 4.6 billion years ago, lensed by the cluster's gravity. JWST can detect the chemical signatures of exoplanet atmospheres, potentially identifying signs of life.",
  descriptionParent:
    "JWST introduces the concept of light-travel time (seeing the past) and infrared vs. visible light (there is more to the universe than human senses detect). It also demonstrates international scientific collaboration — JWST is a joint project of NASA, ESA, and CSA, with components built across the US, Canada, and Europe. The 20-year, $10 billion development involved 10,000 people. JWST's early results have already revised models of early galaxy formation. Connecting this to Leavitt's Cepheid work shows children how scientific tools build on each other across centuries.",
  realPeople: ['James Webb (administrator)', 'John Mather', 'NASA, ESA, CSA mission teams'],
  quote: "The universe is under no obligation to make sense to you.",
  quoteAttribution: 'Neil deGrasse Tyson',
  geographicLocation: { lat: 5.2389, lng: -52.7641, name: 'Kourou, French Guiana (launch site)' },
  continent: 'South America',
  subjectTags: ['JWST', 'infrared astronomy', 'deep field', 'exoplanets', 'early universe', 'space telescope'],
  worldId: 'starfall-observatory',
  guideId: 'riku-osei',
  adventureType: 'natural_exploration',
  difficultyTier: 3,
  prerequisites: ['entry-henrietta-leavitt-cepheids'],
  unlocks: [],
  funFact: "JWST travels to a gravitationally stable point between Earth and Sun called L2 — it's in constant 'shadow' from both, which keeps it cold enough to work. To stay at L2, it fires tiny thrusters periodically. If those thrusters stopped for too long, it would drift away forever.",
  imagePrompt:
    "Deep space, the James Webb Space Telescope fully deployed in its golden hexagonal glory against the star-field, sunshield visible below like a silver diamond kite, Earth and Moon tiny crescents in the far background, the primary mirror reflecting a galaxy cluster, all set against the absolute black of space with the Milky Way arc visible, Ghibli-quality painterly rendering of engineering wonder and cosmic scale, profound quiet, warm gold of the beryllium mirrors against cold black infinity",
  status: 'published',
};

// ─── Export ────────────────────────────────────────────────────────

export const STARFALL_OBSERVATORY_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_IBN_AL_HAYTHAM_OPTICS,
  ENTRY_GALILEO_JUPITER_MOONS,
  ENTRY_HENRIETTA_LEAVITT_CEPHEIDS,
  ENTRY_JAMES_WEBB_TELESCOPE,
];

export const STARFALL_OBSERVATORY_ENTRY_IDS = STARFALL_OBSERVATORY_ENTRIES.map((e) => e.id);
