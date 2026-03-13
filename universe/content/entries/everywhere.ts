/**
 * Content Entries — Everywhere
 * World: Everywhere | Guide: Compass | Subject: Meta-Learning & Navigation
 *
 * Four published entries spanning the art and philosophy of finding your way:
 *   1. The Overview Effect — seeing Earth from space
 *   2. Wayfinding — Polynesian navigation and songlines
 *   3. Liminal Spaces — the threshold between
 *   4. Being Lost — disorientation as growth
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: The Overview Effect (Tier 1 — ages 5-6) ──────────────

export const ENTRY_OVERVIEW_EFFECT: RealWorldEntry = {
  id: 'entry-overview-effect',
  type: 'scientific_principle',
  title: 'What Astronauts See When They Look Back',
  year: 1987,
  yearDisplay: '1987 CE',
  era: 'contemporary',
  descriptionChild:
    "When astronauts look back at Earth from space, something amazing happens. They see no borders, no countries, no fences — just one beautiful blue marble. Many of them come home feeling different. They want to take better care of the planet and each other.",
  descriptionOlder:
    "Cognitive scientist Frank White named this the 'Overview Effect' in 1987. Apollo 14 astronaut Edgar Mitchell described it as 'an explosion of awareness.' Seeing Earth as a whole — fragile, borderless, and finite — shifts astronauts' perspectives on nationality, conflict, and environmental responsibility. Compass teaches that sometimes you have to go far away to see what's close up.",
  descriptionParent:
    "The Overview Effect is a documented cognitive shift reported by astronauts who view Earth from orbit or beyond. It consistently produces feelings of interconnectedness, reduced identification with national boundaries, and heightened environmental concern. Teaching children about this effect develops perspective-taking capacity and the understanding that physical viewpoint shapes worldview — a foundational concept for critical thinking across all disciplines.",
  realPeople: ['Frank White', 'Edgar Mitchell'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: null,
  continent: null,
  subjectTags: ['space', 'perspective', 'interconnection', 'environment', 'awareness'],
  worldId: 'everywhere',
  guideId: 'compass',
  adventureType: 'natural_exploration',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-wayfinding'],
  funFact:
    "Edgar Mitchell smuggled a camera to take photos of Earth from the Moon. NASA hadn't planned for astronauts to look back — only forward. The most iconic photo in history (Earthrise) exists because someone turned around. Compass says: 'The best discoveries happen when you look the wrong way.'",
  imagePrompt:
    "The Everywhere space: Earth seen from the Moon through a portal window, no borders visible, blue marble floating in darkness, Compass (a sentient wayfinding spirit) hovering beside children who are seeing Earth whole for the first time, profound quiet wonder, Studio Ghibli cosmic-perspective overview aesthetic",
  status: 'published',
};

// ─── Entry 2: Wayfinding (Tier 2 — ages 7-8) ───────────────────────

export const ENTRY_WAYFINDING: RealWorldEntry = {
  id: 'entry-wayfinding',
  type: 'cultural_milestone',
  title: 'Navigating by Stars, Waves, and Songs',
  year: null,
  yearDisplay: null,
  era: 'ancient',
  descriptionChild:
    "Long before GPS, Polynesian navigators sailed across the biggest ocean on Earth using only the stars, the waves, the clouds, and the flight patterns of birds. Aboriginal Australians navigated a continent using songlines — songs that described the landscape like a musical map.",
  descriptionOlder:
    "Polynesian wayfinding is among humanity's greatest navigational achievements. Using star compasses, ocean swells, cloud reflections off islands, and bird flight paths, navigators crossed thousands of miles of open Pacific. In 1976, the Hōkūleʻa sailed from Hawaii to Tahiti using only traditional methods, proving these techniques were not myth but science. Aboriginal Australian songlines encode geographic, ecological, and spiritual knowledge in oral songs that function as navigational databases spanning 60,000 years.",
  descriptionParent:
    "Polynesian and Aboriginal Australian navigation systems represent sophisticated spatial cognition that integrates astronomy, oceanography, ecology, and oral tradition into functional wayfinding technologies. These systems challenge Western assumptions about 'primitive' knowledge and demonstrate that Indigenous cultures developed complex scientific methodologies millennia before European contact. Teaching children about non-Western navigation develops cognitive flexibility and respect for diverse epistemologies.",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: -17.7334, lng: -149.5687, name: 'Tahiti, Pacific Ocean' },
  continent: 'Oceania',
  subjectTags: ['navigation', 'Polynesia', 'songlines', 'Indigenous knowledge', 'wayfinding'],
  worldId: 'everywhere',
  guideId: 'compass',
  adventureType: 'guided_expedition',
  difficultyTier: 2,
  prerequisites: ['entry-overview-effect'],
  unlocks: ['entry-liminal-spaces'],
  funFact:
    "The Hōkūleʻa navigator Mau Piailug could identify over 200 stars by name, read ocean swells like a book, and navigate without instruments in complete darkness. Compass calls this 'reading the world instead of a screen.'",
  imagePrompt:
    "The Everywhere ocean crossing: a Polynesian double-hulled voyaging canoe under a star-filled sky, star compass overlay showing navigation points, ocean swells rendered as readable text, Aboriginal songlines visible as glowing paths across a distant continent, Compass guiding children through the star map, Studio Ghibli oceanic-wisdom navigation aesthetic",
  status: 'published',
};

// ─── Entry 3: Liminal Spaces (Tier 2 — ages 7-8) ───────────────────

export const ENTRY_LIMINAL_SPACES: RealWorldEntry = {
  id: 'entry-liminal-spaces',
  type: 'scientific_principle',
  title: 'The Space Between Here and There',
  year: null,
  yearDisplay: null,
  era: 'modern',
  descriptionChild:
    "Have you ever stood in a doorway, not quite inside and not quite outside? That in-between feeling is called liminality. It happens when you're between one thing and the next — not a child but not yet a teenager, not asleep but not awake. These 'in-between' spaces are where the most interesting things happen.",
  descriptionOlder:
    "Anthropologist Victor Turner studied ritual transitions and identified 'liminal' phases — moments when people are between identities or states. The Japanese concept of ma (間) celebrates the space between things as meaningful in itself. Architects design transitional spaces (lobbies, corridors, thresholds) that prepare us psychologically for what comes next. Compass exists in liminality — the guide is always between worlds, never fixed in one.",
  descriptionParent:
    "Liminality (from Latin limen, 'threshold') is a concept from anthropology that describes transitional states between established positions. Victor Turner's work on rites of passage identified liminal phases as periods of creativity, communitas, and identity formation. The Japanese aesthetic concept of ma (間) extends liminality from anthropology to art and architecture. Teaching children to recognise and value in-between states develops comfort with ambiguity and cognitive flexibility — essential for navigating life transitions.",
  realPeople: ['Victor Turner'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: null,
  continent: null,
  subjectTags: ['liminality', 'transition', 'identity', 'ma', 'threshold'],
  worldId: 'everywhere',
  guideId: 'compass',
  adventureType: 'time_window',
  difficultyTier: 2,
  prerequisites: ['entry-wayfinding'],
  unlocks: ['entry-being-lost'],
  funFact:
    "The Japanese tea ceremony uses a small door (nijiriguchi) that forces everyone — even samurai — to bow and crawl to enter. The door is a liminal space: by the time you're through, you've left your rank and weapons behind. Compass says: 'Some doors change you just by making you duck.'",
  imagePrompt:
    "The Everywhere threshold corridor: a surreal doorway that is simultaneously inside and outside, dawn and dusk, the Japanese concept of ma rendered as visible pause-space between objects, Compass standing at the exact threshold with children on either side, neither-here-nor-there ethereal light, Studio Ghibli liminal-space dreamlike aesthetic",
  status: 'published',
};

// ─── Entry 4: Being Lost (Tier 3 — ages 9-10) ──────────────────────

export const ENTRY_BEING_LOST: RealWorldEntry = {
  id: 'entry-being-lost',
  type: 'scientific_principle',
  title: 'Why Getting Lost Is How You Find Things',
  year: null,
  yearDisplay: null,
  era: 'contemporary',
  descriptionChild:
    "Being lost feels scary. But writer Rebecca Solnit says that getting lost is how we find things we weren't looking for. When you don't know where you are, your brain wakes up — you notice more, question more, and discover things you never would have found on the planned route.",
  descriptionOlder:
    "Being lost activates the brain's orienting response — heightened attention, increased memory formation, and creative problem-solving. Rebecca Solnit's A Field Guide to Getting Lost argues that disorientation is a prerequisite for genuine discovery. Compass's origin story is rooted in this idea: the guide was 'born lost' and learned that not knowing where you are is the beginning of finding out. The entire Everywhere world is designed to reward exploration without predetermined paths.",
  descriptionParent:
    "The cognitive science of disorientation shows that spatial uncertainty activates neural pathways associated with learning, memory consolidation, and creative thinking. Solnit's philosophical framework reframes 'being lost' from a problem to be solved into a productive state of openness. Teaching children that uncertainty and disorientation are normal — even valuable — stages of learning builds resilience and reduces anxiety around not-knowing, which is the foundation of all genuine inquiry.",
  realPeople: ['Rebecca Solnit'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: null,
  continent: null,
  subjectTags: ['disorientation', 'discovery', 'exploration', 'uncertainty', 'resilience'],
  worldId: 'everywhere',
  guideId: 'compass',
  adventureType: 'natural_exploration',
  difficultyTier: 3,
  prerequisites: ['entry-liminal-spaces'],
  unlocks: [],
  funFact:
    "Compass's favourite saying: 'I have never been lost. I've been disoriented for interesting reasons.' The guide refuses to give directions — instead offering better questions. 'Where do you want to go?' always gets answered with 'Where do you think you need to be?'",
  imagePrompt:
    "The Everywhere unmapped zone: a landscape that shifts between forest desert ocean and city in the same frame, no paths visible, Compass dissolving into multiple transparent forms pointing in every direction simultaneously, children standing at the centre of infinite possibility looking not scared but curious, Studio Ghibli radiant-uncertainty exploration aesthetic",
  status: 'published',
};

// ─── Export ────────────────────────────────────────────────────────

export const EVERYWHERE_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_OVERVIEW_EFFECT,
  ENTRY_WAYFINDING,
  ENTRY_LIMINAL_SPACES,
  ENTRY_BEING_LOST,
];

export const EVERYWHERE_ENTRY_IDS =
  EVERYWHERE_ENTRIES.map((e) => e.id);
