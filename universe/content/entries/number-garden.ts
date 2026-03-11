/**
 * Seed Data — Number Garden (Dottie Chakravarti)
 * Mathematics / Patterns
 *
 * Source: Koydo Worlds Bible v2 + v3
 */
import type { RealWorldEntry } from '../types.js';

export const NUMBER_GARDEN_ENTRIES: readonly RealWorldEntry[] = [
  {
    id: 'entry-fibonacci-rabbit-problem',
    type: 'discovery',
    title: 'Fibonacci and the Rabbit Problem',
    year: 1202,
    yearDisplay: '1202 CE',
    era: 'medieval',
    descriptionChild:
      'Leonardo of Pisa (Fibonacci) asked: if rabbits breed every month, how many pairs will you have after a year? The answer created the most famous number sequence in mathematics: 1, 1, 2, 3, 5, 8, 13...',
    descriptionOlder:
      'The Fibonacci sequence appears everywhere in nature: sunflower spirals, pinecone scales, shell curves, galaxy arms. Mathematics is the language nature uses to build itself.',
    descriptionParent:
      'The Fibonacci sequence, introduced to Europe in 1202, demonstrates how mathematical patterns underpin biological growth. Children explore this through counting petals and spirals in the Number Garden.',
    realPeople: ['Leonardo of Pisa (Fibonacci)'],
    quote: null,
    quoteAttribution: null,
    geographicLocation: { lat: 43.7228, lng: 10.4017, name: 'Pisa, Italy' },
    continent: 'Europe',
    subjectTags: ['math', 'patterns', 'nature'],
    worldId: 'number-garden',
    guideId: 'dottie-chakravarti',
    adventureType: 'guided_expedition',
    difficultyTier: 1,
    prerequisites: [],
    unlocks: ['entry-zero-invention'],
    funFact:
      "Fibonacci didn't discover the sequence. Indian mathematicians knew it 1,000 years earlier. He brought it to Europe.",
    imagePrompt:
      'A lush garden with golden sunflowers displaying spiral seed patterns, warm Ghibli lighting, mathematical spirals subtly visible in flower petals and leaf arrangements',
    status: 'published',
  },
  {
    id: 'entry-zero-invention',
    type: 'invention',
    title: "Zero's Invention",
    year: 628,
    yearDisplay: '628 CE',
    era: 'medieval',
    descriptionChild:
      "The mathematician Brahmagupta wrote the first rules for using zero as a number in 628 CE. Before this, there was no way to write 'nothing' in math.",
    descriptionOlder:
      "Zero is the most important invention in mathematics. Without it, we couldn't write large numbers, do algebra, or build computers.",
    descriptionParent:
      "Brahmagupta's formalization of zero as a number with defined arithmetic rules was a watershed moment in mathematical history, enabling place-value notation and eventually all of modern computing.",
    realPeople: ['Brahmagupta'],
    quote: null,
    quoteAttribution: null,
    geographicLocation: { lat: 26.4499, lng: 74.6399, name: 'Rajasthan, India' },
    continent: 'Asia',
    subjectTags: ['math', 'numbers', 'history'],
    worldId: 'number-garden',
    guideId: 'dottie-chakravarti',
    adventureType: 'artifact_hunt',
    difficultyTier: 1,
    prerequisites: ['entry-fibonacci-rabbit-problem'],
    unlocks: ['entry-hypatia-alexandria'],
    funFact: "The word 'zero' comes from the Arabic 'sifr' meaning 'empty.'",
    imagePrompt:
      'A mystical garden with a glowing zero-shaped portal, ancient Indian mathematical scrolls floating, warm amber lighting in Ghibli style',
    status: 'published',
  },
  {
    id: 'entry-hypatia-alexandria',
    type: 'person',
    title: 'Hypatia of Alexandria',
    year: 400,
    yearDisplay: '~400 CE',
    era: 'classical',
    descriptionChild:
      'Hypatia was the first woman mathematician in recorded history. She taught astronomy, philosophy, and mathematics in ancient Alexandria.',
    descriptionOlder:
      'She was so respected that senators and governors came to her lectures. She edited the most important math textbook of the ancient world.',
    descriptionParent:
      'Hypatia (c. 350–415 CE) was a Neoplatonist philosopher and mathematician in Roman Egypt. She taught publicly, edited mathematical texts, and became a symbol of learning in the ancient world.',
    realPeople: ['Hypatia'],
    quote: null,
    quoteAttribution: null,
    geographicLocation: { lat: 31.2001, lng: 29.9187, name: 'Alexandria, Egypt' },
    continent: 'Africa',
    subjectTags: ['math', 'history', 'women_in_science'],
    worldId: 'number-garden',
    guideId: 'dottie-chakravarti',
    adventureType: 'remembrance_wall',
    difficultyTier: 2,
    prerequisites: ['entry-zero-invention'],
    unlocks: ['entry-ada-lovelace-program'],
    funFact:
      'Hypatia taught publicly in a time when most women were excluded from scholarship.',
    imagePrompt:
      'Ancient Alexandria library interior with geometric patterns on walls, a lectern with scrolls, warm golden light streaming through columns, Ghibli-inspired ancient setting',
    status: 'published',
  },
  {
    id: 'entry-ada-lovelace-program',
    type: 'invention',
    title: "Ada Lovelace's First Program",
    year: 1843,
    yearDisplay: '1843 CE',
    era: 'industrial',
    descriptionChild:
      "Ada Lovelace wrote the first computer program — a set of instructions for Charles Babbage's Analytical Engine — 100 years before computers existed.",
    descriptionOlder:
      'She saw that a computing machine could do more than just arithmetic. She imagined it could compose music and process any kind of information. She was right.',
    descriptionParent:
      "Ada Lovelace's 1843 notes on Babbage's Analytical Engine contained what is recognized as the first algorithm intended for machine processing, making her the world's first computer programmer.",
    realPeople: ['Ada Lovelace'],
    quote: 'That brain of mine is something more than merely mortal.',
    quoteAttribution: 'Ada Lovelace',
    geographicLocation: { lat: 51.5074, lng: -0.1278, name: 'London, England' },
    continent: 'Europe',
    subjectTags: ['math', 'coding', 'women_in_science', 'computers'],
    worldId: 'number-garden',
    guideId: 'dottie-chakravarti',
    adventureType: 'time_window',
    difficultyTier: 3,
    prerequisites: ['entry-hypatia-alexandria'],
    unlocks: [],
    funFact:
      "She was Lord Byron's daughter, and her mother insisted she study math to prevent her from inheriting her father's poetic temperament.",
    imagePrompt:
      'Victorian-era study with mechanical gear diagrams, handwritten mathematical notes, a portal showing the Analytical Engine, warm candlelight, Ghibli steampunk aesthetic',
    status: 'published',
  },
] as const;
