/**
 * Content Entries — Rhyme Docks
 * World: Rhyme Docks | Guide: Felix Barbosa | Subject: Poetry / Rhyme & Rhythm
 *
 * Four published entries tracing the history of poetry across cultures:
 *   1. Homer and the Iliad — before literacy, poetry was memory technology
 *   2. Phillis Wheatley — a poet who proved something the world refused to believe
 *   3. Matsuo Bashō and the haiku — the art of saying everything in seventeen syllables
 *   4. Langston Hughes and the Blues poem — when jazz met the page
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Homer and the Iliad (Tier 1 — ages 5-6) ──────────────

export const ENTRY_HOMER_ILIAD: RealWorldEntry = {
  id: 'entry-homer-iliad',
  type: 'person',
  title: "The Story That Was Sung Before It Was Written",
  year: -800,
  yearDisplay: 'c. 800 BCE',
  era: 'ancient',
  descriptionChild:
    "Before books existed, stories lived in people's mouths. A poet named Homer — we think he was blind — sang long stories called epics. His most famous was about a ten-year war and a giant wooden horse. He sang it from memory. People listened for hours. They remembered it because of its rhythm — like a heartbeat — and its rhymes. He kept the stories alive by making them beautiful to say out loud.",
  descriptionOlder:
    "Homer of ancient Greece (c. 800 BCE) is credited with the Iliad and Odyssey — the foundational texts of Western literature. But 'credited' may be wrong: ancient epic poetry was an oral tradition, meaning trained bards (aoidoi) memorized and performed stories across multiple sessions. Homer may be one poet, many poets, or a title given to whoever carried the tradition. The poems were composed in dactylic hexameter — a rhythmic pattern of long and short syllables — which served as a mnemonic device, making 15,000+ lines memorizable. They were written down only centuries after their composition.",
  descriptionParent:
    "Homer's epics introduce children to oral poetry as memory technology — rhyme and rhythm exist partly because they make text easier to remember. The question of Homer's identity (one person? many? did he exist?) is an excellent introduction to historical uncertainty. The story of the Trojan War also raises the question of where legend ends and history begins — Troy was discovered by Heinrich Schliemann in 1870 to be a real city. The blind bard is a consistent tradition across multiple ancient cultures — a connection children can explore with Riku at Starfall Observatory.",
  realPeople: ['Homer (attributed)'],
  quote: "Sing in me, Muse, and through me tell the story.",
  quoteAttribution: 'Homer, Odyssey, opening line',
  geographicLocation: { lat: 38.1204, lng: 26.3797, name: 'Ionia (modern western Turkey)' },
  continent: 'Asia',
  subjectTags: ['oral tradition', 'epic poetry', 'rhythm', 'meter', 'dactylic hexameter', 'ancient Greece'],
  worldId: 'rhyme-docks',
  guideId: 'felix-barbosa',
  adventureType: 'guided_expedition',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-phillis-wheatley'],
  funFact: "Ancient Greek bards could perform the Iliad — 15,693 lines — over three days of performances. They memorized every word through rhythm. The hexameter pattern (DA-da-da, DA-da-da) is so regular that once you feel it, you can't forget it. Try tapping it now.",
  imagePrompt:
    "Ancient Greek amphitheater at evening firelight, a blind white-haired bard performing to a large attentive crowd of all ages seated on stone steps, his arms gesturing dramatically, the crowd leaning forward, a boy near the front mouthing the words he's heard before, the wine-dark sea visible beyond the theater, stars beginning to show, torches blazing, Ghibli painterly warmth with epic scale, the sense of a story larger than any one person",
  status: 'published',
};

// ─── Entry 2: Phillis Wheatley (Tier 2 — ages 7-8) ─────────────────

export const ENTRY_PHILLIS_WHEATLEY: RealWorldEntry = {
  id: 'entry-phillis-wheatley',
  type: 'person',
  title: "The Poet Who Had to Prove She Wrote Her Own Poems",
  year: 1773,
  yearDisplay: '1773 CE',
  era: 'enlightenment',
  descriptionChild:
    "Phillis Wheatley was enslaved in Boston. She learned to read and write in two years. By age 12, she was writing poetry. When she wrote her first book — the first book of poetry ever published by a Black American — people didn't believe SHE had written it. They made her stand before 18 powerful men in Boston and answer questions about her work, to prove the poems were hers. She answered every question correctly. Then they signed a paper saying the poems were genuine. The poems were always genuine.",
  descriptionOlder:
    "Phillis Wheatley was brought to Boston as a child in 1761 on a slave ship, purchased by John Wheatley. The Wheatley family taught her to read as a novelty — and were astonished by her intellect. She mastered English, Latin, Greek, and theology. Her 1773 collection 'Poems on Various Subjects, Religious and Moral' was published in London — American publishers refused it. The 'examination' before 18 Boston luminaries (including John Hancock) was designed to verify authorship and was unprecedented: no white poet was ever required to defend ownership of their own work. She was freed after publishing. She died in poverty at 31.",
  descriptionParent:
    "Wheatley's story introduces the intersection of poetry and social justice — how who is allowed to create, publish, and be credited has always been political. It also introduces neoclassical poetry (she wrote in the couplet tradition of Alexander Pope) and the concept of literary tradition as a gated community. Her examination is a striking historical event for children to think about: what does it mean to have to prove that your own words are yours? The contrast with Homer — unknown author, unlimited credit — is worth discussing explicitly.",
  realPeople: ['Phillis Wheatley', 'John Wheatley', 'John Hancock'],
  quote: "In every human breast, God has implanted a principle, which we call love of freedom.",
  quoteAttribution: 'Phillis Wheatley, 1774',
  geographicLocation: { lat: 42.3601, lng: -71.0589, name: 'Boston, Massachusetts' },
  continent: 'North America',
  subjectTags: ['poetry', 'neoclassicism', 'couplets', 'authorship', 'Black literature', 'historical injustice'],
  worldId: 'rhyme-docks',
  guideId: 'felix-barbosa',
  adventureType: 'remembrance_wall',
  difficultyTier: 2,
  prerequisites: ['entry-homer-iliad'],
  unlocks: ['entry-haiku-basho'],
  funFact: "John Hancock — who signed the Declaration of Independence — was one of the 18 men who signed the paper certifying that Phillis Wheatley had written her own poems. The Declaration said 'all men are created equal.' Hancock owned enslaved people.",
  imagePrompt:
    "Boston 1772, a small formal room with 18 formally dressed men seated in a semicircle, Phillis Wheatley — a young Black woman in modest dress — standing at the center answering questions with quiet certainty, her handwritten manuscript on the table before her, afternoon light from tall windows, the men's expressions ranging from skeptical to reluctant belief, a sense of complete injustice held with perfect dignity, Ghibli restraint and historical weight",
  status: 'published',
};

// ─── Entry 3: Matsuo Bashō and the Haiku (Tier 2 — ages 7-8) ────────

export const ENTRY_HAIKU_BASHO: RealWorldEntry = {
  id: 'entry-haiku-basho',
  type: 'person',
  title: "Seventeen Syllables and the Art of Noticing",
  year: 1686,
  yearDisplay: '1686 CE',
  era: 'enlightenment',
  descriptionChild:
    "A Japanese poet named Matsuo Bashō walked thousands of miles across Japan, just to write about what he saw. He wrote in a form called haiku: three lines with 5, 7, and 5 syllables — seventeen total. His most famous haiku is about a frog jumping into a pond. That's the whole poem. But when you read it carefully, you can hear the sound of the water after the frog is gone. A haiku is not about what you SAY. It's about what you make the reader FEEL.",
  descriptionOlder:
    "Matsuo Bashō (1644-1694) transformed the haiku from an amusing wordplay exercise into a profound literary form. His 1689 travel journal 'Oku no Hosomichi' (The Narrow Road to the Deep North), written during a 2,400-km journey on foot, contains dozens of his finest haiku. Bashō's formal innovation was 'kigo' (seasonal reference words) as anchoring devices and 'kireji' (cutting words) that create a juxtaposition — two images that the reader's mind must bridge. His frog haiku ('old pond — a frog jumps in — sound of water') is considered the most analyzed poem in Japanese literature.",
  descriptionParent:
    "The haiku form is an ideal pedagogical tool for teaching attention, compression, and the gap between saying and suggesting. Bashō's insistence on direct observation of nature ('go to the pine tree and learn from the pine tree') aligns with NGSS scientific observation practices. The syllable-counting structure gives children a clear formal constraint that paradoxically enables creativity. Felix should contrast haiku with Homer's epic form — same fundamental impulse (recording experience) but opposite aesthetic strategies.",
  realPeople: ['Matsuo Bashō'],
  quote: "Go to the pine tree and learn from the pine tree; go to the bamboo and learn from the bamboo.",
  quoteAttribution: 'Matsuo Bashō',
  geographicLocation: { lat: 35.0116, lng: 135.7681, name: 'Kyoto, Japan' },
  continent: 'Asia',
  subjectTags: ['haiku', 'syllables', 'nature poetry', 'Japanese literature', 'observation', 'compression'],
  worldId: 'rhyme-docks',
  guideId: 'felix-barbosa',
  adventureType: 'guided_expedition',
  difficultyTier: 2,
  prerequisites: ['entry-phillis-wheatley'],
  unlocks: ['entry-langston-hughes-blues'],
  funFact: "Bashō spent years studying Zen Buddhism, which influenced his poetry enormously. Zen asks you to notice what is right in front of you — completely and fully. Haiku is that noticing, written down. His pen name 'Bashō' means 'banana tree' — named after a plant a student gave him.",
  imagePrompt:
    "Feudal Japan at late spring dusk, Matsuo Bashō in travel robes sitting beside a weather-beaten old pond surrounded by moss and water plants, a frog mid-jump caught in the instant before hitting the surface, ripples just beginning, Bashō's brush raised and notebook open, cherry blossoms falling slowly, the moment of absolute quiet attention before the splash, Ghibli painterly precision with Zen stillness, warm fading golden light",
  status: 'published',
};

// ─── Entry 4: Langston Hughes and the Blues Poem (Tier 3 — ages 9-10)

export const ENTRY_LANGSTON_HUGHES_BLUES: RealWorldEntry = {
  id: 'entry-langston-hughes-blues',
  type: 'person',
  title: "The Poet Who Let Jazz Into Literature",
  year: 1926,
  yearDisplay: '1926 CE',
  era: 'modern',
  descriptionChild:
    "Langston Hughes grew up in a time when most American poetry sounded like it was written in a formal European dining room. He thought that was wrong. He went to Harlem jazz clubs and listened: the rhythm, the repetition, the blues call-and-response. Then he wrote poems that sounded like THAT. Not proper English, or iambic pentameter. Real, living, speaking voices of real people. He helped create what's called the Harlem Renaissance — an explosion of Black art that changed American culture.",
  descriptionOlder:
    "Hughes published 'The Weary Blues' in 1926, formally launching his literary career and establishing his blues-inflected free verse style. He drew directly from African American musical traditions — call-and-response patterns, twelve-bar blues structures, jazz improvisation rhythms. His innovations included writing vernacular (spoken dialect) into poetry, which was considered undignified by both white literary establishments AND some Black middle-class critics who wanted 'respectable' literature. He argued that the speech and lives of working people are the proper subject of poetry. He was also openly gay at a time when that required extraordinary courage.",
  descriptionParent:
    "Hughes teaches that form in poetry is not neutral — choosing to write in European meters vs. vernacular African American speech is a political statement. He also demonstrates that poetry evolves: the 'rules' change when a new tradition is powerful enough. His work during the Harlem Renaissance connects to visual art (Jacob Lawrence), music (Duke Ellington, Bessie Smith), and the sociology of the Great Migration. Older children can compare Hughes' use of repetition with Bashō's compression — opposite tools, both creating emphasis.",
  realPeople: ['Langston Hughes', 'Bessie Smith', 'Duke Ellington', 'Countee Cullen'],
  quote: "Life is for the living. Death is for the dead. Let life be like music. And death a note unsaid.",
  quoteAttribution: 'Langston Hughes',
  geographicLocation: { lat: 40.8116, lng: -73.9465, name: 'Harlem, New York City' },
  continent: 'North America',
  subjectTags: ['blues poetry', 'Harlem Renaissance', 'jazz', 'free verse', 'vernacular', 'African American literature'],
  worldId: 'rhyme-docks',
  guideId: 'felix-barbosa',
  adventureType: 'time_window',
  difficultyTier: 3,
  prerequisites: ['entry-haiku-basho'],
  unlocks: [],
  funFact: "Langston Hughes once wrote a poem on a napkin in a Harlem restaurant and gave it to a stranger who liked his work. That poem — 'Dream Boogie' — was later published. He believed poems should circulate freely, person to person, like music.",
  imagePrompt:
    "Harlem jazz club 1926, amber smoke-filled room with a blues singer at the microphone, tables of people leaning forward, Langston Hughes in the back corner with a notebook open, his hand moving fast as he writes to the rhythm of the music, neon light from the street outside making colored stripes on the floor, the energy of something new being born in the air, Studio Ghibli warmth with the crackle of jazz history, joy and defiance in equal measure",
  status: 'published',
};

// ─── Export ────────────────────────────────────────────────────────

export const RHYME_DOCKS_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_HOMER_ILIAD,
  ENTRY_PHILLIS_WHEATLEY,
  ENTRY_HAIKU_BASHO,
  ENTRY_LANGSTON_HUGHES_BLUES,
];

export const RHYME_DOCKS_ENTRY_IDS = RHYME_DOCKS_ENTRIES.map((e) => e.id);
