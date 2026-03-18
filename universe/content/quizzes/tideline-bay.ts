/**
 * Quiz Questions ΓÇö Tideline Bay (Suki Tanaka-Reyes)
 * Ocean Science / Biology
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const TIDELINE_BAY_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-giant-squid-discovery ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-giant-squid-t1',
    entryId: 'entry-giant-squid-discovery',
    difficultyTier: 1,
    question: 'In 2004, scientist Tsunemi Kubodera photographed a giant squid for the first time. Where was he when he took the photographs?',
    options: [
      'On a beach in Japan',
      '900 metres below the surface of the Pacific Ocean',
      'Inside a large aquarium tank',
      'On a boat near the surface of the ocean',
    ],
    correctIndex: 1,
    explanation: 'Kubodera lowered a camera on a long line 900 metres deep into the Pacific Ocean near the Ogasawara Islands. The giant squid attacked the bait attached to the camera, letting scientists photograph it for the very first time in its natural home.',
  },
  {
    id: 'quiz-giant-squid-t2',
    entryId: 'entry-giant-squid-discovery',
    difficultyTier: 2,
    question: 'The giant squid had been described in sailor stories for thousands of years before scientists proved it was real. What does this tell us about those old stories?',
    options: [
      'Sailors made up sea monster stories to frighten children',
      'Folklore sometimes preserves real observations long before science catches up',
      'Scientists always knew about giant squid but were keeping it secret',
      'The squid in sailors\' stories were much bigger than real giant squid',
    ],
    correctIndex: 1,
    explanation: 'When Kubodera photographed the living giant squid in 2004, it confirmed that sailors really had encountered real creatures behind their sea monster legends. Stories passed down for generations can carry genuine zoological truth ΓÇö even when scientists haven\'t yet caught up with proof.',
  },
  {
    id: 'quiz-giant-squid-t3',
    entryId: 'entry-giant-squid-discovery',
    difficultyTier: 3,
    question: 'Giant squid have the largest eyes in the animal kingdom ΓÇö the size of dinner plates. Why might enormous eyes be especially useful in the deep ocean?',
    options: [
      'Larger eyes look more frightening to predators',
      'Big eyes help detect the faintest flashes of bioluminescent light in total darkness',
      'Bigger eyes help the squid see colours more clearly',
      'Large eyes let them spot food on the ocean surface far above them',
    ],
    correctIndex: 1,
    explanation: 'At 900 metres deep, no sunlight reaches at all. Giant squid\'s dinner-plate-sized eyes can gather tiny traces of bioluminescent light ΓÇö the faint glow produced by deep-sea creatures. In an environment of complete darkness, even a faint flash of light carries vital information about food, predators, or mates.',
  },

  // ΓöÇΓöÇΓöÇ entry-humpback-whale-migration ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-humpback-t1',
    entryId: 'entry-humpback-whale-migration',
    difficultyTier: 1,
    question: 'Humpback whales travel a very long distance every year. How far do they migrate?',
    options: [
      'About 500 kilometres',
      '16,000 kilometres ΓÇö from cold polar waters to warm tropical waters',
      'They stay in the same ocean their whole lives',
      'About 3,000 kilometres to the nearest coral reef',
    ],
    correctIndex: 1,
    explanation: 'Humpback whales make one of the longest migrations of any mammal ΓÇö up to 16,000 kilometres each way. They travel from cold feeding waters near the poles to warm breeding waters near the equator, and then back again, every single year.',
  },
  {
    id: 'quiz-humpback-t2',
    entryId: 'entry-humpback-whale-migration',
    difficultyTier: 2,
    question: 'Scientists discovered that humpback whale songs spread between whale populations the way trends spread between human communities. What does this prove about whale songs?',
    options: [
      'All whales are born knowing the same song ΓÇö it\'s in their genes',
      'Whale songs are learned and transmitted socially ΓÇö they are a form of culture',
      'Male whales invent new songs to attract females during every breeding season',
      'Songs are created by sound reflecting off the ocean floor',
    ],
    correctIndex: 1,
    explanation: 'If songs were genetic, all whales would sing the same song forever. But whale songs evolve over time ΓÇö new phrases appear, old ones disappear ΓÇö and these changes spread from one population to another. Young whales learn from adults. This is cultural transmission, just like how human music and language spread across communities.',
  },
  {
    id: 'quiz-humpback-t3',
    entryId: 'entry-humpback-whale-migration',
    difficultyTier: 3,
    question: 'Humpback whale migration and cultural song transmission challenge the idea that culture is uniquely human. Why does this matter beyond whales?',
    options: [
      'It means we should teach whales in schools alongside human students',
      'It invites us to reconsider which cognitive abilities are truly unique to humans and which are shared more broadly across life',
      'It proves whales are more intelligent than humans',
      'It means whale songs have copyright protection under international law',
    ],
    correctIndex: 1,
    explanation: 'Culture ΓÇö learning, modifying, and transmitting behaviour socially ΓÇö was long considered an exclusively human achievement. Humpback whale song transmission fits the scientific definition of culture. When we find culture, learning, and communication in other species, it expands our understanding of what minds can do and deepens respect for other forms of life in the ocean.',
  },

  // ΓöÇΓöÇΓöÇ entry-coral-spawning ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-coral-spawning-t1',
    entryId: 'entry-coral-spawning',
    difficultyTier: 1,
    question: 'What happens during coral spawning on the Great Barrier Reef?',
    options: [
      'The coral changes colour for the summer season',
      'Millions of tiny egg packets float upward through the water at the same time, like underwater snow going upwards',
      'All the fish on the reef swim to the surface together',
      'The reef lights up with bioluminescence every evening',
    ],
    correctIndex: 1,
    explanation: 'Once a year, on the same night, billions of coral polyps release tiny bundles of eggs and sperm simultaneously. These tiny pink and orange packets float upward through the water like snow falling in reverse. It is one of the most spectacular natural events on Earth.',
  },
  {
    id: 'quiz-coral-spawning-t2',
    entryId: 'entry-coral-spawning',
    difficultyTier: 2,
    question: 'Three environmental signals trigger all the coral on a reef to spawn on the same night. Which three signals work together?',
    options: [
      'Temperature, water salinity, and ocean depth',
      'The full moon, water temperature reaching a threshold, and changes in day length',
      'The tides, wind direction, and the position of the sun',
      'Rainfall, wave size, and the presence of fish',
    ],
    correctIndex: 1,
    explanation: 'Coral polyps each respond independently to the same three cues: the full moon, water reaching the right temperature, and the change in day length as seasons shift. Because every polyp on the reef responds to the same signals, they all spawn on the same night ΓÇö creating a reef-wide event without any single coral telling the others what to do.',
  },
  {
    id: 'quiz-coral-spawning-t3',
    entryId: 'entry-coral-spawning',
    difficultyTier: 3,
    question: 'Coral spawning is an example of emergent coordination ΓÇö complex group behaviour arising from simple individual responses. Why is this scientifically important?',
    options: [
      'It proves that coral must have a hidden brain that scientists haven\'t found yet',
      'It shows how complex, organised group behaviour can arise without any leader or central control, just from individuals responding to shared signals',
      'It means coral are the most intelligent animals in the ocean',
      'It shows that the Great Barrier Reef is a single living organism',
    ],
    correctIndex: 1,
    explanation: 'Coral have no brain, no nervous system, and no way to communicate with each other ΓÇö yet billions of individual polyps act as one on the same night. This emergent behaviour demonstrates a powerful systems-thinking principle: order and coordination can arise from simple rules, without anyone being in charge. The same principle appears in ant colonies, flocking birds, and traffic patterns.',
  },

  // ΓöÇΓöÇΓöÇ entry-coelacanth-living-fossil ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-coelacanth-t1',
    entryId: 'entry-coelacanth-living-fossil',
    difficultyTier: 1,
    question: 'What was so surprising about the coelacanth fish that Marjorie Courtenay-Latimer found in 1938?',
    options: [
      'It was the largest fish ever seen',
      'It was a fish scientists had believed went extinct with the dinosaurs, 66 million years ago',
      'It could survive outside water for several hours',
      'It was glowing with bioluminescence in the daytime',
    ],
    correctIndex: 1,
    explanation: 'Scientists had only ever seen coelacanths as fossils and believed they went extinct about 66 million years ago ΓÇö the same time the dinosaurs died. Finding one alive in a fisherman\'s catch in South Africa in 1938 was one of the greatest surprises in the history of biology.',
  },
  {
    id: 'quiz-coelacanth-t2',
    entryId: 'entry-coelacanth-living-fossil',
    difficultyTier: 2,
    question: 'Marjorie Courtenay-Latimer had no formal training in fish science, yet she recognised the coelacanth\'s importance. How was she able to do this?',
    options: [
      'She had secretly been studying fish for years in a private laboratory',
      'She regularly visited fishing docks to find specimens and recognised the fish from a fossil illustration in a book',
      'A professional scientist had described the fish to her just weeks before',
      'She had seen a live coelacanth in a photograph from Japan',
    ],
    correctIndex: 1,
    explanation: 'Courtenay-Latimer visited local fishing docks regularly to collect interesting specimens for her museum. When she saw the large blue-scaled fish, she recognised it from a drawing of a fossil in a reference book. Her habit of careful observation, combined with the knowledge she\'d built up herself, let her see something formally trained scientists had missed for decades.',
  },
  {
    id: 'quiz-coelacanth-t3',
    entryId: 'entry-coelacanth-living-fossil',
    difficultyTier: 3,
    question: 'The coelacanth\'s discovery taught scientists that "absence from the fossil record is not evidence of absence." What does this mean for how we think about extinction?',
    options: [
      'All species thought to be extinct are probably still alive somewhere',
      'Not finding an organism in fossils doesn\'t mean it no longer exists ΓÇö the fossil record is incomplete and many living things are never preserved',
      'The fossil record is so complete that we can be certain all gaps represent genuine extinctions',
      'Scientists should stop declaring any species extinct until they have searched every ocean',
    ],
    correctIndex: 1,
    explanation: 'The fossil record only captures creatures that happened to be fossilised ΓÇö a tiny fraction of all life. A gap in the fossil record might mean a species went extinct, or it might mean conditions were never right for fossilisation. The coelacanth was alive in the deep ocean for 66 million years while leaving no fossils that we had found. It teaches scientists to hold extinction declarations with appropriate humility.',
  },
];
