// Copyright Koydo. All Rights Reserved.
// BridgeLoomHiddenZones.h — UE5 bridge for Bible v5 Hidden Zones & Secret Areas.
//
// Five discoverable areas providing pure delight for deep explorers.
// NOT required for progression — each grants +15 Spark (one-time).
//
// Discovery triggers map to Unreal mechanics:
//   linger-in-threadway    → overlap + timer on threadway corridor volumes
//   complete-all-entries   → event from BridgeLoomKindlerProgression
//   follow-npc             → proximity tracking of tagged NPCs
//   complete-and-ask       → world completion + interaction check
//   time-and-entry-count   → night cycle CVar + entry count threshold
//
// Actor tags used: LoomHiddenZoneVolume, LoomHiddenZoneNPC

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomHiddenZones.generated.h"

// ─── Enumerations ──────────────────────────────────────────────────

/** Canonical IDs for each hidden zone from Bible v5 Part 7. */
UENUM(BlueprintType)
enum class ELoomHiddenZoneId : uint8
{
    TheInBetween        UMETA(DisplayName = "The In-Between"),
    InverseGarden       UMETA(DisplayName = "The Inverse Garden"),
    WhalesLibrary       UMETA(DisplayName = "The Whale's Library"),
    UnfinishedRoom      UMETA(DisplayName = "The Unfinished Room"),
    DreamArchive        UMETA(DisplayName = "The Dream Archive"),
};

/** Mechanism by which the player discovers a hidden zone. */
UENUM(BlueprintType)
enum class ELoomDiscoveryTriggerType : uint8
{
    LingerInThreadway       UMETA(DisplayName = "Linger in Threadway (10 s)"),
    CompleteAllEntries      UMETA(DisplayName = "Complete All Entries in World"),
    FollowNPC               UMETA(DisplayName = "Follow NPC to Zone"),
    CompleteEntriesAndAsk   UMETA(DisplayName = "Complete Entries Then Ask"),
    TimeAndEntryCount       UMETA(DisplayName = "Night Cycle + Entry Count"),
};

// ─── Structs ───────────────────────────────────────────────────────

/** Trigger definition for a single hidden zone. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomDiscoveryTrigger
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "HiddenZone")
    ELoomDiscoveryTriggerType Type = ELoomDiscoveryTriggerType::LingerInThreadway;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "HiddenZone")
    FString Description;

    /** WorldId where the trigger originates (empty = any world). */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "HiddenZone")
    FString RequiredWorldId;

    /** Minimum completed entries in RequiredWorldId before trigger fires. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "HiddenZone",
              meta = (ClampMin = "0"))
    int32 RequiredEntryCount = 0;

    /** NPC actor tag to follow (relevant for FollowNPC trigger type). */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "HiddenZone")
    FName RequiredNpcTag;

    /** How long the player must remain in the trigger volume (ms). */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "HiddenZone",
              meta = (ClampMin = "1000", ClampMax = "60000"))
    int32 LingerDurationMs = 10000;

    /** If true, the trigger only activates during the night time-of-day cycle. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "HiddenZone")
    bool bRequiresNightCycle = false;
};

/** Full definition for a hidden zone. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomHiddenZoneDefinition
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "HiddenZone")
    ELoomHiddenZoneId ZoneId = ELoomHiddenZoneId::TheInBetween;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "HiddenZone")
    FString ZoneName;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "HiddenZone")
    FString Location;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "HiddenZone")
    FString NarrativePurpose;

    /** WorldId the access point lives in ("any-threadway" = threadway corridor). */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "HiddenZone")
    FString AccessWorldId;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "HiddenZone")
    FLoomDiscoveryTrigger DiscoveryTrigger;

    /** Spark awarded on first discovery. Default: 15. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "HiddenZone",
              meta = (ClampMin = "0", ClampMax = "100"))
    int32 SparkReward = 15;

    /** Tag on the UBoxComponent volume actor in the level for this zone. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "HiddenZone")
    FName VolumeActorTag;
};

/** Per-kindler state tracking which zones have been discovered. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomKindlerZoneState
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, Category = "HiddenZone")
    FString KindlerId;

    UPROPERTY(BlueprintReadWrite, Category = "HiddenZone")
    TSet<ELoomHiddenZoneId> DiscoveredZoneIds;

    UPROPERTY(BlueprintReadWrite, Category = "HiddenZone")
    TSet<FString> CompletedWorldIds;

    UPROPERTY(BlueprintReadWrite, Category = "HiddenZone",
              meta = (ClampMin = "0"))
    int32 CompletedEntryCount = 0;

    UPROPERTY(BlueprintReadWrite, Category = "HiddenZone",
              meta = (ClampMin = "0"))
    int32 TotalDistinctWorldsVisited = 0;

    /** Unix-ms timestamp when the kindler entered a threadway (for linger timer). */
    UPROPERTY(BlueprintReadWrite, Category = "HiddenZone")
    int64 ThreadwayLingerStartMs = 0;
};

/** Result returned after evaluating whether discovery conditions are met. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomZoneDiscoveryResult
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "HiddenZone")
    ELoomHiddenZoneId ZoneId = ELoomHiddenZoneId::TheInBetween;

    UPROPERTY(BlueprintReadOnly, Category = "HiddenZone")
    bool bDiscovered = false;

    UPROPERTY(BlueprintReadOnly, Category = "HiddenZone")
    int32 SparkGained = 0;

    UPROPERTY(BlueprintReadOnly, Category = "HiddenZone")
    FString Message;
};

// ─── Component ────────────────────────────────────────────────────

/**
 * UBridgeLoomHiddenZones — ActorComponent bridging TS hidden-zones to UE5.
 *
 * Features:
 *  - RegisterZoneVolumes: scans level for LoomHiddenZoneVolume tagged actors
 *  - EvaluateLinger: call every frame while player is in a threadway corridor
 *  - EvaluateDiscovery: checks all 5 zones against current kindler state
 *  - TriggerZoneReveal: spawns discovery Niagara burst + broadcasts delegate
 *  - MarkDiscovered: records zone in kindler state, awards spark
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent),
       DisplayName = "Loom Hidden Zones")
class BRIDGELOOM_API UBridgeLoomHiddenZones : public UActorComponent
{
    GENERATED_BODY()

public:
    UBridgeLoomHiddenZones();

    // ── Configuration ─────────────────────────────────────────────

    /** Zone definitions — auto-populated with Bible v5 defaults in BeginPlay. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "HiddenZone|Config")
    TArray<FLoomHiddenZoneDefinition> ZoneDefinitions;

    /** Niagara system spawned at the discovery moment. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "HiddenZone|Config")
    TSoftObjectPtr<class UNiagaraSystem> DiscoveryVFXTemplate;

    /** Material used for fog-of-war reveal on the zone entrance mesh. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "HiddenZone|Config")
    TSoftObjectPtr<class UMaterialInterface> ZoneRevealMaterial;

    /** Night cycle hour threshold (hour >= this = night). Default: 21. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "HiddenZone|Config",
              meta = (ClampMin = "18", ClampMax = "23"))
    int32 NightStartHour = 21;

    // ── Volume Registry ───────────────────────────────────────────

    /**
     * Search the current world for actors tagged LoomHiddenZoneVolume and map
     * them to their ELoomHiddenZoneId via a matching ZoneDefinition.VolumeActorTag.
     */
    UFUNCTION(BlueprintCallable, Category = "HiddenZone")
    void RegisterZoneVolumes();

    /** Manually bind a specific overlap actor to a zone ID. */
    UFUNCTION(BlueprintCallable, Category = "HiddenZone")
    void RegisterZoneVolume(ELoomHiddenZoneId ZoneId, AActor* VolumeActor);

    // ── Linger Tracking ───────────────────────────────────────────

    /**
     * Notify the component that the player entered a threadway corridor.
     * Records LingerStartMs in InOutState. EvaluateLinger must be ticked.
     */
    UFUNCTION(BlueprintCallable, Category = "HiddenZone")
    void OnThreadwayEntered(UPARAM(ref) FLoomKindlerZoneState& InOutState,
                            int64 NowMs);

    /**
     * Call every tick while player is inside a threadway corridor.
     * Returns true (and fires discovery) when In-Between linger duration met.
     */
    UFUNCTION(BlueprintCallable, Category = "HiddenZone")
    bool EvaluateLinger(UPARAM(ref) FLoomKindlerZoneState& InOutState,
                        int64 NowMs);

    // ── Discovery Evaluation ─────────────────────────────────────

    /**
     * Evaluate all five zones against the current state.
     * Marks newly discoverable zones, spawns VFX, fires OnZoneDiscovered.
     * Returns results for every zone whose state changed.
     */
    UFUNCTION(BlueprintCallable, Category = "HiddenZone")
    TArray<FLoomZoneDiscoveryResult> EvaluateDiscovery(
        UPARAM(ref) FLoomKindlerZoneState& InOutState,
        int32 CurrentHour,
        int64 NowMs);

    /** Explicitly mark a zone discovered (e.g., from BP trigger or admin). */
    UFUNCTION(BlueprintCallable, Category = "HiddenZone")
    FLoomZoneDiscoveryResult MarkDiscovered(
        UPARAM(ref) FLoomKindlerZoneState& InOutState,
        ELoomHiddenZoneId ZoneId);

    /** Returns true if the kindler has already discovered the given zone. */
    UFUNCTION(BlueprintPure, Category = "HiddenZone")
    bool IsZoneDiscovered(const FLoomKindlerZoneState& State,
                          ELoomHiddenZoneId ZoneId) const;

    // ── Delegates ─────────────────────────────────────────────────

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnZoneDiscovered,
        ELoomHiddenZoneId, ZoneId, int32, SparkGained);

    UPROPERTY(BlueprintAssignable, Category = "HiddenZone|Events")
    FOnZoneDiscovered OnZoneDiscovered;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnZoneEntered,
        ELoomHiddenZoneId, ZoneId);

    UPROPERTY(BlueprintAssignable, Category = "HiddenZone|Events")
    FOnZoneEntered OnZoneEntered;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnZoneExited,
        ELoomHiddenZoneId, ZoneId);

    UPROPERTY(BlueprintAssignable, Category = "HiddenZone|Events")
    FOnZoneExited OnZoneExited;

    // ── UActorComponent ───────────────────────────────────────────

    virtual void BeginPlay() override;

private:
    // ZoneId → overlap actor in the level
    TMap<ELoomHiddenZoneId, TWeakObjectPtr<AActor>> ZoneVolumeMap;

    // Seed ZoneDefinitions with Bible v5 defaults if array is empty
    void InitDefaultZoneDefs();

    // Internal: spawn discovery burst and apply reveal material to volume mesh
    void TriggerZoneReveal(ELoomHiddenZoneId ZoneId);

    // Check if current hour qualifies as night
    bool IsNightCycle(int32 CurrentHour) const;
};
