/**
 * Quiz Questions ΓÇö Illustration Cove (In├¿s Moreau)
 * Visual Literacy
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const ILLUSTRATION_COVE_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-lascaux-cave-paintings ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-lascaux-t1',
    entryId: 'entry-lascaux-cave-paintings',
    difficultyTier: 1,
    question: 'Where are the famous Lascaux cave paintings, and roughly how old are they?',
    options: [
      'In Spain, about 1,000 years old',
      'In France, about 17,000 years old',
      'In Australia, about 5,000 years old',
      'In Egypt, about 4,000 years old',
    ],
    correctIndex: 1,
    explanation: 'The Lascaux cave paintings are in the Dordogne region of France and were created about 17,000 years ago. They show horses, bulls, and deer painted in vivid detail using mineral pigments. They are among the oldest and most remarkable paintings ever made by human hands.',
  },
  {
    id: 'quiz-lascaux-t2',
    entryId: 'entry-lascaux-cave-paintings',
    difficultyTier: 2,
    question: 'The Lascaux artists used perspective, shading, and animation-like sequences ΓÇö showing animals with multiple leg positions ΓÇö 17,000 years before these techniques were "invented" by the Renaissance. What does this reveal?',
    options: [
      'That Renaissance artists must have seen the Lascaux caves and copied the techniques',
      'That the human capacity for sophisticated visual thinking is ancient ΓÇö these skills are part of our nature, not learned from later civilisations',
      'That Paleolithic humans were actually more intelligent than Renaissance artists',
      'That the Renaissance artists didn\'t actually invent anything new',
    ],
    correctIndex: 1,
    explanation: 'The idea that perspective and animation were "invented" by Renaissance artists is incomplete ΓÇö those cognitive skills had already been demonstrated 17,000 years earlier. This shows that our capacity for visual storytelling is not a product of a particular civilisation but a deep feature of human cognition that appeared very early in our history.',
  },
  {
    id: 'quiz-lascaux-t3',
    entryId: 'entry-lascaux-cave-paintings',
    difficultyTier: 3,
    question: 'The original Lascaux cave was closed to visitors in 1963 because visitors\' exhaled COΓéé was damaging the 17,000-year-old paintings. A full replica (Lascaux IV) now allows visitors to experience the art. What does this trade-off reveal about how we should manage irreplaceable cultural objects?',
    options: [
      'That replicas are always better than originals because they are safer to visit',
      'That preserving irreplaceable objects sometimes requires limiting or redirecting access ΓÇö reproduction can serve appreciation while the original serves preservation',
      'That the French government was wrong to close the cave and should have let people see the real thing',
      'That digital reproductions make physical replicas unnecessary',
    ],
    correctIndex: 1,
    explanation: 'The cave\'s closure was a necessary conservation decision ΓÇö a small amount of damage each year would eventually destroy something 17,000 years old. The replica solution lets millions of people experience the art without damaging it. This principle ΓÇö that access to culture and preservation of culture may require creative compromise ΓÇö applies to many irreplaceable objects and sites.',
  },

  // ΓöÇΓöÇΓöÇ entry-bayeux-tapestry ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-bayeux-t1',
    entryId: 'entry-bayeux-tapestry',
    difficultyTier: 1,
    question: 'What story does the Bayeux Tapestry tell, and how long is it?',
    options: [
      'The life of Jesus, about 10 metres long',
      'The Norman invasion of England in 1066, about 70 metres long',
      'The Battle of Waterloo, about 30 metres long',
      'The journey of the Vikings to America, about 50 metres long',
    ],
    correctIndex: 1,
    explanation: 'The Bayeux Tapestry tells the story of the Norman Conquest of England in 1066 in 58 sequential scenes sewn into cloth. It is about 70 metres long ΓÇö making it essentially the world\'s oldest comic strip. If you stood it upright it would be taller than most buildings.',
  },
  {
    id: 'quiz-bayeux-t2',
    entryId: 'entry-bayeux-tapestry',
    difficultyTier: 2,
    question: 'The Bayeux Tapestry uses many of the same storytelling techniques as modern comic strips ΓÇö establishing shots, close-ups, continuous action, and text captions. What does this tell us about sequential visual storytelling?',
    options: [
      'That medieval embroiderers must have seen early versions of modern comics',
      'That the fundamental techniques of visual narrative are not inventions of the 20th century but are deeply natural ways for humans to tell stories',
      'That modern comic artists have been copying medieval techniques without knowing it',
      'That embroidery is a better storytelling medium than ink on paper',
    ],
    correctIndex: 1,
    explanation: 'The same narrative instincts appear in the Bayeux Tapestry (1077) and in modern comics: show the setting, zoom in on action, use text to clarify. The fact that these techniques were independently developed across nine centuries suggests they match something fundamental about how human eyes and brains process sequential narrative.',
  },
  {
    id: 'quiz-bayeux-t3',
    entryId: 'entry-bayeux-tapestry',
    difficultyTier: 3,
    question: 'The Bayeux Tapestry was commissioned by Bishop Odo ΓÇö one of the Norman victors ΓÇö yet it portrays the defeated English with notable sympathy. What does this reveal about visual narratives and their creators?',
    options: [
      'That Bishop Odo was secretly on the English side',
      'That even works commissioned by one side of a conflict can contain complexity and empathy if the artists have genuine skill and integrity',
      'That the English paid the tapestry makers to include positive images of themselves',
      'That medieval audiences did not care whose side the story took',
    ],
    correctIndex: 1,
    explanation: 'The tapestry was almost certainly made in England by English embroiderers working for their Norman conquerors. The skilled artists wove human complexity into the narrative ΓÇö the English king Harold is shown as dignified, not a villain. This teaches us that the person who commissions a work does not always fully control what the artist puts into it.',
  },

  // ΓöÇΓöÇΓöÇ entry-hokusai-great-wave ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-hokusai-t1',
    entryId: 'entry-hokusai-great-wave',
    difficultyTier: 1,
    question: 'How old was Hokusai when he created The Great Wave off Kanagawa?',
    options: [
      'About 20 years old',
      'About 40 years old',
      'About 70 years old',
      'About 55 years old',
    ],
    correctIndex: 2,
    explanation: 'Hokusai created The Great Wave when he was approximately 70 years old, after a lifetime of practice. He is famous for saying he hoped to become "a real painter" if only he could live a few more years. His greatest work came at the very end of his long career.',
  },
  {
    id: 'quiz-hokusai-t2',
    entryId: 'entry-hokusai-great-wave',
    difficultyTier: 2,
    question: 'In The Great Wave, sacred Mount Fuji appears as a small triangle in the background, dwarfed by the enormous wave. What statement does this composition make?',
    options: [
      'That Mount Fuji is not actually as important as people think',
      'That natural forces ΓÇö even the most ordinary ones like waves ΓÇö can be more immediately powerful than even the most sacred or permanent landmarks',
      'That the painting was made from a great distance where the mountain looked small',
      'That Hokusai was not interested in landscapes and preferred seascapes',
    ],
    correctIndex: 1,
    explanation: 'Mount Fuji was Japan\'s most sacred symbol ΓÇö permanent, eternal, unchanging. The wave, by contrast, is momentary and chaotic. By making the wave enormous and Fuji tiny, Hokusai created a visual argument: nature\'s immediate power can overwhelm even the most permanent human symbols. Scale in an image is never accidental ΓÇö it carries meaning.',
  },
  {
    id: 'quiz-hokusai-t3',
    entryId: 'entry-hokusai-great-wave',
    difficultyTier: 3,
    question: 'The Great Wave used Prussian blue pigment, newly imported from Europe, to create its striking colour. Hokusai\'s Japanese technique combined with a European pigment to produce an image that influenced European Impressionism in return. What does this creative exchange suggest?',
    options: [
      'That the best art is always made by combining elements from different cultures',
      'That art traditions have always been in dialogue across cultural boundaries, and the most vital works often emerge from unexpected encounters between different traditions',
      'That Prussian blue is a special colour that automatically makes art more powerful',
      'That European art was inferior before it was influenced by Japanese techniques',
    ],
    correctIndex: 1,
    explanation: 'The Great Wave is neither purely Japanese nor European ΓÇö it is both. Hokusai absorbed a European pigment and used it in his traditional ukiyo-e style. Then Van Gogh, Monet, and Debussy encountered the result and were transformed by it. Great art moves across boundaries and creates unpredictable new conversations.',
  },

  // ΓöÇΓöÇΓöÇ entry-beatrix-potter ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-potter-t1',
    entryId: 'entry-beatrix-potter',
    difficultyTier: 1,
    question: 'Before Beatrix Potter became famous for her picture books, what was she studying as a scientist?',
    options: [
      'Birds and their migration patterns',
      'Mushrooms and other fungi',
      'Weather and cloud formations',
      'Butterflies and moths',
    ],
    correctIndex: 1,
    explanation: 'Beatrix Potter was a mycologist ΓÇö a scientist who studies mushrooms and fungi. She made highly detailed scientific illustrations of fungi that were of publishable scientific quality. When the scientific world refused to take her seriously because she was a woman, she redirected her precise observation skills into picture books.',
  },
  {
    id: 'quiz-potter-t2',
    entryId: 'entry-beatrix-potter',
    difficultyTier: 2,
    question: 'Beatrix Potter self-published The Tale of Peter Rabbit in 1902 after six publishers rejected it. It has since sold over 45 million copies. What lesson does this teach about the relationship between rejection and value?',
    options: [
      'That publishers are always wrong about what will sell',
      'That the judgment of individual gatekeepers can be completely wrong, and persisting through rejection is sometimes the only way exceptional work reaches its audience',
      'That self-publishing is always better than working with a traditional publisher',
      'That children\'s books are easier to sell than adult books',
    ],
    correctIndex: 1,
    explanation: 'Six publishers rejected Peter Rabbit. Potter printed 250 copies herself and they sold out. A publisher then agreed to take it on commercially. The story did not become less good because six people turned it down ΓÇö their judgment was simply wrong. Some of the most important works in history were initially rejected.',
  },
  {
    id: 'quiz-potter-t3',
    entryId: 'entry-beatrix-potter',
    difficultyTier: 3,
    question: 'Potter\'s scientific mycology training is visible in every Peter Rabbit illustration ΓÇö the anatomy of rabbits is accurate, the plant species in the garden are precisely rendered. How does scientific observation make illustration more effective, not less artistic?',
    options: [
      'It doesn\'t ΓÇö scientific accuracy and artistic warmth pull in opposite directions',
      'Scientific observation provides the precise foundation of truth from which imaginative artistic choices become more powerful, because the viewer senses the accuracy even without being able to articulate it',
      'It makes illustrations more expensive to produce because they take longer',
      'Scientific illustrations are only useful as teaching tools, not as art',
    ],
    correctIndex: 1,
    explanation: 'When Mr. McGregor\'s garden contains botanically accurate plants and Peter Rabbit moves like a real rabbit, the reader\'s trust in the world increases. This trust makes the emotional and imaginative elements ΓÇö the talking animals, the little blue coat ΓÇö feel more real, not less. Accuracy is not the opposite of imagination; it is the ground from which imagination becomes convincing.',
  },
];
