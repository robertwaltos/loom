/**
 * Quiz Questions ΓÇö Nonfiction Fleet (Captain Birch)
 * Research Skills / Nonfiction Reading
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const NONFICTION_FLEET_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-pliny-natural-history ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-pliny-t1',
    entryId: 'entry-pliny-natural-history',
    difficultyTier: 1,
    question: 'What did Pliny the Elder write in his enormous book Naturalis Historia?',
    options: [
      'A story about a hero who fought sea monsters',
      'Everything anyone knew about the natural world ΓÇö animals, plants, minerals, and stars',
      'A list of all the laws in the Roman Empire',
      'Instructions for building ships and harbours',
    ],
    correctIndex: 1,
    explanation: 'Pliny\'s Naturalis Historia had 37 books and tried to cover all human knowledge of the natural world ΓÇö from elephants to gold mines. It was the first systematic encyclopedia ever written.',
  },
  {
    id: 'quiz-pliny-t2',
    entryId: 'entry-pliny-natural-history',
    difficultyTier: 2,
    question: 'Pliny the Elder died investigating the eruption of Mount Vesuvius in 79 CE. What does this tell us about how he approached nonfiction research?',
    options: [
      'He was reckless and didn\'t care about his safety',
      'He believed that witnessing events first-hand was worth great personal risk',
      'He thought the volcano would not hurt him because he was famous',
      'He was trying to rescue people and got trapped by accident',
    ],
    correctIndex: 1,
    explanation: 'Pliny sailed toward the eruption while everyone else fled. He brought writing materials to record what he saw. His nephew wrote that he believed curiosity and duty required him to observe the event directly. He embodied the researcher\'s commitment to primary evidence.',
  },
  {
    id: 'quiz-pliny-t3',
    entryId: 'entry-pliny-natural-history',
    difficultyTier: 3,
    question: 'Pliny consulted over 2,000 books by more than 100 authors while writing Naturalis Historia. Why does citing sources matter in nonfiction?',
    options: [
      'It makes the book longer and more impressive',
      'It allows readers to check the evidence and lets future researchers build on the work',
      'It proves the author went to school for a long time',
      'Roman law required it for any published book',
    ],
    correctIndex: 1,
    explanation: 'Citing sources means readers can verify claims rather than simply trusting the author. It also means later researchers can follow the trail of evidence further. Pliny\'s practice of naming his sources is one reason his work remained useful to scholars for over a thousand years after his death.',
  },

  // ΓöÇΓöÇΓöÇ entry-wollstonecraft-vindication ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-wollstonecraft-t1',
    entryId: 'entry-wollstonecraft-vindication',
    difficultyTier: 1,
    question: 'What did Mary Wollstonecraft argue in her 1792 book A Vindication of the Rights of Woman?',
    options: [
      'That women should stay home and not read books',
      'That girls deserved the same education as boys',
      'That only wealthy women should go to school',
      'That France had better schools than England',
    ],
    correctIndex: 1,
    explanation: 'Wollstonecraft argued that girls deserved exactly the same education as boys. She used logic and facts to make her case, not just feelings. Her book was furious and brilliant ΓÇö and it changed how people thought about education for ever.',
  },
  {
    id: 'quiz-wollstonecraft-t2',
    entryId: 'entry-wollstonecraft-vindication',
    difficultyTier: 2,
    question: 'Wollstonecraft wrote her entire book in about six weeks. What had made her so angry that she wrote it so fast?',
    options: [
      'A French politician had proposed that girls\' education should be limited to homemaking skills',
      'Her own school had closed down without warning',
      'A famous philosopher had argued women were less intelligent than men',
      'The French Revolution had banned women from voting',
    ],
    correctIndex: 0,
    explanation: 'A French minister named Talleyrand proposed that girls should only learn domestic skills. Wollstonecraft was outraged that the Enlightenment\'s ideals of reason and equality were not being applied to women. She wrote the book in six weeks, fuelled by that outrage.',
  },
  {
    id: 'quiz-wollstonecraft-t3',
    entryId: 'entry-wollstonecraft-vindication',
    difficultyTier: 3,
    question: 'Wollstonecraft used Enlightenment reasoning ΓÇö logic and evidence ΓÇö to argue for women\'s rights. Why is the method of argument almost as important as the conclusion?',
    options: [
      'Because using logic makes books longer and easier to sell',
      'Because an argument based on evidence can be checked and challenged, making it stronger than one based on emotion alone',
      'Because the French government only accepted arguments written in a formal style',
      'Because Enlightenment reasoning was the only kind allowed in print at the time',
    ],
    correctIndex: 1,
    explanation: 'Anyone can claim something is unfair. But Wollstonecraft showed it was unfair using the same tools of reason that Enlightenment thinkers prized ΓÇö and then challenged them to be consistent. An argument built on evidence can be examined, tested, and defended. That is why her book lasted while emotional pamphlets from the same period were forgotten.',
  },

  // ΓöÇΓöÇΓöÇ entry-encyclopedie ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-encyclopedie-t1',
    entryId: 'entry-encyclopedie',
    difficultyTier: 1,
    question: 'Why did the King of France try to ban the Encyclop├⌐die?',
    options: [
      'Because it was too expensive for ordinary people to buy',
      'Because it encouraged people to think for themselves instead of obeying authority',
      'Because it contained mistakes that embarrassed French scientists',
      'Because it was written in a foreign language',
    ],
    correctIndex: 1,
    explanation: 'The Encyclop├⌐die challenged the idea that kings and the Church should decide what people knew and believed. By putting all human knowledge in one place, it suggested anyone could think for themselves. That frightened the authorities, who banned it twice.',
  },
  {
    id: 'quiz-encyclopedie-t2',
    entryId: 'entry-encyclopedie',
    difficultyTier: 2,
    question: 'Diderot used clever cross-references inside the Encyclop├⌐die to sneak forbidden ideas past the censors. What does this tell us about the relationship between knowledge and power?',
    options: [
      'That powerful people always win in the end',
      'That when direct speech is forbidden, writers find indirect ways to share dangerous ideas',
      'That censors were not very educated and could be fooled easily',
      'That cross-references were a legal loophole the king had forgotten to close',
    ],
    correctIndex: 1,
    explanation: 'An innocent article about a hat might cross-reference a radical essay on freedom. Censors checked articles individually but didn\'t follow the links. This shows that determined writers find creative paths around suppression ΓÇö and that the desire to share knowledge is very hard to fully extinguish.',
  },
  {
    id: 'quiz-encyclopedie-t3',
    entryId: 'entry-encyclopedie',
    difficultyTier: 3,
    question: 'The Encyclop├⌐die was contributed to by over 150 writers, including Voltaire and Rousseau. How does gathering many experts to write a shared reference work change what that work can achieve?',
    options: [
      'It makes the book more expensive and harder to produce',
      'It allows the work to cover far more subjects with greater accuracy than any single author could manage alone',
      'It means no single person is responsible for mistakes',
      'It confuses readers who prefer a consistent single voice',
    ],
    correctIndex: 1,
    explanation: 'No single person could master cosmology, surgery, glassblowing, and philosophy equally well. By assembling specialists, Diderot produced a work of genuine depth across every field. This collaborative model ΓÇö many experts, shared purpose ΓÇö later became the model for Wikipedia and modern reference publishing.',
  },

  // ΓöÇΓöÇΓöÇ entry-rachel-carson-silent-spring ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-carson-t1',
    entryId: 'entry-rachel-carson-silent-spring',
    difficultyTier: 1,
    question: 'What was Rachel Carson warning people about in her book Silent Spring?',
    options: [
      'That factories were making too much noise near forests',
      'That a chemical called DDT was killing birds, fish, and insects',
      'That climate change would make springs warmer',
      'That rivers were drying up because of too much farming',
    ],
    correctIndex: 1,
    explanation: 'Carson noticed that birds were disappearing because DDT ΓÇö a pesticide farmers sprayed on crops ΓÇö was building up in food chains and poisoning wildlife. She warned that one day spring might come with no birdsong at all. The title "Silent Spring" refers to that imagined silent future.',
  },
  {
    id: 'quiz-carson-t2',
    entryId: 'entry-rachel-carson-silent-spring',
    difficultyTier: 2,
    question: 'The chemical industry spent a huge amount of money trying to discredit Carson\'s research. What happened when President Kennedy ordered an investigation?',
    options: [
      'The investigation found that Carson had made up some of her evidence',
      'The investigation confirmed that Carson\'s research was accurate',
      'The investigation could not find enough evidence either way',
      'The investigation said DDT was safe and Carson had to apologise',
    ],
    correctIndex: 1,
    explanation: 'Carson\'s research was thorough and based on peer-reviewed science. Kennedy\'s Science Advisory Committee confirmed every major finding. DDT was eventually banned in the United States in 1972, and the EPA was created partly because of her work ΓÇö despite the industry\'s campaign against her.',
  },
  {
    id: 'quiz-carson-t3',
    entryId: 'entry-rachel-carson-silent-spring',
    difficultyTier: 3,
    question: 'Silent Spring showed that DDT accumulates through food chains ΓÇö small creatures eat contaminated food, then bigger creatures eat them, and the poison concentrates at the top. Why does understanding systems matter for solving environmental problems?',
    options: [
      'Because governments can only ban things they fully understand',
      'Because a chemical that seems safe at one level can become deadly when it travels through interconnected living systems',
      'Because scientists need to write long reports before any action can be taken',
      'Because food chains are only studied by specialists, not ordinary citizens',
    ],
    correctIndex: 1,
    explanation: 'Carson\'s insight ΓÇö "in nature, nothing exists alone" ΓÇö was a systems-thinking breakthrough. DDT seemed harmless in small doses at the farm level, but it accumulated as it moved up the food chain, reaching dangerous concentrations in birds of prey. Understanding connections between parts of a system is essential for predicting consequences.',
  },
];
