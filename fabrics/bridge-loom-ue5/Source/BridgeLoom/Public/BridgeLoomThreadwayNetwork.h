// Copyright Koydo. All Rights Reserved.
// BridgeLoomThreadwayNetwork.h — UE5 bridge for the Threadway inter-world network.
//
// Threadways are seamless connections between Loom worlds (no loading screens).
// Tier 1 are always visible; Tier 2 unlock after completing both endpoint worlds;
// Tier 3 require specific cross-topic discovery entries.
//
// This component manages portal actor discovery (tag: LoomThreadwayPortal),
// triggers transit VFX via UBridgeLoomNiagara, and teleports APlayerController
// to the target world's spawn point.
//
// Actor tags used: LoomThreadwayPortal, LoomThreadwaySpawn

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomThreadwayNetwork.generated.h"

// ─── Enumerations ──────────────────────────────────────────────────

/** Discovery tier that governs when a threadway becomes visible. */
UENUM(BlueprintType)
enum class ELoomThreadwayTier : uint8
{
    Tier1_AlwaysVisible   UMETA(DisplayName = "Tier 1 — Always Visible"),
    Tier2_BothComplete    UMETA(DisplayName = "Tier 2 — Both Worlds Complete"),
    Tier3_CrossTopic      UMETA(DisplayName = "Tier 3 — Cross-Topic Discovery"),
};

/** Progression state for a single threadway in the active kindler's session. */
UENUM(BlueprintType)
enum class ELoomThreadwayStatus : uint8
{
    Hidden      UMETA(DisplayName = "Hidden"),
    Visible     UMETA(DisplayName = "Visible"),
    Discovered  UMETA(DisplayName = "Discovered"),
    Traversed   UMETA(DisplayName = "Traversed"),
};

/** Thematic realm a threadway belongs to. */
UENUM(BlueprintType)
enum class ELoomThreadwayRealm : uint8
{
    STEM                UMETA(DisplayName = "STEM"),
    LanguageArts        UMETA(DisplayName = "Language Arts"),
    FinancialLiteracy   UMETA(DisplayName = "Financial Literacy"),
    Crossroads          UMETA(DisplayName = "Crossroads"),
    Hub                 UMETA(DisplayName = "Hub"),
};

// ─── Structs ───────────────────────────────────────────────────────

/** Sensory identity for a threadway transition (no loading screen). */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomThreadwayTransition
{
    GENERATED_BODY()

    /** Visual description authored by the world team (for VFX selection). */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Threadway")
    FString VisualDescription;

    /** Audio cue tag that drives the audio manager blend. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Threadway")
    FString AudioTransitionTag;
};

/** Data definition for a single threadway connection. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomThreadwayDefinition
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Threadway")
    FString ThreadwayId;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Threadway")
    FString FromWorldId;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Threadway")
    FString ToWorldId;

    /** Human-readable label for the cross-subject link (used in Compass hints). */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Threadway")
    FString ConceptLink;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Threadway")
    ELoomThreadwayTier Tier = ELoomThreadwayTier::Tier2_BothComplete;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Threadway")
    ELoomThreadwayRealm Realm = ELoomThreadwayRealm::STEM;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Threadway")
    FLoomThreadwayTransition Transition;

    /** Entry IDs required for Tier 3 discovery (empty means always unlocked). */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Threadway")
    TArray<FString> DiscoveryTriggerEntryIds;
};

/** Portal in the Hub connecting to a Realm's root world. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomHubPortal
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Threadway|Portal")
    FString PortalId;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Threadway|Portal")
    FString DisplayName;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Threadway|Portal")
    ELoomThreadwayRealm Realm = ELoomThreadwayRealm::Hub;

    /** Soft reference to the Niagara system used for this portal's idle VFX. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Threadway|Portal")
    TSoftObjectPtr<class UNiagaraSystem> PortalIdleVFX;

    /** Actor tag that uniquely identifies this portal in the level. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Threadway|Portal")
    FName ActorTag;
};

/** Kindler-specific traversal state passed in from the game layer. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomKindlerThreadwayState
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, Category = "Threadway|State")
    FString KindlerId;

    UPROPERTY(BlueprintReadWrite, Category = "Threadway|State")
    TSet<FString> DiscoveredThreadwayIds;

    UPROPERTY(BlueprintReadWrite, Category = "Threadway|State")
    TSet<FString> TraversedThreadwayIds;

    UPROPERTY(BlueprintReadWrite, Category = "Threadway|State")
    TSet<FString> CompletedWorldIds;

    UPROPERTY(BlueprintReadWrite, Category = "Threadway|State")
    TSet<FString> CompletedEntryIds;
};

/** Result of an evaluation pass for a single threadway. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomThreadwayDiscoveryResult
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Threadway")
    FString ThreadwayId;

    UPROPERTY(BlueprintReadOnly, Category = "Threadway")
    ELoomThreadwayStatus Status = ELoomThreadwayStatus::Hidden;

    /** Spark awarded if this is a first-time discovery (0 otherwise). */
    UPROPERTY(BlueprintReadOnly, Category = "Threadway")
    int32 SparkGained = 0;

    /** Luminance boost added to both endpoint worlds on first discovery. */
    UPROPERTY(BlueprintReadOnly, Category = "Threadway")
    int32 LuminanceBoost = 0;
};

// ─── Component ────────────────────────────────────────────────────

/**
 * UBridgeLoomThreadwayNetwork — ActorComponent bridging the TS threadway-network
 * to Unreal's actor/VFX systems.
 *
 * Features:
 *  - RegisterPortalActor: caches level actors tagged LoomThreadwayPortal by WorldId
 *  - TriggerTransit: plays Niagara transit VFX then teleports the player pawn
 *  - EvaluateDiscovery: computes which threadways become visible/discovered
 *  - UpgradeStatus: updates per-kindler status and fires delegates
 *  - GetConnectedWorlds: returns all worlds reachable from a given worldId
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent),
       DisplayName = "Loom Threadway Network")
class BRIDGELOOM_API UBridgeLoomThreadwayNetwork : public UActorComponent
{
    GENERATED_BODY()

public:
    UBridgeLoomThreadwayNetwork();

    // ── Configuration ─────────────────────────────────────────────

    /** All threadways defined in the project (populate via DataAsset or BP). */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Threadway|Config")
    TArray<FLoomThreadwayDefinition> ThreadwayDefinitions;

    /** Hub portals (one per realm). */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Threadway|Config")
    TArray<FLoomHubPortal> HubPortals;

    /** Niagara system spawned at the threadway midpoint during transit. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Threadway|Config")
    TSoftObjectPtr<class UNiagaraSystem> TransitVFXTemplate;

    /** Seconds to play the transit VFX before teleporting the player. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Threadway|Config",
              meta = (ClampMin = "0.5", ClampMax = "10.0"))
    float TransitDurationSeconds = 2.0f;

    /** Spark awarded on first threadway discovery. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Threadway|Config",
              meta = (ClampMin = "0", ClampMax = "50"))
    int32 SparkOnDiscovery = 10;

    /** World luminance boost awarded on discovery. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Threadway|Config",
              meta = (ClampMin = "0", ClampMax = "20"))
    int32 LuminanceOnDiscovery = 5;

    // ── Portal Registry ───────────────────────────────────────────

    /**
     * Search the current level for actors tagged LoomThreadwayPortal + the given
     * WorldId tag pattern and register them for teleport spawning.
     * Called once after world-streaming loads the level actors.
     */
    UFUNCTION(BlueprintCallable, Category = "Threadway")
    void RegisterPortalActors();

    /** Manually register a specific portal actor for a world. */
    UFUNCTION(BlueprintCallable, Category = "Threadway")
    void RegisterPortalActor(const FString& WorldId, AActor* PortalActor);

    // ── Transit ───────────────────────────────────────────────────

    /**
     * Begin transit from FromWorldId to ToWorldId for the given player.
     * Spawns TransitVFX, waits TransitDurationSeconds, then teleports.
     * Fires OnThreadwayTraversed after teleport completes.
     */
    UFUNCTION(BlueprintCallable, Category = "Threadway")
    void TriggerTransit(const FString& ThreadwayId,
                        APlayerController* Player,
                        FLoomKindlerThreadwayState& InOutState);

    /** Cancel an in-progress transit (e.g. player backed out). */
    UFUNCTION(BlueprintCallable, Category = "Threadway")
    void CancelTransit(APlayerController* Player);

    // ── Discovery Logic ───────────────────────────────────────────

    /**
     * Evaluate all threadways against the current kindler state.
     * Returns results for every threadway whose status changed.
     */
    UFUNCTION(BlueprintCallable, Category = "Threadway")
    TArray<FLoomThreadwayDiscoveryResult> EvaluateDiscovery(
        UPARAM(ref) FLoomKindlerThreadwayState& InOutState);

    /** Compute the current status of a single threadway for the given state. */
    UFUNCTION(BlueprintPure, Category = "Threadway")
    ELoomThreadwayStatus ComputeThreadwayStatus(
        const FLoomThreadwayDefinition& Def,
        const FLoomKindlerThreadwayState& State) const;

    /** Return all world IDs reachable from the given world via any threadway. */
    UFUNCTION(BlueprintPure, Category = "Threadway")
    TArray<FString> GetConnectedWorlds(const FString& WorldId) const;

    /** Look up a threadway definition by its ID. */
    UFUNCTION(BlueprintPure, Category = "Threadway")
    bool GetThreadwayById(const FString& ThreadwayId,
                          FLoomThreadwayDefinition& OutDef) const;

    /** All threadways belonging to a specific realm. */
    UFUNCTION(BlueprintPure, Category = "Threadway")
    TArray<FLoomThreadwayDefinition> GetThreadwaysByRealm(
        ELoomThreadwayRealm Realm) const;

    // ── Delegates ─────────────────────────────────────────────────

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnThreadwayDiscovered,
        FString, ThreadwayId, FLoomThreadwayDiscoveryResult, Result);

    UPROPERTY(BlueprintAssignable, Category = "Threadway|Events")
    FOnThreadwayDiscovered OnThreadwayDiscovered;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnThreadwayTraversed,
        FString, ThreadwayId, FString, KindlerId);

    UPROPERTY(BlueprintAssignable, Category = "Threadway|Events")
    FOnThreadwayTraversed OnThreadwayTraversed;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnPortalActivated,
        FString, PortalId, ELoomThreadwayRealm, Realm);

    UPROPERTY(BlueprintAssignable, Category = "Threadway|Events")
    FOnPortalActivated OnPortalActivated;

    // ── UActorComponent ───────────────────────────────────────────

    virtual void BeginPlay() override;

private:
    // WorldId → portal spawn actor (tagged LoomThreadwaySpawn in that world)
    TMap<FString, TWeakObjectPtr<AActor>> PortalSpawnMap;

    // Tracks players currently mid-transit (blocks re-entry)
    TSet<TWeakObjectPtr<APlayerController>> PlayersInTransit;

    // Internal helper: teleports pawn to world's spawn actor
    void TeleportPlayerToWorld(APlayerController* PC, const FString& WorldId);

    // Timer handles keyed per-controller for transit delays
    TMap<TWeakObjectPtr<APlayerController>, FTimerHandle> TransitTimers;
};
