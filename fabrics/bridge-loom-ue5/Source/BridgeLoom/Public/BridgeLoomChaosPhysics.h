// BridgeLoomChaosPhysics.h — Chaos Physics integration for destructible terrain
// Manages terrain destruction, siege weapon impacts, and debris simulation.
// Thread: bridge/bridge-loom-ue5/chaos-physics
// Tier: 2

// Copyright Project Loom. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "GeometryCollection/GeometryCollectionComponent.h"
#include "BridgeLoomChaosPhysics.generated.h"

// ── Enums ─────────────────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomDestructionSource : uint8
{
	SiegeCatapult   UMETA(DisplayName = "Siege Catapult"),
	ExplosiveSpell  UMETA(DisplayName = "Explosive Spell"),
	RamImpact       UMETA(DisplayName = "Ram Impact"),
	MiningPick      UMETA(DisplayName = "Mining Pick"),
	Earthquake      UMETA(DisplayName = "Earthquake"),
	Avalanche       UMETA(DisplayName = "Avalanche"),
};

// ── Structs ───────────────────────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomDestructionEvent
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Destruction")
	FVector Origin = FVector::ZeroVector;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Destruction")
	float Radius = 300.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Destruction")
	float Force = 50000.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Destruction")
	ELoomDestructionSource Source = ELoomDestructionSource::ExplosiveSpell;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Destruction")
	bool bCreateCrater = true;

	// Entity that triggered the destruction event
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Destruction")
	FString EntityId;
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomSiegeImpact
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Siege")
	FVector ImpactLocation = FVector::ZeroVector;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Siege")
	FVector ImpactNormal = FVector(0.0f, 0.0f, 1.0f);

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Siege")
	float ImpactEnergy = 100000.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Siege")
	float ProjectileRadius = 50.0f;

	// "catapult" | "cannon" | "ram"
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Siege")
	FString WeaponType;
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomTerrainDamageState
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Terrain")
	FString ChunkId;

	// 1.0 = undamaged, 0.0 = fully destroyed
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Terrain")
	float IntegrityPercent = 1.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Terrain")
	bool bCanRepair = false;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Terrain")
	float RepairProgress = 0.0f;
};

// ── Component ─────────────────────────────────────────────────────

/**
 * UBridgeLoomChaosPhysics — Actor component bridging Loom destruction events
 * to UE5 Chaos Physics Geometry Collection actors.
 *
 * Features:
 *   - Radial impulse trigger on GeometryCollectionComponents within blast radius
 *   - Siege weapon impacts: directional fracture with energy-scaled debris throw
 *   - Server-authoritative terrain integrity tracking and repair ticks
 *   - LOD-based physics radius: full simulation near camera, frozen far away
 *   - Debris lifetime culling to keep active body count bounded
 */
UCLASS(ClassGroup=(Loom), meta=(BlueprintSpawnableComponent))
class BRIDGELOOM_API UBridgeLoomChaosPhysics : public UActorComponent
{
	GENERATED_BODY()

public:
	UBridgeLoomChaosPhysics();

	virtual void BeginPlay() override;
	virtual void TickComponent(float DeltaTime, ELevelTick TickType,
	                           FActorComponentTickFunction* ThisTickFunction) override;

	// -- Destruction API -----------------------------------------------------------

	/** Apply a destruction impulse from a Loom event (e.g. spell explosion). */
	UFUNCTION(BlueprintCallable, Category = "Loom|Physics")
	void ApplyDestructionEvent(const FLoomDestructionEvent& Event);

	/** Apply a directed siege weapon impact fracturing walls and terrain. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Siege")
	void ApplySiegeImpact(const FLoomSiegeImpact& Impact);

	// -- Terrain integrity ---------------------------------------------------------

	/** Update a terrain chunk's integrity and trigger visual material degradation. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Terrain")
	void UpdateTerrainIntegrity(const FLoomTerrainDamageState& State);

	/** Begin a server-authoritative repair sequence for a chunk. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Terrain")
	void BeginRepair(const FString& ChunkId, float RepairRatePerSecond);

	// -- Configuration -------------------------------------------------------------

	/** Full Chaos simulation within this world-space radius of the camera. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Physics")
	float FullPhysicsRadius = 5000.0f;

	/** Bodies beyond this radius are kinematically frozen. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Physics")
	float FrozenRadius = 15000.0f;

	/** Debris older than this is recycled. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Physics")
	float DebrisLifetimeSeconds = 30.0f;

	/** Cap on simultaneously active Chaos radial fields. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Physics")
	int32 MaxActiveFields = 8;

	// -- Delegates -----------------------------------------------------------------

	DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(
		FOnChunkDestroyed, FString, ChunkId, FVector, Location);
	UPROPERTY(BlueprintAssignable, Category = "Loom|Physics")
	FOnChunkDestroyed OnChunkDestroyed;

	DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(
		FOnChunkRepaired, FString, ChunkId, float, NewIntegrity);
	UPROPERTY(BlueprintAssignable, Category = "Loom|Physics")
	FOnChunkRepaired OnChunkRepaired;

private:
	TMap<FString, FLoomTerrainDamageState> TerrainIntegrityMap;
	TMap<FString, float> RepairRateMap;	// ChunkId -> repair rate/sec

	// Weak refs to GeometryCollectionComponents registered for blast queries
	TArray<TWeakObjectPtr<UGeometryCollectionComponent>> RegisteredCollections;

	// Age tracker for debris actors (actor ptr -> age in seconds)
	TMap<TWeakObjectPtr<AActor>, float> DebrisAgeMap;

	int32 ActiveFieldCount = 0;

	void RegisterNearbyGeometryCollections();
	void TickRepairs(float DeltaTime);
	void TickDebrisCulling(float DeltaTime);
};
