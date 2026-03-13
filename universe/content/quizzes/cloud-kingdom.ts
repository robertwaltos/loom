/**
 * Quiz Questions — Cloud Kingdom (Professor Nimbus)
 * Earth Science / Weather
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const CLOUD_KINGDOM_QUIZZES: readonly EntryQuizQuestion[] = [

  // ─── entry-barometer-torricelli ──────────────────────────────────────────────
  {
    id: 'quiz-barometer-t1',
    entryId: 'entry-barometer-torricelli',
    difficultyTier: 1,
    question: 'Torricelli invented the barometer to measure something invisible. What was it?',
    options: [
      'The temperature of the air',
      'The weight and pressure of the air around us',
      'The amount of water in a cloud',
      'The speed of the wind',
    ],
    correctIndex: 1,
    explanation: 'Torricelli\'s barometer measured atmospheric pressure — the weight of the column of air above us pressing down on everything. He proved that air has weight by watching how high mercury was pushed up inside a glass tube.',
  },
  {
    id: 'quiz-barometer-t2',
    entryId: 'entry-barometer-torricelli',
    difficultyTier: 2,
    question: 'Torricelli discovered his barometer by accident while trying to solve a different problem. What was it?',
    options: [
      'Why clouds form at different heights',
      'Why water pumps couldn\'t lift water past 34 feet',
      'Why some metals are heavier than others',
      'Why storms always come from the west',
    ],
    correctIndex: 1,
    explanation: 'Water pumps of the time couldn\'t pull water higher than 34 feet. Torricelli reasoned the limit was caused by the weight of the atmosphere pushing down on the water source. He replaced heavy water with heavier mercury to test the idea in a smaller tube — and invented the barometer.',
  },
  {
    id: 'quiz-barometer-t3',
    entryId: 'entry-barometer-torricelli',
    difficultyTier: 3,
    question: 'Torricelli also accidentally created something else when he made his barometer. What?',
    options: [
      'The first thermometer',
      'The first vacuum — a space with no air at all',
      'The first accurate map of air currents',
      'The first equation for weather prediction',
    ],
    correctIndex: 1,
    explanation: 'When mercury settled into the 76 cm column, the sealed space above it had no mercury — and no air could get in. This was one of the first controlled vacuums ever created. At the time, philosophers believed a vacuum was impossible (nature "abhors a vacuum"). Torricelli disproved it with a glass tube.',
  },

  // ─── entry-cloud-naming-howard ───────────────────────────────────────────────
  {
    id: 'quiz-cloud-naming-t1',
    entryId: 'entry-cloud-naming-howard',
    difficultyTier: 1,
    question: 'What did Luke Howard do that made him famous in 1803?',
    options: [
      'He predicted a major storm three days before it happened',
      'He gave official names to the different types of clouds',
      'He flew in a hot-air balloon through a thundercloud',
      'He invented the first weather map',
    ],
    correctIndex: 1,
    explanation: 'Luke Howard, a pharmacist who loved watching the sky, gave a talk in 1803 where he proposed Latin names for cloud types: cumulus (heaped), stratus (layered), cirrus (curled), and nimbus (rain-bearing). Scientists agreed, and we still use his exact names today.',
  },
  {
    id: 'quiz-cloud-naming-t2',
    entryId: 'entry-cloud-naming-howard',
    difficultyTier: 2,
    question: 'Luke Howard was not a professional scientist — he was a pharmacist. Why does this matter?',
    options: [
      'It means his cloud names cannot be trusted',
      'It shows that careful observation by anyone can change science, not just professional scientists',
      'It means he was not allowed to publish in scientific journals',
      'It means he named the clouds after medicines',
    ],
    correctIndex: 1,
    explanation: 'Howard was an amateur natural philosopher who observed the sky for years out of pure curiosity. His work was accepted by scientists worldwide because his observations were careful and systematic. Science does not require professional credentials — it requires accuracy, evidence, and careful reasoning.',
  },
  {
    id: 'quiz-cloud-naming-t3',
    entryId: 'entry-cloud-naming-howard',
    difficultyTier: 3,
    question: 'After Howard named the clouds, the Romantic poet Goethe wrote four poems in his honor. Why would a poet be excited about scientific cloud names?',
    options: [
      'Because the Latin names sounded beautiful when read aloud',
      'Because Howard\'s work gave artists a shared precise vocabulary for describing the sky in painting and poetry',
      'Because Goethe was studying to become a meteorologist',
      'Because Goethe had been friends with Howard since childhood',
    ],
    correctIndex: 1,
    explanation: 'Before Howard, a poet describing clouds could only say "a white cloud" or "a dark cloud." After Howard, they could distinguish between a cumulus\'s rounded grandeur and a cirrus\'s ethereal wisps. Precise scientific vocabulary can make art MORE expressive, not less. Goethe saw this immediately.',
  },

  // ─── entry-lightning-franklin ─────────────────────────────────────────────────
  {
    id: 'quiz-lightning-t1',
    entryId: 'entry-lightning-franklin',
    difficultyTier: 1,
    question: 'What did Benjamin Franklin prove with his famous kite experiment?',
    options: [
      'That clouds are made of water',
      'That lightning is a form of electricity',
      'That kites can fly in any weather',
      'That metal conducts heat',
    ],
    correctIndex: 1,
    explanation: 'In 1752, Franklin flew a kite with a metal key attached during a thunderstorm. Electric charge from the storm traveled down the wet string to the key, and when Franklin touched it, he felt a spark. This proved that lightning was electrical in nature — not divine punishment, but physics.',
  },
  {
    id: 'quiz-lightning-t2',
    entryId: 'entry-lightning-franklin',
    difficultyTier: 2,
    question: 'What practical invention did Franklin create directly from his lightning discovery?',
    options: [
      'The umbrella',
      'The lightning rod, which safely directs lightning into the ground',
      'The weather vane',
      'The glass barometer',
    ],
    correctIndex: 1,
    explanation: 'Franklin immediately understood the application: if lightning is electricity seeking a path to ground, you can give it a safer path. He invented the lightning rod — a metal spike on top of a building connected to a metal wire running to the ground. It has saved countless lives and buildings in the 270+ years since.',
  },
  {
    id: 'quiz-lightning-t3',
    entryId: 'entry-lightning-franklin',
    difficultyTier: 3,
    question: 'Franklin\'s kite experiment was actually dangerous — he could have been killed. Later scientists confirmed his results more safely. What does this reveal about 18th-century science?',
    options: [
      'That Franklin was reckless and should not be admired',
      'That early experimental science was conducted with very limited safety protocols, relying on individual bravery and intuition',
      'That thunder and lightning were still considered magical in Franklin\'s time',
      'That scientific experiments should never involve danger',
    ],
    correctIndex: 1,
    explanation: 'A Russian scientist named Georg Richmann attempted the same experiment in 1753 and was killed by a lightning strike. Franklin survived by luck and by not touching the key directly until current had already dissipated. Modern research ethics and safety protocols exist precisely because early experimenters paid enormous personal costs to discover what we now take for granted.',
  },

  // ─── entry-fitzroy-weather-forecast ──────────────────────────────────────────
  {
    id: 'quiz-fitzroy-t1',
    entryId: 'entry-fitzroy-weather-forecast',
    difficultyTier: 1,
    question: 'Robert FitzRoy made the first weather forecasts for the public. What was his job before he became a meteorologist?',
    options: [
      'A farmer who watched weather patterns',
      'A Royal Navy admiral and captain of the HMS Beagle',
      'A newspaper editor who reported on storms',
      'A lighthouse keeper on the English coast',
    ],
    correctIndex: 1,
    explanation: 'Robert FitzRoy was a Royal Navy Admiral who is most famous for captaining HMS Beagle on the voyage where Charles Darwin developed his theory of evolution. FitzRoy returned to weather obsessed with saving sailors\' lives — storms at sea had killed thousands. He invented weather forecasting to protect them.',
  },
  {
    id: 'quiz-fitzroy-t2',
    entryId: 'entry-fitzroy-weather-forecast',
    difficultyTier: 2,
    question: 'FitzRoy published weather forecasts in newspapers starting in 1861. The public loved them but scientists criticized them. Why?',
    options: [
      'Because FitzRoy was secretly paid by shipping companies to exaggerate storm warnings',
      'Because forecasting based on patterns felt like guessing, not rigorous science — the math hadn\'t caught up yet',
      'Because FitzRoy used a language scientists found unscientific',
      'Because newspapers were not considered appropriate for sharing scientific findings',
    ],
    correctIndex: 1,
    explanation: 'FitzRoy used barometer readings, wind direction, and pattern recognition — but without the mathematical models that came later. Scientists of the time felt weather was too chaotic to predict. FitzRoy\'s forecasts were occasionally wrong, which made his critics louder. He died by suicide in 1865, partly due to the pressure of public ridicule. He was right about the principle, even if the mathematics hadn\'t been developed yet.',
  },
  {
    id: 'quiz-fitzroy-t3',
    entryId: 'entry-fitzroy-weather-forecast',
    difficultyTier: 3,
    question: 'Modern weather forecasting depends on chaos theory — the idea that small changes in conditions create large effects over time. This means long-range weather forecasts always have limits. What does this teach us?',
    options: [
      'That weather science should be abandoned since it cannot achieve certainty',
      'That useful forecasts can still be made under uncertainty — we just need to communicate confidence levels honestly',
      'That computers are the only tools that can forecast weather',
      'That FitzRoy\'s original method was more accurate than modern methods',
    ],
    correctIndex: 1,
    explanation: 'Modern forecasts express probability: "70% chance of rain." This is more honest and more useful than a simple yes/no. FitzRoy\'s insight — that observation + systematic analysis can produce actionable predictions, even without certainty — is still the foundation of all weather science. Uncertainty is not failure; it is the honest language of complex systems.',
  },
];
