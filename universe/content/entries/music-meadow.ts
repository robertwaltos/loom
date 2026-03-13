/**
 * Content Entries — Music Meadow
 * World: Music Meadow | Guide: Luna Esperanza | Subject: Music & Sound
 *
 * Four published entries spanning the science and culture of music:
 *   1. The Physics of Sound — how air wiggles
 *   2. Musical Notation — Guido d'Arezzo and do-re-mi
 *   3. Beethoven's Deafness — composing by vibration
 *   4. The Blues and American Music — three chords that changed everything
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: The Physics of Sound (Tier 1 — ages 5-6) ─────────────

export const ENTRY_PHYSICS_OF_SOUND: RealWorldEntry = {
  id: 'entry-physics-of-sound',
  type: 'scientific_principle',
  title: 'How Air Turns Into Music',
  year: null,
  yearDisplay: null,
  era: 'ancient',
  descriptionChild:
    "Sound is just air wiggling. When you pluck a guitar string, it shakes the air next to it, which shakes the air next to that, all the way to your ear. Your eardrum wiggles too — and your brain turns those wiggles into music.",
  descriptionOlder:
    "Sound waves are longitudinal pressure waves — compressions and rarefactions of air molecules. A guitar string vibrating at 440 Hz (vibrations per second) produces the note A. Harmonics — the overtones above the fundamental frequency — are what make a piano's A sound different from a trumpet's A. Whale songs travel thousands of kilometres through ocean water because sound moves faster in denser media.",
  descriptionParent:
    "The physics of sound connects mathematics (frequency ratios), biology (auditory perception), and culture (which frequency ratios different civilisations consider 'pleasant'). Understanding that music is structured vibration grounds musical appreciation in scientific literacy while maintaining the wonder of artistic expression. Luna uses the Meadow to show that physics and beauty are the same conversation.",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: null,
  continent: null,
  subjectTags: ['sound', 'physics', 'waves', 'frequency', 'vibration'],
  worldId: 'music-meadow',
  guideId: 'luna-esperanza',
  adventureType: 'natural_exploration',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-musical-notation'],
  funFact:
    "A cricket's chirp rate correlates with temperature — count chirps in 14 seconds and add 40 to get the temperature in Fahrenheit. Luna calls crickets 'the Meadow's thermometers.' Sound is everywhere, measuring everything.",
  imagePrompt:
    "A Music Meadow sound-wave garden: visible sound waves rippling through the air from a guitar string, flowers vibrating at different frequencies with colour-coded petals, Luna Esperanza showing children the wave patterns, whale song pulses visible in a pond, Studio Ghibli physics-made-visible wonder aesthetic",
  status: 'published',
};

// ─── Entry 2: Musical Notation (Tier 2 — ages 7-8) ─────────────────

export const ENTRY_MUSICAL_NOTATION: RealWorldEntry = {
  id: 'entry-musical-notation',
  type: 'invention',
  title: "Do-Re-Mi and the Monk Who Wrote Music Down",
  year: 1000,
  yearDisplay: '~1000 CE',
  era: 'medieval',
  descriptionChild:
    "Before Guido d'Arezzo, music lived only in people's memories. If you wanted to learn a song, someone had to sing it to you. Then an Italian monk figured out how to write music on lines and spaces — and suddenly, music could travel anywhere.",
  descriptionOlder:
    "Guido d'Arezzo created the staff — the five horizontal lines music is written on — and the solfège system (do-re-mi) around 1000 CE. Before this, music was transmitted orally; a new song could take years to spread across Europe. After notation, it could be copied and sent instantly. Musical notation was the internet of its era, enabling music to be shared without the physical presence of a musician.",
  descriptionParent:
    "Guido d'Arezzo's innovations are arguably among the most significant inventions in Western cultural history. Staff notation enabled the development of polyphony, orchestral composition, and the entire tradition of composed (as opposed to improvised) music. Teaching children about musical notation connects literacy (reading systems), mathematics (proportional note values), and the democratisation of knowledge through recording technology.",
  realPeople: ['Guido d\'Arezzo'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 43.4631, lng: 11.8788, name: 'Arezzo, Tuscany, Italy' },
  continent: 'Europe',
  subjectTags: ['notation', 'music theory', 'literacy', 'invention', 'solfège'],
  worldId: 'music-meadow',
  guideId: 'luna-esperanza',
  adventureType: 'artifact_hunt',
  difficultyTier: 2,
  prerequisites: ['entry-physics-of-sound'],
  unlocks: ['entry-beethovens-deafness'],
  funFact:
    "The syllables do-re-mi come from a Latin hymn to Saint John the Baptist. Each line of the hymn started one note higher than the last, giving Guido a ready-made naming system. Luna sings the hymn in the Meadow — the oldest ear-worm in history.",
  imagePrompt:
    "A Music Meadow medieval scriptorium glade: a Benedictine monk writing musical notation on illuminated parchment, the staff lines growing from five tree branches, do-re-mi syllables floating as glowing notes, Luna Esperanza teaching the solfège system, Studio Ghibli medieval-meets-nature musical aesthetic",
  status: 'published',
};

// ─── Entry 3: Beethoven's Deafness (Tier 2 — ages 7-8) ─────────────

export const ENTRY_BEETHOVENS_DEAFNESS: RealWorldEntry = {
  id: 'entry-beethovens-deafness',
  type: 'person',
  title: 'The Composer Who Could Not Hear',
  year: 1801,
  yearDisplay: '1801 CE',
  era: 'industrial',
  descriptionChild:
    "Ludwig van Beethoven started going deaf when he was about 30. Instead of stopping, he sawed the legs off his piano, put it on the floor, and lay down to feel the vibrations through the floorboards. He wrote some of the greatest music ever — including his Ninth Symphony — almost completely deaf.",
  descriptionOlder:
    "Beethoven first noticed hearing loss around 1798. By 1814, he was nearly totally deaf. He used 'conversation books' where visitors wrote questions and he spoke replies. His late works — the Ninth Symphony, the late string quartets — are considered among the greatest achievements in Western music. He composed by understanding sound as structure, not sensation. Luna teaches that music exists in the mind, not just the ears.",
  descriptionParent:
    "Beethoven's continued composition despite profound deafness demonstrates that musical understanding is fundamentally cognitive, not merely auditory. His late works show increasing structural sophistication and emotional depth, suggesting that the removal of external sound intensified internal musical thinking. Teaching children about Beethoven's deafness challenges assumptions about disability and creativity while illustrating the primacy of mental representation over sensory input.",
  realPeople: ['Ludwig van Beethoven'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 48.2082, lng: 16.3738, name: 'Vienna, Austria' },
  continent: 'Europe',
  subjectTags: ['deafness', 'determination', 'composition', 'disability', 'genius'],
  worldId: 'music-meadow',
  guideId: 'luna-esperanza',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-musical-notation'],
  unlocks: ['entry-the-blues'],
  funFact:
    "At the premiere of his Ninth Symphony, Beethoven was conducting but couldn't hear the orchestra. When the music ended, a singer had to turn him around to see the audience — they were giving him a standing ovation so loud the police thought it was a political demonstration. Luna keeps a vibration station where children feel music rather than hear it.",
  imagePrompt:
    "A Music Meadow vibration chamber: Beethoven lying on the floor beside his legless piano, fingers on the floorboards feeling the music, sound waves visible as colour rippling through the wood, the Ninth Symphony score floating above him, Luna Esperanza offering vibration mallets to children, Studio Ghibli transcendent-through-adversity aesthetic",
  status: 'published',
};

// ─── Entry 4: The Blues (Tier 3 — ages 9-10) ────────────────────────

export const ENTRY_THE_BLUES: RealWorldEntry = {
  id: 'entry-the-blues',
  type: 'cultural_milestone',
  title: 'Three Chords That Changed Everything',
  year: 1870,
  yearDisplay: '~1870s–present',
  era: 'modern',
  descriptionChild:
    "The blues started with people who had very hard lives — mostly African Americans in the southern United States after slavery ended. They sang about sadness, hope, and the truth of their lives. From the blues came jazz, rock and roll, hip hop, and almost every kind of popular music today.",
  descriptionOlder:
    "The blues emerged from spirituals, work songs, field hollers, and chants of African Americans in the Mississippi Delta in the late 19th century. Blue notes — notes sung or played between standard pitches — give the blues its distinctive emotional quality. Robert Johnson, who recorded only 29 songs before dying at 27, influenced virtually every genre that followed. The I-IV-V chord progression became the backbone of rock and roll, R&B, and pop.",
  descriptionParent:
    "The blues is a foundational American art form whose influence extends across virtually all popular music worldwide. Its origins in the African American experience of slavery, sharecropping, and migration make it both an artistic achievement and a primary source for understanding American social history. Teaching children about the blues develops understanding of how art emerges from lived experience, how cultural forms cross racial and national boundaries, and how 12 bars can contain the full range of human emotion.",
  realPeople: ['Robert Johnson'],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 33.5226, lng: -90.1784, name: 'Mississippi Delta, USA' },
  continent: 'North America',
  subjectTags: ['blues', 'music history', 'African American culture', 'genre origins', 'expression'],
  worldId: 'music-meadow',
  guideId: 'luna-esperanza',
  adventureType: 'field_trip',
  difficultyTier: 3,
  prerequisites: ['entry-beethovens-deafness'],
  unlocks: [],
  funFact:
    "Robert Johnson allegedly 'sold his soul to the devil at a crossroads' to learn guitar. The real story is that he practised obsessively for months in isolation. Luna says: 'The crossroads legend is more fun, but the truth is more inspiring — talent comes from work, not magic.'",
  imagePrompt:
    "A Music Meadow blues stage: a dusty crossroads at twilight with a guitarist playing on an old wooden porch, blue notes rendered as indigo fireflies hovering between standard musical pitches, a family tree diagram showing how the blues branched into jazz rock hip-hop, Luna Esperanza strumming alongside children, Studio Ghibli American roots-music emotional warmth aesthetic",
  status: 'published',
};

// ─── Export ────────────────────────────────────────────────────────

export const MUSIC_MEADOW_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_PHYSICS_OF_SOUND,
  ENTRY_MUSICAL_NOTATION,
  ENTRY_BEETHOVENS_DEAFNESS,
  ENTRY_THE_BLUES,
];

export const MUSIC_MEADOW_ENTRY_IDS =
  MUSIC_MEADOW_ENTRIES.map((e) => e.id);
