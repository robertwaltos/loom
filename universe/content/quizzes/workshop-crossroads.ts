/**
 * Quiz Questions ΓÇö Workshop Crossroads (Kenzo Nakamura-Osei)
 * Design Thinking
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const WORKSHOP_CROSSROADS_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-da-vinci-crossroads ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-da-vinci-crossroads-t1',
    entryId: 'entry-da-vinci-crossroads',
    difficultyTier: 1,
    question: 'Leonardo da Vinci is famous as a painter, but what else did he do?',
    options: [
      'He was only a painter ΓÇö that\'s why he\'s famous',
      'He was a painter, inventor, scientist, engineer, musician, and writer all at the same time',
      'He built bridges and roads for the Roman Empire',
      'He invented the printing press and the telescope',
    ],
    correctIndex: 1,
    explanation: 'Leonardo da Vinci is one of the greatest examples of what\'s called a polymath ΓÇö someone who works and creates across many different fields. His notebooks contain more than 7,000 pages covering anatomy, botany, engineering, optics, geology, and art. He designed flying machines 400 years before the first airplane. Kenzo considers him the patron saint of the Workshop Crossroads.',
  },
  {
    id: 'quiz-da-vinci-crossroads-t2',
    entryId: 'entry-da-vinci-crossroads',
    difficultyTier: 2,
    question: 'Da Vinci studied bones, rivers, and flowers before painting them. How did his scientific observation make him a better artist?',
    options: [
      'It didn\'t ΓÇö art and science have nothing to do with each other',
      'It made his paintings more colourful',
      'Understanding how things actually work ΓÇö how muscles move, how water flows ΓÇö allowed him to paint them with accuracy and life that artists who only copied other paintings could not achieve',
      'It made him paint more slowly so he could charge more for his work',
    ],
    correctIndex: 2,
    explanation: 'Da Vinci\'s paintings of water, for example, were based on years of studying how water actually flows ΓÇö the spirals, the eddies, the pull of current. His anatomical studies let him paint human bodies with a structural understanding no artist before him had. He believed you could not truly paint what you did not truly understand. Art and science, for him, were two tools aimed at the same goal: seeing clearly.',
  },
  {
    id: 'quiz-da-vinci-crossroads-t3',
    entryId: 'entry-da-vinci-crossroads',
    difficultyTier: 3,
    question: 'Da Vinci said: "Study the science of art. Study the art of science. Learn how to see." What does this suggest about how the best thinking works?',
    options: [
      'That everyone should become a painter and a scientist at the same time',
      'That art and science are opposites that can balance each other out',
      'That the most powerful understanding comes from moving between disciplines ΓÇö using each one\'s tools and ways of seeing to illuminate the other, rather than staying inside a single specialisation',
      'That art should always be based on scientific measurement',
    ],
    correctIndex: 2,
    explanation: 'Da Vinci\'s insight was that every discipline has blind spots that another discipline can see into. A scientist who studies the mechanics of a bird\'s wing but never thinks about its beauty misses something. An artist who paints a bird without understanding aerodynamics misses something else. The most complete understanding ΓÇö and often the most innovative ideas ΓÇö comes from people who cross those lines deliberately. Kenzo calls this the "crossroads advantage": the most interesting things happen where disciplines meet.',
  },

  // ΓöÇΓöÇΓöÇ entry-bauhaus-art-industry ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-bauhaus-art-industry-t1',
    entryId: 'entry-bauhaus-art-industry',
    difficultyTier: 1,
    question: 'What was special about how the Bauhaus school taught its students?',
    options: [
      'Students only learned painting ΓÇö nothing else was allowed',
      'Students only built machines ΓÇö art was considered a waste of time',
      'Builders, painters, sculptors, and weavers all learned together ΓÇö art and making useful things were taught as one subject',
      'Students studied in silence and were never allowed to talk to each other',
    ],
    correctIndex: 2,
    explanation: 'The Bauhaus, founded in Germany in 1919, believed that separating "fine art" from "making useful things" was a mistake. Painters, architects, weavers, furniture-makers, and typographers all studied together, learned from each other\'s methods, and worked toward a single idea: beautiful, well-made objects that ordinary people could use every day.',
  },
  {
    id: 'quiz-bauhaus-art-industry-t2',
    entryId: 'entry-bauhaus-art-industry',
    difficultyTier: 2,
    question: 'The Bauhaus adopted the principle "form follows function." What does this mean for design?',
    options: [
      'A designed object should look exactly like all other objects',
      'A designed object\'s shape and appearance should grow from what it needs to do ΓÇö not from decoration added on top',
      'Objects should be shaped like flowers and natural forms',
      'Function is less important than how beautiful something looks',
    ],
    correctIndex: 1,
    explanation: '"Form follows function" means the design of an object should emerge from its purpose. A chair that looks impressive but hurts to sit in has failed. A chair that is perfectly comfortable but visually chaotic has also failed ΓÇö because communicating what something is for is part of its function. Bauhaus designers believed good design was not ornament sprinkled on top of engineering; it was engineering and aesthetics solving the same problem together.',
  },
  {
    id: 'quiz-bauhaus-art-industry-t3',
    entryId: 'entry-bauhaus-art-industry',
    difficultyTier: 3,
    question: 'The Nazis closed the Bauhaus in 1933. Many of its teachers fled to the United States, where they taught at universities and design schools. What does this tell us about the relationship between ideas and political power?',
    options: [
      'That when powerful governments destroy schools, the ideas in them are lost forever',
      'That ideas outlast the institutions that house them ΓÇö when driven out, they disperse and often spread further than they would have from a single location',
      'That all good design comes from Germany',
      'That art schools are not politically important',
    ],
    correctIndex: 1,
    explanation: 'The Nazis closed the Bauhaus because its internationalism, modernism, and diverse community conflicted with their ideology. But the school\'s teachers ΓÇö including Moholy-Nagy (who founded a "New Bauhaus" in Chicago) and Josef Albers (who taught at Yale) ΓÇö carried its ideas across the world. The Bauhaus\'s influence on American architecture, graphic design, and art education was arguably greater after its closure than before. Kenzo keeps this in mind: you cannot burn ideas, only buildings.',
  },

  // ΓöÇΓöÇΓöÇ entry-biomimicry ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-biomimicry-t1',
    entryId: 'entry-biomimicry',
    difficultyTier: 1,
    question: 'A Swiss engineer named George de Mestral noticed something stuck to his dog\'s fur after a walk and invented a famous fastener. What did he invent?',
    options: [
      'The zipper',
      'Velcro',
      'The safety pin',
      'A magnetic clasp',
    ],
    correctIndex: 1,
    explanation: 'George de Mestral examined the burrs caught in his dog\'s fur under a microscope and saw tiny hooks that caught on the fur\'s loops. He spent eight years developing a fastener that worked the same way ΓÇö one side with tiny hooks, one side with tiny loops. The result was Velcro. This is biomimicry: copying a solution nature spent millions of years developing. Kenzo keeps a burr and a Velcro strip side by side in the Workshop.',
  },
  {
    id: 'quiz-biomimicry-t2',
    entryId: 'entry-biomimicry',
    difficultyTier: 2,
    question: 'Japan\'s Shinkansen bullet train used to create a very loud boom when it exited tunnels. Engineers solved this by redesigning the train\'s nose. What animal\'s shape did they copy?',
    options: [
      'A shark',
      'A hummingbird',
      'A kingfisher',
      'A cheetah',
    ],
    correctIndex: 2,
    explanation: 'The chief engineer, Eiji Nakatsu, was a birdwatcher. He knew that kingfishers dive from air into water ΓÇö two very different-density mediums ΓÇö without a splash, because their beak is shaped to manage the pressure change smoothly. He redesigned the bullet train\'s nose based on the kingfisher\'s beak. The result: the sonic boom was reduced by 30%, the train used 15% less electricity, and it became 10% faster. One bird beak. Three engineering problems solved.',
  },
  {
    id: 'quiz-biomimicry-t3',
    entryId: 'entry-biomimicry',
    difficultyTier: 3,
    question: 'Janine Benyus said: "Ask nature. She\'s had 3.8 billion years to figure this out." What does this suggest about how engineers and designers should approach new problems?',
    options: [
      'Engineers should stop using technology and return to nature',
      'Before designing from scratch, designers should search for existing natural solutions to the same problem ΓÇö because evolution has already solved many engineering challenges more efficiently than human ingenuity alone',
      'Nature\'s solutions are always better than human ones',
      'Biomimicry only works for simple inventions, not complex technology',
    ],
    correctIndex: 1,
    explanation: 'Evolution is effectively a 3.8-billion-year research and development programme under extreme conditions: only solutions that actually work survive. Bone is stronger per unit weight than most engineered materials. Spider silk outperforms steel for its weight. Termite mounds maintain constant temperature without air conditioning. Benyus\'s insight is that nature is a patent office of tested solutions ΓÇö and consulting it before inventing something new is not laziness, it is wisdom. Biomimicry is now a design methodology taught in engineering and architecture schools worldwide.',
  },

  // ΓöÇΓöÇΓöÇ entry-design-thinking-process ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-design-thinking-t1',
    entryId: 'entry-design-thinking-process',
    difficultyTier: 1,
    question: 'What is the very first step of the design thinking process?',
    options: [
      'Build a prototype as fast as possible',
      'Come up with the best idea right away',
      'Empathize ΓÇö listen to and observe the people who have the problem you want to solve',
      'Test your solution on as many people as possible',
    ],
    correctIndex: 2,
    explanation: 'Design thinking always starts with empathy ΓÇö watching and listening to the people who actually have the problem. Kenzo says: "Watch other people struggle. That\'s where every good design begins." Before you can solve a problem well, you must understand what the problem actually is for the person experiencing it ΓÇö which is often different from what you assume it is. Empathy first, solutions second.',
  },
  {
    id: 'quiz-design-thinking-t2',
    entryId: 'entry-design-thinking-process',
    difficultyTier: 2,
    question: 'In design thinking, building a quick rough model is called "prototyping." Why is it important to prototype early, even before your idea is finished?',
    options: [
      'To show everyone how talented you are',
      'Because a finished product is always better than a rough model',
      'A rough prototype lets you test your idea with real people quickly and cheaply ΓÇö finding flaws while they are still easy and inexpensive to fix',
      'Prototyping is only important if you are designing physical objects',
    ],
    correctIndex: 2,
    explanation: 'A prototype is a way to make an idea testable before you invest too much in it. IDEO, the design firm that popularised design thinking, built a complete prototype shopping cart in five days ΓÇö not to sell it, but to test which ideas worked and which didn\'t. Catching a flaw in a cardboard model costs almost nothing; catching it after manufacturing 10,000 units costs enormously. Kenzo\'s rule: the sooner you test, the cheaper your mistakes.',
  },
  {
    id: 'quiz-design-thinking-t3',
    entryId: 'entry-design-thinking-process',
    difficultyTier: 3,
    question: 'Design thinking is described as a non-linear process ΓÇö you often go back to earlier steps. Why is iteration (going back and trying again) a feature, not a failure?',
    options: [
      'It is actually a failure ΓÇö good designers get it right the first time',
      'Because designers charge more money if they go through more iterations',
      'Each round of testing produces new information that changes your understanding of the problem itself ΓÇö what looks like going backward is actually learning that only becomes visible through failure',
      'Iteration only applies to digital design, not physical objects',
    ],
    correctIndex: 2,
    explanation: 'The design thinking process is deliberately iterative because real problems are rarely what they first appear to be. When you test your solution and it fails, you learn something about the problem you didn\'t know before. That new understanding often sends you back to "define" the problem differently, or "empathize" with a user group you hadn\'t considered. Kenzo documents every failure at the Workshop as "valuable data." The willingness to iterate ΓÇö to treat each failure as a question, not a verdict ΓÇö is what separates iterative design from guessing.',
  },
];
