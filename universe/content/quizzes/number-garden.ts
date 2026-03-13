/**
 * Quiz Questions — Number Garden (Dottie Chakravarti)
 * Mathematics / Patterns
 *
 * 3 questions per entry, distributed across difficulty tiers:
 *  - Tier 1 question: accessible, concrete, about the person or basic fact
 *  - Tier 2 question: concept connection, why it matters
 *  - Tier 3 question: synthesis, historical depth, cross-world thinking
 */
import type { EntryQuizQuestion } from '../types.js';

export const NUMBER_GARDEN_QUIZZES: readonly EntryQuizQuestion[] = [

  // ─── entry-fibonacci-rabbit-problem ─────────────────────────────────────────
  {
    id: 'quiz-fibonacci-t1',
    entryId: 'entry-fibonacci-rabbit-problem',
    difficultyTier: 1,
    question: 'What was Leonardo of Pisa\'s famous nickname?',
    options: ['Archimedes', 'Fibonacci', 'Euclid', 'Pascal'],
    correctIndex: 1,
    explanation: 'Leonardo of Pisa was called Fibonacci — from "filius Bonacci" (son of Bonaccio). He brought Hindu-Arabic numerals to Europe and posed the famous rabbit problem.',
  },
  {
    id: 'quiz-fibonacci-t2',
    entryId: 'entry-fibonacci-rabbit-problem',
    difficultyTier: 2,
    question: 'What are the next two numbers in the sequence: 1, 1, 2, 3, 5, 8, __, __?',
    options: ['10, 12', '11, 14', '13, 21', '15, 25'],
    correctIndex: 2,
    explanation: 'Each Fibonacci number is the sum of the two before it. 5 + 8 = 13, and 8 + 13 = 21. The sequence grows by adding, not multiplying.',
  },
  {
    id: 'quiz-fibonacci-t3',
    entryId: 'entry-fibonacci-rabbit-problem',
    difficultyTier: 3,
    question: 'Fibonacci brought this sequence to Europe in 1202, but who knew it 1,000 years earlier?',
    options: ['Greek mathematicians in Athens', 'Indian mathematicians (the Virahanka sequence)', 'Chinese astronomers in the Han Dynasty', 'Egyptian architects who built the pyramids'],
    correctIndex: 1,
    explanation: 'Indian mathematicians, particularly Virahanka (c. 700 CE), described the sequence in the context of Sanskrit poetry rhythms. Fibonacci did not invent it — he introduced it to Europe from Arabic mathematics.',
  },

  // ─── entry-zero-invention ───────────────────────────────────────────────────
  {
    id: 'quiz-zero-t1',
    entryId: 'entry-zero-invention',
    difficultyTier: 1,
    question: 'Who wrote the first arithmetic rules for zero as a number?',
    options: ['Pythagoras', 'Brahmagupta', 'Euclid', 'Al-Khwarizmi'],
    correctIndex: 1,
    explanation: 'Brahmagupta, an Indian mathematician, wrote the rules for adding, subtracting, multiplying, and dividing with zero in 628 CE. Before him, zero existed as a placeholder but not as a number you could do math with.',
  },
  {
    id: 'quiz-zero-t2',
    entryId: 'entry-zero-invention',
    difficultyTier: 2,
    question: 'Why is zero considered "the most important invention in mathematics"?',
    options: [
      'Because it made multiplication possible for the first time',
      'Because it enabled place-value notation, algebra, and eventually computing',
      'Because it was the hardest number to carve in stone',
      'Because it replaced Roman numerals',
    ],
    correctIndex: 1,
    explanation: 'Without zero, you cannot write the number 100 (you need a zero to hold the tens and units place). Without zero, algebra and calculus have no origin point. Without zero, computers — which run on binary 0s and 1s — cannot exist.',
  },
  {
    id: 'quiz-zero-t3',
    entryId: 'entry-zero-invention',
    difficultyTier: 3,
    question: 'The word "zero" comes from the Arabic word "sifr." What does sifr mean?',
    options: ['Infinite', 'Circle', 'Empty', 'Origin'],
    correctIndex: 2,
    explanation: '"Sifr" means "empty" in Arabic. It became "cifra" in Italian (meaning a secret code, hence "cipher"), then "zefiro," shortened to "zero." The English word "cipher" and the word "zero" share the same ancestor.',
  },

  // ─── entry-hypatia-alexandria ───────────────────────────────────────────────
  {
    id: 'quiz-hypatia-t1',
    entryId: 'entry-hypatia-alexandria',
    difficultyTier: 1,
    question: 'Hypatia was the first recorded woman to do what?',
    options: [
      'Build a pyramid',
      'Teach mathematics and philosophy publicly',
      'Invent a number system',
      'Write a poem in Greek',
    ],
    correctIndex: 1,
    explanation: 'Hypatia of Alexandria (~350–415 CE) was the first woman in recorded history to make a substantial documented contribution to mathematics and philosophy — and she taught publicly, which was extraordinary for the time.',
  },
  {
    id: 'quiz-hypatia-t2',
    entryId: 'entry-hypatia-alexandria',
    difficultyTier: 2,
    question: 'What kinds of subjects did Hypatia teach in Alexandria?',
    options: [
      'Only poetry and music',
      'Mathematics, astronomy, and philosophy',
      'Latin grammar and rhetoric only',
      'Pottery and architecture',
    ],
    correctIndex: 1,
    explanation: 'Hypatia was a Neoplatonist philosopher who taught mathematics, astronomy, and philosophy. Her students included politicians, governors, and scholars. She edited Ptolemy\'s Almagest and Diophantus\'s Arithmetica — foundational works of ancient mathematics.',
  },
  {
    id: 'quiz-hypatia-t3',
    entryId: 'entry-hypatia-alexandria',
    difficultyTier: 3,
    question: 'Hypatia lived in Alexandria at the same time as which other figure from the Great Archive world?',
    options: [
      'Emperor Yongle',
      'Tim Berners-Lee',
      'Ptolemy I Soter',
      'Euclid, the mathematician — they were contemporaries at the Great Library',
    ],
    correctIndex: 3,
    explanation: 'Hypatia is listed among the scholars associated with the Library of Alexandria in the Great Archive entry. She worked during Alexandria\'s last great intellectual era. (Euclid lived ~300 BCE, several centuries before Hypatia, despite both being in Alexandria — the real cross-world connection is her presence in the Great Library\'s story.)',
  },

  // ─── entry-ada-lovelace-program ─────────────────────────────────────────────
  {
    id: 'quiz-ada-t1',
    entryId: 'entry-ada-lovelace-program',
    difficultyTier: 1,
    question: 'What is Ada Lovelace famous for?',
    options: [
      'Inventing the telephone',
      'Writing the first computer program — 100 years before computers existed',
      'Discovering electricity',
      'Building the first calculator',
    ],
    correctIndex: 1,
    explanation: 'Ada Lovelace wrote the first algorithm for Charles Babbage\'s Analytical Engine in 1843 — a machine that was never built in her lifetime. She saw that a computing machine could do far more than arithmetic.',
  },
  {
    id: 'quiz-ada-t2',
    entryId: 'entry-ada-lovelace-program',
    difficultyTier: 2,
    question: 'Ada Lovelace\'s notes described something no one else had imagined about computing machines. What was it?',
    options: [
      'That they could only do addition and subtraction',
      'That they could only work with numbers already provided',
      'That they could process ANY kind of information — music, language, logical symbols',
      'That they needed a human operator at all times',
    ],
    correctIndex: 2,
    explanation: 'Ada Lovelace saw that Babbage\'s engine could manipulate symbols according to rules — not just numbers. She imagined it composing music and processing any kind of representable data. This is the foundational concept of general-purpose computing.',
  },
  {
    id: 'quiz-ada-t3',
    entryId: 'entry-ada-lovelace-program',
    difficultyTier: 3,
    question: 'Ada Lovelace wrote her program in 1843. Who was her father and why is that ironic to mathematicians?',
    options: [
      'Her father was Isaac Newton — who distrusted algebra',
      'Her father was Lord Byron — the Romantic poet who famously distrusted cold reason',
      'Her father was Charles Babbage — making her collaboration a family project',
      'Her father was Fibonacci — who invented patterns she used in her algorithm',
    ],
    correctIndex: 1,
    explanation: 'Ada Lovelace\'s father was Lord Byron, the Romantic poet. Irony: the Romantic movement celebrated feeling over reason, nature over machines — yet Byron\'s daughter became the first programmer, bridging imagination and mathematics exactly as she showed a computing engine could.',
  },
];
