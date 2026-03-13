/**
 * Content Entries — Tideline Bay
 * World: Tideline Bay | Guide: Suki Tanaka-Reyes | Subject: Ocean Science / Biology
 *
 * Four published entries spanning ocean science discoveries:
 *   1. The Discovery of Giant Squid — the deep ocean reveals its secrets
 *   2. The Migration of Humpback Whales — culture in the sea
 *   3. Coral Spawning — synchronization without a brain
 *   4. The Coelacanth — a living fossil challenges what "extinct" means
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Giant Squid Discovery (Tier 1 — ages 5-6) ────────────

export const ENTRY_GIANT_SQUID_DISCOVERY: RealWorldEntry = {
  id: 'entry-giant-squid-discovery',
  type: 'discovery',
  title: 'The Day the Sea Monster Was Real',
  year: 2004,
  yearDisplay: '2004 CE',
  era: 'contemporary',
  descriptionChild:
    "People told stories about sea monsters for thousands of years. Giant tentacles grabbing ships! But nobody had ever seen one alive in the deep ocean. Then in 2004, a scientist named Tsunemi Kubodera lowered a camera into the dark water near Japan — and photographed a real giant squid. The legends were true.",
  descriptionOlder:
    "Kubodera lowered a camera on a long line with bait attached to it, 900 meters below the surface of the Pacific Ocean near the Ogasawara Islands. The giant squid attacked the bait, and the camera captured over 500 photographs. The animal was 8 meters long and fought for four hours before breaking free, leaving a severed tentacle behind. It was the first time a living giant squid had ever been documented in its natural habitat.",
  descriptionParent:
    "The 2004 giant squid photographs represent a landmark in marine biology — centuries of sailor mythology resolved by patient deep-sea observation. Kubodera's method (automated camera rigs at depth with bioluminescent lures) has since become standard for studying deep-ocean megafauna. The story demonstrates that the ocean remains the least-explored environment on Earth, and that folklore sometimes preserves genuine zoological observations long before science catches up.",
  realPeople: ['Tsunemi Kubodera'],
  quote: 'The deep ocean is the last great frontier of discovery on this planet.',
  quoteAttribution: 'Tsunemi Kubodera',
  geographicLocation: { lat: 27.0936, lng: 142.1924, name: 'Ogasawara Islands, Pacific Ocean, Japan' },
  continent: 'Asia',
  subjectTags: ['giant squid', 'deep ocean', 'marine biology', 'discovery', 'cephalopods'],
  worldId: 'tideline-bay',
  guideId: 'suki-tanaka-reyes',
  adventureType: 'guided_expedition',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-humpback-whale-migration'],
  funFact:
    'Giant squid have the largest eyes in the animal kingdom — the size of dinner plates. They need those enormous eyes to detect the faintest bioluminescent flashes in the pitch-black deep ocean.',
  imagePrompt:
    "Deep Pacific Ocean near Japan, 900 meters below the surface, an automated camera rig suspended on a long line with bioluminescent bait glowing blue-green, a massive giant squid (8 meters) emerging from the darkness with tentacles reaching toward the bait, its dinner-plate-sized eye catching the camera light, tiny particles of marine snow drifting through the water, the darkness beyond is absolute, Studio Ghibli underwater realism with NatGeo scientific precision, sense of awe and discovery",
  status: 'published',
};

// ─── Entry 2: Humpback Whale Migration (Tier 2 — ages 7-8) ─────────

export const ENTRY_HUMPBACK_WHALE_MIGRATION: RealWorldEntry = {
  id: 'entry-humpback-whale-migration',
  type: 'natural_wonder',
  title: 'The Longest Song on Earth',
  year: null,
  yearDisplay: 'Ongoing',
  era: 'contemporary',
  descriptionChild:
    "Humpback whales travel 16,000 kilometers every year — from cold feeding waters near the poles to warm breeding waters near the equator. And they sing! Their songs travel hundreds of kilometers through the ocean. Each group has its own special song, and the songs change every single year.",
  descriptionOlder:
    "Each humpback whale population has its own unique song, and those songs evolve over time. Young whales learn songs from adults — this is cultural transmission, not instinct. When researchers from different oceans compared recordings, they found that songs spread between populations like trends spread between human cultures. A song that starts in Australia can appear in French Polynesia within two years. This isn't genetics. This is whale culture.",
  descriptionParent:
    "Humpback whale migration and song represent one of the strongest cases for non-human culture in the animal kingdom. The songs are not genetically encoded — they are learned, modified, and transmitted socially, fitting the anthropological definition of culture. The migration itself (up to 16,000 km round trip) is one of the longest of any mammal. Children engaging with this entry explore the idea that culture, learning, and communication are not uniquely human — and that the ocean carries information across vast distances.",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: null,
  continent: null,
  subjectTags: ['whale migration', 'humpback whales', 'animal culture', 'ocean acoustics', 'marine mammals'],
  worldId: 'tideline-bay',
  guideId: 'suki-tanaka-reyes',
  adventureType: 'natural_exploration',
  difficultyTier: 2,
  prerequisites: ['entry-giant-squid-discovery'],
  unlocks: ['entry-coral-spawning'],
  funFact:
    'Humpback whale songs can last up to 24 hours. Only male whales sing, and each year the song evolves — old phrases are dropped and new ones appear, like a remix that never stops changing.',
  imagePrompt:
    "Vast open ocean at sunrise, a humpback whale breaching spectacularly against golden light, water cascading from its body in crystalline sheets, below the surface a translucent view showing another whale singing with visible sound-wave ripples radiating outward through blue-green water, a migration route traced as a faint glowing line curving from polar ice to tropical reef, sense of epic scale and ancient rhythm, Studio Ghibli painterly ocean realism",
  status: 'published',
};

// ─── Entry 3: Coral Spawning (Tier 2 — ages 7-8) ───────────────────

export const ENTRY_CORAL_SPAWNING: RealWorldEntry = {
  id: 'entry-coral-spawning',
  type: 'natural_wonder',
  title: 'The Night the Ocean Snowed Upward',
  year: null,
  yearDisplay: 'Annual Event',
  era: 'contemporary',
  descriptionChild:
    "Once a year, on the same night, all the coral on a reef releases tiny eggs at exactly the same time. Millions of little pink and orange packets float upward through the water like underwater snow falling toward the sky. It is one of the most beautiful things that happens on Earth — and it all starts under a full moon.",
  descriptionOlder:
    "Coral spawning is synchronized by three environmental signals: the full moon, water temperature reaching a threshold, and the change in day length. On a single night, billions of coral polyps across an entire reef release bundles of eggs and sperm simultaneously. This mass synchronization increases the chances of fertilization and overwhelms predators. The remarkable thing is that coral have no brain, no nervous system, and no way to 'communicate' — yet they coordinate at a scale that would challenge any human organization.",
  descriptionParent:
    "Mass coral spawning events demonstrate emergent coordination — complex group behavior arising from simple individual responses to environmental cues, without any central control. Each polyp responds independently to the same triggers (lunar cycle, temperature, photoperiod), and the result is a reef-wide synchronized event. This is a powerful teaching example for systems thinking: how order can emerge without a leader. The Great Barrier Reef's annual spawning was first documented scientifically in 1984 and remains one of the most visually spectacular biological events on the planet.",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: -18.2871, lng: 147.6992, name: 'Great Barrier Reef, Australia' },
  continent: 'Oceania',
  subjectTags: ['coral spawning', 'reef ecology', 'synchronization', 'emergent behavior', 'marine reproduction'],
  worldId: 'tideline-bay',
  guideId: 'suki-tanaka-reyes',
  adventureType: 'time_window',
  difficultyTier: 2,
  prerequisites: ['entry-humpback-whale-migration'],
  unlocks: ['entry-coelacanth-living-fossil'],
  funFact:
    "The Great Barrier Reef's annual spawning event is so massive it is visible from space. Satellites can detect the change in water color as billions of egg-sperm bundles rise to the surface across 2,300 kilometers of reef.",
  imagePrompt:
    "Underwater view of the Great Barrier Reef at night during mass coral spawning, millions of tiny pink and orange bundles rising upward through clear dark water like inverse snow, colorful coral formations below glowing faintly with bioluminescence, the full moon visible as a wavering circle of white light through the water surface above, small reef fish watching in apparent amazement, Studio Ghibli magical realism with scientific accuracy, atmosphere of sacred natural wonder",
  status: 'published',
};

// ─── Entry 4: The Coelacanth (Tier 3 — ages 9-10) ──────────────────

export const ENTRY_COELACANTH_LIVING_FOSSIL: RealWorldEntry = {
  id: 'entry-coelacanth-living-fossil',
  type: 'discovery',
  title: 'The Fish That Came Back from Extinction',
  year: 1938,
  yearDisplay: '1938 CE',
  era: 'modern',
  descriptionChild:
    "Everyone thought the coelacanth fish went extinct with the dinosaurs — 66 million years ago. Then in 1938, a museum curator named Marjorie Courtenay-Latimer found one in a fisherman's catch in South Africa. It was alive! A fish that scientists said had been gone for millions of years was swimming in the ocean the whole time.",
  descriptionOlder:
    "Marjorie Courtenay-Latimer was a 32-year-old museum curator with no formal ichthyology training. She visited the local fishing docks regularly to find specimens. On December 22, 1938, she noticed a large blue-scaled fish in a trawler's catch that she recognized from a drawing in a book — it matched fossils from the Devonian period, 400 million years ago. She contacted ichthyologist J.L.B. Smith, who confirmed: it was a coelacanth, a fish believed extinct since the Cretaceous. The coelacanth has lobed fins that move like legs — it may represent the evolutionary transition from sea to land.",
  descriptionParent:
    "The coelacanth discovery (1938) fundamentally challenged paleontological assumptions about extinction. It demonstrated that the fossil record is incomplete — absence of evidence is not evidence of absence. The coelacanth's lobed pectoral fins, which articulate on a bony stalk and move in an alternating pattern resembling walking, make it a living example of the fin-to-limb transition central to vertebrate evolution. Courtenay-Latimer's story is also one of scientific contribution from non-specialists — her observational skills and intellectual courage changed a field she wasn't formally trained in.",
  realPeople: ['Marjorie Courtenay-Latimer', 'J.L.B. Smith'],
  quote: "I picked away the slime to reveal the most beautiful fish I had ever seen.",
  quoteAttribution: 'Marjorie Courtenay-Latimer, 1938',
  geographicLocation: { lat: -33.0292, lng: 27.8546, name: 'East London, South Africa' },
  continent: 'Africa',
  subjectTags: ['coelacanth', 'living fossil', 'extinction', 'evolution', 'paleontology', 'marine biology'],
  worldId: 'tideline-bay',
  guideId: 'suki-tanaka-reyes',
  adventureType: 'guided_expedition',
  difficultyTier: 3,
  prerequisites: ['entry-coral-spawning'],
  unlocks: [],
  funFact:
    "Courtenay-Latimer was 32 years old and had no formal ichthyology training. She recognized the coelacanth's importance from a drawing in a book. Sometimes the most important scientific discoveries are made by people who simply pay attention.",
  imagePrompt:
    "South African fishing docks 1938, a young woman museum curator in period dress kneeling beside a large iridescent blue-scaled coelacanth fish on the wooden dock, its distinctive lobed fins visible like primitive legs, fishermen standing behind looking puzzled, her expression one of astonished recognition, a worn reference book open beside her showing a fossil illustration that matches the living fish, harbor and trawler boats in background, warm December summer light, Studio Ghibli painterly realism with NatGeo documentary quality",
  status: 'published',
};

// ─── Export ────────────────────────────────────────────────────────

export const TIDELINE_BAY_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_GIANT_SQUID_DISCOVERY,
  ENTRY_HUMPBACK_WHALE_MIGRATION,
  ENTRY_CORAL_SPAWNING,
  ENTRY_COELACANTH_LIVING_FOSSIL,
];

export const TIDELINE_BAY_ENTRY_IDS = TIDELINE_BAY_ENTRIES.map((e) => e.id);
