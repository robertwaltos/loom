// Copyright Koydo. All Rights Reserved.
// BridgeLoomLootTable.h — UE5 bridge for loot-table.ts item drop tables.
//
// loot-table.ts manages server-authoritative loot:
//   RarityTier: COMMON | UNCOMMON | RARE | EPIC | LEGENDARY | ARTIFACT
//   LootTable  → pools (each with dropChance 0-1, min/maxDrops) + guaranteedItems
//   LootPool   → entries (items with weight, min/maxQuantity)
//   rollLoot() → seeded LCG (state * 1103515245 + 12345 & 0x7fffffff)
//   Result: LootRoll → DroppedItem[]
//
// UE5 side:
//   - Receives LootRoll results from transport and spawns world pickups via VFX
//   - Fires per-rarity delegates so HUD / sound system can react
//   - Caches the most-recent roll to drive the "loot received" UI panel

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomLootTable.generated.h"

// ─── Enums ─────────────────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomLootRarity : uint8
{
    Common    UMETA(DisplayName = "Common"),
    Uncommon  UMETA(DisplayName = "Uncommon"),
    Rare      UMETA(DisplayName = "Rare"),
    Epic      UMETA(DisplayName = "Epic"),
    Legendary UMETA(DisplayName = "Legendary"),
    Artifact  UMETA(DisplayName = "Artifact"),
};

// ─── Structs ───────────────────────────────────────────────────────

/** A single item that dropped from a loot roll. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomDroppedItem
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Loot")
    FString ItemId;

    UPROPERTY(BlueprintReadOnly, Category = "Loot")
    FString ItemName;

    UPROPERTY(BlueprintReadOnly, Category = "Loot")
    ELoomLootRarity Rarity = ELoomLootRarity::Common;

    UPROPERTY(BlueprintReadOnly, Category = "Loot")
    int32 Quantity = 1;
};

/** Complete result of a single server-side loot roll. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomLootRoll
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Loot")
    FString RollId;

    UPROPERTY(BlueprintReadOnly, Category = "Loot")
    FString TableId;

    UPROPERTY(BlueprintReadOnly, Category = "Loot")
    TArray<FLoomDroppedItem> Items;

    /** Unix-µs from server clock. */
    UPROPERTY(BlueprintReadOnly, Category = "Loot")
    int64 RolledAtMicros = 0;
};

// ─── Component ────────────────────────────────────────────────────

/**
 * UBridgeLoomLootTable — ActorComponent that receives loot roll results from
 * the Loom transport and notifies Blueprint/UMG with item details, VFX, and
 * rarity-driven audio cues.
 *
 * Typical attach point: Player State or Inventory Manager actor.
 *
 * Workflow:
 *   Server rolls loot → transport calls NotifyLootRoll(Roll)
 *   → Bridge caches roll, spawns world pickups, fires per-item delegates.
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent),
       DisplayName = "Loom Loot Table")
class BRIDGELOOM_API UBridgeLoomLootTable : public UActorComponent
{
    GENERATED_BODY()

public:
    UBridgeLoomLootTable();

    // ── Configuration ─────────────────────────────────────────────

    /** Niagara burst played at the pickup spawn location per rarity tier. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loot|VFX")
    TMap<ELoomLootRarity, TSoftObjectPtr<class UNiagaraSystem>> RarityVFXMap;

    // ── State ─────────────────────────────────────────────────────

    /** Most recently received roll — drives the loot-received UI panel. */
    UPROPERTY(BlueprintReadOnly, Category = "Loot")
    FLoomLootRoll LastRoll;

    /** Running total of items received this session, keyed by ItemId. */
    UPROPERTY(BlueprintReadOnly, Category = "Loot")
    TMap<FString, int32> SessionItemTotals;

    // ── Methods ───────────────────────────────────────────────────

    /**
     * Called by the transport layer when a LootRoll result arrives.
     * Caches the roll, updates SessionItemTotals, spawns VFX per item,
     * fires OnLootRollReceived and per-item OnItemDropped.
     */
    UFUNCTION(BlueprintCallable, Category = "Loot")
    void NotifyLootRoll(const FLoomLootRoll& Roll, const FVector& WorldDropLocation);

    /** Returns all items in the last roll matching the given rarity. */
    UFUNCTION(BlueprintPure, Category = "Loot")
    TArray<FLoomDroppedItem> GetLastRollByRarity(ELoomLootRarity Rarity) const;

    /** Total quantity received for an item this session. */
    UFUNCTION(BlueprintPure, Category = "Loot")
    int32 GetSessionItemCount(const FString& ItemId) const;

    // ── Delegates ─────────────────────────────────────────────────

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnLootRollReceived,
        FLoomLootRoll, Roll);
    /** Fired once per roll with the full item list. */
    UPROPERTY(BlueprintAssignable, Category = "Loot|Events")
    FOnLootRollReceived OnLootRollReceived;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnItemDropped,
        FLoomDroppedItem, Item, FVector, DropLocation);
    /** Fired once per dropped item — drives per-item audio/HUD popups. */
    UPROPERTY(BlueprintAssignable, Category = "Loot|Events")
    FOnItemDropped OnItemDropped;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnRareItemDropped,
        FLoomDroppedItem, Item, FVector, DropLocation);
    /** Filtered alias: only fires for Rare/Epic/Legendary/Artifact. */
    UPROPERTY(BlueprintAssignable, Category = "Loot|Events")
    FOnRareItemDropped OnRareItemDropped;

private:
    void SpawnItemVFX(ELoomLootRarity Rarity, const FVector& Location);
};
