// Copyright Koydo. All Rights Reserved.
// BridgeLoomSpawnSystem.h — UE5 bridge for spawn-system.ts player and NPC spawning.
//
// spawn-system.ts defines:
//   - SpawnPlayerParams: spawnPointEntityId, playerId, displayName,
//                         meshContentHash, assetName
//   - SpawnNpcParams:    extends player params + tier (0-3)
//   - SpawnResult:       { ok: boolean, entityId: string, reason?: string }
//
// UE5 bridge strategy:
//   - RequestSpawnPlayer / RequestSpawnNpc fire outbound delegates
//     (transport executes the actual spawn).
//   - NotifySpawnResult / NotifySpawnFailed deliver outcomes to Blueprints.
//   - NPC tier is represented as a uint8 clamped 0-3.

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomSpawnSystem.generated.h"

// ─── Enums ────────────────────────────────────────────────────────

/** NPC tier mirrors spawn-system.ts tier 0-3. */
UENUM(BlueprintType)
enum class ELoomNpcTier : uint8
{
    Common   = 0 UMETA(DisplayName = "Common"),
    Uncommon = 1 UMETA(DisplayName = "Uncommon"),
    Rare     = 2 UMETA(DisplayName = "Rare"),
    Elite    = 3 UMETA(DisplayName = "Elite"),
};

// ─── Structs ──────────────────────────────────────────────────────

/** Parameters to spawn a player character. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomSpawnPlayerParams
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, Category = "Spawn")
    FString SpawnPointEntityId;

    UPROPERTY(BlueprintReadWrite, Category = "Spawn")
    FString PlayerId;

    UPROPERTY(BlueprintReadWrite, Category = "Spawn")
    FString DisplayName;

    UPROPERTY(BlueprintReadWrite, Category = "Spawn")
    FString MeshContentHash;

    UPROPERTY(BlueprintReadWrite, Category = "Spawn")
    FString AssetName;
};

/** Parameters to spawn an NPC — extends player params with an NPC tier. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomSpawnNpcParams
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, Category = "Spawn")
    FString SpawnPointEntityId;

    UPROPERTY(BlueprintReadWrite, Category = "Spawn")
    FString NpcId;

    UPROPERTY(BlueprintReadWrite, Category = "Spawn")
    FString DisplayName;

    UPROPERTY(BlueprintReadWrite, Category = "Spawn")
    FString MeshContentHash;

    UPROPERTY(BlueprintReadWrite, Category = "Spawn")
    FString AssetName;

    UPROPERTY(BlueprintReadWrite, Category = "Spawn")
    ELoomNpcTier Tier = ELoomNpcTier::Common;
};

/** Result of a spawn attempt. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomSpawnResult
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Spawn")
    bool bOk = false;

    UPROPERTY(BlueprintReadOnly, Category = "Spawn")
    FString EntityId;

    /** Populated on failure. Empty on success. */
    UPROPERTY(BlueprintReadOnly, Category = "Spawn")
    FString Reason;
};

// ─── Component ────────────────────────────────────────────────────

/**
 * UBridgeLoomSpawnSystem — ActorComponent bridging spawn-system.ts
 * player and NPC spawn requests/results to Blueprints.
 *
 * Attach to a Game Mode or dedicated spawn manager Actor.
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent),
       DisplayName = "Loom Spawn System")
class BRIDGELOOM_API UBridgeLoomSpawnSystem : public UActorComponent
{
    GENERATED_BODY()

public:
    UBridgeLoomSpawnSystem();

    // ── State ─────────────────────────────────────────────────────

    UPROPERTY(BlueprintReadOnly, Category = "Spawn")
    TArray<FLoomSpawnResult> RecentResults;

    /** Cap on how many recent results to retain in the local ring buffer. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spawn")
    int32 MaxResultHistory = 32;

    // ── Outbound (game → transport) ───────────────────────────────

    UFUNCTION(BlueprintCallable, Category = "Spawn")
    void RequestSpawnPlayer(const FLoomSpawnPlayerParams& Params);

    UFUNCTION(BlueprintCallable, Category = "Spawn")
    void RequestSpawnNpc(const FLoomSpawnNpcParams& Params);

    // ── Inbound (transport → game) ────────────────────────────────

    UFUNCTION(BlueprintCallable, Category = "Spawn")
    void NotifySpawnResult(const FLoomSpawnResult& Result);

    UFUNCTION(BlueprintCallable, Category = "Spawn")
    void NotifySpawnFailed(const FString& Reason);

    // ── Queries ───────────────────────────────────────────────────

    UFUNCTION(BlueprintPure, Category = "Spawn")
    bool HasEntityBeenSpawned(const FString& EntityId) const;

    // ── Delegates ─────────────────────────────────────────────────

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnSpawnPlayerRequested,
        FLoomSpawnPlayerParams, Params);
    UPROPERTY(BlueprintAssignable, Category = "Spawn|Requests")
    FOnSpawnPlayerRequested OnSpawnPlayerRequested;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnSpawnNpcRequested,
        FLoomSpawnNpcParams, Params);
    UPROPERTY(BlueprintAssignable, Category = "Spawn|Requests")
    FOnSpawnNpcRequested OnSpawnNpcRequested;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnSpawnCompleted,
        FLoomSpawnResult, Result);
    UPROPERTY(BlueprintAssignable, Category = "Spawn|Events")
    FOnSpawnCompleted OnSpawnCompleted;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnSpawnFailed,
        FString, Reason);
    UPROPERTY(BlueprintAssignable, Category = "Spawn|Events")
    FOnSpawnFailed OnSpawnFailed;
};
