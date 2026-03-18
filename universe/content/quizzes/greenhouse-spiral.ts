/**
 * Quiz Questions ΓÇö Greenhouse Spiral (Hugo Fontaine)
 * Chemistry / Mixtures & Materials
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const GREENHOUSE_SPIRAL_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-mendeleev-periodic-table ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-mendeleev-t1',
    entryId: 'entry-mendeleev-periodic-table',
    difficultyTier: 1,
    question: 'What did Mendeleev discover when he arranged elements by weight in his periodic table?',
    options: [
      'That heavier elements were always rarer than lighter ones',
      'A hidden pattern where elements in the same column behaved the same way',
      'That all elements could be converted into other elements with enough heat',
      'That the periodic table exactly matched the number of known planets',
    ],
    correctIndex: 1,
    explanation: 'When Mendeleev arranged all the known elements by their atomic weight, a beautiful pattern emerged: elements that fell in the same column had similar chemical properties and behaviours. The table revealed a hidden organisation in matter. It was so reliable that Mendeleev could predict where undiscovered elements should fit ΓÇö and left gaps for them, which were eventually filled.',
  },
  {
    id: 'quiz-mendeleev-t2',
    entryId: 'entry-mendeleev-periodic-table',
    difficultyTier: 2,
    question: 'Mendeleev\'s periodic table predicted the existence of undiscovered elements. How did these predictions make his table more convincing than other scientists\' similar arrangements?',
    options: [
      'His table was the most neatly drawn and easiest to read',
      'His table made successful predictions about undiscovered elements ΓÇö gallium, scandium, and germanium ΓÇö that were confirmed by later experiments, proving it described real patterns in nature',
      'He published first, so his version became the official one',
      'His table used symbols that matched the Latin names of the elements',
    ],
    correctIndex: 1,
    explanation: 'At least six other scientists independently created similar element arrangements around the same time. What distinguished Mendeleev\'s table was that he used the pattern to predict missing elements ΓÇö including their approximate weights and chemical properties. When gallium was discovered in 1875, scandium in 1879, and germanium in 1886, each matched Mendeleev\'s predictions closely. Prediction is the highest test of a scientific theory, and his theory passed.',
  },
  {
    id: 'quiz-mendeleev-t3',
    entryId: 'entry-mendeleev-periodic-table',
    difficultyTier: 3,
    question: 'Mendeleev arranged elements by atomic weight in 1869. Modern periodic tables arrange them by atomic number (protons). The table still works. What does this tell us about scientific models?',
    options: [
      'Mendeleev\'s table was wrong because it used weight instead of protons',
      'A model built on approximate or incomplete information can still reveal genuine patterns in nature ΓÇö and when better information arrives, the structure of the model is preserved even as its foundation is refined',
      'The periodic table was just a lucky arrangement and has no scientific explanation',
      'All scientific models are eventually proved completely wrong and replaced',
    ],
    correctIndex: 1,
    explanation: 'Mendeleev did not know about protons ΓÇö atomic structure was not understood until decades later. He arranged by weight, and the pattern he found was real, but the underlying reason (the number of protons determines chemical behaviour) was invisible to him. When quantum mechanics explained why the periodic table works the way it does, the table itself was not overturned ΓÇö it was explained. Good models often survive even when their foundations are revised.',
  },

  // ΓöÇΓöÇΓöÇ entry-lavoisier-chemistry-revolution ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-lavoisier-t1',
    entryId: 'entry-lavoisier-chemistry-revolution',
    difficultyTier: 1,
    question: 'What did Marie-Anne Paulze Lavoisier do that was essential to the chemistry revolution?',
    options: [
      'She invented a new chemical element in her own laboratory',
      'She taught herself Latin and English to translate important papers, and drew every experiment so the whole world could understand what modern chemistry looked like',
      'She discovered oxygen independently before Joseph Priestley',
      'She published a mathematics textbook used in French schools',
    ],
    correctIndex: 1,
    explanation: 'Marie-Anne Paulze Lavoisier was an equal partner in the laboratory that founded modern chemistry. She taught herself Latin and English to translate the work of scientists her husband could not read himself, and she created the detailed illustrations for "Trait├⌐ ├⌐l├⌐mentaire de chimie" ΓÇö the textbook that taught chemists across the world what the new chemistry looked like. Without her drawings and translations, the revolution would have been much slower to spread.',
  },
  {
    id: 'quiz-lavoisier-t2',
    entryId: 'entry-lavoisier-chemistry-revolution',
    difficultyTier: 2,
    question: 'Antoine Lavoisier was guillotined during the French Revolution. What did Marie-Anne do afterwards that protected their scientific legacy?',
    options: [
      'She destroyed all of their unpublished work to keep it out of government hands',
      'She preserved and published Antoine\'s unpublished works, ensuring that the chemistry revolution they had built together survived',
      'She continued their experiments alone and made several additional discoveries',
      'She donated all the laboratory equipment to the French government',
    ],
    correctIndex: 1,
    explanation: 'When Antoine was executed, Marie-Anne preserved his manuscripts, continued his correspondence with other scientists, and ultimately published his unpublished works. A judge reportedly said "The Republic has no need of scientists" ΓÇö but Marie-Anne ensured that the science survived regardless. The knowledge she protected became part of the foundation of modern chemistry.',
  },
  {
    id: 'quiz-lavoisier-t3',
    entryId: 'entry-lavoisier-chemistry-revolution',
    difficultyTier: 3,
    question: 'The judge who condemned Antoine reportedly said "The Republic has no need of scientists." Within 18 months, that tribunal had itself been abolished. What does this sequence of events teach about science and political power?',
    options: [
      'Scientists should avoid politics entirely to keep themselves safe',
      'Intellectual work outlasts political authority ΓÇö the knowledge the Lavoisiers created survived the regime that destroyed Antoine, while the tribunal that killed him was gone within two years',
      'French governments have always been hostile to scientists',
      'Political leaders are ultimately more powerful than scientific ideas',
    ],
    correctIndex: 1,
    explanation: 'The Reign of Terror executed many of France\'s finest scientists and engineers. But the knowledge they created did not die with them ΓÇö Marie-Anne preserved it, published it, and distributed it. The Tribunal de r├⌐volutionnaire that killed Antoine was abolished by July 1795. The chemical nomenclature Antoine and Marie-Anne developed is still in use today. Science is one of the most durable human creations: it can survive the destruction of the people who make it.',
  },

  // ΓöÇΓöÇΓöÇ entry-discovery-of-oxygen ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-oxygen-t1',
    entryId: 'entry-discovery-of-oxygen',
    difficultyTier: 1,
    question: 'Joseph Priestley discovered a new kind of air in 1774 that made candles burn brighter. What did Lavoisier later name this new air?',
    options: [
      'Nitrogen',
      'Oxygen',
      'Carbon dioxide',
      'Hydrogen',
    ],
    correctIndex: 1,
    explanation: 'Priestley isolated a gas that made flames burn much more brightly and kept mice alive longer in sealed containers. He called it "dephlogisticated air" based on the wrong theory of burning that was popular at the time. Lavoisier recognised its true significance, named it "oxygen," and used it to explain combustion correctly ΓÇö overturning the old phlogiston theory entirely.',
  },
  {
    id: 'quiz-oxygen-t2',
    entryId: 'entry-discovery-of-oxygen',
    difficultyTier: 2,
    question: 'Priestley discovered oxygen but could not explain what it really was. Lavoisier saw the same evidence and understood it completely differently. What lesson does this teach about science?',
    options: [
      'Priestley\'s discovery does not count because he used the wrong name for it',
      'Observing and interpreting are different skills ΓÇö you can make an important discovery and still not understand its full significance, which sometimes requires a different person with different theoretical tools',
      'Only the person who correctly interprets a discovery should be credited with making it',
      'Experiments cannot produce useful knowledge if the experimenter has incorrect beliefs',
    ],
    correctIndex: 1,
    explanation: 'Priestley was a brilliant experimenter ΓÇö he isolated oxygen, tested its properties carefully, and documented everything precisely. But he interpreted his results through the phlogiston framework, which led him to misunderstand what he had found. Lavoisier used the same observations to overthrow phlogiston theory entirely and correctly explain combustion. Both contributed: Priestley produced the evidence, Lavoisier produced the interpretation. Science is often a relay race, not a solo sprint.',
  },
  {
    id: 'quiz-oxygen-t3',
    entryId: 'entry-discovery-of-oxygen',
    difficultyTier: 3,
    question: 'Carl Wilhelm Scheele isolated oxygen even before Priestley but published his results later. Neither Scheele nor Priestley received the credit for the conceptual revolution that followed. What does this reveal about what "discovery" means in science?',
    options: [
      'Credit should always go to whoever ran the first experiment',
      'Scientific "discovery" is complex ΓÇö it includes isolating a substance, understanding its significance, and communicating it so others can build on it. All three steps can belong to different people',
      'Scheele and Priestley were both robbed of credit they deserved and this was unjust',
      'Only published results count as scientific discoveries, which is why Scheele\'s work was irrelevant',
    ],
    correctIndex: 1,
    explanation: 'Scheele isolated oxygen first but published last. Priestley isolated it second, published results quickly, and spread the knowledge. Lavoisier interpreted the significance and changed chemistry with it. Who "discovered" oxygen? The question reveals that discovery is not a single moment ΓÇö it is a process of isolation, interpretation, and communication that different people contribute to in different ways. The history of oxygen is actually a story about how scientific knowledge is built collectively.',
  },

  // ΓöÇΓöÇΓöÇ entry-photosynthesis ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-photosynthesis-t1',
    entryId: 'entry-photosynthesis',
    difficultyTier: 1,
    question: 'What three things do plants take in to make their food through photosynthesis?',
    options: [
      'Water, soil, and warmth',
      'Sunlight, water, and carbon dioxide from the air',
      'Sunlight, oxygen, and minerals from the ground',
      'Air, heat, and sugar from nearby plants',
    ],
    correctIndex: 1,
    explanation: 'Plants make their own food through photosynthesis using three ingredients: sunlight (energy), water (absorbed through roots), and carbon dioxide (a gas from the air). They convert these into glucose ΓÇö their food ΓÇö and release oxygen as a by-product. The oxygen we breathe is a by-product of plants making food from light.',
  },
  {
    id: 'quiz-photosynthesis-t2',
    entryId: 'entry-photosynthesis',
    difficultyTier: 2,
    question: 'Jan Ingenhousz discovered in 1779 that plants produce oxygen only when they are in sunlight. What happens in darkness?',
    options: [
      'Plants stop all biological activity completely in darkness',
      'Plants consume oxygen in darkness instead of producing it ΓÇö the light-driven oxygen production only happens when sunlight is available',
      'Plants produce twice as much oxygen in darkness to compensate for the lack of light',
      'Plants produce carbon dioxide at night, which is why forests are dangerous after dark',
    ],
    correctIndex: 1,
    explanation: 'Ingenhousz placed plants in sealed containers and observed them in both light and dark conditions. In light, oxygen bubbled out. In darkness, the plants consumed oxygen for their own respiration. This established the light-dependent nature of photosynthesis: it is a solar-powered reaction that only runs when light is present. At night, plants respire like animals ΓÇö consuming oxygen and releasing COΓéé.',
  },
  {
    id: 'quiz-photosynthesis-t3',
    entryId: 'entry-photosynthesis',
    difficultyTier: 3,
    question: 'Photosynthesis produces roughly 300 billion tonnes of organic carbon per year. Every food chain on Earth depends on this reaction. What does this mean for how we should think about plants?',
    options: [
      'Plants are less important than animals because they don\'t move or think',
      'Plants are the foundational energy converters of the biosphere ΓÇö without photosynthesis capturing sunlight as chemical energy, virtually every food chain on Earth would collapse, including the one humans are part of',
      'Photosynthesis is one of several equally important processes that sustain life on Earth',
      'Only tropical plants produce enough oxygen to matter for the rest of life on Earth',
    ],
    correctIndex: 1,
    explanation: 'Every animal, fungus, and most bacteria ultimately depend on photosynthesis. Animals eat plants, or eat animals that ate plants, or eat animals that ate animals that ate plants ΓÇö every food chain traces back to a photosynthesising organism at its base. The oxygen in every breath also comes from photosynthesis. Hugo\'s description is literally accurate: our oxygen is a plant\'s garbage. Understanding this makes plants not passive background scenery but the engine that powers nearly all life on Earth.',
  },
];
