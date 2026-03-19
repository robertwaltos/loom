/**
 * npc-instance-system.ts — Architecture Decision D2: NPC instance system.
 *
 * Creates NPC instances on first world activation, tracks state per world,
 * applies historical pressure drift, and seals instances on NPC death.
 *
 * An "instance" is the NPC's state on a specific world — each world gets
 * its own instance, allowing NPCs to have different states on different worlds.
 *
 * Thread: iron
 * Tier: 1
 */
// ─── Factory ──────────────────────────────────────────────────────────────────
/**
 * Creates an NPC instance on first world activation.
 * NPCs start fully cooperative (100) with no drift.
 */
export function createNPCInstance(params) {
    return {
        instanceId: params.instanceId,
        npcId: params.npcId,
        worldId: params.worldId,
        state: 'ACTIVE',
        driftScore: 0.0,
        cooperationLevel: 100,
        createdAt: params.createdAt,
    };
}
// ─── Drift Application ────────────────────────────────────────────────────────
/**
 * Applies a historical pressure vector to an NPC instance.
 * High betrayalWeight → cooperation drops.
 * High ascendancySignatureWeight → drift score increases faster.
 */
export function applyDrift(instance, pressureVector, now) {
    if (instance.state === 'SEALED')
        return instance;
    // Cooperation decreases proportionally to betrayalWeight
    const betrayalImpact = pressureVector.betrayalWeight / 100;
    const newCooperation = Math.max(0, instance.cooperationLevel - Math.round(betrayalImpact * 15));
    // Drift score increases with conflict + Ascendancy weights
    const driftIncrease = (pressureVector.conflictWeight + pressureVector.ascendancySignatureWeight) / 200;
    const newDrift = Math.min(1.0, Math.round((instance.driftScore + driftIncrease) * 1000) / 1000);
    // State transitions
    let newState = instance.state;
    if (newCooperation < 30) {
        newState = 'UNCOOPERATIVE';
    }
    else if (newDrift > 0.3 || newCooperation < 70) {
        newState = 'DRIFTING';
    }
    return {
        ...instance,
        state: newState,
        driftScore: newDrift,
        cooperationLevel: newCooperation,
        lastDriftAppliedAt: now,
    };
}
/**
 * Seals an NPC instance when the NPC dies.
 * Sealed instances are archived and immutable.
 */
export function sealInstance(instance, cause, now) {
    const sealed = {
        ...instance,
        state: 'SEALED',
        sealedAt: now,
    };
    const record = {
        instanceId: instance.instanceId,
        npcId: instance.npcId,
        worldId: instance.worldId,
        sealedAt: now,
        finalDriftScore: instance.driftScore,
        finalCooperationLevel: instance.cooperationLevel,
        causeOfSealing: cause,
    };
    return { sealed, record };
}
// ─── Query Helpers ────────────────────────────────────────────────────────────
/**
 * Gets current instance state — returns null if not found.
 * (In production this queries a database; here it queries the provided map.)
 */
export function getNPCInstance(store, npcId, worldId) {
    const key = `${npcId}:${worldId}`;
    return store.get(key) ?? null;
}
/**
 * Index key for a given NPC + world combination.
 */
export function instanceKey(npcId, worldId) {
    return `${npcId}:${worldId}`;
}
//# sourceMappingURL=npc-instance-system.js.map