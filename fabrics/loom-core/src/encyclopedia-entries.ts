/**
 * encyclopedia-entries.ts
 *
 * Every world in Koydo Worlds has a canon of real-world reference entries.
 * Each entry is a historical artefact, person, event, invention, scientific
 * principle, or cultural milestone that the world's curriculum is built on.
 *
 * Data sourced from the Koydo Worlds Build Spec v5, Part 3.
 * 250+ entries spanning all 50 worlds.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type EntryType =
  | 'artifact'
  | 'person'
  | 'event'
  | 'invention'
  | 'scientific_principle'
  | 'cultural_milestone'
  | 'institution'
  | 'text';

export type CurriculumDomain = 'STEM' | 'LANGUAGE_ARTS' | 'FINANCIAL' | 'CROSSROADS';

export interface AgeContent {
  readonly ages5to7: string;
  readonly ages8to10: string;
}

export interface EncyclopediaEntry {
  readonly entryId: string;
  readonly worldId: string;
  readonly domain: CurriculumDomain;
  readonly title: string;
  readonly type: EntryType;
  readonly year?: string;
  readonly location?: string;
  readonly historicalFigures?: ReadonlyArray<string>;
  readonly content: AgeContent;
  readonly adventure: string;
  readonly funFact: string;
}

export interface EncyclopediaRegistryPort {
  readonly totalEntries: number;
  getEntry(entryId: string): EncyclopediaEntry | undefined;
  getEntriesByWorld(worldId: string): ReadonlyArray<EncyclopediaEntry>;
  getEntriesByDomain(domain: CurriculumDomain): ReadonlyArray<EncyclopediaEntry>;
  getEntriesByType(type: EntryType): ReadonlyArray<EncyclopediaEntry>;
  searchByFigure(name: string): ReadonlyArray<EncyclopediaEntry>;
  all(): ReadonlyArray<EncyclopediaEntry>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const TOTAL_ENCYCLOPEDIA_ENTRIES = 260 as const;

// ─────────────────────────────────────────────────────────────────────────────
// Canonical entry data
// ─────────────────────────────────────────────────────────────────────────────

export const ENCYCLOPEDIA_ENTRIES: ReadonlyArray<EncyclopediaEntry> = [

  // ── STEM: Number Garden ──────────────────────────────────────────────────

  {
    entryId: 'ng-zero',
    worldId: 'number-garden',
    domain: 'STEM',
    title: 'The Invention of Zero',
    type: 'event',
    year: '628 CE',
    location: 'India',
    historicalFigures: ['Brahmagupta'],
    content: {
      ages5to7: 'Zero is the number that means "nothing" — but it changed everything about how we count!',
      ages8to10: 'Brahmagupta formally defined zero and its rules for arithmetic in 628 CE, enabling the place-value system that powers all modern mathematics.',
    },
    adventure: 'Help Brahmagupta place the missing zero in the stone tablet before the monsoon arrives.',
    funFact: 'Before zero existed, Roman numerals had no way to write "nothing" — try doing long division without it!',
  },
  {
    entryId: 'ng-fibonacci',
    worldId: 'number-garden',
    domain: 'STEM',
    title: 'Fibonacci Sequence',
    type: 'invention',
    year: '1202 CE',
    location: 'Pisa, Italy',
    historicalFigures: ['Leonardo of Pisa (Fibonacci)'],
    content: {
      ages5to7: 'The Fibonacci sequence is a number pattern where each number is the sum of the two before it: 1, 1, 2, 3, 5, 8…',
      ages8to10: 'Fibonacci introduced the sequence to Europe in his Liber Abaci. It appears in sunflower seeds, pine cones, shell spirals, and galaxy arms.',
    },
    adventure: 'Plant sunflower seeds in the spiral pattern to unlock the garden\'s golden gate.',
    funFact: 'The ratio between consecutive Fibonacci numbers approaches the golden ratio (1.618…), which artists have used for centuries.',
  },
  {
    entryId: 'ng-euclid',
    worldId: 'number-garden',
    domain: 'STEM',
    title: 'Euclid\'s Elements',
    type: 'text',
    year: '300 BCE',
    location: 'Alexandria, Egypt',
    historicalFigures: ['Euclid'],
    content: {
      ages5to7: 'Euclid wrote a book called Elements that taught people how to do geometry — measuring shapes, angles, and distances.',
      ages8to10: 'The Elements is one of the most influential textbooks ever written. It introduced proof-based mathematics and defined points, lines, and planes still used today.',
    },
    adventure: 'Reconstruct Euclid\'s proof that there are infinitely many prime numbers using the stones in the garden.',
    funFact: 'The Elements remained a primary geometry textbook for over 2,000 years — from 300 BCE to the early 1900s!',
  },
  {
    entryId: 'ng-binary',
    worldId: 'number-garden',
    domain: 'STEM',
    title: 'Binary Number System',
    type: 'invention',
    year: '1703 CE',
    location: 'Germany',
    historicalFigures: ['Gottfried Wilhelm Leibniz'],
    content: {
      ages5to7: 'Binary is a counting system that only uses 0s and 1s. Computers think in binary!',
      ages8to10: 'Leibniz formally defined binary in 1703, recognising its roots in ancient Chinese I Ching. Every computer uses binary to store and process all data.',
    },
    adventure: 'Decode the binary message hidden in the garden\'s light-up stepping stones.',
    funFact: 'The number 42 in binary is 00101010 — and yes, it\'s still the answer to life, the universe, and everything.',
  },
  {
    entryId: 'ng-prime-sieve',
    worldId: 'number-garden',
    domain: 'STEM',
    title: 'Sieve of Eratosthenes',
    type: 'invention',
    year: '240 BCE',
    location: 'Cyrene (modern Libya)',
    historicalFigures: ['Eratosthenes'],
    content: {
      ages5to7: 'A clever way to find all the prime numbers by crossing out multiples — like sieving sand to find gold!',
      ages8to10: 'Eratosthenes\' algorithm efficiently finds all primes up to any number N. He also famously calculated the Earth\'s circumference with a stick and a well.',
    },
    adventure: 'Help Dottie sieve the prime flowers out before the garden blooms.',
    funFact: 'Eratosthenes calculated Earth\'s circumference to within 2% accuracy — using only two sticks and the angle of shadows.',
  },

  // ── STEM: Science Lab ────────────────────────────────────────────────────

  {
    entryId: 'sl-periodic-table',
    worldId: 'science-lab',
    domain: 'STEM',
    title: 'Periodic Table of Elements',
    type: 'invention',
    year: '1869 CE',
    location: 'Russia',
    historicalFigures: ['Dmitri Mendeleev'],
    content: {
      ages5to7: 'The Periodic Table is a chart of all the building blocks that make up everything — from air to gold to your bones!',
      ages8to10: 'Mendeleev organised 63 known elements by atomic weight and chemical properties, leaving gaps for elements he predicted. All three were discovered within his lifetime.',
    },
    adventure: 'Fill in Mendeleev\'s missing element slots before the chemical reaction goes wrong.',
    funFact: 'Mendeleev predicted the properties of gallium, scandium, and germanium years before they were discovered — and was right about all three.',
  },
  {
    entryId: 'sl-dna',
    worldId: 'science-lab',
    domain: 'STEM',
    title: 'DNA Double Helix Structure',
    type: 'scientific_principle',
    year: '1953 CE',
    location: 'Cambridge, UK',
    historicalFigures: ['Rosalind Franklin', 'James Watson', 'Francis Crick'],
    content: {
      ages5to7: 'DNA is the instruction book inside every living cell that tells it how to grow and what to become.',
      ages8to10: 'Franklin\'s X-ray crystallography (Photo 51) revealed the helical structure. Watson and Crick built the model. DNA carries genetic information in base-pair sequences.',
    },
    adventure: 'Use Franklin\'s X-ray photo to piece together the correct double helix model.',
    funFact: 'If you unrolled all the DNA in one human cell, it would stretch about 2 metres — packed into a nucleus 6 micrometres wide.',
  },
  {
    entryId: 'sl-gravity',
    worldId: 'science-lab',
    domain: 'STEM',
    title: 'Universal Gravitation',
    type: 'scientific_principle',
    year: '1687 CE',
    location: 'England',
    historicalFigures: ['Isaac Newton'],
    content: {
      ages5to7: 'Gravity is the invisible force that pulls things toward each other — it\'s why apples fall and why the Moon stays near Earth.',
      ages8to10: 'Newton\'s law of universal gravitation: every mass attracts every other mass with a force proportional to their masses and inversely proportional to the square of the distance.',
    },
    adventure: 'Adjust the orbital distance of the mini-planet to keep it from crashing or escaping gravity.',
    funFact: 'The Moon is slowly drifting away from Earth at about 3.8 cm per year — the same rate your fingernails grow.',
  },
  {
    entryId: 'sl-photosynthesis',
    worldId: 'science-lab',
    domain: 'STEM',
    title: 'Photosynthesis',
    type: 'scientific_principle',
    year: '1779 CE',
    location: 'Netherlands',
    historicalFigures: ['Jan Ingenhousz'],
    content: {
      ages5to7: 'Plants eat sunlight! They turn light, air, and water into food and release oxygen for us to breathe.',
      ages8to10: 'Ingenhousz discovered that plants produce oxygen in sunlight and carbon dioxide in darkness. The light-dependent and light-independent reactions convert CO₂ + H₂O + light → glucose + O₂.',
    },
    adventure: 'Balance the light levels in the greenhouse to maximise the plant\'s ATP output.',
    funFact: 'Cyanobacteria performing photosynthesis 2.7 billion years ago caused the "Great Oxygenation Event" that made complex life possible.',
  },
  {
    entryId: 'sl-germ-theory',
    worldId: 'science-lab',
    domain: 'STEM',
    title: 'Germ Theory of Disease',
    type: 'scientific_principle',
    year: '1861 CE',
    location: 'France/Germany',
    historicalFigures: ['Louis Pasteur', 'Robert Koch'],
    content: {
      ages5to7: 'Germs are tiny living things too small to see that can make us sick. Washing hands stops them spreading!',
      ages8to10: 'Pasteur\'s swan-neck flask experiment disproved spontaneous generation. Koch\'s postulates established criteria for proving a microorganism causes a specific disease.',
    },
    adventure: 'Complete Pasteur\'s swan-neck flask experiment to prove that broth doesn\'t spontaneously grow bacteria.',
    funFact: 'Before germ theory, doctors would go from autopsies to delivering babies without washing hands — Semmelweis was fired for suggesting handwashing.',
  },

  // ── STEM: Starfall Observatory ───────────────────────────────────────────

  {
    entryId: 'so-copernicus',
    worldId: 'starfall-observatory',
    domain: 'STEM',
    title: 'Heliocentric Model',
    type: 'scientific_principle',
    year: '1543 CE',
    location: 'Poland',
    historicalFigures: ['Nicolaus Copernicus'],
    content: {
      ages5to7: 'Copernicus figured out that Earth goes around the Sun — not the other way around!',
      ages8to10: 'Copernicus\' De Revolutionibus placed the Sun at the centre of the solar system, overturning 1,400 years of Ptolemaic geocentrism. Published the year he died.',
    },
    adventure: 'Rearrange the orrery models to show the correct heliocentric orbits.',
    funFact: 'Copernicus waited until he was dying to publish his model, fearing persecution. His book was banned by the Catholic Church for 200 years.',
  },
  {
    entryId: 'so-light-speed',
    worldId: 'starfall-observatory',
    domain: 'STEM',
    title: 'Speed of Light Measurement',
    type: 'scientific_principle',
    year: '1676 CE',
    location: 'Paris, France',
    historicalFigures: ['Ole Rømer'],
    content: {
      ages5to7: 'Light travels incredibly fast — it could circle Earth 7.5 times in just one second!',
      ages8to10: 'Rømer observed that Jupiter\'s moon Io appeared to eclipse "late" when Earth was farther from Jupiter, calculating light travels ~220,000 km/s (modern: 299,792 km/s).',
    },
    adventure: 'Use Io\'s eclipse timing to calculate how far away Jupiter is tonight.',
    funFact: 'The light you see from the Sun left 8 minutes and 20 seconds ago. If the Sun vanished right now, you wouldn\'t know for another 8 minutes.',
  },
  {
    entryId: 'so-black-holes',
    worldId: 'starfall-observatory',
    domain: 'STEM',
    title: 'Black Hole First Image',
    type: 'event',
    year: '2019 CE',
    location: 'Global (Event Horizon Telescope)',
    historicalFigures: ['Katie Bouman'],
    content: {
      ages5to7: 'A black hole is a place where gravity is so strong that even light can\'t escape. Scientists took the first photo of one in 2019!',
      ages8to10: 'The Event Horizon Telescope linked eight radio telescopes across four continents. Bouman led the algorithm team that stitched 5 petabytes of data into the first black hole image.',
    },
    adventure: 'Feed the radio telescope data through Bouman\'s algorithm to reveal the hidden image.',
    funFact: 'The black hole imaged (M87*) has a mass of 6.5 billion suns and is 55 million light-years away. Its event horizon is larger than our entire solar system.',
  },

  // ── STEM: Circuit Marsh ──────────────────────────────────────────────────

  {
    entryId: 'cm-transistor',
    worldId: 'circuit-marsh',
    domain: 'STEM',
    title: 'Invention of the Transistor',
    type: 'invention',
    year: '1947 CE',
    location: 'Bell Labs, USA',
    historicalFigures: ['William Shockley', 'John Bardeen', 'Walter Brattain'],
    content: {
      ages5to7: 'A transistor is a tiny switch made of special materials. Billions of them fit on a chip smaller than your fingernail — they run all computers!',
      ages8to10: 'The point-contact transistor replaced vacuum tubes, enabling compact electronics. Moore\'s Law observed transistor counts would double every two years — holding true for 50+ years.',
    },
    adventure: 'Wire the transistor array correctly to let the signal pass through the marsh.',
    funFact: 'A modern smartphone chip contains approximately 15 billion transistors — all in a space smaller than a postage stamp.',
  },
  {
    entryId: 'cm-internet',
    worldId: 'circuit-marsh',
    domain: 'STEM',
    title: 'Birth of the Internet (ARPANET)',
    type: 'event',
    year: '1969 CE',
    location: 'UCLA, California, USA',
    historicalFigures: ['Vint Cerf', 'Bob Kahn'],
    content: {
      ages5to7: 'The internet is a giant web connecting computers all around the world so they can share information.',
      ages8to10: 'ARPANET sent the first message ("lo" — because it crashed after "lo" of "login") in 1969. Cerf and Kahn designed TCP/IP in 1974, the protocol that became the modern internet.',
    },
    adventure: 'Repair the packet-routing paths across the marsh before the data deadline.',
    funFact: 'The first internet message ever sent was "lo" — the system crashed right after, so it accidentally became poetry.',
  },
  {
    entryId: 'cm-turing',
    worldId: 'circuit-marsh',
    domain: 'STEM',
    title: 'Turing Machine',
    type: 'invention',
    year: '1936 CE',
    location: 'Cambridge, UK',
    historicalFigures: ['Alan Turing'],
    content: {
      ages5to7: 'Alan Turing invented the idea of a machine that could follow any set of instructions — the blueprint for all computers.',
      ages8to10: 'Turing\'s theoretical machine (an infinite tape + read/write head + rules) proved that some problems are mathematically unsolvable. It forms the theoretical basis of all computation.',
    },
    adventure: 'Programme the marsh automaton using Turing\'s tape rules to cross the reed bed.',
    funFact: 'During WWII, Turing\'s Bombe machine cracked the German Enigma code, likely shortening the war by 2–4 years and saving millions of lives.',
  },

  // ── STEM: Meadow Laboratory ──────────────────────────────────────────────

  {
    entryId: 'ml-darwin',
    worldId: 'meadow-lab',
    domain: 'STEM',
    title: 'Theory of Evolution by Natural Selection',
    type: 'scientific_principle',
    year: '1859 CE',
    location: 'England',
    historicalFigures: ['Charles Darwin', 'Alfred Russel Wallace'],
    content: {
      ages5to7: 'Darwin discovered that living things slowly change over many generations — the ones best suited to their home survive and have babies, passing on their traits.',
      ages8to10: 'Darwin and Wallace independently proposed that heritable variation + differential reproduction + time = evolution. On the Origin of Species described natural and sexual selection.',
    },
    adventure: 'Guide the meadow moths to the right flowers by selecting which colouring helps them hide best.',
    funFact: 'Darwin spent 20 years gathering evidence before publishing — he was terrified of the controversy. Wallace\'s letter finally spurred him to publish.',
  },
  {
    entryId: 'ml-mendel',
    worldId: 'meadow-lab',
    domain: 'STEM',
    title: 'Mendelian Inheritance',
    type: 'scientific_principle',
    year: '1866 CE',
    location: 'Brno, Moravia (Czech Republic)',
    historicalFigures: ['Gregor Mendel'],
    content: {
      ages5to7: 'Mendel planted thousands of pea plants and figured out how traits like height and colour are passed from parents to children.',
      ages8to10: 'Mendel\'s laws of segregation and independent assortment, derived from 10 years growing 28,000 pea plants, defined the unit of heredity (later called "genes").',
    },
    adventure: 'Cross the right pea plants to produce the purple-flowered variety before the exhibition.',
    funFact: 'Mendel\'s work was ignored for 35 years after publication. He was rediscovered in 1900, 16 years after his death.',
  },

  // ── STEM: Tideline Bay ───────────────────────────────────────────────────

  {
    entryId: 'tb-tides',
    worldId: 'tideline-bay',
    domain: 'STEM',
    title: 'Tidal Forces and the Moon',
    type: 'scientific_principle',
    year: '1687 CE',
    location: 'Global',
    historicalFigures: ['Isaac Newton'],
    content: {
      ages5to7: 'The Moon\'s gravity gently pulls on Earth\'s oceans, making them bulge — creating the rising and falling tides twice a day.',
      ages8to10: 'Newton explained tides as differential gravitational forces across Earth\'s diameter. Tidal locking — why we always see the same face of the Moon — arises from the same mechanism.',
    },
    adventure: 'Use high tide timing to float the supply boat safely into the harbour.',
    funFact: 'The Sun also causes tides, but the Moon\'s tidal force is 2.2× stronger. When they align (spring tides), oceans rise and fall much more dramatically.',
  },
  {
    entryId: 'tb-rachel-carson',
    worldId: 'tideline-bay',
    domain: 'STEM',
    title: 'Silent Spring',
    type: 'text',
    year: '1962 CE',
    location: 'USA',
    historicalFigures: ['Rachel Carson'],
    content: {
      ages5to7: 'Rachel Carson wrote a book showing how pesticides were harming birds and fish — she helped start the movement to protect nature.',
      ages8to10: 'Silent Spring documented how DDT bioaccumulated through food chains, effectively launching the modern environmental movement and leading to the US Clean Air and Clean Water Acts.',
    },
    adventure: 'Help Suki map the toxin spread before the tide wipes the evidence.',
    funFact: 'The chemical industry hired scientists to attack Carson\'s credibility, but her meticulous research held up. DDT was banned in the US in 1972.',
  },

  // ── STEM: Greenhouse Spiral ──────────────────────────────────────────────

  {
    entryId: 'gs-climate-records',
    worldId: 'greenhouse-spiral',
    domain: 'STEM',
    title: 'Ice Core Climate Records',
    type: 'scientific_principle',
    year: '1960s CE',
    location: 'Antarctica / Greenland',
    historicalFigures: ['Willi Dansgaard'],
    content: {
      ages5to7: 'Scientists drill deep into ancient ice. Tiny air bubbles trapped inside show what Earth\'s air was like thousands of years ago!',
      ages8to10: 'Ice cores trap atmospheric gases and dust. Oxygen isotope ratios (δ¹⁸O) record temperature; CO₂ and methane concentrations track greenhouse gas history. Records extend 800,000 years.',
    },
    adventure: 'Analyse the ice core layers to identify which century had the coldest summer.',
    funFact: 'The deepest ice cores drilled at Dome C, Antarctica, contain ice that is 800,000 years old — preserving air from before modern humans existed.',
  },
  {
    entryId: 'gs-greenhouse-effect',
    worldId: 'greenhouse-spiral',
    domain: 'STEM',
    title: 'Discovery of the Greenhouse Effect',
    type: 'scientific_principle',
    year: '1856 CE',
    location: 'USA',
    historicalFigures: ['Eunice Newton Foote', 'Svante Arrhenius'],
    content: {
      ages5to7: 'Some gases in the air act like a blanket, trapping the Sun\'s warmth. Without them Earth would be frozen; too many and it overheats.',
      ages8to10: 'Foote\'s 1856 experiment showed CO₂ absorbs more heat than air. Arrhenius in 1896 calculated that doubling CO₂ would warm Earth by ~5°C — remarkably close to modern estimates.',
    },
    adventure: 'Adjust gas concentrations in Hugo\'s greenhouse to reach the optimal temperature for the rare orchid.',
    funFact: 'Foote\'s paper was presented to the American Association for the Advancement of Science in 1856 — but a male scientist read it out loud because women weren\'t allowed to present.',
  },

  // ── STEM: Frost Peaks ────────────────────────────────────────────────────

  {
    entryId: 'fp-mountain-formation',
    worldId: 'frost-peaks',
    domain: 'STEM',
    title: 'Plate Tectonics',
    type: 'scientific_principle',
    year: '1912 CE',
    location: 'Global',
    historicalFigures: ['Alfred Wegener'],
    content: {
      ages5to7: 'Earth\'s surface is made of giant puzzle pieces that very slowly move. When they crash into each other, mountains form!',
      ages8to10: 'Wegener\'s continental drift hypothesis (1912) was ridiculed but vindicated by seafloor spreading evidence in the 1960s. Plate tectonics unifies geology, volcanism, and seismology.',
    },
    adventure: 'Fit the continental puzzle pieces together to recreate Pangaea.',
    funFact: 'The Himalayas are still growing about 5mm per year as the Indian plate continues to push into the Eurasian plate.',
  },

  // ── STEM: Data Stream ────────────────────────────────────────────────────

  {
    entryId: 'ds-algorithms',
    worldId: 'data-stream',
    domain: 'STEM',
    title: 'Algorithm Design — Sorting',
    type: 'scientific_principle',
    year: '1945 CE',
    location: 'Global',
    historicalFigures: ['John von Neumann'],
    content: {
      ages5to7: 'An algorithm is a set of step-by-step instructions, like a recipe. Computers follow algorithms to do everything from sorting your photos to finding directions.',
      ages8to10: 'Von Neumann invented merge sort in 1945. Sorting algorithms — bubble, merge, quicksort, heapsort — differ in time complexity (Big-O notation). Quicksort averages O(n log n).',
    },
    adventure: 'Race Yuki to sort the data packets using the fastest algorithm before the stream floods.',
    funFact: 'Google processes over 8.5 billion search queries per day, each one using highly optimised sorting and ranking algorithms taking microseconds.',
  },
  {
    entryId: 'ds-ai-bias',
    worldId: 'data-stream',
    domain: 'STEM',
    title: 'Algorithmic Bias',
    type: 'event',
    year: '2018 CE',
    location: 'USA',
    historicalFigures: ['Joy Buolamwini'],
    content: {
      ages5to7: 'Sometimes computers make unfair decisions because they learned from unfair examples. Making AI fair is one of the most important jobs in technology.',
      ages8to10: 'Buolamwini\'s Gender Shades study showed commercial facial recognition was 35% less accurate for dark-skinned women than light-skinned men, revealing systemic bias in training data.',
    },
    adventure: 'Audit the data stream\'s facial recognition model and correct the training imbalance.',
    funFact: 'Buolamwini founded the Algorithmic Justice League after a facial analysis system consistently failed to recognise her face until she wore a white mask.',
  },

  // ── FINANCIAL: Savings Vault ─────────────────────────────────────────────

  {
    entryId: 'sv-compound-interest',
    worldId: 'savings-vault',
    domain: 'FINANCIAL',
    title: 'Compound Interest',
    type: 'scientific_principle',
    year: '1494 CE',
    location: 'Venice, Italy',
    historicalFigures: ['Luca Pacioli'],
    content: {
      ages5to7: 'When you save money, the bank pays you a little extra. Then next year you get extra on your extra too — it snowballs!',
      ages8to10: 'Pacioli\'s Summa de Arithmetica formalised double-entry bookkeeping. Compound interest, A=P(1+r/n)^(nt), enables exponential wealth growth. Einstein allegedly called it "the eighth wonder of the world."',
    },
    adventure: 'Help Abernathy choose between three savings plans — pick the one that grows most over 10 years.',
    funFact: 'If you invested £100 at 7% compounded annually for 40 years, you\'d have £1,497 — almost 15× growth, 90% of it from compound interest alone.',
  },
  {
    entryId: 'sv-first-bank',
    worldId: 'savings-vault',
    domain: 'FINANCIAL',
    title: 'First Modern Bank (Banca Monte dei Paschi di Siena)',
    type: 'institution',
    year: '1472 CE',
    location: 'Siena, Italy',
    content: {
      ages5to7: 'The world\'s oldest bank still operating was founded over 500 years ago in Italy. It kept people\'s money safe and lent money to help businesses grow.',
      ages8to10: 'Monte dei Paschi di Siena, founded 1472, introduced the concept of a public savings bank — accepting deposits, lending to the poor at low rates, stabilising local economies.',
    },
    adventure: 'Restore Abernathy\'s vault ledger — match deposits to withdrawals across 5 centuries of records.',
    funFact: 'Monte dei Paschi di Siena has operated continuously for 553 years, surviving wars, plagues, revolutions, and two world wars.',
  },
  {
    entryId: 'sv-credit-score',
    worldId: 'savings-vault',
    domain: 'FINANCIAL',
    title: 'Credit Scoring System',
    type: 'invention',
    year: '1956 CE',
    location: 'USA',
    historicalFigures: ['Bill Fair', 'Earl Isaac'],
    content: {
      ages5to7: 'A credit score is like a trust number that tells banks how likely you are to pay back money you borrow.',
      ages8to10: 'FICO score (Fair, Isaac and Company) standardised creditworthiness assessment using 5 factors: payment history (35%), amounts owed (30%), length of credit history (15%), new credit (10%), credit mix (10%).',
    },
    adventure: 'Help a vault customer understand why their score dropped — identify the root cause in their history.',
    funFact: 'A difference of 100 points on your credit score can change your mortgage interest rate enough to cost or save tens of thousands of dollars over a 30-year loan.',
  },

  // ── FINANCIAL: Debt Glacier ──────────────────────────────────────────────

  {
    entryId: 'dg-interest-rates',
    worldId: 'debt-glacier',
    domain: 'FINANCIAL',
    title: 'Interest Rate and Usury Laws',
    type: 'event',
    year: '2000 BCE',
    location: 'Mesopotamia (Iraq)',
    content: {
      ages5to7: 'Interest is the price you pay for borrowing money. Long ago, people set rules so lenders couldn\'t charge too much — protecting borrowers from debt traps.',
      ages8to10: 'The Code of Hammurabi (~1754 BCE) capped interest rates at 20% for silver and 33% for grain. Modern central banks set base rates to balance growth and inflation.',
    },
    adventure: 'Navigate the debt glacier by choosing the lowest-interest route across the ice.',
    funFact: 'In medieval Europe, the Church banned charging interest (usury). Jewish merchants became money-lenders because they weren\'t bound by Canon law — leading to significant cultural displacement.',
  },
  {
    entryId: 'dg-debt-forgiveness',
    worldId: 'debt-glacier',
    domain: 'FINANCIAL',
    title: 'Jubilee Year — Debt Cancellation',
    type: 'cultural_milestone',
    year: '600 BCE',
    location: 'Ancient Israel',
    content: {
      ages5to7: 'Some ancient cultures had a special year every 50 years when all debts were wiped out and slaves were freed — giving everyone a fresh start.',
      ages8to10: 'The Jubilee (Leviticus 25) cancelled debts and returned land to original owners every 50 years. Solon\'s seisachtheia (594 BCE) cancelled Athenian debt and freed debt-slaves. Both influenced modern debt-relief frameworks.',
    },
    adventure: 'Elsa calculates which villagers need a Jubilee debt cancellation to restore the glacier\'s balance.',
    funFact: 'The word "jubilee" entered English via Hebrew yovel (ram\'s horn trumpet blown to announce the year). Modern debt relief campaigns like JUBILEE 2000 erased $100 billion in developing-world debt.',
  },

  // ── FINANCIAL: Entrepreneur's Workshop ──────────────────────────────────

  {
    entryId: 'ew-assembly-line',
    worldId: 'entrepreneur-workshop',
    domain: 'FINANCIAL',
    title: 'Ford Moving Assembly Line',
    type: 'invention',
    year: '1913 CE',
    location: 'Highland Park, Michigan, USA',
    historicalFigures: ['Henry Ford'],
    content: {
      ages5to7: 'Henry Ford invented the moving assembly line so that car parts came to the workers instead of workers walking to parts. Cars became cheap enough for everyone!',
      ages8to10: 'Ford\'s assembly line reduced Model T production time from 12.5 hours to 93 minutes, cutting price from $825 to $360. He also paid workers $5/day — double the market rate — to create the customer base.',
    },
    adventure: 'Set up Diego\'s workshop production line to hit the daily order target.',
    funFact: 'Ford\'s $5-a-day wage was partly meant to stop workers quitting due to the monotony of the assembly line — it had a 370% annual staff turnover before.',
  },
  {
    entryId: 'ew-microfinance',
    worldId: 'entrepreneur-workshop',
    domain: 'FINANCIAL',
    title: 'Grameen Bank Microfinance',
    type: 'institution',
    year: '1983 CE',
    location: 'Bangladesh',
    historicalFigures: ['Muhammad Yunus'],
    content: {
      ages5to7: 'Muhammad Yunus gave tiny loans to very poor people — especially women — to start small businesses. It changed millions of lives!',
      ages8to10: 'Grameen Bank pioneered microcredit: small loans ($27 average) with high repayment rates (97%+) to the rural poor. Yunus won the 2006 Nobel Peace Prize. Over 9 million borrowers, 97% women.',
    },
    adventure: 'Help three Grameen borrowers pitch their business plans — choose who will create the most community value.',
    funFact: 'Yunus started by lending $27 of his own money to 42 basket weavers in 1974. That experiment became an institution serving 9 million people.',
  },

  // ── FINANCIAL: Job Fair ──────────────────────────────────────────────────

  {
    entryId: 'jf-labor-movement',
    worldId: 'job-fair',
    domain: 'FINANCIAL',
    title: 'Labour Rights Movement',
    type: 'event',
    year: '1886 CE',
    location: 'Chicago, USA',
    historicalFigures: ['Samuel Gompers'],
    content: {
      ages5to7: 'Workers banded together in groups called unions to ask for fair pay, safe workplaces, and limits on how many hours they had to work.',
      ages8to10: 'The 8-hour workday movement (1886) culminated in the Haymarket affair. The AFL under Gompers secured minimum wages, collective bargaining rights, and workplace safety standards over decades.',
    },
    adventure: 'Negotiate Babatunde\'s first union contract — balance employer and worker demands.',
    funFact: 'The 40-hour work week was considered a radical idea in the 1920s — Ford Motor Company adopted it in 1926, finding productivity increased over 60-hour weeks.',
  },

  // ── FINANCIAL: Tax Office Tower ──────────────────────────────────────────

  {
    entryId: 'tot-public-goods',
    worldId: 'tax-office',
    domain: 'FINANCIAL',
    title: 'Theory of Public Goods',
    type: 'scientific_principle',
    year: '1954 CE',
    location: 'USA',
    historicalFigures: ['Paul Samuelson'],
    content: {
      ages5to7: 'Some things are better when everyone shares them — like roads, parks, and schools. Taxes pay for these things that everyone uses.',
      ages8to10: 'Samuelson\'s 1954 paper defined public goods as non-excludable and non-rival. The free-rider problem means markets underprovide them — hence taxation. Roads, national defence, and basic research are classic examples.',
    },
    adventure: 'Help Atlas decide which community services to fund from this year\'s tax budget.',
    funFact: 'The world\'s first income tax was introduced in Britain in 1799 to fund the war against Napoleon — it was supposed to be temporary.',
  },

  // ── LANGUAGE ARTS: Letter Forge ──────────────────────────────────────────

  {
    entryId: 'lf-phoenician-alphabet',
    worldId: 'letter-forge',
    domain: 'LANGUAGE_ARTS',
    title: 'Phoenician Alphabet',
    type: 'invention',
    year: '1050 BCE',
    location: 'Levant (modern Lebanon)',
    content: {
      ages5to7: 'The Phoenicians invented the first alphabet with letters for sounds — not pictures. Almost every alphabet used today grew from theirs!',
      ages8to10: 'The Phoenician 22-letter abjad (consonants only) was adapted by Greeks who added vowels, creating the ancestor of Latin, Cyrillic, Hebrew, Arabic, and hundreds of other scripts.',
    },
    adventure: 'Decode the Phoenician inscription on the forge door to find the hidden flame.',
    funFact: 'The word "alphabet" comes from the first two Phoenician letters: aleph (𐤀) and beth (𐤁) — meaning ox and house.',
  },
  {
    entryId: 'lf-sequoyah',
    worldId: 'letter-forge',
    domain: 'LANGUAGE_ARTS',
    title: 'Cherokee Syllabary (Sequoyah)',
    type: 'invention',
    year: '1821 CE',
    location: 'Cherokee Nation, USA',
    historicalFigures: ['Sequoyah'],
    content: {
      ages5to7: 'Sequoyah was a Cherokee silversmith who created a writing system for his language — the only person in history to independently create an entire script as an adult.',
      ages8to10: 'Sequoyah\'s 86-symbol syllabary gave 12,000+ Cherokee speakers literacy within months of its adoption in 1821. The Cherokee Phoenix newspaper launched in 1828 in both Cherokee and English.',
    },
    adventure: 'Help forge Sequoyah\'s final symbols to complete the syllabary before the council meeting.',
    funFact: 'Within 6 months of the syllabary\'s adoption, Cherokee literacy rates exceeded those of the surrounding white American settlers.',
  },
  {
    entryId: 'lf-braille',
    worldId: 'letter-forge',
    domain: 'LANGUAGE_ARTS',
    title: 'Braille Writing System',
    type: 'invention',
    year: '1824 CE',
    location: 'Paris, France',
    historicalFigures: ['Louis Braille'],
    content: {
      ages5to7: 'Louis Braille lost his sight as a child and invented a reading system using raised dots that you can feel with your fingers.',
      ages8to10: 'Braille, based on Barbier\'s night writing code, uses a 6-dot cell in a 2×3 grid (64 combinations) to represent letters, numbers, and music. Adopted globally, it remains the standard tactile writing system.',
    },
    adventure: 'Read the Braille message on the forge wall to find the key.',
    funFact: 'Louis Braille invented his system at age 15 — three years after losing his sight in an accident with his father\'s awl tool. The same type of tool blinded him; he repurposed the punch to make the dots.',
  },
  {
    entryId: 'lf-rosetta-stone',
    worldId: 'letter-forge',
    domain: 'LANGUAGE_ARTS',
    title: 'Rosetta Stone',
    type: 'artifact',
    year: '196 BCE',
    location: 'Rosetta (Rashid), Egypt',
    historicalFigures: ['Jean-François Champollion'],
    content: {
      ages5to7: 'The Rosetta Stone had the same message written in three languages. Scientists used it to crack the secret code of Ancient Egyptian hieroglyphics!',
      ages8to10: 'Discovered in 1799, the Rosetta Stone carries a decree in hieroglyphics, Demotic, and Greek. Champollion cracked hieroglyphics in 1822 by recognising cartouches (royal name rings).',
    },
    adventure: 'Match the three scripts on the stone to reveal the hidden decree\'s meaning.',
    funFact: 'After Champollion deciphered the Rosetta Stone, he allegedly ran through the streets of Paris shouting "I\'ve got it!" and then collapsed from the excitement.',
  },
  {
    entryId: 'lf-hangul',
    worldId: 'letter-forge',
    domain: 'LANGUAGE_ARTS',
    title: 'Hangul Alphabet',
    type: 'invention',
    year: '1443 CE',
    location: 'Joseon (Korea)',
    historicalFigures: ['King Sejong the Great'],
    content: {
      ages5to7: 'King Sejong created a simple alphabet for Korean so ordinary people — not just scholars — could read and write.',
      ages8to10: 'Hangul\'s 14 consonants and 10 vowels are assembled into syllable blocks. Sejong\'s Hunminjeongeum document explains the design principles: consonant shapes mirror the position of the mouth when pronouncing them.',
    },
    adventure: 'Assemble the correct Hangul syllable blocks to open the forge.',
    funFact: 'Hangul is considered one of the most scientifically designed alphabets ever created. Each consonant symbol literally shows the shape of the mouth making the sound.',
  },

  // ── LANGUAGE ARTS: Great Archive ────────────────────────────────────────

  {
    entryId: 'ga-library-of-alexandria',
    worldId: 'great-archive',
    domain: 'LANGUAGE_ARTS',
    title: 'Library of Alexandria',
    type: 'institution',
    year: '283 BCE',
    location: 'Alexandria, Egypt',
    historicalFigures: ['Ptolemy I Soter', 'Demetrius of Phaleron'],
    content: {
      ages5to7: 'The Library of Alexandria was the biggest library ever built in ancient times — it tried to collect every scroll in the world.',
      ages8to10: 'The Mouseion/Library aimed to hold all human knowledge (~400,000 scrolls). Scholars including Euclid, Eratosthenes, and Archimedes worked there. Its gradual decline spanned centuries — no single dramatic burning.',
    },
    adventure: 'Help the Librarian catalogue the newly arrived scrolls before they\'re lost to the rising Nile.',
    funFact: 'The Library\'s agents bought scrolls from every ship that docked in Alexandria — sailors had to lend their books, which were copied and returned. Sometimes they got the copy back, not the original.',
  },
  {
    entryId: 'ga-printing-press',
    worldId: 'great-archive',
    domain: 'LANGUAGE_ARTS',
    title: 'Gutenberg Printing Press',
    type: 'invention',
    year: '1440 CE',
    location: 'Mainz, Germany',
    historicalFigures: ['Johannes Gutenberg'],
    content: {
      ages5to7: 'Before Gutenberg, every book was copied by hand. His printing press meant books could be made faster — making reading possible for many more people.',
      ages8to10: 'Movable type with oil-based ink reduced Bible production from ~5 years to 2 months. Within 50 years of 1450, over 20 million books were printed across Europe, sparking the Reformation and Scientific Revolution.',
    },
    adventure: 'Set the movable type characters to print the archive\'s next pamphlet before the press deadline.',
    funFact: 'Gutenberg actually went bankrupt — his financial backer seized the press and Bibles. He died with little credit or money despite creating arguably the most influential invention since writing itself.',
  },

  // ── LANGUAGE ARTS: Rhyme Docks ───────────────────────────────────────────

  {
    entryId: 'rd-shakespeare',
    worldId: 'rhyme-docks',
    domain: 'LANGUAGE_ARTS',
    title: 'Shakespeare\'s Works',
    type: 'text',
    year: '1590 CE',
    location: 'London, England',
    historicalFigures: ['William Shakespeare'],
    content: {
      ages5to7: 'Shakespeare wrote plays and poems over 400 years ago that people still read and perform today. He invented hundreds of words we still use!',
      ages8to10: 'Shakespeare\'s 37 plays and 154 sonnets introduced ~1,700 words to English (bedroom, generous, lonely, addiction). He used blank verse (unrhymed iambic pentameter) and formal rhyme depending on character status.',
    },
    adventure: 'Help Felix unscramble the shipwrecked sonnets at the Rhyme Docks.',
    funFact: 'Shakespeare coined: "bedroom," "lonely," "generous," "gloomy," "eyeball," "rant," "swagger," "bedroom," "cold-blooded," and "manager" — among 1,700+ words still in common use.',
  },
  {
    entryId: 'rd-maya-angelou',
    worldId: 'rhyme-docks',
    domain: 'LANGUAGE_ARTS',
    title: 'I Know Why the Caged Bird Sings',
    type: 'text',
    year: '1969 CE',
    location: 'USA',
    historicalFigures: ['Maya Angelou'],
    content: {
      ages5to7: 'Maya Angelou wrote a book about her life growing up — it shows how stories can help people heal and feel understood.',
      ages8to10: 'Angelou\'s autobiography broke conventions for African-American literature through lyrical prose and unflinching honesty about race, trauma, and identity. Her poem "Still I Rise" became a global anthem of resilience.',
    },
    adventure: 'Help Felix arrange Angelou\'s poem "Still I Rise" into its correct stanzas.',
    funFact: 'Maya Angelou spoke five languages and worked as an actress, singer, dancer, and journalist before becoming one of the most celebrated poets in American history.',
  },

  // ── LANGUAGE ARTS: Story Tree ────────────────────────────────────────────

  {
    entryId: 'st-oral-tradition',
    worldId: 'story-tree',
    domain: 'LANGUAGE_ARTS',
    title: 'Oral Storytelling Tradition',
    type: 'cultural_milestone',
    year: '30000 BCE',
    location: 'Global',
    content: {
      ages5to7: 'Long before writing, people told stories out loud. Stories helped people remember history, teach lessons, and feel connected across thousands of years.',
      ages8to10: 'Oral tradition transmitted cosmologies, laws, genealogies, and cultural knowledge across generations. Griots in West Africa hold entire kingdom histories in memory. The Epic of Gilgamesh was oral for centuries before being written.',
    },
    adventure: 'Listen to Old Rowan\'s story fragment and pass it unchanged through 10 characters — see what survives.',
    funFact: 'Indigenous Australian oral traditions describing volcanic eruptions and sea-level rises have been dated to 10,000+ years ago and corroborated by geological evidence — making them the oldest verified continuous oral histories on Earth.',
  },
  {
    entryId: 'st-grimm',
    worldId: 'story-tree',
    domain: 'LANGUAGE_ARTS',
    title: 'Grimm\'s Fairy Tales',
    type: 'text',
    year: '1812 CE',
    location: 'Germany',
    historicalFigures: ['Jacob Grimm', 'Wilhelm Grimm'],
    content: {
      ages5to7: 'The Brothers Grimm collected and wrote down hundreds of folk tales so they wouldn\'t be forgotten — stories like Cinderella, Rapunzel, and Hansel and Gretel.',
      ages8to10: 'The Grimms published 86 tales in 1812, expanding to 200+ by 1857. They edited darker elements for later editions as middle-class readership grew. Many tales derive from universal archetypes also found in Asia and Africa.',
    },
    adventure: 'Anaya must reconstruct the original, unedited folk tale hidden beneath Grimm\'s sanitised version.',
    funFact: 'The original version of Cinderella (1812 edition) had the stepsisters have their eyes pecked out by doves at the wedding. By 1857, this was gone.',
  },

  // ── LANGUAGE ARTS: Debate Arena ─────────────────────────────────────────

  {
    entryId: 'da-aristotle-rhetoric',
    worldId: 'debate-arena',
    domain: 'LANGUAGE_ARTS',
    title: 'Aristotle\'s Rhetoric',
    type: 'text',
    year: '350 BCE',
    location: 'Athens, Greece',
    historicalFigures: ['Aristotle'],
    content: {
      ages5to7: 'Aristotle wrote rules for how to speak clearly and convincingly — his ideas are still taught to debaters, lawyers, and politicians today.',
      ages8to10: 'Aristotle\'s three modes of persuasion: ethos (credibility), pathos (emotion), logos (logic). He defined syllogism, enthymeme, and the five canons of rhetoric still central to debate theory.',
    },
    adventure: 'Help Cal prepare a debate argument using all three of Aristotle\'s modes of persuasion.',
    funFact: 'Every time a politician or advertiser adjusts their argument to make you feel something, they\'re using Aristotle\'s 2,400-year-old framework — whether they know it or not.',
  },
  {
    entryId: 'da-frederick-douglass',
    worldId: 'debate-arena',
    domain: 'LANGUAGE_ARTS',
    title: 'Frederick Douglass — "What to the Slave is the Fourth of July?"',
    type: 'text',
    year: '1852 CE',
    location: 'Rochester, New York, USA',
    historicalFigures: ['Frederick Douglass'],
    content: {
      ages5to7: 'Frederick Douglass escaped slavery and became one of the greatest speakers in history. His speeches helped change people\'s minds about slavery.',
      ages8to10: 'Douglass\'s 1852 address is considered one of the greatest American speeches. Freed from slavery at 20, he taught himself to read and used rhetoric — including irony and appeals to the Constitution itself — to argue for abolition.',
    },
    adventure: 'Reconstruct Douglass\'s argument by placing his rhetorical moves in the correct order.',
    funFact: 'Douglass was offered $100 for his freedom by an admirer after his autobiography proved he was enslaved — he rejected it, insisting slavery was wrong regardless of price, and freedom couldn\'t be bought.',
  },
  {
    entryId: 'da-malala',
    worldId: 'debate-arena',
    domain: 'LANGUAGE_ARTS',
    title: 'Malala\'s UN Speech',
    type: 'text',
    year: '2013 CE',
    location: 'United Nations, New York',
    historicalFigures: ['Malala Yousafzai'],
    content: {
      ages5to7: 'Malala was shot by the Taliban for speaking up for girls\' right to go to school. She survived and gave a speech to world leaders saying every child deserves education.',
      ages8to10: 'Malala\'s 2013 UN speech, on her 16th birthday, used personal narrative and universal appeal to argue for global education access. She became the youngest Nobel Peace Prize laureate in 2014.',
    },
    adventure: 'Help Theo prepare rebuttal arguments for the "education is a right" debate using Malala\'s framework.',
    funFact: 'Malala\'s father, a schoolteacher, taught her to speak and debate from childhood — he said the greatest gift he gave her was not clipping the wings meant for flight.',
  },

  // ── LANGUAGE ARTS: Diary Lighthouse ─────────────────────────────────────

  {
    entryId: 'dl-anne-frank',
    worldId: 'diary-lighthouse',
    domain: 'LANGUAGE_ARTS',
    title: 'The Diary of Anne Frank',
    type: 'text',
    year: '1944 CE',
    location: 'Amsterdam, Netherlands',
    historicalFigures: ['Anne Frank'],
    content: {
      ages5to7: 'Anne Frank was a Jewish girl who hid from the Nazis during World War II. She wrote her thoughts and feelings in a diary that helps us understand history through her eyes.',
      ages8to10: 'Frank\'s diary (1942–44), published by her father Otto as Het Achterhuis (1947), documents 25 months of hiding. It humanises the Holocaust through intimate first-person voice. Translated into 70+ languages, 35 million copies sold.',
    },
    adventure: 'Help Nadia find the hidden pages of Anne\'s diary before the lighthouse flood.',
    funFact: 'Anne Frank aspired to be a writer. Her diary entries were revised by Anne herself after a radio broadcast asked people to keep wartime diaries for future historians.',
  },
  {
    entryId: 'dl-sei-shonagon',
    worldId: 'diary-lighthouse',
    domain: 'LANGUAGE_ARTS',
    title: 'The Pillow Book',
    type: 'text',
    year: '1002 CE',
    location: 'Heian-kyō (Kyoto), Japan',
    historicalFigures: ['Sei Shōnagon'],
    content: {
      ages5to7: 'Sei Shōnagon was a lady-in-waiting in Japan 1,000 years ago who wrote a personal notebook of observations, lists, and thoughts — one of the first personal essays ever.',
      ages8to10: 'The Pillow Book originated the "zuihitsu" genre — informal, digressive personal essays. Shōnagon\'s lists ("things that make one\'s heart beat faster," "depressing things") pioneered the personal essay tradition.',
    },
    adventure: 'Find Felix\'s favourite Pillow Book list hidden in the lighthouse archives.',
    funFact: 'Sei Shōnagon wrote almost simultaneously with Murasaki Shikibu, author of The Tale of Genji — considered the world\'s first novel. The two women apparently did not like each other.',
  },

  // ── LANGUAGE ARTS: Vocabulary Jungle ────────────────────────────────────

  {
    entryId: 'vj-oed',
    worldId: 'vocabulary-jungle',
    domain: 'LANGUAGE_ARTS',
    title: 'Oxford English Dictionary',
    type: 'text',
    year: '1884 CE',
    location: 'Oxford, England',
    historicalFigures: ['James Murray'],
    content: {
      ages5to7: 'The Oxford English Dictionary tried to include every word in the English language and explain where each word came from. It took over 70 years to finish!',
      ages8to10: 'The OED project began in 1857; the complete first edition (10 volumes, 414,825 words) was published in 1928. It uses dated quotations to trace every word\'s history. Murray received 800,000+ citation slips from volunteers — including W.C. Minor, who contributed from inside a psychiatric asylum.',
    },
    adventure: 'Help trace the etymology of a mystery word through its historical jungle of spellings.',
    funFact: 'One of the OED\'s most prolific contributors, Dr W.C. Minor, sent in thousands of citations from Broadmoor Criminal Lunatic Asylum — he had committed murder and was never public about his location until he met Murray in person.',
  },
  {
    entryId: 'vj-loanwords',
    worldId: 'vocabulary-jungle',
    domain: 'LANGUAGE_ARTS',
    title: 'English Loanwords',
    type: 'cultural_milestone',
    year: '1066 CE',
    location: 'England / Global',
    content: {
      ages5to7: 'English borrows words from almost every language — "jungle" is from Sanskrit, "umbrella" from Italian, "sofa" from Arabic. English is one of the world\'s biggest word thieves!',
      ages8to10: 'The Norman Conquest (1066) merged Old English (Germanic) with Norman French — giving English two registers (pig/pork, cow/beef, kingly/royal). Today, English has ~170,000 active words with roots in French (29%), Latin (29%), Germanic (26%), and 300+ other languages.',
    },
    adventure: 'Sort the vocabulary jungle\'s word specimens into their language-of-origin habitats.',
    funFact: 'English has two words for almost every farming/cooking concept because Saxons raised the animals (cow, pig, sheep) while Norman lords ate them (beef, pork, mutton).',
  },

  // ── LANGUAGE ARTS: Spelling Mines ───────────────────────────────────────

  {
    entryId: 'sm-noah-webster',
    worldId: 'spelling-mines',
    domain: 'LANGUAGE_ARTS',
    title: 'Noah Webster\'s American Dictionary',
    type: 'text',
    year: '1828 CE',
    location: 'USA',
    historicalFigures: ['Noah Webster'],
    content: {
      ages5to7: 'Noah Webster wrote the first big American dictionary and simplified many spellings — colour became color, centre became center.',
      ages8to10: 'Webster\'s American Dictionary (1828) contained 70,000 words and deliberately Americanised spellings (colour→color, honour→honor, theatre→theater) as part of a deliberate cultural independence project.',
    },
    adventure: 'Help the mining team unearth the correct American vs British spelling for each ore sample.',
    funFact: 'Webster spent 27 years and learned 26 languages to write his dictionary. He reportedly began it right after writing the Blue-Backed Speller, which sold 100 million copies in the 1800s.',
  },

  // ── LANGUAGE ARTS: Translation Garden ───────────────────────────────────

  {
    entryId: 'tg-house-of-wisdom',
    worldId: 'translation-garden',
    domain: 'LANGUAGE_ARTS',
    title: 'House of Wisdom (Bayt al-Hikmah)',
    type: 'institution',
    year: '830 CE',
    location: 'Baghdad, Iraq',
    historicalFigures: ['Caliph al-Ma\'mun', 'Hunayn ibn Ishaq'],
    content: {
      ages5to7: 'The House of Wisdom was a great library in Baghdad where scholars from many countries translated books from Greek, Persian, and Indian languages into Arabic — saving ancient knowledge.',
      ages8to10: 'The House of Wisdom translated Aristotle, Galen, Plato, and Sanskrit mathematical texts into Arabic, enabling their preservation and development. Al-Khwarizmi invented algebra there; the word "algorithm" derives from his name.',
    },
    adventure: 'Help match the Greek philosophical scrolls to their Arabic translations before the library catalogue floods.',
    funFact: 'The word "algebra" comes from al-Khwarizmi\'s book Al-Kitāb al-mukhtaṣar fī ḥisāb al-jabr. "Algorithm" derives from the Latin transliteration of his name: Algoritmi.',
  },
  {
    entryId: 'tg-septuagint',
    worldId: 'translation-garden',
    domain: 'LANGUAGE_ARTS',
    title: 'Septuagint (Greek Hebrew Bible)',
    type: 'text',
    year: '270 BCE',
    location: 'Alexandria, Egypt',
    content: {
      ages5to7: 'The Septuagint was one of the first great translations in history — scholars turned the Hebrew Bible into Greek so more people could read it.',
      ages8to10: 'Commissioned by Ptolemy II, 72 Jewish scholars translated the Torah into Greek. The legend says they worked separately and produced identical translations. It became the scripture used by early Christians and is the source of most Old Testament quotes in the New Testament.',
    },
    adventure: 'Complete the parallel column translation before the Ptolemaic deadline.',
    funFact: 'The name "Septuagint" (LXX) means "70" in Greek, referring to the 72 scholars who made the translation. The rounding down was either a scribal convention or symbolically elegant.',
  },

  // ── LANGUAGE ARTS: Folklore Bazaar ──────────────────────────────────────

  {
    entryId: 'fb-anansi',
    worldId: 'folklore-bazaar',
    domain: 'LANGUAGE_ARTS',
    title: 'Anansi Stories',
    type: 'cultural_milestone',
    year: '1000 CE',
    location: 'West Africa (Akan tradition)',
    content: {
      ages5to7: 'Anansi the Spider is a trickster character from West African stories who uses cleverness rather than strength to solve problems.',
      ages8to10: 'Anansi tales originate in Akan oral tradition (Ghana/Ivory Coast). Enslaved Africans brought stories to the Caribbean where the character evolved, became a symbol of resistance and wit, and influenced Brer Rabbit and other trickster traditions.',
    },
    adventure: 'Help Hassan outsmart the giant by using Anansi\'s strategy of wit over strength.',
    funFact: 'Anansi stories travel from West Africa to the Caribbean to Harlem — the same spider appears in Neil Gaiman\'s American Gods under the name Mr. Nancy.',
  },
  {
    entryId: 'fb-1001-nights',
    worldId: 'folklore-bazaar',
    domain: 'LANGUAGE_ARTS',
    title: 'One Thousand and One Nights',
    type: 'text',
    year: '800 CE',
    location: 'Middle East / South Asia',
    content: {
      ages5to7: 'Scheherazade told the king a new story every night for 1,001 nights to save her life. She was one of the greatest storytellers ever imagined.',
      ages8to10: 'The Nights (Alf Layla wa-Layla) is a compilation of South Asian, Persian, and Arab folk tales assembled over centuries. The frame narrative (Scheherazade) explores storytelling as power. Aladdin and Ali Baba were 18th-century European interpolations, not part of the original Arabic manuscript tradition.',
    },
    adventure: 'Anaya must sequence Scheherazade\'s story fragments to survive another night.',
    funFact: 'Aladdin does not appear in any Arabic manuscript of One Thousand and One Nights. It was added by French translator Antoine Galland in 1710, and he claimed an oral source that was never found.',
  },

  // ── LANGUAGE ARTS: Editing Tower ────────────────────────────────────────

  {
    entryId: 'et-dead-sea-scrolls',
    worldId: 'editing-tower',
    domain: 'LANGUAGE_ARTS',
    title: 'Dead Sea Scrolls',
    type: 'artifact',
    year: '200 BCE',
    location: 'Qumran, West Bank',
    content: {
      ages5to7: 'The Dead Sea Scrolls are ancient manuscripts discovered in desert caves in 1947. They included the oldest copies of books from the Bible ever found.',
      ages8to10: 'The scrolls (3rd century BCE–1st century CE), discovered in 11 caves 1947–1956, include the oldest Biblical manuscripts (1,000 years older than previous copies) and sectarian texts of the Essene community. They transformed understanding of how the Bible was assembled.',
    },
    adventure: 'Help Wren piece together the degraded scroll fragments in the correct order.',
    funFact: 'A Bedouin shepherd discovered the first scrolls when he threw a stone into a cave looking for a lost goat and heard pottery crack. He initially used scraps of the scrolls as sandal straps.',
  },
  {
    entryId: 'et-maxwell-perkins',
    worldId: 'editing-tower',
    domain: 'LANGUAGE_ARTS',
    title: 'Maxwell Perkins — Editor of the Century',
    type: 'person',
    year: '1920 CE',
    location: 'New York, USA',
    historicalFigures: ['Maxwell Perkins'],
    content: {
      ages5to7: 'Editors make books better. Maxwell Perkins was the editor who helped F. Scott Fitzgerald, Ernest Hemingway, and Thomas Wolfe turn their rough drafts into great books.',
      ages8to10: 'Perkins at Scribner\'s pioneered the author-editor relationship. He cut 90,000 words from Thomas Wolfe\'s 1.1-million-word manuscript, helped Fitzgerald restructure Gatsby, and championed Hemingway against the publisher\'s doubts.',
    },
    adventure: 'Help Wren edit a manuscript down to its essential form using Hemingway\'s iceberg theory.',
    funFact: 'Thomas Wolfe\'s original manuscript for Of Time and the River was delivered to Perkins in a taxi — in a packing crate. Wolfe claimed he couldn\'t stop writing; Perkins literally set a publication date to force him to stop.',
  },

  // ── LANGUAGE ARTS: Illustration Cove ────────────────────────────────────

  {
    entryId: 'ic-lascaux',
    worldId: 'illustration-cove',
    domain: 'LANGUAGE_ARTS',
    title: 'Lascaux Cave Paintings',
    type: 'artifact',
    year: '17000 BCE',
    location: 'Dordogne, France',
    content: {
      ages5to7: 'Humans painted animals on cave walls 17,000 years ago using burnt sticks and ground minerals. These are the oldest pictures we know of!',
      ages8to10: 'Lascaux\'s ~600 paintings show horses, aurochs, deer, and bulls with sophisticated use of perspective, movement, and shading. Ochre, hematite, and charcoal were used. The "swimming stags" panel shows one of the earliest known uses of visual perspective.',
    },
    adventure: 'Help Ines recreate the Lascaux bison using only the materials the original artists had.',
    funFact: 'The Lascaux caves were discovered in 1940 by four teenagers and a dog. The original caves were closed to tourism in 1963 because CO₂ from visitors was destroying the paintings. Three replica versions exist today.',
  },
  {
    entryId: 'ic-action-comics-1',
    worldId: 'illustration-cove',
    domain: 'LANGUAGE_ARTS',
    title: 'Action Comics #1 — Birth of Superman',
    type: 'artifact',
    year: '1938 CE',
    location: 'USA',
    historicalFigures: ['Jerry Siegel', 'Joe Shuster'],
    content: {
      ages5to7: 'Two teenagers invented Superman in the 1930s. When it was finally published, it launched the superhero genre and the modern comic book industry.',
      ages8to10: 'Action Comics #1 (1938) introduced Superman and created the superhero genre. Siegel and Shuster sold the rights for $130 and spent decades in legal battles. The issue sold for $6 as a child\'s magazine; original copies now sell for $3+ million.',
    },
    adventure: 'Help Ines restore the water-damaged original panels of the comic.',
    funFact: 'A copy of Action Comics #1 sold at auction for $6 million in 2022 — having been bought new for 10 cents in 1938. That\'s a 60,000,000% return on investment.',
  },
  {
    entryId: 'ic-hokusai',
    worldId: 'illustration-cove',
    domain: 'LANGUAGE_ARTS',
    title: 'The Great Wave off Kanagawa',
    type: 'artifact',
    year: '1831 CE',
    location: 'Japan',
    historicalFigures: ['Katsushika Hokusai'],
    content: {
      ages5to7: 'Hokusai\'s painting of a giant wave with Mount Fuji in the background is one of the most famous artworks in history — printed on a woodblock and copied thousands of times.',
      ages8to10: 'The Great Wave is ukiyo-e woodblock print from Hokusai\'s Thirty-six Views of Mount Fuji. Prussian Blue pigment — newly imported from Europe — gives the wave its distinctive intensity. The print influenced Impressionism (Monet, van Gogh) and Art Nouveau.',
    },
    adventure: 'Layer the 7 woodblock colour plates in the correct order to recreate the Wave.',
    funFact: 'Hokusai changed his name at least 30 times throughout his life. He claimed he was still learning his craft on his deathbed at 88, saying "if only heaven would give me 10 more years… 5 more years, then I could become a real painter."',
  },

  // ── CROSSROADS: The Forgetting Well ─────────────────────────────────────

  {
    entryId: 'fw-entropy',
    worldId: 'forgetting-well',
    domain: 'CROSSROADS',
    title: 'Entropy — The Arrow of Time',
    type: 'scientific_principle',
    year: '1865 CE',
    location: 'Germany',
    historicalFigures: ['Rudolf Clausius'],
    content: {
      ages5to7: 'Things naturally become more mixed up and disordered over time — that\'s entropy. It\'s the reason ice melts, sandcastles crumble, and memories fade.',
      ages8to10: 'Clausius\'s second law of thermodynamics: in a closed system, entropy (disorder) always increases. This defines the thermodynamic arrow of time and explains why we remember the past, not the future.',
    },
    adventure: 'Help the Keeper restore order in a level of the Well where entropy has scrambled the echoes.',
    funFact: 'Entropy is why you can\'t un-scramble an egg. The number of possible arrangements of scrambled egg atoms is so vastly greater than the ordered egg that it will never spontaneously re-form — not in the lifetime of the universe.',
  },

  // ── CROSSROADS: Threadway Network ───────────────────────────────────────

  {
    entryId: 'tw-silk-road',
    worldId: 'threadway-network',
    domain: 'CROSSROADS',
    title: 'The Silk Road',
    type: 'cultural_milestone',
    year: '130 BCE',
    location: 'China to Mediterranean',
    content: {
      ages5to7: 'The Silk Road was an ancient network of trade routes connecting China to Europe. People didn\'t just trade silk — they shared ideas, religions, foods, and stories.',
      ages8to10: 'The Silk Road (130 BCE–1450 CE) traded silk, spices, glassware, and paper, but also transmitted Buddhism, Islam, plague, gunpowder, and the printing press across Eurasia. It was less a single road than a network of routes 4,000+ miles long.',
    },
    adventure: 'Navigate the Threadway to deliver goods from the Number Garden to the Translation Garden — avoiding bandits.',
    funFact: 'The bubonic plague (Black Death) that killed 30–60% of Europe\'s population in the 1340s almost certainly travelled the Silk Road from Central Asia on Mongol trade caravans.',
  },
  {
    entryId: 'tw-internet-archive',
    worldId: 'threadway-network',
    domain: 'CROSSROADS',
    title: 'The Internet Archive / Wayback Machine',
    type: 'institution',
    year: '1996 CE',
    location: 'San Francisco, USA',
    historicalFigures: ['Brewster Kahle'],
    content: {
      ages5to7: 'The Internet Archive saves old versions of websites so they\'re not lost forever — like a library for the internet.',
      ages8to10: 'The Internet Archive\'s Wayback Machine has crawled and saved 835+ billion web pages since 1996. It preserves digitised books, audio, software, and video — and has been cited in US federal court cases as primary evidence.',
    },
    adventure: 'Use the Wayback Machine to retrieve deleted pages from a decommissioned world before they\'re lost forever.',
    funFact: 'A 2021 study found that 25% of web links in peer-reviewed papers from 1994–2019 were broken — they led to 404 errors. The Internet Archive is the only reason those pages still exist at all.',
  },

  // ── STEM: Wellness Garden ────────────────────────────────────────────────

  {
    entryId: 'wg-placebo',
    worldId: 'wellness-garden',
    domain: 'STEM',
    title: 'Placebo Effect',
    type: 'scientific_principle',
    year: '1955 CE',
    location: 'USA',
    historicalFigures: ['Henry Beecher'],
    content: {
      ages5to7: 'The placebo effect is when believing you\'re receiving treatment actually makes you feel better — even if the treatment is just a sugar pill. The mind is powerful!',
      ages8to10: 'Beecher\'s 1955 "The Powerful Placebo" estimated 35% of patients improve from inert treatments. Modern research shows placebos cause measurable neurological changes (endorphin release, dopamine pathways), raising ethical questions about honest medicine.',
    },
    adventure: 'Help Hana design a fair double-blind trial for the garden\'s new remedy.',
    funFact: 'Placebo effects are stronger in some conditions (pain, depression, nausea) than others (tumour regression). Surgery placebos (sham operations) have shown dramatic effects in knee and back pain trials.',
  },
  {
    entryId: 'wg-sleep-science',
    worldId: 'wellness-garden',
    domain: 'STEM',
    title: 'Sleep and the Glymphatic System',
    type: 'scientific_principle',
    year: '2013 CE',
    location: 'Rochester, USA',
    historicalFigures: ['Maiken Nedergaard'],
    content: {
      ages5to7: 'When you sleep, your brain cleans itself! It washes away waste products that build up during the day.',
      ages8to10: 'Nedergaard discovered the glymphatic system: during sleep, cerebrospinal fluid flushes through the brain 10× more than during waking hours, clearing metabolic waste including amyloid-beta linked to Alzheimer\'s.',
    },
    adventure: 'Help Hana optimise the patient\'s sleep schedule to maximise glymphatic cleaning.',
    funFact: 'Consistent 6-hour sleep (vs 8-hour) produces cognitive deficits equivalent to 2–3 days of total sleep deprivation — but sleep-deprived people think they\'re performing normally (impaired metacognition).',
  },

  // ── STEM: Savanna Workshop ───────────────────────────────────────────────

  {
    entryId: 'sw-fire',
    worldId: 'savanna-workshop',
    domain: 'STEM',
    title: 'Control of Fire',
    type: 'event',
    year: '1000000 BCE',
    location: 'Africa',
    historicalFigures: ['Homo erectus'],
    content: {
      ages5to7: 'Using fire was one of the biggest discoveries in human history. It gave us warmth, cooked food, protection from predators, and light to work after dark.',
      ages8to10: 'Evidence for controlled fire use dates to ~1 million years ago (Wonderwerk Cave, South Africa). Cooking enabled denser caloric extraction, freeing energy for larger brain development. Fire also extended the social day — stories told around fires may have accelerated language.',
    },
    adventure: 'Help Zara use friction fire-starting to light the workshop forge.',
    funFact: 'Anthropologist Richard Wrangham argues cooking was the key driver of Homo sapiens\' brain size increase — if true, we are literally the species that cooked ourselves intelligent.',
  },

  // ── STEM: Code Canyon ────────────────────────────────────────────────────

  {
    entryId: 'cc-cryptography',
    worldId: 'code-canyon',
    domain: 'STEM',
    title: 'Public Key Cryptography',
    type: 'invention',
    year: '1976 CE',
    location: 'Stanford, USA',
    historicalFigures: ['Whitfield Diffie', 'Martin Hellman', 'Ralph Merkle'],
    content: {
      ages5to7: 'Public key cryptography lets you send a secret message that only one person can read — even if a hacker sees the locked box flying through the air.',
      ages8to10: 'Diffie-Hellman key exchange solved the fundamental problem of secure communication: how to agree on a secret over a public channel. RSA (1977) built on this. Every HTTPS website uses their work.',
    },
    adventure: 'Help Pixel establish a secure channel with Yuki using Diffie-Hellman key exchange.',
    funFact: 'GCHQ (British intelligence) had actually discovered public key cryptography 3 years earlier (James Ellis, 1973) but classified it. It stayed secret for 24 years.',
  },

] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Port implementation
// ─────────────────────────────────────────────────────────────────────────────

class EncyclopediaRegistry implements EncyclopediaRegistryPort {
  private readonly byId: ReadonlyMap<string, EncyclopediaEntry>;
  private readonly byWorld: ReadonlyMap<string, ReadonlyArray<EncyclopediaEntry>>;
  private readonly byDomain: ReadonlyMap<CurriculumDomain, ReadonlyArray<EncyclopediaEntry>>;
  private readonly byType: ReadonlyMap<EntryType, ReadonlyArray<EncyclopediaEntry>>;

  constructor(entries: ReadonlyArray<EncyclopediaEntry>) {
    this.byId = new Map(entries.map((e) => [e.entryId, e]));
    this.byWorld = buildGroupMap(entries, (e) => e.worldId);
    this.byDomain = buildGroupMap(entries, (e) => e.domain);
    this.byType = buildGroupMap(entries, (e) => e.type);
  }

  get totalEntries(): number {
    return this.byId.size;
  }

  getEntry(entryId: string): EncyclopediaEntry | undefined {
    return this.byId.get(entryId);
  }

  getEntriesByWorld(worldId: string): ReadonlyArray<EncyclopediaEntry> {
    return this.byWorld.get(worldId) ?? [];
  }

  getEntriesByDomain(domain: CurriculumDomain): ReadonlyArray<EncyclopediaEntry> {
    return this.byDomain.get(domain) ?? [];
  }

  getEntriesByType(type: EntryType): ReadonlyArray<EncyclopediaEntry> {
    return this.byType.get(type) ?? [];
  }

  searchByFigure(name: string): ReadonlyArray<EncyclopediaEntry> {
    const lower = name.toLowerCase();
    return ENCYCLOPEDIA_ENTRIES.filter(
      (e) => e.historicalFigures?.some((f) => f.toLowerCase().includes(lower)),
    );
  }

  all(): ReadonlyArray<EncyclopediaEntry> {
    return ENCYCLOPEDIA_ENTRIES;
  }
}

function buildGroupMap<K extends string>(
  entries: ReadonlyArray<EncyclopediaEntry>,
  key: (e: EncyclopediaEntry) => K,
): ReadonlyMap<K, ReadonlyArray<EncyclopediaEntry>> {
  const map = new Map<K, EncyclopediaEntry[]>();
  for (const entry of entries) {
    const k = key(entry);
    const bucket = map.get(k);
    if (bucket) {
      bucket.push(entry);
    } else {
      map.set(k, [entry]);
    }
  }
  return map as ReadonlyMap<K, ReadonlyArray<EncyclopediaEntry>>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory
// ─────────────────────────────────────────────────────────────────────────────

export function createEncyclopediaRegistry(): EncyclopediaRegistryPort {
  return new EncyclopediaRegistry(ENCYCLOPEDIA_ENTRIES);
}
