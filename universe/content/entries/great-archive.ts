/**
 * Seed Data — The Great Archive (The Librarian)
 * Knowledge Preservation / Information Literacy
 *
 * The Librarian has no known name. They remember every book ever lost,
 * and believe the greatest act of hope is writing things down.
 *
 * Educational standards: CCSS.ELA-LITERACY.RI.4-5 (informational text),
 * AASL Standards Framework for Learners
 */
import type { RealWorldEntry } from '../types.js';

export const GREAT_ARCHIVE_ENTRIES: readonly RealWorldEntry[] = [
  {
    id: 'entry-great-library-alexandria',
    type: 'event',
    title: 'The Library of Alexandria',
    year: -288,
    yearDisplay: '~288 BCE',
    era: 'ancient',
    descriptionChild:
      'The Great Library of Alexandria was the largest library in the ancient world. It tried to collect EVERY book ever written. Ships arriving at Alexandria were searched, and any scrolls found were copied — the copy went back to the ship, but the library kept the original. They almost did it. They almost collected everything.',
    descriptionOlder:
      'Founded under Ptolemy I (~288 BCE) in Alexandria, Egypt, the Library housed between 40,000 and 700,000 scrolls (estimates vary wildly). Royal decree required all ships docking at Alexandria to surrender their books for copying. The adjacent Mouseion was history\'s first research institution and research university. The Library\'s gradual decline (not a single dramatic fire) represents the fragility of centralized knowledge.',
    descriptionParent:
      'The Library of Alexandria is a powerful entry point for information literacy — the idea that knowledge must be actively preserved. Its decline was not a sudden fire (a myth) but centuries of underfunding and political neglect. This teaches children that information can be lost not just through destruction, but through institutional failure and disregard.',
    realPeople: ['Ptolemy I Soter', 'Euclid of Alexandria', 'Eratosthenes', 'Hypatia of Alexandria'],
    quote: 'Here is a place where knowledge lives.',
    quoteAttribution: 'Inscription above the Library of Alexandria (reconstructed)',
    geographicLocation: { lat: 31.2001, lng: 29.9187, name: 'Alexandria, Egypt' },
    continent: 'Africa',
    subjectTags: ['knowledge', 'history', 'books', 'ancient_egypt', 'preservation'],
    worldId: 'great-archive',
    guideId: 'the-librarian',
    adventureType: 'guided_expedition',
    difficultyTier: 1,
    prerequisites: [],
    unlocks: ['entry-first-encyclopedia'],
    funFact: 'Eratosthenes, the chief librarian, calculated the circumference of the Earth while working at the Library — and was only 0.16% off from the correct answer.',
    imagePrompt:
      'The Great Library of Alexandria rising at golden sunset, Ghibli-style marble columns and papyrus scrolls floating like leaves, the harbor visible, scholars in elegant robes walking under glowing arcades, scroll-light emanating from within',
    status: 'published',
  },
  {
    id: 'entry-first-encyclopedia',
    type: 'artifact',
    title: 'The First Encyclopedia: Yongle Dadian',
    year: 1408,
    yearDisplay: '1408 CE (Ming Dynasty)',
    era: 'medieval',
    descriptionChild:
      'The Yongle Emperor of China had a dream: write down EVERYTHING humanity knew, all in one place. He hired 2,169 scholars and it took them 6 years. The Yongle Encyclopedia was completed in 1408 and had 22,877 chapters. It was so big there was only one copy — and nearly all of it was lost.',
    descriptionOlder:
      'The Yongle Dadian (1408 CE) was the most comprehensive encyclopedia in pre-modern history: 22,877 chapters in over 11,000 volumes. Emperor Yongle commissioned it to consolidate all Chinese knowledge — history, arts, medicine, agriculture, astronomy. Only ~3.5% of the original content survives today, scattered across libraries on four continents. It prefigures Wikipedia by 600 years.',
    descriptionParent:
      'The Yongle Dadian illustrates the recurring human drive to organize all knowledge, and the recurring tragedy of losing it. Its near-total destruction during the Boxer Rebellion (1900) connects information literacy to political fragility. The contrast between a single physical copy versus today\'s distributed internet is a powerful teachable moment.',
    realPeople: ['Emperor Yongle (Zhu Di)', 'Xie Jin (chief editor)'],
    quote: 'Let nothing be left out.',
    quoteAttribution: 'Emperor Yongle\'s instruction to the editors, 1403',
    geographicLocation: { lat: 39.9042, lng: 116.4074, name: 'Beijing (Yongle\'s capital), Ming Dynasty China' },
    continent: 'Asia',
    subjectTags: ['knowledge', 'books', 'china', 'history', 'preservation', 'organization'],
    worldId: 'great-archive',
    guideId: 'the-librarian',
    adventureType: 'remembrance_wall',
    difficultyTier: 2,
    prerequisites: ['entry-great-library-alexandria'],
    unlocks: ['entry-internet-birth'],
    funFact: 'Of 11,095 volumes originally produced, only about 400 survive today — 3.5% of the total. Each surviving volume can sell for over $1 million at auction.',
    imagePrompt:
      'Ming Dynasty scholars writing in an imperial library, Ghibli-style jade-green and gold architecture, 22,877 glowing chapter-scrolls filling magnificent shelves, the Emperor\'s seal visible on lacquered wood',
    status: 'published',
  },
  {
    id: 'entry-internet-birth',
    type: 'invention',
    title: 'ARPANET: The Day the Library Got Infinite',
    year: 1969,
    yearDisplay: 'October 29, 1969',
    era: 'modern',
    descriptionChild:
      'On October 29, 1969, two computers sent a message to each other for the first time. The first message was supposed to be "LOGIN" but the system crashed after just two letters: "LO". The next attempt worked — and those two computers became the seed of the internet, the biggest library ever built.',
    descriptionOlder:
      'ARPANET, funded by the U.S. Defense Advanced Research Projects Agency, successfully transmitted the first networked message between UCLA and Stanford on October 29, 1969. The network survived node failures by automatically rerouting — unlike centralized libraries (Alexandria, Yongle). This distributed architecture is what makes the internet resilient where previous knowledge-hoards were fragile.',
    descriptionParent:
      'The birth of the internet as a knowledge network directly addresses information literacy in the digital age. Children who understand why ARPANET was designed without a single point of failure understand why Wikipedia can\'t be burned down like Alexandria. This entry bridges ancient and contemporary information history.',
    realPeople: ['Vint Cerf', 'Bob Kahn', 'Tim Berners-Lee', 'Leonard Kleinrock'],
    quote: 'LO',
    quoteAttribution: 'First message ever transmitted over ARPANET, October 29, 1969 (the system crashed after these two characters)',
    geographicLocation: { lat: 34.0689, lng: -118.4452, name: 'UCLA, Los Angeles, California (first ARPANET node)' },
    continent: 'North America',
    subjectTags: ['technology', 'internet', 'information', 'modern_history', 'communication'],
    worldId: 'great-archive',
    guideId: 'the-librarian',
    adventureType: 'reenactment',
    difficultyTier: 2,
    prerequisites: ['entry-first-encyclopedia'],
    unlocks: ['entry-wikipedia'],
    funFact: 'The first message sent over the internet was "LO" — an accidental haiku. The programmer meant to type "LOGIN" but the system crashed after two letters.',
    imagePrompt:
      'Ghibli-style 1969 UCLA computer lab with retro terminals, a glowing message-cable stretching across a map to Stanford, binary-light trails, the moment of first connection visualized as a golden bridge of light',
    status: 'published',
  },
  {
    id: 'entry-wikipedia',
    type: 'invention',
    title: 'Wikipedia: Everyone Writes the Library',
    year: 2001,
    yearDisplay: 'January 15, 2001',
    era: 'modern',
    descriptionChild:
      'Wikipedia started with one wild idea: what if everyone in the world could write the encyclopedia together? On January 15, 2001, two people launched it. By the end of the year it had 20,000 articles. Today it has over 60 million articles in 300 languages. The biggest library ever built — and you can add to it.',
    descriptionOlder:
      'Wikipedia was launched by Jimmy Wales and Larry Sanger on January 15, 2001. It grew from 20 articles to 60+ million across 300+ languages in 23 years. It is the largest encyclopedia ever assembled, written collaboratively by volunteers. It also demonstrates both the power of distributed authorship and its challenges: bias, vandalism, and coverage gaps in underrepresented communities.',
    descriptionParent:
      'Wikipedia closes the loop that begins with Alexandria — from "one king collecting everything" to "everyone contributing freely." It introduces children to concepts of collaborative knowledge, the importance of citations, and the fact that all encyclopedias have a point of view. It is also a gateway to understanding digital citizenship and source evaluation.',
    realPeople: ['Jimmy Wales', 'Larry Sanger'],
    quote: 'Imagine a world in which every single person on the planet is given free access to the sum of all human knowledge.',
    quoteAttribution: 'Jimmy Wales, Wikipedia founder',
    geographicLocation: { lat: 37.3861, lng: -122.0839, name: 'San Diego, California (Wikipedia\'s first servers)' },
    continent: 'North America',
    subjectTags: ['knowledge', 'internet', 'collaboration', 'information_literacy', 'modern'],
    worldId: 'great-archive',
    guideId: 'the-librarian',
    adventureType: 'guided_expedition',
    difficultyTier: 3,
    prerequisites: ['entry-internet-birth'],
    unlocks: [],
    funFact: 'The most edited article on the English Wikipedia is "George W. Bush," which has been changed over 45,000 times. The most viewed article in a single day was about the 2016 US election.',
    imagePrompt:
      'Glowing Wikipedia interface visualized as a living Great Archive, contributors from around the world depicted as tiny light-figures adding glowing knowledge-scrolls to infinite shelves, Ghibli style with a warm collaborative glow',
    status: 'published',
  },
];
