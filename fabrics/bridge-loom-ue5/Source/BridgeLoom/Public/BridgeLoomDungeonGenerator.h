// Copyright Koydo. All Rights Reserved.
// BridgeLoomDungeonGenerator.h — UE5 bridge for dungeon-generator.ts procedural layouts.
//
// dungeon-generator.ts defines:
//   - RoomType (10): ENTRY / BOSS / TREASURE / CORRIDOR / PUZZLE / TRAP / REST / MERCHANT / ELITE / SECRET
//   - DifficultyTier: 0-5 (uint8)
//   - DungeonRoom: id, roomType, x, y, width, height, area, enemyBudget, difficultyTier
//   - RoomConnection: fromRoomId, toRoomId, traversalCost, bidirectional
//   - DungeonLayout: layoutId, rooms (map), connections, entryRoomId, bossRoomId, difficultyTier
//   - GenerationParams: minRooms, maxRooms, difficultyTier, minRoomArea, maxRoomArea,
//                       connectionDensity (0-1), secretRoomChance (0-1), treasureRoomCount
//
// UE5 bridge strategy:
//   - RequestGeneration fires OnGenerationRequested (transport executes server-side dungeon gen).
//   - NotifyLayoutReady delivers the full layout graph to Blueprint for tile/mesh placement.
//   - Rooms stored in TMap<FString, FLoomDungeonRoom> for O(1) lookup by room ID.
//   - OnRoomEntered lets the bridge track active entity location within the dungeon.

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomDungeonGenerator.generated.h"

// ─── Enums ────────────────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomRoomType : uint8
{
    Entry    UMETA(DisplayName = "Entry"),
    Boss     UMETA(DisplayName = "Boss"),
    Treasure UMETA(DisplayName = "Treasure"),
    Corridor UMETA(DisplayName = "Corridor"),
    Puzzle   UMETA(DisplayName = "Puzzle"),
    Trap     UMETA(DisplayName = "Trap"),
    Rest     UMETA(DisplayName = "Rest"),
    Merchant UMETA(DisplayName = "Merchant"),
    Elite    UMETA(DisplayName = "Elite"),
    Secret   UMETA(DisplayName = "Secret"),
};

// ─── Structs ──────────────────────────────────────────────────────

/** Parameters passed to the server-side dungeon generator. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomGenerationParams
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, Category = "Dungeon")
    int32 MinRooms = 10;

    UPROPERTY(BlueprintReadWrite, Category = "Dungeon")
    int32 MaxRooms = 30;

    UPROPERTY(BlueprintReadWrite, Category = "Dungeon")
    uint8 DifficultyTier = 1;

    UPROPERTY(BlueprintReadWrite, Category = "Dungeon")
    int32 MinRoomArea = 20;

    UPROPERTY(BlueprintReadWrite, Category = "Dungeon")
    int32 MaxRoomArea = 100;

    /** Fraction of cross-edges added beyond the spanning tree [0, 1]. */
    UPROPERTY(BlueprintReadWrite, Category = "Dungeon")
    float ConnectionDensity = 0.3f;

    /** Probability that any eligible room becomes a secret room [0, 1]. */
    UPROPERTY(BlueprintReadWrite, Category = "Dungeon")
    float SecretRoomChance = 0.1f;

    UPROPERTY(BlueprintReadWrite, Category = "Dungeon")
    int32 TreasureRoomCount = 2;

    /** Optional seed passed to the server; 0 = random. */
    UPROPERTY(BlueprintReadWrite, Category = "Dungeon")
    int64 Seed = 0;

    /** Caller-assigned request ID for correlation with OnGenerationRequested. */
    UPROPERTY(BlueprintReadWrite, Category = "Dungeon")
    FString RequestId;
};

/** A single room in the generated dungeon. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomDungeonRoom
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Dungeon")
    FString RoomId;

    UPROPERTY(BlueprintReadOnly, Category = "Dungeon")
    ELoomRoomType RoomType = ELoomRoomType::Corridor;

    UPROPERTY(BlueprintReadOnly, Category = "Dungeon")
    int32 X = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Dungeon")
    int32 Y = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Dungeon")
    int32 Width = 5;

    UPROPERTY(BlueprintReadOnly, Category = "Dungeon")
    int32 Height = 5;

    UPROPERTY(BlueprintReadOnly, Category = "Dungeon")
    int32 Area = 25;

    UPROPERTY(BlueprintReadOnly, Category = "Dungeon")
    int32 EnemyBudget = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Dungeon")
    uint8 DifficultyTier = 1;

    UPROPERTY(BlueprintReadOnly, Category = "Dungeon")
    int64 CreatedAtUs = 0;
};

/** Directed (or bi-directional) connection between two rooms. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomRoomConnection
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Dungeon")
    FString FromRoomId;

    UPROPERTY(BlueprintReadOnly, Category = "Dungeon")
    FString ToRoomId;

    UPROPERTY(BlueprintReadOnly, Category = "Dungeon")
    float TraversalCost = 1.0f;

    UPROPERTY(BlueprintReadOnly, Category = "Dungeon")
    bool bBidirectional = true;
};

/** A full dungeon layout graph. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomDungeonLayout
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Dungeon")
    FString LayoutId;

    UPROPERTY(BlueprintReadOnly, Category = "Dungeon")
    TMap<FString, FLoomDungeonRoom> Rooms;

    UPROPERTY(BlueprintReadOnly, Category = "Dungeon")
    TArray<FLoomRoomConnection> Connections;

    UPROPERTY(BlueprintReadOnly, Category = "Dungeon")
    FString EntryRoomId;

    UPROPERTY(BlueprintReadOnly, Category = "Dungeon")
    FString BossRoomId;

    UPROPERTY(BlueprintReadOnly, Category = "Dungeon")
    uint8 DifficultyTier = 1;

    UPROPERTY(BlueprintReadOnly, Category = "Dungeon")
    int64 CreatedAtUs = 0;
};

// ─── Component ────────────────────────────────────────────────────

/**
 * UBridgeLoomDungeonGenerator — ActorComponent bridging dungeon-generator.ts
 * procedural layout results to UE5 Blueprint tile/mesh placement systems.
 *
 * Attach to a Game Mode or dungeon manager Actor.
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent),
       DisplayName = "Loom Dungeon Generator")
class BRIDGELOOM_API UBridgeLoomDungeonGenerator : public UActorComponent
{
    GENERATED_BODY()

public:
    UBridgeLoomDungeonGenerator();

    // ── State ─────────────────────────────────────────────────────

    UPROPERTY(BlueprintReadOnly, Category = "Dungeon")
    FLoomDungeonLayout CurrentLayout;

    UPROPERTY(BlueprintReadOnly, Category = "Dungeon")
    bool bHasLayout = false;

    // ── Outbound (game → transport) ───────────────────────────────

    /** Submit generation parameters to the server. */
    UFUNCTION(BlueprintCallable, Category = "Dungeon")
    FString RequestGeneration(const FLoomGenerationParams& Params);

    // ── Inbound (transport → game) ────────────────────────────────

    /** Deliver a fully-generated dungeon layout. */
    UFUNCTION(BlueprintCallable, Category = "Dungeon")
    void NotifyLayoutReady(const FLoomDungeonLayout& Layout);

    /** Called when generation failed (e.g., impossible constraint set). */
    UFUNCTION(BlueprintCallable, Category = "Dungeon")
    void NotifyGenerationFailed(const FString& Reason);

    /** Track which room an entity just entered (for fog-of-war, triggers, etc.). */
    UFUNCTION(BlueprintCallable, Category = "Dungeon")
    void NotifyRoomEntered(const FString& EntityId, const FString& RoomId);

    // ── Queries ───────────────────────────────────────────────────

    UFUNCTION(BlueprintPure, Category = "Dungeon")
    bool GetRoom(const FString& RoomId, FLoomDungeonRoom& OutRoom) const;

    UFUNCTION(BlueprintPure, Category = "Dungeon")
    TArray<FLoomDungeonRoom> GetRoomsByType(ELoomRoomType RoomType) const;

    UFUNCTION(BlueprintPure, Category = "Dungeon")
    int32 GetRoomCount() const;

    // ── Delegates ─────────────────────────────────────────────────

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnGenerationRequested,
        FLoomGenerationParams, Params);
    UPROPERTY(BlueprintAssignable, Category = "Dungeon|Requests")
    FOnGenerationRequested OnGenerationRequested;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnLayoutReady,
        FLoomDungeonLayout, Layout);
    UPROPERTY(BlueprintAssignable, Category = "Dungeon|Events")
    FOnLayoutReady OnLayoutReady;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnGenerationFailed,
        FString, Reason);
    UPROPERTY(BlueprintAssignable, Category = "Dungeon|Events")
    FOnGenerationFailed OnGenerationFailed;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(FOnRoomEntered,
        FString, EntityId, FString, RoomId, ELoomRoomType, RoomType);
    UPROPERTY(BlueprintAssignable, Category = "Dungeon|Events")
    FOnRoomEntered OnRoomEntered;

private:
    int32 NextRequestCounter = 0;
};
