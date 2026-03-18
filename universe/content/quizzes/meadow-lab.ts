/**
 * Quiz Questions ΓÇö The Meadow Lab (Baxter)
 * Plant Biology / Ecology
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const MEADOW_LAB_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-mendel-inheritance ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-mendel-t1',
    entryId: 'entry-mendel-inheritance',
    difficultyTier: 1,
    question: 'What did Gregor Mendel study to discover his laws of genetics?',
    options: [
      'Fruit flies in a jar',
      'Thousands of pea plants in a monastery garden',
      'Cats and dogs in a farmyard',
      'Leaves collected from different trees',
    ],
    correctIndex: 1,
    explanation: 'Gregor Mendel, a monk in Moravia, grew and carefully recorded data from about 29,000 pea plants over eight years. By tracking which plants were tall or short, and whether their flowers were purple or white, he discovered the hidden rules by which traits pass from parents to children.',
  },
  {
    id: 'quiz-mendel-t2',
    entryId: 'entry-mendel-inheritance',
    difficultyTier: 2,
    question: 'Mendel published his work in 1866 but it was ignored until 1900 ΓÇö 34 years later, after his death. What does this teach us about science?',
    options: [
      'Scientists in the 1800s did not believe in genetics at all',
      'Groundbreaking discoveries can be invisible to contemporaries, and important ideas are sometimes only recognised long after they are first published',
      'Mendel\'s work was wrong and had to be corrected before it was accepted',
      'Religious monks were not allowed to publish scientific work at the time',
    ],
    correctIndex: 1,
    explanation: 'Mendel\'s discovery contradicted the prevailing belief that traits blended together like mixed paint. This made his work hard for contemporaries to accept. It was rediscovered independently by three scientists in 1900 who were all amazed to find Mendel had beaten them by 34 years. Science does not always recognise great work immediately.',
  },
  {
    id: 'quiz-mendel-t3',
    entryId: 'entry-mendel-inheritance',
    difficultyTier: 3,
    question: 'Mendel discovered the laws of genetics 40 years before scientists knew DNA existed. What does this reveal about the relationship between observation and explanation in science?',
    options: [
      'Observations without a physical explanation are not scientifically valid',
      'Careful observations and patterns can reveal true laws of nature even when the underlying mechanism is not yet understood',
      'Mendel\'s discovery was not truly scientific because he could not explain how genes worked',
      'All scientific discoveries require both observation and a complete physical explanation at the same time',
    ],
    correctIndex: 1,
    explanation: 'Mendel described the mathematical patterns of inheritance precisely and correctly ΓÇö without knowing anything about chromosomes, cells, or DNA. The pattern was real and true even without the underlying explanation. Science often works this way: the description of how something behaves can be proven long before we understand why it behaves that way.',
  },

  // ΓöÇΓöÇΓöÇ entry-maathai-green-belt ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-maathai-t1',
    entryId: 'entry-maathai-green-belt',
    difficultyTier: 1,
    question: 'What did Wangari Maathai notice that made her start the Green Belt Movement?',
    options: [
      'Kenyan animals were becoming endangered',
      'Forests had been cut down, leaving Kenyan women without firewood or clean water',
      'Kenyan children had no schools in rural areas',
      'Farmland in Kenya was being flooded by heavy rains',
    ],
    correctIndex: 1,
    explanation: 'Maathai observed that when forests were cleared, the environmental consequences hit women hardest ΓÇö they had to walk further to find firewood and water. Her solution was direct and practical: plant trees. She started asking women to grow seedlings and plant them, and the movement grew to over 51 million trees planted across Kenya.',
  },
  {
    id: 'quiz-maathai-t2',
    entryId: 'entry-maathai-green-belt',
    difficultyTier: 2,
    question: 'Maathai connected tree-planting to both women\'s rights and democracy. Why did she see these as connected?',
    options: [
      'She believed trees only grew well when women planted them',
      'She argued that a degraded landscape reflected a system that disrespected both nature and the people ΓÇö especially women ΓÇö who depended on it',
      'She needed political support to fund her tree nurseries',
      'The Kenyan government required political activity to receive environmental grants',
    ],
    correctIndex: 1,
    explanation: 'Maathai understood that environmental destruction and political oppression shared the same roots ΓÇö systems that exploited both the land and the people living on it. Restoring forests was inseparable from restoring dignity and rights. That is why she was arrested and beaten by the government while planting trees ΓÇö they understood the political message too.',
  },
  {
    id: 'quiz-maathai-t3',
    entryId: 'entry-maathai-green-belt',
    difficultyTier: 3,
    question: 'Maathai won the Nobel Peace Prize in 2004 ΓÇö a prize usually given for conflict resolution, not environmental work. Why might the Nobel Committee have connected tree-planting to peace?',
    options: [
      'The Nobel Committee made a mistake and meant to give her the science prize',
      'Environmental degradation creates resource scarcity ΓÇö drought, famine, loss of livelihoods ΓÇö which is a root cause of conflict; restoring ecosystems builds the conditions for peaceful communities',
      'Planting trees on borders physically separates communities that might otherwise fight',
      'The Nobel Peace Prize has always been given to environmental scientists',
    ],
    correctIndex: 1,
    explanation: 'Maathai\'s Nobel Prize recognised that environmental health and human peace are deeply connected. Deforestation leads to soil erosion, water shortages, and crop failure ΓÇö which lead to poverty, displacement, and conflict. Planting 51 million trees was not just ecology ΓÇö it rebuilt the foundation on which stable, peaceful communities could stand. She was the first African woman to receive the Nobel Peace Prize.',
  },

  // ΓöÇΓöÇΓöÇ entry-mycorrhizal-networks ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-mycorrhizal-t1',
    entryId: 'entry-mycorrhizal-networks',
    difficultyTier: 1,
    question: 'What connects the trees in a forest underground, allowing them to share food?',
    options: [
      'The roots of the trees grow together and fuse',
      'A network of tiny fungal threads called mycorrhizal fungi',
      'Underground rivers carry nutrients between trees',
      'Earthworms dig tunnels that connect all the roots',
    ],
    correctIndex: 1,
    explanation: 'Suzanne Simard discovered that trees are connected underground by mycorrhizal fungi ΓÇö threadlike organisms that weave between root systems across an entire forest. Through this network, trees exchange carbon, water, and even chemical warning signals. A single teaspoon of healthy forest soil contains kilometres of these threads.',
  },
  {
    id: 'quiz-mycorrhizal-t2',
    entryId: 'entry-mycorrhizal-networks',
    difficultyTier: 2,
    question: 'Simard found that "mother trees" send nutrients to younger trees through the fungal network. Why does this matter for logging?',
    options: [
      'It means foresters should only cut down small trees and leave the big ones',
      'Removing a mother tree disrupts the network that feeds dozens of younger trees ΓÇö it is not just one tree lost but the loss of a hub for the whole connected system',
      'Mother trees are protected by law in British Columbia',
      'It means trees grow faster when old trees are removed',
    ],
    correctIndex: 1,
    explanation: 'A mother tree can be connected to hundreds of younger trees, sending them nutrients when they need it ΓÇö particularly seedlings trying to establish in shaded conditions. When a mother tree is logged, the network connection for many younger trees is severed. This explains why clear-cut forests often fail to regenerate as expected: the underground support system is gone.',
  },
  {
    id: 'quiz-mycorrhizal-t3',
    entryId: 'entry-mycorrhizal-networks',
    difficultyTier: 3,
    question: 'Simard\'s research found that forests behave as "cooperative superorganisms" rather than collections of competing individuals. How does this challenge traditional Darwinian thinking?',
    options: [
      'It proves Darwin\'s theory of evolution was completely wrong',
      'It shows that cooperation, resource sharing, and mutual support can be at least as important as competition in how ecosystems function and survive',
      'It means individual trees do not matter ΓÇö only the network counts',
      'It suggests that forests evolved separately from the rest of life on Earth',
    ],
    correctIndex: 1,
    explanation: 'Traditional evolutionary thinking emphasised competition ΓÇö survival of the fittest. Simard\'s work shows forests routinely engage in resource sharing: trees send carbon to struggling neighbours, send chemical warnings of pest attacks, and support seedlings through the dark. Cooperation and competition both operate in ecosystems, and understanding both is necessary to understand how forests truly work and how to protect them.',
  },

  // ΓöÇΓöÇΓöÇ entry-colony-collapse ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-colony-collapse-t1',
    entryId: 'entry-colony-collapse',
    difficultyTier: 1,
    question: 'What is colony collapse disorder, first noticed since 2006?',
    options: [
      'A disease that turns honeybees a different colour',
      'Billions of honeybees failing to return to their hives ΓÇö whole colonies disappearing',
      'Honeybees moving from wild habitats into towns and cities',
      'Bees building their hives underground instead of in trees',
    ],
    correctIndex: 1,
    explanation: 'Since 2006, beekeepers began finding hives completely empty ΓÇö worker bees had simply not returned. This is colony collapse disorder. It has affected billions of bees across many countries, and because honeybees pollinate about a third of everything humans eat, it is one of the most serious ecological crises happening right now.',
  },
  {
    id: 'quiz-colony-collapse-t2',
    entryId: 'entry-colony-collapse',
    difficultyTier: 2,
    question: 'Scientists have not identified a single cause for colony collapse disorder. What does this suggest about how we should approach the problem?',
    options: [
      'Without a single cause, the problem is impossible to solve',
      'The crisis has multiple interacting causes ΓÇö pesticides, parasites, habitat loss, and climate change working together ΓÇö and solutions must address the whole system',
      'Scientists are not trying hard enough to find the real cause',
      'Colony collapse disorder is probably not a real problem because there is no single explanation',
    ],
    correctIndex: 1,
    explanation: 'Colony collapse disorder appears to result from a cascade of stressors: pesticides weakening immune systems, Varroa mites parasitising colonies, habitat loss reducing food variety, and climate change shifting flowering seasons. No single intervention fixes it. This is a "complex systems failure" ΓÇö and real-world environmental problems often work this way. Understanding them requires seeing how many small stresses combine into one catastrophe.',
  },
  {
    id: 'quiz-colony-collapse-t3',
    entryId: 'entry-colony-collapse',
    difficultyTier: 3,
    question: 'Honeybee pollination contributes an estimated $15 billion per year to US agriculture alone. What does this reveal about the relationship between ecosystem health and human economies?',
    options: [
      'Nature is only worth protecting when it has direct economic value to humans',
      'Wild species and ecosystem processes underpin human food systems and economies in ways that are invisible until they collapse ΓÇö making ecological health inseparable from economic wellbeing',
      'We could replace bees with other pollinators at no cost if bees disappeared',
      'The $15 billion figure proves that bees should be owned and managed like farm animals',
    ],
    correctIndex: 1,
    explanation: 'The economic value of bee pollination was invisible to most people because it happened naturally, quietly, for free. Colony collapse made the hidden value suddenly visible. Many ecosystem services ΓÇö clean water, soil fertility, pollination, flood protection from forests ΓÇö are economically enormous but not counted until they fail. Colony collapse teaches us to value and protect the natural processes our food systems depend on before they break down.',
  },
];
