/**
 * Quiz Questions ΓÇö Folklore Bazaar (Hassan Y─▒lmaz)
 * Folklore / Cultural Stories
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const FOLKLORE_BAZAAR_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-brothers-grimm ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-grimm-t1',
    entryId: 'entry-brothers-grimm',
    difficultyTier: 1,
    question: 'What did Jacob and Wilhelm Grimm do with the fairy tales they collected?',
    options: [
      'They made them up from their own imaginations',
      'They listened to stories people told and wrote them down in a book',
      'They translated them from French fairy tales',
      'They found them written on old cave walls',
    ],
    correctIndex: 1,
    explanation: 'The Brothers Grimm went from village to village in Germany, listening to the stories that ordinary people told, and wrote them all down in a book called Children\'s and Household Tales (1812). Without them, stories like Cinderella, Rapunzel, and Snow White might have been forgotten forever.',
  },
  {
    id: 'quiz-grimm-t2',
    entryId: 'entry-brothers-grimm',
    difficultyTier: 2,
    question: 'The original 1812 versions of the Grimm fairy tales were much darker and more violent than later editions. Why did the Grimms change the stories over time?',
    options: [
      'The government told them to remove the violent parts',
      'They wanted the stories to be more suitable for children as the books became popular with families',
      'They discovered that the original storytellers had made mistakes',
      'The original stories were too expensive to print',
    ],
    correctIndex: 1,
    explanation: 'As the Grimm collection became a popular children\'s book, the brothers edited successive editions to make the stories gentler and more appropriate for young readers. This shows the tension between preserving oral tradition exactly and adapting it for a new audience.',
  },
  {
    id: 'quiz-grimm-t3',
    entryId: 'entry-brothers-grimm',
    difficultyTier: 3,
    question: 'Scholars later discovered that many of the Grimms\' sources were educated, middle-class women of French descent ΓÇö not simple German peasants. Why does this complicate the Grimms\' claim to be recording authentic "German" folk tradition?',
    options: [
      'It means the stories are not real folklore and should be ignored',
      'It shows that "the original" version of a folk story is often harder to pin down than it seems, because stories always pass through multiple cultural filters',
      'It proves that only German peasants could have known the real stories',
      'It means all the stories have French originals that are more accurate',
    ],
    correctIndex: 1,
    explanation: 'The Grimms believed they were capturing a pure, ancient German tradition. But their informants had their own cultural backgrounds, literary influences, and editing choices. This is true of almost all folklore ΓÇö "the original" is a moving target, because stories transform every time they are told. All stories have versions.',
  },

  // ΓöÇΓöÇΓöÇ entry-anansi-stories ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-anansi-t1',
    entryId: 'entry-anansi-stories',
    difficultyTier: 1,
    question: 'Where did the Anansi spider stories originally come from?',
    options: [
      'The Caribbean island of Jamaica',
      'The Akan people of West Africa (Ghana)',
      'Ancient Greece',
      'Indigenous Australia',
    ],
    correctIndex: 1,
    explanation: 'Anansi is a clever spider trickster from the Akan oral tradition in what is now Ghana, in West Africa. When enslaved people were transported to the Caribbean, they brought Anansi stories with them. The stories survived the ocean crossing because stories cannot be chained.',
  },
  {
    id: 'quiz-anansi-t2',
    entryId: 'entry-anansi-stories',
    difficultyTier: 2,
    question: 'In Anansi stories, the spider always defeats much bigger and stronger animals using his cleverness. Why did these stories become especially important to enslaved people in the Caribbean?',
    options: [
      'Because spiders were considered good luck symbols in the Caribbean',
      'Because the stories showed that the small and weak can outwit the powerful ΓÇö a message of resistance and hope',
      'Because the stories taught farming techniques that were useful in the new land',
      'Because Anansi stories were the only ones that were allowed to be told publicly',
    ],
    correctIndex: 1,
    explanation: 'For enslaved people who were physically powerless, Anansi\'s victories through cleverness ΓÇö not strength ΓÇö carried a powerful message. The spider who outwits the king became a symbol of resistance: the idea that intelligence and wit could be forms of freedom even when physical freedom was denied.',
  },
  {
    id: 'quiz-anansi-t3',
    entryId: 'entry-anansi-stories',
    difficultyTier: 3,
    question: 'Anansi stories changed and adapted as they moved from Ghana to Jamaica and beyond, picking up new details and local settings. What does this tell us about how folklore works?',
    options: [
      'That the Jamaican versions are less authentic because they are further from the source',
      'That folklore is a living tradition ΓÇö stories survive by adapting to new environments without losing their essential soul',
      'That only the original Akan version has cultural value',
      'That stories should be written down immediately to stop them from changing',
    ],
    correctIndex: 1,
    explanation: 'Anansi stories kept their core structure ΓÇö the small outsmarting the powerful ΓÇö while gaining new local flavour in each place they arrived. This adaptability is what allowed the tradition to survive. Folklore is not a museum exhibit; it is a living system that evolves without losing its identity.',
  },

  // ΓöÇΓöÇΓöÇ entry-one-thousand-one-nights ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-nights-t1',
    entryId: 'entry-one-thousand-one-nights',
    difficultyTier: 1,
    question: 'How did Scheherazade use storytelling to save her own life?',
    options: [
      'She wrote a letter to the king explaining why he should spare her',
      'She started a story each night but stopped right at the most exciting part, so the king had to let her live another day to hear the ending',
      'She told the king stories about heroes who punished cruel rulers',
      'She sang the stories as songs, which made the king feel happy and calm',
    ],
    correctIndex: 1,
    explanation: 'Scheherazade always stopped her stories at the cliffhanger ΓÇö the most exciting moment ΓÇö so the king needed to hear what happened next. By doing this for 1,001 nights, she kept herself alive and eventually won the king\'s love. She invented the cliffhanger.',
  },
  {
    id: 'quiz-nights-t2',
    entryId: 'entry-one-thousand-one-nights',
    difficultyTier: 2,
    question: 'The famous stories of Aladdin and Ali Baba are not actually found in the original Arabic manuscripts of One Thousand and One Nights. How did they end up being called "Arabian Nights" stories?',
    options: [
      'They were discovered in a newly found ancient manuscript in the 1800s',
      'A French translator named Antoine Galland added them, claiming he heard them from a Syrian storyteller',
      'They were written by Shakespeare based on stories he heard from Arab traders',
      'They were added to the collection by the Egyptian royal court',
    ],
    correctIndex: 1,
    explanation: 'Antoine Galland translated the Nights into French in the early 1700s and added Aladdin, Ali Baba, and Sinbad from oral sources ΓÇö including a Syrian storyteller named Hanna Diyab. The stories we most associate with "Arabian Nights" may be partly European inventions grafted onto the original collection.',
  },
  {
    id: 'quiz-nights-t3',
    entryId: 'entry-one-thousand-one-nights',
    difficultyTier: 3,
    question: 'The One Thousand and One Nights uses a "frame narrative" ΓÇö a story that contains other stories, sometimes three levels deep. Why might this structure be a particularly powerful form of storytelling?',
    options: [
      'Because it makes books much longer and therefore more valuable',
      'Because nested stories create a sense that all stories are connected, and that telling stories is itself a universal human act',
      'Because readers prefer to read one long story rather than many short ones',
      'Because the frame structure prevents stories from being stolen by other storytellers',
    ],
    correctIndex: 1,
    explanation: 'When a story contains another story, it reminds the reader that stories exist everywhere ΓÇö characters in stories tell stories too. The frame narrative suggests that narrative is the fundamental way humans make sense of experience. Scheherazade\'s survival through storytelling is itself a story about the power of story.',
  },

  // ΓöÇΓöÇΓöÇ entry-aboriginal-dreamtime ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-dreamtime-t1',
    entryId: 'entry-aboriginal-dreamtime',
    difficultyTier: 1,
    question: 'How long have Aboriginal Australians been telling Dreamtime stories?',
    options: [
      'About 500 years',
      'About 2,000 years',
      'At least 65,000 years ΓÇö the longest continuous storytelling tradition on Earth',
      'About 10,000 years, since the ice age ended',
    ],
    correctIndex: 2,
    explanation: 'Aboriginal Australians have been telling Dreamtime stories for at least 65,000 years, making theirs the longest continuous storytelling tradition on Earth. These stories have been passed down through countless generations without ever being written down.',
  },
  {
    id: 'quiz-dreamtime-t2',
    entryId: 'entry-aboriginal-dreamtime',
    difficultyTier: 2,
    question: 'Scientists have confirmed that some Dreamtime stories accurately describe geological events ΓÇö like volcanic eruptions and rising sea levels ΓÇö that happened over 7,000 years ago. What does this tell us about oral storytelling traditions?',
    options: [
      'That Aboriginal people must have had some form of writing to preserve the details',
      'That oral traditions can preserve accurate information across thousands of years if communities are careful and consistent',
      'That the geological events must have happened much more recently than scientists thought',
      'That storytellers were exaggerating to make their stories more dramatic',
    ],
    correctIndex: 1,
    explanation: 'The geological evidence confirms what Aboriginal communities already knew ΓÇö their stories are accurate historical records. This shows that oral traditions, maintained carefully across generations, can preserve precise information over enormously long timescales. These are the longest-verified oral histories on Earth.',
  },
  {
    id: 'quiz-dreamtime-t3',
    entryId: 'entry-aboriginal-dreamtime',
    difficultyTier: 3,
    question: 'Dreamtime stories function simultaneously as entertainment, law, geography, ecology, and spiritual teaching ΓÇö all woven into a single tradition. Why might the Western habit of separating these categories into different subjects be a limitation?',
    options: [
      'Because Western people are less intelligent than Aboriginal people',
      'Because separating knowledge into subjects makes it harder to understand how everything in the natural world is connected',
      'Because laws and stories should never be mixed together in any culture',
      'Because Aboriginal languages cannot be translated into Western academic categories',
    ],
    correctIndex: 1,
    explanation: 'When knowledge is divided into separate boxes ΓÇö science here, law there, art somewhere else ΓÇö it becomes harder to see the connections between them. Dreamtime stories encode how animals behave (ecology), where water can be found (geography), and how people should treat each other (law) all at once. This integration may be more accurate to how the world actually works than our separated disciplines.',
  },
];
