/**
 * Quiz Questions ΓÇö The Great Archive (The Librarian)
 * Knowledge Preservation / Information Literacy
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const GREAT_ARCHIVE_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-great-library-alexandria ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-alexandria-t1',
    entryId: 'entry-great-library-alexandria',
    difficultyTier: 1,
    question: 'What made the Library of Alexandria so extraordinary?',
    options: [
      'It was the tallest building ever constructed',
      'It tried to collect every book ever written and had scholars study there',
      'It was the first building to use glass windows',
      'It had 100 librarians working night and day',
    ],
    correctIndex: 1,
    explanation: 'The Library of Alexandria (~288 BCE) tried to collect every scroll ever written. Ships docking at Alexandria were searched, and any books found were copied ΓÇö the library kept the originals. It also housed the Mouseion, history\'s first research institution.',
  },
  {
    id: 'quiz-alexandria-t2',
    entryId: 'entry-great-library-alexandria',
    difficultyTier: 2,
    question: 'A popular story says Julius Caesar burned the Library of Alexandria. What really happened?',
    options: [
      'Caesar burned every scroll deliberately to erase Egyptian history',
      'The Library was destroyed suddenly in a single dramatic fire',
      'The Library declined gradually over centuries due to underfunding and political neglect ΓÇö not a single event',
      'An earthquake destroyed it in 365 CE',
    ],
    correctIndex: 2,
    explanation: 'The single-fire myth is compelling but wrong. The Library\'s decline was slow: reduced royal funding, political conflicts, and the general decline of Alexandria\'s importance over centuries. Some fires damaged parts of the collection, but there was no single catastrophic "burning of the Library." It was death by neglect, not drama.',
  },
  {
    id: 'quiz-alexandria-t3',
    entryId: 'entry-great-library-alexandria',
    difficultyTier: 3,
    question: 'Eratosthenes, the Library\'s chief librarian, did something remarkable while working there. What?',
    options: [
      'He invented the idea of using stars to navigate at sea',
      'He calculated the circumference of the Earth ΓÇö and was only 0.16% off',
      'He wrote the first atlas of the known world',
      'He invented longitude and latitude',
    ],
    correctIndex: 1,
    explanation: 'Eratosthenes (~240 BCE) knew that at noon on the summer solstice in Syene, the sun cast no shadow. In Alexandria, it cast a 7.2-degree shadow. Using geometry and the distance between cities, he calculated Earth\'s circumference at ~252,000 stades ΓÇö within 0.16% of the actual number. He did this without satellites, only math and curiosity.',
  },

  // ΓöÇΓöÇΓöÇ entry-first-encyclopedia ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-yongle-t1',
    entryId: 'entry-first-encyclopedia',
    difficultyTier: 1,
    question: 'How many scholars did Emperor Yongle hire to write the Yongle Encyclopedia?',
    options: ['200 scholars', '500 scholars', '2,169 scholars', '10,000 scholars'],
    correctIndex: 2,
    explanation: 'Emperor Yongle of China\'s Ming Dynasty hired 2,169 scholars to write the Yongle Dadian (1408 CE). It took 6 years and produced 22,877 chapters in over 11,000 volumes ΓÇö the most comprehensive encyclopedia ever assembled before the internet.',
  },
  {
    id: 'quiz-yongle-t2',
    entryId: 'entry-first-encyclopedia',
    difficultyTier: 2,
    question: 'What percentage of the Yongle Encyclopedia survives today?',
    options: ['About 75%', 'About 50%', 'About 20%', 'About 3.5%'],
    correctIndex: 3,
    explanation: 'Of the original 11,095 volumes, only about 400 survive ΓÇö roughly 3.5%. Most were destroyed during the Boxer Rebellion (1900). The surviving volumes are scattered across libraries on four continents. Each can sell for over $1 million at auction.',
  },
  {
    id: 'quiz-yongle-t3',
    entryId: 'entry-first-encyclopedia',
    difficultyTier: 3,
    question: 'The Yongle Encyclopedia\'s near-total loss demonstrates which principle about knowledge preservation?',
    options: [
      'Knowledge should only be stored in stone, which survives fire',
      'A single physical copy of something important is extremely fragile ΓÇö distributed storage is more resilient',
      'Emperors should not try to collect all knowledge at once',
      'Knowledge written in one language will always be lost if that language dies',
    ],
    correctIndex: 1,
    explanation: 'The Yongle Encyclopedia had few copies because reproducing it was enormously expensive. Compare this to the internet\'s design ΓÇö ARPANET was specifically built WITH multiple nodes so no single destruction could erase it. The lesson of the Yongle Dadian directly echoes in modern backup strategies, cloud storage, and Wikipedia\'s distributed hosting.',
  },

  // ΓöÇΓöÇΓöÇ entry-internet-birth ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-arpanet-t1',
    entryId: 'entry-internet-birth',
    difficultyTier: 1,
    question: 'What was the first message ever sent over the internet (ARPANET)?',
    options: ['"HELLO WORLD"', '"LO" (the system crashed after two letters)', '"TEST"', '"CONNECT"'],
    correctIndex: 1,
    explanation: 'On October 29, 1969, a programmer at UCLA tried to send "LOGIN" to Stanford. The system crashed after the first two letters: "LO." The full message succeeded on the second attempt. "LO" became an accidental poetic first word of the networked age.',
  },
  {
    id: 'quiz-arpanet-t2',
    entryId: 'entry-internet-birth',
    difficultyTier: 2,
    question: 'ARPANET was designed to survive a nuclear attack. What design feature made that possible?',
    options: [
      'It was buried underground',
      'It had a single super-powerful central computer',
      'It had multiple nodes ΓÇö if one was destroyed, signals rerouted through others',
      'It used paper backups for every digital message',
    ],
    correctIndex: 2,
    explanation: 'Unlike the Library of Alexandria (one building, one collection), ARPANET had no single point of failure. Information traveled in "packets" that could take different routes to reach the same destination. This distributed design made the network resilient ΓÇö and it\'s why the internet today persists even when servers go down.',
  },
  {
    id: 'quiz-arpanet-t3',
    entryId: 'entry-internet-birth',
    difficultyTier: 3,
    question: 'ARPANET was invented for military communications. What did Tim Berners-Lee add in 1991 that turned it into the World Wide Web?',
    options: [
      'Email ΓÇö the ability to send personal messages',
      'HTTP and HTML ΓÇö the ability to link documents together with clickable hyperlinks',
      'Search engines ΓÇö the ability to find information easily',
      'Encryption ΓÇö the ability to keep messages private',
    ],
    correctIndex: 1,
    explanation: 'Tim Berners-Lee invented HTTP (how computers request documents) and HTML (how documents are formatted and linked) in 1989ΓÇô1991. His contribution was hyperlinks ΓÇö documents could point to other documents anywhere on the network. The internet became a web of connected knowledge rather than a network of isolated files.',
  },

  // ΓöÇΓöÇΓöÇ entry-wikipedia ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-archive-wikipedia-t1',
    entryId: 'entry-wikipedia',
    difficultyTier: 1,
    question: 'What was Wikipedia\'s founding idea?',
    options: [
      'Professional encyclopedists would finally go digital',
      'Anyone in the world could write the encyclopedia together ΓÇö for free',
      'Every country would have its own encyclopedia online',
      'Scientists would create a verified fact database',
    ],
    correctIndex: 1,
    explanation: 'Wikipedia (launched January 15, 2001) was radical: a free encyclopedia written collaboratively by volunteers. It started with 20 articles. Today it has over 60 million articles in 300 languages ΓÇö the largest encyclopedia ever assembled, built by people who were paid nothing.',
  },
  {
    id: 'quiz-archive-wikipedia-t2',
    entryId: 'entry-wikipedia',
    difficultyTier: 2,
    question: 'Wikipedia has real limitations. Which is the most important to understand?',
    options: [
      'Wikipedia is only available in English',
      'Wikipedia requires paid subscriptions to read',
      'Wikipedia can have bias, gaps, and errors ΓÇö especially for underrepresented communities',
      'Wikipedia deletes old articles every year',
    ],
    correctIndex: 2,
    explanation: 'Wikipedia reflects who is doing the writing ΓÇö and most editors have historically been white men from wealthy countries. This creates documented bias: women scientists are underrepresented, non-European histories have fewer articles, and some articles on minority communities contain errors. Knowing who writes a source is part of evaluating it.',
  },
  {
    id: 'quiz-archive-wikipedia-t3',
    entryId: 'entry-wikipedia',
    difficultyTier: 3,
    question: 'How does Wikipedia close the loop that began with the Library of Alexandria?',
    options: [
      'It uses the same organizational system as ancient Alexandria',
      'It proves that knowledge cannot be destroyed',
      'It shifts from "one powerful institution collecting everything" to "everyone contributing freely to a distributed, uncopyable archive"',
      'It was built on the ruins of the Yongle Encyclopedia\'s lost volumes',
    ],
    correctIndex: 2,
    explanation: 'Alexandria was one building, one collection, one nation\'s project ΓÇö and it could be burned, neglected, and lost. Wikipedia is distributed across thousands of servers on six continents, mirrored by volunteers, and translated by millions. It is practically impossible to destroy completely. This fulfills the dream of Alexandria while solving its fatal flaw: centralization.',
  },
];
