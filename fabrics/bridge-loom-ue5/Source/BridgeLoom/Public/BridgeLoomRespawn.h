// Copyright Koydo. All Rights Reserved.
// BridgeLoomRespawn.h — UE5 bridge for the respawn-system.ts death/respawn lifecycle.
//
// respawn-system.ts (priority 175) handles the full death → respawn pipeline:
//   1. Finds entities where health.isAlive === false
//   2. Starts a 3-second respawn timer (configurable via respawnDelayUs)
//   3. Teleports entity to the best available SpawnPointComponent on expiry
//   4. Restores full health and emits a RespawnEvent
//
// UE5 side:
//   - Plays death animation and camera effects on OnEntityDied
//   - Shows respawn countdown UI (3-2-1)
//   - Triggers respawn screen-flash VFX + audio on OnEntityRespawned
//   - Teleports local player camera to the respawn position

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomRespawn.generated.h"

// ─── Structs ───────────────────────────────────────────────────────

/** Tracks an in-progress respawn countdown. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomRespawnTimer
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Respawn")
    FString EntityId;

    /** Unix-ms timestamp of death. */
    UPROPERTY(BlueprintReadOnly, Category = "Respawn")
    int64 DiedAtMs = 0;

    /** Unix-ms timestamp when the entity should be respawned. */
    UPROPERTY(BlueprintReadOnly, Category = "Respawn")
    int64 RespawnAtMs = 0;

    /** Remaining seconds (derived from DiedAtMs/RespawnAtMs, updated by bridge). */
    UPROPERTY(BlueprintReadOnly, Category = "Respawn")
    float RemainingSeconds = 0.0f;
};

/** Authoritative respawn event from the Loom. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomRespawnEvent
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Respawn")
    FString EntityId;

    UPROPERTY(BlueprintReadOnly, Category = "Respawn")
    FString SpawnPointEntityId;

    /** World-space position before death. */
    UPROPERTY(BlueprintReadOnly, Category = "Respawn")
    FVector PreviousPosition = FVector::ZeroVector;

    /** World-space position of the chosen spawn point. */
    UPROPERTY(BlueprintReadOnly, Category = "Respawn")
    FVector RespawnPosition = FVector::ZeroVector;

    /** Microsecond timestamp from Loom clock. */
    UPROPERTY(BlueprintReadOnly, Category = "Respawn")
    int64 TimestampUs = 0;
};

// ─── Component ────────────────────────────────────────────────────

/**
 * UBridgeLoomRespawn — ActorComponent bridging respawn-system.ts events to
 * UE5 death VFX, respawn countdown UI, and camera teleport.
 *
 * Attach to the Player State or Player Controller.
 *
 * Workflow:
 *  1. Server transport receives entity death (health.isAlive → false)
 *     → call NotifyDeath() to start the countdown display.
 *  2. Server transport receives RespawnEvent from respawn-system.ts
 *     → call NotifyRespawn() to teleport and play VFX.
 *  3. Bridge updates the RespawnTimer countdown each Tick for the HUD.
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent),
       DisplayName = "Loom Respawn")
class BRIDGELOOM_API UBridgeLoomRespawn : public UActorComponent
{
    GENERATED_BODY()

public:
    UBridgeLoomRespawn();

    // ── Configuration ─────────────────────────────────────────────

    /** Must match server-side respawnDelayUs / 1e6.  Default: 3 seconds. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Respawn|Config",
              meta = (ClampMin = "0.5", ClampMax = "30.0"))
    float RespawnDelaySeconds = 3.0f;

    /** Niagara burst spawned at the respawn position on respawn. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Respawn|VFX")
    TSoftObjectPtr<class UNiagaraSystem> RespawnVFXTemplate;

    /** Niagara death VFX spawned at the death position. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Respawn|VFX")
    TSoftObjectPtr<class UNiagaraSystem> DeathVFXTemplate;

    // ── State ─────────────────────────────────────────────────────

    UPROPERTY(BlueprintReadOnly, Category = "Respawn")
    bool bIsDead = false;

    UPROPERTY(BlueprintReadOnly, Category = "Respawn")
    FLoomRespawnTimer PendingRespawn;

    // ── Methods ───────────────────────────────────────────────────

    /**
     * Called when health.isAlive transitions to false for the tracked entity.
     * Starts the local countdown and fires OnEntityDied.
     */
    UFUNCTION(BlueprintCallable, Category = "Respawn")
    void NotifyDeath(const FString& EntityId, const FVector& DeathPosition,
                     int64 DiedAtMs);

    /**
     * Called when respawn-system.ts emits a RespawnEvent.
     * Teleports the owner actor, fires VFX, fires OnEntityRespawned.
     */
    UFUNCTION(BlueprintCallable, Category = "Respawn")
    void NotifyRespawn(const FLoomRespawnEvent& RespawnEvent);

    /**
     * Returns remaining countdown seconds (0 if not in respawn).
     * Suitable for driving the HUD countdown display.
     */
    UFUNCTION(BlueprintPure, Category = "Respawn")
    float GetRespawnCountdownSeconds() const;

    // ── Delegates ─────────────────────────────────────────────────

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnEntityDied,
        FString, EntityId, FVector, DeathPosition);

    UPROPERTY(BlueprintAssignable, Category = "Respawn|Events")
    FOnEntityDied OnEntityDied;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnEntityRespawned,
        FLoomRespawnEvent, RespawnEvent);

    UPROPERTY(BlueprintAssignable, Category = "Respawn|Events")
    FOnEntityRespawned OnEntityRespawned;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnCountdownTick,
        FString, EntityId, float, RemainingSeconds);

    /** Fired every tick while waiting to respawn — drives the countdown HUD. */
    UPROPERTY(BlueprintAssignable, Category = "Respawn|Events")
    FOnCountdownTick OnCountdownTick;

    // ── UActorComponent ───────────────────────────────────────────

    virtual void BeginPlay() override;
    virtual void TickComponent(float DeltaTime, ELevelTick TickType,
                               FActorComponentTickFunction* ThisTickFunction) override;

private:
    void SpawnVFXAtLocation(const TSoftObjectPtr<UNiagaraSystem>& Template,
                            const FVector& Location);
};
