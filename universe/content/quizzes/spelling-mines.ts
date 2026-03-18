/**
 * Quiz Questions ΓÇö Spelling Mines (Benny Okafor-Williams)
 * Spelling / Word Patterns
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const SPELLING_MINES_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-noah-webster-dictionary ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-webster-t1',
    entryId: 'entry-noah-webster-dictionary',
    difficultyTier: 1,
    question: 'What spelling changes did Noah Webster make that Americans still use today?',
    options: [
      'He changed "cat" to "kat" and "dog" to "dawg"',
      'He changed "colour" to "color," "centre" to "center," and "defence" to "defense"',
      'He removed all the silent letters from every English word',
      'He made all American words shorter by cutting off the last syllable',
    ],
    correctIndex: 1,
    explanation: 'Noah Webster deliberately reformed spelling to give American English its own identity, different from British English. His changes ΓÇö "color" instead of "colour," "center" instead of "centre," "defense" instead of "defence" ΓÇö are still how Americans spell these words today, nearly 200 years later.',
  },
  {
    id: 'quiz-webster-t2',
    entryId: 'entry-noah-webster-dictionary',
    difficultyTier: 2,
    question: 'Webster wanted to spell "tongue" as "tung" and "women" as "wimmen," but those proposals failed. Why might some spelling reforms succeed while others do not?',
    options: [
      'Because the government approved some changes and rejected others',
      'Because reforms that preserve familiar word shapes while making small improvements tend to be accepted, while reforms that make words look too strange feel uncomfortable and are rejected',
      'Because "tung" and "wimmen" were submitted too late to be included in the dictionary',
      'Because British English had already adopted "tongue" and "women" and Americans copied them',
    ],
    correctIndex: 1,
    explanation: '"Color" looks enough like "colour" that readers accept it easily. "Tung" for "tongue" looks alien ΓÇö despite being more phonetically logical. People accept spelling reforms that feel like improvements without requiring them to entirely relearn what a word looks like. Familiarity and small change are more persuasive than pure logic.',
  },
  {
    id: 'quiz-webster-t3',
    entryId: 'entry-noah-webster-dictionary',
    difficultyTier: 3,
    question: 'Webster learned 26 languages to trace the etymologies of words for his dictionary. He believed language was tied to national identity. How can a dictionary be both a linguistic document and a political act?',
    options: [
      'Only if the government officially endorses it',
      'Because defining which words exist and how they are spelled establishes which form of the language is considered standard and legitimate ΓÇö a dictionary draws a linguistic border',
      'Because dictionaries are printed by governments and therefore always reflect government views',
      'Only if the dictionary includes words about political events',
    ],
    correctIndex: 1,
    explanation: 'Webster\'s dictionary did not simply record American English ΓÇö it actively constructed it. By standardising "color" and "center," he was saying: this is the correct American form, and the British spelling is a foreign one. A dictionary that sets the standard for a language participates in defining who is a fluent member of the community it describes.',
  },

  // ΓöÇΓöÇΓöÇ entry-norman-conquest-spelling ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-norman-spelling-t1',
    entryId: 'entry-norman-conquest-spelling',
    difficultyTier: 1,
    question: 'What happened to English spelling after the Norman Conquest in 1066?',
    options: [
      'English spelling became simpler because French has simpler rules',
      'English absorbed thousands of French words and nobody could agree how to spell anything ΓÇö giving English its confusing spelling today',
      'English spelling was banned and everyone had to use French spelling instead',
      'English spelling became more regular because French scribes were more careful',
    ],
    correctIndex: 1,
    explanation: 'After the Norman Conquest, French-speaking rulers governed Anglo-Saxon-speaking people for 300 years. Words from both languages got mixed together, and different scribes in different regions spelled the same words different ways. By the time English settled down, it had strange silent letters and multiple spellings for many sounds.',
  },
  {
    id: 'quiz-norman-spelling-t2',
    entryId: 'entry-norman-conquest-spelling',
    difficultyTier: 2,
    question: 'English has the word "pig" for the living animal and "pork" for the meat on the table ΓÇö two different words for the same creature. Why?',
    options: [
      'Because farmers used one word and butchers used a different one',
      'Because Anglo-Saxon English speakers raised the pigs and kept their word, while French-speaking Norman lords who ate the prepared meat used their French word',
      'Because "pork" entered the language much later from trade with French merchants',
      'Because "pig" is the informal word and "pork" is the formal or scientific term',
    ],
    correctIndex: 1,
    explanation: 'The social hierarchy of post-Conquest England is preserved in this vocabulary split: English-speaking peasants raised and named the animals (pig, sheep, cow), while Norman French-speaking lords ate the prepared meat (pork, mutton, beef). The language remembers the class structure even though that structure is long gone.',
  },
  {
    id: 'quiz-norman-spelling-t3',
    entryId: 'entry-norman-conquest-spelling',
    difficultyTier: 3,
    question: 'The silent "b" in "debt" was added by Renaissance scholars who wanted the word to look more like its Latin ancestor "debitum" ΓÇö it was never pronounced. What does this tell us about the relationship between spelling and authority?',
    options: [
      'That Latin is superior to English and all English words should be based on it',
      'That spelling can be deliberately reshaped by educated authorities to project connections to prestige languages ΓÇö spelling sometimes encodes social aspiration, not just sound',
      'That Renaissance scholars made a mistake that nobody bothered to correct',
      'That "debt" was originally a Latin word that entered English and kept its Latin spelling',
    ],
    correctIndex: 1,
    explanation: 'The "b" in "debt" was a conscious choice by scholars who wanted English to look more learned and connected to classical Latin. The word had been spelled "dette" in Middle English without any "b." This insertion shows that spelling can be a social statement ΓÇö a way of claiming prestige or demonstrating education ΓÇö as much as a guide to pronunciation.',
  },

  // ΓöÇΓöÇΓöÇ entry-scripps-spelling-bee ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-spelling-bee-t1',
    entryId: 'entry-scripps-spelling-bee',
    difficultyTier: 1,
    question: 'What happened at the Scripps National Spelling Bee in 2019 that had never happened before?',
    options: [
      'A very young six-year-old won for the first time',
      'Eight co-champions tied ΓÇö they got every single word right and the judges ran out of hard words',
      'A competitor spelled a word in two different correct ways and both were accepted',
      'The competition was cancelled because nobody could spell the final word',
    ],
    correctIndex: 1,
    explanation: 'In 2019, eight competitors spelled every single word correctly and the judges ran out of words from their word list. All eight were declared co-champions ΓÇö the "Octochamps." The rules were changed afterwards to prevent this happening again.',
  },
  {
    id: 'quiz-spelling-bee-t2',
    entryId: 'entry-scripps-spelling-bee',
    difficultyTier: 2,
    question: 'Spelling Bee champions don\'t just memorise words ΓÇö they learn the patterns of Latin roots, Greek prefixes, and the language each word came from. Why is this approach more effective than simply memorising spellings?',
    options: [
      'Because competition words are always from Latin and Greek, so other strategies don\'t work',
      'Because understanding a word\'s origin and structure allows you to deduce its likely spelling even if you\'ve never seen it before ΓÇö pattern knowledge beats rote memory',
      'Because memorising thousands of words takes too long for a competition',
      'Because judges ask competitors to explain word origins as part of the competition',
    ],
    correctIndex: 1,
    explanation: 'If you know that "ph" often represents the Greek letter phi (as in "telephone" from Greek "tele" + "phone"), you can spell unfamiliar words with "ph" sounds correctly. Pattern knowledge is generative ΓÇö it works on words you\'ve never seen. Rote memorisation is limited to the specific words you have studied.',
  },
  {
    id: 'quiz-spelling-bee-t3',
    entryId: 'entry-scripps-spelling-bee',
    difficultyTier: 3,
    question: 'The Spelling Bee has words from Greek, Latin, French, German, Arabic, Japanese, and many other languages. Why does mastering English spelling require knowledge of so many languages?',
    options: [
      'Because the competition organisers add words from other languages to make it harder',
      'Because English spelling reflects the history of how words entered the language ΓÇö each borrowed word often retains the spelling conventions of its original language, creating a multilingual archaeological record',
      'Because English speakers travel widely and need to know how other languages work',
      'Because dictionary editors decided to make all foreign words look foreign on the page',
    ],
    correctIndex: 1,
    explanation: 'When "safari" entered English from Swahili, "ballet" from French, and "tsunami" from Japanese, they brought their spelling conventions with them. English spelling is not one system but many layered systems from different source languages. Knowing the origin language lets you apply the right spelling rules ΓÇö it turns a confusing mess into a logical archaeological map.',
  },

  // ΓöÇΓöÇΓöÇ entry-ipa-phonetic-alphabet ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-ipa-t1',
    entryId: 'entry-ipa-phonetic-alphabet',
    difficultyTier: 1,
    question: 'What does the International Phonetic Alphabet (IPA) do?',
    options: [
      'It is a secret code used by spies during World War II',
      'It provides a single symbol for every sound any human language uses, so that sounds can be written down exactly',
      'It is an alphabet used in the country of Phonecia',
      'It converts all languages into one universal written language',
    ],
    correctIndex: 1,
    explanation: 'The IPA gives every sound in every human language its own unique symbol. The symbol /╩â/ always means the "sh" sound ΓÇö in English "ship," French "chat," or Mandarin "sh├¡." This means any language\'s pronunciation can be written down precisely, with no ambiguity.',
  },
  {
    id: 'quiz-ipa-t2',
    entryId: 'entry-ipa-phonetic-alphabet',
    difficultyTier: 2,
    question: 'English uses about 44 distinct sounds but has only 26 letters to represent them. What problem does this mismatch cause?',
    options: [
      'English speakers have to learn 18 extra letters from other alphabets',
      'The same letter or combination of letters must represent different sounds in different words, making spelling unpredictable and hard to learn',
      'Some English sounds cannot be written down at all',
      'English spelling is longer than it needs to be because it uses too many letters',
    ],
    correctIndex: 1,
    explanation: 'When 44 sounds must be represented by only 26 letters, multiple sounds share letters (the letter "a" in "cat," "cake," "father," and "all" represents four different sounds), and some sounds need letter combinations (like "sh" or "th"). This mismatch ΓÇö not laziness or carelessness ΓÇö is the fundamental reason English spelling is so inconsistent.',
  },
  {
    id: 'quiz-ipa-t3',
    entryId: 'entry-ipa-phonetic-alphabet',
    difficultyTier: 3,
    question: 'Henry Sweet, one of the IPA\'s key developers, was the model for Professor Henry Higgins in George Bernard Shaw\'s Pygmalion ΓÇö a play about using phonetics to change a person\'s social class. What does this reveal about the social importance of pronunciation?',
    options: [
      'That phonetics is a form of entertainment that playwrights find interesting',
      'That the way a person pronounces words carries social signals about their background and class ΓÇö and that controlling pronunciation has historically been used as a tool of social inclusion and exclusion',
      'That scientists who study language are always eccentric people like Professor Higgins',
      'That the IPA was primarily created to help people improve their social status',
    ],
    correctIndex: 1,
    explanation: 'Shaw\'s Pygmalion showed that pronunciation is not just about communication ΓÇö it is a social marker. People are judged by their accent and dialect. The IPA makes pronunciation visible and analysable, which also makes its social power visible. Understanding that pronunciation rules are social conventions ΓÇö not natural laws ΓÇö is the first step to questioning why some pronunciations carry more prestige than others.',
  },
];
