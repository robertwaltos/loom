/**
 * assembly-vote-delegations.ts — Liquid democracy vote delegation records.
 *
 * 20 active delegation records:
 *  - 5 full delegations (all votes to a trusted delegate)
 *  - 10 partial delegations (specific topic categories)
 *  - 5 contested delegations (delegator and delegate have since disagreed)
 *
 * Fabric: archive (data)
 * Thread: scribe
 */
// ─── Records ──────────────────────────────────────────────────────────────────
export const VOTE_DELEGATIONS = [
    // ── Full Delegations (5) ─────────────────────────────────────────────────
    {
        delegationId: 'DEL_001',
        delegatorDynastyId: 'dynasty:ferreira-asante',
        delegatorWorldId: 'world-499',
        delegateeDynastyId: 'dynasty:osei-ferreira',
        delegateeWorldId: 'world-73',
        scope: 'ALL',
        status: 'ACTIVE_FULL',
        establishedYear: 89,
        reason: 'World 499 founding family delegated all Assembly votes to the Osei-Ferreira dynasty during the isolation years — too few visits to be reliably informed on continental matters.',
        contestReason: null,
        isActive: true,
    },
    {
        delegationId: 'DEL_002',
        delegatorDynastyId: 'dynasty:adeyemi-lindqvist',
        delegatorWorldId: 'world-19',
        delegateeDynastyId: 'dynasty:okafor-vasquez',
        delegateeWorldId: 'world-247',
        scope: 'ALL',
        status: 'ACTIVE_FULL',
        establishedYear: 95,
        reason: 'World 19 mid-tier dynasty with limited Chronicle depth — full delegation to Speaker Okafor-Vasquez who has represented their interest faithfully for twelve years.',
        contestReason: null,
        isActive: true,
    },
    {
        delegationId: 'DEL_003',
        delegatorDynastyId: 'dynasty:mensah-andrade',
        delegatorWorldId: 'world-67',
        delegateeDynastyId: 'dynasty:eze-petrov',
        delegateeWorldId: 'world-89',
        scope: 'ALL',
        status: 'ACTIVE_FULL',
        establishedYear: 97,
        reason: 'Scholar Bola Eze-Petrov has deeper expertise in Ascendancy-adjacent policy than any World 67 dynasty. Full delegation established to concentrate informed votes on a single trusted voice.',
        contestReason: null,
        isActive: true,
    },
    {
        delegationId: 'DEL_004',
        delegatorDynastyId: 'dynasty:sundaram-okonkwo',
        delegatorWorldId: 'world-441',
        delegateeDynastyId: 'dynasty:osei-brandt',
        delegateeWorldId: 'world-91',
        scope: 'ALL',
        status: 'ACTIVE_FULL',
        establishedYear: 101,
        reason: 'World 441 Lattice instability investigation ongoing — founding dynasty in active crisis management, cannot maintain Assembly voting attention. Full delegation to trusted Survey Corps associate.',
        contestReason: null,
        isActive: true,
    },
    {
        delegationId: 'DEL_005',
        delegatorDynastyId: 'dynasty:achebe-solberg',
        delegatorWorldId: 'world-33',
        delegateeDynastyId: 'dynasty:osei-nakamura-assembly',
        delegateeWorldId: 'world-19',
        scope: 'ALL',
        status: 'ACTIVE_FULL',
        establishedYear: 103,
        reason: 'Covenant Sister Ngozi is focused on Alkahest node research. Dynasty has delegated all Assembly votes to Delegate Taiwo, who is already filing infrastructure motions aligned with their concerns.',
        contestReason: null,
        isActive: true,
    },
    // ── Partial Delegations (10) ──────────────────────────────────────────────
    {
        delegationId: 'DEL_006',
        delegatorDynastyId: 'dynasty:adisa-kimura',
        delegatorWorldId: 'world-534',
        delegateeDynastyId: 'dynasty:osei-voss-cmd',
        delegateeWorldId: 'world-412',
        scope: 'SURVEY_MANDATE',
        status: 'ACTIVE_PARTIAL',
        establishedYear: 99,
        reason: 'World 534 expedition leader delegates Survey Corps mandate votes to a senior command voice. Retains all other voting rights.',
        contestReason: null,
        isActive: true,
    },
    {
        delegationId: 'DEL_007',
        delegatorDynastyId: 'dynasty:okonkwo-reinholt',
        delegatorWorldId: 'hub-vela',
        delegateeDynastyId: 'dynasty:eze-lindqvist',
        delegateeWorldId: 'world-91',
        scope: 'ECONOMIC',
        status: 'ACTIVE_PARTIAL',
        establishedYear: 98,
        reason: 'Hub Station Factor delegates economic policy votes to founding-generation veteran. Retains governance and Survey votes.',
        contestReason: null,
        isActive: true,
    },
    {
        delegationId: 'DEL_008',
        delegatorDynastyId: 'dynasty:adeyemi-vasquez',
        delegatorWorldId: 'world-73',
        delegateeDynastyId: 'dynasty:osei-sorensen',
        delegateeWorldId: 'world-247',
        scope: 'FOUNDING_WOUNDS',
        status: 'ACTIVE_PARTIAL',
        establishedYear: 96,
        reason: 'Archivist Kemi delegated Founding Wounds votes to Chronicler Adanna, whose access to Assembly session records makes her better positioned on historical justice motions.',
        contestReason: null,
        isActive: true,
    },
    {
        delegationId: 'DEL_009',
        delegatorDynastyId: 'dynasty:osei-larsen',
        delegatorWorldId: 'world-73',
        delegateeDynastyId: 'dynasty:mensah-ferreira-elder',
        delegateeWorldId: 'world-73',
        scope: 'CONSTITUTIONAL',
        status: 'ACTIVE_PARTIAL',
        establishedYear: 85,
        reason: 'Elder Adaeze dynasty delegates constitutional votes to Elder Olabisi — the only living person present at the original Covenant. His constitutional authority is considered unmatched.',
        contestReason: null,
        isActive: true,
    },
    {
        delegationId: 'DEL_010',
        delegatorDynastyId: 'dynasty:okafor-thorvaldsen',
        delegatorWorldId: null,
        delegateeDynastyId: 'dynasty:pale-circuit-liaison',
        delegateeWorldId: 'world-91',
        scope: 'ASCENDANCY_RELATED',
        status: 'ACTIVE_PARTIAL',
        establishedYear: 102,
        reason: 'Defector Yaw delegates all Ascendancy-related votes to the Pale Circuit liaison dynasty — the only Assembly faction with operational counter-Ascendancy experience.',
        contestReason: null,
        isActive: true,
    },
    {
        delegationId: 'DEL_011',
        delegatorDynastyId: 'dynasty:osei-voss-frontier',
        delegatorWorldId: 'world-67',
        delegateeDynastyId: 'dynasty:achebe-ferrara-cmd',
        delegateeWorldId: 'world-499',
        scope: 'LATTICE_INTEGRITY',
        status: 'ACTIVE_PARTIAL',
        establishedYear: 100,
        reason: 'World 67 delegation trusts Commander Seun Achebe-Ferrara on Lattice integrity questions above all others — she has direct field experience none of them have.',
        contestReason: null,
        isActive: true,
    },
    {
        delegationId: 'DEL_012',
        delegatorDynastyId: 'dynasty:lindqvist-settlement',
        delegatorWorldId: 'world-441',
        delegateeDynastyId: 'dynasty:osei-nakamura-assembly',
        delegateeWorldId: 'world-19',
        scope: 'WORLD_GOVERNANCE',
        status: 'ACTIVE_PARTIAL',
        establishedYear: 101,
        reason: 'Outer arc settler dynasty delegates world governance votes to the only Assembly delegate actively pursuing Lattice infrastructure for World 19 and similar worlds.',
        contestReason: null,
        isActive: true,
    },
    {
        delegationId: 'DEL_013',
        delegatorDynastyId: 'dynasty:ijele-vermeer',
        delegatorWorldId: 'world-247',
        delegateeDynastyId: 'dynasty:okafor-vasquez',
        delegateeWorldId: 'world-247',
        scope: 'PROCEDURAL',
        status: 'ACTIVE_PARTIAL',
        establishedYear: 99,
        reason: 'World 247 merchant dynasty delegates procedural votes to Speaker Okafor-Vasquez — he navigates Assembly procedure better than anyone currently serving.',
        contestReason: null,
        isActive: true,
    },
    {
        delegationId: 'DEL_014',
        delegatorDynastyId: 'dynasty:osei-reinholt-frontier',
        delegatorWorldId: 'world-73',
        delegateeDynastyId: 'dynasty:osei-ferreira',
        delegateeWorldId: 'world-73',
        scope: 'ECONOMIC',
        status: 'ACTIVE_PARTIAL',
        establishedYear: 97,
        reason: 'Young settler Amara Osei-Reinholt dynasty established partial economic delegation while building Chronicle depth — retains Founding Wounds and governance votes independently.',
        contestReason: null,
        isActive: true,
    },
    {
        delegationId: 'DEL_015',
        delegatorDynastyId: 'dynasty:mensah-andrade-research',
        delegatorWorldId: 'world-394',
        delegateeDynastyId: 'dynasty:adeyemi-vasquez-archive',
        delegateeWorldId: 'world-73',
        scope: 'LATTICE_INTEGRITY',
        status: 'ACTIVE_PARTIAL',
        establishedYear: 93,
        reason: 'World 394 researcher delegates Lattice integrity votes to the Archivist who has read the original World 394 survey — the only person outside the Pale Circuit who knows what was actually found.',
        contestReason: null,
        isActive: true,
    },
    // ── Contested Delegations (5) ──────────────────────────────────────────────
    {
        delegationId: 'DEL_016',
        delegatorDynastyId: 'dynasty:eze-petrov-research',
        delegatorWorldId: 'world-89',
        delegateeDynastyId: 'dynasty:okafor-vasquez',
        delegateeWorldId: 'world-247',
        scope: 'ASCENDANCY_RELATED',
        status: 'CONTESTED',
        establishedYear: 91,
        reason: 'Scholar Bola established delegation to the Speaker on Ascendancy policy — his political experience balanced her research depth.',
        contestReason: 'Delegation contested after Speaker Okafor-Vasquez voted in favour of the Ascendancy Observation Pause motion — which Scholar Bola believes directly compromised three years of her predictive research methodology. She has not revoked the delegation but has publicly disagreed with the vote.',
        isActive: true,
    },
    {
        delegationId: 'DEL_017',
        delegatorDynastyId: 'dynasty:adisa-ferreira',
        delegatorWorldId: 'world-247',
        delegateeDynastyId: 'dynasty:osei-reinholt-council',
        delegateeWorldId: 'world-91',
        scope: 'CONSTITUTIONAL',
        status: 'CONTESTED',
        establishedYear: 88,
        reason: 'Councillor Akin dynasty delegated constitutional votes to a World 91 ally with similar views on Architect voting weight reform.',
        contestReason: "Ally voted to table the Architect Weight Review motion that Councillor Akin had spent 40 years building toward. The ally's private reason has not been disclosed. Delegation remains technically active but Councillor Akin has not spoken to the delegate in two years.",
        isActive: true,
    },
    {
        delegationId: 'DEL_018',
        delegatorDynastyId: 'dynasty:osei-voss-cmd',
        delegatorWorldId: 'world-412',
        delegateeDynastyId: 'dynasty:mensah-andrade-survey',
        delegateeWorldId: 'world-67',
        scope: 'SURVEY_MANDATE',
        status: 'CONTESTED',
        establishedYear: 94,
        reason: 'Fleet Captain Adaeze delegated survey mandate votes to the officer who certified the World 394 survey — believed to be reliable on field accuracy questions.',
        contestReason: "Fleet Captain Adaeze now knows Commander Taiwo certified World 394 as 'no anomalies detected' when he knew it was false. She has not revoked the delegation — doing so would require explanation. The delegation remains active. Every survey mandate vote cast through it is a silent lie.",
        isActive: true,
    },
    {
        delegationId: 'DEL_019',
        delegatorDynastyId: 'dynasty:osei-nakamura-kweku',
        delegatorWorldId: 'world-19',
        delegateeDynastyId: 'dynasty:osei-nakamura-assembly',
        delegateeWorldId: 'world-19',
        scope: 'LATTICE_INTEGRITY',
        status: 'CONTESTED',
        establishedYear: 99,
        reason: 'Brother Kweku delegated Lattice integrity votes to his cousin Delegate Taiwo — they are on the same world and seemed aligned on node maintenance priorities.',
        contestReason: 'Brother Kweku has discovered that Delegate Taiwo has known about the World 19 node anomaly for months and has not escalated it outside the technical office. They have not discussed this. The delegation remains active. They have not spoken about the nodes.',
        isActive: true,
    },
    {
        delegationId: 'DEL_020',
        delegatorDynastyId: 'dynasty:achebe-solberg-covenant',
        delegatorWorldId: 'world-33',
        delegateeDynastyId: 'dynasty:covenant-elder-council',
        delegateeWorldId: 'world-33',
        scope: 'FOUNDING_WOUNDS',
        status: 'CONTESTED',
        establishedYear: 90,
        reason: 'Covenant community on World 33 delegated Founding Wounds votes to the Elder Council dynasty as is traditional.',
        contestReason: "Sister Ngozi's private research shows the Elder Council's public position on Alkahest Lattice stability is factually wrong. The Elder Council votes on Founding Wounds policy as if the Lattice is stable. Her delegation empowers votes she cannot agree with. She has not revoked it. The journal is 847 pages.",
        isActive: true,
    },
];
// ─── Query Functions ──────────────────────────────────────────────────────────
export function getDelegation(id) {
    return VOTE_DELEGATIONS.find((d) => d.delegationId === id);
}
export function getDelegationsByStatus(status) {
    return VOTE_DELEGATIONS.filter((d) => d.status === status);
}
export function getDelegationsByDelegator(dynastyId) {
    return VOTE_DELEGATIONS.filter((d) => d.delegatorDynastyId === dynastyId);
}
export function getDelegationsByDelegatee(dynastyId) {
    return VOTE_DELEGATIONS.filter((d) => d.delegateeDynastyId === dynastyId);
}
export function getDelegationsByScope(scope) {
    return VOTE_DELEGATIONS.filter((d) => d.scope === scope);
}
export function getContestedDelegations() {
    return VOTE_DELEGATIONS.filter((d) => d.status === 'CONTESTED');
}
export function getFullDelegations() {
    return VOTE_DELEGATIONS.filter((d) => d.scope === 'ALL');
}
// ─── Summary ──────────────────────────────────────────────────────────────────
export const DELEGATION_COUNT = 20;
export const FULL_DELEGATION_COUNT = 5;
export const PARTIAL_DELEGATION_COUNT = 10;
export const CONTESTED_DELEGATION_COUNT = 5;
//# sourceMappingURL=assembly-vote-delegations.js.map