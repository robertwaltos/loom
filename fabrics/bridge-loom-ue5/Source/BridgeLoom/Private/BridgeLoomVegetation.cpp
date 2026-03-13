// Copyright Project Loom. All Rights Reserved.

#include "BridgeLoomVegetation.h"
#include "Components/HierarchicalInstancedStaticMeshComponent.h"
#include "Kismet/GameplayStatics.h"
#include "Engine/World.h"

// ── Constructor ──────────────────────────────────────────────────

UBridgeLoomVegetation::UBridgeLoomVegetation()
{
	PrimaryComponentTick.bCanEverTick = true;
	bTickInEditor = false;
}

// ── Lifecycle ────────────────────────────────────────────────────

void UBridgeLoomVegetation::BeginPlay()
{
	Super::BeginPlay();
	// Start with the default season already applied at alpha 1
	ApplySeasonToHISMs(1.0f);
}

void UBridgeLoomVegetation::TickComponent(float DeltaTime,
                                           ELevelTick TickType,
                                           FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);
	TickSeasonBlend(DeltaTime);
}

// ── Foliage zones ────────────────────────────────────────────────

void UBridgeLoomVegetation::RegisterFoliageZone(const FLoomFoliageZone& Zone)
{
	FoliageZones.Add(Zone.ZoneId, Zone);
}

void UBridgeLoomVegetation::UpdateFoliageZone(const FLoomFoliageZone& Zone)
{
	FoliageZones.Add(Zone.ZoneId, Zone); // overwrite
}

void UBridgeLoomVegetation::DeforestRadius(const FVector& Centre, float Radius)
{
	for (auto& [ZoneId, Zone] : FoliageZones)
	{
		if (UHierarchicalInstancedStaticMeshComponent* HISM = Zone.HISM.Get())
		{
			// Gather all overlapping instances and remove them in one call
			const FSphere Sphere(Centre, Radius);
			TArray<int32> Instances = HISM->GetInstancesOverlappingSphere(Centre, Radius, true);
			if (Instances.Num() > 0)
			{
				HISM->RemoveInstances(Instances);
			}
		}
	}
}

// ── Crop plots ───────────────────────────────────────────────────

void UBridgeLoomVegetation::UpdateCropPlot(const FLoomCropPlot& Plot)
{
	CropPlots.Add(Plot.PlotId, Plot);
	RefreshCropMesh(Plot);
}

void UBridgeLoomVegetation::HarvestCropPlot(const FString& PlotId)
{
	if (FLoomCropPlot* Plot = CropPlots.Find(PlotId))
	{
		const FLoomCropPlot Snapshot = *Plot;
		Plot->Stage = ELoomCropStage::Fallow;
		RefreshCropMesh(*Plot);
		OnCropHarvested.Broadcast(PlotId, Snapshot.Stage);
	}
}

void UBridgeLoomVegetation::RefreshCropMesh(const FLoomCropPlot& Plot)
{
	// Find the matching foliage zone to update its HISM stage meshes
	FLoomFoliageZone* Zone = FoliageZones.Find(Plot.ZoneId);
	if (!Zone || !Zone->HISM.IsValid()) return;

	UHierarchicalInstancedStaticMeshComponent* HISM = Zone->HISM.Get();

	// Swap to stage-specific mesh if assigned in the CropMeshPerStage map
	if (const UStaticMesh* const* Stage = Zone->CropMeshPerStage.Find(
		        static_cast<uint8>(Plot.Stage)))
	{
		HISM->SetStaticMesh(const_cast<UStaticMesh*>(*Stage));
		HISM->MarkRenderStateDirty();
	}
}

// ── Wildlife ────────────────────────────────────────────────────

void UBridgeLoomVegetation::SpawnWildlife(const FLoomWildlifeSpawn& Spawn)
{
	if (!Spawn.ActorClass || !GetWorld()) return;

	TArray<TWeakObjectPtr<AActor>>& Actors = WildlifeActors.FindOrAdd(Spawn.WorldId);

	for (int32 i = 0; i < Spawn.Count; ++i)
	{
		// Scatter around the origin within SpreadRadius
		const float Angle    = FMath::RandRange(0.0f, 360.0f) * (PI / 180.0f);
		const float Distance = FMath::RandRange(0.0f, Spawn.SpreadRadius);
		const FVector Offset(FMath::Cos(Angle) * Distance, FMath::Sin(Angle) * Distance, 0.0f);

		FActorSpawnParameters Params;
		Params.SpawnCollisionHandlingOverride =
			ESpawnActorCollisionHandlingMethod::AdjustIfPossibleButAlwaysSpawn;

		AActor* SpawnedActor = GetWorld()->SpawnActor<AActor>(
			Spawn.ActorClass,
			Spawn.Origin + Offset,
			FRotator(0.0f, FMath::RandRange(0.0f, 360.0f), 0.0f),
			Params);

		if (SpawnedActor)
		{
			Actors.Add(SpawnedActor);
		}
	}
}

void UBridgeLoomVegetation::DespawnWildlifeForWorld(const FString& WorldId)
{
	TArray<TWeakObjectPtr<AActor>>* Actors = WildlifeActors.Find(WorldId);
	if (!Actors) return;

	for (TWeakObjectPtr<AActor>& Ref : *Actors)
	{
		if (Ref.IsValid())
		{
			Ref->Destroy();
		}
	}
	WildlifeActors.Remove(WorldId);
}

// ── Season ───────────────────────────────────────────────────────

void UBridgeLoomVegetation::SetGlobalSeason(ELoomSeason Season, float BlendSeconds)
{
	TargetSeason        = Season;
	SeasonBlendProgress = 0.0f;
	SeasonBlendDuration = FMath::Max(BlendSeconds, KINDA_SMALL_NUMBER);
	OnSeasonChanged.Broadcast(Season);
}

void UBridgeLoomVegetation::TickSeasonBlend(float DeltaTime)
{
	if (SeasonBlendProgress >= 1.0f) return;

	SeasonBlendProgress =
		FMath::Clamp(SeasonBlendProgress + DeltaTime / SeasonBlendDuration, 0.0f, 1.0f);

	ApplySeasonToHISMs(SeasonBlendProgress);
}

void UBridgeLoomVegetation::ApplySeasonToHISMs(float Alpha)
{
	static const TMap<ELoomSeason, FLinearColor> SeasonTints = {
		{ ELoomSeason::Spring, FLinearColor(0.4f,  0.85f, 0.3f)  },
		{ ELoomSeason::Summer, FLinearColor(0.25f, 0.70f, 0.2f)  },
		{ ELoomSeason::Autumn, FLinearColor(0.80f, 0.40f, 0.05f) },
		{ ELoomSeason::Winter, FLinearColor(0.85f, 0.90f, 1.0f)  },
	};

	const FLinearColor* Target = SeasonTints.Find(TargetSeason);
	if (!Target) return;

	for (auto& [ZoneId, Zone] : FoliageZones)
	{
		if (UHierarchicalInstancedStaticMeshComponent* HISM = Zone.HISM.Get())
		{
			const int32 MatCount = HISM->GetNumMaterials();
			for (int32 mi = 0; mi < MatCount; ++mi)
			{
				if (UMaterialInstanceDynamic* MID =
					    Cast<UMaterialInstanceDynamic>(HISM->GetMaterial(mi)))
				{
					MID->SetVectorParameterValue(TEXT("SeasonTint"),
					                             FMath::Lerp(FLinearColor::White, *Target, Alpha));
					MID->SetScalarParameterValue(TEXT("SeasonAlpha"), Alpha);
				}
			}
		}
	}
}
