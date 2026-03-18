/**
 * Quiz Questions ΓÇö Frost Peaks (Mira Petrov)
 * Geology / Rocks & Minerals
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const FROST_PEAKS_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-mary-anning ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-mary-anning-t1',
    entryId: 'entry-mary-anning',
    difficultyTier: 1,
    question: 'What was Mary Anning doing when she made her famous discoveries?',
    options: [
      'Working as a university professor in London',
      'Searching the sea cliffs of southern England for fossils to sell',
      'Digging in the Egyptian desert with a team of archaeologists',
      'Reading old scientific books in a library near her home',
    ],
    correctIndex: 1,
    explanation: 'Mary Anning grew up poor in Lyme Regis and searched the Jurassic Coast cliffs to find fossils she could sell. Before she was 13, she found a complete ichthyosaur skeleton ΓÇö a giant sea reptile nobody knew had ever lived. She kept searching the cliffs throughout her life and kept finding creatures that changed our understanding of ancient life on Earth.',
  },
  {
    id: 'quiz-mary-anning-t2',
    entryId: 'entry-mary-anning',
    difficultyTier: 2,
    question: 'A Fellow of the Geological Society said Anning had "contributed more to geology than any other person in England" ΓÇö at a meeting she was not allowed to attend. Why was she excluded?',
    options: [
      'She had not submitted an application to become a member',
      'She was excluded because she was a woman and working class ΓÇö the Geological Society did not admit women until 1904',
      'She had argued publicly with society members about her discoveries',
      'Her discoveries were too controversial to be discussed in an official scientific meeting',
    ],
    correctIndex: 1,
    explanation: 'The Geological Society of London excluded women from membership until 1904 ΓÇö decades after Anning\'s death. She was also working class, which made the exclusion doubly strict. Men who bought and presented her discoveries received the credit and the society memberships. Anning herself remained outside the institutions whose knowledge she was building.',
  },
  {
    id: 'quiz-mary-anning-t3',
    entryId: 'entry-mary-anning',
    difficultyTier: 3,
    question: 'The tongue-twister "she sells seashells by the seashore" is almost certainly about Mary Anning. What does it mean that her memory was preserved in a children\'s rhyme rather than in the scientific literature?',
    options: [
      'It shows that children\'s culture is better at preserving important stories than scientific journals',
      'It illustrates how women and working-class contributors were excluded from official scientific records ΓÇö remembered in popular culture while the formal history credited others',
      'It proves that Mary Anning was primarily known as a seashell seller, not a fossil hunter',
      'It means the rhyme was deliberately written by scientists to honour her contribution',
    ],
    correctIndex: 1,
    explanation: 'Anning\'s work shaped paleontology but her name rarely appeared in the scientific papers it generated. She was remembered most durably in a children\'s rhyme ΓÇö which is telling. Official scientific culture had no comfortable place for her. Popular memory kept her alive in the margins. Recovering her full story requires specifically looking for what official histories left out, and asking who was allowed to receive credit for the work they actually did.',
  },

  // ΓöÇΓöÇΓöÇ entry-wegener-continental-drift ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-wegener-t1',
    entryId: 'entry-wegener-continental-drift',
    difficultyTier: 1,
    question: 'What did Alfred Wegener notice that led him to propose the theory of continental drift?',
    options: [
      'That different continents had different types of volcanoes',
      'That South America and Africa look like puzzle pieces that fit together',
      'That earthquakes only happened near the edges of continents',
      'That fossils found in Africa were older than fossils found anywhere else',
    ],
    correctIndex: 1,
    explanation: 'Wegener looked at a world map and noticed that the coastlines of South America and Africa fit together like puzzle pieces. He also found matching fossils and rock types on both sides of the Atlantic Ocean. He proposed that all the continents were once joined as one supercontinent ΓÇö which he called Pangaea ΓÇö that broke apart and slowly drifted to their current positions.',
  },
  {
    id: 'quiz-wegener-t2',
    entryId: 'entry-wegener-continental-drift',
    difficultyTier: 2,
    question: 'Scientists mocked Wegener for decades, even though his evidence was good. What was their main objection?',
    options: [
      'They believed Africa and South America had always been separate',
      'Wegener could show that the continents had moved but could not explain the mechanism ΓÇö what force was powerful enough to move entire continents',
      'He was a meteorologist, not a geologist, so scientists did not trust his observations',
      'The matching fossils he found were later proved to be different species',
    ],
    correctIndex: 1,
    explanation: 'Wegener\'s evidence ΓÇö matching coastlines, identical fossils, same rock formations on opposite sides of the Atlantic ΓÇö was compelling. But he could not explain how continents could possibly move through solid ocean floor. Without a mechanism, many geologists refused to accept the conclusion. The mechanism (seafloor spreading and plate tectonics) was only discovered in the 1960s ΓÇö vindicating Wegener entirely, 30 years after his death.',
  },
  {
    id: 'quiz-wegener-t3',
    entryId: 'entry-wegener-continental-drift',
    difficultyTier: 3,
    question: 'Wegener was correct about continental drift but was dismissed for 50 years. What does this tell us about the relationship between evidence and mechanism in scientific acceptance?',
    options: [
      'A scientist who cannot explain the mechanism of their discovery should keep their theory secret until they can',
      'Even strong observational evidence can be systematically rejected by a scientific community when no satisfactory physical mechanism exists to explain it ΓÇö mechanism and evidence usually advance together',
      'Wegener\'s story proves that the scientific community is closed to new ideas',
      'Scientists are right to reject all theories that lack a complete mechanistic explanation',
    ],
    correctIndex: 1,
    explanation: 'Science asks both "what happened?" and "how?" Wegener answered the first question convincingly. But without an answer to "how can entire continents move?", the community could not accept the conclusion ΓÇö the mechanism was simply too implausible given what was known about Earth\'s interior. When plate tectonics provided the mechanism in the 1960s, continental drift became immediately accepted everywhere. Evidence without mechanism is often dismissed; mechanism and evidence need each other.',
  },

  // ΓöÇΓöÇΓöÇ entry-ice-cores-climate ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-ice-cores-t1',
    entryId: 'entry-ice-cores-climate',
    difficultyTier: 1,
    question: 'Scientists drill into Antarctic ice to pull out long cylinders. What can they find trapped inside those cylinders?',
    options: [
      'Ancient sea creatures frozen in the ice',
      'Tiny bubbles of ancient air, trapped when the snow that formed the ice fell thousands of years ago',
      'Layers of ancient soil that blew onto Antarctica in ice ages',
      'Crystals of salt from ancient oceans that froze long ago',
    ],
    correctIndex: 1,
    explanation: 'Each year, snow falls in Antarctica and compresses into a new layer of ice. As it compresses, it traps tiny bubbles of the air from that year. By drilling out ice cores and analysing those bubbles, scientists can read what Earth\'s atmosphere was like thousands of years in the past ΓÇö long before any person was alive, and long before any measurements were taken.',
  },
  {
    id: 'quiz-ice-cores-t2',
    entryId: 'entry-ice-cores-climate',
    difficultyTier: 2,
    question: 'The longest ice core record goes back 800,000 years and spans eight ice ages. What does the COΓéé data in these cores show about the present day?',
    options: [
      'COΓéé levels today are lower than at the peak of the last ice age',
      'Current atmospheric COΓéé levels are higher than at any point in the entire 800,000-year record',
      'COΓéé levels have stayed roughly the same for the past 800,000 years',
      'COΓéé levels were much higher 500,000 years ago than they are today',
    ],
    correctIndex: 1,
    explanation: 'The 800,000-year ice core record shows that COΓéé cycled between about 180 ppm (during ice ages) and 280 ppm (during warm periods). Today\'s atmospheric COΓéé is about 420 ppm ΓÇö higher than at any point in the entire record. This data is one of the clearest scientific demonstrations that current atmospheric changes are outside the natural range of variation observed over geological time.',
  },
  {
    id: 'quiz-ice-cores-t3',
    entryId: 'entry-ice-cores-climate',
    difficultyTier: 3,
    question: 'Ice cores from before 1750 contain pre-industrial air. Scientists compare those ancient air bubbles to today\'s atmosphere. Why is this comparison so scientifically powerful?',
    options: [
      'Pre-industrial air was cleaner and scientists want to recreate it',
      'It provides a direct, controlled comparison ΓÇö the same planet, the same measurement technique, air from before industrial emissions versus air from after ΓÇö making the human contribution to atmospheric change directly visible',
      'It allows scientists to calculate how much oxygen was used by animals during the ice ages',
      'It proves that climate has always been changing and humans are not responsible for recent changes',
    ],
    correctIndex: 1,
    explanation: 'Ice cores create a natural controlled experiment. The pre-industrial air bubbles are Earth\'s atmosphere before large-scale fossil fuel burning. The post-industrial atmosphere can be measured today. The difference ΓÇö rising COΓéé, methane, and other gases ΓÇö is measurable, dated precisely to the industrial era, and cannot be attributed to natural variation because nothing in 800,000 years of natural variation produced changes this fast or this large. It is some of the most direct evidence available.',
  },

  // ΓöÇΓöÇΓöÇ entry-ring-of-fire ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-ring-of-fire-t1',
    entryId: 'entry-ring-of-fire',
    difficultyTier: 1,
    question: 'Where is the Ring of Fire located, and what happens there?',
    options: [
      'Around the Arctic Ocean ΓÇö it is where icebergs form and melt',
      'Around the edges of the Pacific Ocean ΓÇö it is where 75% of the world\'s volcanoes and 90% of its earthquakes occur',
      'Along the equator ΓÇö it is where the Earth is hottest',
      'Under the Atlantic Ocean ΓÇö it is where ocean ridges form',
    ],
    correctIndex: 1,
    explanation: 'The Ring of Fire is a horseshoe-shaped zone of intense geological activity running around the edges of the Pacific Ocean ΓÇö through South America, North America, Japan, the Philippines, and New Zealand. It marks the boundaries where the Pacific tectonic plate pushes under surrounding plates, generating both volcanoes and earthquakes.',
  },
  {
    id: 'quiz-ring-of-fire-t2',
    entryId: 'entry-ring-of-fire',
    difficultyTier: 2,
    question: 'The Ring of Fire produces volcanoes where the Pacific Plate subducts beneath other plates. What does "subduction" mean, and why does it create volcanoes?',
    options: [
      'Subduction means plates sliding sideways past each other; this cracks the surface and lets magma escape',
      'Subduction means one plate sinking beneath another; as it descends, the intense heat and pressure melt rock into magma, which rises to the surface as volcanoes',
      'Subduction means two plates pulling apart; the gap between them fills with molten rock from below',
      'Subduction is when a plate floats on the water beneath the ocean floor',
    ],
    correctIndex: 1,
    explanation: 'Where the Pacific Plate meets surrounding plates, the denser oceanic plate sinks (subducts) beneath the lighter continental plate. As it descends deeper into the Earth, the intense heat and pressure, along with water released from the sinking rock, cause surrounding material to melt into magma. This magma is less dense than the surrounding rock, so it rises through the crust and erupts as volcanoes.',
  },
  {
    id: 'quiz-ring-of-fire-t3',
    entryId: 'entry-ring-of-fire',
    difficultyTier: 3,
    question: 'Mount Pinatubo erupted in 1991 and cooled the entire Earth by 0.5┬░C for two years by injecting sulfur dioxide into the stratosphere. What does this reveal about the connections between geological events and climate?',
    options: [
      'It proves that volcanoes are more powerful than human activity and can always reverse climate change',
      'It shows that large geological events can have global atmospheric consequences ΓÇö injecting particles that reflect sunlight and temporarily cool the whole planet ΓÇö demonstrating how interconnected Earth\'s systems are',
      'It means scientists should set off volcanoes deliberately to cool the Earth',
      'It shows that climate is controlled only by geological forces, not by atmospheric chemistry',
    ],
    correctIndex: 1,
    explanation: 'Pinatubo\'s eruption sent 17 million tonnes of sulfur dioxide into the stratosphere, where it formed a reflective haze that reduced the amount of sunlight reaching Earth\'s surface. Average global temperatures dropped measurably for two years. This demonstrates that Earth\'s geological, atmospheric, and climatic systems are tightly coupled ΓÇö a single geological event can alter temperatures worldwide. It also provides scientists with natural experiments for understanding how particles in the atmosphere affect climate.',
  },
];
