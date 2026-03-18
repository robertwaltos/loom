/**
 * Quiz Questions ΓÇö Map Room (Atlas)
 * Geography / Maps & Navigation
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const MAP_ROOM_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-polynesian-navigators ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-polynesian-t1',
    entryId: 'entry-polynesian-navigators',
    difficultyTier: 1,
    question: 'Polynesian navigators sailed thousands of kilometres across open ocean without any instruments. What signs did they use to find their way?',
    options: [
      'They followed large birds that always fly toward land',
      'They read stars, ocean waves, cloud patterns, bird behaviour, and wind-borne scents',
      'They used magnetic stones that pointed north like compasses',
      'They made maps from memory and followed the route they had drawn',
    ],
    correctIndex: 1,
    explanation: 'Polynesian wayfinders used a sophisticated system of natural signs. They read star paths for direction, felt the deep ocean swells to know their position, watched cloud formations over islands, observed bird flight paths, and could even smell the scent of flowers carried by wind from distant shores. No instruments ΓÇö only deep knowledge of the natural world, passed down through generations.',
  },
  {
    id: 'quiz-polynesian-t2',
    entryId: 'entry-polynesian-navigators',
    difficultyTier: 2,
    question: 'Mau Piailug was one of the last masters of traditional Polynesian navigation and taught it to Hawaiians in 1976. Why had this knowledge nearly been lost?',
    options: [
      'Traditional navigators kept their methods secret and refused to teach anyone',
      'Colonisation disrupted the chain of traditional teaching, breaking the transmission of knowledge between generations',
      'Modern GPS made the old methods unnecessary and younger people stopped learning them',
      'A storm destroyed the last traditional voyaging canoes before GPS was invented',
    ],
    correctIndex: 1,
    explanation: 'When European colonial powers established control over Pacific island communities, traditional practices ΓÇö including non-instrument navigation ΓÇö were frequently suppressed or simply not passed on as the social structures that supported teaching broke down. By the 1970s, Mau Piailug was one of only a handful of people who still possessed the full navigational knowledge. His decision to teach Hawaiians aboard the voyaging canoe Hokule\'a preserved a knowledge system that was within one generation of being permanently lost.',
  },
  {
    id: 'quiz-polynesian-t3',
    entryId: 'entry-polynesian-navigators',
    difficultyTier: 3,
    question: 'Polynesian navigation is sometimes called "indigenous knowledge." Why is it important to recognise this as sophisticated science alongside Western instrumental navigation?',
    options: [
      'It is important only as a historical curiosity ΓÇö modern navigation has superseded it',
      'Dismissing non-Western knowledge systems as primitive obscures genuine scientific achievement and impoverishes our understanding of human intelligence and the diverse ways of knowing the natural world',
      'Indigenous knowledge should be protected by being kept separate from Western science',
      'All navigation systems are equally accurate, so the distinction doesn\'t matter',
    ],
    correctIndex: 1,
    explanation: 'Polynesian navigators settled Hawaii, New Zealand, Easter Island, and hundreds of Pacific islands ΓÇö making the greatest maritime dispersal in history. Their knowledge system was rigorously tested against reality in open ocean crossings of thousands of kilometres. Calling it "primitive" because it used natural signs rather than instruments reflects a cultural bias, not a scientific evaluation. Recognising it as sophisticated science ΓÇö as precise, reliable, and extraordinarily difficult ΓÇö accurately reflects what Polynesian navigators achieved.',
  },

  // ΓöÇΓöÇΓöÇ entry-mercator-projection ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-mercator-t1',
    entryId: 'entry-mercator-projection',
    difficultyTier: 1,
    question: 'Gerardus Mercator invented his map in 1569. It made one thing very accurate, but distorted something else. What was the trade-off?',
    options: [
      'It made distances accurate but distorted the shapes of countries',
      'It preserved angles (useful for navigation) but distorted the sizes of countries, making places near the poles look much larger than they really are',
      'It made the shapes of countries accurate but put Europe at the wrong latitude',
      'It showed sea routes accurately but placed all continents in the wrong positions',
    ],
    correctIndex: 1,
    explanation: 'Mercator\'s projection is "conformal" ΓÇö it preserves angles. This means a sailor could draw a straight line on the map and sail along that exact compass bearing to reach their destination correctly. But to achieve this, the projection has to stretch areas near the poles. Greenland appears the same size as Africa on a Mercator map ΓÇö but Africa is 14 times larger in reality.',
  },
  {
    id: 'quiz-mercator-t2',
    entryId: 'entry-mercator-projection',
    difficultyTier: 2,
    question: 'On a Mercator map, Greenland appears to be roughly the same size as Africa. How big is Africa compared to Greenland in reality?',
    options: [
      'Africa is about twice as large as Greenland',
      'Africa is about 14 times larger than Greenland',
      'They are roughly the same size, which is why the map shows them that way',
      'Africa is about 5 times larger than Greenland',
    ],
    correctIndex: 1,
    explanation: 'Africa has an area of about 30 million square kilometres. Greenland is about 2 million square kilometres. Africa is roughly 14 to 15 times larger. The Mercator projection places Greenland near the top of the map where north-south stretching is extreme, making it appear enormous. Africa, near the equator, is shown with minimal distortion. Most adults refuse to believe the true comparison until they see an overlay.',
  },
  {
    id: 'quiz-mercator-t3',
    entryId: 'entry-mercator-projection',
    difficultyTier: 3,
    question: 'Historians argue that generations educated on Mercator maps absorbed a visual narrative ΓÇö Europe and North America appear large and central, Africa and South America appear smaller and peripheral. What does this claim reveal about how representations shape perceptions?',
    options: [
      'Maps are neutral tools and cannot influence political attitudes',
      'Visual representations we encounter repeatedly shape our intuitions about scale and importance ΓÇö and when those representations systematically distort certain regions, that distortion can embed itself in cultural assumptions',
      'The Mercator projection was deliberately designed to make Europeans feel superior',
      'Children cannot be influenced by maps because they understand the limitations of flat projections',
    ],
    correctIndex: 1,
    explanation: 'Mercator designed his projection for navigation, not to assert European superiority ΓÇö but the effect of generations of children seeing Europe and North America rendered large and central while Africa and South America appear smaller may have reinforced existing cultural hierarchies. This is not necessarily intentional ΓÇö but representations do shape cognition. Every map makes choices, and choices have consequences beyond the mapmaker\'s intentions. Understanding this is fundamental to critical cartography and media literacy.',
  },

  // ΓöÇΓöÇΓöÇ entry-prime-meridian ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-prime-meridian-t1',
    entryId: 'entry-prime-meridian',
    difficultyTier: 1,
    question: 'The Prime Meridian is the "zero" line for measuring longitude around the Earth. Where did the world agree to put it in 1884?',
    options: [
      'In Paris, France ΓÇö because France had the best astronomers',
      'At the Royal Observatory in Greenwich, England',
      'In the middle of the Atlantic Ocean ΓÇö an equal distance from all continents',
      'At the pyramids in Egypt ΓÇö the oldest navigational landmark in the world',
    ],
    correctIndex: 1,
    explanation: 'In 1884, twenty-five nations met at the International Meridian Conference and voted to place the Prime Meridian at the Royal Observatory in Greenwich, England. The vote was 22 in favour, 1 against, and France abstained. Britain had the world\'s most widely used naval charts at the time, so Greenwich was the most practical choice ΓÇö geography became standardised by convenience and power.',
  },
  {
    id: 'quiz-prime-meridian-t2',
    entryId: 'entry-prime-meridian',
    difficultyTier: 2,
    question: 'Before 1884, what problem existed with longitude and time because different countries used different zero meridians?',
    options: [
      'Ships could not calculate how fast they were sailing',
      'Railway schedules and international telegraph messages were chaotic because each country used its own local time, based on its own prime meridian',
      'Mapmakers could not agree on which direction was north',
      'The equator was in a different place on maps from different countries',
    ],
    correctIndex: 1,
    explanation: 'France used Paris as its prime meridian, the USA used Washington, Britain used Greenwich. This meant that trains crossing national borders had to adjust their clocks, international telegrams caused confusion about timing, and a location could have different coordinates on different nations\' maps. Sandford Fleming pushed for a single universal standard to make global communication and transport reliable ΓÇö and the 1884 conference created it.',
  },
  {
    id: 'quiz-prime-meridian-t3',
    entryId: 'entry-prime-meridian',
    difficultyTier: 3,
    question: 'GPS satellites define a prime meridian about 102 metres east of the physical line at Greenwich. What does this discrepancy reveal about the nature of scientific and technical standards?',
    options: [
      'GPS is less accurate than the 1884 standard and needs to be corrected',
      'Standards are human agreements tied to the technology of their time ΓÇö GPS uses a mathematically optimal reference frame, while Greenwich was chosen in 1884 by political consensus. Both are "correct" for their purposes and context',
      'Greenwich is the wrong location and the 1884 conference made an error',
      'The 102 metre discrepancy is a problem scientists are currently working to fix',
    ],
    correctIndex: 1,
    explanation: 'The 1884 Greenwich meridian was defined by a specific telescope in a specific building ΓÇö the most practical choice given the technology and politics of the time. GPS uses the International Reference Meridian, calculated mathematically as the best fit for a perfectly smooth Earth model, which happens to sit 102 metres east. Both are legitimate "zeroes" ΓÇö they serve different purposes and were created with different tools. Standards are not eternal truths; they are useful agreements that can coexist and evolve.',
  },

  // ΓöÇΓöÇΓöÇ entry-gps-democratisation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-gps-t1',
    entryId: 'entry-gps-democratisation',
    difficultyTier: 1,
    question: 'GPS was built by the US military. When was it opened to civilian use, and why?',
    options: [
      'In 1978, when the first satellites launched, because the military wanted public funding help',
      'After 1983, when a civilian aircraft was destroyed for accidentally crossing into Soviet airspace due to a navigation error ΓÇö President Reagan ordered GPS opened to all civilians to prevent such tragedies',
      'In 2005, when Google Maps launched and needed satellite data',
      'In 1995, when the Cold War ended and military technology was released',
    ],
    correctIndex: 1,
    explanation: 'Korean Air Lines Flight 007 was shot down in 1983 after straying into Soviet airspace because of a navigation error. President Reagan ordered that GPS be made available to all civilian users once it was complete, so that aircraft and ships would have access to precision navigation. That decision ΓÇö opening a military system to the world ΓÇö eventually led to GPS becoming the backbone of modern navigation for billions of people.',
  },
  {
    id: 'quiz-gps-t2',
    entryId: 'entry-gps-democratisation',
    difficultyTier: 2,
    question: 'Your phone\'s GPS relies on Einstein\'s general relativity. Without a relativistic correction, GPS would drift by 11 kilometres per day. Why does general relativity affect GPS satellites?',
    options: [
      'Satellites travel so fast that time compression from special relativity makes their clocks run slowly',
      'Satellites orbit in weaker gravity than Earth\'s surface, which causes their clocks to run slightly faster ΓÇö and GPS depends on atomic clocks so precise that even a tiny timing error accumulates into a massive position error',
      'General relativity causes satellites to move in slightly curved paths that must be calculated',
      'The curvature of spacetime near Earth bends the satellite signals, distorting their apparent position',
    ],
    correctIndex: 1,
    explanation: 'GPS works by measuring the travel time of radio signals from satellites to your phone with extraordinary precision. Clocks on satellites in weaker gravity run slightly faster than clocks on the surface (general relativistic effect) ΓÇö about 45 microseconds per day faster. Without correcting for this, timing errors would accumulate into position errors of about 11 kilometres per day. Einstein\'s 1915 theory is not abstract physics ΓÇö it runs inside every GPS chip on Earth.',
  },
  {
    id: 'quiz-gps-t3',
    entryId: 'entry-gps-democratisation',
    difficultyTier: 3,
    question: 'GPS was the most important geographic tool in human history ΓÇö and it was given away for free. What does this tell us about how technology can reshape access to capability?',
    options: [
      'Free technology is always less reliable than technology you pay for',
      'When governments or institutions open powerful technologies to universal access, they can fundamentally shift who can do what ΓÇö capabilities that were once restricted to powerful navies and armies became available to every person with a phone',
      'GPS should not have been given away because it devalued the investment the military made',
      'Free GPS is only useful in wealthy countries with enough smartphones to use it',
    ],
    correctIndex: 1,
    explanation: 'For most of human history, precise navigation was a capability of powerful states ΓÇö it required expensive instruments, expert training, and detailed charts. GPS democratised navigation overnight. A blind person navigating a city, a farmer monitoring field boundaries, an ambulance finding the fastest route ΓÇö all now have access to better navigation than a warship captain commanded 50 years ago. The decision to open GPS to civilian use is one of the most consequential acts of technology democratisation in history.',
  },
];
