/**
 * Quiz Questions ΓÇö Wellness Garden (Hana Bergstrom)
 * Social-Emotional Learning
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const WELLNESS_GARDEN_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-science-of-sleep ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-science-of-sleep-t1',
    entryId: 'entry-science-of-sleep',
    difficultyTier: 1,
    question: 'What does your brain do while you are sleeping?',
    options: [
      'Nothing ΓÇö it rests completely and turns off',
      'It cleans itself and decides which memories to keep',
      'It grows bigger every night until you are fully grown',
      'It sends signals to your muscles to make you run in your dreams',
    ],
    correctIndex: 1,
    explanation: 'Sleep is anything but doing nothing! While you sleep, fluid flows through your brain like a cleaning crew, washing away waste products. Your brain also replays the day\'s experiences and decides which memories are important enough to store permanently. Hana says: "The garden grows fastest at night." Sleep makes you smarter and healthier, not just less tired.',
  },
  {
    id: 'quiz-science-of-sleep-t2',
    entryId: 'entry-science-of-sleep',
    difficultyTier: 2,
    question: 'Scientists discovered that during sleep, cerebrospinal fluid washes through the brain clearing out waste. Why might this cleaning process matter for long-term health?',
    options: [
      'It doesn\'t matter ΓÇö the waste in the brain is harmless',
      'Some of the waste products cleared during sleep are linked to diseases like Alzheimer\'s, so regular sleep may help protect the brain over a lifetime',
      'The fluid only cleans the outside of the skull, not the brain itself',
      'This process only happens in children, not adults',
    ],
    correctIndex: 1,
    explanation: 'Scientists discovered the brain\'s glymphatic cleaning system in 2012. During sleep, cerebrospinal fluid flushes through narrow channels in the brain, clearing out waste proteins ΓÇö including some linked to Alzheimer\'s disease. This suggests that chronic sleep deprivation isn\'t just making you tired today; it may be allowing harmful waste to accumulate over years. Sleep isn\'t laziness ΓÇö it\'s maintenance work your brain cannot do while you are awake.',
  },
  {
    id: 'quiz-science-of-sleep-t3',
    entryId: 'entry-science-of-sleep',
    difficultyTier: 3,
    question: 'Research shows sleep strengthens memories formed during the day. What does this mean for how you should think about studying or practising a skill?',
    options: [
      'You should study right before bed but not sleep afterward so the information stays fresh',
      'Sleep is irrelevant to learning ΓÇö only the hours spent studying matter',
      'Sleep is an active part of the learning process ΓÇö the brain consolidates and strengthens new learning during rest, so sleeping after practising is as important as the practice itself',
      'You should study for as many hours as possible and only sleep when you have nothing left to learn',
    ],
    correctIndex: 2,
    explanation: 'During REM sleep, the brain replays and strengthens neural connections formed during waking hours. Studies show that people who sleep after learning something retain it far better than those who stay awake. This is not a coincidence ΓÇö it is the mechanism by which learning becomes permanent. Practising a musical piece, solving maths problems, or learning a new language all benefit from the consolidation that only happens during sleep. Hana would say: rest is not separate from work ΓÇö it is part of it.',
  },

  // ΓöÇΓöÇΓöÇ entry-power-of-play ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-power-of-play-t1',
    entryId: 'entry-power-of-play',
    difficultyTier: 1,
    question: 'Why is play important for children\'s brains, according to scientists?',
    options: [
      'Play is just fun ΓÇö it doesn\'t do anything useful for the brain',
      'Play helps the brain build connections and learn how to solve problems and understand other people',
      'Play is only important if it involves toys that are educational',
      'Play is a reward you earn after finishing real work',
    ],
    correctIndex: 1,
    explanation: 'Play is not wasted time ΓÇö it is how brains build the flexible connections needed for creative thinking, problem-solving, and understanding other people. Animals play to rehearse survival skills. Human children play to learn almost everything: how relationships work, how to regulate emotions, how to try new ideas without fear of real consequences. Hana says: "Play IS the work ΓÇö your brain\'s most important kind."',
  },
  {
    id: 'quiz-power-of-play-t2',
    entryId: 'entry-power-of-play',
    difficultyTier: 2,
    question: 'Dr. Stuart Brown studied what happened to young animals who were deprived of play. What did he find?',
    options: [
      'They were healthier because they spent more time resting',
      'They grew up unable to tell the difference between friend and foe and had impaired social skills',
      'They were smarter because they spent more time learning rather than playing',
      'They became more independent and self-sufficient',
    ],
    correctIndex: 1,
    explanation: 'Rats raised without play could not distinguish between friendly and threatening situations as adults ΓÇö they responded with either aggression or panic inappropriately. Brown found this held across species: play-deprived animals consistently showed impaired social and cognitive development. This is not a minor inconvenience; it is the difference between being able to navigate social life or not. Brown compared play deprivation to malnutrition ΓÇö both have serious developmental consequences.',
  },
  {
    id: 'quiz-power-of-play-t3',
    entryId: 'entry-power-of-play',
    difficultyTier: 3,
    question: 'Modern children have significantly less unstructured free play time than children did fifty years ago. Based on what you know about play science, what might be the consequences of this trend?',
    options: [
      'No consequences ΓÇö structured activities are equally good for development',
      'Children today are healthier because structured activities are safer',
      'Reductions in free play may be contributing to difficulties in creativity, emotional regulation, and social problem-solving ΓÇö skills that require practice in low-stakes unstructured environments',
      'The trend doesn\'t matter because children now learn more in school to compensate',
    ],
    correctIndex: 2,
    explanation: 'Free play provides a practice ground that structured activities cannot replicate: children invent the rules, resolve conflicts without adult intervention, take risks, fail safely, and try again. Executive function, empathy, creative problem-solving, and emotional regulation are all built through exactly these experiences. Researchers including Stuart Brown have linked declining free play time to rising rates of anxiety and reduced risk tolerance in children. This makes the case for protecting unstructured play not as a luxury ΓÇö but as a developmental necessity.',
  },

  // ΓöÇΓöÇΓöÇ entry-growth-mindset ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-growth-mindset-t1',
    entryId: 'entry-growth-mindset',
    difficultyTier: 1,
    question: 'What does a "growth mindset" mean?',
    options: [
      'Believing that you are either smart or not smart, and you can\'t change it',
      'Believing that your brain can grow stronger when you work hard and try difficult things',
      'Thinking that only tall people can grow taller',
      'Wanting to be the best at everything all the time',
    ],
    correctIndex: 1,
    explanation: 'A growth mindset means believing that your abilities can grow through effort and learning. Scientists showed that brains literally form new connections when we struggle with challenging things. Mistakes are not proof that you\'re not smart ΓÇö they\'re the moment when your brain is working hardest and growing fastest. The word Hana carved into the garden gate says it all: YET.',
  },
  {
    id: 'quiz-growth-mindset-t2',
    entryId: 'entry-growth-mindset',
    difficultyTier: 2,
    question: 'Researcher Carol Dweck discovered a surprising difference between children praised for being "smart" and children praised for "working hard." What was it?',
    options: [
      'Children praised for being smart did better on every test',
      'There was no difference between the two groups',
      'Children praised for being smart gave up more easily when tasks got hard, while children praised for effort kept trying longer',
      'Children praised for working hard became nervous about making mistakes',
    ],
    correctIndex: 2,
    explanation: 'Dweck\'s research found that children told "you\'re so smart" began to avoid challenges ΓÇö they didn\'t want to risk being seen as not-smart anymore. Children praised for their effort ("you worked really hard") were more willing to take on difficult tasks and persisted longer when things got tough. Why? Because effort is something you can always choose to give. If your identity is built on effort rather than fixed ability, struggle becomes an opportunity, not a threat.',
  },
  {
    id: 'quiz-growth-mindset-t3',
    entryId: 'entry-growth-mindset',
    difficultyTier: 3,
    question: 'Hana says the most powerful word in the whole garden is "yet." How does adding "yet" to "I can\'t do this" change the way your brain thinks about a challenge?',
    options: [
      'It doesn\'t change anything ΓÇö the words mean the same thing',
      '"I can\'t do this yet" is dishonest because some things are impossible',
      '"Yet" transforms the statement from a permanent verdict into a temporary condition, shifting your mindset from closed (this is beyond me) to open (this is ahead of me)',
      '"Yet" only works for easy challenges, not hard ones',
    ],
    correctIndex: 2,
    explanation: '"I can\'t do this" sounds like a final answer ΓÇö an unchangeable fact about who you are. "I can\'t do this yet" places the limitation in time, not in your identity. It implies a trajectory: you\'re not there today, but you can get there. Dweck\'s research shows this distinction has measurable effects on persistence, resilience, and ultimately on what children achieve. The brain responds to the story it believes about itself. The word "yet" tells a different, more accurate story.',
  },

  // ΓöÇΓöÇΓöÇ entry-history-of-empathy ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-history-of-empathy-t1',
    entryId: 'entry-history-of-empathy',
    difficultyTier: 1,
    question: 'What is empathy?',
    options: [
      'Feeling very happy about something great that happened to you',
      'The ability to understand and feel what another person is feeling',
      'Telling someone they should not be sad',
      'Being polite and saying please and thank you',
    ],
    correctIndex: 1,
    explanation: 'Empathy is the ability to step into someone else\'s experience ΓÇö to understand and even feel what they are going through. It is different from sympathy, which is feeling concern for someone from the outside. Empathy means going inside their perspective. Hana says empathy is the most underrated intelligence: not tested in schools, but essential for nearly everything that matters in life.',
  },
  {
    id: 'quiz-history-of-empathy-t2',
    entryId: 'entry-history-of-empathy',
    difficultyTier: 2,
    question: 'Scientists discovered that when you watch someone else experience something, certain brain cells fire as if it is happening to you. What are these cells called?',
    options: [
      'Empathy hormones',
      'Mirror neurons',
      'Sympathy synapses',
      'Feeling fibres',
    ],
    correctIndex: 1,
    explanation: 'Mirror neurons are brain cells that activate both when you perform an action and when you observe someone else doing the same action. When you watch someone stub their toe, neurons fire in your brain that are associated with pain ΓÇö your brain literally rehearses the experience. This neurological "mirroring" is thought to be one of the biological foundations of empathy. Your brain is always practicing what it means to be another person.',
  },
  {
    id: 'quiz-history-of-empathy-t3',
    entryId: 'entry-history-of-empathy',
    difficultyTier: 3,
    question: 'The word "empathy" was only coined in 1909, but the experience is ancient. What does the fact that we needed to name it tell us about empathy\'s role in human development?',
    options: [
      'It means empathy is a new skill that humans recently evolved',
      'It tells us nothing ΓÇö words are just labels',
      'Naming a concept gives us the ability to study it, teach it deliberately, and recognise it as a trainable skill rather than a fixed personality trait ΓÇö which changes how we develop it',
      'It means empathy only became important after 1909',
    ],
    correctIndex: 2,
    explanation: 'Before Theodor Lipps coined "empathy" (from German Einf├╝hlung, "feeling into"), there was no shared scientific term for this capacity. Naming it unlocked the ability to study it rigorously, teach it deliberately, and distinguish between its forms ΓÇö cognitive empathy (understanding another\'s perspective intellectually) and affective empathy (feeling it). Hana\'s key insight is this: because empathy is a trainable skill, everyone can get better at it. That is only possible because we named it and started studying it seriously.',
  },
];
