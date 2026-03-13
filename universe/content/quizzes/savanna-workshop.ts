/**
 * Quiz Questions — Savanna Workshop (Zara Ngozi)
 * Engineering / Simple Machines
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const SAVANNA_WORKSHOP_QUIZZES: readonly EntryQuizQuestion[] = [

  // ─── entry-archimedes-lever ───────────────────────────────────────────────────
  {
    id: 'quiz-lever-t1',
    entryId: 'entry-archimedes-lever',
    difficultyTier: 1,
    question: 'Archimedes said "Give me a lever long enough and I can move the world." What does a lever do?',
    options: [
      'It adds force by using fire and heat',
      'It multiplies your force — a smaller push can move a much heavier object',
      'It stores energy and releases it quickly',
      'It changes the direction of water flow',
    ],
    correctIndex: 1,
    explanation: 'A lever is one of the six simple machines. By moving the fulcrum (pivot point) closer to the heavy load, a small force applied over a longer distance can lift something very heavy. Archimedes understood this principle mathematically around 250 BCE and was the first to prove why it works.',
  },
  {
    id: 'quiz-lever-t2',
    entryId: 'entry-archimedes-lever',
    difficultyTier: 2,
    question: 'Archimedes also discovered the principle of buoyancy — why things float. How did he realize this?',
    options: [
      'He watched ships sail in the harbor of Syracuse',
      'He got into a bathtub and noticed the water rising, revealing that displaced water equals the weight of the object',
      'He dropped objects off a cliff into the sea',
      'A student of his left a cup of water on a scale',
    ],
    correctIndex: 1,
    explanation: 'Archimedes\' bathtub moment (he supposedly shouted "Eureka!" — I found it!) revealed that any object submerged in fluid displaces water equal to its own volume. This is why ships float: their large volume displaces enough water to equal their weight, even though metal is denser than water.',
  },
  {
    id: 'quiz-lever-t3',
    entryId: 'entry-archimedes-lever',
    difficultyTier: 3,
    question: 'Archimedes used his mechanical knowledge to defend the city of Syracuse from a Roman naval invasion. How?',
    options: [
      'He designed stone walls strong enough to withstand Roman catapults',
      'He built war machines: cranes that capsized Roman ships and curved mirrors that focused sunlight to set them on fire',
      'He invented an underwater net to trap Roman galleys in the harbor',
      'He flooded the harbor using a system of water wheels and gates',
    ],
    correctIndex: 1,
    explanation: 'Archimedes designed the Claw of Archimedes (a crane with a metal hook that grabbed Roman ships and capsized them) and possibly a system of reflective mirrors to focus sunlight and ignite ships. The Roman general Marcellus reportedly ordered his soldiers not to kill Archimedes when Syracuse fell — but a soldier disobeyed and killed him anyway.',
  },

  // ─── entry-nok-iron-smelting ──────────────────────────────────────────────────
  {
    id: 'quiz-nok-t1',
    entryId: 'entry-nok-iron-smelting',
    difficultyTier: 1,
    question: 'The Nok people of Nigeria were smelting iron around 500 BCE. Why was iron technology so important?',
    options: [
      'Iron tools were more decorative than stone ones',
      'Iron tools were harder and more durable than stone or copper, enabling better farming and construction',
      'Iron was much lighter than stone, making it easier to carry',
      'Iron could be melted and cast into any shape much more easily than stone',
    ],
    correctIndex: 1,
    explanation: 'Iron is harder than bronze or copper, holds a sharper edge, and is far more abundant. Iron tools and weapons transformed agriculture (harder plows break tougher soil), construction, and military capability. The Iron Age changed the ancient world as profoundly as the Industrial Revolution.',
  },
  {
    id: 'quiz-nok-t2',
    entryId: 'entry-nok-iron-smelting',
    difficultyTier: 2,
    question: 'Some European historians once claimed Africa invented iron smelting after it arrived from Europe. What do archaeologists now know?',
    options: [
      'This is confirmed — iron smelting moved from Europe to West Africa around 300 BCE',
      'African iron smelting developed independently — and some sites in central Africa may predate Europe\'s iron age',
      'African iron smelting was imported from China via the Silk Road',
      'The Nok iron tools were actually made from copper, not iron',
    ],
    correctIndex: 1,
    explanation: 'Archaeological evidence shows iron smelting in sub-Saharan Africa developed independently — not imported from Europe. Some sites in central Africa (Rwanda, Tanzania) date as far back as 1400–2000 BCE, potentially earlier than European iron smelting. The claim that Africa received technology from Europe reflects 19th-century colonial bias, not archaeology.',
  },
  {
    id: 'quiz-nok-t3',
    entryId: 'entry-nok-iron-smelting',
    difficultyTier: 3,
    question: 'The Nok are also famous for something besides iron — one of Africa\'s oldest known sculptural traditions. What?',
    options: [
      'Elaborate rock paintings similar to those at Lascaux, France',
      'Terracotta figurines with distinctive cylindrical eyes, showing sophisticated artistic traditions 2,500 years ago',
      'Giant stone monoliths similar to Stonehenge',
      'Bronze castings that rival ancient Greek sculpture',
    ],
    correctIndex: 1,
    explanation: 'Nok terracotta figurines (c. 1500 BCE–300 CE) are the oldest known sculptural tradition in sub-Saharan Africa. Their distinctive cylindrical eyes and stylized forms show a sophisticated artistic culture parallel to their iron-working. The same civilization creating engineering technology was also creating high art — not surprising, but worth noting given how African civilizations are often taught.',
  },

  // ─── entry-great-zimbabwe-walls ───────────────────────────────────────────────
  {
    id: 'quiz-zimbabwe-t1',
    entryId: 'entry-great-zimbabwe-walls',
    difficultyTier: 1,
    question: 'Great Zimbabwe\'s walls are remarkable for a unique engineering reason. What is it?',
    options: [
      'They are the tallest stone walls ever built in Africa',
      'They were built without any mortar or cement — the stones are precisely shaped to hold each other',
      'They were built entirely underwater and then raised',
      'They can withstand earthquakes due to their circular design',
    ],
    correctIndex: 1,
    explanation: 'Great Zimbabwe\'s walls (1100–1450 CE) were built using a technique called dry-stone masonry — no mortar at all. The granite blocks are cut and stacked so precisely that they interlock under their own weight. The largest wall is 11 meters high and 5 meters thick, built this way.',
  },
  {
    id: 'quiz-zimbabwe-t2',
    entryId: 'entry-great-zimbabwe-walls',
    difficultyTier: 2,
    question: 'When 19th-century European explorers first saw Great Zimbabwe, many refused to believe Africans built it. What did they claim instead?',
    options: [
      'That it was built by Romans who had explored southern Africa',
      'That it was built by the Queen of Sheba, ancient Phoenicians, or lost Israelites — anyone but local African civilizations',
      'That it was a natural rock formation, not a human structure',
      'That it was built by Chinese merchants on the Silk Road',
    ],
    correctIndex: 1,
    explanation: 'Colonial-era "explorers" and archaeologists invented theories attributing Great Zimbabwe to ancient Phoenicians, Israelites, Egyptians, or Arabs — anyone but the Shona people who actually built it. This was racist motivated reasoning: the assumption that Black Africans could not have created sophisticated architecture. Modern archaeology confirms the Shona built it between 1100–1450 CE.',
  },
  {
    id: 'quiz-zimbabwe-t3',
    entryId: 'entry-great-zimbabwe-walls',
    difficultyTier: 3,
    question: 'Great Zimbabwe was a major trade hub. What precious commodity was mined nearby that made it one of Africa\'s wealthiest cities?',
    options: [
      'Diamonds, which were traded to Egyptian merchants',
      'Gold, which was traded through Arab merchants to Persia, India, and China',
      'Copper, which was used to make coins across East Africa',
      'Iron, which was exported across the Silk Road',
    ],
    correctIndex: 1,
    explanation: 'The Zimbabwe Plateau is rich in gold deposits. The Shona Kingdom controlled the gold trade between the interior and the Swahili Coast ports (like Kilwa and Sofala), from where Arab merchants shipped gold to Persia, India, and China. Zheng He\'s Chinese fleet visited East African ports during this era — Great Zimbabwe was connected to a global trade network.',
  },

  // ─── entry-wright-brothers-workshop ──────────────────────────────────────────
  {
    id: 'quiz-wright-t1',
    entryId: 'entry-wright-brothers-workshop',
    difficultyTier: 1,
    question: 'How long did the Wright Brothers\' first powered flight last?',
    options: ['30 seconds', '12 seconds', '2 minutes', '5 minutes'],
    correctIndex: 1,
    explanation: 'Orville Wright\'s first flight on December 17, 1903 at Kitty Hawk, North Carolina lasted only 12 seconds and traveled 120 feet. By the end of that day, they made four flights — the longest being 59 seconds and 852 feet. Twelve seconds changed the world.',
  },
  {
    id: 'quiz-wright-t2',
    entryId: 'entry-wright-brothers-workshop',
    difficultyTier: 2,
    question: 'The Wright Brothers were bicycle mechanics, not scientists or engineers. How did this background actually help them?',
    options: [
      'Bicycles are similar to airplanes in their basic structure',
      'Working with bicycles taught them about balance, control, and how to make small adjustments to keep moving systems stable',
      'Bicycle sales funded their aviation experiments',
      'They used bicycle parts to build the first airplane engine',
    ],
    correctIndex: 1,
    explanation: 'The key insight the Wright Brothers had was that flight required active control — a pilot keeping a dynamic system balanced, like balancing on a bicycle. Other experimenters tried to build naturally stable aircraft that wouldn\'t need constant adjustment. The Wrights understood that controlled instability was the answer, not rigid stability.',
  },
  {
    id: 'quiz-wright-t3',
    entryId: 'entry-wright-brothers-workshop',
    difficultyTier: 3,
    question: 'Samuel Langley, secretary of the Smithsonian and a professional scientist with a $70,000 government grant, failed to achieve powered flight nine days before the Wright Brothers succeeded with $2,000. What does this suggest?',
    options: [
      'Government-funded science is always less effective than private innovation',
      'More money and institutional support guarantees better results',
      'The right problem framing and practical hands-on testing sometimes matters more than credentials and resources',
      'Langley was sabotaged by the Wright Brothers',
    ],
    correctIndex: 2,
    explanation: 'Langley focused on power — making a bigger engine. The Wrights focused on control — understanding how to steer and balance. Langley\'s "Aerodrome" was powerful but uncontrollable. The Wrights\' aircraft was underpowered but precisely steerable. This is a lesson in how the question you\'re trying to answer shapes what solutions you find.',
  },
];
