// Copyright Koydo. All Rights Reserved.
// BridgeLoomEstate.h — UE5 bridge for estate-system.ts player housing and economy.
//
// estate-system.ts defines:
//   - EstateTier: PLOT / HOMESTEAD / MANOR / KEEP / CITADEL
//   - EstateSpecialization: FARMING / MINING / CRAFTING / TRADING / MILITARY / RESEARCH / MIXED
//   - ArchitecturalStyle: 10 culture styles (Nordic, Mediterranean, Jungle … Undersea)
//   - DefenseType: WALL / TOWER / GATE / MOAT / GUARD_POST / BALLISTA / WARD
//   - ProductionState: IDLE / PRODUCING / BLOCKED / UPGRADING
//   - Estate: dense struct with workerCount, defenseCount, storageCapacity,
//             totalInvestment, weeklyRevenue, tier, specialization, ...
//
// UE5 bridge strategy:
//   - FLoomEstateInfo is a flattened summary (no worker arrays at bridge layer).
//   - NotifyTierUpgrade / NotifyProductionComplete handle key game events.
//   - Economy figures (investment, revenue) are int64 to respect TS bigint.

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomEstate.generated.h"

// ─── Enums ────────────────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomEstateTier : uint8
{
    Plot       UMETA(DisplayName = "Plot"),
    Homestead  UMETA(DisplayName = "Homestead"),
    Manor      UMETA(DisplayName = "Manor"),
    Keep       UMETA(DisplayName = "Keep"),
    Citadel    UMETA(DisplayName = "Citadel"),
};

UENUM(BlueprintType)
enum class ELoomEstateSpecialization : uint8
{
    Farming   UMETA(DisplayName = "Farming"),
    Mining    UMETA(DisplayName = "Mining"),
    Crafting  UMETA(DisplayName = "Crafting"),
    Trading   UMETA(DisplayName = "Trading"),
    Military  UMETA(DisplayName = "Military"),
    Research  UMETA(DisplayName = "Research"),
    Mixed     UMETA(DisplayName = "Mixed"),
};

UENUM(BlueprintType)
enum class ELoomArchitecturalStyle : uint8
{
    NordicTimber       UMETA(DisplayName = "Nordic Timber"),
    MediterraneanStone UMETA(DisplayName = "Mediterranean Stone"),
    JungleCanopy       UMETA(DisplayName = "Jungle Canopy"),
    SteppeYurt         UMETA(DisplayName = "Steppe Yurt"),
    ArchipelagoStilts  UMETA(DisplayName = "Archipelago Stilts"),
    DesertAdobe        UMETA(DisplayName = "Desert Adobe"),
    TundraIce          UMETA(DisplayName = "Tundra Ice"),
    VolcanicObsidian   UMETA(DisplayName = "Volcanic Obsidian"),
    FloatingCrystal    UMETA(DisplayName = "Floating Crystal"),
    UnderseaCoral      UMETA(DisplayName = "Undersea Coral"),
};

UENUM(BlueprintType)
enum class ELoomDefenseType : uint8
{
    Wall       UMETA(DisplayName = "Wall"),
    Tower      UMETA(DisplayName = "Tower"),
    Gate       UMETA(DisplayName = "Gate"),
    Moat       UMETA(DisplayName = "Moat"),
    GuardPost  UMETA(DisplayName = "Guard Post"),
    Ballista   UMETA(DisplayName = "Ballista"),
    Ward       UMETA(DisplayName = "Ward"),
};

UENUM(BlueprintType)
enum class ELoomEstateProductionState : uint8
{
    Idle       UMETA(DisplayName = "Idle"),
    Producing  UMETA(DisplayName = "Producing"),
    Blocked    UMETA(DisplayName = "Blocked"),
    Upgrading  UMETA(DisplayName = "Upgrading"),
};

// ─── Structs ──────────────────────────────────────────────────────

/** Flat summary of an estate — projected from the full TS estate struct. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomEstateInfo
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Estate")
    FString EstateId;

    UPROPERTY(BlueprintReadOnly, Category = "Estate")
    FString OwnerId;

    UPROPERTY(BlueprintReadOnly, Category = "Estate")
    FString DynastyId;

    UPROPERTY(BlueprintReadOnly, Category = "Estate")
    FString WorldId;

    UPROPERTY(BlueprintReadOnly, Category = "Estate")
    FString EstateName;

    UPROPERTY(BlueprintReadOnly, Category = "Estate")
    ELoomEstateTier Tier = ELoomEstateTier::Plot;

    UPROPERTY(BlueprintReadOnly, Category = "Estate")
    ELoomEstateSpecialization Specialization = ELoomEstateSpecialization::Mixed;

    UPROPERTY(BlueprintReadOnly, Category = "Estate")
    ELoomArchitecturalStyle ArchStyle = ELoomArchitecturalStyle::NordicTimber;

    UPROPERTY(BlueprintReadOnly, Category = "Estate")
    int32 WorkerCount = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Estate")
    int32 DefenseCount = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Estate")
    int32 StorageCapacity = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Estate")
    int64 TotalInvestment = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Estate")
    int64 WeeklyRevenue = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Estate")
    ELoomEstateProductionState ProductionState = ELoomEstateProductionState::Idle;

    UPROPERTY(BlueprintReadOnly, Category = "Estate")
    int64 CreatedAtMs = 0;
};

/** Event payload when a production cycle completes. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomProductionCompleteEvent
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Estate")
    FString EstateId;

    UPROPERTY(BlueprintReadOnly, Category = "Estate")
    FString ProductItemId;

    UPROPERTY(BlueprintReadOnly, Category = "Estate")
    int32 Quantity = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Estate")
    int64 CompletedAtMs = 0;
};

// ─── Component ────────────────────────────────────────────────────

/**
 * UBridgeLoomEstate — ActorComponent bridging estate-system.ts economy and
 * housing events to Blueprint-readable UE5 data.
 *
 * Attach to Player State or a dedicated estate manager Actor.
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent),
       DisplayName = "Loom Estate")
class BRIDGELOOM_API UBridgeLoomEstate : public UActorComponent
{
    GENERATED_BODY()

public:
    UBridgeLoomEstate();

    // ── State ─────────────────────────────────────────────────────

    UPROPERTY(BlueprintReadOnly, Category = "Estate")
    TArray<FLoomEstateInfo> OwnedEstates;

    UPROPERTY(BlueprintReadOnly, Category = "Estate")
    FLoomEstateInfo FocusedEstate;

    // ── Inbound (transport → bridge) ─────────────────────────────

    /** Upsert or replace a full estate info snapshot. */
    UFUNCTION(BlueprintCallable, Category = "Estate")
    void ApplyEstateInfo(const FLoomEstateInfo& Info);

    /**
     * Called when the server confirms a tier upgrade.
     * EstateId identifies which estate upgraded; NewTier is the post-upgrade tier.
     */
    UFUNCTION(BlueprintCallable, Category = "Estate")
    void NotifyTierUpgrade(const FString& EstateId, ELoomEstateTier NewTier);

    /** Called when a production cycle completes. */
    UFUNCTION(BlueprintCallable, Category = "Estate")
    void NotifyProductionComplete(const FLoomProductionCompleteEvent& Event);

    /** Focus a specific estate for detail-panel display. */
    UFUNCTION(BlueprintCallable, Category = "Estate")
    void SetFocusedEstate(const FString& EstateId);

    // ── Queries ───────────────────────────────────────────────────

    UFUNCTION(BlueprintPure, Category = "Estate")
    bool GetEstateById(const FString& EstateId, FLoomEstateInfo& OutEstate) const;

    UFUNCTION(BlueprintPure, Category = "Estate")
    int64 GetTotalWeeklyRevenue() const;

    // ── Delegates ─────────────────────────────────────────────────

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnEstateInfoRefreshed,
        FLoomEstateInfo, Info);
    UPROPERTY(BlueprintAssignable, Category = "Estate|Events")
    FOnEstateInfoRefreshed OnEstateInfoRefreshed;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnEstateTierUpgraded,
        FString, EstateId, ELoomEstateTier, NewTier);
    UPROPERTY(BlueprintAssignable, Category = "Estate|Events")
    FOnEstateTierUpgraded OnEstateTierUpgraded;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnProductionCompleted,
        FLoomProductionCompleteEvent, Event);
    UPROPERTY(BlueprintAssignable, Category = "Estate|Events")
    FOnProductionCompleted OnProductionCompleted;
};
