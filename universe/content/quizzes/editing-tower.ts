/**
 * Quiz Questions ΓÇö Editing Tower (Wren Calloway)
 * Editing / Revision
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const EDITING_TOWER_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-maxwell-perkins ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-perkins-t1',
    entryId: 'entry-maxwell-perkins',
    difficultyTier: 1,
    question: 'Maxwell Perkins was a famous book editor who helped F. Scott Fitzgerald, Ernest Hemingway, and Thomas Wolfe. What does an editor do?',
    options: [
      'An editor writes the actual words for the author',
      'An editor helps a writer find the best version of their work ΓÇö seeing problems the writer is too close to notice',
      'An editor decides whether a book should be published based on how famous the author is',
      'An editor checks spelling and grammar and nothing else',
    ],
    correctIndex: 1,
    explanation: 'A great editor like Perkins helps the writer do what the writer is trying to do ΓÇö not what the editor would do. He could see structural problems, weak sections, and missing connections that the writer, being too close to their own work, couldn\'t see. Without Perkins, some of the greatest novels ever written might never have existed in their final forms.',
  },
  {
    id: 'quiz-perkins-t2',
    entryId: 'entry-maxwell-perkins',
    difficultyTier: 2,
    question: 'Perkins cut about 90,000 words from Thomas Wolfe\'s first novel ΓÇö that is roughly an entire novel\'s worth of material removed. Why might cutting so much actually make a book better?',
    options: [
      'Because shorter books are cheaper to print and easier to sell',
      'Because removing material that does not serve the story makes the essential material stronger and the whole work more coherent',
      'Because readers today have shorter attention spans than readers in the past',
      'Because 90,000 words is the standard length for a published novel',
    ],
    correctIndex: 1,
    explanation: 'Wolfe\'s original manuscript was brilliant but overwhelming ΓÇö every powerful scene was buried in material that didn\'t serve the story. Cutting 90,000 words didn\'t reduce the book; it revealed it. This is what editing does at its best: it removes what is hiding the real work underneath.',
  },
  {
    id: 'quiz-perkins-t3',
    entryId: 'entry-maxwell-perkins',
    difficultyTier: 3,
    question: 'Perkins used a Socratic approach: rather than telling writers what to change, he asked questions that guided them to find their own solutions. Why might this method produce better results than simply giving direct instructions?',
    options: [
      'Because writers are too sensitive to accept direct feedback without getting upset',
      'Because writers understand their own work\'s intentions better than anyone else, and questions activate that understanding ΓÇö the writer who finds the solution understands it more deeply and executes it more authentically',
      'Because asking questions takes longer, which gives the writer more time to think',
      'Because Perkins was paid per hour and questions took longer than statements',
    ],
    correctIndex: 1,
    explanation: 'When Perkins asked "Why does this character disappear from the story in chapter seven?" rather than saying "Bring this character back," the writer had to re-examine their own intentions. The solution they found came from their own understanding of the work. This produces more authentic revisions and teaches the writer a skill they keep for future books.',
  },

  // ΓöÇΓöÇΓöÇ entry-hemingway-iceberg-theory ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-iceberg-t1',
    entryId: 'entry-hemingway-iceberg-theory',
    difficultyTier: 1,
    question: 'What is Hemingway\'s "Iceberg Theory" about writing?',
    options: [
      'That the best stories take place in cold places near icebergs',
      'That if you know a subject deeply, you don\'t have to write everything you know ΓÇö what you leave out makes the writing more powerful',
      'That the most important part of a story is what happens at the very end',
      'That stories should always start slowly and build like an iceberg growing bigger',
    ],
    correctIndex: 1,
    explanation: 'Hemingway said that a story is like an iceberg ΓÇö one-eighth shows above the water and seven-eighths is hidden below. If a writer truly knows their subject, they don\'t need to write all of it. Readers sense the depth even without seeing it. Leaving things out, if done from knowledge, makes writing stronger.',
  },
  {
    id: 'quiz-iceberg-t2',
    entryId: 'entry-hemingway-iceberg-theory',
    difficultyTier: 2,
    question: 'Hemingway rewrote the final page of A Farewell to Arms 47 times. When asked why, he said: "Getting the words right." What does this suggest about the relationship between revision and quality?',
    options: [
      'That the first version of any piece of writing is always the worst',
      'That great writing is not produced in a first draft but discovered through repeated revision ΓÇö quality is the result of relentless, careful refining',
      'That 47 is the correct number of times to revise any important passage',
      'That Hemingway was unusually slow and most writers get it right much faster',
    ],
    correctIndex: 1,
    explanation: '"Getting the words right" is deceptively simple. It means finding the precise words that carry exactly the weight you intend ΓÇö no more, no less. For a final page that needed to be devastating in its simplicity, 47 attempts was not excessive. The manuscripts at the Kennedy Library show each attempt moving closer to the essential truth.',
  },
  {
    id: 'quiz-iceberg-t3',
    entryId: 'entry-hemingway-iceberg-theory',
    difficultyTier: 3,
    question: 'Hemingway\'s theory says that what a writer omits can be more powerful than what they include ΓÇö but only if the writer truly knows what they are leaving out. What distinguishes meaningful omission from lazy incompleteness?',
    options: [
      'Meaningful omission is always shorter than lazy incompleteness',
      'Meaningful omission arises from mastery ΓÇö the writer chooses what to leave out because they understand the subject completely; lazy incompleteness comes from not knowing enough to fill in what is missing',
      'Meaningful omission only works in stories about war, which was Hemingway\'s subject',
      'Lazy incompleteness can be fixed by adding more details later',
    ],
    correctIndex: 1,
    explanation: 'Hemingway\'s own words are the key: "If a writer of prose knows enough about what he is writing about, he may omit things and the reader will still have a feeling of those things." The reader senses the depth because the depth is there, beneath the surface. Omitting something you don\'t know produces only emptiness.',
  },

  // ΓöÇΓöÇΓöÇ entry-toni-morrison-revision ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-morrison-t1',
    entryId: 'entry-toni-morrison-revision',
    difficultyTier: 1,
    question: 'What was Toni Morrison\'s goal when she revised her writing?',
    options: [
      'To make her sentences shorter and simpler',
      'To make her writing feel natural and effortless, as if it had never been revised at all',
      'To add more description to every scene',
      'To remove all the dialogue and keep only the narration',
    ],
    correctIndex: 1,
    explanation: 'Morrison wanted her sentences to feel as natural as breathing ΓÇö as though the language had always existed exactly that way. But she achieved this naturalness through extensive, painstaking revision. The goal was to make all the hard work invisible. The most artfully crafted sentences are the ones that feel completely unworked.',
  },
  {
    id: 'quiz-morrison-t2',
    entryId: 'entry-toni-morrison-revision',
    difficultyTier: 2,
    question: 'Morrison was also a senior book editor at Random House, where she championed other writers. How might working as an editor make someone a better writer?',
    options: [
      'Because editors earn more money than writers and so have more time to write',
      'Because editing other people\'s manuscripts teaches you to see structural and rhythmic problems from the outside ΓÇö skills you then apply to your own work',
      'Because working in publishing gives you contacts who will publish your books easily',
      'Because editors read more books than ordinary people and become better at writing',
    ],
    correctIndex: 1,
    explanation: 'Editing requires you to see what is not working in a text ΓÇö to diagnose it from the outside, without the writer\'s attachment to their own choices. Morrison learned to see manuscript problems clearly through editorial work. She then applied that same diagnostic eye to her own drafts. The editor\'s perspective gave her a tool that pure writing practice alone cannot develop.',
  },
  {
    id: 'quiz-morrison-t3',
    entryId: 'entry-toni-morrison-revision',
    difficultyTier: 3,
    question: 'Hemingway\'s revision philosophy was minimalist ΓÇö cut until only the essential remains. Morrison\'s was architectural ΓÇö sculpt for rhythm, music, and truth to experience. What does the existence of these two different revision philosophies teach us?',
    options: [
      'That one of them must be wrong and writers should choose the correct method',
      'That revision is not a single technique but a set of tools in service of a goal ΓÇö and the goal depends on what you are trying to achieve and what voice you are trying to build',
      'That Hemingway and Morrison were writing for different audiences and both methods are therefore equally valid',
      'That revision philosophy is a personal preference with no effect on the quality of the final work',
    ],
    correctIndex: 1,
    explanation: 'Hemingway\'s spare prose required a different kind of revision than Morrison\'s rich, musical sentences. Both were in pursuit of precision ΓÇö but "precision" meant different things in each context. Revision is not a single prescription; it is the discipline of asking "does this achieve what I am trying to achieve?" and having the honesty and skill to answer truthfully.',
  },

  // ΓöÇΓöÇΓöÇ entry-wikipedia-editing ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-wikipedia-t1',
    entryId: 'entry-wikipedia-editing',
    difficultyTier: 1,
    question: 'How does Wikipedia make sure its articles are accurate if anyone in the world can edit them?',
    options: [
      'A team of paid professional experts checks every article every day',
      'An army of volunteer editors checks every change, debates disputed facts, and works to maintain accuracy through community consensus',
      'Only university professors are allowed to edit articles about serious topics',
      'Wikipedia uses an artificial intelligence system that automatically corrects mistakes',
    ],
    correctIndex: 1,
    explanation: 'Wikipedia is maintained by approximately 280,000 active volunteer editors who monitor changes, revert vandalism, discuss disputed facts on "Talk" pages, and use community policies like "Neutral Point of View" and "Verifiability" to resolve disputes. No single authority controls it ΓÇö it is a community negotiation about knowledge.',
  },
  {
    id: 'quiz-wikipedia-t2',
    entryId: 'entry-wikipedia-editing',
    difficultyTier: 2,
    question: 'Wikipedia records the complete editing history of every article ΓÇö you can see every single change ever made. Why might transparency in editing history be important for a knowledge resource?',
    options: [
      'So that editors who make mistakes can be publicly shamed',
      'Because being able to see how an article changed over time lets readers trace disputes, understand why particular decisions were made, and evaluate the reliability of the current version',
      'Because the editing history makes the articles longer and more impressive',
      'So that Wikipedia can charge money for access to historical versions',
    ],
    correctIndex: 1,
    explanation: 'A visible editing history means Wikipedia is auditable ΓÇö anyone can check whether a contentious claim was added recently, whether it was disputed, and whether the evidence has been evaluated. This transparency is a form of intellectual honesty. Opaque editing ΓÇö where changes happen without a record ΓÇö makes mistakes harder to find and correct.',
  },
  {
    id: 'quiz-wikipedia-t3',
    entryId: 'entry-wikipedia-editing',
    difficultyTier: 3,
    question: 'Wikipedia demonstrates that knowledge at civilisational scale is not a fixed product but a continuously negotiated process. How does this understanding of knowledge as process rather than product change how we should use it?',
    options: [
      'It means we should not trust Wikipedia and should only read books',
      'It means we should treat any knowledge source ΓÇö including Wikipedia ΓÇö as a current best understanding subject to revision, check important claims against multiple sources, and remain willing to update our beliefs when evidence changes',
      'It means knowledge is purely relative and there is no such thing as a wrong answer',
      'It means that only the most recent version of any article is worth reading',
    ],
    correctIndex: 1,
    explanation: 'Recognising that knowledge is continuously revised does not make it useless ΓÇö it makes it honest. Every Wikipedia article is the community\'s current best understanding of a topic. New evidence, new scholarship, and new perspectives will revise it. This is true of all knowledge. The correct response is not cynicism but careful, multi-source verification and intellectual humility.',
  },
];
