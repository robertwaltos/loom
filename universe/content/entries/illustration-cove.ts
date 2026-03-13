/**
 * Content Entries — Illustration Cove
 * World: Illustration Cove | Guide: Inès Moreau | Subject: Visual Literacy
 *
 * Four published entries spanning the history of visual storytelling:
 *   1. Lascaux Cave Paintings — humanity's first illustrations
 *   2. The Bayeux Tapestry — a 70-metre comic strip
 *   3. Hokusai — Great Wave and the power of one image
 *   4. Beatrix Potter — science turned into picture books
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Lascaux Cave Paintings (Tier 1) ──────────────────────

export const ENTRY_LASCAUX_CAVE_PAINTINGS: RealWorldEntry = {
  id: 'entry-lascaux-cave-paintings',
  type: 'artifact',
  title: "The First Pictures Humans Ever Made",
  year: -17000,
  yearDisplay: '~17,000 BCE',
  era: 'ancient',
  descriptionChild:
    "Deep inside a cave in France, ancient humans painted horses, bulls, deer, and mysterious dots on the walls — 17,000 years ago. They used torches to see in the dark and blew pigment through hollow bones like spray cans. These are the oldest known paintings by humans.",
  descriptionOlder:
    "The Lascaux cave paintings (~17,000 BCE) are the most vivid surviving examples of Paleolithic art. Over 600 paintings and 1,500 engravings depict animals in motion — running horses, swimming deer, charging bulls. The artists used perspective, shading, and animation-like sequences (showing multiple leg positions) 17,000 years before these techniques were \"invented\" by the Renaissance. The cave was discovered in 1940 by four teenagers and their dog, Robot.",
  descriptionParent:
    "The Lascaux cave complex (~17,000 BCE), discovered in 1940 in the Dordogne region by four teenagers, contains over 600 painted figures and 1,500 engravings. Analysis reveals sophisticated artistic techniques including polychrome layering, deliberate use of rock contours for three-dimensional effect, and sequential positioning of limbs suggesting proto-animation. Mineral pigment analysis (iron oxides, manganese dioxide) and blown-pigment techniques show systematic preparation. The abstract geometric patterns (dots, grids, lines) alongside figurative representations suggest a complex symbolic system. The original cave was closed to visitors in 1963 due to CO₂ damage; Lascaux IV, a full replica, opened in 2016. The site teaches children that the impulse to illustrate is as old as humanity itself.",
  realPeople: [],
  quote: "The impulse to illustrate is as old as humanity itself.",
  quoteAttribution: 'Inès Moreau, Guide of Illustration Cove',
  geographicLocation: { lat: 45.0544, lng: 1.1694, name: 'Lascaux, Dordogne, France' },
  continent: 'Europe',
  subjectTags: ['Lascaux', 'cave paintings', 'Paleolithic art', 'illustration', 'prehistory'],
  worldId: 'illustration-cove',
  guideId: 'ines-moreau',
  adventureType: 'natural_exploration',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-bayeux-tapestry'],
  funFact:
    "The cave was discovered by four teenagers and their dog, Robot, in September 1940. The original cave had to be closed in 1963 because visitors' breath was damaging the paintings. A full-scale replica (Lascaux IV) opened in 2016.",
  imagePrompt:
    'Sea cave in Illustration Cove with ancient paintings on walls, children with torches discovering running horses and bulls, warm amber torchlight on mineral pigments',
  status: 'published',
};

// ─── Entry 2: The Bayeux Tapestry (Tier 2) ──────────────────────────

export const ENTRY_BAYEUX_TAPESTRY: RealWorldEntry = {
  id: 'entry-bayeux-tapestry',
  type: 'artifact',
  title: "The Seventy-Metre Comic Strip",
  year: 1077,
  yearDisplay: '~1077 CE',
  era: 'medieval',
  descriptionChild:
    "Imagine a comic strip that's 70 metres long — taller than most buildings if you stood it up. The Bayeux Tapestry tells the story of the Norman invasion of England in 1066 using pictures sewn into cloth. It has warriors, ships, horses, meals, and even Halley's Comet.",
  descriptionOlder:
    "The Bayeux Tapestry (~1077 CE) is a 70-metre embroidered narrative depicting the Norman Conquest in 58 sequential scenes — making it, essentially, the world's oldest comic strip. Created using wool thread on linen, it includes over 600 people, 200 horses, 40 ships, and detailed depictions of meals, buildings, and Halley's Comet. Like a modern comic, it uses Latin text captions. The tapestry's viewpoint is fascinating: though commissioned by the Norman victors, it shows the English in a notably sympathetic light.",
  descriptionParent:
    "The Bayeux Tapestry (~1077 CE) is a 68.38-metre embroidered narrative, likely commissioned by Bishop Odo of Bayeux (William the Conqueror's half-brother) and created in Canterbury, England. Its 58 scenes constitute the most complete visual record of the Norman Conquest, functioning as sequential narrative identical in structure to modern comics: establishing shots, close-ups, continuous action, and Latin text captions (tituli). The depiction of Halley's Comet is the earliest known European observation record (actually appearing in 1066). Interestingly, the English are portrayed sympathetically by a work commissioned by the victors. The tapestry teaches children how sequential visual storytelling predates the printed page by nearly a millennium.",
  realPeople: ['William the Conqueror', 'Harold Godwinson', 'Bishop Odo'],
  quote: "Sequential visual storytelling predates the printed page by nearly a millennium.",
  quoteAttribution: 'Inès Moreau, Guide of Illustration Cove',
  geographicLocation: { lat: 49.2764, lng: -0.7024, name: 'Bayeux, Normandy, France' },
  continent: 'Europe',
  subjectTags: ['Bayeux Tapestry', 'Norman Conquest', 'embroidery', 'visual narrative', 'comics'],
  worldId: 'illustration-cove',
  guideId: 'ines-moreau',
  adventureType: 'artifact_hunt',
  difficultyTier: 2,
  prerequisites: ['entry-lascaux-cave-paintings'],
  unlocks: ['entry-beatrix-potter'],
  funFact:
    "The tapestry shows Halley's Comet in the sky — the earliest known European record of the comet. It also shows King Harold being hit in the eye with an arrow, though historians now debate whether that figure is actually Harold.",
  imagePrompt:
    'Illustration Cove tidal cave with a 70-metre tapestry unfurling along the wall, Norman ships and warriors in embroidered scenes, children tracing the panels, soft coastal light',
  status: 'published',
};

// ─── Entry 3: Hokusai — The Great Wave (Tier 2) ────────────────────

export const ENTRY_HOKUSAI_GREAT_WAVE: RealWorldEntry = {
  id: 'entry-hokusai-great-wave',
  type: 'person',
  title: "One Wave That Changed Art Forever",
  year: 1831,
  yearDisplay: '~1831 CE',
  era: 'industrial',
  descriptionChild:
    "Hokusai was a Japanese artist who made an image of a massive wave with Mount Fuji small in the background. It became the most recognised piece of art in the world. He drew it when he was about 70 years old, after a lifetime of practice.",
  descriptionOlder:
    "The Great Wave off Kanagawa (~1831) is a ukiyo-e woodblock print from Hokusai's series Thirty-Six Views of Mount Fuji. The composition is revolutionary: the human drama (fishing boats in the trough) is dwarfed by the natural force of the wave, with sacred Mount Fuji reduced to a small triangle in the background. Hokusai used Prussian blue pigment, newly imported from Europe, creating a striking contrast. The image influenced Impressionism, Art Nouveau, and is now the most reproduced artwork in human history.",
  descriptionParent:
    "Katsushika Hokusai's The Great Wave off Kanagawa (~1831) is arguably the single most recognised image in art history. Part of the woodblock print series Thirty-Six Views of Mount Fuji, it combines Japanese ukiyo-e technique with newly available Prussian blue pigment from Europe. The radical composition — nature overwhelming human activity, with sacred Mount Fuji a distant triangle — influenced Van Gogh, Monet, and Debussy. Hokusai created it at approximately age 70, aligning with his famous statement: \"If only Heaven will give me just another ten years... just another five more years, then I could become a real painter.\" The print demonstrates that visual literacy includes understanding composition, colour, and the relationship between scale and meaning.",
  realPeople: ['Katsushika Hokusai'],
  quote: "If only Heaven will give me just another ten years... just another five more years, then I could become a real painter.",
  quoteAttribution: 'Katsushika Hokusai, near the end of his life',
  geographicLocation: { lat: 35.3600, lng: 138.7274, name: 'Mount Fuji, Japan' },
  continent: 'Asia',
  subjectTags: ['Hokusai', 'Great Wave', 'ukiyo-e', 'Japanese art', 'composition'],
  worldId: 'illustration-cove',
  guideId: 'ines-moreau',
  adventureType: 'guided_expedition',
  difficultyTier: 2,
  prerequisites: ['entry-lascaux-cave-paintings'],
  unlocks: ['entry-beatrix-potter'],
  funFact:
    "Hokusai changed his name about 30 times during his life and used more than 200 pseudonyms. He created the Great Wave when he was around 70 years old. He once said he hoped to become 'a real painter' if he could just live a few more years.",
  imagePrompt:
    'Cove rock face with Great Wave composition carved by the sea, Hokusai-style wave crashing into the cove, children studying the woodblock print process, blue and white tonal palette',
  status: 'published',
};

// ─── Entry 4: Beatrix Potter (Tier 3) ───────────────────────────────

export const ENTRY_BEATRIX_POTTER: RealWorldEntry = {
  id: 'entry-beatrix-potter',
  type: 'person',
  title: "The Scientist Who Drew Peter Rabbit",
  year: 1893,
  yearDisplay: '1893–1943 CE',
  era: 'industrial',
  descriptionChild:
    "Before Beatrix Potter wrote about Peter Rabbit, she was a serious scientist who drew mushrooms in such exact detail that her studies are still used today. The scientific world didn't take her seriously because she was a woman, so she turned her precise drawing skills into the most famous picture books ever made.",
  descriptionOlder:
    "Beatrix Potter was a mycologist (mushroom scientist) whose paper on spore germination was presented to the Linnean Society in 1897 — by a man, since women weren't allowed to attend. When the scientific establishment rejected her, she redirected her extraordinary botanical illustration skills into children's publishing. The Tale of Peter Rabbit (1902), originally self-published after multiple rejections, sold 45 million copies. Her scientific precision is visible in every illustration: the anatomy of rabbits, the textures of fur, the accuracy of the Lake District landscapes.",
  descriptionParent:
    "Beatrix Potter's career arc — from rejected mycologist to the most commercially successful children's illustrator in history — illustrates the intersection of scientific observation and artistic expression. Her mycological illustrations (1890s) were of publishable scientific quality; her paper on spore germination, presented at the Linnean Society in 1897 by a proxy (women could not attend), was only formally acknowledged by the Society in 1997. Potter self-published The Tale of Peter Rabbit (1902) after six publisher rejections; it has since sold over 45 million copies in 35 languages. Her illustration style — precise anatomical observation rendered in atmospheric watercolour — demonstrates that scientific accuracy and artistic warmth are complementary rather than contradictory qualities.",
  realPeople: ['Beatrix Potter'],
  quote: "Scientific accuracy and artistic warmth are complementary rather than contradictory qualities.",
  quoteAttribution: 'Inès Moreau, Guide of Illustration Cove',
  geographicLocation: { lat: 54.3764, lng: -2.9622, name: 'Lake District, England' },
  continent: 'Europe',
  subjectTags: ['Beatrix Potter', 'illustration', 'Peter Rabbit', 'mycology', 'picture books'],
  worldId: 'illustration-cove',
  guideId: 'ines-moreau',
  adventureType: 'field_trip',
  difficultyTier: 3,
  prerequisites: ['entry-bayeux-tapestry', 'entry-hokusai-great-wave'],
  unlocks: [],
  funFact:
    "The Linnean Society didn't formally acknowledge Potter's mycological work until 1997 — exactly 100 years after it was first presented. Her mushroom illustrations are still referenced by scientists today. She also bought and preserved over 4,000 acres of the Lake District.",
  imagePrompt:
    'Illustrated tidal pool in the Cove with Potter-style watercolour animals emerging from shells, botanical sketches on cave walls alongside Peter Rabbit illustrations, warm English countryside light',
  status: 'published',
};

// ─── Collected Exports ──────────────────────────────────────────────

export const ILLUSTRATION_COVE_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_LASCAUX_CAVE_PAINTINGS,
  ENTRY_BAYEUX_TAPESTRY,
  ENTRY_HOKUSAI_GREAT_WAVE,
  ENTRY_BEATRIX_POTTER,
] as const;

export const ILLUSTRATION_COVE_ENTRY_IDS: readonly string[] =
  ILLUSTRATION_COVE_ENTRIES.map((e) => e.id);
