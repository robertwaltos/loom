// BridgeLoomWater.h — UE5 Water Plugin integration for Loom ocean, rivers, waterfalls
// Synchronises Loom world water-simulation data to UE5 WaterBody actors.
// Thread: bridge/bridge-loom-ue5/water
// Tier: 2

// Copyright Project Loom. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomWater.generated.h"

// ── Enums ─────────────────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomWaterBodyType : uint8
{
	Ocean       UMETA(DisplayName = "Ocean"),
	River       UMETA(DisplayName = "River"),
	Lake        UMETA(DisplayName = "Lake"),
	Waterfall   UMETA(DisplayName = "Waterfall"),
	Swamp       UMETA(DisplayName = "Swamp"),
};

// ── Structs ───────────────────────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomOceanState
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Water")
	float WaveAmplitude = 0.5f;		// metres

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Water")
	float WaveFrequency = 0.1f;		// Hz

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Water")
	FVector2D SwellDirection = FVector2D(1.0f, 0.0f);

	// 0 = calm, 1 = storm-like chop
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Water")
	float Choppiness = 0.5f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Water")
	float TurbulenceStrength = 0.2f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Water")
	FLinearColor WaterColor = FLinearColor(0.02f, 0.08f, 0.15f);

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Water")
	float FoamIntensity = 0.3f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Water")
	float WaterTemperature = 15.0f;	// Celsius
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomRiverState
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Water")
	FString RiverId;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Water")
	float FlowSpeed = 200.0f;		// cm/s

	// World-height offset from the river spline base
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Water")
	float WaterLevel = 0.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Water")
	float Turbulence = 0.1f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Water")
	bool bInFlood = false;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Water")
	float FloodLevelOverride = 0.0f;
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomWaterfallState
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Water")
	FString WaterfallId;

	// 0–1 normalised volume
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Water")
	float FlowRate = 1.0f;

	// Set by the Tempest ice-storm system
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Water")
	bool bFrozen = false;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Water")
	float MistRadius = 500.0f;		// mist Niagara FX radius at base
};

// ── Component ─────────────────────────────────────────────────────

/**
 * UBridgeLoomWater — Actor component that synchronises Loom world water
 * simulation state to UE5 Water Plugin actors (WaterBodyOcean, WaterBodyRiver,
 * WaterBodyCustom) and drives Niagara mist/splash effects.
 *
 * Features:
 *   - Ocean material parameter updates (wave height, choppiness, color)
 *   - River flow-speed and flood-level mutations via WaterBody scripting API
 *   - Waterfall flow-rate animation + freeze/thaw transitions
 *   - Simple buoyancy helper for physics objects on Loom-managed water
 */
UCLASS(ClassGroup=(Loom), meta=(BlueprintSpawnableComponent))
class BRIDGELOOM_API UBridgeLoomWater : public UActorComponent
{
	GENERATED_BODY()

public:
	UBridgeLoomWater();

	virtual void BeginPlay() override;
	virtual void TickComponent(float DeltaTime, ELevelTick TickType,
	                           FActorComponentTickFunction* ThisTickFunction) override;

	// -- Ocean ---------------------------------------------------------------------

	UFUNCTION(BlueprintCallable, Category = "Loom|Water")
	void SetOceanState(const FLoomOceanState& State);

	/** Sample the Gerstner wave height at a world XY position. */
	UFUNCTION(BlueprintPure, Category = "Loom|Water")
	float GetOceanHeightAtLocation(const FVector& WorldLocation) const;

	// -- River ---------------------------------------------------------------------

	UFUNCTION(BlueprintCallable, Category = "Loom|Water")
	void UpdateRiverState(const FLoomRiverState& State);

	UFUNCTION(BlueprintCallable, Category = "Loom|Water")
	void TriggerFloodEvent(const FString& RiverId, float PeakFloodLevel, float DurationSeconds);

	// -- Waterfall -----------------------------------------------------------------

	UFUNCTION(BlueprintCallable, Category = "Loom|Water")
	void UpdateWaterfallState(const FLoomWaterfallState& State);

	// -- Buoyancy helper -----------------------------------------------------------

	/** Apply buoyancy force to a rigid-body component based on submersion depth. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Water")
	void ApplyBuoyancyForce(UPrimitiveComponent* Target, float SubmersionDepthCm);

	// -- Configuration -------------------------------------------------------------

	/** Rate at which water physics state is pushed to WaterBody materials. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Water")
	float WaterPhysicsUpdateRateHz = 10.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Water")
	float BuoyancyStrength = 1.0f;

	// -- Delegates -----------------------------------------------------------------

	DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(
		FOnFloodStarted, FString, RiverId, float, FloodLevel);
	UPROPERTY(BlueprintAssignable, Category = "Loom|Water")
	FOnFloodStarted OnFloodStarted;

	DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
		FOnWaterfallFrozen, FString, WaterfallId);
	UPROPERTY(BlueprintAssignable, Category = "Loom|Water")
	FOnWaterfallFrozen OnWaterfallFrozen;

private:
	FLoomOceanState CurrentOceanState;
	TMap<FString, FLoomRiverState>    RiverStates;
	TMap<FString, FLoomWaterfallState> WaterfallStates;
	TMap<FString, float> FloodTimers;	// RiverId -> seconds remaining

	float PhysicsAccumulator = 0.0f;

	void TickWaterPhysics(float DeltaTime);
	void UpdateOceanMaterial();
	void UpdateRiverActors();
	void TickFloodEvents(float DeltaTime);
};
