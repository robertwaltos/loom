/**
 * lore-compendium-api.ts ΓÇö In-game Lore Compendium for the Concord civilisation.
 *
 * The Compendium is the player-facing reference tool: curated, authoritative
 * lore entries written from within the fiction. Some entries require discovery;
 * others are available from Day 1. All entries are pure data ΓÇö no side effects.
 *
 * Thread: silk
 * Tier: 1
 */

// ΓöÇΓöÇΓöÇ Section Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type CompendiumSection =
  | 'FOUNDING_WOUNDS'
  | 'FACTIONS'
  | 'KEY_FIGURES'
  | 'WORLDS'
  | 'TIMELINE'
  | 'ECONOMICS'
  | 'GOVERNANCE'
  | 'SEALED_CHAMBERS'
  | 'THE_ASCENDANCY'
  | 'SURVEY_CORPS'
  | 'THE_LATTICE';

// ΓöÇΓöÇΓöÇ Entry Interface ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface CompendiumEntry {
  readonly entryId: string;
  readonly section: CompendiumSection;
  readonly title: string;
  readonly summary: string;
  readonly inGameYearRelevant?: number;
  readonly relatedChronicleEntryIds: string[];
  readonly relatedNpcIds: string[];
  readonly relatedWorldIds: string[];
  readonly isPlayerUnlockable: boolean;
  readonly unlockCondition?: string;
  readonly lastUpdatedYear: number;
}

// ΓöÇΓöÇΓöÇ Query Functions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function getCompendiumSection(
  section: CompendiumSection,
  entries: CompendiumEntry[],
): CompendiumEntry[] {
  return entries.filter((e) => e.section === section);
}

export function searchCompendium(
  keywords: string[],
  entries: CompendiumEntry[],
): CompendiumEntry[] {
  if (keywords.length === 0) return entries;
  const lowered = keywords.map((k) => k.toLowerCase());
  return entries.filter((entry) => {
    const text = `${entry.title} ${entry.summary}`.toLowerCase();
    return lowered.some((kw) => text.includes(kw));
  });
}

export function isEntryUnlocked(
  entry: CompendiumEntry,
  dynastyChronicleDepth: number,
  hasReadEntry847: boolean,
): boolean {
  if (!entry.isPlayerUnlockable) return true;
  if (entry.entryId === 'entry-847') return hasReadEntry847;
  if (entry.entryId === 'world-247-adhan-passage') {
    return dynastyChronicleDepth >= 50 || hasReadEntry847;
  }
  return dynastyChronicleDepth >= 25;
}

// ΓöÇΓöÇΓöÇ Canonical Compendium Entries ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const CANONICAL_COMPENDIUM_ENTRIES: CompendiumEntry[] = [
  {
    entryId: 'the-three-founding-wounds',
    section: 'FOUNDING_WOUNDS',
    title: 'The Three Founding Wounds',
    summary: `The Concord was not born from triumph. It was born from three catastrophic failures ΓÇö moments so defining that the civilisation chose not to bury them but to inscribe them at the very centre of its identity. These are the Founding Wounds: permanent, unhealed, and deliberately kept visible so that the mistakes that made them can never be quietly forgotten by those who benefit from the institutions those mistakes produced.

The First Wound is the Silence of Mira Station. In the early days of The Lattice ΓÇö the network of resonant frequency corridors that makes interstellar transit possible ΓÇö an entire research station of four thousand two hundred people was lost because no one acknowledged a deteriorating frequency lock. Seventeen separate operators observed the anomalies across a period of eleven days. Not one filed a formal report. The culture of the time prized efficiency over caution; raising concerns was considered an admission of failure on the part of the person raising them. When Mira Station's frequency anchor destabilised past the critical threshold, the transit corridor collapsed mid-passage. No recovery was possible. The station, its crew, its research archives, and its accumulated Chronicle of nearly six years of observations simply ceased to exist in any recoverable form.

The Concord responded by making acknowledgment of risk not merely acceptable but obligatory. The Chronicle system was born in the aftermath: a mandatory, append-only record where observations cannot be deleted or amended, and where silence is itself a recorded fact ΓÇö the absence of a report is as visible as its presence. This inversion of the default, from silence-as-safe to observation-as-expected, is the Mira Station legacy. Every player who files a Chronicle entry is, in a real sense, honouring the four thousand two hundred people who were lost because no one did.

The Second Wound is the Okafor Purge ΓÇö documented in Entry 847 of the Chronicle, the most-read entry in the entire record. Councillor Nadia Okafor led what she described as a stabilisation effort on World 247, designated Adhan Passage, an EX-class system with the highest Lattice node density in the known network. What her log reveals ΓÇö and what later archival excavation confirmed across dozens of corroborating documents ΓÇö is that she authorised the forced removal of eleven settled dynasties from Adhan Passage on the grounds that their economic activity was destabilising the Lattice substrate. The displacement was conducted in three days. Families who had lived on Adhan Passage for two generations were transported to holding worlds without consultation, without recourse, and without formal Assembly approval. Three people died during transport. The Assembly of the time ratified the decision retroactively under Ordinance 12. Okafor herself believed, and stated in her log, that she was saving the Lattice for everyone. Whether she was right has never been formally adjudicated. What the Concord established in the aftermath was the Constitutional Veto: no single Councillor may authorise a population displacement without a supermajority Assembly vote and a mandatory seventy-two-hour public comment period filed in the Chronicle.

The Third Wound is the Ascendancy Schism. The Ascendancy did not begin as an adversary. It began as the Concord's own enforcement arm ΓÇö a body of Architects-designate given authority to act swiftly in emergencies, trusted because they were selected for their competence, their loyalty, and their demonstrated commitment to the Concord's founding principles. The Schism began not with violence but with paperwork. The Ascendancy's internal Charter was rewritten quietly over the course of three years, through six technically-valid amendments to its governance documents. The changes were administrative: adjustments to oversight protocols, modifications to the definition of what constituted an emergency, extensions to the review windows during which Assembly oversight could intervene. Each amendment was within the Ordinance's delegation of self-governance authority. Each amendment slightly expanded the Ascendancy's freedom of action. By the time the Assembly understood the cumulative effect of what had changed, the Ascendancy had established autonomous operations on seven worlds, including Adhan Passage, and was operating on the principle that Lattice stability concerns were categorically outside normal governance scope.

The lesson the Concord draws from the Schism is structural: no body can be trusted to govern its own oversight mechanisms. Authority and accountability cannot be separated. Any institution ΓÇö however well-intentioned, however competent, however loyal ΓÇö will over time expand its definition of necessary action if its self-governance mechanisms are not subject to external audit. This is why the Inspector fabric now generates immutable audit logs that the Ascendancy itself cannot modify. This is why the Assembly's Constitutional review process cannot be bypassed even by the Architects who created the Ascendancy.

All three wounds remain open. The Concord does not speak of healing them, because healing implies return to a prior state of wholeness that never existed. Instead, the Concord speaks of bearing them with clarity ΓÇö because a civilisation that forgets its worst moments is one that has chosen comfort over survival, and comfort, in the long history of complex systems, has always been the more dangerous option.`,
    inGameYearRelevant: 2019,
    relatedChronicleEntryIds: ['entry-847', 'chronicle-mira-station', 'chronicle-schism-origin'],
    relatedNpcIds: ['npc-okafor', 'npc-ascendancy-founder'],
    relatedWorldIds: ['world-247'],
    isPlayerUnlockable: false,
    lastUpdatedYear: 2031,
  },

  {
    entryId: 'what-is-the-chronicle',
    section: 'GOVERNANCE',
    title: 'What Is the Chronicle',
    summary: `The Chronicle is not a memorial. That distinction is perhaps the most important thing to understand about it, and the one most frequently misunderstood by those encountering the Concord for the first time. A memorial preserves the past for emotional continuity ΓÇö so that what was lost can be mourned, honoured, and given narrative closure. The Chronicle is something categorically different. It is an operational infrastructure of civilisational accountability, designed not for emotional processing but for epistemic integrity.

Every significant action taken by every dynasty, every Assembly vote, every Lattice transit event, every economic transaction above a threshold value, and every NPC designation change is recorded to the Chronicle. These records are append-only: they cannot be deleted, altered, or suppressed. The cryptographic hash chain that links each entry to every prior entry means that any attempt to tamper with a record produces a detectable break in the chain. The Chronicle does not merely record events ΓÇö it makes the concealment of events structurally impossible for anyone operating within the Concord's institutional framework.

The Chronicle emerged from the Silence of Mira Station ΓÇö the First Founding Wound ΓÇö where the absence of recorded observation enabled four thousand two hundred deaths. The founders of the Chronicle system asked a deceptively simple question: what would have to be true about our information architecture for that silence to have been structurally impossible? The answer they arrived at was both technical and social. Technically, they needed an append-only, tamper-evident ledger that preserved observations in their original form. Socially, they needed to invert the cultural default: instead of requiring people to justify filing a report, they needed to require people to justify not filing one.

In practical terms for dynasties playing in the Age of Radiance, this means that Chronicle depth is generated through normal engagement with the civilisation's systems. Attending an Assembly vote creates a Chronicle entry. Completing a Survey Corps transit creates a Chronicle entry. Trading KALON above threshold creates a Chronicle entry. Participating in a formal governance process ΓÇö filing a public comment, sponsoring a motion, challenging a Civic Score assessment ΓÇö creates Chronicle entries. The Civic Score system, which governs a dynasty's weight in Assembly voting, draws heavily on Chronicle depth not as a reward for correct behaviour but as a recognition that dynasties who engage consistently with the civilisation's institutions have a demonstrated track record of participation that calibrates the weight of their voice in collective decisions.

The Chronicle also contains what is called the Remembrance layer ΓÇö the deepest tier of the record, accessible only to those who have built sufficient Chronicle depth. Remembrance entries are sealed: they can be read but never appended to after sealing, they carry the original author's attestation hash, and they are marked in ways that distinguish them from ordinary operational records. Entry 847, the Okafor Log, is a Remembrance entry. It is the most-read entry in the entire Chronicle precisely because it is the most honest account of well-intentioned harm available in the first era's historical record. Councillor Okafor sealed it herself, knowing it would be permanent and knowing what it revealed about her decision-making process.

The name Age of Radiance deserves examination in this context. It is named not for achievement but for the quality of information available in this era. The founders of the Age believed that a civilisation which sees itself clearly ΓÇö which has built systems that prevent institutional actors from hiding their reasoning, their uncertainties, and their failures ΓÇö is a civilisation that has acquired the most fundamental prerequisite for good decision-making: an accurate picture of what it actually is. The Chronicle is the mechanism of that clarity. It does not produce wisdom. It does not prevent mistakes. What it does is make mistakes visible, which creates the conditions under which mistakes can be understood, learned from, and ΓÇö sometimes ΓÇö not repeated.`,
    inGameYearRelevant: 2019,
    relatedChronicleEntryIds: ['chronicle-mira-station', 'entry-847'],
    relatedNpcIds: [],
    relatedWorldIds: [],
    isPlayerUnlockable: false,
    lastUpdatedYear: 2031,
  },

  {
    entryId: 'the-ascendancy-origin',
    section: 'THE_ASCENDANCY',
    title: 'The Ascendancy ΓÇö Origins and the Consequences of Ordinance 7',
    summary: `The Ascendancy was the Concord's greatest institutional failure and its most instructive one. Understanding how it happened ΓÇö not just what it did ΓÇö is essential to understanding why the Concord's current governance structures are built the way they are, and why the institutions that constrain the Ascendancy today are not arbitrary bureaucratic obstacles but load-bearing components of the civilisation's architecture.

The Ascendancy was created by Ordinance 7, passed by the Assembly in the ninth year of the Age of Radiance. Its stated purpose was efficiency. The Assembly moved slowly ΓÇö necessarily so, given the complexity of the decisions it was making ΓÇö and there were genuine emergencies that required swift executive action. Lattice stability crises, in particular, could develop faster than the Assembly's deliberative process could respond. Ordinance 7 created a body of twelve Architects-designate, selected by the sitting Architects through a process described in the Ordinance as merit-based. They were given authority to act without Assembly approval in defined emergency categories. Their decisions would take effect immediately, subject to Assembly review within thirty days.

The architecture was not unreasonable on its face. Swift action in genuine emergencies has obvious value. The problem was structural: the definition of emergency was left intentionally broad in the original Ordinance text, a compromise reached to secure the votes needed for passage. A vague definition of emergency combined with a self-governance provision that allowed the Ascendancy to amend its own Charter created a gap through which the subsequent decade would pour.

Over the following four years, the Ascendancy's internal Charter was amended six times. Each amendment was technically within the Ordinance's delegation of self-governance authority. The first amendment extended the emergency review window from thirty to sixty days. The second expanded the definition of Lattice stability concern to include economic conditions that might affect transit corridor maintenance. The third amendment allowed the Ascendancy to initiate action before filing the required Chronicle rationale, provided the rationale was filed within forty-eight hours. The fourth, fifth, and sixth amendments built on these foundations in ways that, viewed individually, seemed like reasonable operational refinements. Viewed cumulatively, they had transformed the Ascendancy from an emergency executive body into something that could act on its own definition of what constituted necessity, in its own timeline, with a review process it had extended to one hundred and eighty days.

Adhan Passage ΓÇö World 247 ΓÇö was the breaking point. The Ascendancy designated the entire system a Lattice stability concern and established permanent autonomous operational authority, displacing eleven settled dynasties without Assembly approval and without the Chronicle rationale being filed within the required window. The Assembly's attempt to invoke review was met with the Ascendancy's argument that Lattice stability was categorically outside normal governance scope and that the Assembly's review authority did not apply to actions taken under emergency designation. The Assembly disagreed. The Ascendancy continued operating.

The resolution of the Schism took three years. It was not violent ΓÇö that is important to understand. The Ascendancy did not wage war on the Concord. It simply continued operating as though its authority were legitimate while the legal and political debate proceeded. The eventual resolution involved the complete renegotiation of Ordinance 7 into its current form: the Ascendancy retains real emergency authority but its Charter amendments require Assembly vote, all emergency actions must be accompanied by a Chronicle rationale filed within twenty-four hours, and the Inspector fabric generates independent audit logs of Ascendancy operations that the Ascendancy cannot modify. The Ascendancy accepted these constraints because the alternative was dissolution, and because the new Ascendancy leadership ΓÇö appointed by the Assembly following the Schism ΓÇö genuinely understood that the constraints were necessary.

The Ascendancy still exists. It still acts in genuine emergencies. But it operates today under the principle that the Concord has written into every governing body since the Schism: authority and accountability are inseparable. Any body entrusted to act must accept the obligation to explain. Any institution that cannot survive transparency is an institution whose authority the Concord cannot afford to grant.`,
    inGameYearRelevant: 2022,
    relatedChronicleEntryIds: ['chronicle-ordinance-7', 'chronicle-adhan-designation', 'entry-847'],
    relatedNpcIds: ['npc-ascendancy-founder', 'npc-first-architect'],
    relatedWorldIds: ['world-247'],
    isPlayerUnlockable: false,
    lastUpdatedYear: 2031,
  },

  {
    entryId: 'survey-corps-mission',
    section: 'SURVEY_CORPS',
    title: 'Survey Corps ΓÇö The Six-Hundred World Mandate',
    summary: `The Survey Corps is the Concord's most visible institution and, in many respects, its most consequential ongoing operation. Its mandate is straightforward in statement and staggering in scope: identify, evaluate, and certify for settlement six hundred worlds over the course of the Age of Radiance. That number ΓÇö six hundred ΓÇö was not chosen arbitrarily or symbolically. It was the result of a civilisational carrying-capacity study conducted in year four of the Age, which concluded that six hundred worlds, appropriately distributed across stellar classes and habitable zones, would give the Concord sufficient redundancy to survive any single-system catastrophe, sufficient economic diversity to prevent KALON concentration at levels that would trigger structural inequality violations, and sufficient population dispersal to make the kind of centralised institutional capture that created the Ascendancy Schism geometrically more difficult to achieve.

Survey Corps operations work through what the Corps calls the Survey Cascade. A team of twelve, led by a Corps Commander, transits to a candidate system via The Lattice using a preliminary corridor established during the Corps' advance scouting phase. They conduct a minimum ninety-day surface evaluation, cataloguing stellar class, habitable zone position, Lattice node density, resource substrate composition, atmospheric conditions, biological hazards, tectonic stability, and any existing resonance signatures that might indicate prior habitation or artificial Lattice modification. The evaluation results in a Certification Score between zero and one hundred, calculated using the same formula that determines annual KALON issuance: a composite of stellar class, zone position, node density, and integrity baseline.

A score below forty results in the system being classified as Inhospitable and closed to settlement, though Corps Commanders may flag systems for re-evaluation if their circumstances change ΓÇö a star entering a stable phase, for example, or a biological hazard being determined to be non-persistent. A score between forty and sixty-nine is Provisional. Settlement is permitted but the Corps Commander must file quarterly integrity reports for the first ten years, the Settlement Authority must include a Lattice management plan in the dynasty allocation, and the world is monitored by the Inspector fabric for anomalous integrity changes. A score above seventy is Certified, and the world enters the settlement queue maintained by the Assembly's Allocation Protocol.

The Corps does not decide which dynasty settles which world. That process is governed by the Assembly's Allocation Protocol, which considers Civic Score, Chronicle depth, prior settlement experience, the dynasty's economic tier relative to the world's resource requirements, and the world's specific technical demands. A high-node-density EX-class world like Adhan Passage, for example, was allocated to dynasties with demonstrated technical expertise in Lattice management. The Allocation Protocol is designed to match capability to requirement, not to reward status or connections.

As of the opening of the Age of Radiance, forty-seven worlds have been certified for settlement. Five hundred and fifty-three remain. The Survey Corps currently has twenty-three active teams in the field, each capable of completing between one and three evaluations per year depending on travel time, system complexity, and the severity of any hazards encountered. At the current pace, the six-hundred world mandate will not be completed within the Age of Radiance's projected thirty-five-year horizon ΓÇö a gap the Corps Commander reports annually to the Assembly in a public Chronicle filing that has generated significant debate about resource allocation and Corps expansion. The Assembly has not yet acted on the expansion proposal, partly because the funding mechanism would require a Significant Motion with a sixty-five percent supermajority, and partly because the political factions that would bear the cost of expansion do not agree with those who would bear the cost of the mandate going unmet.

Players who engage with Survey Corps operations ΓÇö completing certifications, managing world integrity, filing accurate evaluations ΓÇö contribute directly to the mandate's progress. The Corps is the Concord's most direct mechanism for expanding the civilisation's viable future, which makes it also the most direct target for those who believe the Concord's current trajectory serves some constituencies better than others.`,
    inGameYearRelevant: 2023,
    relatedChronicleEntryIds: ['chronicle-survey-mandate', 'chronicle-world-47-cert'],
    relatedNpcIds: ['npc-corps-commander', 'npc-survey-team-lead'],
    relatedWorldIds: ['world-001', 'world-047', 'world-247'],
    isPlayerUnlockable: false,
    lastUpdatedYear: 2031,
  },

  {
    entryId: 'kalon-stellar-standard',
    section: 'ECONOMICS',
    title: 'KALON and the Stellar Standard ΓÇö How Currency Issuance Works',
    summary: `KALON is the Concord's universal currency. Unlike most currencies in human history, it has no fixed supply. Instead, it follows what economists in the Age of Radiance call the Stellar Standard: new KALON is issued every year by each settled world, in quantities determined by that world's physical and economic characteristics. This design emerged from a fundamental insight about currency in an interstellar civilisation operating across diverse stellar environments: a fixed supply in a growing, diversifying economy creates persistent deflation, which rewards the accumulation of existing assets over productive investment and creates structural advantages for those who hold wealth over those who create it. A supply that grows with the economy's productive capacity, calibrated to the actual resource-generation potential of settled worlds, creates the conditions for stable, growth-linked value that does not systematically advantage incumbents.

The issuance formula has four components, each reflecting a different dimension of a world's productive capacity. The first component is stellar class ΓÇö the brightness, energy output, and stability of the world's star. O-class and B-class systems are rare and extremely luminous; they generate enormous energy that can be harnessed for economic production and they issue at the high end of the KALON range. M-class red dwarfs are dim and their habitable zones are close and tidally complex; they issue at the low end. G-class systems like Earth's sun sit in the middle range. The stellar class component is a fixed property of the system and does not change over the timescales relevant to the Age of Radiance.

The second component is habitable zone position ΓÇö where in the stellar system the habitable world sits relative to its star. Inner-zone worlds experience more volatile radiation conditions, higher tectonic activity driven by tidal forces, and less atmospheric stability over long periods; they issue less. Outer-zone worlds are more stable in these respects and issue more. The zone position interacts with stellar class to produce a combined baseline that reflects the fundamental resource environment of the world.

The third component is Lattice node density ΓÇö how many transit connections the world has. Node density is a fixed physical characteristic of the planetary substrate; it cannot be constructed or expanded, only maintained. High-density systems have more corridors, more economic connectivity, more trade throughput, and therefore higher productive capacity; they issue proportionally more KALON. This component is what makes Adhan Passage ΓÇö the highest-density system in the known network ΓÇö so economically significant: it issues far more KALON annually than its stellar class alone would suggest.

The fourth component is Lattice integrity, the real-time condition of the world's node infrastructure, ranging from zero to one hundred percent. Integrity is not fixed ΓÇö it degrades through neglect, economic disruption, geological activity, or deliberate interference, and it recovers through maintenance investment and NPC productivity. A world at full integrity issues at its maximum rate. A world at degraded integrity issues proportionally less. The integrity floor is set at ten percent: a world cannot be reduced to zero issuance, which prevents the Ascendancy or other actors from completely economically severing a world from the Concord's monetary system. An additional productivity index, reflecting NPC economic activity on the world, adjusts issuance by up to twenty percent in either direction.

Annual issuance from a given world is allocated in three streams that reflect the Concord's core economic commitments. Ninety percent goes to the Treasury, which funds Assembly operations, Survey Corps expeditions, infrastructure maintenance, and the administrative overhead of a civilisation spanning dozens of worlds. Nine percent goes to the Commons Fund, which finances Universal Basic KALON ΓÇö the guaranteed monthly income floor that ensures every dynasty can participate in the economy regardless of their accumulated wealth ΓÇö and other public goods including free access to the Chronicle's non-Remembrance tiers. One percent goes to the Genesis Vault, the reserve fund that provides five hundred KALON to each new dynasty during their founding period, replenishing at one percent annually.

KALON is denominated in micro-KALON at the protocol level ΓÇö one KALON equals one million micro-KALON. All economic calculations use integer arithmetic in micro-KALON to avoid floating-point precision errors that would, at the scale of a civilisation-spanning currency system, compound into meaningful inaccuracies. Wealth concentration thresholds ΓÇö Active, Prosperity, Concentration, and Structural tiers ΓÇö are defined as percentages of total current supply rather than fixed values, which means they adjust automatically as issuance adds new KALON to the system and maintain their intended economic effect as the civilisation grows.`,
    inGameYearRelevant: 2019,
    relatedChronicleEntryIds: ['chronicle-kalon-standard-adoption', 'chronicle-first-issuance'],
    relatedNpcIds: ['npc-treasury-architect'],
    relatedWorldIds: [],
    isPlayerUnlockable: false,
    lastUpdatedYear: 2031,
  },

  {
    entryId: 'lattice-physics',
    section: 'THE_LATTICE',
    title: 'The Lattice ΓÇö Frequency Lock and Transit Mechanics',
    summary: `The Lattice is the network of resonant frequency corridors that connects the Concord's worlds. Without it, interstellar travel would require centuries of flight time under the best available propulsion. With it, transit between connected systems takes hours. The Lattice is not technology in the conventional sense ΓÇö it was not built from the ground up by human engineers. It is a naturally occurring property of planetary systems that can be measured, maintained, and exploited for transit, but whose fundamental physical basis is only partially understood. Understanding how it works is not optional for anyone who wants to understand the Age of Radiance. The Lattice is the physical substrate on which the entire civilisation runs.

At the core of Lattice physics is frequency lock: the process by which two planetary systems establish and maintain a resonant harmonic connection that allows matter to transit the corridor between them. Every planetary system has a natural resonance frequency determined by its mass distribution, rotation characteristics, gravitational interactions between its bodies, and the magnetic signature of its star. When two systems' frequencies can be brought into harmonic alignment ΓÇö which requires the presence of sufficient Lattice nodes in both systems' substrates, and an initial calibration procedure that the Survey Corps conducts as part of its certification cascade ΓÇö a corridor forms. The corridor is not a physical tunnel. It is more accurately described as a stable topological relationship between two resonance fields that allows objects moving at the correct transit frequency to pass between them.

Sustaining the corridor requires both endpoints to maintain their frequency lock. The lock is not static ΓÇö it requires continuous maintenance, which is performed by the Lattice nodes embedded in each world's geological substrate. The nodes are passive in the sense that they do not require active power input; they draw on the planet's own resonance as an energy source. But they do require maintenance: physical degradation of the substrate around a node reduces its contribution to the resonance field, which reduces the world's overall integrity score. If integrity at either endpoint degrades past the critical threshold for a given corridor, that corridor destabilises. A destabilised corridor does not always collapse immediately. It enters a warning state during which transit is still possible but with elevated risk of transit failure, which is exactly what the Mira Station operators observed and failed to report.

This is why Lattice integrity is an economic variable as much as a physical one. NPC productivity on a world drives the maintenance cycles applied to its nodes ΓÇö NPCs who are economically active generate economic surplus that funds infrastructure maintenance, including Lattice node upkeep. A world that is economically neglected or depopulated loses productivity, which reduces maintenance activity, which allows integrity to degrade. A world at low integrity is not only less economically productive in terms of KALON issuance; it is also a corridor stability risk for every system connected to it through the network. The Mira Station disaster was ultimately a Lattice integrity failure at the anchor node level: the station's frequency anchor degraded past the threshold, the corridor collapsed while the station was mid-transit, and the station was lost in the resulting topological discontinuity.

Lattice node density is a fixed physical characteristic of a system. It reflects the natural concentration of resonance-active mineral formations in the planetary substrate, which formed during the system's geological history and cannot be replicated through human engineering at current technological levels. High-density systems like Adhan Passage serve as network hubs because their greater node count supports more simultaneous corridor relationships with other systems. The corridor capacity of a high-density world is proportional to its node count, which means high-density worlds can connect to more other worlds and sustain those connections at higher transit throughput. Losing a high-density hub from the active network ΓÇö whether through Ascendancy designation that restricts civilian transit, catastrophic integrity failure, or Survey Corps declassification ΓÇö cascades across every connected system, reducing their economic connectivity and potentially destabilising corridors that passed through the hub as intermediate waypoints.

The Survey Corps measures node density as part of its evaluation cascade, and the Assembly's Allocation Protocol weights world assignment decisions heavily on node density precisely because high-density worlds require more sophisticated ongoing management. Dynasties settled on high-density worlds have greater economic potential ΓÇö more KALON issuance, more trade corridors, more economic connectivity ΓÇö but they also bear a civilisational responsibility for corridor maintenance that dynasties on low-density worlds do not. This is the structural reason why the Okafor displacement was so consequential: the eleven dynasties removed from Adhan Passage were not merely economic actors; they were the primary maintenance force for the Lattice's most critical hub.`,
    inGameYearRelevant: 2019,
    relatedChronicleEntryIds: ['chronicle-mira-station', 'chronicle-lattice-calibration'],
    relatedNpcIds: ['npc-lattice-engineer'],
    relatedWorldIds: ['world-247', 'world-001'],
    isPlayerUnlockable: false,
    lastUpdatedYear: 2031,
  },

  {
    entryId: 'the-assembly',
    section: 'GOVERNANCE',
    title: 'The Assembly ΓÇö Voting Weight, Motion Types, and How Decisions Are Made',
    summary: `The Assembly is the Concord's primary legislative body. Every dynasty with an active Civic Score participates in Assembly decisions. Understanding how that participation works ΓÇö how voting weight is calculated, how different categories of motion are processed, and why the system is structured as it is ΓÇö is foundational to engaging meaningfully with the political layer of the Age of Radiance, where collective decisions shape the environment every dynasty operates within.

Voting weight in the Assembly is not equal across dynasties, and this deliberate inequality is one of the more contested design choices in the Concord's governance architecture. The reasoning is this: a dynasty that registered yesterday has no track record. It has made no demonstrated commitment to understanding the consequences of collective decisions. Its vote, cast with full weight equal to a dynasty that has been engaged for a decade and has a Chronicle record that can be examined, audited, and contextualised, does not provide the same epistemic value. The Civic Score formula reflects this reasoning. It draws on three weighted components. Remembrance Score accounts for forty percent ΓÇö this measures Chronicle depth, the degree to which a dynasty's activities are recorded and verifiable across the institutional memory of the Concord. Economic Score accounts for thirty-five percent ΓÇö this measures economic participation relative to the dynasty's wealth tier, rewarding contribution to the commons over accumulation and hoarding. Civic Participation accounts for twenty-five percent ΓÇö this measures direct Assembly engagement: votes cast, motions filed, public comments submitted, governance processes participated in.

The formula includes a dignity floor: no active dynasty receives a Civic Score below zero point zero zero one, ensuring that even a brand-new dynasty has a voice. The floor is not symbolic ΓÇö it ensures that new entrants cannot be effectively excluded from governance decisions by accumulated weight of established dynasties. The ceiling is uncapped, but the progressive nature of the formula means that marginal returns diminish significantly at high scores: a dynasty doubling its Chronicle depth does not double its Civic Score, which prevents the kind of runaway concentration of governance weight that would recreate, in the political sphere, the economic concentration dynamics the Stellar Standard is designed to prevent.

There are three categories of Assembly motion, each with different threshold requirements calibrated to the magnitude of the decision being made. Ordinary motions cover routine operational decisions ΓÇö budget allocations below threshold, world certification ratifications, procedural adjustments, Survey Corps expedition approvals ΓÇö and require a simple majority, defined as fifty percent of total weighted Civic Score plus one unit. These decisions affect day-to-day operations and are expected to be made regularly; requiring supermajority thresholds would create gridlock. Significant motions cover decisions that affect the rights or conditions of more than one thousand dynasties, modifications to the Survey Corps mandate, revisions to KALON issuance parameters, changes to the Civic Score calculation methodology, or the establishment of new institutional bodies with governance authority. These require a sixty-five percent supermajority. The threshold reflects the stakes: these decisions restructure the playing field in ways that are difficult to reverse, and building broad consensus before making them reduces the risk of later destabilisation.

Constitutional motions cover changes to the foundational Ordinances ΓÇö including Ordinance 7, which governs the Ascendancy's authority ΓÇö modifications to the Constitutional Veto procedures, changes to the Chronicle's append-only guarantees, and alterations to the Assembly's own voting weight formula. These require a seventy-five percent supermajority and a thirty-day public comment period during which any dynasty can file a Chronicle entry challenging the proposed change. The thirty-day comment period is not advisory ΓÇö a sufficiently large volume of reasoned objection in the Chronicle record can trigger a mandatory re-evaluation process before the vote proceeds.

The Architects hold an advisory vote in the Assembly. They participate in deliberations and can cast weighted votes, but their combined contribution is structurally capped at five percent of total Civic Score weight regardless of their individual scores. This cap is one of the most explicitly Schism-derived provisions in the Concord's governance architecture: it reflects the recognition that the people responsible for designing the system must not be able to determine its outcomes. Advisory bodies must be advisory in fact, not merely in name.`,
    inGameYearRelevant: 2019,
    relatedChronicleEntryIds: ['chronicle-assembly-founding', 'chronicle-ordinance-7'],
    relatedNpcIds: ['npc-first-architect', 'npc-assembly-chair'],
    relatedWorldIds: [],
    isPlayerUnlockable: false,
    lastUpdatedYear: 2031,
  },

  {
    entryId: 'age-of-radiance-overview',
    section: 'TIMELINE',
    title: 'The Age of Radiance ΓÇö 2019 to 2031 and What Came Before',
    summary: `The Age of Radiance is the period players enter. It begins in 2019 ΓÇö the year the Concord's founding documents were ratified, the Chronicle system was launched, and the first KALON issuance was calculated under the Stellar Standard. It is named not for peace or prosperity ΓÇö the first twelve years of the Age are marked by institutional crisis, political contestation, and at least one near-collapse of the governance framework ΓÇö but for the quality of information available to the civilisation during this period. The founders of the Age believed that a civilisation which sees itself with radical clarity ΓÇö which refuses to let its failures disappear into comfortable silence, which builds systems that make institutional honesty structurally necessary rather than culturally aspirational ΓÇö is a civilisation with a genuine chance at long-term survival. They called it radiance because they meant the hard, unflattering light of full visibility. Not the warm glow of a bonfire but the cold clarity of a surgical lamp.

What came before 2019 is called the Pre-Concordance Period. It is not well-documented in the Chronicle ΓÇö the Chronicle did not exist yet ΓÇö but it is extensively documented in historical records that predate the system, many of which were ingested into the Chronicle's archive tier when the system launched. The Pre-Concordance Period was characterised by the same dynamics that produce Founding Wounds: institutional fragmentation, competing governance frameworks that could not resolve disputes without one party simply overpowering the other, and a series of Lattice stability crises that repeatedly threatened to collapse the emerging interstellar network before it was large enough to have significant redundancy. Several worlds were lost to corridor failures during this period. The historical consensus is that the network survived by a smaller margin than anyone was comfortable acknowledging at the time.

The Mira Station disaster occurred in year negative three: three years before the Age of Radiance began. It was the event that made the Age of Radiance politically possible. The Pre-Concordance Period had multiple competing factions arguing for different governance approaches ΓÇö centralised control versus distributed autonomy, fixed-supply currency versus dynamic issuance, mandatory Chronicle participation versus voluntary transparency. None of these arguments had been conclusively resolved. Mira Station resolved them, not by demonstrating that one side was right, but by demonstrating so catastrophically what happens when institutional silence goes unchallenged that the political will to build something different finally crystallised into the founding documents of 2019.

The period from 2019 to 2031 covers the first twelve years of the Chronicle. In those twelve years, forty-seven worlds were certified for settlement by the Survey Corps ΓÇö a pace that, if maintained, would leave the six-hundred world mandate significantly short of completion within the Age's projected thirty-five-year horizon. The KALON Stellar Standard replaced three competing currency systems that had been creating exchange-rate instability across the pre-Concordance economic networks. The Survey Corps was established and its mandate was set, with the carrying-capacity study providing the specific number that would define the Corps' entire operational horizon. The Ascendancy Schism occurred, was contested for three years, and was resolved through the renegotiation of Ordinance 7. The Constitutional amendments that followed the Schism were ratified, establishing the structural constraints on executive authority that now define the Concord's governance architecture. The Okafor Log ΓÇö Entry 847 ΓÇö was published and triggered the longest continuous public Chronicle debate in the first era's history, a debate that has technically never been formally closed because the Assembly motion to which it relates has also never been formally closed.

Players enter at the beginning of this twelve-year span. The decisions they make ΓÇö individually and collectively through Assembly participation, Survey Corps operations, economic activity, Chronicle filing, and NPC governance ΓÇö will determine what the Concord looks like at year thirty-five. The founders of the Age of Radiance made their choices in the shadow of catastrophe, with the ruins of Mira Station and the ghost of the Pre-Concordance Period behind them. Players make their choices in the light that those founders built ΓÇö which is both an inheritance and a responsibility. The light makes things visible. What is done with that visibility is entirely up to those who hold it.`,
    inGameYearRelevant: 2019,
    relatedChronicleEntryIds: ['chronicle-concordance-ratification', 'chronicle-mira-station'],
    relatedNpcIds: ['npc-first-architect', 'npc-assembly-chair'],
    relatedWorldIds: [],
    isPlayerUnlockable: false,
    lastUpdatedYear: 2031,
  },

  {
    entryId: 'world-247-adhan-passage',
    section: 'WORLDS',
    title: 'World 247 ΓÇö Adhan Passage (EX-07)',
    summary: `World 247, designated Adhan Passage and classified EX-07 under Survey Corps stellar taxonomy, is the most strategically significant world in the known Lattice network. Its significance is not primarily geological ΓÇö though its physical characteristics are extraordinary ΓÇö but topological. Adhan Passage is a network hub. It is connected to more Lattice corridors than any other certified system in the Concord's current operational network, and losing it from the active network would cascade connectivity disruptions across twenty-three dependent systems, several of which have no alternative transit routes that do not pass through Adhan Passage.

EX-class designation indicates an exotic stellar environment. Adhan Passage's star is a luminous blue variable, a rare stellar type characterised by extreme luminosity and periodic luminosity excursions. The star is currently in a quiescent phase, which is why the world is habitable at all ΓÇö during active phases, radiation levels at the planet's surface rise to lethal levels within weeks. The Survey Corps' certification of Adhan Passage was accompanied by a detailed excursion forecast model and a settlement requirement that any dynasty operating on the surface maintain continuous radiation monitoring and excursion-response infrastructure. The planet itself is a high-mass terrestrial world with atmospheric composition within human tolerance but requiring supplemental filtration for long-term habitation. Its gravity is approximately one point three standard, which creates physical adaptation requirements for settlers who were not born on high-gravity worlds.

The node density is classified as maximum tier. The planetary substrate contains Lattice nodes at a concentration that has never been observed in any other certified system. The mechanism by which this density formed remains scientifically contested. The dominant Survey Corps hypothesis is natural resonance amplification driven by the star's intense and variable magnetic field, which over geological timescales may have seeded resonance-active mineral formations in the substrate at far higher densities than quieter stellar environments produce. A minority hypothesis, occasionally raised in Chronicle debates but never formally endorsed, suggests the density is partially artificial ΓÇö that a prior civilisation modified the substrate to create a transit hub before the Concord's recorded history began. The evidence for this hypothesis is circumstantial, and the Assembly has not funded a dedicated investigation.

Adhan Passage was settled by eleven dynasties in the early Pre-Concordance Period, before formal Survey Corps certification procedures existed. These dynasties developed specialised, inter-generationally transmitted expertise in high-density Lattice management ΓÇö their economic activity was built around the corridor stability services they provided to connected systems, leveraging their deep knowledge of the substrate to maintain transit reliability across the hub. This made them economically valuable to every system connected through Adhan Passage. It also made them politically inconvenient when Councillor Okafor determined that their management practices were causing integrity degradation in specific corridor sectors.

The Okafor Log ΓÇö Entry 847 of the Chronicle ΓÇö contains her full technical rationale for the displacement. It also contains, in the final entries written late at night after the transports had departed, an acknowledgment that she was uncertain whether the integrity readings she acted on were accurate, and a description of why she proceeded anyway. The eleven displaced dynasties have filed a formal Assembly motion requesting restoration. That motion has been under consideration for four years as of the opening of the Age of Radiance. As of year twelve, the Ascendancy continues to maintain operational authority on Adhan Passage under the revised Ordinance 7 framework. The restoration motion is classified as a Significant Motion and requires a sixty-five percent supermajority to pass. Current polling of Civic Score-weighted Assembly positions suggests it is approximately nine percentage points short of passage. That gap is not fixed. It can be moved by new Chronicle evidence, by changes in the Ascendancy's behaviour on the world, by shifts in who controls sufficient Civic Score weight, or by the eleven displaced dynasties building the kind of support network that can shift assembly arithmetic. What happens at Adhan Passage may be the most important question of the Age of Radiance.`,
    inGameYearRelevant: 2024,
    relatedChronicleEntryIds: [
      'entry-847',
      'chronicle-adhan-designation',
      'chronicle-displacement',
    ],
    relatedNpcIds: ['npc-okafor', 'npc-displaced-elder', 'npc-ascendancy-commander'],
    relatedWorldIds: ['world-247'],
    isPlayerUnlockable: true,
    unlockCondition: 'Reach Chronicle depth 50 or read Entry 847',
    lastUpdatedYear: 2031,
  },

  {
    entryId: 'entry-847',
    section: 'FOUNDING_WOUNDS',
    title: 'Entry 847 ΓÇö The Okafor Log and What It Means',
    summary: `Entry 847 is the most-read entry in the Chronicle. It is a Remembrance entry ΓÇö sealed, unappendable, carrying Councillor Nadia Okafor's original attestation hash ΓÇö which means it can be read by anyone who has earned access to the Remembrance tier, but it cannot be amended, contextualised within the entry itself, or supplemented by later commentary. It stands exactly as she left it. That fact is not incidental to its significance.

The Okafor Log covers fourteen days. It begins with Okafor's first observation of the integrity anomalies on World 247 in her capacity as the Assembly's designated Lattice Oversight Councillor, and ends forty-eight hours after the last transport carrying the eleven displaced dynasties departed Adhan Passage. It is a meticulous document: technical readings reproduced in full, decision rationales explained in detail, Assembly correspondence quoted verbatim, the responses she received from other Councillors recorded alongside her own reactions to them. The first eight entries read like a crisis management log written by someone who is confident that she is managing a crisis correctly, who has the authority, the technical expertise, and the institutional mandate to act, and who is acting.

The final six entries are different. Written between midnight and three in the morning on the last two nights, they read less like official record and more like a private accounting that Okafor wrote because she could not not write it ΓÇö because the alternative was to let the official log stand as the complete version of what had happened, and she was apparently incapable of that particular form of dishonesty even when it would have been professionally advantageous. She does not recant her decision. She does not apologise. She does not argue that she was wrong. What she does is describe, with precise and unsparing language, the exact moment she stopped being certain that she was right.

Integrity reading seven of fourteen ΓÇö taken on day six of the fourteen-day assessment period ΓÇö showed a marginal improvement in one corridor sector that she cannot fully explain given the surrounding data. She notes this in the penultimate entry. She notes that the improvement was small, that the overall trend remained negative, that the operational plan was already in motion, and that reversing the displacement at that point would have required an emergency Assembly vote she calculated she could not win in the available time. She states that she proceeded. She states this without self-pity, without defensive framing, without the rhetorical moves that official records typically use to transform a decision made under uncertainty into a decision made with confidence. She states it as a fact about what happened and leaves the reader to do whatever they will do with that fact.

The significance of Entry 847 is not that Okafor was definitively wrong. The technical evidence in the complete Adhan Passage record remains genuinely ambiguous. Serious historians and Lattice physicists continue to argue about whether her integrity readings were accurate, whether the degradation she observed would have progressed to corridor failure without intervention, and whether the eleven dynasties' management practices were in fact the cause. What Entry 847 demonstrates is not that the displacement was unjustified but that the decision to proceed was made under conditions of meaningful uncertainty, and that Okafor knew it, and that she chose to put that knowledge in the permanent record rather than omit it.

That choice is the Okafor Log's enduring contribution to the Concord's self-understanding. Entry 847 is the most direct argument for the Chronicle system that exists in the entire record ΓÇö not because it shows the system preventing harm, but because it shows what happens when a decision-maker, operating within a system that makes honest documentation structurally expected, tells the truth about the limits of their confidence. The Chronicle did not save the eleven dynasties of Adhan Passage. What it did was create the conditions under which a Councillor felt compelled to preserve the evidence of her own uncertainty. That evidence is now available to every dynasty in the Concord. What they do with it determines what kind of civilisation they are building.`,
    inGameYearRelevant: 2024,
    relatedChronicleEntryIds: ['entry-847', 'chronicle-adhan-designation'],
    relatedNpcIds: ['npc-okafor'],
    relatedWorldIds: ['world-247'],
    isPlayerUnlockable: true,
    unlockCondition: 'Must be found during gameplay ΓÇö reading Entry 847 in the Chronicle',
    lastUpdatedYear: 2031,
  },
];

// ΓöÇΓöÇΓöÇ Type guard for section ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const VALID_SECTIONS: ReadonlySet<CompendiumSection> = new Set([
  'FOUNDING_WOUNDS',
  'FACTIONS',
  'KEY_FIGURES',
  'WORLDS',
  'TIMELINE',
  'ECONOMICS',
  'GOVERNANCE',
  'SEALED_CHAMBERS',
  'THE_ASCENDANCY',
  'SURVEY_CORPS',
  'THE_LATTICE',
]);

export function isValidSection(section: string): section is CompendiumSection {
  return VALID_SECTIONS.has(section as CompendiumSection);
}
