/**
 * Quiz Questions ΓÇö Grammar Bridge (Lila Johansson-Park)
 * Grammar / Sentence Structure
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const GRAMMAR_BRIDGE_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-panini-first-grammar ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-panini-t1',
    entryId: 'entry-panini-first-grammar',
    difficultyTier: 1,
    question: 'What did P─üß╣çini write about 2,400 years ago that made him famous?',
    options: [
      'The first ever story book in the Sanskrit language',
      'Every rule of the Sanskrit language ΓÇö about 4,000 rules in total',
      'A guide to the history of ancient India',
      'A dictionary of every Sanskrit word ever used',
    ],
    correctIndex: 1,
    explanation: 'P─üß╣çini wrote the Ashtadhyayi, which described every rule of the Sanskrit language in about 4,000 short rules. It was the first complete grammar of any language ever written, and it was so precisely done that scientists still find it impressive today.',
  },
  {
    id: 'quiz-panini-t2',
    entryId: 'entry-panini-first-grammar',
    difficultyTier: 2,
    question: 'P─üß╣çini\'s grammar system used variables, meta-rules, and context-sensitive rules ΓÇö concepts that computer scientists independently reinvented over 2,000 years later. What does this tell us?',
    options: [
      'That ancient Indian scholars were secretly working on computers',
      'That the logical structures needed to describe language precisely are so fundamental that they were discovered independently in different times and fields',
      'That modern computer scientists must have been copying P─üß╣çini\'s ideas',
      'That Sanskrit is the best language for writing computer code',
    ],
    correctIndex: 1,
    explanation: 'P─üß╣çini needed precise logical tools to describe grammar, and he invented them. Computer scientists needed similar tools to describe programming languages, and they invented them again ΓÇö independently. When two very different fields arrive at the same solution, it suggests they have found something deep and fundamental about the problem of describing rule-based systems.',
  },
  {
    id: 'quiz-panini-t3',
    entryId: 'entry-panini-first-grammar',
    difficultyTier: 3,
    question: 'P─üß╣çini compressed 4,000 grammar rules into a text that is shorter than many modern instruction manuals. Why is extreme compression in a system of rules a sign of deep understanding rather than oversimplification?',
    options: [
      'Because shorter documents are easier to memorise, which is all that matters',
      'Because when you truly understand a system, you can find the minimal set of rules that generates all possible patterns ΓÇö compression proves mastery',
      'Because ancient scholars didn\'t have enough writing materials to be detailed',
      'Because shorter rules are always easier to follow than longer ones',
    ],
    correctIndex: 1,
    explanation: 'A beginner describing a language might need a very long list of examples. An expert finds the underlying principles that generate all the examples. P─üß╣çini\'s compression ΓÇö 4,000 rules covering an entire language ΓÇö shows he had found the deepest level of structure. In science and mathematics, elegant compression is the sign of genuine understanding.',
  },

  // ΓöÇΓöÇΓöÇ entry-chomsky-universal-grammar ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-chomsky-t1',
    entryId: 'entry-chomsky-universal-grammar',
    difficultyTier: 1,
    question: 'What did Noam Chomsky suggest about why children learn language so easily and quickly?',
    options: [
      'That children are taught grammar rules at home before they start school',
      'That all human babies are born with a built-in grammar machine in their brains',
      'That children learn language by copying what adults say word by word',
      'That some children are naturally more intelligent and learn faster than others',
    ],
    correctIndex: 1,
    explanation: 'Chomsky proposed that the ability to learn language is hard-wired into the human brain ΓÇö what he called Universal Grammar. That\'s why children can produce grammatically correct sentences they\'ve never heard before, following rules no one explicitly taught them. The brain is born ready to learn language.',
  },
  {
    id: 'quiz-chomsky-t2',
    entryId: 'entry-chomsky-universal-grammar',
    difficultyTier: 2,
    question: 'Chomsky\'s famous example sentence is: "Colourless green ideas sleep furiously." What was he trying to prove with this sentence?',
    options: [
      'That poetry is more important than grammar',
      'That grammar and meaning are completely independent ΓÇö a sentence can be perfectly grammatical and completely meaningless at the same time',
      'That English grammar is too complicated for most people to understand',
      'That dreams are sometimes expressed in strange grammatical forms',
    ],
    correctIndex: 1,
    explanation: 'The sentence is grammatically flawless ΓÇö subject, adjectives, verb, adverb all in the right places. But it is semantically impossible ΓÇö ideas cannot be green, green cannot be colourless, and ideas cannot sleep. Chomsky showed that our brain has a separate grammar system and a separate meaning system, and they operate independently.',
  },
  {
    id: 'quiz-chomsky-t3',
    entryId: 'entry-chomsky-universal-grammar',
    difficultyTier: 3,
    question: 'Chomsky\'s Universal Grammar theory challenged the prevailing behaviourist view that children learn language purely by imitation and reward. What evidence did Chomsky use to argue against simple imitation?',
    options: [
      'He showed that children in different countries learn grammar at the same age',
      'He showed that children regularly produce grammatically correct sentences they have never heard, and make predictable errors that follow rules rather than copying adult mistakes',
      'He showed that children who are praised for speaking correctly learn faster',
      'He showed that chimpanzees cannot learn grammar even with extensive training',
    ],
    correctIndex: 1,
    explanation: 'If language were purely imitation, children would only repeat sentences they had heard. Instead, they produce novel sentences following rules they were never explicitly taught ΓÇö and make systematic errors like "I goed" (overapplying regular past-tense rules) rather than random errors. This "poverty of the stimulus" argument showed the brain must contribute something beyond what it is simply taught.',
  },

  // ΓöÇΓöÇΓöÇ entry-great-vowel-shift ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-vowel-shift-t1',
    entryId: 'entry-great-vowel-shift',
    difficultyTier: 1,
    question: 'Why is English spelling so different from how English actually sounds today?',
    options: [
      'Because English spelling was designed to look elegant rather than sound accurate',
      'Because English vowel sounds changed between 1400 and 1700, but spelling had already been fixed by the printing press',
      'Because English borrowed so many words from French that the spelling became confused',
      'Because King Henry VIII made a law changing pronunciation but not spelling',
    ],
    correctIndex: 1,
    explanation: 'During the Great Vowel Shift (roughly 1400ΓÇô1700), the way English speakers pronounced long vowel sounds systematically changed. But the printing press had already frozen spelling in the earlier form. So the letters remember the old sounds, while our mouths make new ones ΓÇö giving English its famously strange relationship between spelling and pronunciation.',
  },
  {
    id: 'quiz-vowel-shift-t2',
    entryId: 'entry-great-vowel-shift',
    difficultyTier: 2,
    question: 'During the Great Vowel Shift, the word "name" once rhymed with what we would now call "comma," and "meat" once rhymed with "mate." How does knowing this help explain confusing English spelling?',
    options: [
      'It explains why those words are spelled the way they are ΓÇö the spelling matches how they were originally pronounced',
      'It shows that old English and modern English are really two different languages',
      'It explains why British and American English spell some words differently',
      'It shows that vowels are the least important part of a word',
    ],
    correctIndex: 0,
    explanation: 'When "name" was pronounced to rhyme with "comma," spelling it with an \'a\' made perfect sense. When vowel sounds shifted, the pronunciation moved but the spelling stayed. Understanding the history of pronunciation makes what looks like irrational spelling completely logical ΓÇö the spelling was rational for its time.',
  },
  {
    id: 'quiz-vowel-shift-t3',
    entryId: 'entry-great-vowel-shift',
    difficultyTier: 3,
    question: 'The Great Vowel Shift happened gradually across 300 years without anyone planning or directing it. What does this tell us about how language changes?',
    options: [
      'That language change is always caused by invasions and political events',
      'That language changes organically as communities of speakers unconsciously shift their habits over generations ΓÇö no authority controls it',
      'That someone must have decided to change English pronunciation and the change spread from them',
      'That language only changes when old speakers die and young speakers take different habits',
    ],
    correctIndex: 1,
    explanation: 'The Great Vowel Shift occurred across centuries through millions of small individual choices in how people pronounced words ΓÇö not through any decree or decision. Language is a living system that changes from the bottom up, driven by communities of speakers, not by grammarians or governments. No authority could have stopped it ΓÇö or caused it.',
  },

  // ΓöÇΓöÇΓöÇ entry-sign-language-grammar ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-sign-language-t1',
    entryId: 'entry-sign-language-grammar',
    difficultyTier: 1,
    question: 'Sign languages like American Sign Language (ASL) have grammar just like spoken languages. Which of the following is used in ASL grammar instead of the order of words in a sentence?',
    options: [
      'The speed of the hands',
      'Spatial relationships, movement direction, and facial expressions',
      'The size of the hand movements',
      'Tapping on the left or right side of the body',
    ],
    correctIndex: 1,
    explanation: 'ASL grammar uses three-dimensional space ΓÇö where you sign, how your hands move, and which direction they move ΓÇö to show who is doing what to whom. Facial expressions work like grammar too: a raised eyebrow can turn a statement into a question. Grammar lives in the body, not just in sound.',
  },
  {
    id: 'quiz-sign-language-t2',
    entryId: 'entry-sign-language-grammar',
    difficultyTier: 2,
    question: 'For a long time, many hearing people assumed sign languages were just "signed English" ΓÇö English words translated into hand gestures. Why is this assumption wrong?',
    options: [
      'Because ASL has more words than English',
      'Because sign languages have their own independent grammar systems that are completely different from any spoken language and cannot be reduced to translations of them',
      'Because Deaf people prefer not to use English at all',
      'Because hand gestures are less precise than spoken words',
    ],
    correctIndex: 1,
    explanation: 'ASL grammar operates by fundamentally different rules from English grammar ΓÇö it places topics first, uses space for verb agreement, and has no equivalent in spoken language. Linguist William Stokoe proved in the 1960s that ASL is a complete, independent language, not a visual code for English. Deaf communities had always known this.',
  },
  {
    id: 'quiz-sign-language-t3',
    entryId: 'entry-sign-language-grammar',
    difficultyTier: 3,
    question: 'In the 1980s, deaf children in Nicaragua who had never been exposed to any sign language spontaneously invented a new one together when they were brought to the same schools. What does this prove about grammar?',
    options: [
      'That children can communicate without any language if they need to',
      'That the human brain is innately wired to create grammar ΓÇö given the right social conditions, children will build a full language system from scratch',
      'That the Nicaraguan government secretly taught the children a language before school started',
      'That simple gestures naturally evolve into languages over thousands of years',
    ],
    correctIndex: 1,
    explanation: 'The children had no model to copy ΓÇö no adult sign language, no spoken language they could use. Yet they invented Nicaraguan Sign Language with complex, consistent grammar. Younger children who joined later produced even more grammatically complex forms. This is one of the most powerful proofs of Chomsky\'s idea that grammar is built into the human brain.',
  },
];
