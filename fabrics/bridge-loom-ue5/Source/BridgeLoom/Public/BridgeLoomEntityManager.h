// Copyright Project Loom. All Rights Reserved.
// Thread: bridge/bridge-loom-ue5/entity-manager
// Tier: 1
//
// Entity Manager for the Bridge Loom.
//
// Owns the visual lifecycle of all Loom entities on the UE5 side.
// Receives server-authoritative entity state snapshots and
// interpolates between them for smooth rendering at 60 + fps.
//
// NPC tier representation:
//   Tier 1 (Crowd)  → Mass Entity proxy (no individual actors)
//   Tier 2 (Mid)    → Lightweight skeletal mesh actor
//   Tier 3 (NPC)    → Full skeletal mesh + MetaHuman (LOD-gated)
//   Tier 4 (Hero)   → Full MetaHuman + RigLogic + Groom
//
// UE5.5 patterns used:
//   - AActor pooling for frequently spawned entities
//   - Mass Entity for crowd NPCs
//   - FWorldPartitionStreamingSource for relevance
//   - Soft object references for deferred asset loading

#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "GameplayTagContainer.h"
#include "BridgeLoomEntityManager.generated.h"

class UBridgeLoomConnection;
class UBridgeLoomMetaHuman;

// ── Entity representation tier ──────────────────────────────────

UENUM(BlueprintType)
enum class ELoomEntityTier : uint8
{
	/** Mass Entity proxy — no individual actor */
	Crowd		UMETA(DisplayName = "Crowd (Mass Entity)"),
	/** Lightweight skeletal mesh */
	Mid			UMETA(DisplayName = "Mid (Skeletal Mesh)"),
	/** Full skeletal mesh with optional MetaHuman */
	NPC			UMETA(DisplayName = "NPC (Full Mesh + MetaHuman)"),
	/** Hero NPC — always full MetaHuman + RigLogic + Groom */
	Hero		UMETA(DisplayName = "Hero (MetaHuman + RigLogic)")
};

// ── Snapshot for entity interpolation ──────────────────────────

USTRUCT(BlueprintType)
struct FLoomEntitySnapshot
{
	GENERATED_BODY()

	UPROPERTY()
	FVector Location = FVector::ZeroVector;

	UPROPERTY()
	FQuat Rotation = FQuat::Identity;

	UPROPERTY()
	FVector Velocity = FVector::ZeroVector;

	UPROPERTY()
	float Scale = 1.0f;

	UPROPERTY()
	FName AnimationState;

	UPROPERTY()
	float AnimBlendAlpha = 1.0f;

	/** Server timestamp in microseconds (KALON) */
	UPROPERTY()
	int64 TimestampUs = 0;
};

// ── Tracked entity record ──────────────────────────────────────

USTRUCT()
struct FLoomTrackedEntity
{
	GENERATED_BODY()

	UPROPERTY()
	FString EntityId;

	UPROPERTY()
	ELoomEntityTier Tier = ELoomEntityTier::Mid;

	UPROPERTY()
	FGameplayTagContainer Tags;

	/** Previous snapshot for interpolation source */
	FLoomEntitySnapshot PreviousSnapshot;

	/** Target snapshot for interpolation destination */
	FLoomEntitySnapshot TargetSnapshot;

	/** Spawned actor (nullptr for Crowd tier) */
	UPROPERTY()
	TWeakObjectPtr<AActor> SpawnedActor;

	/** MetaHuman component (only for NPC/Hero tiers) */
	UPROPERTY()
	TWeakObjectPtr<UBridgeLoomMetaHuman> MetaHumanComponent;

	/** Time since last snapshot received */
	float InterpolationAlpha = 0.0f;

	/** Interpolation duration derived from snapshot interval */
	float InterpolationDuration = 0.033f; // ~30Hz default
};

// ── Entity Manager Subsystem ────────────────────────────────────

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(
	FOnLoomEntitySpawned, const FString&, EntityId, AActor*, Actor);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
	FOnLoomEntityDespawned, const FString&, EntityId);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(
	FOnLoomEntityTierChanged, const FString&, EntityId,
	ELoomEntityTier, NewTier);

/**
 * UBridgeLoomEntityManager
 *
 * GameInstance subsystem that manages the visual representation
 * of all Loom entities in the UE5 world.
 *
 * Key responsibilities:
 *   1. Receive spawn/despawn messages from BridgeLoomConnection
 *   2. Select appropriate visual tier for each entity
 *   3. Interpolate between server snapshots for smooth motion
 *   4. Manage actor pool for efficient spawn/despawn
 *   5. Coordinate with Mass Entity for crowd NPCs
 */
UCLASS()
class BRIDGELOOM_API UBridgeLoomEntityManager : public UGameInstanceSubsystem
{
	GENERATED_BODY()

public:
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;
	virtual void Deinitialize() override;

	// ── Entity lifecycle ────────────────────────────────────────

	/** Spawn or register a new entity. Called from connection subsystem. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Entities")
	AActor* SpawnEntity(
		const FString& EntityId,
		ELoomEntityTier Tier,
		const FTransform& InitialTransform,
		const FString& MeshAssetPath,
		const FString& MetaHumanPreset,
		const FGameplayTagContainer& Tags);

	/** Despawn and clean up an entity */
	UFUNCTION(BlueprintCallable, Category = "Loom|Entities")
	void DespawnEntity(const FString& EntityId);

	/** Apply a new state snapshot (called at server tick rate) */
	UFUNCTION(BlueprintCallable, Category = "Loom|Entities")
	void ApplySnapshot(const FString& EntityId,
		const FLoomEntitySnapshot& Snapshot);

	/** Promote or demote an entity's visual tier */
	UFUNCTION(BlueprintCallable, Category = "Loom|Entities")
	void ChangeTier(const FString& EntityId, ELoomEntityTier NewTier);

	// ── Queries ─────────────────────────────────────────────────

	UFUNCTION(BlueprintPure, Category = "Loom|Entities")
	bool IsEntityTracked(const FString& EntityId) const;

	UFUNCTION(BlueprintPure, Category = "Loom|Entities")
	int32 GetTrackedEntityCount() const;

	UFUNCTION(BlueprintPure, Category = "Loom|Entities")
	int32 GetActiveMetaHumanCount() const;

	UFUNCTION(BlueprintPure, Category = "Loom|Entities")
	AActor* GetEntityActor(const FString& EntityId) const;

	// ── Delegates ───────────────────────────────────────────────

	UPROPERTY(BlueprintAssignable, Category = "Loom|Entities")
	FOnLoomEntitySpawned OnEntitySpawned;

	UPROPERTY(BlueprintAssignable, Category = "Loom|Entities")
	FOnLoomEntityDespawned OnEntityDespawned;

	UPROPERTY(BlueprintAssignable, Category = "Loom|Entities")
	FOnLoomEntityTierChanged OnEntityTierChanged;

	// ── Configuration ───────────────────────────────────────────

	/** Maximum actors in the spawn pool per mesh type */
	UPROPERTY(EditAnywhere, Category = "Loom|Entities")
	int32 MaxPoolSizePerType = 50;

	/** Maximum simultaneous MetaHuman instances (GPU budget) */
	UPROPERTY(EditAnywhere, Category = "Loom|Entities")
	int32 MaxMetaHumanInstances = 20;

	/** Interpolation smoothing factor for snapshot blending */
	UPROPERTY(EditAnywhere, Category = "Loom|Entities")
	float InterpolationSmoothing = 0.1f;

protected:
	friend class FBridgeLoomEntityManagerTicker;

	/** Called each frame to interpolate all tracked entities */
	void TickInterpolation(float DeltaTime);

	/** Apply interpolated transform to a tracked entity */
	void ApplyInterpolatedTransform(FLoomTrackedEntity& Entity,
		float Alpha);

private:
	/** All tracked entities keyed by Loom entity ID */
	TMap<FString, FLoomTrackedEntity> TrackedEntities;

	/** Actor pool: mesh path → available actors */
	TMap<FString, TArray<TWeakObjectPtr<AActor>>> ActorPool;

	/** Current active MetaHuman count for budget enforcement */
	int32 ActiveMetaHumanCount = 0;

	/** Ticker delegate handle */
	FDelegateHandle TickDelegateHandle;

	/** Retrieve or spawn a pooled actor */
	AActor* AcquireFromPool(const FString& MeshAssetPath,
		const FTransform& Transform);

	/** Return actor to pool instead of destroying */
	void ReturnToPool(const FString& MeshAssetPath, AActor* Actor);

	/** Attach MetaHuman component to an actor */
	UBridgeLoomMetaHuman* AttachMetaHuman(AActor* Actor,
		const FString& PresetName, ELoomEntityTier Tier,
		const FGameplayTagContainer& Tags);
};
