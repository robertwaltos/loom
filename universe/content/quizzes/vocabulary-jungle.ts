/**
 * Quiz Questions ΓÇö Vocabulary Jungle (Kwame Asante)
 * Vocabulary / Word Roots
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const VOCABULARY_JUNGLE_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-oxford-english-dictionary ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-oed-t1',
    entryId: 'entry-oxford-english-dictionary',
    difficultyTier: 1,
    question: 'What makes the Oxford English Dictionary different from an ordinary dictionary?',
    options: [
      'It only contains words that were invented after 1800',
      'It records not just the meaning of each word but the full history of where each word came from and how it changed over time',
      'It is the biggest dictionary in the world and contains every word used in every country',
      'It was written by one very clever person in about ten years',
    ],
    correctIndex: 1,
    explanation: 'The Oxford English Dictionary is a historical dictionary ΓÇö for every word, it shows the earliest known use, how the meaning changed over time, and quotations from real books illustrating each sense. It is a record of the English language\'s entire history, not just a list of current definitions.',
  },
  {
    id: 'quiz-oed-t2',
    entryId: 'entry-oxford-english-dictionary',
    difficultyTier: 2,
    question: 'One of the OED\'s most prolific contributors, W. C. Minor, submitted over 10,000 quotations from inside a hospital for the criminally insane. What does this reveal about how the OED was built?',
    options: [
      'That the editors were not careful about who they accepted work from',
      'That the project was built on a crowd-sourced model where anyone could contribute, and intellectual value comes from the quality of the work, not the status of the worker',
      'That criminals often have a lot of time to read books',
      'That the OED\'s chief editor, James Murray, made a special exception for Minor',
    ],
    correctIndex: 1,
    explanation: 'James Murray issued a public call for volunteers to read every English book ever written and mail in quotations showing word usage. Thousands of people responded. Minor happened to be the most prolific ΓÇö his institutional confinement meant he had unusual access to time and books. The project valued contribution, not credentials.',
  },
  {
    id: 'quiz-oed-t3',
    entryId: 'entry-oxford-english-dictionary',
    difficultyTier: 3,
    question: 'The word "set" has over 430 different meanings in the OED ΓÇö more than any other English word. What does this enormous range of senses reveal about how language works?',
    options: [
      'That English speakers are lazy and reuse words instead of inventing new ones',
      'That words accumulate meanings through use over centuries, with each new context adding a new sense without erasing the old ones',
      'That the OED editors made a mistake by grouping too many different words under one entry',
      'That old words always end up meaning their opposite over time',
    ],
    correctIndex: 1,
    explanation: 'A word like "set" began with a simple meaning and accumulated new senses through hundreds of years of use in different contexts ΓÇö mathematics, printing, theatre, geology, and more. Language doesn\'t discard old meanings when it adds new ones; it layers them. This is why dictionaries need historical records, not just snapshots.',
  },

  // ΓöÇΓöÇΓöÇ entry-shakespeare-invented-words ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-shakespeare-t1',
    entryId: 'entry-shakespeare-invented-words',
    difficultyTier: 1,
    question: 'How many words that we still use today did Shakespeare invent or first record in writing?',
    options: [
      'About 50 words',
      'About 300 words',
      'Over 1,700 words',
      'Over 10,000 words',
    ],
    correctIndex: 2,
    explanation: 'Shakespeare coined or first recorded in writing over 1,700 words that we still use today ΓÇö including "eyeball," "bedroom," "lonely," "generous," "gloomy," and "hurry." He made up words whenever English didn\'t have the one he needed, and people liked them enough to keep using them.',
  },
  {
    id: 'quiz-shakespeare-t2',
    entryId: 'entry-shakespeare-invented-words',
    difficultyTier: 2,
    question: 'Shakespeare didn\'t just invent words from nothing ΓÇö he combined existing roots, turned nouns into verbs, and added prefixes. Why did his coinages survive when many other writers\' invented words did not?',
    options: [
      'Because he was royally appointed and had the power to make words official',
      'Because his plays were so widely performed and read that his new words entered everyday speech before they could be forgotten',
      'Because he only invented words that were very short and easy to pronounce',
      'Because he wrote his plays using printing presses that spread his words very quickly',
    ],
    correctIndex: 1,
    explanation: 'Shakespeare\'s genius was as much in popularisation as in invention. His plays were performed to thousands of people and later printed widely. When audiences heard "eyeball" or "bedroom," they adopted it naturally. A word survives when enough people use it ΓÇö and Shakespeare gave his words the largest possible audience.',
  },
  {
    id: 'quiz-shakespeare-t3',
    entryId: 'entry-shakespeare-invented-words',
    difficultyTier: 3,
    question: 'Shakespeare\'s word inventions followed productive patterns like converting nouns to verbs ("to friend someone") or adding prefixes ("uncomfortable," "undress"). What does this tell us about how new words are typically formed in any language?',
    options: [
      'That truly new words must be completely invented and have no connection to existing words',
      'That languages expand by applying existing patterns to new situations ΓÇö working within the system rather than breaking it',
      'That only literary writers have the authority to create new words in a language',
      'That new words are usually shorter versions of existing long words',
    ],
    correctIndex: 1,
    explanation: 'Languages grow systematically, not randomly. When Shakespeare needed a word, he applied patterns his audience already knew ΓÇö making the new word immediately feel natural and understandable. This is how all languages expand: by applying known rules to new needs. The system teaches itself to its new users through its own regularities.',
  },

  // ΓöÇΓöÇΓöÇ entry-loanwords ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-loanwords-t1',
    entryId: 'entry-loanwords',
    difficultyTier: 1,
    question: 'The word "piano" comes from Italian, "kindergarten" from German, and "safari" from Swahili. What does this show about the English language?',
    options: [
      'That English was invented by mixing three languages at once',
      'That English borrows words freely from languages all around the world',
      'That English speakers couldn\'t invent their own words for these things',
      'That these are the only three languages English has borrowed from',
    ],
    correctIndex: 1,
    explanation: 'English is an extraordinarily generous borrower ΓÇö about 80% of its vocabulary comes from other languages. "Piano" from Italian, "kindergarten" from German, "safari" from Swahili, "typhoon" from Chinese and Arabic. Languages share their best words, and English has taken more than most.',
  },
  {
    id: 'quiz-loanwords-t2',
    entryId: 'entry-loanwords',
    difficultyTier: 2,
    question: 'After the Norman Conquest of 1066, English developed interesting doublets: "pig" is the Anglo-Saxon word for the animal, and "pork" is the French word for the food. Why might this pattern exist?',
    options: [
      'Because French and English speakers disagreed about how to spell the same word',
      'Because Anglo-Saxon peasants raised the animals and used their own words, while French-speaking Norman lords ate the prepared food and used their words',
      'Because French farmers kept pigs while English farmers kept cows',
      'Because the Norman invaders brought different animals with them',
    ],
    correctIndex: 1,
    explanation: 'The linguistic split reflects the social hierarchy of post-Conquest England. English-speaking peasants raised the animals and kept their own words (pig, cow, sheep). Norman French-speaking lords ate the cooked meat and provided the culinary vocabulary (pork, beef, mutton). The vocabulary preserved the social structure in language.',
  },
  {
    id: 'quiz-loanwords-t3',
    entryId: 'entry-loanwords',
    difficultyTier: 3,
    question: 'The word "ketchup" originated from a Hokkien Chinese term for a fermented fish sauce, travelled through Malay traders, reached British colonists, and eventually became the tomato-based condiment Americans know today. What does a word\'s journey reveal about history?',
    options: [
      'That word origins are too complicated to be worth studying',
      'That vocabulary is a record of cultural contact, trade routes, and human migration ΓÇö every borrowed word is a fossil of an encounter',
      'That the Chinese invented ketchup and should receive credit for it',
      'That only words with food names have interesting travel histories',
    ],
    correctIndex: 1,
    explanation: 'Tracing "ketchup" through Hokkien, Malay, and British colonial history is also tracing the history of trade routes in Southeast Asia. Words carry the fingerprints of the encounters that produced them. Vocabulary is not just communication ΓÇö it is archaeology. Every loanword marks a point where two cultures touched.',
  },

  // ΓöÇΓöÇΓöÇ entry-how-words-enter-dictionary ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-dictionary-entry-t1',
    entryId: 'entry-how-words-enter-dictionary',
    difficultyTier: 1,
    question: 'How does a new word like "selfie" get added to the dictionary?',
    options: [
      'A committee of professors votes on whether it is a real word',
      'When enough people use it, for long enough, in enough different situations ΓÇö it earns its place',
      'A word must be used in a newspaper story before it counts',
      'The person who invented the word must apply to have it added',
    ],
    correctIndex: 1,
    explanation: '"Selfie" was added to the dictionary in 2013, "emoji" in 2015, "doomscrolling" in 2020. Dictionary editors monitor language use across billions of published words. When a new word appears consistently across many independent sources over several years, it qualifies for an entry. There is no committee vote ΓÇö just survival.',
  },
  {
    id: 'quiz-dictionary-entry-t2',
    entryId: 'entry-how-words-enter-dictionary',
    difficultyTier: 2,
    question: 'Dictionary editors describe themselves as "descriptive" rather than "prescriptive." What is the difference?',
    options: [
      'Prescriptive dictionaries are written by doctors and descriptive ones by teachers',
      'Descriptive dictionaries record how language is actually used; prescriptive dictionaries tell people how they should use it',
      'Descriptive dictionaries are for children and prescriptive ones are for adults',
      'Prescriptive dictionaries contain more words because they include all possible uses',
    ],
    correctIndex: 1,
    explanation: 'A prescriptive dictionary is like a rule book ΓÇö it tells you what words "really" mean. A descriptive dictionary is like a scientific record ΓÇö it shows what words actually mean in current use. Modern dictionary editors observe language like scientists observe nature: they record what they find, not what they think should be there.',
  },
  {
    id: 'quiz-dictionary-entry-t3',
    entryId: 'entry-how-words-enter-dictionary',
    difficultyTier: 3,
    question: 'The word "unfriend" was used by Thomas Fuller in 1659, disappeared for 350 years, then returned when Facebook made it common again. What does this tell us about the relationship between language and technology?',
    options: [
      'That social media is ruining the English language by bringing back old words',
      'That language evolves in response to social need ΓÇö new technologies create new social situations that revive dormant words or generate entirely new ones',
      'That Thomas Fuller must have predicted social media would exist one day',
      'That all words eventually return no matter what technology exists',
    ],
    correctIndex: 1,
    explanation: 'Words are tools for describing social reality. When social media created the experience of choosing to disconnect from someone online, "unfriend" filled the need perfectly ΓÇö it already existed as a concept, just without the social context to make it common. Technology doesn\'t corrupt language; it creates new situations that language adapts to describe.',
  },
];
