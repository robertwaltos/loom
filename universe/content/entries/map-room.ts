/**
 * Content Entries — Map Room
 * World: The Map Room | Guide: Atlas | Subject: Geography / Maps & Navigation
 *
 * Four published entries spanning the history of cartography and navigation:
 *   1. Polynesian navigators — sailing without instruments
 *   2. Mercator's projection — the useful lie
 *   3. The Prime Meridian — an imaginary line that runs the world
 *   4. GPS and the democratisation of maps — from military to phone
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Polynesian Navigators (Tier 1 — ages 5-6) ────────────

export const ENTRY_POLYNESIAN_NAVIGATORS: RealWorldEntry = {
  id: 'entry-polynesian-navigators',
  type: 'discovery',
  title: "Sailing Thousands of Kilometres Without a Map",
  year: 1000,
  yearDisplay: '~1000 CE',
  era: 'medieval',
  descriptionChild:
    "Polynesian navigators sailed thousands of kilometres across open ocean without compasses, maps, or GPS. They read waves, stars, clouds, bird behaviour, and the scent of flowers carried on the wind. They settled Hawaii, New Zealand, and Easter Island this way — the greatest exploration in human history.",
  descriptionOlder:
    "The navigational knowledge was nearly lost when colonisation broke the chain of traditional teaching. Mau Piailug was one of the last remaining masters who revived the practice, teaching Hawaiians aboard the voyaging canoe Hokule'a. Non-instrument ocean navigation across thousands of kilometres remains the most remarkable geospatial achievement in recorded history.",
  descriptionParent:
    "Polynesian wayfinding represents the most sophisticated non-instrument navigation system in human history. Navigators read star positions, ocean swell patterns, cloud formations, bird flight paths, phosphorescence, and wind-borne scents to traverse thousands of kilometres of open Pacific. The settlement of Hawaii, New Zealand, Rapa Nui (Easter Island), and hundreds of Pacific islands between 1500 BCE and 1000 CE constitutes the greatest dispersal of any seafaring people. Mau Piailug's revival of traditional navigation aboard Hokule'a in 1976 preserved knowledge that colonisation had nearly erased. The story teaches respect for indigenous knowledge systems.",
  realPeople: ['Mau Piailug'],
  quote: "The stars tell me where to go. The ocean tells me where I am.",
  quoteAttribution: 'Mau Piailug (paraphrased)',
  geographicLocation: null,
  continent: 'Oceania',
  subjectTags: ['Polynesian navigation', 'wayfinding', 'indigenous knowledge', 'Pacific Ocean', 'exploration'],
  worldId: 'map-room',
  guideId: 'atlas',
  adventureType: 'guided_expedition',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-mercator-projection'],
  funFact:
    "Polynesian navigators could detect an island's location by the way its landmass interrupted and bent ocean swells — detectable from hundreds of kilometres away, before the island was visible.",
  imagePrompt:
    'Ancient voyaging canoe on open ocean at night, star paths traced in the sky, wave patterns visible radiating from an unseen island, warm cartographer-lamp tones',
  status: 'published',
};

// ─── Entry 2: Mercator's Projection (Tier 2 — ages 7-8) ────────────

export const ENTRY_MERCATOR_PROJECTION: RealWorldEntry = {
  id: 'entry-mercator-projection',
  type: 'invention',
  title: "The Map That Lied Usefully",
  year: 1569,
  yearDisplay: '1569 CE',
  era: 'renaissance',
  descriptionChild:
    "Mercator invented a flat map that was extremely useful for sailors — they could draw a straight line on it and sail that line correctly. But to make the world flat, he had to stretch some places. Europe and North America look much larger than Africa and South America. The map was lying, but usefully.",
  descriptionOlder:
    "The Mercator projection preserves angles (crucial for navigation) at the cost of distorting area at higher latitudes. Greenland appears the same size as Africa on a Mercator map — Africa is 14 times larger. Historians argue that generations of European children learning from Mercator maps absorbed a subtle visual narrative that made their empire appear naturally central and large.",
  descriptionParent:
    "Gerardus Mercator's 1569 projection preserves angles (conformal), making it invaluable for navigation — straight lines on the map correspond to constant-bearing courses. However, it dramatically distorts area at high latitudes. Greenland appears equal to Africa despite being 14 times smaller. Historians and cartographers debate whether centuries of Mercator-default education embedded a subtle Eurocentric distortion in public geography. Peters projection (1973) and AuthaGraph (2016) offer alternative trade-offs. The story teaches children that all representations involve choices, and choices have consequences.",
  realPeople: ['Gerardus Mercator'],
  quote: "Every flat map lies. The question is how usefully.",
  quoteAttribution: 'Atlas, Guide of the Map Room',
  geographicLocation: { lat: 51.4307, lng: 3.5711, name: 'Netherlands' },
  continent: 'Europe',
  subjectTags: ['map projections', 'Mercator', 'cartography', 'area distortion', 'representation'],
  worldId: 'map-room',
  guideId: 'atlas',
  adventureType: 'guided_expedition',
  difficultyTier: 2,
  prerequisites: ['entry-polynesian-navigators'],
  unlocks: ['entry-prime-meridian'],
  funFact:
    'Africa is so large that you can fit the USA, China, India, Japan and most of Europe inside its borders with room remaining. Most adults in Europe and North America refuse to believe this until they see the overlay.',
  imagePrompt:
    'Map Room wall showing two projections side by side — Mercator stretched and Peters equal-area — Africa highlighted in golden light showing its true scale',
  status: 'published',
};

// ─── Entry 3: The Prime Meridian (Tier 2 — ages 7-8) ───────────────

export const ENTRY_PRIME_MERIDIAN: RealWorldEntry = {
  id: 'entry-prime-meridian',
  type: 'discovery',
  title: "An Imaginary Line That Runs the World",
  year: 1884,
  yearDisplay: '1884 CE',
  era: 'industrial',
  descriptionChild:
    "Someone had to decide where 'zero' was on the map going around the Earth. In 1884, the world agreed to put zero at a telescope in Greenwich, England — because Britain was powerful enough to make it stick. Imaginary lines drawn by agreement, quietly controlling how the whole world tells time.",
  descriptionOlder:
    "Before 1884, every country used its own prime meridian. France used Paris; the USA used Washington. Sandford Fleming pushed for a universal standard to make railways and international telegraphy consistent. Twenty-five nations voted. France abstained. Greenwich won by convenience and empire.",
  descriptionParent:
    "The International Meridian Conference (1884) established Greenwich, England as the global prime meridian, standardising longitude and time zones. Before this, dozens of national prime meridians existed, causing chaos for railway schedules and international telegraphy. Sandford Fleming advocated for universal standard time. The vote was 22–1 (France abstaining, later adopting Greenwich but calling it 'Paris Mean Time minus 9 minutes 21 seconds'). GPS satellites define a prime meridian approximately 102 metres east of the physical line at Greenwich. The story teaches children that even 'natural' standards are human decisions shaped by power and convenience.",
  realPeople: ['Sandford Fleming'],
  quote: "GPS and Greenwich don't quite agree. The physical line tells you where 1884 thought zero was.",
  quoteAttribution: 'Atlas, Guide of the Map Room',
  geographicLocation: { lat: 51.4769, lng: -0.0005, name: 'Royal Observatory, Greenwich, London' },
  continent: 'Europe',
  subjectTags: ['prime meridian', 'time zones', 'longitude', 'international standards', 'GPS'],
  worldId: 'map-room',
  guideId: 'atlas',
  adventureType: 'guided_expedition',
  difficultyTier: 2,
  prerequisites: ['entry-polynesian-navigators'],
  unlocks: ['entry-gps-democratisation'],
  funFact:
    "GPS satellites define a prime meridian about 102 metres east of the physical line at Greenwich. The modern 'zero' and the historic 'zero' are not quite the same place.",
  imagePrompt:
    'Child standing on a glowing meridian line at Greenwich, time zone bands radiating outward across a floor-map of the world, warm lamp light',
  status: 'published',
};

// ─── Entry 4: GPS and the Democratisation of Maps (Tier 3) ─────────

export const ENTRY_GPS_DEMOCRATISATION: RealWorldEntry = {
  id: 'entry-gps-democratisation',
  type: 'invention',
  title: "When Every Phone Became Better Than a Warship's Chart",
  year: 1978,
  yearDisplay: '1978 / 2005 CE',
  era: 'modern',
  descriptionChild:
    "For most of history, only wealthy governments and naval powers had accurate maps. GPS satellites and free digital maps changed everything — now anyone with a phone holds better navigation than a warship captain had 50 years ago. The most important geographic tool in human history was given away for free.",
  descriptionOlder:
    "The GPS satellite network was built by the US military. In 1983, after a civilian aircraft was shot down for crossing Soviet airspace due to navigation error, President Reagan ordered GPS opened to all civilian users. Democratising navigation has transformed logistics, emergency response, accessibility for blind and mobility-impaired users, and individual freedom of movement.",
  descriptionParent:
    "The Global Positioning System, developed by the US military beginning in 1978 (full operational capability 1995), was made available to all civilian users after Korean Air Lines Flight 007 was destroyed in 1983 for inadvertently crossing Soviet airspace. The subsequent civilian GPS revolution — amplified by Google Maps (2005) and smartphone adoption — democratised precision navigation, previously restricted to military and naval powers. GPS relies on Einstein's general relativity for timing corrections; without relativistic adjustments, positioning would drift by 11 km per day. The story teaches children about technology transfer from military to civilian use and universal access.",
  realPeople: ['Roger L. Easton', 'Ivan Getting'],
  quote: "The most important geographic tool in human history was given away for free.",
  quoteAttribution: 'Atlas, Guide of the Map Room',
  geographicLocation: null,
  continent: 'Global',
  subjectTags: ['GPS', 'satellite navigation', 'map democratisation', 'accessibility', 'relativity'],
  worldId: 'map-room',
  guideId: 'atlas',
  adventureType: 'field_trip',
  difficultyTier: 3,
  prerequisites: ['entry-mercator-projection', 'entry-prime-meridian'],
  unlocks: [],
  funFact:
    "Your phone's GPS relies on Einstein's general relativity. Satellites in weaker gravity run slightly fast relative to Earth clocks. Without a relativistic correction, GPS would drift by 11 km per day within weeks.",
  imagePrompt:
    'Constellation of GPS satellites orbiting above the Map Room, coordinate lines glowing on the floor, a phone showing precise location among ancient charts',
  status: 'published',
};

// ─── Collected Exports ──────────────────────────────────────────────

export const MAP_ROOM_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_POLYNESIAN_NAVIGATORS,
  ENTRY_MERCATOR_PROJECTION,
  ENTRY_PRIME_MERIDIAN,
  ENTRY_GPS_DEMOCRATISATION,
] as const;

export const MAP_ROOM_ENTRY_IDS: readonly string[] =
  MAP_ROOM_ENTRIES.map((e) => e.id);
