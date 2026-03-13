/**
 * Quiz Questions — Starfall Observatory (Riku Osei)
 * Astronomy / Space Science
 *
 * 3 questions per entry, distributed across difficulty tiers.
 * Note: Questions use multi-sensory language to honor Riku's teaching approach.
 */
import type { EntryQuizQuestion } from '../types.js';

export const STARFALL_OBSERVATORY_QUIZZES: readonly EntryQuizQuestion[] = [

  // ─── entry-ibn-al-haytham-optics ─────────────────────────────────────────────
  {
    id: 'quiz-al-haytham-t1',
    entryId: 'entry-ibn-al-haytham-optics',
    difficultyTier: 1,
    question: 'Ibn al-Haytham proved something important about how we see. What was it?',
    options: [
      'Our eyes send light out to illuminate the objects around us',
      'Light from objects enters our eyes — we do not shoot light beams outward',
      'Color is created inside the eye, not in the light itself',
      'We see with our whole brain, not just our eyes',
    ],
    correctIndex: 1,
    explanation: 'Ancient Greek philosophers (including Plato) believed the eye emitted light rays that "touched" objects to see them. Ibn al-Haytham proved in his Book of Optics (1011 CE) that light travels from objects INTO the eye. He proved this by building a camera obscura — a dark box where light enters through a small hole and projects an inverted image.',
  },
  {
    id: 'quiz-al-haytham-t2',
    entryId: 'entry-ibn-al-haytham-optics',
    difficultyTier: 2,
    question: 'Ibn al-Haytham wrote his Book of Optics while under house arrest, pretending to be mentally ill. Why was he pretending?',
    options: [
      'He feared academic rivals would steal his work',
      'He had falsely claimed to control the Nile floods for the Caliph — and faked madness to avoid execution',
      'His religious beliefs clashed with the Caliph\'s and he hid to avoid punishment',
      'He was conducting secret experiments that were illegal under Islamic law',
    ],
    correctIndex: 1,
    explanation: 'Al-Haytham boasted to Fatimid Caliph al-Hakim that he could regulate the Nile\'s floods with an engineering project. When he went to Egypt and realized the task was impossible, he feared execution. He feigned madness and was placed under house arrest — where he spent a decade writing the Book of Optics, one of the most influential scientific texts ever written.',
  },
  {
    id: 'quiz-al-haytham-t3',
    entryId: 'entry-ibn-al-haytham-optics',
    difficultyTier: 3,
    question: 'Al-Haytham\'s Book of Optics influenced three later scientific revolutions. Which?',
    options: [
      'The invention of the compass, gunpowder, and paper',
      'Roger Bacon\'s experimental method, Johannes Kepler\'s optics, and the development of the telescope and microscope',
      'The Copernican revolution, Newton\'s laws, and the discovery of bacteria',
      'Medicine, cartography, and philosophy in the Islamic Golden Age',
    ],
    correctIndex: 1,
    explanation: 'Al-Haytham\'s work directly influenced Roger Bacon\'s thinking on experimental evidence (13th century), Kepler\'s laws of optics (17th century), and the practical development of lenses for telescopes and microscopes. Galileo\'s telescopic observations (which Riku teaches at the Observatory) would have been impossible without the optical theory al-Haytham established 600 years earlier.',
  },

  // ─── entry-galileo-jupiter-moons ─────────────────────────────────────────────
  {
    id: 'quiz-galileo-t1',
    entryId: 'entry-galileo-jupiter-moons',
    difficultyTier: 1,
    question: 'What did Galileo discover about Jupiter in January 1610?',
    options: [
      'That Jupiter has rings like Saturn',
      'That Jupiter has four large moons orbiting it',
      'That Jupiter is larger than the Sun',
      'That Jupiter is made of gas, not rock',
    ],
    correctIndex: 1,
    explanation: 'On January 7, 1610, Galileo pointed his telescope at Jupiter and saw four tiny points of light that moved night to night. He realized they were moons orbiting Jupiter — the first known objects that did not orbit Earth. This proved not everything in the sky revolves around us.',
  },
  {
    id: 'quiz-galileo-t2',
    entryId: 'entry-galileo-jupiter-moons',
    difficultyTier: 2,
    question: 'Why was discovering Jupiter\'s moons dangerous for Galileo?',
    options: [
      'Telescopes were banned by the Church as witchcraft',
      'It proved that not all heavenly bodies orbit Earth, supporting Copernicus\' heliocentric model the Church opposed',
      'Jupiter\'s moons were considered gods in Italian tradition',
      'Galileo had stolen the telescope design from a Dutch inventor',
    ],
    correctIndex: 1,
    explanation: 'The Church officially endorsed the Ptolemaic model (Earth is the center of everything). Jupiter\'s moons orbiting Jupiter — not Earth — showed that objects in space could orbit other bodies. This supported Copernicus\' heliocentric "everything orbits the Sun" model. Galileo was eventually tried for heresy and placed under house arrest for the rest of his life.',
  },
  {
    id: 'quiz-galileo-t3',
    entryId: 'entry-galileo-jupiter-moons',
    difficultyTier: 3,
    question: 'Galileo\'s four Jovian moons are called the Galilean moons. Today, scientists believe one of them — Europa — may harbor life. Why?',
    options: [
      'Europa has an oxygen-rich atmosphere similar to Earth\'s',
      'Europa has a liquid water ocean beneath its icy crust, thought to be kept liquid by Jupiter\'s tidal forces',
      'Europa has been shown to have plant-like growth on its surface',
      'Europa has a magnetic field stronger than Earth\'s, protecting a potential biosphere',
    ],
    correctIndex: 1,
    explanation: 'Europa\'s surface is covered in water ice, but tidal heating from Jupiter\'s gravity keeps a liquid ocean beneath — possibly twice the volume of all Earth\'s oceans. Liquid water, chemical energy from hydrothermal activity on the ocean floor, and billions of years of stability make Europa one of the most promising places in the solar system to search for microbial life.',
  },

  // ─── entry-henrietta-leavitt-cepheids ────────────────────────────────────────
  {
    id: 'quiz-leavitt-t1',
    entryId: 'entry-henrietta-leavitt-cepheids',
    difficultyTier: 1,
    question: 'Henrietta Leavitt discovered that certain variable stars could be used like rulers in space. What did she find?',
    options: [
      'Stars that blink are always exactly 1 light-year from Earth',
      'A star\'s pulsing period tells you its true brightness — which tells you how far away it is',
      'Variable stars are always paired with a companion star nearby',
      'The color of a variable star tells you its temperature and size',
    ],
    correctIndex: 1,
    explanation: 'Leavitt discovered that Cepheid variable stars — which pulse, getting brighter and dimmer — pulse at rates proportional to their true luminosity. If you know a star\'s true brightness and can measure how bright it appears from Earth, you can calculate exactly how far away it is. She discovered the first cosmic distance ruler.',
  },
  {
    id: 'quiz-leavitt-t2',
    entryId: 'entry-henrietta-leavitt-cepheids',
    difficultyTier: 2,
    question: 'Henrietta Leavitt worked at the Harvard Observatory as a "human computer." What did that mean?',
    options: [
      'She programmed early mechanical calculators',
      'She was paid to analyze photographic plates of stars — measuring, cataloguing, and comparing thousands of images by hand',
      'She computed weather patterns using astronomical data',
      'She calibrated the telescope lenses to keep them accurate',
    ],
    correctIndex: 1,
    explanation: 'At the Harvard Observatory around 1900, women were hired as "computers" — low-paid workers who performed tedious but skilled calculations that male astronomers considered beneath them. Leavitt measured star brightnesses on photographic plates, cataloguing over 2,400 variable stars. Her "low-status" work turned out to be one of the most important discoveries in 20th-century astronomy.',
  },
  {
    id: 'quiz-leavitt-t3',
    entryId: 'entry-henrietta-leavitt-cepheids',
    difficultyTier: 3,
    question: 'Edwin Hubble used Leavitt\'s Cepheid yardstick to prove something that shocked the entire astronomical world in 1924. What?',
    options: [
      'That the Milky Way is the only galaxy in the universe',
      'That the universe is much older than anyone had calculated',
      'That the Andromeda "nebula" was a separate galaxy far beyond the Milky Way — the universe was vastly larger than anyone imagined',
      'That the universe is rotating around a single central point',
    ],
    correctIndex: 2,
    explanation: 'Using Leavitt\'s Cepheid measurements, Hubble calculated that the Andromeda "nebula" was 900,000 light-years away (now known to be ~2.5 million light-years) — far outside our Milky Way. This proved the existence of other galaxies. The universe was not our galaxy — our galaxy was but one of hundreds of billions. Leavitt\'s discovery made Hubble\'s discovery possible.',
  },

  // ─── entry-james-webb-telescope ──────────────────────────────────────────────
  {
    id: 'quiz-jwst-t1',
    entryId: 'entry-james-webb-telescope',
    difficultyTier: 1,
    question: 'The James Webb Space Telescope looks at the universe in a special kind of light we cannot see. Which kind?',
    options: [
      'X-rays, which pass through clouds of gas',
      'Infrared light — heat signatures from objects even billions of years old',
      'Ultraviolet light, which shows chemical compositions',
      'Radio waves, which can reach us from the furthest galaxies',
    ],
    correctIndex: 1,
    explanation: 'JWST detects infrared light — which we experience as heat. Objects very far away (and therefore very old) have their light red-shifted into the infrared spectrum as the universe expands. Infrared also passes through dust clouds that block visible light. JWST can see the first galaxies formed after the Big Bang, and see inside stellar nurseries where stars are being born.',
  },
  {
    id: 'quiz-jwst-t2',
    entryId: 'entry-james-webb-telescope',
    difficultyTier: 2,
    question: 'JWST is not just a telescope — it is a time machine. How?',
    options: [
      'It can be repositioned to observe the same location at different times simultaneously',
      'Because light takes time to travel, seeing distant objects means seeing them as they were billions of years ago',
      'It can predict future star formations using its AI analysis systems',
      'It was placed at a gravitational lens that bends time slightly',
    ],
    correctIndex: 1,
    explanation: 'Light travels at 300,000 km/s — fast, but not infinite. Light from a galaxy 13 billion light-years away left that galaxy 13 billion years ago. When JWST detects that light, it is seeing the galaxy as it was nearly 13 billion years ago. JWST\'s deepest images are windows into the universe\'s first few hundred million years after the Big Bang.',
  },
  {
    id: 'quiz-jwst-t3',
    entryId: 'entry-james-webb-telescope',
    difficultyTier: 3,
    question: 'JWST carries al-Haytham\'s optics heritage forward: careful observation reveals what we could not otherwise know. What has JWST found about exoplanet atmospheres so far?',
    options: [
      'All exoplanets have atmospheres of nitrogen and oxygen like Earth',
      'JWST has detected carbon dioxide, water vapor, and methane in exoplanet atmospheres — chemical signatures that could hint at life',
      'JWST found that all exoplanets are lifeless rocky worlds',
      'JWST has not yet been pointed at any exoplanet atmospheres',
    ],
    correctIndex: 1,
    explanation: 'JWST can analyze the light that passes through an exoplanet\'s atmosphere as it transits its star. Different chemicals absorb different wavelengths of light, leaving fingerprints in the spectrum. JWST has detected CO₂, water, methane, and sulfur dioxide in various exoplanet atmospheres. None are confirmed signs of life — but we now have the tool that could first detect the chemical signatures of a living world beyond our solar system.',
  },
];
