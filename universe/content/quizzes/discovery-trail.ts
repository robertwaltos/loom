/**
 * Quiz Questions ΓÇö Discovery Trail (Solana Bright)
 * Scientific Method
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const DISCOVERY_TRAIL_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-scientific-method ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-scientific-method-t1',
    entryId: 'entry-scientific-method',
    difficultyTier: 1,
    question: 'A hypothesis is one of the most important steps in the scientific method. What is a hypothesis?',
    options: [
      'The final answer to a scientific question',
      'A piece of expensive scientific equipment',
      'A testable guess or prediction about what you think will happen ΓÇö before you run the experiment',
      'A long written report describing an experiment after it is finished',
    ],
    correctIndex: 2,
    explanation: 'A hypothesis is a "testable guess" ΓÇö it\'s what you predict will happen before you run the experiment to find out. It must be testable, meaning you can design an experiment to see if you are right or wrong. If your experiment disproves your hypothesis, that\'s not failure ΓÇö that\'s the scientific method working exactly as intended. Solana says: "A good hypothesis that turns out to be wrong teaches you more than a lucky guess that turns out to be right."',
  },
  {
    id: 'quiz-scientific-method-t2',
    entryId: 'entry-scientific-method',
    difficultyTier: 2,
    question: 'Ibn al-Haytham, writing around 1011 CE, is considered one of the first scientists to use the scientific method. What made his approach different from those who came before him?',
    options: [
      'He had better equipment than earlier scientists',
      'He relied on controlled experiments and reproducible results rather than trusting what famous philosophers had written ΓÇö and was willing to reject accepted authority when evidence contradicted it',
      'He worked in a team of hundreds of scientists',
      'He wrote in a language that more people could read',
    ],
    correctIndex: 1,
    explanation: 'Most natural philosophers before Ibn al-Haytham relied on what authoritative thinkers like Aristotle and Ptolemy had written. Ibn al-Haytham\'s approach was radical: he designed controlled experiments, recorded results carefully, and was willing to reject authorities like Euclid and Ptolemy when his experiments produced different results. He disproved the ancient idea that eyes emit "visual rays" by observing light in a dark room. Solana says: "The truth doesn\'t care what famous people believed."',
  },
  {
    id: 'quiz-scientific-method-t3',
    entryId: 'entry-scientific-method',
    difficultyTier: 3,
    question: 'The scientific method requires that experiments be reproducible ΓÇö other scientists should be able to repeat the experiment and get the same result. Why is reproducibility so important?',
    options: [
      'It isn\'t important ΓÇö if one scientist gets a result, that\'s enough',
      'Reproducibility ensures that a result is not just a coincidence, measurement error, or one scientist\'s mistake ΓÇö it is the mechanism by which individual findings become reliable knowledge',
      'Reproducibility is important only in physics, not in biology or psychology',
      'Reproducibility just means that scientists don\'t trust each other',
    ],
    correctIndex: 1,
    explanation: 'Any single experiment can produce a misleading result due to random chance, equipment error, unconscious bias, or unrepeatable conditions. When many different scientists, in different labs, using different equipment, get the same result ΓÇö that convergence is strong evidence that the finding is real. Reproducibility is the mechanism that turns a single observation into scientific knowledge. Without it, science would be a collection of interesting stories rather than a reliable way to understand the world.',
  },

  // ΓöÇΓöÇΓöÇ entry-citizen-science ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-citizen-science-t1',
    entryId: 'entry-citizen-science',
    difficultyTier: 1,
    question: 'What is citizen science?',
    options: [
      'Science that is paid for by governments',
      'Science about cities and how people live in them',
      'Regular people ΓÇö not professional scientists ΓÇö making real observations and collecting real data that scientists use in their research',
      'A science class at school that is free to attend',
    ],
    correctIndex: 2,
    explanation: 'Citizen science means ordinary people contributing to real scientific research through their own observations. You do not need a degree or a lab ΓÇö you need careful attention and a willingness to record what you see honestly. Projects like eBird, iNaturalist, and Galaxy Zoo have involved millions of volunteers who collectively gather data that no professional research team could ever collect alone.',
  },
  {
    id: 'quiz-citizen-science-t2',
    entryId: 'entry-citizen-science',
    difficultyTier: 2,
    question: 'In 2007, a Dutch schoolteacher named Hanny van Arkel discovered a previously unknown astronomical object while volunteering for Galaxy Zoo. What does this tell us about who can contribute to science?',
    options: [
      'It was a lucky accident that does not represent what usually happens in science',
      'Only Dutch people are good at finding new astronomical objects',
      'Scientific discovery does not require professional credentials ΓÇö it requires careful attention and genuine curiosity, which any person can have',
      'Galaxy Zoo made a mistake and accidentally told a non-scientist about a discovery',
    ],
    correctIndex: 2,
    explanation: 'Hanny van Arkel was browsing galaxy images for Galaxy Zoo as a volunteer when she noticed something unusual. Scientists investigated, confirmed it was an unknown astronomical object, and named it "Hanny\'s Voorwerp" (Hanny\'s Object). A schoolteacher from the Netherlands added a new object to humanity\'s map of the universe. Solana considers this the clearest possible argument for citizen science: discovery belongs to whoever is paying attention.',
  },
  {
    id: 'quiz-citizen-science-t3',
    entryId: 'entry-citizen-science',
    difficultyTier: 3,
    question: 'The Christmas Bird Count has been running every year since 1900 ΓÇö more than a century of data collected by volunteers. Why is this kind of long-term citizen data so valuable for science?',
    options: [
      'It isn\'t valuable because volunteers are not trained scientists',
      'Long-term consistent datasets allow scientists to detect gradual changes ΓÇö like species population declines or range shifts driven by climate change ΓÇö that no single study or single generation of researchers could observe',
      'It is only valuable for entertainment, not real research',
      'The Christmas Bird Count only matters for Christmas',
    ],
    correctIndex: 1,
    explanation: 'A professional scientist\'s career is perhaps 30-40 years. But ecological changes driven by habitat loss, climate change, or invasive species unfold over 50, 100, or 200 years. The Christmas Bird Count\'s 125-year dataset lets researchers compare bird populations across time in ways that would be impossible from any shorter study. Citizen science, done consistently over decades, creates exactly the kind of long-term evidence that reveals slow-moving changes invisible to any single generation of observers.',
  },

  // ΓöÇΓöÇΓöÇ entry-failure-in-science ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-failure-in-science-t1',
    entryId: 'entry-failure-in-science',
    difficultyTier: 1,
    question: 'Alexander Fleming discovered penicillin ΓÇö the first antibiotic ΓÇö because of something that went wrong in his laboratory. What happened?',
    options: [
      'He accidentally mixed two chemicals together and they glowed',
      'He left a petri dish uncovered and mould grew in it ΓÇö and then he noticed the mould was killing the bacteria around it',
      'He dropped a test tube and the liquid inside cured a patient',
      'He forgot to heat his experiment and it produced a new chemical',
    ],
    correctIndex: 1,
    explanation: 'In 1928, Alexander Fleming returned from a holiday to find that a petri dish he had left uncovered had grown mould ΓÇö and that the bacteria around the mould were dying. Most scientists would have thrown it out as a spoiled experiment. Fleming looked more carefully and asked why. The mould, Penicillium, was producing a substance that killed bacteria. That substance became penicillin. One ruined experiment. Hundreds of millions of lives saved.',
  },
  {
    id: 'quiz-failure-in-science-t2',
    entryId: 'entry-failure-in-science',
    difficultyTier: 2,
    question: 'Solana calls the accidental discoveries of penicillin, X-rays, and the microwave "prepared serendipity." What does this mean?',
    options: [
      'These scientists got lucky and did nothing to earn their discoveries',
      'The discoveries were planned all along and just called "accidents" for publicity',
      'The accidents happened to scientists with enough training to recognise the significance of what they were seeing ΓÇö luck met preparation',
      'Serendipity means you have to make many preparations before you can be lucky',
    ],
    correctIndex: 2,
    explanation: 'Fleming, R├╢ntgen (X-rays), and Spencer (microwave) all encountered unexpected results. What made them scientists rather than people who just cleaned up and moved on was their ability to stop and ask "why is this happening?" ΓÇö which required deep knowledge of their field. A random person walking past Fleming\'s petri dish would not have known that mould killing bacteria was remarkable. Preparation is what lets you recognise opportunity in an accident.',
  },
  {
    id: 'quiz-failure-in-science-t3',
    entryId: 'entry-failure-in-science',
    difficultyTier: 3,
    question: '3M\'s Post-it Note was invented from an adhesive that was considered a failure because it wasn\'t sticky enough. What principle does this illustrate about how we evaluate "failed" experiments?',
    options: [
      'That all failed experiments should be kept just in case they are useful someday',
      'That failure is always a success if you wait long enough',
      'That the value of a scientific or design result depends on context ΓÇö something "wrong" for one purpose may be exactly right for another, which means preserving and sharing failed results has real value',
      'That 3M got lucky and this is not an example of good scientific practice',
    ],
    correctIndex: 2,
    explanation: 'Spencer Silver\'s low-tack adhesive failed as a structural glue. For years he showed it to colleagues, wondering if anyone could use a not-very-sticky glue. Art Fry ΓÇö who needed to mark pages in a hymnal without tearing them ΓÇö recognised immediately that Silver\'s "failure" was perfect for his problem. Today Post-it Notes are one of 3M\'s most profitable products. "Failed" results that are shared rather than discarded can find their application years later. This is one reason open science and data sharing matter: someone else may know exactly where your failure fits.',
  },

  // ΓöÇΓöÇΓöÇ entry-replication-crisis ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-replication-crisis-t1',
    entryId: 'entry-replication-crisis',
    difficultyTier: 1,
    question: 'What is the replication crisis in science?',
    options: [
      'Scientists making copies of their research papers too many times',
      'A problem where many published scientific studies cannot be repeated by other scientists to get the same results',
      'A shortage of scientists to run experiments',
      'A crisis caused by scientists losing their notes',
    ],
    correctIndex: 1,
    explanation: 'Science is supposed to produce results that work the same way every time the experiment is run correctly. The replication crisis is the discovery that many published scientific studies ΓÇö especially in psychology and medicine ΓÇö produce results that other scientists cannot reproduce when they try the same experiment. In 2015, researchers tried to replicate 100 published psychology studies and succeeded in only 36 of them. This is a serious problem that scientists are actively working to fix.',
  },
  {
    id: 'quiz-replication-crisis-t2',
    entryId: 'entry-replication-crisis',
    difficultyTier: 2,
    question: 'One cause of the replication crisis is "publication bias" ΓÇö journals are much more likely to publish results that show something interesting than results that show "nothing happened." Why is this a problem?',
    options: [
      'It isn\'t a problem ΓÇö interesting results are the only ones that matter',
      'If only positive results get published, the scientific record appears to show effects that are actually much weaker or non-existent ΓÇö because the many negative results are hidden',
      'It is a problem because journals don\'t make enough money from boring results',
      'It only matters for small scientific fields, not important ones like medicine',
    ],
    correctIndex: 1,
    explanation: 'Imagine twenty scientists test whether a vitamin cures headaches. Nineteen find no effect. One, by random chance, finds a positive result and publishes it. The published record shows a cure exists ΓÇö but nineteen silent null results say otherwise. Publication bias systematically skews the public record toward overstated or false findings. This is why reforms like pre-registration (publishing your methods before running the experiment) and open data are so important: they force the full picture into view.',
  },
  {
    id: 'quiz-replication-crisis-t3',
    entryId: 'entry-replication-crisis',
    difficultyTier: 3,
    question: 'The replication crisis was identified by scientists, investigated using the scientific method, and is now being addressed through reforms. What does this tell us about how science works as a system?',
    options: [
      'That science is fundamentally broken and cannot be trusted',
      'That scientists are dishonest and should be replaced',
      'That science\'s self-correction mechanisms ΓÇö though slow and imperfect ΓÇö function: problems in the system can be detected and reformed from within, which distinguishes science from belief systems that resist scrutiny',
      'That the replication crisis is too small a problem to worry about',
    ],
    correctIndex: 2,
    explanation: 'The replication crisis is a serious problem ΓÇö but the fact that it was discovered, named, and is being addressed is evidence that science\'s self-correction mechanisms work. No authority silenced the researchers who found the problem. Journals, funding agencies, and universities are implementing pre-registration, open data, and replication studies as responses. Solana calls this "science healing itself." A system that can identify and correct its own failures is more reliable than one that claims it has no failures. The crisis has made science more honest.',
  },
];
