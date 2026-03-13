// BridgeLoomMassEntity.h — UE5 Mass Entity Framework for 100K+ NPC simulation
// Integrates Loom world-state NPC data with UE5 Mass AI processor pipeline.
// Thread: bridge/bridge-loom-ue5/mass-entity
// Tier: 2

// Copyright Project Loom. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "MassEntityTypes.h"
#include "BridgeLoomMassEntity.generated.h"

// ── Enums ─────────────────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomNPCTier : uint8
{
	Background   UMETA(DisplayName = "Background (LOD 4)"),	// Mass instanced only
	Distant      UMETA(DisplayName = "Distant (LOD 3)"),	// anim instancing
	Mid          UMETA(DisplayName = "Mid (LOD 2)"),		// simplified skeletal
	Near         UMETA(DisplayName = "Near (LOD 1)"),		// full skeletal + cloth
	MetaHuman    UMETA(DisplayName = "MetaHuman (LOD 0)"),	// MetaHuman quality
};

UENUM(BlueprintType)
enum class ELoomNPCBehaviour : uint8
{
	Idle        UMETA(DisplayName = "Idle"),
	Patrol      UMETA(DisplayName = "Patrol"),
	Flee        UMETA(DisplayName = "Flee"),
	Combat      UMETA(DisplayName = "Combat"),
	Merchant    UMETA(DisplayName = "Merchant"),
	Guard       UMETA(DisplayName = "Guard"),
	Ceremony    UMETA(DisplayName = "Ceremony"),
};

// ── Structs ───────────────────────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomNPCSpawnBatch
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Mass")
	TArray<FVector> Locations;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Mass")
	ELoomNPCTier Tier = ELoomNPCTier::Background;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Mass")
	ELoomNPCBehaviour Behaviour = ELoomNPCBehaviour::Idle;

	// Faction tag (e.g. "Empire", "Guild", "Bandit") — drives crowd reactions
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Mass")
	FName Faction = NAME_None;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Mass")
	FString WorldId;
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomNPCStateUpdate
{
	GENERATED_BODY()

	// Mass entity handle serialised as 64-bit int for Loom transport
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Mass")
	int64 EntityHandle = 0;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Mass")
	FVector Location = FVector::ZeroVector;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Mass")
	FRotator Rotation = FRotator::ZeroRotator;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Mass")
	ELoomNPCBehaviour Behaviour = ELoomNPCBehaviour::Idle;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Mass")
	float AnimSpeed = 1.0f;		// locomotion blend speed multiplier
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomMassWorldStats
{
	GENERATED_BODY()

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Loom|Mass")
	int32 TotalEntities = 0;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Loom|Mass")
	int32 ActiveEntities = 0;		// within LOD simulation range

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Loom|Mass")
	int32 MetaHumanOverrideCount = 0;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Loom|Mass")
	float AverageUpdateHz = 0.0f;
};

// ── Component ─────────────────────────────────────────────────────

/**
 * UBridgeLoomMassEntity — Actor component managing the UE5 Mass Entity
 * population for a Loom world.
 *
 * Features:
 *   - Batch-spawn NPC entities from Loom server NPC manifests
 *   - Per-tick state sync for entities within configurable LOD distances
 *   - Automatic LOD tier promotion/demotion based on camera proximity
 *   - MetaHuman override pooling: upgrade nearest N NPCs to full MetaHuman
 *   - Faction-aware behaviour assignment for crowd reaction systems
 *   - Performance stats reported to BridgeLoomSubsystem telemetry
 */
UCLASS(ClassGroup=(Loom), meta=(BlueprintSpawnableComponent))
class BRIDGELOOM_API UBridgeLoomMassEntity : public UActorComponent
{
	GENERATED_BODY()

public:
	UBridgeLoomMassEntity();

	virtual void BeginPlay() override;
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;
	virtual void TickComponent(float DeltaTime, ELevelTick TickType,
	                           FActorComponentTickFunction* ThisTickFunction) override;

	// -- Spawn & despawn -----------------------------------------------------------

	/** Spawn a batch of Mass Entity NPCs from a Loom server manifest. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Mass")
	void SpawnNPCBatch(const FLoomNPCSpawnBatch& Batch);

	/** Despawn all entities for a given world id. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Mass")
	void DespawnWorld(const FString& WorldId);

	// -- State sync ----------------------------------------------------------------

	/** Apply a delta-compressed state update received from the Loom bridge. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Mass")
	void ApplyNPCStateUpdate(const FLoomNPCStateUpdate& Update);

	/** Bulk apply an array of state updates (one FlatBuffer tick). */
	UFUNCTION(BlueprintCallable, Category = "Loom|Mass")
	void ApplyNPCStateBatch(const TArray<FLoomNPCStateUpdate>& Updates);

	// -- LOD management ------------------------------------------------------------

	/** Force an immediate LOD re-evaluation for all entities. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Mass")
	void ReevaluateLODs();

	/** Upgrade the closest N entities to MetaHuman quality override. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Mass")
	void SetMetaHumanOverrideCount(int32 Count);

	// -- Stats ---------------------------------------------------------------------

	UFUNCTION(BlueprintPure, Category = "Loom|Mass")
	FLoomMassWorldStats GetWorldStats() const;

	// -- Configuration -------------------------------------------------------------

	/** Number of Mass entity state updates applied per tick. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Mass")
	int32 MaxUpdatesPerTick = 512;

	/** World-space radii for each LOD band. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Mass")
	TArray<float> LODRadii = { 1500.0f, 5000.0f, 15000.0f, 40000.0f };

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Mass")
	int32 MaxMetaHumanOverrides = 4;

	// -- Delegate ------------------------------------------------------------------

	DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(
		FOnNPCBatchSpawned, FString, WorldId, int32, Count);
	UPROPERTY(BlueprintAssignable, Category = "Loom|Mass")
	FOnNPCBatchSpawned OnNPCBatchSpawned;

private:
	// WorldId -> list of entity handles for that world
	TMap<FString, TArray<FMassEntityHandle>> WorldEntityMap;

	FLoomMassWorldStats CachedStats;
	float StatsUpdateAccumulator = 0.0f;

	void TickLODUpdates(float DeltaTime);
	void TickStats(float DeltaTime);
};
