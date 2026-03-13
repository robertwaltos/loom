/**
 * Seed Data — The Story Tree (Grandmother Anaya)
 * Storytelling / Narrative
 *
 * Grandmother Anaya lost her grandmother's stories to a house fire.
 * She has spent her life ensuring no story is lost again.
 *
 * Educational standards: CCSS.ELA-LITERACY.RL.K-5 (narrative), RL.4.3, RL.5.6
 */
import type { RealWorldEntry } from '../types.js';

export const STORY_TREE_ENTRIES: readonly RealWorldEntry[] = [
  {
    id: 'entry-gilgamesh',
    type: 'artifact',
    title: 'The Epic of Gilgamesh',
    year: -2100,
    yearDisplay: '~2100 BCE',
    era: 'ancient',
    descriptionChild:
      'The oldest story ever written was told 4,000 years ago on clay tablets in ancient Mesopotamia. It is about a king named Gilgamesh who goes on adventures and learns what really matters in life.',
    descriptionOlder:
      'The Epic of Gilgamesh is the world\'s oldest surviving narrative poem. Gilgamesh, king of Uruk, befriends the wild man Enkidu, grieves his death, and searches for immortality — ultimately learning that human connection matters more than eternal life.',
    descriptionParent:
      'Written in cuneiform on clay tablets around 2100 BCE, the Epic of Gilgamesh predates Homer by 1,500 years. It contains a flood narrative that predates the Biblical flood story, explores themes of friendship, grief, and mortality with remarkable sophistication.',
    realPeople: ['Gilgamesh (historical king of Uruk)'],
    quote: 'When the gods created mankind, they allotted death to mankind, but life they retained in their own keeping.',
    quoteAttribution: 'The Epic of Gilgamesh (Tablet X)',
    geographicLocation: { lat: 31.3220, lng: 45.6380, name: 'Uruk, ancient Mesopotamia (modern Iraq)' },
    continent: 'Asia',
    subjectTags: ['storytelling', 'ancient_history', 'narrative', 'mesopotamia'],
    worldId: 'story-tree',
    guideId: 'grandmother-anaya',
    adventureType: 'artifact_hunt',
    difficultyTier: 2,
    prerequisites: [],
    unlocks: ['entry-scheherazade'],
    funFact: 'The story was lost for almost 2,000 years, buried in the Library of Ashurbanipal, until archaeologists dug it up in 1853.',
    imagePrompt:
      'Ancient clay tablets with cuneiform writing glowing softly, displayed in a Ghibli-style ancient Mesopotamian setting under a great tree, warm amber evening light, text fragments floating like leaves',
    status: 'published',
  },
  {
    id: 'entry-scheherazade',
    type: 'person',
    title: 'Scheherazade and One Thousand and One Nights',
    year: 800,
    yearDisplay: '~800–900 CE',
    era: 'medieval',
    descriptionChild:
      'Scheherazade saved her life by telling stories. She told the king one story every night for 1001 nights — and every night, she stopped at the most exciting part so he would let her live to finish it tomorrow.',
    descriptionOlder:
      'One Thousand and One Nights is a collection of stories from across the Islamic Golden Age. Scheherazade used narrative itself as a survival strategy — she understood that stories have power, and that the desire to know what happens next is universal.',
    descriptionParent:
      'The Arabian Nights (One Thousand and One Nights) are a collection of Middle Eastern and South Asian folk tales compiled over centuries during the Islamic Golden Age. Scheherazade\'s frame narrative introduces children to meta-storytelling and the power of suspended narrative.',
    realPeople: ['Scheherazade (folk character)'],
    quote: 'I have heard, O wise and wary King, that there was once...',
    quoteAttribution: 'Traditional opening of the Arabian Nights',
    geographicLocation: { lat: 33.3152, lng: 44.3661, name: 'Baghdad, Iraq (Islamic Golden Age center)' },
    continent: 'Asia',
    subjectTags: ['storytelling', 'narrative_structure', 'islamic_golden_age', 'folklore'],
    worldId: 'story-tree',
    guideId: 'grandmother-anaya',
    adventureType: 'guided_expedition',
    difficultyTier: 2,
    prerequisites: ['entry-gilgamesh'],
    unlocks: ['entry-gutenberg-press'],
    funFact: 'Aladdin and Ali Baba and the 40 Thieves were NOT in the original Arabic manuscript — they were added by a French translator in 1704.',
    imagePrompt:
      'Scheherazade telling stories under silk canopies, glowing story-orbs floating around her, rich Islamic golden age architectural details, Ghibli-style warm lantern light, story pages floating like golden leaves',
    status: 'published',
  },
  {
    id: 'entry-gutenberg-press',
    type: 'invention',
    title: "Gutenberg's Printing Press",
    year: 1440,
    yearDisplay: '~1440 CE',
    era: 'renaissance',
    descriptionChild:
      'Before Gutenberg invented the printing press, every book had to be written by hand. It took a monk a year to copy one Bible. Gutenberg\'s machine could print hundreds of books in the same time — and suddenly, everyone could have a story of their own.',
    descriptionOlder:
      'The printing press with movable type democratized knowledge. Within 50 years of its invention in 1440, over 20 million books were in circulation across Europe. Literacy rates began to rise. The Renaissance, the Reformation, and the Scientific Revolution were all accelerated by Gutenberg\'s press.',
    descriptionParent:
      'Gutenberg\'s printing press (c. 1440) catalyzed the information revolution of the 15th century. The Gutenberg Bible (1455) was its first major product. Understanding this invention helps children grasp how information technology changes civilization — a lesson with obvious modern parallels.',
    realPeople: ['Johannes Gutenberg'],
    quote: 'It is a press, certainly, but a press from which shall flow in inexhaustible streams, the most abundant and most marvelous liquor that has ever flowed to relieve the thirst of men.',
    quoteAttribution: 'Johannes Gutenberg (attributed)',
    geographicLocation: { lat: 49.9929, lng: 8.2473, name: 'Mainz, Germany' },
    continent: 'Europe',
    subjectTags: ['communication', 'literacy', 'invention', 'renaissance', 'books'],
    worldId: 'story-tree',
    guideId: 'grandmother-anaya',
    adventureType: 'reenactment',
    difficultyTier: 2,
    prerequisites: ['entry-scheherazade'],
    unlocks: ['entry-rosetta-stone'],
    funFact: 'Gutenberg did not get rich from his invention. He was sued by his financier and lost his printing equipment to pay debts.',
    imagePrompt:
      'A Renaissance-era print workshop with Gutenberg\'s press, freshly printed pages floating in warm amber light, Ghibli style with ink and woodblock textures, books multiplying on shelves in time-lapse',
    status: 'published',
  },
  {
    id: 'entry-rosetta-stone',
    type: 'artifact',
    title: 'The Rosetta Stone: One Story, Three Languages',
    year: -196,
    yearDisplay: '196 BCE',
    era: 'ancient',
    descriptionChild:
      'The Rosetta Stone is a rock covered in writing — but the same words in three different languages. When archaeologists found it in 1799, they used it like a code book to read Ancient Egyptian writing for the first time in 1,400 years.',
    descriptionOlder:
      'The Rosetta Stone (196 BCE) helped unlock Egyptian hieroglyphics. The same decree — issued by Ptolemy V — was written in hieroglyphic, Demotic, and Ancient Greek. Scholar Jean-François Champollion used the known Greek text to decode the hieroglyphs in 1822, opening 3,000 years of Egyptian history.',
    descriptionParent:
      'The Rosetta Stone connects language, history, and archaeology. It demonstrates that writing systems are human constructs that can be decoded, and that multiple languages can express the same meaning. It is a touchstone entry connecting The Story Tree to The Translation Garden.',
    realPeople: ['Jean-François Champollion', 'Thomas Young'],
    quote: null,
    quoteAttribution: null,
    geographicLocation: { lat: 31.4041, lng: 30.4165, name: 'Rosetta (Rashid), Egypt' },
    continent: 'Africa',
    subjectTags: ['language', 'archaeology', 'ancient_egypt', 'writing', 'decoding'],
    worldId: 'story-tree',
    guideId: 'grandmother-anaya',
    adventureType: 'artifact_hunt',
    difficultyTier: 3,
    prerequisites: ['entry-gutenberg-press'],
    unlocks: [],
    funFact: 'The Rosetta Stone is currently in the British Museum in London, but Egypt has been asking for its return since 2003.',
    imagePrompt:
      'The Rosetta Stone displayed under a great tree, three columns of glowing text in different scripts, warm amber artifact lighting, Ghibli-style ancient museum setting with the three language-scripts floating like leaves',
    status: 'published',
  },
];
