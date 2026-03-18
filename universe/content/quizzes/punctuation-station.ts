/**
 * Quiz Questions ΓÇö Punctuation Station (Rosie Chen)
 * Punctuation / Writing Mechanics
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const PUNCTUATION_STATION_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-aristophanes-punctuation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-aristophanes-t1',
    entryId: 'entry-aristophanes-punctuation',
    difficultyTier: 1,
    question: 'What problem did Aristophanes of Byzantium solve when he invented the first punctuation marks around 200 BCE?',
    options: [
      'He helped printers know when to add a new page',
      'He gave readers a way to know where to pause and breathe when reading a text aloud',
      'He invented the first spaces between words so texts were easier to read',
      'He created symbols to show which words were the most important',
    ],
    correctIndex: 1,
    explanation: 'Ancient Greek texts had no spaces between words and no punctuation at all. Aristophanes invented three types of dot placed at different heights to show readers ΓÇö who read aloud ΓÇö how long to pause. Punctuation began as a breathing guide, not a grammar system.',
  },
  {
    id: 'quiz-aristophanes-t2',
    entryId: 'entry-aristophanes-punctuation',
    difficultyTier: 2,
    question: 'Ancient texts had no spaces between words: ANCIENTLATINTEXTSLOOKEDLIKETHIS. How would the absence of spaces change reading as an experience?',
    options: [
      'It would make reading quieter because readers wouldn\'t need to sound out words',
      'It would make reading much slower and require specialist training, because each reader had to figure out where words began and ended before understanding the meaning',
      'It would only be a problem for texts in foreign languages',
      'It would force readers to use punctuation marks to separate words instead',
    ],
    correctIndex: 1,
    explanation: 'Without word-spaces, even a simple sentence requires significant work to decode ΓÇö you must identify word boundaries before you can begin reading for meaning. This is why reading in the ancient world was a specialist skill, and why reading aloud in a community was the norm: a skilled reader could guide others through a text they couldn\'t parse themselves.',
  },
  {
    id: 'quiz-aristophanes-t3',
    entryId: 'entry-aristophanes-punctuation',
    difficultyTier: 3,
    question: 'Aristophanes\'s dots were originally designed to guide oral performance ΓÇö telling readers when to breathe. Modern punctuation guides both reading aloud and silent comprehension. What does this evolution reveal about punctuation?',
    options: [
      'That punctuation became more complicated over time for no good reason',
      'That as reading practices changed ΓÇö from oral to silent, from specialist to widespread ΓÇö punctuation adapted to serve new purposes, showing that writing systems evolve in response to how they are used',
      'That Aristophanes\'s original system was too simple and had to be abandoned',
      'That oral and silent reading require completely different and incompatible punctuation systems',
    ],
    correctIndex: 1,
    explanation: 'Aristophanes designed for vocal performance; modern punctuation serves both voice and mind. The comma, for instance, still controls pacing when read aloud, but it also signals syntactic structure for the silent reader. Punctuation expanded its function without abandoning its original purpose, because the marks proved flexible enough to serve multiple uses simultaneously.',
  },

  // ΓöÇΓöÇΓöÇ entry-gutenberg-punctuation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-punct-gutenberg-t1',
    entryId: 'entry-gutenberg-punctuation',
    difficultyTier: 1,
    question: 'How did Gutenberg\'s printing press in the 1450s change punctuation?',
    options: [
      'It eliminated most punctuation marks to save space on the page',
      'It forced punctuation to become standardised because every printed copy had to be identical',
      'It invented the question mark and exclamation point for the first time',
      'It made punctuation marks larger so they were easier to read',
    ],
    correctIndex: 1,
    explanation: 'Before printing, each handwritten manuscript was unique and scribes used their own personal punctuation systems. Once the printing press arrived, typesetters needed fixed sets of punctuation blocks and every copy of a book had to be exactly the same. This demand for consistency gradually standardised punctuation across Europe.',
  },
  {
    id: 'quiz-punct-gutenberg-t2',
    entryId: 'entry-gutenberg-punctuation',
    difficultyTier: 2,
    question: 'Early printers couldn\'t agree on a question mark for over a century ΓÇö some used a tilde, some a semicolon. How was agreement eventually reached?',
    options: [
      'The Church decided on official punctuation marks for religious texts and everyone followed',
      'Over time, certain marks spread through widely-read books and became familiar enough that printers adopted them as standard through a process of gradual, unplanned convergence',
      'A meeting of European printers voted on the standard marks in 1600',
      'One very popular printer\'s style became the model that others copied',
    ],
    correctIndex: 1,
    explanation: 'There was no single authority that declared the question mark standard. Instead, certain forms spread through popular books and became familiar. Printers who wanted their work to be readable adopted familiar marks. Over roughly 200 years of gradual convergence, the modern punctuation inventory emerged ΓÇö not through planning but through the organic spread of widely-used conventions.',
  },
  {
    id: 'quiz-punct-gutenberg-t3',
    entryId: 'entry-gutenberg-punctuation',
    difficultyTier: 3,
    question: 'The question mark may have evolved from "qo" (abbreviation of the Latin "quaestio") stacked vertically and stylised over time. What does the origin of punctuation marks from letters and abbreviations reveal about writing systems?',
    options: [
      'That all punctuation marks were originally invented by Roman scholars who studied Latin',
      'That writing systems evolve through continuous creative recycling ΓÇö symbols transform over centuries, repurposed from their origins into new functions as new needs emerge',
      'That Latin punctuation is the ancestor of all modern European punctuation systems',
      'That punctuation marks should always be based on abbreviations so their meaning is clear',
    ],
    correctIndex: 1,
    explanation: 'The question mark may be a compressed Latin abbreviation; the ampersand is a stylised "et" (Latin for "and"); the "at" sign @ is a stylised "a." Writing systems do not appear from nowhere ΓÇö they evolve through the slow transformation of earlier forms. Understanding this reveals that every punctuation mark is a small piece of compressed history.',
  },

  // ΓöÇΓöÇΓöÇ entry-semicolon ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-semicolon-t1',
    entryId: 'entry-semicolon',
    difficultyTier: 1,
    question: 'Who invented the semicolon, and what is it for?',
    options: [
      'Shakespeare invented it to show when a character should pause for dramatic effect',
      'Aldus Manutius, a Venetian printer, invented it in 1494 to connect two complete thoughts with a pause longer than a comma but shorter than a full stop',
      'The Romans invented it as a way of writing the number fifty with extra meaning',
      'Gutenberg invented it to fill in gaps on the printing press when he ran out of commas',
    ],
    correctIndex: 1,
    explanation: 'Aldus Manutius invented the semicolon in Venice in 1494 to fill a gap in the pause system. Sometimes two complete thoughts are closely related and a full stop between them feels too abrupt, but a comma is too light. The semicolon connects them; it joins two independent ideas that belong together.',
  },
  {
    id: 'quiz-semicolon-t2',
    entryId: 'entry-semicolon',
    difficultyTier: 2,
    question: 'The author Kurt Vonnegut famously said semicolons are pretentious: "All they do is show you\'ve been to college." Why might people feel strongly about punctuation choices?',
    options: [
      'Because punctuation mistakes are embarrassing and people are sensitive about them',
      'Because punctuation signals how a writer thinks ΓÇö the marks they choose reveal their style, education, and attitude toward their reader, making them charged with social and aesthetic meaning',
      'Because different countries have different punctuation rules and people argue about which are correct',
      'Because Vonnegut had never learned to use semicolons correctly',
    ],
    correctIndex: 1,
    explanation: 'Vonnegut\'s remark is itself a stylistic statement. He preferred directness ΓÇö short sentences, clear stops. The semicolon, to him, signalled a kind of showing-off. To his defenders, the semicolon allows elegant connection between ideas. Neither position is objectively correct; they reflect different philosophies about what writing should do and what relationship it should create with readers.',
  },
  {
    id: 'quiz-semicolon-t3',
    entryId: 'entry-semicolon',
    difficultyTier: 3,
    question: 'The semicolon tattoo became a symbol of mental health awareness: "my story isn\'t over yet; the author chose to continue the sentence." How does a punctuation mark acquire meaning far beyond its grammatical function?',
    options: [
      'Only if a famous person uses it in a famous sentence',
      'Through sustained community use that builds cultural associations ΓÇö a mark can accumulate symbolic resonance when many people use it with shared intention to express a shared idea',
      'Punctuation marks can never have meaning beyond their grammatical use',
      'Because the semicolon looks like a pause-with-continuation, and this visual form automatically suggests second chances',
    ],
    correctIndex: 1,
    explanation: 'The semicolon tattoo movement transformed a grammatical mark into a life statement. The logic ΓÇö a semicolon continues the sentence rather than ending it ΓÇö became a metaphor for survival and choice. Cultural meanings attach to symbols through collective use. Once enough people use a symbol with a specific intention, the symbol carries that intention wherever it appears.',
  },

  // ΓöÇΓöÇΓöÇ entry-interrobang ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-interrobang-t1',
    entryId: 'entry-interrobang',
    difficultyTier: 1,
    question: 'What does the interrobang (ΓÇ╜) do, and who invented it?',
    options: [
      'It marks the end of a very long paragraph; it was invented by printers in the 1300s',
      'It combines a question mark and an exclamation point into one mark for sentences that are both a question and an exclamation; Martin Speckter invented it in 1962',
      'It marks foreign words that have been borrowed into English; linguists invented it in the 1900s',
      'It indicates a secret meaning in a sentence; it was invented during World War II',
    ],
    correctIndex: 1,
    explanation: 'Martin Speckter, an advertising man, invented the interrobang in 1962 for sentences like "Are you serious?!" ΓÇö questions that are also exclamations. He combined the question mark and exclamation point into one elegant symbol. It never quite caught on, but it has dedicated fans and lives on in some fonts.',
  },
  {
    id: 'quiz-interrobang-t2',
    entryId: 'entry-interrobang',
    difficultyTier: 2,
    question: 'The interrobang and other proposed marks like the irony mark (Γ╕«) and the sarcasm point all failed to gain widespread use. Why is it so hard for new punctuation marks to be adopted?',
    options: [
      'Because new marks cost too much to add to printing equipment',
      'Because a new mark needs to be adopted simultaneously by publishers, educators, typesetters, and readers everywhere ΓÇö this enormous coordination problem means the existing system\'s imperfections are usually preferred to the disruption of change',
      'Because punctuation authorities like grammarians vote on new marks and always say no',
      'Because readers are too old to learn new symbols once they have learned to read',
    ],
    correctIndex: 1,
    explanation: 'Even a genuinely useful mark faces a near-impossible coordination problem. A publisher using an irony mark requires that readers know what it means. Readers only know what it means if it appears in many books. Books only use it if publishers adopt it ΓÇö and publishers won\'t risk confusing readers with unfamiliar symbols. The system is self-reinforcing against change.',
  },
  {
    id: 'quiz-interrobang-t3',
    entryId: 'entry-interrobang',
    difficultyTier: 3,
    question: 'Proposed marks like the irony mark (Γ╕«) and interrobang (ΓÇ╜) failed to enter mainstream use despite being genuinely useful. Yet emoji ΓÇö visual symbols with no official linguistic authority ΓÇö spread globally within a decade. What does this contrast reveal about how writing systems actually change?',
    options: [
      'That emoji are more useful than punctuation marks and will eventually replace them',
      'That writing system change driven from below ΓÇö by millions of users adopting a symbol spontaneously ΓÇö can succeed where top-down proposals by individuals or committees fail',
      'That digital technology makes it easier to invent new symbols than older printing technology did',
      'That punctuation belongs to formal language while emoji belongs to informal language, so different rules apply',
    ],
    correctIndex: 1,
    explanation: 'Speckter proposed the interrobang from the top down ΓÇö one person, one symbol, seeking adoption by an industry. Emoji spread from the bottom up ΓÇö millions of users adopted them spontaneously across platforms, creating an unstoppable wave of use that forced official recognition. This mirrors how natural language change has always worked: driven by communities of users, not by individuals with good ideas.',
  },
];
