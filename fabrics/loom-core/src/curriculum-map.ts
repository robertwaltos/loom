/**
 * curriculum-map.ts — Curriculum Deep Map from Bible v5 Part 12.
 *
 * Maps every world to academic standards:
 * - STEM: 15 worlds → NGSS + CCSS
 * - Language Arts: 10 worlds → CCSS
 * - Financial Literacy: 10 worlds → Jump$tart + C3
 * - Cross-Curricular Highlights: 8 high-value entries
 * - Age-Range Mapping: 3 bands (K-2, 3-5, 6-8)
 */

// ── Ports ────────────────────────────────────────────────────────

export interface CurriculumMapLogPort {
  readonly info: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
}

// ── Constants ────────────────────────────────────────────────────

export const TOTAL_STEM_WORLDS = 15;
export const TOTAL_LANGUAGE_ARTS_WORLDS = 10;
export const TOTAL_FINANCIAL_WORLDS = 10;
export const TOTAL_CROSS_CURRICULAR_HIGHLIGHTS = 8;

// ── Types ────────────────────────────────────────────────────────

export type CurriculumDomain = 'stem' | 'language-arts' | 'financial-literacy';
export type AgeLabel = 'ages-5-7' | 'ages-8-10' | 'ages-11-13';

export interface GradeMapping {
  readonly ageLabel: AgeLabel;
  readonly gradeRange: string;
  readonly commonCoreBand: string;
  readonly ngssGradeBand: string;
}

export interface STEMAlignment {
  readonly worldId: string;
  readonly worldName: string;
  readonly primaryNGSS: string;
  readonly secondaryStandards: string;
  readonly skillsDeveloped: string;
}

export interface LanguageArtsAlignment {
  readonly worldId: string;
  readonly worldName: string;
  readonly primaryCCSS: string;
  readonly secondaryStandards: string;
  readonly skillsDeveloped: string;
}

export interface FinancialLiteracyAlignment {
  readonly worldId: string;
  readonly worldName: string;
  readonly primaryStandards: string;
  readonly framework: string;
  readonly skillsDeveloped: string;
}

export interface CrossCurricularHighlight {
  readonly entryName: string;
  readonly worldId: string;
  readonly stemStandard: string;
  readonly languageArtsStandard: string;
  readonly socialStudiesStandard: string;
}

// ── Age-Range Mapping ────────────────────────────────────────────

const GRADE_MAPPINGS: ReadonlyArray<GradeMapping> = [
  { ageLabel: 'ages-5-7', gradeRange: 'Kindergarten — Grade 2', commonCoreBand: 'K–2', ngssGradeBand: 'K–2' },
  { ageLabel: 'ages-8-10', gradeRange: 'Grades 3–5', commonCoreBand: '3–5', ngssGradeBand: '3–5' },
  { ageLabel: 'ages-11-13', gradeRange: 'Grades 6–8', commonCoreBand: '6–8', ngssGradeBand: '6–8' },
];

// ── STEM Alignment ───────────────────────────────────────────────

const STEM_ALIGNMENTS: ReadonlyArray<STEMAlignment> = [
  { worldId: 'cloud-kingdom', worldName: 'Cloud Kingdom', primaryNGSS: 'ESS2.D (Weather & Climate), ESS3.D (Global Climate Change)', secondaryStandards: 'CCSS.ELA-Literacy.RST.6-8.7', skillsDeveloped: 'Data analysis, pattern recognition, scientific argument' },
  { worldId: 'meadow-lab', worldName: 'Meadow Lab', primaryNGSS: 'LS1.B (Growth & Development), LS2.A (Interdependent Relationships), LS4.D (Biodiversity)', secondaryStandards: 'CCSS.ELA-Literacy.RST.3-5.1', skillsDeveloped: 'Experimental design, cause-effect reasoning, environmental literacy' },
  { worldId: 'calculation-caves', worldName: 'Calculation Caves', primaryNGSS: 'MP.1–8 (Mathematical Practices), 4.NBT, 6.NS, 8.EE', secondaryStandards: 'CCSS.MATH.6.EE.A', skillsDeveloped: 'Algebraic thinking, number sense, mathematical argumentation' },
  { worldId: 'magnet-hills', worldName: 'Magnet Hills', primaryNGSS: 'PS2.A (Forces & Motion), PS3.A (Definitions of Energy), ESS1.B (Earth & Solar System)', secondaryStandards: 'CCSS.ELA-Literacy.RST.6-8.3', skillsDeveloped: 'Quantitative reasoning, model-based explanation, scientific history' },
  { worldId: 'starfall-observatory', worldName: 'Starfall Observatory', primaryNGSS: 'ESS1.A (Universe Scale), ESS1.B, PS2.B (Types of Interactions)', secondaryStandards: 'CCSS.MATH.8.G', skillsDeveloped: 'Scale and proportion, systems thinking, inference from indirect evidence' },
  { worldId: 'circuit-marsh', worldName: 'Circuit Marsh', primaryNGSS: 'PS3.B (Conservation of Energy), PS3.D (Energy in Processes), ETS1.A (Engineering Problems)', secondaryStandards: 'CCSS.ELA-Literacy.RST.6-8.7', skillsDeveloped: 'Engineering design, cost-benefit analysis, social history of technology' },
  { worldId: 'code-canyon', worldName: 'Code Canyon', primaryNGSS: 'CS K-12 CSTA Standards 2-AP-10 through 2-AP-19', secondaryStandards: 'CCSS.ELA-Literacy.W.6-8.2', skillsDeveloped: 'Algorithmic thinking, debugging, ethical reasoning in design' },
  { worldId: 'body-atlas', worldName: 'Body Atlas', primaryNGSS: 'LS1.A (Structure & Function), LS1.B, LS1.D (Information Processing)', secondaryStandards: 'CCSS.ELA-Literacy.RST.6-8.1', skillsDeveloped: 'Evidence evaluation, historical science literacy, systems biology' },
  { worldId: 'frost-peaks', worldName: 'Frost Peaks', primaryNGSS: 'ESS1.C (History of Earth), ESS2.A (Earth Materials), ESS2.B (Plate Tectonics)', secondaryStandards: 'CCSS.ELA-Literacy.RST.6-8.2', skillsDeveloped: 'Time-scale reasoning, stratigraphic interpretation, climate literacy' },
  { worldId: 'greenhouse-spiral', worldName: 'Greenhouse Spiral', primaryNGSS: 'PS1.A (Structure of Matter), PS1.B (Chemical Reactions)', secondaryStandards: 'CCSS.ELA-Literacy.RST.6-8.8', skillsDeveloped: 'Chemical reasoning, lab safety, history of scientific error' },
  { worldId: 'data-stream', worldName: 'Data Stream', primaryNGSS: 'CCSS.MATH.SP (Statistics & Probability), 6.SP.A, 6.SP.B', secondaryStandards: 'C3 Framework D2.His.5.3-5', skillsDeveloped: 'Data literacy, statistical reasoning, media literacy, source evaluation' },
  { worldId: 'map-room', worldName: 'Map Room', primaryNGSS: 'CCSS.MATH.6.G, 6.NS.C', secondaryStandards: 'C3 Framework D2.Geo.1-12', skillsDeveloped: 'Spatial reasoning, projection literacy, geopolitical awareness' },
  { worldId: 'number-garden', worldName: 'Number Garden', primaryNGSS: 'CCSS.MATH.OA, NBT, G (all grades)', secondaryStandards: 'CCSS.MATH.MP.1–8', skillsDeveloped: 'Number sense, pattern recognition, algebraic reasoning, proof reasoning' },
  { worldId: 'savanna-workshop', worldName: 'Savanna Workshop', primaryNGSS: 'ETS1.A, ETS1.B (Developing Solutions), ETS1.C (Optimizing Design)', secondaryStandards: 'CCSS.ELA-Literacy.W.4.2', skillsDeveloped: 'Engineering design cycle, iterative improvement, material science' },
  { worldId: 'tideline-bay', worldName: 'Tideline Bay', primaryNGSS: 'LS2.B (Cycles of Matter), LS4.C (Adaptation), ESS3.C (Human Impacts)', secondaryStandards: 'CCSS.ELA-Literacy.RST.3-5.1', skillsDeveloped: 'Ecological thinking, environmental stewardship, scientific observation' },
];

// ── Language Arts Alignment ──────────────────────────────────────

const LANGUAGE_ARTS_ALIGNMENTS: ReadonlyArray<LanguageArtsAlignment> = [
  { worldId: 'story-tree', worldName: 'Story Tree', primaryCCSS: 'CCSS.ELA-Literacy.RL.3-8 (Key Ideas, Craft & Structure)', secondaryStandards: 'CCSS.ELA-Literacy.W.3.3', skillsDeveloped: 'Narrative analysis, theme identification, cross-cultural story comparison' },
  { worldId: 'reading-reef', worldName: 'Reading Reef', primaryCCSS: 'CCSS.ELA-Literacy.RL.1-5.1–10 (Reading Literature)', secondaryStandards: 'CCSS.ELA-Literacy.RF.1-5', skillsDeveloped: 'Decoding, comprehension, vocabulary in context, fluency' },
  { worldId: 'rhyme-docks', worldName: 'Rhyme Docks', primaryCCSS: 'CCSS.ELA-Literacy.RL.4-6.5 (Craft & Structure: Poetry)', secondaryStandards: 'CCSS.ELA-Literacy.W.3-5.3', skillsDeveloped: 'Poetic form analysis, oral tradition, figurative language, performance' },
  { worldId: 'letter-forge', worldName: 'Letter Forge', primaryCCSS: 'CCSS.ELA-Literacy.L.2-5.2 (Conventions of English)', secondaryStandards: 'CCSS.ELA-Literacy.RF.1-3', skillsDeveloped: 'Phonics, spelling patterns, language history, etymology' },
  { worldId: 'grammar-bridge', worldName: 'Grammar Bridge', primaryCCSS: 'CCSS.ELA-Literacy.L.1-8.1–3 (Language Conventions)', secondaryStandards: 'CCSS.ELA-Literacy.L.6-8.3', skillsDeveloped: 'Sentence structure, grammatical reasoning, language precision' },
  { worldId: 'debate-arena', worldName: 'Debate Arena', primaryCCSS: 'CCSS.ELA-Literacy.SL.6-8.3–4 (Speaking & Listening)', secondaryStandards: 'CCSS.ELA-Literacy.W.6-8.1', skillsDeveloped: 'Argumentative reasoning, claim-evidence-warrant, civil discourse' },
  { worldId: 'nonfiction-fleet', worldName: 'Nonfiction Fleet', primaryCCSS: 'CCSS.ELA-Literacy.RI.3-8.1–10 (Reading Informational)', secondaryStandards: 'CCSS.ELA-Literacy.W.3-8.7', skillsDeveloped: 'Research skills, primary source evaluation, expository writing' },
  { worldId: 'diary-lighthouse', worldName: 'Diary Lighthouse', primaryCCSS: 'CCSS.ELA-Literacy.W.3-5.3 (Narrative Writing)', secondaryStandards: 'CCSS.ELA-Literacy.L.3-5.1', skillsDeveloped: 'Personal narrative, voice development, reflective writing' },
  { worldId: 'folklore-bazaar', worldName: 'Folklore Bazaar', primaryCCSS: 'CCSS.ELA-Literacy.RL.3-5.9 (Compare Texts)', secondaryStandards: 'C3.D2.His.1.3-5', skillsDeveloped: 'Cultural literacy, oral tradition analysis, cross-cultural comparison' },
  { worldId: 'vocabulary-jungle', worldName: 'Vocabulary Jungle', primaryCCSS: 'CCSS.ELA-Literacy.L.3-8.4–6 (Vocabulary Acquisition)', secondaryStandards: 'CCSS.ELA-Literacy.RL.4.4', skillsDeveloped: 'Word roots, contextual meaning, semantic precision' },
];

// ── Financial Literacy Alignment ─────────────────────────────────

const FINANCIAL_ALIGNMENTS: ReadonlyArray<FinancialLiteracyAlignment> = [
  { worldId: 'market-square', worldName: 'Market Square', primaryStandards: 'Jump$tart Coalition K-12 Standards — Spending 1-4', framework: 'C3 D2.Eco.1-14', skillsDeveloped: 'Supply/demand, market function, consumer decision-making' },
  { worldId: 'budget-kitchen', worldName: 'Budget Kitchen', primaryStandards: 'Jump$tart Coalition — Spending, Saving 1-4', framework: 'CCSS.MATH.6.RP.A', skillsDeveloped: 'Budget planning, trade-off analysis, needs vs. wants' },
  { worldId: 'investment-greenhouse', worldName: 'Investment Greenhouse', primaryStandards: 'Jump$tart Coalition — Saving & Investing 1-4', framework: 'CCSS.MATH.6.EE', skillsDeveloped: 'Compound interest, risk/reward, long-term thinking' },
  { worldId: 'savings-vault', worldName: 'Savings Vault', primaryStandards: 'Jump$tart Coalition — Saving & Investing 1-3', framework: 'CCSS.MATH.5.NBT', skillsDeveloped: 'Goal-setting, delayed gratification, interest calculation' },
  { worldId: 'entrepreneurs-workshop', worldName: "Entrepreneur's Workshop", primaryStandards: 'Jump$tart Coalition — Earning 1-4', framework: 'C3 D2.Eco.8-9', skillsDeveloped: 'Business planning, profit/loss, innovation and risk' },
  { worldId: 'debt-glacier', worldName: 'Debt Glacier', primaryStandards: 'Jump$tart Coalition — Borrowing 1-4', framework: 'CCSS.MATH.7.RP', skillsDeveloped: 'Interest rates, compound debt, credit management' },
  { worldId: 'tax-office', worldName: 'Tax Office', primaryStandards: 'Jump$tart Coalition — Financial Decision Making 1-4', framework: 'C3 D2.Civ.1-12', skillsDeveloped: 'Public goods, civic finance, government resource allocation' },
  { worldId: 'barter-docks', worldName: 'Barter Docks', primaryStandards: 'C3 D2.Eco.1, D2.His.1-5', framework: 'CCSS.ELA-Literacy.RI.3.3', skillsDeveloped: 'History of exchange, currency development, bartering systems' },
  { worldId: 'job-fair', worldName: 'Job Fair', primaryStandards: 'Jump$tart Coalition — Earning 1-3', framework: 'C3 D2.Eco.10-12', skillsDeveloped: 'Career awareness, earning mechanisms, human capital' },
  { worldId: 'charity-harbor', worldName: 'Charity Harbor', primaryStandards: 'Jump$tart Coalition — Financial Decision Making 4', framework: 'C3 D2.Civ.7-8', skillsDeveloped: 'Philanthropy, community economics, impact assessment' },
];

// ── Cross-Curricular Highlights ──────────────────────────────────

const CROSS_CURRICULAR_HIGHLIGHTS: ReadonlyArray<CrossCurricularHighlight> = [
  { entryName: "Florence Nightingale's Rose Chart", worldId: 'data-stream', stemStandard: 'NGSS SP4 (Data Analysis)', languageArtsStandard: 'CCSS.ELA RI.5.7', socialStudiesStandard: 'C3 D2.His.5 / Statistics literacy' },
  { entryName: 'Muhammad Yunus and Microfinance', worldId: 'budget-kitchen', stemStandard: '—', languageArtsStandard: 'CCSS.ELA RL.6.6', socialStudiesStandard: 'Jump$tart Earning 4, C3 D2.Eco.8' },
  { entryName: 'The Columbian Exchange', worldId: 'meadow-lab', stemStandard: 'LS4.D, ESS3.C', languageArtsStandard: 'CCSS.ELA RI.6.9', socialStudiesStandard: 'C3 D2.His.1, D2.Geo.5' },
  { entryName: 'Rosalind Franklin and DNA', worldId: 'body-atlas', stemStandard: 'LS3.A, LS3.B', languageArtsStandard: 'CCSS.ELA RI.7.6', socialStudiesStandard: 'C3 D2.His.5 (sourcing, bias)' },
  { entryName: 'Wangari Maathai', worldId: 'meadow-lab', stemStandard: 'ESS3.C, LS4.D', languageArtsStandard: 'CCSS.ELA RI.5.3', socialStudiesStandard: 'C3 D2.Civ.2, D2.Geo.2' },
  { entryName: 'Al-Khwarizmi and Algebra', worldId: 'calculation-caves', stemStandard: 'CCSS.MATH.6.EE', languageArtsStandard: 'CCSS.ELA RI.5.3', socialStudiesStandard: 'C3 D2.His.2 (contributions of Islamic scholars)' },
  { entryName: 'GPS and Democratisation', worldId: 'map-room', stemStandard: 'CCSS.MATH 6.G', languageArtsStandard: 'CCSS.ELA RI.6.3', socialStudiesStandard: 'C3 D2.Geo.1, D2.Civ.1' },
  { entryName: 'Lewis Latimer and the Filament', worldId: 'circuit-marsh', stemStandard: 'ETS1.B', languageArtsStandard: 'CCSS.ELA RI.5.6', socialStudiesStandard: 'C3 D2.His.2 (inclusivity in historical record)' },
];

// ── Port ─────────────────────────────────────────────────────────

export interface CurriculumMapPort {
  readonly getSTEMAlignments: () => ReadonlyArray<STEMAlignment>;
  readonly getLanguageArtsAlignments: () => ReadonlyArray<LanguageArtsAlignment>;
  readonly getFinancialAlignments: () => ReadonlyArray<FinancialLiteracyAlignment>;
  readonly getCrossCurricularHighlights: () => ReadonlyArray<CrossCurricularHighlight>;
  readonly getGradeMappings: () => ReadonlyArray<GradeMapping>;
  readonly getAlignmentByWorld: (worldId: string) => STEMAlignment | LanguageArtsAlignment | FinancialLiteracyAlignment | undefined;
  readonly getWorldsByStandard: (standardFragment: string) => ReadonlyArray<string>;
  readonly getDomain: (worldId: string) => CurriculumDomain | undefined;
}

// ── Implementation ───────────────────────────────────────────────

function getAlignmentByWorld(worldId: string): STEMAlignment | LanguageArtsAlignment | FinancialLiteracyAlignment | undefined {
  const stem = STEM_ALIGNMENTS.find(a => a.worldId === worldId);
  if (stem) return stem;
  const la = LANGUAGE_ARTS_ALIGNMENTS.find(a => a.worldId === worldId);
  if (la) return la;
  return FINANCIAL_ALIGNMENTS.find(a => a.worldId === worldId);
}

function getWorldsByStandard(standardFragment: string): ReadonlyArray<string> {
  const lower = standardFragment.toLowerCase();
  const worldIds: string[] = [];

  for (const a of STEM_ALIGNMENTS) {
    if (a.primaryNGSS.toLowerCase().includes(lower) || a.secondaryStandards.toLowerCase().includes(lower)) {
      worldIds.push(a.worldId);
    }
  }
  for (const a of LANGUAGE_ARTS_ALIGNMENTS) {
    if (a.primaryCCSS.toLowerCase().includes(lower) || a.secondaryStandards.toLowerCase().includes(lower)) {
      worldIds.push(a.worldId);
    }
  }
  for (const a of FINANCIAL_ALIGNMENTS) {
    if (a.primaryStandards.toLowerCase().includes(lower) || a.framework.toLowerCase().includes(lower)) {
      worldIds.push(a.worldId);
    }
  }

  return worldIds;
}

function getDomain(worldId: string): CurriculumDomain | undefined {
  if (STEM_ALIGNMENTS.some(a => a.worldId === worldId)) return 'stem';
  if (LANGUAGE_ARTS_ALIGNMENTS.some(a => a.worldId === worldId)) return 'language-arts';
  if (FINANCIAL_ALIGNMENTS.some(a => a.worldId === worldId)) return 'financial-literacy';
  return undefined;
}

// ── Factory ──────────────────────────────────────────────────────

export function createCurriculumMap(): CurriculumMapPort {
  return {
    getSTEMAlignments: () => STEM_ALIGNMENTS,
    getLanguageArtsAlignments: () => LANGUAGE_ARTS_ALIGNMENTS,
    getFinancialAlignments: () => FINANCIAL_ALIGNMENTS,
    getCrossCurricularHighlights: () => CROSS_CURRICULAR_HIGHLIGHTS,
    getGradeMappings: () => GRADE_MAPPINGS,
    getAlignmentByWorld,
    getWorldsByStandard,
    getDomain,
  };
}

// ── Engine Integration ───────────────────────────────────────────

export interface CurriculumMapEngine {
  readonly kind: 'curriculum-map';
  readonly curriculum: CurriculumMapPort;
}

export function createCurriculumMapEngine(
  deps: { readonly log: CurriculumMapLogPort },
): CurriculumMapEngine {
  const curriculum = createCurriculumMap();
  deps.log.info(
    {
      stem: STEM_ALIGNMENTS.length,
      languageArts: LANGUAGE_ARTS_ALIGNMENTS.length,
      financial: FINANCIAL_ALIGNMENTS.length,
      crossCurricular: CROSS_CURRICULAR_HIGHLIGHTS.length,
    },
    'Curriculum map initialized',
  );
  return { kind: 'curriculum-map', curriculum };
}
