/**
 * Content Entries — The Reading Reef
 * World: The Reading Reef | Guide: Oliver Marsh | Subject: Reading Comprehension
 *
 * Four published entries spanning the history and science of reading:
 *   1. The Invention of Silent Reading — when reading became private thought
 *   2. The Braille Underwater Library — accessibility as design principle
 *   3. The Invention of the Public Library — knowledge for everyone
 *   4. Speed Reading and Its Limits — why comprehension beats velocity
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: The Invention of Silent Reading (Tier 1 — ages 5-6) ──

export const ENTRY_SILENT_READING: RealWorldEntry = {
  id: 'entry-silent-reading',
  type: 'discovery',
  title: 'The Day Reading Became Quiet',
  year: 370,
  yearDisplay: '~370 CE',
  era: 'classical',
  descriptionChild:
    "Long ago, everyone read out loud — even when they were alone! When St. Augustine visited Bishop Ambrose in Milan, he was amazed to see him reading without making a single sound. Just his eyes moving across the page. It was so unusual that Augustine wrote about it in his book.",
  descriptionOlder:
    "For most of literate history, reading was a spoken activity performed aloud. Libraries were noisy places. Silent reading — the ability to process text without vocalizing — fundamentally changed how humans think. It made possible private thoughts that no one else could hear, internal monologue, and the experience of losing yourself in a book. Augustine's famous passage about Ambrose is one of the earliest descriptions of this cognitive revolution.",
  descriptionParent:
    "The transition from oral to silent reading represents a major cognitive milestone in human history. Neuroscientists now understand that silent reading recruits different brain pathways than reading aloud — it enables faster processing and deeper internal reflection. The shift also had social implications: silent reading created private intellectual space, which some historians link to the development of individual consciousness, personal prayer, and eventually the Protestant Reformation's emphasis on personal scripture study.",
  realPeople: ['St. Ambrose', 'St. Augustine'],
  quote: "When he read, his eyes scanned the page and his heart sought out the meaning, but his voice was silent.",
  quoteAttribution: 'St. Augustine, Confessions, Book VI',
  geographicLocation: { lat: 45.4642, lng: 9.1900, name: 'Milan, Italy' },
  continent: 'Europe',
  subjectTags: ['reading history', 'silent reading', 'cognition', 'literacy', 'ancient world'],
  worldId: 'reading-reef',
  guideId: 'oliver-marsh',
  adventureType: 'guided_expedition',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-braille-underwater-library'],
  funFact:
    'In medieval libraries, the noise of hundreds of people reading aloud simultaneously was so loud that rules had to be posted requesting quiet. Libraries were originally the noisiest rooms in any building.',
  imagePrompt:
    "Ancient Milan circa 370 CE, Bishop Ambrose sitting in a stone-arched study reading a parchment scroll in complete silence, his eyes moving but lips perfectly still, Augustine standing in the doorway watching with visible astonishment, other scholars in adjacent rooms reading aloud with moving lips, warm Mediterranean light through a high window, the contrast between noise and silence made visual with subtle sound-wave lines near the other readers but calm stillness around Ambrose, Studio Ghibli historical realism",
  status: 'published',
};

// ─── Entry 2: Braille Underwater Library (Tier 2 — ages 7-8) ───────

export const ENTRY_BRAILLE_UNDERWATER_LIBRARY: RealWorldEntry = {
  id: 'entry-braille-underwater-library',
  type: 'invention',
  title: 'The Library You Read by Touch',
  year: 1824,
  yearDisplay: '1824 CE (Braille system)',
  era: 'industrial',
  descriptionChild:
    "Oliver's library is underwater, but the books still work. They're carved into living coral, and you read them by touch — just like Braille. Understanding isn't about seeing words on a page. It's about receiving meaning, however it arrives.",
  descriptionOlder:
    "Louis Braille invented his tactile reading system at age 15, adapting a military night-writing code. Oliver's underwater library in the Reading Reef extends this concept: if reading can adapt from sight to touch, it can adapt to any medium. The coral-carved texts demonstrate that accessibility isn't an add-on — it's a design principle. Oliver lost his sight at 30 and had to learn an entirely new way to read. He says he reads better now because he listens more carefully.",
  descriptionParent:
    "This entry connects Oliver's blindness to the broader concept of Universal Design — the principle that environments should be designed to be usable by all people, without the need for adaptation. Braille's system democratized literacy for blind and visually impaired people worldwide. The experiential element (children navigating by touch) builds empathy and demonstrates that multiple pathways to understanding exist. Oliver models that disability is not inability — it's a different relationship with the world.",
  realPeople: ['Louis Braille'],
  quote: "Access to communication is access to knowledge, and that is vitally important in our world.",
  quoteAttribution: 'Louis Braille',
  geographicLocation: { lat: 48.8566, lng: 2.3522, name: 'Paris, France (Braille origin)' },
  continent: 'Europe',
  subjectTags: ['Braille', 'accessibility', 'universal design', 'tactile reading', 'inclusion'],
  worldId: 'reading-reef',
  guideId: 'oliver-marsh',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-silent-reading'],
  unlocks: ['entry-public-library'],
  funFact:
    "Oliver lost his sight at 30 and had to learn an entirely new way to read. He says he reads better now because he listens more carefully. 'My ears see what my eyes used to guess at.'",
  imagePrompt:
    "Underwater coral library in the Reading Reef, Oliver Marsh (blind, with a walking stick) running his fingers over raised Braille-like text carved into beautiful living coral formations, bioluminescent coral glowing in patterns that highlight the text, small reef fish swimming between the coral bookshelves, dappled blue-green light filtering from the surface above, the tactile text visible as raised dots on the coral surface, atmosphere of wonder and accessibility, Studio Ghibli underwater magical realism",
  status: 'published',
};

// ─── Entry 3: The Public Library (Tier 2 — ages 7-8) ───────────────

export const ENTRY_PUBLIC_LIBRARY: RealWorldEntry = {
  id: 'entry-public-library',
  type: 'event',
  title: 'The Day Books Became Free',
  year: 1833,
  yearDisplay: '1833 CE',
  era: 'industrial',
  descriptionChild:
    "The first free public library opened in 1833 in a small town in New Hampshire. Before that, you had to pay to borrow books. Free libraries mean that anyone — rich or poor — can read anything. Oliver calls this the most important invention in the history of reading.",
  descriptionOlder:
    "Benjamin Franklin started subscription lending libraries in 1731, but you had to pay a membership fee. True public libraries — funded by taxes and free to all — are one of the most democratic institutions ever created. They represent a radical idea: that access to knowledge should not depend on wealth. Andrew Carnegie later funded 2,509 libraries worldwide, dramatically expanding the model. The impact of free access to books on literacy, social mobility, and democracy is incalculable.",
  descriptionParent:
    "The free public library movement represents one of the most significant democratizing innovations in history. Unlike schools (which require enrollment) or bookstores (which require purchase), public libraries offer unconditional access to knowledge. The model demonstrates that public goods — funded collectively, available individually — can generate enormous social returns. Modern libraries have evolved to include digital access, makerspaces, and community services, but the core principle remains: knowledge is a right, not a privilege.",
  realPeople: ['Benjamin Franklin', 'Andrew Carnegie'],
  quote: "A library is not a luxury but one of the necessities of life.",
  quoteAttribution: 'Henry Ward Beecher',
  geographicLocation: { lat: 42.8687, lng: -71.7437, name: 'Peterborough, New Hampshire, USA' },
  continent: 'North America',
  subjectTags: ['public library', 'democracy', 'access to knowledge', 'literacy', 'public goods'],
  worldId: 'reading-reef',
  guideId: 'oliver-marsh',
  adventureType: 'time_window',
  difficultyTier: 2,
  prerequisites: ['entry-braille-underwater-library'],
  unlocks: ['entry-speed-reading-limits'],
  funFact:
    'Andrew Carnegie funded the construction of 2,509 libraries worldwide. He was a steel magnate who believed his wealth should be returned to the public. The cost per library was modest. The impact per dollar was enormous.',
  imagePrompt:
    "Small New England town 1833, a modest wooden building with a hand-painted sign reading 'Free Public Library', a diverse crowd of townspeople — farmers, children, elderly, merchants — entering through the front door for the first time, inside visible through windows are shelves of leather-bound books, a woman holding a child's hand walking up the steps, the expression on faces showing reverence and excitement, autumn foliage surrounding the building, warm amber light from oil lamps inside, Studio Ghibli historical Americana realism",
  status: 'published',
};

// ─── Entry 4: Speed Reading and Its Limits (Tier 3 — ages 9-10) ────

export const ENTRY_SPEED_READING_LIMITS: RealWorldEntry = {
  id: 'entry-speed-reading-limits',
  type: 'scientific_principle',
  title: 'Why Faster Is Not Always Better',
  year: null,
  yearDisplay: '1950s–Present',
  era: 'contemporary',
  descriptionChild:
    "Some people claim to read thousands of words per minute. But scientists have shown that truly understanding what you read takes time. Your brain needs to think about each idea, not just see each word. Fast reading isn't always better reading. Oliver says: slow down and understand.",
  descriptionOlder:
    "Evelyn Wood popularized speed reading in the 1950s, claiming people could read thousands of words per minute. Research since then has shown that while skimming speed can increase with practice, deep comprehension has biological limits determined by the speed at which the brain processes language. Studies consistently show an inverse relationship between reading speed and comprehension above a certain threshold. Oliver teaches that comprehension — truly understanding and connecting ideas — matters more than speed.",
  descriptionParent:
    "The speed reading entry introduces children to the concept of cognitive trade-offs and the value of metacognition (thinking about thinking). Research by Rayner et al. (2016) demonstrates that reading speed is constrained by eye fixation duration, saccade planning, and semantic processing speed — all with biological limits. The entry challenges the cultural bias toward 'more, faster' and introduces the idea that quality of engagement matters more than quantity. It also models intellectual humility: Oliver, a literary expert, explicitly values slow, careful reading over impressive speed.",
  realPeople: ['Evelyn Wood'],
  quote: "I would rather understand one book deeply than skim one hundred.",
  quoteAttribution: 'Oliver Marsh',
  geographicLocation: null,
  continent: null,
  subjectTags: ['speed reading', 'comprehension', 'metacognition', 'cognitive science', 'reading strategies'],
  worldId: 'reading-reef',
  guideId: 'oliver-marsh',
  adventureType: 'guided_expedition',
  difficultyTier: 3,
  prerequisites: ['entry-public-library'],
  unlocks: [],
  funFact:
    "President Kennedy was a famous speed reader, reportedly reading 1,200 words per minute. Whether he actually comprehended at that speed is a question no one thought to ask at the time.",
  imagePrompt:
    "Inside the Reading Reef's coral library, two contrasting scenes side by side: on the left, a child racing through coral-text pages with words blurring past and a confused expression, fragments of unconnected ideas floating around their head; on the right, Oliver Marsh sitting calmly with a child, both touching a single coral page slowly, the words forming clear connected idea-threads that glow golden as they are understood, the contrast between speed and comprehension made visual, soft underwater blue-green light, Studio Ghibli educational storytelling",
  status: 'published',
};

// ─── Export ────────────────────────────────────────────────────────

export const READING_REEF_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_SILENT_READING,
  ENTRY_BRAILLE_UNDERWATER_LIBRARY,
  ENTRY_PUBLIC_LIBRARY,
  ENTRY_SPEED_READING_LIMITS,
];

export const READING_REEF_ENTRY_IDS = READING_REEF_ENTRIES.map((e) => e.id);
