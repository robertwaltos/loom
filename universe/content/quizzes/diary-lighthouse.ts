/**
 * Quiz Questions ΓÇö Diary Lighthouse (Nadia Volkov)
 * Creative Writing / Journaling
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const DIARY_LIGHTHOUSE_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-anne-frank-diary ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-anne-frank-t1',
    entryId: 'entry-anne-frank-diary',
    difficultyTier: 1,
    question: 'Why did Anne Frank keep a diary while she was in hiding?',
    options: [
      'Her teacher required her to write a diary as part of her schoolwork',
      'She wrote to record her experiences, her feelings, and her hopes for the future during a frightening time',
      'She wanted to leave a map of her hiding place for future historians',
      'Her father told her to write down everything that happened each day',
    ],
    correctIndex: 1,
    explanation: 'Anne Frank wrote because she needed a way to express herself and make sense of her experience ΓÇö living in hiding, cut off from the world, with no way to go outside. Her diary became her confidante, her friend "Kitty," and her way of holding onto her identity during two years of fear and confinement.',
  },
  {
    id: 'quiz-anne-frank-t2',
    entryId: 'entry-anne-frank-diary',
    difficultyTier: 2,
    question: 'Anne Frank actually revised her diary entries with publication in mind after hearing a radio broadcast calling for people to preserve wartime diaries. What does this show about how she thought of her writing?',
    options: [
      'That she was showing off and wanted to be famous',
      'That she understood her diary had value beyond herself ΓÇö that her record of ordinary life under persecution was worth preserving for future readers',
      'That she was trying to make the diary longer so it would be more impressive',
      'That she disagreed with what she had originally written and wanted to change it',
    ],
    correctIndex: 1,
    explanation: 'Revising for a potential audience shows remarkable self-awareness. Anne was simultaneously living a terrifying private life and thinking about how that life might matter to the future. She created two versions of the diary ΓÇö the raw original and a carefully crafted literary revision. Both survive.',
  },
  {
    id: 'quiz-anne-frank-t3',
    entryId: 'entry-anne-frank-diary',
    difficultyTier: 3,
    question: 'Anne\'s most famous line ΓÇö "I still believe, in spite of everything, that people are really good at heart" ΓÇö was written on July 15, 1944, just weeks before she was arrested. How does knowing this context change how we read that sentence?',
    options: [
      'It makes the sentence less meaningful because she was obviously wrong given what happened next',
      'It makes the sentence more extraordinary ΓÇö a teenager maintaining hope in the face of genuine evidence against it, demonstrating the power of writing to sustain the human spirit under extreme conditions',
      'It shows that Anne didn\'t fully understand how dangerous her situation was',
      'It is simply a statement of teenage optimism that any young person might write',
    ],
    correctIndex: 1,
    explanation: 'Anne had been in hiding for two years, knew the Nazis were searching for her, and had already witnessed immense suffering. That she wrote this sentence with full knowledge of what might happen ΓÇö and did happen shortly after ΓÇö makes it one of the most courageous statements in all of literature. Writing helped her hold onto that belief.',
  },

  // ΓöÇΓöÇΓöÇ entry-pepys-diary ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-pepys-t1',
    entryId: 'entry-pepys-diary',
    difficultyTier: 1,
    question: 'Samuel Pepys wrote his diary in a secret code for nine years. When was his diary finally decoded?',
    options: [
      'Just a few years after he died',
      'About 200 years later, in the 1820s',
      'It has never been fully decoded',
      'The code was broken just 50 years after he wrote it',
    ],
    correctIndex: 1,
    explanation: 'Pepys used a shorthand system plus foreign-language words for private matters. It took until the 1820s ΓÇö about 150 years after he stopped writing ΓÇö for scholars to fully decode it. The diary had sat in a library at Cambridge without anyone being able to read its most interesting contents.',
  },
  {
    id: 'quiz-pepys-t2',
    entryId: 'entry-pepys-diary',
    difficultyTier: 2,
    question: 'Pepys described burying his wine and Parmesan cheese in the garden to save them from the Great Fire of London in 1666. Why do these small, personal details make his account of a major historical event valuable?',
    options: [
      'Because historians are mostly interested in what people ate in the 17th century',
      'Because specific, concrete details anchor a historical account in lived experience, making events real and comprehensible in a way that official records cannot',
      'Because Pepys was a food writer as well as a government official',
      'Because the Great Fire only affected kitchens and gardens, not public buildings',
    ],
    correctIndex: 1,
    explanation: 'Official records of the Great Fire list statistics ΓÇö houses burned, deaths recorded. Pepys gives us the smell of smoke, the panic, the absurd decision to save cheese before fleeing. These details bring history to life. A person who buries their Parmesan cheese is a real human being, and a real human being\'s account makes us understand events in a way numbers cannot.',
  },
  {
    id: 'quiz-pepys-t3',
    entryId: 'entry-pepys-diary',
    difficultyTier: 3,
    question: 'Pepys recorded his own failings and embarrassing moments alongside great historical events. Why is self-honesty in a diary more valuable historically than a polished, flattering account?',
    options: [
      'Because historians prefer to read about embarrassing moments rather than achievements',
      'Because honest self-observation records the full range of human experience ΓÇö including the contradictions and failures that make a person real ΓÇö while self-flattery produces a monument rather than a document',
      'Because Pepys wanted future readers to learn from his mistakes',
      'Because embarrassing details are the only parts of a diary that cannot be faked',
    ],
    correctIndex: 1,
    explanation: 'Pepys wrote about his failures, vanities, and conflicts with the same directness he applied to national events. This honesty means we learn more from his diary than we would from a polished memoir. Self-flattery produces hagiography. Honest observation produces history ΓÇö because history is made by complicated humans, not by the heroes we wish they had been.',
  },

  // ΓöÇΓöÇΓöÇ entry-sei-shonagon-pillow-book ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-sei-shonagon-t1',
    entryId: 'entry-sei-shonagon-pillow-book',
    difficultyTier: 1,
    question: 'What is unusual about the format of Sei Sh┼ìnagon\'s Pillow Book, written about 1,000 years ago?',
    options: [
      'It is written in a secret code that still hasn\'t been fully decoded',
      'It mixes diary entries, personal lists, observations, and opinions with no particular order or structure',
      'It is written entirely in the form of letters to a close friend',
      'It tells one very long story from beginning to end without any chapters',
    ],
    correctIndex: 1,
    explanation: 'The Pillow Book is a "zuihitsu" ΓÇö a Japanese form meaning "follow the brush." Sei Sh┼ìnagon wrote whatever occurred to her: diary entries, lists of beautiful things, lists of annoying things, opinions about court life, observations about nature. It has no formal structure because it was written to follow the natural movement of thought.',
  },
  {
    id: 'quiz-sei-shonagon-t2',
    entryId: 'entry-sei-shonagon-pillow-book',
    difficultyTier: 2,
    question: 'One of Sei Sh┼ìnagon\'s famous list sections is "Things that make the heart beat faster." Why might the personal list be a powerful form of writing?',
    options: [
      'Because lists are the easiest form of writing and anyone can make one',
      'Because a carefully observed personal list reveals the exact texture of someone\'s inner life ΓÇö what they notice, value, and feel ΓÇö more precisely than abstract description ever could',
      'Because lists were the only writing form allowed for women at the Heian court',
      'Because lists are quicker to read than prose and busy people prefer them',
    ],
    correctIndex: 1,
    explanation: 'Sei Sh┼ìnagon\'s list of "things that make the heart beat faster" includes the moment when you find a poem you wrote long ago and it still sounds good. That one entry tells us more about her ΓÇö her self-awareness, her standards, her private joys ΓÇö than a paragraph of description could. Lists of specific, genuine observations are portraits in miniature.',
  },
  {
    id: 'quiz-sei-shonagon-t3',
    entryId: 'entry-sei-shonagon-pillow-book',
    difficultyTier: 3,
    question: 'Sei Sh┼ìnagon and Murasaki Shikibu were contemporaries at the same Heian court and disliked each other. Murasaki called Sh┼ìnagon "dreadfully conceited." Yet both produced works that are considered founding texts of Japanese literature. What does their rivalry teach us?',
    options: [
      'That literary genius is more common in competitive environments',
      'That significant creative work and personal disagreement can coexist ΓÇö two very different voices, shaped partly by their differences with each other, can each produce lasting literature',
      'That writers should always be friendly with each other to produce better work',
      'That their rivalry must have been exaggerated by later historians',
    ],
    correctIndex: 1,
    explanation: 'Sh┼ìnagon\'s sharp, witty observations and Murasaki\'s psychological depth were genuinely different temperaments ΓÇö and the contrast between them enriched both works. Their mutual criticism may have sharpened each writer\'s awareness of her own voice. Great literature does not require harmony among its creators.',
  },

  // ΓöÇΓöÇΓöÇ entry-frida-kahlo-diary ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-kahlo-t1',
    entryId: 'entry-frida-kahlo-diary',
    difficultyTier: 1,
    question: 'What made Frida Kahlo\'s diary unusual compared to most diaries?',
    options: [
      'It was written in three different languages all at once',
      'It combined painting, drawing, and words all on the same pages ΓÇö art and writing as one continuous expression',
      'It was written backwards so no one could read it easily',
      'She wrote it on large canvases instead of in a small book',
    ],
    correctIndex: 1,
    explanation: 'Frida Kahlo\'s diary blended vivid watercolour paintings, ink drawings, and written words across the same pages. Some pages are explosions of colour. Some are filled with pain. She never separated her visual art from her writing ΓÇö they were the same voice, speaking at the same time.',
  },
  {
    id: 'quiz-kahlo-t2',
    entryId: 'entry-frida-kahlo-diary',
    difficultyTier: 2,
    question: 'Kahlo suffered from severe chronic pain throughout her life following a bus accident in her youth. Her diary explores this pain directly alongside her art. Why might diary writing be especially valuable for processing intense personal experience?',
    options: [
      'Because doctors often recommend diary writing as a medical treatment for pain',
      'Because giving shape and form to difficult experiences through writing can help transform overwhelming feeling into something that can be examined, understood, and survived',
      'Because writing is easier to do than painting when you are in physical pain',
      'Because Kahlo wanted other people who were in pain to know they were not alone',
    ],
    correctIndex: 1,
    explanation: 'Writing and drawing allowed Kahlo to give her pain a shape outside herself ΓÇö to look at it, name it, and make it into something. This is one of the oldest functions of personal writing: the act of recording experience does not just document it but transforms it, giving the writer some distance and power over what might otherwise be overwhelming.',
  },
  {
    id: 'quiz-kahlo-t3',
    entryId: 'entry-frida-kahlo-diary',
    difficultyTier: 3,
    question: 'Kahlo\'s diary was not published until 1995, forty-one years after her death. Many of the most intimate creative documents in history were not meant for immediate publication. What does this raise about the difference between writing for an audience and writing for oneself?',
    options: [
      'That unpublished writing is always more honest than published writing',
      'That writing purely for oneself produces a different quality of honesty and freedom than writing for an audience ΓÇö and this honesty can become the diary\'s greatest literary value, even if unintended',
      'That Kahlo would not have wanted her diary to be published and it should have been kept private',
      'That the only purpose of personal writing is eventually to be shared with others',
    ],
    correctIndex: 1,
    explanation: 'When Kahlo wrote her diary, she was not performing for readers ΓÇö she was exploring herself. This freedom produced pages of radical honesty that polished published writing rarely achieves. Some of the most illuminating documents in history ΓÇö diaries, letters, private notebooks ΓÇö carry this quality of uncensored truth precisely because the writer never expected an audience.',
  },
];
