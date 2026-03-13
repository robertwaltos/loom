// BridgeLoomCrowdSim.h — Crowd simulation and NPC pathfinding driven by Loom events
// Manages Navigation Mesh queries, crowd flows, and faction panic responses.
// Thread: bridge/bridge-loom-ue5/crowd-sim
// Tier: 2

// Copyright Project Loom. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "NavigationSystem.h"
#include "BridgeLoomCrowdSim.generated.h"

// ── Enums ─────────────────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomCrowdFlowType : uint8
{
	Idle        UMETA(DisplayName = "Idle Milling"),
	Procession  UMETA(DisplayName = "Procession"),
	MarketDay   UMETA(DisplayName = "Market Day"),
	Evacuation  UMETA(DisplayName = "Evacuation"),
	Battle      UMETA(DisplayName = "Battle Surge"),
	Panic       UMETA(DisplayName = "Panic Flee"),
	Celebration UMETA(DisplayName = "Celebration"),
};

UENUM(BlueprintType)
enum class ELoomCrowdDensity : uint8
{
	Sparse   UMETA(DisplayName = "Sparse"),
	Moderate UMETA(DisplayName = "Moderate"),
	Dense    UMETA(DisplayName = "Dense"),
	Packed   UMETA(DisplayName = "Packed"),
};

// ── Structs ───────────────────────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomCrowdZone
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Crowd")
	FString ZoneId;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Crowd")
	FVector CentreLocation = FVector::ZeroVector;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Crowd")
	float Radius = 2000.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Crowd")
	ELoomCrowdFlowType FlowType = ELoomCrowdFlowType::Idle;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Crowd")
	ELoomCrowdDensity Density = ELoomCrowdDensity::Moderate;

	// Faction that populates this zone (matches NPC faction tags)
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Crowd")
	FName Faction = NAME_None;
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomPanicEvent
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Crowd")
	FVector Origin = FVector::ZeroVector;

	// All zones within this radius switch to Panic flow
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Crowd")
	float PanicRadius = 3000.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Crowd")
	float DurationSeconds = 30.0f;

	// Threat facing direction (crowds flee away from this vector)
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Crowd")
	FVector ThreatDirection = FVector::ZeroVector;
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomCrowdPath
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Crowd")
	FString PathId;

	// Ordered waypoints; crowd agents cycle through these
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Crowd")
	TArray<FVector> Waypoints;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Crowd")
	bool bLoop = true;
};

// ── Component ─────────────────────────────────────────────────────

/**
 * UBridgeLoomCrowdSim — Actor component driving UE5 crowd simulation
 * from Loom world events.
 *
 * Features:
 *   - Zone-based crowd flow type transitions (idle, procession, panic)
 *   - Server-sent panic events propagate outward as a wave
 *   - Shared NavMesh path caching to reduce per-agent path queries
 *   - Density-based agent spacing via Navigation Avoidance
 *   - Market / celebration / procession waypoint tracks
 */
UCLASS(ClassGroup=(Loom), meta=(BlueprintSpawnableComponent))
class BRIDGELOOM_API UBridgeLoomCrowdSim : public UActorComponent
{
	GENERATED_BODY()

public:
	UBridgeLoomCrowdSim();

	virtual void BeginPlay() override;
	virtual void TickComponent(float DeltaTime, ELevelTick TickType,
	                           FActorComponentTickFunction* ThisTickFunction) override;

	// -- Zone management -----------------------------------------------------------

	/** Register a named crowd zone (may be called as zones are streamed in). */
	UFUNCTION(BlueprintCallable, Category = "Loom|Crowd")
	void RegisterCrowdZone(const FLoomCrowdZone& Zone);

	/** Update an existing zone's flow type and density. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Crowd")
	void UpdateCrowdZone(const FString& ZoneId, ELoomCrowdFlowType FlowType,
	                     ELoomCrowdDensity Density);

	UFUNCTION(BlueprintCallable, Category = "Loom|Crowd")
	void RemoveCrowdZone(const FString& ZoneId);

	// -- Panic events --------------------------------------------------------------

	/** Broadcast a panic event — switches nearby zones to Panic flow. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Crowd")
	void TriggerPanicEvent(const FLoomPanicEvent& Event);

	// -- Paths ---------------------------------------------------------------------

	UFUNCTION(BlueprintCallable, Category = "Loom|Crowd")
	void RegisterCrowdPath(const FLoomCrowdPath& Path);

	UFUNCTION(BlueprintCallable, Category = "Loom|Crowd")
	void UnregisterCrowdPath(const FString& PathId);

	// -- NavMesh helpers -----------------------------------------------------------

	/** Sample a random reachable point inside a zone for idle milling. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Crowd")
	bool SampleRandomPointInZone(const FString& ZoneId, FVector& OutLocation) const;

	/** Get the flee direction from a panic origin for a given agent location. */
	UFUNCTION(BlueprintPure, Category = "Loom|Crowd")
	FVector GetFleeDirection(const FVector& AgentLocation, const FVector& ThreatOrigin) const;

	// -- Configuration -------------------------------------------------------------

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Crowd")
	float MaxNavQueryRadius = 500.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Crowd")
	float PanicDecayRatePerSecond = 0.05f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Crowd")
	int32 MaxCrowdZones = 64;

	// -- Delegates -----------------------------------------------------------------

	DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(
		FOnZoneFlowChanged, FString, ZoneId, ELoomCrowdFlowType, NewFlowType);
	UPROPERTY(BlueprintAssignable, Category = "Loom|Crowd")
	FOnZoneFlowChanged OnZoneFlowChanged;

private:
	TMap<FString, FLoomCrowdZone>  CrowdZones;
	TMap<FString, FLoomCrowdPath>  CrowdPaths;

	// Active panics: origin -> seconds remaining
	TArray<TTuple<FLoomPanicEvent, float>> ActivePanics;

	void TickPanics(float DeltaTime);
	void PropagateFlowType(const FVector& Origin, float Radius, ELoomCrowdFlowType FlowType);
};
