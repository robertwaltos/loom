/**
 * Quiz Questions ΓÇö Circuit Marsh (Kofi Amponsah)
 * Electricity / Circuits
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const CIRCUIT_MARSH_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-franklin-kite ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-franklin-kite-t1',
    entryId: 'entry-franklin-kite',
    difficultyTier: 1,
    question: 'What did Benjamin Franklin prove with his kite experiment in 1752?',
    options: [
      'That kites could fly in any weather',
      'That lightning is a form of electricity',
      'That metal attracts rain clouds',
      'That thunderstorms produce heat',
    ],
    correctIndex: 1,
    explanation: 'Franklin attached a metal key to his kite string and flew it in a thunderstorm. Electrical charge from the storm traveled down the wet string, and when he touched the key he felt a spark. This proved that lightning is electrical ΓÇö not divine punishment or mysterious fire from the sky, but ordinary electricity on a massive scale.',
  },
  {
    id: 'quiz-franklin-kite-t2',
    entryId: 'entry-franklin-kite',
    difficultyTier: 2,
    question: 'After proving lightning was electrical, Franklin immediately invented the lightning rod. How does a lightning rod protect a building?',
    options: [
      'It repels lightning so that it never strikes the building at all',
      'It gives lightning a safe metal path to follow down to the ground, redirecting its energy harmlessly',
      'It absorbs the lightning\'s energy and stores it as useful electricity',
      'It creates a magnetic field that deflects the electrical charge sideways',
    ],
    correctIndex: 1,
    explanation: 'Franklin reasoned that if lightning is electricity seeking a path to the ground, you can provide a better path. A lightning rod ΓÇö a metal spike on a high point connected by wire to the earth ΓÇö gives the lightning somewhere to go. Instead of blasting through a wooden roof, the charge flows safely down the wire and disperses into the ground. It has protected buildings and ships for over 270 years.',
  },
  {
    id: 'quiz-franklin-kite-t3',
    entryId: 'entry-franklin-kite',
    difficultyTier: 3,
    question: 'Church authorities initially opposed lightning rods because they believed lightning was divine punishment. What does this conflict between Franklin\'s invention and religious objection reveal about how science and society interact?',
    options: [
      'Religious people are always wrong when they disagree with scientists',
      'New scientific knowledge sometimes challenges deeply held beliefs about natural events ΓÇö and the practical evidence (protected buildings vs. burned ones) eventually reshapes public understanding',
      'Franklin should have kept his invention secret to avoid conflict',
      'Science and religion always agree once scientists explain themselves clearly enough',
    ],
    correctIndex: 1,
    explanation: 'When lightning rods were introduced, some religious authorities argued that intervening in God\'s punishment was impious. But buildings with lightning rods repeatedly survived storms while unprotected churches burned. The practical, observable difference eventually shifted opinion ΓÇö not abstract argument, but accumulated evidence visible to everyone. Science changes society most effectively through demonstrated outcomes.',
  },

  // ΓöÇΓöÇΓöÇ entry-volta-battery ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-volta-t1',
    entryId: 'entry-volta-battery',
    difficultyTier: 1,
    question: 'Alessandro Volta built the first battery to settle a scientific argument. What was the argument about?',
    options: [
      'Whether electricity could travel through water',
      'Whether electricity came from biology (frogs\' legs) or from two different metals touching',
      'Whether lightning and static electricity were the same thing',
      'Whether electricity could make light',
    ],
    correctIndex: 1,
    explanation: 'Luigi Galvani believed electricity came from living creatures ΓÇö he called it "animal electricity" because frog legs twitched when touched with metal. Volta disagreed: he thought dissimilar metals were creating the electricity, and the frog\'s leg was just conducting it. His voltaic pile ΓÇö stacked metal discs separated by brine-soaked cloth ΓÇö produced steady electrical current without any biology at all, proving Volta right.',
  },
  {
    id: 'quiz-volta-t2',
    entryId: 'entry-volta-battery',
    difficultyTier: 2,
    question: 'Volta\'s voltaic pile was the first device to produce sustained electrical current. Why was sustained current so much more useful than static electricity from a friction machine?',
    options: [
      'Static electricity is stronger and therefore more dangerous to experiment with',
      'Sustained current flows continuously and can power devices, light bulbs, and experiments that require a steady supply of electricity ΓÇö a single spark cannot',
      'Volta\'s battery produced electricity without any sparks, which was safer in laboratories',
      'Sustained current travels faster than static electricity',
    ],
    correctIndex: 1,
    explanation: 'Static electricity from friction machines produced a single powerful discharge ΓÇö like a flash. Volta\'s battery produced a steady, controllable flow of current. This meant electricity could run through a circuit continuously, powering experiments, heating wires, and later lighting bulbs and running motors. The battery transformed electricity from a laboratory curiosity into a practical tool that eventually changed the world.',
  },
  {
    id: 'quiz-volta-t3',
    entryId: 'entry-volta-battery',
    difficultyTier: 3,
    question: 'The unit of electrical potential is named the "volt" after Volta. Every phone charger in the world displays a voltage rating. What does it mean that a scientist\'s name lives on in everyday technology?',
    options: [
      'Nothing ΓÇö it is just a naming convention with no deeper meaning',
      'It shows how foundational scientific discoveries embed themselves permanently into the infrastructure of daily life ΓÇö the work of one scientist in 1800 runs invisibly through the technology of billions of people today',
      'It means Volta\'s descendants receive royalties every time someone charges their phone',
      'Naming measurements after scientists is how governments reward important work',
    ],
    correctIndex: 1,
    explanation: 'Volta died in 1827, but his discovery is present in every circuit built since. Every time a device specifies "5 volts" or "12 volts," it is acknowledging that Volta identified the fundamental property of electrical potential that makes circuits work. Scientific discoveries become infrastructure ΓÇö they disappear from view precisely because they are so foundational. The best way to understand how science shapes the world is to notice all the invisible work it does.',
  },

  // ΓöÇΓöÇΓöÇ entry-edison-latimer-lightbulb ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-latimer-t1',
    entryId: 'entry-edison-latimer-lightbulb',
    difficultyTier: 1,
    question: 'Early light bulbs made by Edison\'s team burned out after only a few hours. Who figured out how to make a filament that would last for weeks?',
    options: [
      'Thomas Edison himself, after 10,000 more experiments',
      'Lewis Latimer, a Black engineer who taught himself technical drawing',
      'A team of European scientists working separately',
      'A factory worker who discovered the solution by accident',
    ],
    correctIndex: 1,
    explanation: 'Lewis Latimer invented an improved carbon filament that made light bulbs last for weeks instead of hours. Without this improvement, electric lighting would have remained impractical. Latimer also wrote the 1890 technical book that became the industry standard for installing electrical lighting systems ΓÇö making him essential not just to the invention but to the entire industry that followed.',
  },
  {
    id: 'quiz-latimer-t2',
    entryId: 'entry-edison-latimer-lightbulb',
    difficultyTier: 2,
    question: 'Lewis Latimer\'s contributions were largely uncredited during his lifetime. Why does it matter that we learn about his role now?',
    options: [
      'It doesn\'t matter ΓÇö inventors of the past can\'t benefit from being recognised today',
      'Historical credit shapes who children see as capable of contributing to science ΓÇö and accurate history shows that innovation has always been collaborative and diverse',
      'Latimer\'s family should receive compensation from the lightbulb industry',
      'It\'s only important for Black children, not for everyone',
    ],
    correctIndex: 1,
    explanation: 'When children learn that great inventions were made solely by one famous person, they absorb a distorted picture of how innovation actually happens. Latimer\'s story ΓÇö a self-taught Black engineer whose work made Edison\'s invention commercially viable ΓÇö shows that progress depends on many contributors, and that historical credit is not always distributed fairly. Telling the full story helps everyone see themselves as potential scientists and engineers.',
  },
  {
    id: 'quiz-latimer-t3',
    entryId: 'entry-edison-latimer-lightbulb',
    difficultyTier: 3,
    question: 'Latimer\'s technical drawings were used as evidence in patent disputes that Edison\'s team won. What does Latimer\'s position ΓÇö technically essential yet largely unrecognised ΓÇö reveal about innovation and credit in the 19th century?',
    options: [
      'Patent law in the 19th century was perfectly fair to all inventors regardless of race',
      'Structural barriers of race and class meant that some contributors\' work was systematically used without credit ΓÇö the technical necessity of a person\'s contributions did not guarantee recognition in a society with deep inequalities',
      'Latimer chose to work anonymously because he preferred privacy',
      'Edison always tried to share credit but was prevented by his investors',
    ],
    correctIndex: 1,
    explanation: 'Latimer\'s technical skills were so valued that he was brought in to defend Edison\'s patents ΓÇö yet he was one of the very few Black members of the Edison Pioneers and his contributions went largely unacknowledged in public history for decades. His story demonstrates that the mechanisms of historical credit are shaped by the social structures of their time. Understanding this doesn\'t diminish Edison ΓÇö it enriches the full, accurate story of how the lightbulb actually changed the world.',
  },

  // ΓöÇΓöÇΓöÇ entry-solar-panel ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-solar-panel-t1',
    entryId: 'entry-solar-panel',
    difficultyTier: 1,
    question: 'How does a solar panel make electricity?',
    options: [
      'It stores heat from the sun and converts it to electricity at night',
      'Sunlight hitting certain materials causes electricity to flow directly ΓÇö with no moving parts, no fuel, and no noise',
      'It heats water into steam, which spins a generator',
      'It collects solar wind particles and converts them to electrical charge',
    ],
    correctIndex: 1,
    explanation: 'Solar panels use the photovoltaic effect: when light hits certain materials (like silicon), it gives energy to electrons and makes them flow as electric current. There are no moving parts and no fuel needed ΓÇö just sunlight. Kofi\'s Solar Clearing in Circuit Marsh runs entirely on this principle.',
  },
  {
    id: 'quiz-solar-panel-t2',
    entryId: 'entry-solar-panel',
    difficultyTier: 2,
    question: 'The first practical solar cells were invented at Bell Labs in 1954 and were far too expensive for most people. Since then, solar prices have dropped 99.6%. What drove such a dramatic cost reduction?',
    options: [
      'Scientists discovered a much cheaper material to replace silicon',
      'Manufacturing scale, materials science improvements, and international competition drove prices down over decades',
      'Governments subsidised solar panels to make them free for everyone',
      'The sun became brighter over time, making older panels more efficient',
    ],
    correctIndex: 1,
    explanation: 'As more solar panels were manufactured, factories improved their processes and reduced waste. Materials science made cells more efficient. Competition between manufacturers in many countries pushed prices lower. This pattern ΓÇö where a technology starts expensive and becomes affordable through scale and learning ΓÇö is called a learning curve. Solar is one of the steepest in history: a 99.6% cost drop in 70 years.',
  },
  {
    id: 'quiz-solar-panel-t3',
    entryId: 'entry-solar-panel',
    difficultyTier: 3,
    question: 'The sun delivers more energy to Earth\'s surface in one hour than humanity uses in an entire year. Why, given this abundance, has solar energy taken so long to become widely used?',
    options: [
      'The technology was kept secret by oil companies for decades',
      'Abundance of supply is not the same as ease of collection ΓÇö the challenge was cost, storage, infrastructure, and converting sunlight into the right form of usable energy efficiently',
      'Solar energy doesn\'t work in cloudy countries, which is where most people live',
      'Solar panels require rare materials that cannot be found on Earth',
    ],
    correctIndex: 1,
    explanation: 'The sun\'s energy is abundant, diffuse, and intermittent ΓÇö it arrives spread across enormous areas and only when the sky is clear. Collecting it required affordable panels (which took decades of cost reduction), storing it required batteries, and delivering it required grid infrastructure. The constraint was never the sun\'s supply ΓÇö it was humanity\'s ability to collect and use that energy efficiently. Every technology barrier that has been overcome reveals that the limiting factor was human ingenuity, not natural scarcity.',
  },
];
