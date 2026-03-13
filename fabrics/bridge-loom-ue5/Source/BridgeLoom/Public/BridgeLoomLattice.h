// Copyright Koydo. All Rights Reserved.
// BridgeLoomLattice.h — UE5 bridge for lattice-node.ts frequency transit network.
//
// lattice-node.ts manages the Lattice: the infrastructure layer that enables
// cross-world transit. Key behaviour the UE5 client must reflect:
//
//   - LatticeNode: a beacon anchored to a specific world with a FrequencySignature.
//     Precision rating (0.0–1.0) determines transit safety. Nodes can be in four
//     beacon states: SYNCHRONISED, DEGRADED, UNSTABLE, DESTROYED.
//
//   - Lock sequence: SYNCHRONISING → PARTIAL_COHERENCE → CRITICAL_THRESHOLD →
//     TRANSIT_EXECUTING → COMPLETE (or FAILED / PARTIAL_COLLAPSE on collapse).
//
//   - PARTIAL_COLLAPSE is a catastrophic mid-transit failure. When fired, the
//     client must play a full-screen distortion VFX and notify the Chronicle.
//
//   - Coherence (0.0–1.0): min(origin.precision, target.precision). Drives the
//     transit safety HUD colour ramp (green → amber → red).
//
//   - CompromiseType: the five attack vectors Ascendancy uses to degrade nodes.
//     Each maps to distinct particle and audio in the game's VFX library.
//
// UE5 responsibilities:
//   - Transit progress bar + coherence colour ramp
//   - PARTIAL_COLLAPSE cinematic trigger (camera shake + Niagara + audio)
//   - Beacon status ambient VFX per node in the galaxy map
//   - Compromise event VFX (sabotage sparks, frequency flicker, etc.)

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomLattice.generated.h"

// ─── Enums ──────────────────────────────────────────────────────────────────

/** Mirrors LockStatus from lattice-node.ts. */
UENUM(BlueprintType)
enum class ELoomLockStatus : uint8
{
    Synchronising   UMETA(DisplayName = "Synchronising"),
    PartialCoherence UMETA(DisplayName = "Partial Coherence"),
    CriticalThreshold UMETA(DisplayName = "Critical Threshold"),
    TransitExecuting UMETA(DisplayName = "Transit Executing"),
    Complete        UMETA(DisplayName = "Complete"),
    Failed          UMETA(DisplayName = "Failed"),
    PartialCollapse UMETA(DisplayName = "Partial Collapse"),
};

/** Mirrors BeaconStatus from lattice-node.ts. */
UENUM(BlueprintType)
enum class ELoomBeaconStatus : uint8
{
    Synchronised UMETA(DisplayName = "Synchronised"),
    Degraded     UMETA(DisplayName = "Degraded"),
    Unstable     UMETA(DisplayName = "Unstable"),
    Destroyed    UMETA(DisplayName = "Destroyed"),
};

/** Mirrors CompromiseType from lattice-node.ts (Ascendancy attack vectors). */
UENUM(BlueprintType)
enum class ELoomCompromiseType : uint8
{
    PowerSabotage      UMETA(DisplayName = "Power Sabotage"),
    FrequencySpoofing  UMETA(DisplayName = "Frequency Spoofing"),
    GeodeticCorruption UMETA(DisplayName = "Geodetic Corruption"),
    HarmonicInjection  UMETA(DisplayName = "Harmonic Injection"),
    SignalDegradation  UMETA(DisplayName = "Signal Degradation"),
};

// ─── Structs ────────────────────────────────────────────────────────────────

/**
 * A condensed frequency signature for rendering purposes.
 * The full 256-bit primary is approximated by a pair of int64 values;
 * Harmonics drives the waveform visualisation; FieldStrength drives glow radius.
 */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomFrequencySignature
{
    GENERATED_BODY()

    /** High 64 bits of the 256-bit primary frequency. */
    UPROPERTY(BlueprintReadOnly, Category = "Lattice")
    int64 PrimaryHi = 0;

    /** Low 64 bits of the 256-bit primary frequency. */
    UPROPERTY(BlueprintReadOnly, Category = "Lattice")
    int64 PrimaryLo = 0;

    /** Harmonic overtones (up to 8 values, 0.0–1.0). */
    UPROPERTY(BlueprintReadOnly, Category = "Lattice")
    TArray<float> Harmonics;

    /** Ambient field strength multiplier (0.8–2.4 per bible). */
    UPROPERTY(BlueprintReadOnly, Category = "Lattice")
    float FieldStrength = 1.0f;
};

/** Current state of a Lattice beacon node, as cached by the bridge. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomLatticeNodeState
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Lattice")
    FString NodeId;

    UPROPERTY(BlueprintReadOnly, Category = "Lattice")
    FString WorldId;

    UPROPERTY(BlueprintReadOnly, Category = "Lattice")
    ELoomBeaconStatus BeaconStatus = ELoomBeaconStatus::Synchronised;

    /**
     * Precision rating 0.0–1.0.
     * Below 0.73 (CRITICAL_PRECISION_THRESHOLD) transits carry collapse risk.
     */
    UPROPERTY(BlueprintReadOnly, Category = "Lattice")
    float PrecisionRating = 1.0f;

    /** How many lock requests are queued at this node. */
    UPROPERTY(BlueprintReadOnly, Category = "Lattice")
    int32 LockQueueDepth = 0;

    /** Distance from origin in light-years (for UI labelling). */
    UPROPERTY(BlueprintReadOnly, Category = "Lattice")
    float DistanceLy = 0.0f;

    UPROPERTY(BlueprintReadOnly, Category = "Lattice")
    FLoomFrequencySignature Frequency;
};

/** Data packet emitted when a transit lock changes state. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomTransitEvent
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Lattice")
    FString RequestId;

    UPROPERTY(BlueprintReadOnly, Category = "Lattice")
    FString EntityId;

    UPROPERTY(BlueprintReadOnly, Category = "Lattice")
    FString OriginNodeId;

    UPROPERTY(BlueprintReadOnly, Category = "Lattice")
    FString TargetNodeId;

    UPROPERTY(BlueprintReadOnly, Category = "Lattice")
    ELoomLockStatus Status = ELoomLockStatus::Synchronising;

    /**
     * Coherence as a percentage 0–100.
     * Drive the transit HUD colour ramp. Below 73 = danger zone.
     */
    UPROPERTY(BlueprintReadOnly, Category = "Lattice")
    float CoherencePercent = 100.0f;

    /** Estimated milliseconds remaining until transit completes (or zero if done). */
    UPROPERTY(BlueprintReadOnly, Category = "Lattice")
    float EstimatedRemainingMs = 0.0f;
};

/** Data packet for a beacon compromise event. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomBeaconCompromisedEvent
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Lattice")
    FString NodeId;

    UPROPERTY(BlueprintReadOnly, Category = "Lattice")
    ELoomCompromiseType CompromiseType = ELoomCompromiseType::SignalDegradation;

    /** Precision after the compromise is applied. */
    UPROPERTY(BlueprintReadOnly, Category = "Lattice")
    float PrecisionAfter = 0.0f;

    /** Chronicle entry id that was emitted for this compromise. */
    UPROPERTY(BlueprintReadOnly, Category = "Lattice")
    FString ChronicleEntryId;
};

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * UBridgeLoomLattice
 *
 * ActorComponent that bridges lattice-node.ts transit events to UE5 VFX/audio
 * and the in-world galaxy map UI. Attach to the PlayerController or a
 * dedicated LatticeManagerActor.
 *
 * Workflow:
 *   1. Server sends transit state updates → call NotifyTransitUpdate().
 *   2. Component caches state and broadcasts delegates to Blueprint.
 *   3. On PARTIAL_COLLAPSE, fires OnPartialCollapse + plays cinematic montage ref.
 *   4. Galaxy map queries node state via GetNodeState() / GetAllNodeStates().
 */
UCLASS(ClassGroup = "Loom", meta = (BlueprintSpawnableComponent), DisplayName = "Loom Lattice Bridge")
class BRIDGELOOM_API UBridgeLoomLattice : public UActorComponent
{
    GENERATED_BODY()

public:
    UBridgeLoomLattice();

    // ── Configuration ────────────────────────────────────────────────────────

    /**
     * Precision threshold below which the transit HUD turns red.
     * Mirrors CRITICAL_PRECISION_THRESHOLD = 0.73 from lattice-node.ts.
     */
    UPROPERTY(EditDefaultsOnly, Category = "Lattice|Config")
    float CriticalPrecisionThreshold = 0.73f;

    /**
     * Optional montage to play on PARTIAL_COLLAPSE.
     * Blueprint-configurable so designers can swap it without recompiling.
     */
    UPROPERTY(EditDefaultsOnly, BlueprintReadWrite, Category = "Lattice|Config")
    TObjectPtr<class UAnimMontage> PartialCollapseMontage;

    /**
     * Optional Niagara system for the PARTIAL_COLLAPSE screen effect.
     */
    UPROPERTY(EditDefaultsOnly, BlueprintReadWrite, Category = "Lattice|Config")
    TObjectPtr<class UNiagaraSystem> PartialCollapseVFX;

    // ── Delegates ────────────────────────────────────────────────────────────

    /** Fired whenever a transit lock changes state. */
    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnTransitUpdate, const FLoomTransitEvent&, Event);
    UPROPERTY(BlueprintAssignable, Category = "Lattice|Events")
    FOnTransitUpdate OnTransitUpdate;

    /** Fired when a transit completes successfully. */
    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnTransitComplete, const FLoomTransitEvent&, Event);
    UPROPERTY(BlueprintAssignable, Category = "Lattice|Events")
    FOnTransitComplete OnTransitComplete;

    /**
     * Fired on PARTIAL_COLLAPSE.
     * Blueprint should trigger camera shake and distortion post-process volume.
     */
    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnPartialCollapse, const FLoomTransitEvent&, Event);
    UPROPERTY(BlueprintAssignable, Category = "Lattice|Events")
    FOnPartialCollapse OnPartialCollapse;

    /** Fired when a beacon node is compromised by Ascendancy. */
    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnBeaconCompromised, const FLoomBeaconCompromisedEvent&, Event);
    UPROPERTY(BlueprintAssignable, Category = "Lattice|Events")
    FOnBeaconCompromised OnBeaconCompromised;

    /** Fired when a node state is updated (for galaxy-map refresh). */
    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnNodeStateChanged, const FLoomLatticeNodeState&, NodeState);
    UPROPERTY(BlueprintAssignable, Category = "Lattice|Events")
    FOnNodeStateChanged OnNodeStateChanged;

    // ── Inbound (server → client) ─────────────────────────────────────────

    /** Called by the network layer when a transit lock changes state. */
    UFUNCTION(BlueprintCallable, Category = "Lattice")
    void NotifyTransitUpdate(const FLoomTransitEvent& Event);

    /** Called by the network layer to update a node's cached state. */
    UFUNCTION(BlueprintCallable, Category = "Lattice")
    void NotifyNodeStateUpdate(const FLoomLatticeNodeState& NodeState);

    /** Called when Ascendancy compromises a beacon. */
    UFUNCTION(BlueprintCallable, Category = "Lattice")
    void NotifyBeaconCompromised(const FLoomBeaconCompromisedEvent& Event);

    // ── Outbound (client → server) ────────────────────────────────────────

    /** Player requests a transit lock from OriginNodeId to TargetNodeId. */
    UFUNCTION(BlueprintCallable, Category = "Lattice")
    void RequestTransit(const FString& OriginNodeId, const FString& TargetNodeId, const FString& EntityId);

    /** Player requests to cancel an in-progress lock (pre-execution only). */
    UFUNCTION(BlueprintCallable, Category = "Lattice")
    void RequestCancelTransit(const FString& RequestId);

    // ── Queries (Blueprint-accessible) ───────────────────────────────────

    /** Returns current state of a specific node, or default if not cached. */
    UFUNCTION(BlueprintPure, Category = "Lattice")
    FLoomLatticeNodeState GetNodeState(const FString& NodeId) const;

    /** Returns all cached node states for the galaxy map. */
    UFUNCTION(BlueprintPure, Category = "Lattice")
    TArray<FLoomLatticeNodeState> GetAllNodeStates() const;

    /** Returns the active transit event for an entity if one is in progress. */
    UFUNCTION(BlueprintPure, Category = "Lattice")
    bool GetActiveTransit(const FString& EntityId, FLoomTransitEvent& OutEvent) const;

    /**
     * Derives the HUD colour from coherence percent.
     * Green (100) → Amber (73) → Red (below 73).
     * Exposed as BlueprintPure so UI widgets can call it directly.
     */
    UFUNCTION(BlueprintPure, Category = "Lattice")
    FLinearColor GetCoherenceColour(float CoherencePercent) const;

    /**
     * Returns true when PrecisionRating is below CriticalPrecisionThreshold.
     * Convenience for Blueprint conditions.
     */
    UFUNCTION(BlueprintPure, Category = "Lattice")
    bool IsNodeAtRisk(float PrecisionRating) const;

    /** Total number of cached Lattice nodes. */
    UFUNCTION(BlueprintPure, Category = "Lattice")
    int32 GetNodeCount() const;

protected:
    virtual void BeginPlay() override;

private:
    /** Cached node states, keyed by NodeId. */
    TMap<FString, FLoomLatticeNodeState> CachedNodes;

    /** Active transit events, keyed by EntityId. */
    TMap<FString, FLoomTransitEvent> ActiveTransits;

    /**
     * Handles the PARTIAL_COLLAPSE path: spawns VFX, logs,
     * and fires the OnPartialCollapse delegate.
     */
    void HandlePartialCollapse(const FLoomTransitEvent& Event);

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnTransitRequested,
        const FString&, OriginNodeId, const FString&, TargetNodeId);

public:
    /** Outbound delegate — connect to the network send layer. */
    UPROPERTY(BlueprintAssignable, Category = "Lattice|Outbound")
    FOnTransitRequested OnTransitRequested;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnCancelRequested, const FString&, RequestId);
    UPROPERTY(BlueprintAssignable, Category = "Lattice|Outbound")
    FOnCancelRequested OnCancelRequested;
};
