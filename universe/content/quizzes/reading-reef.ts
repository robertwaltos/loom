/**
 * Quiz Questions ΓÇö The Reading Reef (Oliver Marsh)
 * Reading Comprehension
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const READING_REEF_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-silent-reading ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-silent-reading-t1',
    entryId: 'entry-silent-reading',
    difficultyTier: 1,
    question: 'How did people read books before silent reading became common?',
    options: [
      'They looked at pictures instead of words',
      'They read out loud, even when they were completely alone',
      'They had someone else read to them',
      'They only read a few words at a time with long breaks',
    ],
    correctIndex: 1,
    explanation: 'For most of human history, reading was a spoken activity ΓÇö even when a person was reading by themselves. Libraries were noisy places full of people reading aloud. When St. Augustine saw Bishop Ambrose reading silently in 370 CE, he found it so unusual that he wrote about it in his famous book, the Confessions.',
  },
  {
    id: 'quiz-silent-reading-t2',
    entryId: 'entry-silent-reading',
    difficultyTier: 2,
    question: 'Silent reading made it possible to have thoughts that no one else could hear. Why was this a big change for human society?',
    options: [
      'Because it meant people could read faster and finish more books',
      'Because it created a private space inside the mind where ideas could be explored without anyone else knowing',
      'Because it was quieter and more polite in public places',
      'Because it made books cheaper to produce',
    ],
    correctIndex: 1,
    explanation: 'Before silent reading, thoughts that came from books were always spoken aloud ΓÇö available to anyone nearby. Silent reading created an entirely private intellectual world. Historians link this to the development of individual consciousness and the idea of personal belief ΓÇö ideas you could hold and examine inside your own mind.',
  },
  {
    id: 'quiz-silent-reading-t3',
    entryId: 'entry-silent-reading',
    difficultyTier: 3,
    question: 'Neuroscientists now know that silent reading and reading aloud recruit different brain pathways. Silent reading enables faster processing and deeper internal reflection. What does this suggest about how our tools for reading can shape how we think?',
    options: [
      'That reading aloud is always inferior and should be discouraged',
      'That the medium through which we engage with text affects the quality and character of the thinking it produces',
      'That silent reading was inevitable once writing was invented',
      'That brain pathways are fixed and cannot be changed by practice',
    ],
    correctIndex: 1,
    explanation: 'The shift from oral to silent reading was not just a change in manners ΓÇö it was a cognitive revolution. Different reading modes engage different mental processes, producing different kinds of thought. This principle applies broadly: the tools we use to think with ΓÇö books, conversations, computers ΓÇö shape the thoughts we are able to have.',
  },

  // ΓöÇΓöÇΓöÇ entry-braille-underwater-library ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-reef-braille-t1',
    entryId: 'entry-braille-underwater-library',
    difficultyTier: 1,
    question: 'How old was Louis Braille when he invented his tactile reading system?',
    options: [
      'He was 40 years old',
      'He was 25 years old',
      'He was 15 years old',
      'He was 60 years old',
    ],
    correctIndex: 2,
    explanation: 'Louis Braille invented the Braille system at age 15. He adapted a military "night writing" code designed for soldiers to read in the dark without making noise. He was blind himself, having lost his sight as a young child, and understood exactly what blind readers needed.',
  },
  {
    id: 'quiz-reef-braille-t2',
    entryId: 'entry-braille-underwater-library',
    difficultyTier: 2,
    question: 'Louis Braille\'s system allows blind and visually impaired people to read by touch rather than sight. What important idea does this demonstrate about how we design things?',
    options: [
      'That everything should be built twice ΓÇö once for sighted people and once for blind people',
      'That accessibility is a design principle that should be built in from the start, not added on afterwards',
      'That touch is always a better way to read than sight',
      'That only specialists should design tools for people with disabilities',
    ],
    correctIndex: 1,
    explanation: 'Before Braille, blind people had very limited access to written knowledge. Braille\'s system demonstrated that if you design for different ways of experiencing the world, you can make knowledge available to everyone. This principle ΓÇö called Universal Design ΓÇö means building things so all people can use them without special adaptation.',
  },
  {
    id: 'quiz-reef-braille-t3',
    entryId: 'entry-braille-underwater-library',
    difficultyTier: 3,
    question: 'Braille transformed what written communication looks like ΓÇö moving it from visual patterns to tactile patterns of raised dots. What does this transformation tell us about the nature of written language itself?',
    options: [
      'That written language is really just a visual code and cannot exist in other forms',
      'That language is fundamentally about conveying meaning, and the physical medium ΓÇö sight, touch, or even sound ΓÇö is a delivery system, not the message',
      'That Braille is a different language from written English',
      'That only languages with simple alphabets can be converted to tactile form',
    ],
    correctIndex: 1,
    explanation: 'Braille encodes the same meaning as printed text ΓÇö it is the same language in a different physical form. This reveals that written language is a system of meaning, and the physical medium (ink marks, raised dots, pixels on a screen) is just the container. Understanding can travel through any channel that reliably delivers information.',
  },

  // ΓöÇΓöÇΓöÇ entry-public-library ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-library-t1',
    entryId: 'entry-public-library',
    difficultyTier: 1,
    question: 'What made the first free public library, which opened in 1833 in New Hampshire, different from earlier libraries?',
    options: [
      'It had more books than any other library in the world',
      'It was free for anyone to use, whether they were rich or poor',
      'It was open twenty-four hours a day',
      'It was the first library to have a children\'s section',
    ],
    correctIndex: 1,
    explanation: 'Before free public libraries, you had to pay a membership fee to borrow books. The first true public library ΓÇö funded by taxes ΓÇö was free to everyone. This was a radical idea: that access to knowledge should not depend on how much money you had.',
  },
  {
    id: 'quiz-library-t2',
    entryId: 'entry-public-library',
    difficultyTier: 2,
    question: 'Andrew Carnegie, a very wealthy steel manufacturer, paid to build 2,509 libraries around the world. Why might a very rich person spend so much money giving knowledge away for free?',
    options: [
      'He wanted his name on buildings so people would remember him',
      'He believed that wealth created through society should be returned to society, and that access to knowledge was one of the best investments for the public good',
      'He owned a publishing company and wanted to sell more books',
      'He was required by law to give away a portion of his profits',
    ],
    correctIndex: 1,
    explanation: 'Carnegie believed that wealthy people had a responsibility to use their fortunes for the public benefit. He considered libraries the best investment because they gave individuals the tools to improve their own lives through education. He said that a man who dies rich dies in disgrace.',
  },
  {
    id: 'quiz-library-t3',
    entryId: 'entry-public-library',
    difficultyTier: 3,
    question: 'The free public library is one of the most democratic institutions ever created. Unlike schools (which require enrollment), it offers unconditional access. Why does the difference between "conditional" and "unconditional" access to knowledge matter for society?',
    options: [
      'Because unconditional access means anyone can borrow a book without being judged or evaluated',
      'Because when knowledge access is conditional, only those who meet the conditions ΓÇö often wealthy or connected people ΓÇö can benefit, which concentrates power rather than distributing it',
      'Because public libraries are cheaper to run than schools',
      'Because unconditional access means libraries never have to refuse anyone a card',
    ],
    correctIndex: 1,
    explanation: 'When access to knowledge requires meeting conditions ΓÇö paying fees, passing entrance exams, having the right connections ΓÇö it excludes many people. Free, unconditional library access means that a child with no resources has the same access to ideas as a child from a wealthy family. This distributes opportunity in a way that reinforces democratic equality.',
  },

  // ΓöÇΓöÇΓöÇ entry-speed-reading-limits ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-speed-reading-t1',
    entryId: 'entry-speed-reading-limits',
    difficultyTier: 1,
    question: 'What do scientists say about reading very fast?',
    options: [
      'That faster reading always means better understanding',
      'That above a certain speed, reading faster means understanding less',
      'That anyone can learn to read thousands of words per minute without losing meaning',
      'That speed reading is a natural skill that some people are born with',
    ],
    correctIndex: 1,
    explanation: 'Scientists have found that there are biological limits to how fast the brain can process the meaning of words. Above a certain speed, you may see words without truly understanding them. Oliver teaches that comprehension ΓÇö really understanding and connecting ideas ΓÇö matters far more than speed.',
  },
  {
    id: 'quiz-speed-reading-t2',
    entryId: 'entry-speed-reading-limits',
    difficultyTier: 2,
    question: 'Evelyn Wood popularised speed reading in the 1950s, claiming people could read thousands of words per minute. Why were her claims later questioned by researchers?',
    options: [
      'Because she had been paid by book publishers to make people read more books',
      'Because studies showed that at very high reading speeds, comprehension falls sharply ΓÇö readers see words but cannot fully process their meaning',
      'Because her method used physical eye exercises that turned out to be harmful',
      'Because the tests she used were invented by her own company',
    ],
    correctIndex: 1,
    explanation: 'Reading is constrained by how long the eye needs to fixate on text and how fast the brain processes language ΓÇö and both have real biological limits. Research consistently showed that people trained in speed reading understood far less of what they read. Skimming is a real skill, but deep comprehension requires time.',
  },
  {
    id: 'quiz-speed-reading-t3',
    entryId: 'entry-speed-reading-limits',
    difficultyTier: 3,
    question: 'Oliver Marsh says: "I would rather understand one book deeply than skim one hundred." What does this value ΓÇö depth over quantity ΓÇö tell us about what reading is actually for?',
    options: [
      'That reading slowly is always better and reading quickly is always wrong',
      'That the purpose of reading is not to accumulate information like a list, but to genuinely engage with ideas so they can change how you think',
      'That books are too expensive to rush through',
      'That only professional readers need to read carefully',
    ],
    correctIndex: 1,
    explanation: 'If you skim one hundred books, you may remember very little from any of them. If you read one book deeply ΓÇö pausing to think, questioning the ideas, connecting them to what you already know ΓÇö those ideas can genuinely alter how you see the world. The goal of reading is not information collection; it is understanding.',
  },
];
