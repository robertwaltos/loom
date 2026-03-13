// Copyright Koydo. All Rights Reserved.
// BridgeLoomNPCAI.h — UE5 bridge for the npc-ai-system.ts behavior layer.
//
// npc-ai-system.ts runs server-side at priority 125, producing per-tick decisions
// for every NPC entity.  Behavior matrix (from the source):
//
//   hostile  + enemy nearby   → Chase / Attack
//   hostile  + no enemy       → Patrol / ReturnHome
//   neutral  + recently hit   → Flee
//   neutral  + idle           → Patrol
//   friendly + player nearby  → Idle (available for talk interaction)
//   friendly + no player      → Patrol route
//
// UE5 side consumes NpcDecision events pushed via the game transport and:
//   - Drives the NPC animation state machine (idle → patrol → chase → attack)
//   - Triggers alert VFX (Niagara "!" burst on Chase/Attack transitions)
//   - Communicates goal to Blueprint AI blackboard for local microbehavior polish
//   - Exposes hostility to UI (e.g., health-bar colour tint)

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomNPCAI.generated.h"

// ─── Enumerations ──────────────────────────────────────────────────

/** Mirrors NpcGoal from npc-ai-system.ts. */
UENUM(BlueprintType)
enum class ELoomNpcGoal : uint8
{
    Idle        UMETA(DisplayName = "Idle — standing available"),
    Patrol      UMETA(DisplayName = "Patrol — wandering route"),
    Chase       UMETA(DisplayName = "Chase — pursuing target"),
    Attack      UMETA(DisplayName = "Attack — in melee range"),
    Flee        UMETA(DisplayName = "Flee — retreating from threat"),
    ReturnHome  UMETA(DisplayName = "ReturnHome — returning to spawn"),
};

/** Mirrors AIBrainComponent.hostility. */
UENUM(BlueprintType)
enum class ELoomNpcHostility : uint8
{
    Hostile     UMETA(DisplayName = "Hostile — attacks on sight"),
    Neutral     UMETA(DisplayName = "Neutral — retaliates when hit"),
    Friendly    UMETA(DisplayName = "Friendly — available to talk"),
};

// ─── Structs ───────────────────────────────────────────────────────

/**
 * Authoritative NPC decision pushed from the Loom each tick.
 * UE5 should consume this in its AI blackboard or behavior tree.
 */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomNpcDecision
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "NPCAI")
    FString EntityId;

    UPROPERTY(BlueprintReadOnly, Category = "NPCAI")
    ELoomNpcGoal Goal = ELoomNpcGoal::Idle;

    /** Empty string if no target (patrol / idle / return-home). */
    UPROPERTY(BlueprintReadOnly, Category = "NPCAI")
    FString TargetEntityId;

    /** Microsecond timestamp from Loom clock. */
    UPROPERTY(BlueprintReadOnly, Category = "NPCAI")
    int64 TimestampUs = 0;
};

/** Snapshot of the full NPC AI state (used for initial sync on area load). */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomNpcAiState
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "NPCAI")
    FString EntityId;

    UPROPERTY(BlueprintReadOnly, Category = "NPCAI")
    ELoomNpcGoal CurrentGoal = ELoomNpcGoal::Idle;

    UPROPERTY(BlueprintReadOnly, Category = "NPCAI")
    ELoomNpcHostility Hostility = ELoomNpcHostility::Neutral;

    UPROPERTY(BlueprintReadOnly, Category = "NPCAI")
    float AwarenessRadius = 15.0f;

    /** World-space home / spawn position used for ReturnHome goal. */
    UPROPERTY(BlueprintReadOnly, Category = "NPCAI")
    FVector HomePosition = FVector::ZeroVector;
};

// ─── Component ────────────────────────────────────────────────────

/**
 * UBridgeLoomNPCAI — ActorComponent bridging npc-ai-system.ts decisions
 * to Unreal animation, VFX, and BP blackboard.
 *
 * Usage:
 *  1. Attach to every NPC actor.
 *  2. Server transport calls ApplyDecision() when a new NpcAiEvent arrives.
 *  3. Animation Blueprint reads CurrentGoal via GetCurrentGoal().
 *  4. Bind OnGoalChanged / OnAttackTriggered delegates in Blueprint for VFX/audio.
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent),
       DisplayName = "Loom NPC AI")
class BRIDGELOOM_API UBridgeLoomNPCAI : public UActorComponent
{
    GENERATED_BODY()

public:
    UBridgeLoomNPCAI();

    // ── Configuration ─────────────────────────────────────────────

    /** Niagara "!" alert burst — spawned at NPC location on Chase/Attack entry. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "NPCAI|VFX")
    TSoftObjectPtr<class UNiagaraSystem> AlertVFXTemplate;

    /** Niagara idle puff — subtle ambient idle VFX for Friendly NPCs. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "NPCAI|VFX")
    TSoftObjectPtr<class UNiagaraSystem> FriendlyIdleVFXTemplate;

    // ── State ─────────────────────────────────────────────────────

    UPROPERTY(BlueprintReadOnly, Category = "NPCAI")
    FLoomNpcAiState CurrentState;

    /** Most recent decision received from the Loom. */
    UPROPERTY(BlueprintReadOnly, Category = "NPCAI")
    FLoomNpcDecision LastDecision;

    // ── Methods ───────────────────────────────────────────────────

    /**
     * Consume an authoritative NPC decision from the Loom.
     * Updates CurrentState and fires delegates on goal transition.
     */
    UFUNCTION(BlueprintCallable, Category = "NPCAI")
    void ApplyDecision(const FLoomNpcDecision& Decision);

    /**
     * Apply a full AI state snapshot (used on area load / initial sync).
     */
    UFUNCTION(BlueprintCallable, Category = "NPCAI")
    void ApplyStateSnapshot(const FLoomNpcAiState& State);

    UFUNCTION(BlueprintPure, Category = "NPCAI")
    ELoomNpcGoal GetCurrentGoal() const { return CurrentState.CurrentGoal; }

    UFUNCTION(BlueprintPure, Category = "NPCAI")
    ELoomNpcHostility GetHostility() const { return CurrentState.Hostility; }

    /** True if the NPC is currently in a combat goal (Chase or Attack). */
    UFUNCTION(BlueprintPure, Category = "NPCAI")
    bool IsInCombat() const;

    // ── Delegates ─────────────────────────────────────────────────

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(FOnNpcGoalChanged,
        FString, EntityId, ELoomNpcGoal, PreviousGoal, ELoomNpcGoal, NewGoal);

    /** Fired whenever the NPC goal transitions. */
    UPROPERTY(BlueprintAssignable, Category = "NPCAI|Events")
    FOnNpcGoalChanged OnGoalChanged;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnNpcAttackTriggered,
        FString, EntityId, FString, TargetEntityId);

    /** Fired specifically when entering the Attack goal (edge detection). */
    UPROPERTY(BlueprintAssignable, Category = "NPCAI|Events")
    FOnNpcAttackTriggered OnAttackTriggered;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnNpcDecisionReceived,
        FLoomNpcDecision, Decision);

    /** Fired every time a decision is applied (every Loom tick). */
    UPROPERTY(BlueprintAssignable, Category = "NPCAI|Events")
    FOnNpcDecisionReceived OnDecisionReceived;

    // ── UActorComponent ───────────────────────────────────────────

    virtual void BeginPlay() override;

private:
    ELoomNpcGoal PreviousGoal = ELoomNpcGoal::Idle;

    void SpawnAlertVFX();
};
