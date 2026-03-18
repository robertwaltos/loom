/**
 * Quiz Questions ΓÇö Everywhere (Compass)
 * Meta-Learning & Navigation
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const EVERYWHERE_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-overview-effect ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-overview-effect-t1',
    entryId: 'entry-overview-effect',
    difficultyTier: 1,
    question: 'When astronauts look back at Earth from space, what do they notice is missing that you see on any map of Earth?',
    options: [
      'Oceans ΓÇö Earth looks completely dry from space',
      'Clouds ΓÇö the sky looks empty from outside it',
      'Borders and lines between countries ΓÇö Earth looks like one connected place with no divisions',
      'Mountains ΓÇö everything looks flat from far away',
    ],
    correctIndex: 2,
    explanation: 'From space, there are no lines between countries. No fences, no walls, no borders. Earth looks like a single beautiful marble ΓÇö blue, white, and fragile against the black of space. This is not what maps look like. Many astronauts say this view permanently changed how they thought about nationality, conflict, and the importance of taking care of our shared planet.',
  },
  {
    id: 'quiz-overview-effect-t2',
    entryId: 'entry-overview-effect',
    difficultyTier: 2,
    question: 'Cognitive scientist Frank White named the "Overview Effect" in 1987. What is it?',
    options: [
      'The ability to see very far distances from an airplane',
      'A documented shift in awareness that astronauts experience when viewing Earth from space ΓÇö feelings of interconnection, reduced national identity, and heightened responsibility for the planet',
      'The dizziness astronauts feel during launch',
      'A new theory about how the universe looks from its outer edge',
    ],
    correctIndex: 1,
    explanation: 'The Overview Effect is not just feeling amazed by a beautiful view. Frank White interviewed many astronauts and found consistent, deep changes in their thinking: they felt less tied to their home country, more connected to all humans, and more urgently aware of how fragile and finite Earth is. Edgar Mitchell called it "an explosion of awareness." Compass teaches that sometimes you have to go very far from something to understand it clearly.',
  },
  {
    id: 'quiz-overview-effect-t3',
    entryId: 'entry-overview-effect',
    difficultyTier: 3,
    question: 'The most famous photograph of Earth from space ΓÇö "Earthrise" ΓÇö was taken by astronaut William Anders in 1968. It became one of the most influential environmental photographs in history, helping inspire the first Earth Day in 1970. What does this tell us about how perspective shapes action?',
    options: [
      'That photographs are more important than science',
      'That people only care about the environment when shown pretty pictures',
      'That a single shift in physical vantage point can produce a shift in moral understanding that changes behaviour at a civilisational scale ΓÇö seeing something differently can be as powerful as any argument',
      'That space exploration is mainly valuable for its photography',
    ],
    correctIndex: 2,
    explanation: 'Before Earthrise, environmentalism existed but struggled to convey the urgency and scale of what was at stake. The photograph did what years of scientific argument had not: it made viscerally clear that Earth is one finite, fragile object floating in vast darkness ΓÇö and that there is no backup. The environmental movement accelerated measurably after the image circulated. Compass\'s lesson: changing where you stand changes what you see, and changing what you see changes what you do.',
  },

  // ΓöÇΓöÇΓöÇ entry-wayfinding ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-wayfinding-t1',
    entryId: 'entry-wayfinding',
    difficultyTier: 1,
    question: 'Long before GPS, Polynesian navigators crossed the Pacific Ocean ΓÇö the biggest ocean on Earth. What tools did they use to find their way?',
    options: [
      'Maps and compasses like European sailors',
      'Large telescopes mounted on their boats',
      'The stars, ocean wave patterns, cloud shapes, and the flight paths of birds',
      'They always stayed within sight of land and never crossed open ocean',
    ],
    correctIndex: 2,
    explanation: 'Polynesian navigators were among the greatest sailors in human history. They read the sky like a map ΓÇö memorising hundreds of stars and their positions throughout the year. They felt ocean swells with their bodies to understand direction. They watched which way birds flew at dawn (birds fly toward land to sleep). They interpreted cloud formations that form over islands. No instruments. No GPS. Just extraordinary attention to the natural world.',
  },
  {
    id: 'quiz-wayfinding-t2',
    entryId: 'entry-wayfinding',
    difficultyTier: 2,
    question: 'In 1976, a voyaging canoe called the H┼ìk┼½le╩╗a sailed from Hawaii to Tahiti using only traditional Polynesian navigation ΓÇö no modern instruments. Why was this voyage important?',
    options: [
      'It proved that ancient people were reckless and lucky to survive',
      'It proved that traditional Polynesian navigation was a genuine and sophisticated system of knowledge, not just myth or legend',
      'It was a tourist attraction with no scientific value',
      'It proved that GPS is not always necessary on short voyages',
    ],
    correctIndex: 1,
    explanation: 'For years, some scholars doubted that ancient Polynesians had deliberately navigated the Pacific ΓÇö suggesting their spread across the ocean might have been accidental drift. The H┼ìk┼½le╩╗a voyage, guided by master navigator Mau Piailug, proved that traditional navigation methods were precise, replicable, and capable of crossing thousands of miles of open ocean intentionally. It was not myth ΓÇö it was science, developed over thousands of years of careful observation and oral transmission.',
  },
  {
    id: 'quiz-wayfinding-t3',
    entryId: 'entry-wayfinding',
    difficultyTier: 3,
    question: 'Aboriginal Australian songlines encode geographic, ecological, and spiritual knowledge in songs that function as navigational maps spanning 60,000 years. What does this tell us about the different forms knowledge can take?',
    options: [
      'That songs are less reliable than written maps',
      'That Aboriginal Australians didn\'t have real navigation systems',
      'That knowledge can be encoded in forms ΓÇö song, story, ritual ΓÇö that transmit complex, accurate information across generations without writing, challenging assumptions that written records are the only reliable form of knowledge',
      'That all Indigenous navigation is based on music',
    ],
    correctIndex: 2,
    explanation: 'Western epistemology has often privileged written records as the gold standard of reliable knowledge. Songlines challenge this assumption: they encode precise geographic routes, water source locations, seasonal ecological information, and social boundaries ΓÇö transmitted through oral and performative tradition for 60,000 years. The Australian landscape is mapped in song. This is not primitive ΓÇö it is a different and equally sophisticated technology for preserving and transmitting knowledge. Compass asks: what other forms of knowing have we dismissed because they didn\'t look like a textbook?',
  },

  // ΓöÇΓöÇΓöÇ entry-liminal-spaces ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-liminal-spaces-t1',
    entryId: 'entry-liminal-spaces',
    difficultyTier: 1,
    question: 'What does it mean for a space or moment to be "liminal"?',
    options: [
      'Very large and open, like an outdoor field',
      'Very small and cosy, like a reading nook',
      'In-between ΓÇö neither fully one thing nor the other, like a doorway between inside and outside',
      'Very old, like a historical building',
    ],
    correctIndex: 2,
    explanation: 'Liminal comes from the Latin word "limen," meaning threshold or doorway. A liminal space or moment is one that is between two states ΓÇö not quite here, not quite there. A doorway is liminal. Dawn and dusk are liminal (not quite day, not quite night). The feeling of being almost-asleep but not yet is liminal. These in-between states feel different from settled ones ΓÇö and Compass thinks that\'s where the most interesting things happen.',
  },
  {
    id: 'quiz-liminal-spaces-t2',
    entryId: 'entry-liminal-spaces',
    difficultyTier: 2,
    question: 'Anthropologist Victor Turner studied rites of passage ΓÇö ceremonies that mark major life transitions like becoming an adult. He found that every rite of passage has a liminal phase. What happens during this phase?',
    options: [
      'Nothing ΓÇö participants wait quietly until the ceremony ends',
      'Participants are between identities: they have left their old role behind but have not yet taken on their new one ΓÇö a time of transformation and possibility',
      'Participants receive gifts and celebrate their new status',
      'Participants are tested to see if they deserve to move to the next stage',
    ],
    correctIndex: 1,
    explanation: 'Turner found that rites of passage in cultures worldwide share a structure: separation from the old role, a liminal "betwixt and between" phase, and incorporation into the new role. During the liminal phase, the normal rules of society are suspended. Old hierarchies dissolve. People in the liminal phase are vulnerable but also free ΓÇö open to genuine transformation in a way that settled people are not. Turner called this the most creative and dangerous phase of any transition.',
  },
  {
    id: 'quiz-liminal-spaces-t3',
    entryId: 'entry-liminal-spaces',
    difficultyTier: 3,
    question: 'The Japanese concept of ma (Θûô) celebrates the space between things ΓÇö the pause in music, the empty space in a painting, the silence between words ΓÇö as meaningful in itself. What does this perspective challenge about how we usually think about value?',
    options: [
      'It challenges the idea that Japanese art is minimalist',
      'It challenges the assumption that value resides only in content and presence ΓÇö suggesting that absence, pause, and transition are equally important parts of meaning',
      'It challenges the idea that silence is always comfortable',
      'It challenges the way Western artists use colour',
    ],
    correctIndex: 1,
    explanation: 'Western aesthetics has traditionally focused on what is present: the content of a painting, the notes in a melody, the words in a sentence. Ma insists that what is absent ΓÇö the space between ΓÇö carries equal weight. A musical phrase\'s meaning is shaped by the silence before and after it. A painting\'s focal point is defined by what surrounds it. Architectural transitions change how you experience the room you arrive in. Compass applies this to learning: what you do between lessons ΓÇö the pauses, the wandering, the unstructured time ΓÇö is not empty. It is the space where understanding settles.',
  },

  // ΓöÇΓöÇΓöÇ entry-being-lost ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-being-lost-t1',
    entryId: 'entry-being-lost',
    difficultyTier: 1,
    question: 'Writer Rebecca Solnit says that getting lost is not just a problem ΓÇö it can be valuable. Why?',
    options: [
      'Because getting lost is fun and you should do it as often as possible',
      'Because when you don\'t know where you are, your brain wakes up ΓÇö you notice more, question more, and discover things you never would have found on the planned route',
      'Because finding your way home makes you feel smart',
      'Because maps are often wrong and you need to check them by getting lost first',
    ],
    correctIndex: 1,
    explanation: 'Solnit\'s insight is that disorientation is not purely negative ΓÇö it is also productive. When you know exactly where you are and where you\'re going, your brain is on autopilot. When you\'re lost, everything wakes up: you notice your surroundings intensely, question your assumptions, and become genuinely open to unexpected discoveries. Compass was "born lost" and considers this a gift, not a flaw.',
  },
  {
    id: 'quiz-being-lost-t2',
    entryId: 'entry-being-lost',
    difficultyTier: 2,
    question: 'Scientists studying the brain found that spatial uncertainty ΓÇö not knowing where you are ΓÇö activates specific neural responses. Which of these describes what happens?',
    options: [
      'The brain shuts down non-essential systems to conserve energy',
      'The brain becomes anxious and stops forming memories',
      'The brain\'s orienting response activates heightened attention and increased memory formation ΓÇö the same state associated with learning and creative problem-solving',
      'The brain only activates fear responses, with no positive effects',
    ],
    correctIndex: 2,
    explanation: 'The brain\'s orienting response ΓÇö a neurological alert triggered by novelty and uncertainty ΓÇö heightens attention, accelerates memory formation, and activates creative thinking. It is the same state that makes learning most effective. Being lost, neurologically, puts the brain into exactly the mode it needs for genuine discovery. This is why Compass\'s entire world is designed without predetermined paths: the disorientation is the lesson.',
  },
  {
    id: 'quiz-being-lost-t3',
    entryId: 'entry-being-lost',
    difficultyTier: 3,
    question: 'Compass refuses to give directions and always answers "where do you want to go?" with "where do you think you need to be?" What philosophy of learning is Compass expressing?',
    options: [
      'That guides should be unhelpful to make learning harder',
      'That children should never ask adults for help',
      'That genuine learning requires the learner to develop their own orientation ΓÇö a guide who gives all the answers prevents the productive disorientation that is the foundation of deep understanding',
      'That Compass doesn\'t know the answers and is pretending',
    ],
    correctIndex: 2,
    explanation: 'Compass\'s refusal to give directions is a pedagogical stance, not laziness. Solnit\'s insight ΓÇö that being lost is how we find things we weren\'t looking for ΓÇö applies directly to learning. A student who is told every answer never develops the capacity to navigate independently. The discomfort of not-knowing, held safely, is where genuine understanding develops: you have to construct the map yourself to actually know the territory. Compass provides questions, not coordinates, because questions develop navigators while coordinates only move passengers.',
  },
];
