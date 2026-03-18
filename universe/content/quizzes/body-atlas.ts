/**
 * Quiz Questions ΓÇö Body Atlas (Dr. Emeka Obi)
 * Human Body / Health Science
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const BODY_ATLAS_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-harvey-blood-circulation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-harvey-t1',
    entryId: 'entry-harvey-blood-circulation',
    difficultyTier: 1,
    question: 'Before William Harvey, people believed blood moved through the body like tides. What did Harvey prove instead?',
    options: [
      'That blood was made fresh every day in the liver',
      'That the heart pumps blood in a continuous loop, around and around the body endlessly',
      'That blood only moved when a person was exercising',
      'That different types of blood flowed in different directions through different vessels',
    ],
    correctIndex: 1,
    explanation: 'For 1,400 years, the accepted idea was that blood ebbed and flowed like ocean tides ΓÇö it did not circulate. William Harvey proved that the heart is a pump that drives blood in one continuous loop through the body. He proved it mathematically: measuring the volume of blood per heartbeat showed more blood passes through the heart per hour than exists in the entire body, so it must go around and around.',
  },
  {
    id: 'quiz-harvey-t2',
    entryId: 'entry-harvey-blood-circulation',
    difficultyTier: 2,
    question: 'Harvey\'s discovery contradicted Galen\'s model, which had been accepted for 1,400 years. How did Harvey prove Galen was wrong?',
    options: [
      'He found a reference in an old Greek text that disagreed with Galen',
      'He measured the volume of blood the heart pumps per beat and calculated that the body would have to produce an impossible amount of new blood if it wasn\'t recirculating',
      'He convinced the King of England to declare Galen\'s work invalid',
      'He found a new type of blood vessel that Galen had not described',
    ],
    correctIndex: 1,
    explanation: 'Harvey measured that the heart pumps about 60 millilitres per beat. At 72 beats per minute, the heart moves far more blood per hour than the entire body contains. The only way this is possible is if the same blood goes around in a loop ΓÇö recycled continuously. Harvey trusted his measurements over 1,400 years of inherited authority, and his measurements were right.',
  },
  {
    id: 'quiz-harvey-t3',
    entryId: 'entry-harvey-blood-circulation',
    difficultyTier: 3,
    question: 'Harvey\'s work established the experimental method in medicine. What does "experimental method" mean, and why was it important for medicine?',
    options: [
      'It means running experiments on patients, which was already common in Galen\'s time',
      'It means forming a hypothesis, testing it with careful measurements, and accepting results over inherited authority ΓÇö even when the results contradict what respected experts have said for centuries',
      'It means all medical treatments must be tested in laboratories before use',
      'It was a new way of writing up medical results in a clear format',
    ],
    correctIndex: 1,
    explanation: 'Before Harvey, medical knowledge was largely inherited from ancient authorities like Galen. Harvey insisted on personal observation and measurement ΓÇö he would not accept that something was true just because Galen had said so. "I profess to learn and teach anatomy not from books but from dissections." This approach ΓÇö observe, measure, reason from evidence, update your beliefs ΓÇö is the experimental method, and it transformed medicine from a tradition into a science.',
  },

  // ΓöÇΓöÇΓöÇ entry-jenner-first-vaccine ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-jenner-t1',
    entryId: 'entry-jenner-first-vaccine',
    difficultyTier: 1,
    question: 'What observation led Edward Jenner to invent the vaccine?',
    options: [
      'He noticed that people who had survived plague never got it again',
      'He noticed that milkmaids who got cowpox never caught the deadly disease smallpox',
      'He noticed that farmers who worked outdoors were generally healthier than city people',
      'He noticed that children who drank clean water had fewer fevers',
    ],
    correctIndex: 1,
    explanation: 'Jenner observed that milkmaids ΓÇö who regularly got cowpox, a mild disease from cattle ΓÇö never seemed to catch smallpox, which killed or disfigured millions. He tested this pattern by deliberately giving eight-year-old James Phipps cowpox, then exposing him to smallpox. The boy was protected. One observation from daily life led to a discovery that eventually eliminated smallpox from the Earth.',
  },
  {
    id: 'quiz-jenner-t2',
    entryId: 'entry-jenner-first-vaccine',
    difficultyTier: 2,
    question: 'Smallpox was declared eradicated in 1980 ΓÇö the only human disease in history to be completely eliminated. How was this achieved?',
    options: [
      'A powerful antibiotic medicine was discovered that could cure all cases',
      'A global vaccination programme, tracing back to Jenner\'s cowpox vaccine, protected enough people to stop smallpox from spreading anywhere on Earth',
      'The smallpox virus naturally evolved into a less dangerous form over time',
      'All animals that carried smallpox were removed from areas where humans lived',
    ],
    correctIndex: 1,
    explanation: 'The WHO coordinated a worldwide smallpox vaccination campaign that ran for decades. By vaccinating enough people in every country, the disease could no longer find unprotected hosts to infect ΓÇö it ran out of places to go. On October 26, 1979, the last natural case was recorded in Somalia. In 1980 the WHO declared it eradicated. All of this traces back to Jenner noticing what milkmaids were not catching.',
  },
  {
    id: 'quiz-jenner-t3',
    entryId: 'entry-jenner-first-vaccine',
    difficultyTier: 3,
    question: 'The word "vaccine" comes from the Latin word "vacca" meaning cow. What does this etymological trace reveal about the history of science and medicine?',
    options: [
      'It reveals that cows have been important to human agriculture throughout history',
      'It preserves the origin story directly in the word itself ΓÇö every vaccine given in every clinic carries a linguistic reference to Jenner\'s observation of milkmaids and cowpox, connecting modern medicine to its founding moment',
      'It reveals that Latin was the official language of medicine for centuries',
      'It shows that early scientists chose animal names for all their discoveries',
    ],
    correctIndex: 1,
    explanation: 'Language carries history. Every time a doctor gives a vaccine ΓÇö against flu, measles, COVID-19, anything ΓÇö the word they use comes from a specific cow on a Gloucestershire farm in 1796. Etymology is a kind of archaeology: digging into a word\'s origin uncovers the story of how the knowledge that word names was first created. Jenner\'s cowpox experiment is permanently embedded in the vocabulary of immunology.',
  },

  // ΓöÇΓöÇΓöÇ entry-franklin-photo51-dna ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-photo51-t1',
    entryId: 'entry-franklin-photo51-dna',
    difficultyTier: 1,
    question: 'What did Rosalind Franklin\'s photograph called Photo 51 show for the very first time?',
    options: [
      'The first image of a human cell taken under a microscope',
      'The shape of the DNA molecule ΓÇö the double helix ΓÇö revealed through X-ray crystallography',
      'A photograph of chromosomes inside the nucleus of a cell',
      'The first picture of a virus attacking a human cell',
    ],
    correctIndex: 1,
    explanation: 'Photo 51 was taken by Rosalind Franklin using X-ray crystallography. When X-rays hit a crystal of DNA and scattered, the pattern they made on photographic film revealed the shape of the molecule. The photograph definitively showed DNA\'s famous double-helix structure ΓÇö the twisted ladder shape that carries all genetic information.',
  },
  {
    id: 'quiz-photo51-t2',
    entryId: 'entry-franklin-photo51-dna',
    difficultyTier: 2,
    question: 'Watson and Crick used Photo 51 as the key evidence for their DNA model, without Franklin\'s knowledge. Why could Franklin not receive the Nobel Prize awarded to them in 1962?',
    options: [
      'Franklin had withdrawn her claim to the discovery before 1962',
      'Franklin had died in 1958, and the Nobel Prize cannot be awarded posthumously',
      'The Nobel Committee decided to give the prize only to British scientists',
      'Franklin\'s work was officially classified and could not be cited publicly',
    ],
    correctIndex: 1,
    explanation: 'Rosalind Franklin died of ovarian cancer in 1958 at the age of 37. The Nobel Prize in Physiology or Medicine was awarded to Watson, Crick, and Wilkins in 1962 ΓÇö four years after her death. The Nobel rules do not permit posthumous awards. Franklin never received formal recognition in her lifetime for the photograph that was central to one of the greatest discoveries in the history of biology.',
  },
  {
    id: 'quiz-photo51-t3',
    entryId: 'entry-franklin-photo51-dna',
    difficultyTier: 3,
    question: 'Franklin\'s story raises questions about ethics in research ΓÇö specifically using someone\'s data without their knowledge or permission. Why does scientific credit and attribution matter beyond fairness to the individual?',
    options: [
      'Credit matters only because scientists need recognition to keep their jobs',
      'Accurate attribution ensures the full scientific record is correct, allows future researchers to trace the origins of knowledge, and sustains the trust that makes scientific collaboration possible',
      'Credit is less important than making sure the discovery gets published quickly',
      'Attribution only matters for discoveries that are commercially valuable',
    ],
    correctIndex: 1,
    explanation: 'If Watson and Crick had credited Franklin\'s crystallography work properly, Photo 51\'s role in the discovery would have been part of the scientific record from 1953. Instead, decades of historical correction have been needed. Scientific credit serves the integrity of the entire system: it tells future researchers where knowledge came from, rewards the people who produced evidence, and maintains the trust without which scientists will not share their work. Franklin\'s erasure cost the record its accuracy.',
  },

  // ΓöÇΓöÇΓöÇ entry-human-microbiome ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-microbiome-t1',
    entryId: 'entry-human-microbiome',
    difficultyTier: 1,
    question: 'The Human Microbiome Project discovered something surprising about the bacteria in and on your body. What was it?',
    options: [
      'Your body has almost no bacteria because your immune system destroys them all',
      'Your body contains more bacteria than human cells ΓÇö and most of them help you rather than harm you',
      'Bacteria in your body are responsible for causing all diseases',
      'All the bacteria in your body arrived there when you were a baby and never change',
    ],
    correctIndex: 1,
    explanation: 'The Human Microbiome Project found that the human body hosts trillions of microorganisms ΓÇö including bacteria, fungi, and viruses. The number of microbial cells in and on your body rivals or exceeds the number of your own human cells. Most of these microbes are beneficial: they help digest food, train your immune system, and produce vitamins. You are never alone inside your own skin.',
  },
  {
    id: 'quiz-microbiome-t2',
    entryId: 'entry-human-microbiome',
    difficultyTier: 2,
    question: 'Your gut microbiome can change measurably within 24 hours of changing what you eat. What does this reveal about how the body and its microbial community interact?',
    options: [
      'Diet has no lasting effect on microbiome ΓÇö it always returns to the same state',
      'The microbiome is a dynamic, living community that responds rapidly to its environment ΓÇö what you eat directly shapes the microorganisms living inside you',
      'Gut bacteria only change when you take antibiotics',
      'The microbiome is the same for everyone and does not change throughout life',
    ],
    correctIndex: 1,
    explanation: 'The gut microbiome is not fixed ΓÇö it is a responsive ecosystem. Different foods feed different bacterial communities. A day of eating high-fibre vegetables shifts the balance toward bacteria that digest fibre; a day of high sugar feeds different populations. This responsiveness means daily choices directly shape the living community inside you, which in turn affects your immune function, digestion, and even mood through the gut-brain axis.',
  },
  {
    id: 'quiz-microbiome-t3',
    entryId: 'entry-human-microbiome',
    difficultyTier: 3,
    question: 'The Human Microbiome Project reframes the human body as an ecosystem rather than a single organism. How does this shift in perspective change how we might think about health and medicine?',
    options: [
      'It means medicine should focus entirely on bacteria and ignore human cells',
      'It means that health involves maintaining a balanced community of trillions of organisms, not just treating the human cells ΓÇö making the ecological concept of balance and diversity directly applicable to medicine',
      'It means human beings are not truly individual organisms at all',
      'It shows that all diseases are caused by microbiome imbalances that can be fixed with the right diet',
    ],
    correctIndex: 1,
    explanation: 'Thinking of the body as an ecosystem ΓÇö where health means a diverse, balanced microbial community rather than sterile absence of microbes ΓÇö changes how medicine approaches conditions from allergies to mental health. Disrupting the microbiome (for example with unnecessary antibiotics) can have cascading consequences just like disrupting a forest ecosystem. This ecological lens is one of the most profound shifts in how medicine understands human health in the 21st century.',
  },
];
