// BridgeLoomVegetation.h — SpeedTree vegetation, seasonal farming, wildlife rendering
// Manages procedural foliage, crop growth state, and fauna LODs from Loom world data.
// Thread: bridge/bridge-loom-ue5/vegetation
// Tier: 2

// Copyright Project Loom. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Components/HierarchicalInstancedStaticMeshComponent.h"
#include "BridgeLoomVegetation.generated.h"

// ── Enums ─────────────────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomSeason : uint8
{
	Spring  UMETA(DisplayName = "Spring"),
	Summer  UMETA(DisplayName = "Summer"),
	Autumn  UMETA(DisplayName = "Autumn"),
	Winter  UMETA(DisplayName = "Winter"),
};

UENUM(BlueprintType)
enum class ELoomCropStage : uint8
{
	Seedling    UMETA(DisplayName = "Seedling"),
	Growing     UMETA(DisplayName = "Growing"),
	Mature      UMETA(DisplayName = "Mature"),
	Harvestable UMETA(DisplayName = "Harvestable"),
	Fallow      UMETA(DisplayName = "Fallow"),
	Withered    UMETA(DisplayName = "Withered"),
};

// ── Structs ───────────────────────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomFoliageZone
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Foliage")
	FString ZoneId;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Foliage")
	FVector Centre = FVector::ZeroVector;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Foliage")
	float Radius = 5000.0f;

	// 0 = bare, 1 = fully dense
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Foliage")
	float Density = 1.0f;

	// Scales SpeedTree wind animation
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Foliage")
	float WindIntensity = 0.5f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Foliage")
	ELoomSeason Season = ELoomSeason::Summer;
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomCropPlot
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Farming")
	FString PlotId;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Farming")
	FVector Location = FVector::ZeroVector;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Farming")
	FName CropType = NAME_None;		// e.g. "Wheat", "Barley", "Nightshade"

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Farming")
	ELoomCropStage Stage = ELoomCropStage::Fallow;

	// 0–1 growth progress within current stage
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Farming")
	float GrowthProgress = 0.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Farming")
	FString OwnerEntityId;
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomWildlifeSpawn
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Wildlife")
	FVector Location = FVector::ZeroVector;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Wildlife")
	FName Species = NAME_None;		// e.g. "Deer", "Wolf", "Raven"

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Wildlife")
	int32 Count = 1;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Wildlife")
	FString WorldId;
};

// ── Component ─────────────────────────────────────────────────────

/**
 * UBridgeLoomVegetation — Actor component managing UE5 procedural foliage,
 * SpeedTree seasonal transitions, crop growth visualisation, and wildlife LODs.
 *
 * Features:
 *   - Season-driven tree colour morph targets (SpeedTree material params)
 *   - Wind intensity from Loom Tempest system
 *   - Crop plot growth stage updates via HISM instance swapping
 *   - Wildlife AI pawn spawning within configurable density budgets
 *   - Deforestation — remove HISM instances from a radius on destruction events
 */
UCLASS(ClassGroup=(Loom), meta=(BlueprintSpawnableComponent))
class BRIDGELOOM_API UBridgeLoomVegetation : public UActorComponent
{
	GENERATED_BODY()

public:
	UBridgeLoomVegetation();

	virtual void BeginPlay() override;
	virtual void TickComponent(float DeltaTime, ELevelTick TickType,
	                           FActorComponentTickFunction* ThisTickFunction) override;

	// -- Foliage zones -------------------------------------------------------------

	UFUNCTION(BlueprintCallable, Category = "Loom|Foliage")
	void RegisterFoliageZone(const FLoomFoliageZone& Zone);

	UFUNCTION(BlueprintCallable, Category = "Loom|Foliage")
	void UpdateFoliageZone(const FString& ZoneId, float Density,
	                       float WindIntensity, ELoomSeason Season);

	/** Remove foliage instances inside a destruction radius. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Foliage")
	void DeforestRadius(const FVector& Centre, float Radius);

	// -- Crop farming --------------------------------------------------------------

	UFUNCTION(BlueprintCallable, Category = "Loom|Farming")
	void UpdateCropPlot(const FLoomCropPlot& Plot);

	UFUNCTION(BlueprintCallable, Category = "Loom|Farming")
	void HarvestCropPlot(const FString& PlotId);

	// -- Wildlife ------------------------------------------------------------------

	UFUNCTION(BlueprintCallable, Category = "Loom|Wildlife")
	void SpawnWildlife(const FLoomWildlifeSpawn& Spawn);

	UFUNCTION(BlueprintCallable, Category = "Loom|Wildlife")
	void DespawnWildlifeForWorld(const FString& WorldId);

	// -- Season global transition --------------------------------------------------

	/** Trigger a world-wide season change. Foliage zones update over BlendSeconds. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Foliage")
	void SetGlobalSeason(ELoomSeason NewSeason, float BlendSeconds = 5.0f);

	// -- Configuration -------------------------------------------------------------

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Wildlife")
	int32 MaxWildlifePerWorld = 200;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Foliage")
	float FoliageUpdateDistanceMetres = 300.0f;

	// -- Delegates -----------------------------------------------------------------

	DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(
		FOnCropHarvested, FString, PlotId, FName, CropType);
	UPROPERTY(BlueprintAssignable, Category = "Loom|Farming")
	FOnCropHarvested OnCropHarvested;

	DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
		FOnSeasonChanged, ELoomSeason, NewSeason);
	UPROPERTY(BlueprintAssignable, Category = "Loom|Foliage")
	FOnSeasonChanged OnSeasonChanged;

private:
	TMap<FString, FLoomFoliageZone> FoliageZones;
	TMap<FString, FLoomCropPlot>    CropPlots;

	// Wildlife pawns per world
	TMap<FString, TArray<TWeakObjectPtr<AActor>>> WildlifeActors;

	ELoomSeason CurrentSeason      = ELoomSeason::Summer;
	ELoomSeason TargetSeason       = ELoomSeason::Summer;
	float SeasonBlendProgress      = 1.0f;
	float SeasonBlendDuration      = 5.0f;

	// HISM components registered for foliage management (populated at BeginPlay)
	TArray<TWeakObjectPtr<UHierarchicalInstancedStaticMeshComponent>> RegisteredHISMs;

	void TickSeasonBlend(float DeltaTime);
	void ApplySeasonToHISMs(float Alpha);
	void RefreshCropMesh(const FLoomCropPlot& Plot);
};
