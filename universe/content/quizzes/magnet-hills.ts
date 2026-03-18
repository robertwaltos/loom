/**
 * Quiz Questions ΓÇö The Magnet Hills (Lena Sundstr├╢m)
 * Physics / Forces & Motion
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const MAGNET_HILLS_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-newton-laws-of-motion ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-newton-t1',
    entryId: 'entry-newton-laws-of-motion',
    difficultyTier: 1,
    question: 'Isaac Newton published three laws that explain how everything moves. What famous event is said to have inspired him to think about gravity?',
    options: [
      'Watching the Moon rise over the ocean',
      'A falling apple',
      'A cannonball rolling down a hill',
      'A comet crossing the night sky',
    ],
    correctIndex: 1,
    explanation: 'The story ΓÇö perhaps true, perhaps legendary ΓÇö is that Newton saw an apple fall from a tree and began wondering why things fall downward. He worked out that the same force pulling the apple to the ground also kept the Moon in orbit around Earth. His three laws of motion explained how everything from rolling balls to orbiting planets moves.',
  },
  {
    id: 'quiz-newton-t2',
    entryId: 'entry-newton-laws-of-motion',
    difficultyTier: 2,
    question: 'Newton\'s laws of motion guided spacecraft to the Moon in 1969, 282 years after he published them. Then Einstein showed Newton\'s laws were an approximation. What does this tell us about scientific theories?',
    options: [
      'Newton\'s laws are now considered wrong and are no longer used',
      'A scientific theory can be an excellent approximation ΓÇö accurate enough to send spacecraft to the Moon ΓÇö and still be later refined into a more complete theory by a better model',
      'Einstein replaced Newton entirely, so Newton\'s contribution is no longer relevant',
      'All scientific theories eventually turn out to be completely wrong',
    ],
    correctIndex: 1,
    explanation: 'Newton\'s laws are accurate at the speeds and scales of everyday life ΓÇö cars, planes, spacecraft, planets. Einstein\'s general relativity gives more accurate answers near the speed of light or in very strong gravity. But Newton is not "wrong" ΓÇö he is a brilliant approximation. Science does not throw out good models when better ones arrive; it builds a hierarchy. Newton and Einstein are both right, in their respective domains.',
  },
  {
    id: 'quiz-newton-t3',
    entryId: 'entry-newton-laws-of-motion',
    difficultyTier: 3,
    question: 'Newton\'s Principia Mathematica unified Earth physics and planetary astronomy for the first time ΓÇö the same laws governing a falling apple governed a planet\'s orbit. Why was this unification so important?',
    options: [
      'It meant scientists only had to memorise one set of laws instead of two separate ones',
      'It eliminated the ancient idea that the heavens operated by completely different rules than the Earth, making the universe understandable through a single coherent framework',
      'It allowed Newton to predict the exact positions of every planet in the solar system',
      'It proved that Earth is not the centre of the universe',
    ],
    correctIndex: 1,
    explanation: 'Before Newton, physics and astronomy were considered separate ΓÇö earthly matter behaved one way and heavenly bodies were thought to follow entirely different divine rules. Newton showed that the same mathematics explained the apple and the Moon, the cannonball and the planet. This was the birth of a unified physics ΓÇö the idea that the same laws apply everywhere in the universe, making the cosmos comprehensible to human reason.',
  },

  // ΓöÇΓöÇΓöÇ entry-curie-radioactivity ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-curie-t1',
    entryId: 'entry-curie-radioactivity',
    difficultyTier: 1,
    question: 'Marie Curie discovered two new elements. What were their names?',
    options: [
      'Uranium and thorium',
      'Polonium and radium',
      'Helium and neon',
      'Carbon and oxygen',
    ],
    correctIndex: 1,
    explanation: 'Marie Curie discovered two brand-new elements: polonium (named after her home country of Poland) and radium. She proved that atoms could release energy on their own ΓÇö a phenomenon she named radioactivity. For these discoveries she won the Nobel Prize in Physics in 1903 and the Nobel Prize in Chemistry in 1911.',
  },
  {
    id: 'quiz-curie-t2',
    entryId: 'entry-curie-radioactivity',
    difficultyTier: 2,
    question: 'Marie Curie is the only person ever to win Nobel Prizes in two different sciences. She also conducted her research in very difficult conditions. What does her story demonstrate about perseverance?',
    options: [
      'Scientists only succeed when they have excellent equipment and funding',
      'Determination, careful observation, and intellectual courage can produce world-changing discoveries even in a leaky shed with equipment you bought yourself',
      'Women were fully accepted and supported in European science in the 1890s',
      'Radioactive materials are safe to handle and she was never in danger',
    ],
    correctIndex: 1,
    explanation: 'Curie worked in a shed that was too hot in summer and too cold in winter, bought her own equipment, was often dismissed because she was a woman, and worked with radioactive materials without the safety knowledge we have today. She persisted through all of it and produced discoveries that won two Nobel Prizes. Her notebooks are still so radioactive today they are stored in lead-lined boxes.',
  },
  {
    id: 'quiz-curie-t3',
    entryId: 'entry-curie-radioactivity',
    difficultyTier: 3,
    question: 'Curie\'s notebooks are so radioactive they require a waiver to handle over a century later. What does this fact teach us about the relationship between scientific discovery and safety knowledge?',
    options: [
      'Curie was reckless and should not be admired because she did not follow safety rules',
      'Safety standards evolve alongside scientific understanding ΓÇö Curie could not protect herself from dangers that were not yet understood; her discoveries themselves created the knowledge that would later protect others',
      'Radioactive materials were well understood at the time and Curie should have been more careful',
      'Science should be halted whenever safety cannot be fully guaranteed',
    ],
    correctIndex: 1,
    explanation: 'Radioactivity was so new that nobody understood its dangers when Curie was working. She carried radioactive test tubes in her pockets. The safety protocols in modern laboratories ΓÇö lead shielding, dosimeters, hazard labelling ΓÇö exist precisely because scientists like Curie paid the price for ignorance. Her work created the understanding that eventually protected future generations. It is a reminder that discoveries always come before the full understanding of their consequences.',
  },

  // ΓöÇΓöÇΓöÇ entry-romer-speed-of-light ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-romer-t1',
    entryId: 'entry-romer-speed-of-light',
    difficultyTier: 1,
    question: 'Ole R├╕mer was the first person to prove that light has a speed. What was he watching in the sky when he made this discovery?',
    options: [
      'Stars changing brightness over different seasons',
      'Eclipses of Io, one of Jupiter\'s moons, happening earlier or later than expected',
      'The shadow of Earth moving across the Moon',
      'The speed of comets passing through the solar system',
    ],
    correctIndex: 1,
    explanation: 'R├╕mer noticed that when Earth was moving away from Jupiter, eclipses of Jupiter\'s moon Io were later than predicted ΓÇö and earlier when Earth was moving toward Jupiter. He realised light was taking extra time to cross the extra distance when Earth was farther away. He was watching light travel, and proved it had a finite speed.',
  },
  {
    id: 'quiz-romer-t2',
    entryId: 'entry-romer-speed-of-light',
    difficultyTier: 2,
    question: 'R├╕mer\'s measurement of the speed of light was about 25% lower than the true value. Does this mean his discovery was wrong?',
    options: [
      'Yes ΓÇö a 25% error means the measurement is scientifically invalid',
      'No ΓÇö the conceptual breakthrough was correct: light has a finite speed. His method was revolutionary even if the precise value was off',
      'Yes ΓÇö only exact measurements count as real scientific discoveries',
      'No ΓÇö because he rounded his numbers correctly',
    ],
    correctIndex: 1,
    explanation: 'R├╕mer\'s key insight ΓÇö that light takes time to travel, and therefore has a finite speed ΓÇö was correct and transformative. His estimate of around 220,000 km/s was imprecise compared to the true value of 299,792 km/s, but the imprecision was in the measurement of Earth\'s orbital size, not in his method or reasoning. Getting the right idea with an approximate number is still a major scientific achievement.',
  },
  {
    id: 'quiz-romer-t3',
    entryId: 'entry-romer-speed-of-light',
    difficultyTier: 3,
    question: 'The Royal Society did not accept R├╕mer\'s conclusion that light has a finite speed until after his death. What does his story teach us about how scientific consensus changes?',
    options: [
      'Scientific consensus is always right and R├╕mer\'s rejection proves his idea was flawed',
      'Correct observations that challenge the established consensus are often dismissed; scientific acceptance can lag far behind the evidence when an idea is genuinely new',
      'Scientists in the 1600s were not intelligent enough to evaluate R├╕mer\'s claim',
      'The Royal Society should be abolished because it has been wrong before',
    ],
    correctIndex: 1,
    explanation: 'Before R├╕mer, most scientists believed light was instantaneous ΓÇö that it moved with infinite speed. R├╕mer\'s observation challenged an assumption so deep it was barely recognised as an assumption at all. The Royal Society\'s resistance was not stupidity ΓÇö it was the natural conservatism of a community that had not yet found a convincing mechanism. Vindication came later, as independent measurements accumulated. Correct ideas must sometimes wait for the world to catch up.',
  },

  // ΓöÇΓöÇΓöÇ entry-foucault-pendulum ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-foucault-t1',
    entryId: 'entry-foucault-pendulum',
    difficultyTier: 1,
    question: 'In 1851, L├⌐on Foucault hung a huge pendulum from the dome of the Panth├⌐on in Paris. What happened to it during the day?',
    options: [
      'It gradually slowed down and stopped',
      'Its plane of swing appeared to slowly rotate in a circle, all by itself',
      'It swung faster and faster as the day went on',
      'It stayed perfectly still because there was no wind inside the building',
    ],
    correctIndex: 1,
    explanation: 'Foucault\'s pendulum appeared to slowly rotate during the day ΓÇö yet nobody was pushing it or changing its direction. The pendulum\'s swing plane was staying still while Earth rotated underneath it. Anyone who stood and watched could see the Earth itself was spinning, without ever looking at the sky.',
  },
  {
    id: 'quiz-foucault-t2',
    entryId: 'entry-foucault-pendulum',
    difficultyTier: 2,
    question: 'Foucault\'s pendulum provided the first proof of Earth\'s rotation that didn\'t require looking at the sky. Why was this significant?',
    options: [
      'People had been arguing about whether Earth rotates, and no one had been able to prove it before',
      'It was the first time Earth\'s rotation was demonstrated directly, visibly, inside a room ΓÇö making an astronomical fact observable to anyone standing on the ground',
      'It allowed scientists to measure exactly how fast Earth rotates for the first time',
      'It disproved the flat-Earth theory, which was still widely believed in 1851',
    ],
    correctIndex: 1,
    explanation: 'People could observe rising and setting of the Sun and stars, but those observations required looking at the sky and trusting an interpretation. Foucault\'s pendulum showed Earth\'s rotation in a room, visible to anyone, with no telescope or theory needed ΓÇö just watching the pendulum\'s swing shift across the floor hour by hour. It made an abstract astronomical fact immediately, physically undeniable.',
  },
  {
    id: 'quiz-foucault-t3',
    entryId: 'entry-foucault-pendulum',
    difficultyTier: 3,
    question: 'At the North Pole, a Foucault pendulum rotates a full 360┬░ in 24 hours. At the equator, it does not rotate at all. What does this variation reveal about frames of reference in physics?',
    options: [
      'The pendulum works differently depending on what type of metal it is made from',
      'The apparent rotation rate depends on the observer\'s latitude ΓÇö a powerful demonstration that what you observe depends entirely on your position and frame of reference relative to Earth\'s rotation',
      'Gravity is stronger at the poles, which is why the pendulum rotates faster there',
      'The pendulum proves that time moves at different speeds at different latitudes',
    ],
    correctIndex: 1,
    explanation: 'At the poles, you are aligned with Earth\'s rotational axis ΓÇö the full rotation of Earth beneath the pendulum is expressed as a complete 360┬░ rotation in 24 hours. At the equator, Earth\'s rotation carries you around without rotating under the pendulum ΓÇö so no apparent shift occurs. Intermediate latitudes show intermediate rates. This illustrates the concept of reference frames: what you observe depends on where and how you are moving ΓÇö a concept at the heart of both Newton\'s and Einstein\'s physics.',
  },
];
