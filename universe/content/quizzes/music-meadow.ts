/**
 * Quiz Questions ΓÇö Music Meadow (Luna Esperanza)
 * Music & Sound
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const MUSIC_MEADOW_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-physics-of-sound ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-physics-of-sound-t1',
    entryId: 'entry-physics-of-sound',
    difficultyTier: 1,
    question: 'When you pluck a guitar string, how does the sound reach your ears?',
    options: [
      'The sound travels through the guitar\'s wood directly to you',
      'The string shakes the air, and those air wiggles travel all the way to your ear',
      'Your eyes see the string moving and your brain makes a sound',
      'The sound jumps from the string to your ear without touching anything',
    ],
    correctIndex: 1,
    explanation: 'Sound is air wiggling! A plucked guitar string vibrates, shaking the air next to it. Those air wiggles travel outward in all directions. When they reach your eardrum, it wiggles too ΓÇö and your brain turns those wiggles into the music you hear.',
  },
  {
    id: 'quiz-physics-of-sound-t2',
    entryId: 'entry-physics-of-sound',
    difficultyTier: 2,
    question: 'A guitar and a trumpet can both play the note A ΓÇö but they sound different. Why?',
    options: [
      'Because one is louder than the other',
      'Because they are made of different colours',
      'Because each instrument adds extra vibrations called harmonics on top of the main note',
      'Because the player blows harder on the trumpet',
    ],
    correctIndex: 2,
    explanation: 'Every musical note has a main vibration (the fundamental frequency) plus higher extra vibrations called harmonics or overtones. The mix of harmonics is different for every instrument ΓÇö that\'s called its timbre. A guitar\'s A at 440 Hz has different overtones than a trumpet\'s A at 440 Hz, which is why your ears can tell them apart even when they play the exact same note.',
  },
  {
    id: 'quiz-physics-of-sound-t3',
    entryId: 'entry-physics-of-sound',
    difficultyTier: 3,
    question: 'Whale songs can travel thousands of kilometres through the ocean. Why does sound travel farther in water than in air?',
    options: [
      'Whales are so loud that their calls carry no matter what',
      'Sound travels faster and farther in denser materials like water because the molecules are packed closer together and can pass vibrations more efficiently',
      'Water is quieter than air so there is less competition from other sounds',
      'Whale songs have a special frequency that only water can carry',
    ],
    correctIndex: 1,
    explanation: 'Sound is pressure waves ΓÇö molecules bumping into their neighbours. In water, molecules are packed much closer together than in air, so vibrations are passed along more efficiently and with less energy lost. Sound travels about four times faster in water (around 1,500 m/s) than in air (around 340 m/s). This is why whales can communicate across entire ocean basins ΓÇö the medium carries the music.',
  },

  // ΓöÇΓöÇΓöÇ entry-musical-notation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-musical-notation-t1',
    entryId: 'entry-musical-notation',
    difficultyTier: 1,
    question: 'Before Guido d\'Arezzo invented musical notation, how did people learn new songs?',
    options: [
      'They bought sheet music from a shop',
      'Someone had to sing the song directly to them ΓÇö it lived only in people\'s memories',
      'They watched recordings on small screens',
      'They read the words and made up their own tune',
    ],
    correctIndex: 1,
    explanation: 'Before written notation, music was entirely oral ΓÇö it existed only in the minds and voices of living people. To learn a song, someone had to teach it to you in person. If everyone who knew a song died, the song was gone forever. Guido d\'Arezzo\'s invention changed that completely.',
  },
  {
    id: 'quiz-musical-notation-t2',
    entryId: 'entry-musical-notation',
    difficultyTier: 2,
    question: 'Guido d\'Arezzo created the staff around 1000 CE. What is a staff in music?',
    options: [
      'A long stick that monks used to keep rhythm',
      'The five horizontal lines that music notes are written on',
      'The name for a group of musicians who all play together',
      'A type of drum used in medieval churches',
    ],
    correctIndex: 1,
    explanation: 'Guido d\'Arezzo placed notes on a grid of five horizontal lines called a staff (or stave). A note placed higher on the staff means a higher pitch; lower means lower pitch. This visual system meant someone could look at written music and know exactly which notes to sing ΓÇö without ever hearing the piece before. Music could now travel by letter, not just by voice.',
  },
  {
    id: 'quiz-musical-notation-t3',
    entryId: 'entry-musical-notation',
    difficultyTier: 3,
    question: 'Guido\'s notation has been compared to the internet of its era. What did both inventions do that made them so powerful?',
    options: [
      'Both made things faster to build',
      'Both allowed complex information to travel instantly to people who weren\'t physically present',
      'Both were invented by monks in monasteries',
      'Both required expensive equipment to use',
    ],
    correctIndex: 1,
    explanation: 'Before the internet, you had to be physically present to receive information in real time. Guido\'s notation did the same thing for music that the internet does for everything: it allowed a complete, accurate copy of something complex to travel to anyone who could read the system, across any distance and across centuries. An orchestra in Tokyo today performs music that Beethoven wrote in Vienna in 1824 ΓÇö because Guido made it writable.',
  },

  // ΓöÇΓöÇΓöÇ entry-beethovens-deafness ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-beethovens-deafness-t1',
    entryId: 'entry-beethovens-deafness',
    difficultyTier: 1,
    question: 'Beethoven went almost completely deaf, but he still kept writing music. What clever thing did he do to feel the music he could no longer hear?',
    options: [
      'He asked his friends to hum the tunes for him',
      'He sawed the legs off his piano and lay on the floor to feel the vibrations through the boards',
      'He used a special hearing horn that made everything louder',
      'He only wrote very quiet music that he could still hear faintly',
    ],
    correctIndex: 1,
    explanation: 'Beethoven lowered his piano to the floor so he could press his hands and even his face against the floorboards while he played. The vibrations from the piano strings traveled through the wood into his body. Sound is vibration ΓÇö and you can feel vibration even when you can\'t hear it. Beethoven turned his whole body into an ear.',
  },
  {
    id: 'quiz-beethovens-deafness-t2',
    entryId: 'entry-beethovens-deafness',
    difficultyTier: 2,
    question: 'Beethoven wrote his Ninth Symphony ΓÇö one of the greatest pieces of music ever ΓÇö when he was almost completely deaf. What does this tell us about how musical understanding works?',
    options: [
      'It tells us Beethoven was pretending to be deaf for attention',
      'It tells us that music exists first in the mind as structure and pattern, not just as sound heard by the ears',
      'It tells us that deaf people can hear music just as well as hearing people',
      'It tells us that the Ninth Symphony must not be very complex',
    ],
    correctIndex: 1,
    explanation: 'Beethoven composed by thinking ΓÇö by holding entire structures of sound in his mind without needing to hear them with his ears. His late works, written while nearly or completely deaf, are considered more structurally complex and emotionally powerful than his earlier works. This shows that musical understanding is fundamentally cognitive ΓÇö a form of thinking ΓÇö not just a response to sound arriving at your ears.',
  },
  {
    id: 'quiz-beethovens-deafness-t3',
    entryId: 'entry-beethovens-deafness',
    difficultyTier: 3,
    question: 'At the premiere of his Ninth Symphony, Beethoven was conducting but couldn\'t hear the standing ovation. What does this moment reveal about achievement and adversity?',
    options: [
      'That Beethoven was very sad and his life was mostly suffering',
      'That the audience didn\'t understand the music',
      'That profound work can be created even when the creator cannot directly experience the final result ΓÇö inner vision can outpace physical limitation',
      'That concerts were not important in Beethoven\'s era',
    ],
    correctIndex: 2,
    explanation: 'Beethoven had to be turned around by a singer to see the audience clapping because he couldn\'t hear them. He had created something that moved thousands of people to their feet ΓÇö and could not experience it as they did. This is one of history\'s most powerful examples of how inner vision and deep skill can transcend physical limitation. Beethoven\'s deafness forced him inward, and what he found there changed music forever.',
  },

  // ΓöÇΓöÇΓöÇ entry-the-blues ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-the-blues-t1',
    entryId: 'entry-the-blues',
    difficultyTier: 1,
    question: 'Where did the blues come from?',
    options: [
      'From classical orchestras in Europe',
      'From African Americans in the southern United States who sang about their lives and feelings',
      'From a music teacher who invented it to teach children',
      'From sailors who needed songs to work by',
    ],
    correctIndex: 1,
    explanation: 'The blues grew from the lives and voices of African Americans in the Mississippi Delta in the late 1800s, after slavery had ended but while life was still extremely hard. They sang about sadness, hope, love, and truth ΓÇö their own real experiences. These songs were honest and powerful, and the whole world eventually listened.',
  },
  {
    id: 'quiz-the-blues-t2',
    entryId: 'entry-the-blues',
    difficultyTier: 2,
    question: 'The blues uses something called "blue notes" that give it a special feeling. What are blue notes?',
    options: [
      'Notes that are written in blue ink on sheet music',
      'Notes that are very loud and sudden',
      'Notes sung or played between the standard pitches ΓÇö slightly bent ΓÇö which create the blues\' distinctive emotional sound',
      'Notes that can only be played on a piano',
    ],
    correctIndex: 2,
    explanation: 'Blue notes are notes that fall between the standard pitches of a scale ΓÇö slightly flattened or "bent." A guitar player might slide between two notes rather than landing cleanly on one. This creates a feeling of yearning or tension that is central to the blues\' emotional power. These microtonal sounds came from African musical traditions and became the defining sound of American popular music.',
  },
  {
    id: 'quiz-the-blues-t3',
    entryId: 'entry-the-blues',
    difficultyTier: 3,
    question: 'The blues gave birth to jazz, rock and roll, R&B, and hip hop. What does this show us about how culture travels and changes?',
    options: [
      'That all music is the same at its core',
      'That African American music was not original since it borrowed from other styles',
      'That art forms created by marginalized communities often become the foundation of global culture ΓÇö even when those communities are not given credit',
      'That popular music would have developed the same way without the blues',
    ],
    correctIndex: 2,
    explanation: 'The I-IV-V chord progression of the blues became the backbone of rock and roll, which spawned an entire global industry. Robert Johnson, who recorded only 29 songs before dying at 27, directly influenced Eric Clapton, the Rolling Stones, Led Zeppelin, and countless others. Yet for decades, the African American origins of this music were obscured or uncredited. The blues teaches both the power of art and the importance of honest attribution: knowing where something truly comes from.',
  },
];
