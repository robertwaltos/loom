/**
 * Content Entries — Workshop Crossroads
 * World: Workshop Crossroads | Guide: Kenzo Nakamura-Osei | Subject: Design Thinking
 *
 * Four published entries spanning design thinking and cross-disciplinary innovation:
 *   1. Leonardo da Vinci — the original crossroads thinker
 *   2. The Bauhaus — where art met industry
 *   3. Biomimicry — nature's design solutions
 *   4. Design Thinking — a process for solving any problem
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Leonardo da Vinci (Tier 1 — ages 5-6) ────────────────

export const ENTRY_DA_VINCI_CROSSROADS: RealWorldEntry = {
  id: 'entry-da-vinci-crossroads',
  type: 'person',
  title: 'The Man Who Did Everything',
  year: 1452,
  yearDisplay: '1452–1519 CE',
  era: 'renaissance',
  descriptionChild:
    "Leonardo da Vinci was a painter, an inventor, a scientist, an engineer, a musician, and a writer — all at the same time. He designed flying machines 400 years before airplanes existed. He studied bones, rivers, and flowers so he could paint them more truthfully. He didn't see any difference between science and art.",
  descriptionOlder:
    "Da Vinci's notebooks contain over 7,000 pages of observations spanning anatomy, botany, engineering, optics, geology, and art. He approached every subject as interconnected: his understanding of fluid dynamics informed his painting of water; his anatomical studies improved his rendering of the human form. Kenzo considers da Vinci the patron saint of the Workshop Crossroads — the proof that specialization, while useful, is not the only path to mastery.",
  descriptionParent:
    "Da Vinci exemplifies 'polymathic thinking' — the integration of knowledge across domains. Modern education often separates subjects into silos; da Vinci's work demonstrates the power of lateral transfer between disciplines. His notebooks are a master class in observation, hypothesis, and iteration. For children, the key insight is that being interested in many things is not a weakness — it's a design strategy. Kenzo opens da Vinci's notebooks at the Workshop and challenges children to find how many disciplines each sketch connects.",
  realPeople: ['Leonardo da Vinci'],
  quote: "Study the science of art. Study the art of science. Learn how to see.",
  quoteAttribution: 'Leonardo da Vinci',
  geographicLocation: { lat: 43.7696, lng: 11.2558, name: 'Florence, Italy' },
  continent: 'Europe',
  subjectTags: ['polymath', 'Renaissance', 'design', 'interdisciplinary', 'observation'],
  worldId: 'workshop-crossroads',
  guideId: 'kenzo-nakamura-osei',
  adventureType: 'guided_expedition',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-bauhaus-art-industry'],
  funFact:
    "Da Vinci wrote his notes in mirror script — right to left, backwards. Scholars debate whether this was for secrecy, because he was left-handed and it prevented smudging, or just habit. Kenzo says: 'The genius is not in the handwriting. It's in the seeing.'",
  imagePrompt:
    "Leonardo's workshop in Renaissance Florence, a sprawling creative studio, open notebooks covering every surface — anatomical drawings, flying machine sketches, botanical studies, water flow diagrams, architectural plans — Leonardo himself working at a central table with tools from every discipline around him (paintbrushes, compasses, lenses, clay), a half-finished painting on an easel beside an engineering prototype, warm Tuscan light through arched windows, Studio Ghibli Renaissance workshop realism with sense of boundless curiosity",
  status: 'published',
};

// ─── Entry 2: The Bauhaus (Tier 2 — ages 7-8) ─────────────────────

export const ENTRY_BAUHAUS_ART_INDUSTRY: RealWorldEntry = {
  id: 'entry-bauhaus-art-industry',
  type: 'cultural_milestone',
  title: 'The School That Redesigned Everything',
  year: 1919,
  yearDisplay: '1919–1933 CE',
  era: 'modern',
  descriptionChild:
    "A school called the Bauhaus believed that art and making useful things should be taught together. Builders, painters, sculptors, and weavers all learned from each other. The chairs you sit on, the letters you read, and the buildings around you were all influenced by this one school.",
  descriptionOlder:
    "The Bauhaus pioneered the integration of fine art, craft, and industrial design under one curriculum. Students studied color theory with Kandinsky, form with Klee, and manufacturing with engineers. The school's philosophy — 'form follows function' — shaped modern architecture, furniture, graphic design, and product design across the world. The Nazis closed it in 1933 because its internationalism and modernism conflicted with their ideology. Its influence never closed.",
  descriptionParent:
    "The Bauhaus (1919–1933) represents one of the most influential educational experiments in history. Its curriculum model — integrating theory and practice, art and engineering — anticipated modern interdisciplinary education by a century. The school's diaspora after Nazi closure spread its principles globally, particularly to the US (Moholy-Nagy at IIT Chicago, Albers at Black Mountain College and Yale). For children, the Bauhaus demonstrates that designed objects are not neutral — every chair, font, and building carries the philosophy of its designer.",
  realPeople: ['Walter Gropius', 'Wassily Kandinsky', 'Paul Klee'],
  quote: "The ultimate aim of all creative activity is the building.",
  quoteAttribution: 'Walter Gropius, Bauhaus Manifesto, 1919',
  geographicLocation: { lat: 50.9730, lng: 11.3294, name: 'Weimar, Germany' },
  continent: 'Europe',
  subjectTags: ['Bauhaus', 'design history', 'art and industry', 'modernism', 'education'],
  worldId: 'workshop-crossroads',
  guideId: 'kenzo-nakamura-osei',
  adventureType: 'guided_expedition',
  difficultyTier: 2,
  prerequisites: ['entry-da-vinci-crossroads'],
  unlocks: ['entry-biomimicry'],
  funFact:
    "The clean, geometric, sans-serif fonts you see everywhere descend from Bauhaus typography. Kenzo points to the Workshop's signage: 'Everything here was designed. Even the letters.'",
  imagePrompt:
    "The Bauhaus school building in Dessau with its iconic glass curtain wall facade, inside through the windows visible: students painting at easels beside students building furniture beside students weaving textiles, color theory charts by Kandinsky on the walls, a geometric Bauhaus chair being assembled, clean modernist typography on signs, the building itself as a teaching object — form follows function made architectural, crisp Weimar Republic light, Studio Ghibli architectural realism with design education warmth",
  status: 'published',
};

// ─── Entry 3: Biomimicry (Tier 2 — ages 7-8) ──────────────────────

export const ENTRY_BIOMIMICRY: RealWorldEntry = {
  id: 'entry-biomimicry',
  type: 'scientific_principle',
  title: "Nature's Patent Office",
  year: 1997,
  yearDisplay: '1997 CE (formalised)',
  era: 'contemporary',
  descriptionChild:
    "Nature has spent billions of years solving problems. Burrs inspired Velcro. Kingfisher beaks inspired bullet train noses. Gecko feet inspired sticky pads that work without glue. When humans copy nature's solutions to design better things, it's called biomimicry.",
  descriptionOlder:
    "Janine Benyus formalized biomimicry in her 1997 book, but humans have practiced it intuitively for millennia. The Japanese Shinkansen bullet train reduced its sonic boom by 30% by mimicking the kingfisher's beak shape. Namibian desert beetles inspired water-harvesting surfaces. The lotus leaf's self-cleaning surface inspired stain-resistant coatings. Kenzo teaches biomimicry as a design method: before inventing from scratch, ask 'how did nature already solve this?'",
  descriptionParent:
    "Biomimicry represents a paradigm shift in design philosophy: from dominating nature to learning from it. Benyus's framework distinguishes between 'bio-utilization' (using organisms), 'bio-assistance' (domestication), and 'biomimicry' (emulating nature's strategies). The discipline has produced innovations in architecture (termite-mound ventilation), materials science (spider silk composites), robotics (swarm behavior), and water management. It teaches children that the natural world is a repository of tested solutions — 3.8 billion years of R&D.",
  realPeople: ['Janine Benyus', 'George de Mestral'],
  quote: "Ask nature. She's had 3.8 billion years to figure this out.",
  quoteAttribution: 'Janine Benyus',
  geographicLocation: null,
  continent: null,
  subjectTags: ['biomimicry', 'nature-inspired design', 'innovation', 'engineering', 'ecology'],
  worldId: 'workshop-crossroads',
  guideId: 'kenzo-nakamura-osei',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-bauhaus-art-industry'],
  unlocks: ['entry-design-thinking-process'],
  funFact:
    "George de Mestral invented Velcro in 1941 after examining burrs stuck to his dog's fur under a microscope. He saw tiny hooks catching loops of fur. Eight years of development later, Velcro was patented. Kenzo keeps a burr and a Velcro strip side by side at the Workshop. 'Nature,' he says, 'is the first and best designer.'",
  imagePrompt:
    "Kenzo's Workshop with a split display wall: on the left, natural specimens — a burr, a kingfisher, a gecko foot, a lotus leaf, a termite mound cross-section — and on the right, their human-designed counterparts — Velcro strip, bullet train nose, adhesive pad, self-cleaning coating, ventilated building — connected by glowing design-line arrows, Kenzo pointing out the connections to fascinated children, workbench with prototyping materials in foreground, warm creative studio light, Studio Ghibli nature-meets-engineering realism",
  status: 'published',
};

// ─── Entry 4: Design Thinking Process (Tier 3 — ages 9-10) ─────────

export const ENTRY_DESIGN_THINKING_PROCESS: RealWorldEntry = {
  id: 'entry-design-thinking-process',
  type: 'scientific_principle',
  title: 'Five Steps That Solve Any Problem',
  year: null,
  yearDisplay: '1960s–Present',
  era: 'contemporary',
  descriptionChild:
    "Design thinking is a way to solve problems in five steps: understand the problem by listening to people (empathize), define exactly what you're trying to fix, brainstorm lots of ideas, build a quick model (prototype), and test it. If it doesn't work, you go back and try again. Failing early is a feature, not a bug.",
  descriptionOlder:
    "The five phases — Empathize, Define, Ideate, Prototype, Test — form a non-linear process applicable to any problem, not just design. Stanford's d.school popularized the method, but the underlying principle — iterative, human-centered problem-solving — appears in engineering, medicine, social work, and business. Kenzo runs the Workshop as a permanent design studio: every project follows the process, and every failure is documented as valuable data.",
  descriptionParent:
    "Design thinking, formalized by Herbert Simon (1969) and popularized by David Kelley's IDEO and Stanford d.school (2000s), represents a structured approach to creative problem-solving that is increasingly taught in K-12 education. Its emphasis on empathy (understanding the user's actual experience) distinguishes it from purely technical problem-solving. For children, the most important insight is that iteration — trying, failing, adjusting, retrying — is not a sign of incompetence but the core methodology of professional design and innovation.",
  realPeople: ['Herbert Simon', 'David Kelley'],
  quote: "Watch other people struggle. That's where every good design begins.",
  quoteAttribution: 'Kenzo Nakamura-Osei',
  geographicLocation: { lat: 37.4275, lng: -122.1697, name: 'Stanford d.school, California, USA' },
  continent: 'North America',
  subjectTags: ['design thinking', 'problem solving', 'iteration', 'empathy', 'prototyping'],
  worldId: 'workshop-crossroads',
  guideId: 'kenzo-nakamura-osei',
  adventureType: 'reenactment',
  difficultyTier: 3,
  prerequisites: ['entry-biomimicry'],
  unlocks: [],
  funFact:
    "IDEO, the design firm that popularized design thinking, once redesigned a shopping cart in five days as a TV demonstration. Their process started with observing people struggling with existing carts — empathy first, solutions second. Kenzo plays the episode at the Workshop.",
  imagePrompt:
    "Kenzo's Workshop arranged as a design thinking studio, five distinct zones visible in a circular layout: Empathize (children interviewing each other), Define (a problem statement written large on a whiteboard), Ideate (sticky notes covering a wall with wild ideas), Prototype (children building rough cardboard and tape models), Test (children trying each other's prototypes and giving feedback), Kenzo moving between stations coaching, arrows on the floor showing the iterative loop back to earlier stages, energetic creative studio light, Studio Ghibli maker-space realism",
  status: 'published',
};

// ─── Export ────────────────────────────────────────────────────────

export const WORKSHOP_CROSSROADS_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_DA_VINCI_CROSSROADS,
  ENTRY_BAUHAUS_ART_INDUSTRY,
  ENTRY_BIOMIMICRY,
  ENTRY_DESIGN_THINKING_PROCESS,
];

export const WORKSHOP_CROSSROADS_ENTRY_IDS = WORKSHOP_CROSSROADS_ENTRIES.map((e) => e.id);
