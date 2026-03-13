/**
 * Quiz Questions — Rhyme Docks (Felix Barbosa)
 * Poetry / Rhyme & Rhythm
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const RHYME_DOCKS_QUIZZES: readonly EntryQuizQuestion[] = [

  // ─── entry-homer-iliad ───────────────────────────────────────────────────────
  {
    id: 'quiz-homer-t1',
    entryId: 'entry-homer-iliad',
    difficultyTier: 1,
    question: 'Homer\'s epics — the Iliad and Odyssey — were passed down for centuries before being written down. How did people remember poems that were thousands of lines long?',
    options: [
      'Professional scribes memorized them word-for-word',
      'Rhythm and rhyme patterns made the words easier to remember',
      'The poems were carved into stone walls in temples',
      'Different singers were responsible for different sections',
    ],
    correctIndex: 1,
    explanation: 'The Iliad and Odyssey were composed in dactylic hexameter — a strict rhythmic pattern (long-short-short, long-short-short) that is almost hypnotic when spoken aloud. Rhythm is one of humanity\'s oldest memory aids. The pattern helped bards reconstruct lines they forgot and stay on track during multi-day performances.',
  },
  {
    id: 'quiz-homer-t2',
    entryId: 'entry-homer-iliad',
    difficultyTier: 2,
    question: 'Was Homer one person or many people? What do most scholars now believe?',
    options: [
      'Definitely one man who composed both epics in his lifetime',
      'Two different poets: one wrote the Iliad, one the Odyssey',
      'Most likely an oral tradition with many contributors, possibly given the name "Homer" by later tradition',
      'An invention — no poet named Homer ever existed',
    ],
    correctIndex: 2,
    explanation: 'The "Homeric Question" has been debated for centuries. Modern scholars, using linguistic analysis, believe the epics show signs of multiple authors across generations of an oral tradition. "Homer" may be a name assigned to the tradition, or a real poet who compiled earlier stories. We may never know — and that uncertainty is part of what makes the question interesting.',
  },
  {
    id: 'quiz-homer-t3',
    entryId: 'entry-homer-iliad',
    difficultyTier: 3,
    question: 'The city of Troy in the Iliad was once thought to be pure myth. What happened in 1870?',
    options: [
      'A Greek archaeologist published a book proving Troy was a metaphor',
      'Heinrich Schliemann excavated a site in Turkey and found the ruins of what was very likely Troy — a real ancient city',
      'A Turkish scholar found ancient maps showing Troy\'s location',
      'The story of the Trojan War was discovered in Egyptian papyrus scrolls',
    ],
    correctIndex: 1,
    explanation: 'Heinrich Schliemann excavated Hisarlik in modern Turkey in 1870 and found a city with multiple layers of destruction and rebuilding — consistent with Homer\'s Troy. He actually dug through the correct layer (Troy VI or VIIa, c. 1200 BCE) and found gold artifacts. Myth and history overlapped. Homer was telling stories about something real, filtered through 400 years of oral tradition.',
  },

  // ─── entry-phillis-wheatley ──────────────────────────────────────────────────
  {
    id: 'quiz-wheatley-t1',
    entryId: 'entry-phillis-wheatley',
    difficultyTier: 1,
    question: 'Phillis Wheatley was the first Black American to publish a book of poetry. What unusual thing did she have to do before her book could be published?',
    options: [
      'Translate her poems into Latin for a university panel',
      'Stand before 18 powerful Boston men and prove in an oral exam that she had written the poems',
      'Have every poem witnessed by a judge in writing',
      'Swear an oath that she had not copied the poems from English books',
    ],
    correctIndex: 1,
    explanation: 'In 1772, Phillis Wheatley was examined by 18 prominent Boston men including John Hancock. They questioned her in depth about her poems, her influences, and her education. She answered every question. They signed an attestation confirming the poems were genuinely hers. No white poet of the era was ever required to authenticate their work this way.',
  },
  {
    id: 'quiz-wheatley-t2',
    entryId: 'entry-phillis-wheatley',
    difficultyTier: 2,
    question: 'Why was Phillis Wheatley\'s book published in London rather than Boston?',
    options: [
      'London publishers paid more for poetry',
      'American publishers refused to publish a book of poetry written by an enslaved Black woman',
      'The Boston printers had a waiting list of five years',
      'She was living in London when she wrote the book',
    ],
    correctIndex: 1,
    explanation: 'Boston publishers refused to publish her work — they did not believe it was genuine or commercially viable. London proved more open; her 1773 collection "Poems on Various Subjects, Religious and Moral" was published there. American audiences were forced to import the book, giving it international credibility her home country rejected.',
  },
  {
    id: 'quiz-wheatley-t3',
    entryId: 'entry-phillis-wheatley',
    difficultyTier: 3,
    question: 'Wheatley wrote poems in the neoclassical style — formal, polished, with classical allusions. Some critics say this was a limitation. Others say it was a strategy. What do you think the argument is for "strategy"?',
    options: [
      'Neoclassical style was taught in Boston schools, so it was the only style she knew',
      'Writing in the most respected white literary form of the era made her work impossible to dismiss on stylistic grounds — forcing critics to engage with her ideas',
      'She preferred classical Latin poets and modeled her work on them deliberately for personal reasons',
      'Neoclassical poems could be published with less censorship in 18th-century Massachusetts',
    ],
    correctIndex: 1,
    explanation: 'By mastering the dominant white literary style perfectly, Wheatley removed one line of attack. Critics who wanted to dismiss her work as "not real literature" had to confront poems written in exactly the form they would accept from any other poet. Her formal choices may have been both authentic and strategic — excellence as survival.',
  },

  // ─── entry-haiku-basho ───────────────────────────────────────────────────────
  {
    id: 'quiz-basho-t1',
    entryId: 'entry-haiku-basho',
    difficultyTier: 1,
    question: 'A haiku has a specific syllable structure. What is it?',
    options: [
      '4 syllables, 8 syllables, 4 syllables',
      '7 syllables, 5 syllables, 7 syllables',
      '5 syllables, 7 syllables, 5 syllables',
      '3 syllables, 3 syllables, 3 syllables',
    ],
    correctIndex: 2,
    explanation: 'A traditional haiku has 5 syllables in the first line, 7 in the second, and 5 in the third — 17 syllables total. Matsuo Bashō refined this form in the 1680s. His most famous haiku: "An old silent pond / A frog jumps into the pond / Splash! Silence again."',
  },
  {
    id: 'quiz-basho-t2',
    entryId: 'entry-haiku-basho',
    difficultyTier: 2,
    question: 'Bashō\'s haiku are famous for what they leave OUT. What is the poetic principle behind this?',
    options: [
      'Brevity — shorter poems are always better than longer ones',
      'Ma (間) — negative space or pause — where the unspoken meaning lives between the words written',
      'Wabi-sabi — the beauty of imperfect and incomplete things',
      'Mono no aware — a melancholy awareness that all things pass',
    ],
    correctIndex: 1,
    explanation: '"Ma" (negative space) is a core concept in Japanese aesthetics. In haiku, what is not said creates room for the reader\'s own feeling. Bashō\'s frog poem does not say "it was peaceful before" or "the silence returned" — it implies both through contrast. The gap between the splash and the returning silence IS the poem.',
  },
  {
    id: 'quiz-basho-t3',
    entryId: 'entry-haiku-basho',
    difficultyTier: 3,
    question: 'Haiku traditionally include a "kigo" — a season word. Why is this structurally important?',
    options: [
      'It gives the reader a calendar date to attach the poem to',
      'Season words ground the poem in nature\'s cycle and carry emotional associations that work without being stated',
      'It was a rule from the Japanese Emperor that all poems mention seasons',
      'It was a way to publish poems organized by month in traditional anthologies',
    ],
    correctIndex: 1,
    explanation: 'A kigo instantly communicates sensory and emotional context without explanation. "Cherry blossom" in Japanese culture means spring, transience, beauty, and death — four layers of meaning in two words. The kigo does the emotional heavy lifting, leaving the haiku\'s other lines free to contain a single precise observation. Compression as art form.',
  },

  // ─── entry-langston-hughes-blues ─────────────────────────────────────────────
  {
    id: 'quiz-hughes-t1',
    entryId: 'entry-langston-hughes-blues',
    difficultyTier: 1,
    question: 'Langston Hughes was a central figure in the Harlem Renaissance. What was the Harlem Renaissance?',
    options: [
      'A school of painting that began in New York\'s Harlem neighborhood',
      'A flowering of Black art, music, poetry, and intellectual life in 1920s New York',
      'A political movement for Black voting rights in Northern cities',
      'A jazz club in Harlem where many famous musicians performed',
    ],
    correctIndex: 1,
    explanation: 'The Harlem Renaissance (roughly 1919–1940) was an extraordinary period of Black cultural and intellectual achievement centered in Harlem, New York. Langston Hughes, Zora Neale Hurston, Duke Ellington, Louis Armstrong, and Countee Cullen were among its figures. It produced a body of work that changed American literature, music, and art permanently.',
  },
  {
    id: 'quiz-hughes-t2',
    entryId: 'entry-langston-hughes-blues',
    difficultyTier: 2,
    question: 'Hughes brought jazz and blues rhythm into poetry. What does that mean for HOW you read his poems?',
    options: [
      'His poems must be read silently — the music is only in the structure',
      'His poems should be read aloud with rhythm and repetition emphasized, like a jazz performance or blues lyric',
      'His poems are best understood as lyrics to songs he wrote himself',
      'He included musical notation in the margins of his poems',
    ],
    correctIndex: 1,
    explanation: 'Hughes turned the blues structure — call and response, repeated lines with variations, rhythm that demands to be felt in the body — into a literary form. His poem "The Weary Blues" has a speaker watching a piano player, and the poem\'s structure mimics the music in real time. It cannot be fully understood on the page alone — it must be heard aloud.',
  },
  {
    id: 'quiz-hughes-t3',
    entryId: 'entry-langston-hughes-blues',
    difficultyTier: 3,
    question: 'The blues form that Hughes used came from West African musical traditions. Connect this to the Rhyme Docks: where else in these poetry entries do we see an African oral tradition shaping a major literary form?',
    options: [
      'Homer, whose oral hexameter parallels African griot traditions of rhythmic oral history',
      'Bashō, who studied West African music through Dutch traders in Nagasaki',
      'Phillis Wheatley, who secretly encoded West African poetic forms in her neoclassical poetry',
      'There is no other African oral tradition connection in these entries',
    ],
    correctIndex: 0,
    explanation: 'The griot tradition in West Africa (oral historians who preserve community history through music and rhythmic recitation) and Homer\'s bardic tradition are both examples of oral poetry as community memory technology. Both use rhythm as a memory tool. Both carry history in performance. The blues is West African oral tradition filtered through centuries of American experience — just as Homer\'s epics are Aegean oral tradition filtered through centuries of performance.',
  },
];
