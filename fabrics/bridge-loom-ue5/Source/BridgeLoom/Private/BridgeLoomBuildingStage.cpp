// Copyright Project Loom. All Rights Reserved.

#include "BridgeLoomBuildingStage.h"
#include "Engine/World.h"
#include "Engine/AssetManager.h"
#include "Engine/StreamableManager.h"
#include "Components/StaticMeshComponent.h"
#include "Components/HierarchicalInstancedStaticMeshComponent.h"
#include "GameFramework/Actor.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "NiagaraFunctionLibrary.h"
#include "NiagaraSystem.h"
#include "NiagaraComponent.h"
#include "Math/UnrealMathUtility.h"

UBridgeLoomBuildingStage::UBridgeLoomBuildingStage()
{
	PrimaryComponentTick.bCanEverTick = true;
}

void UBridgeLoomBuildingStage::BeginPlay()
{
	Super::BeginPlay();
	ScaffoldTime = 0.0f;
}

void UBridgeLoomBuildingStage::TickComponent(float DeltaTime, ELevelTick TickType,
	FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);
	TickScaffoldAnimation(DeltaTime);
}

// ── Registration ─────────────────────────────────────────────────

void UBridgeLoomBuildingStage::RegisterBuilding(
	const FString& BuildingId,
	AActor* OwnerActor,
	const TMap<uint8, TSoftObjectPtr<UStaticMesh>>& StageMeshes)
{
	if (!OwnerActor || BuildingId.IsEmpty()) { return; }

	FLoomBuildingRecord Record;
	Record.Progress.BuildingId    = BuildingId;
	Record.Progress.Stage         = ELoomBuildStage::Foundation;
	Record.Progress.ProgressFraction = 0.0f;
	Record.Progress.WorkerCount   = 0;
	Record.Progress.DamageFraction = 0.0f;
	Record.StageMeshes            = StageMeshes;
	Record.OwnerActor             = OwnerActor;

	Buildings.Add(BuildingId, Record);
}

void UBridgeLoomBuildingStage::UnregisterBuilding(const FString& BuildingId)
{
	// Release worker Niagara components
	if (FLoomBuildingRecord* Record = Buildings.Find(BuildingId))
	{
		for (TWeakObjectPtr<UNiagaraComponent>& VFX : Record->WorkerVFX)
		{
			if (VFX.IsValid())
			{
				VFX->DestroyComponent();
			}
		}
	}
	Buildings.Remove(BuildingId);
}

// ── Progress ─────────────────────────────────────────────────────

void UBridgeLoomBuildingStage::SetBuildingProgress(
	const FString& BuildingId,
	const FLoomBuildingProgress& NewProgress)
{
	FLoomBuildingRecord* Record = Buildings.Find(BuildingId);
	if (!Record) { return; }

	const ELoomBuildStage OldStage = Record->Progress.Stage;
	Record->Progress = NewProgress;

	// If stage advanced → swap mesh
	if (NewProgress.Stage != OldStage)
	{
		ApplyStage(*Record, NewProgress.Stage);
	}

	// Always update material progress
	ApplyProgressMaterial(*Record, NewProgress.ProgressFraction);

	// Broadcast if fraction reached full on current stage
	if (NewProgress.ProgressFraction >= 1.0f)
	{
		OnStageComplete.Broadcast(BuildingId, NewProgress.Stage);
	}

	// Apply damage on the material
	if (NewProgress.DamageFraction > 0.0f)
	{
		ApplyDamageMaterial(*Record, NewProgress.DamageFraction);
	}
}

void UBridgeLoomBuildingStage::SetDamage(const FString& BuildingId, float DamageFraction)
{
	FLoomBuildingRecord* Record = Buildings.Find(BuildingId);
	if (!Record) { return; }

	Record->Progress.DamageFraction = FMath::Clamp(DamageFraction, 0.0f, 1.0f);
	ApplyDamageMaterial(*Record, Record->Progress.DamageFraction);

	// If damage pushes to ruined, auto-advance stage
	if (Record->Progress.DamageFraction >= 0.95f &&
		Record->Progress.Stage != ELoomBuildStage::Ruined)
	{
		Record->Progress.Stage = ELoomBuildStage::Ruined;
		ApplyStage(*Record, ELoomBuildStage::Ruined);
		OnStageComplete.Broadcast(BuildingId, ELoomBuildStage::Ruined);
	}
}

// ── Worker VFX ───────────────────────────────────────────────────

void UBridgeLoomBuildingStage::AddWorkerEffect(const FString& BuildingId, const FVector& WorldLocation)
{
	FLoomBuildingRecord* Record = Buildings.Find(BuildingId);
	if (!Record) { return; }

	UWorld* World = GetWorld();
	if (!World) { return; }

	if (WorkerNiagaraSystem.IsNull())
	{
		UE_LOG(LogTemp, Log, TEXT("BridgeLoomBuildingStage: WorkerNiagaraSystem not set, skipping VFX"));
		return;
	}

	UNiagaraSystem* NSys = WorkerNiagaraSystem.Get();
	if (!NSys)
	{
		FStreamableManager& Streamable = UAssetManager::GetStreamableManager();
		Streamable.RequestAsyncLoad(WorkerNiagaraSystem.ToSoftObjectPath(),
			FStreamableDelegate::CreateLambda([this, BuildingId, WorldLocation]()
			{
				AddWorkerEffect(BuildingId, WorldLocation);
			}));
		return;
	}

	UNiagaraComponent* NComp =
		UNiagaraFunctionLibrary::SpawnSystemAtLocation(World, NSys, WorldLocation,
			FRotator::ZeroRotator, FVector::OneVector, true, true,
			ENCPoolMethod::AutoRelease);

	if (NComp)
	{
		Record->WorkerVFX.Add(NComp);
		++Record->Progress.WorkerCount;
	}
}

void UBridgeLoomBuildingStage::ClearWorkerEffects(const FString& BuildingId)
{
	FLoomBuildingRecord* Record = Buildings.Find(BuildingId);
	if (!Record) { return; }

	for (TWeakObjectPtr<UNiagaraComponent>& VFX : Record->WorkerVFX)
	{
		if (VFX.IsValid())
		{
			VFX->DestroyComponent();
		}
	}
	Record->WorkerVFX.Empty();
	Record->Progress.WorkerCount = 0;
}

// ── Internal helpers ─────────────────────────────────────────────

void UBridgeLoomBuildingStage::ApplyStage(FLoomBuildingRecord& Record, ELoomBuildStage Stage)
{
	if (!Record.OwnerActor.IsValid()) { return; }

	TSoftObjectPtr<UStaticMesh>* SoftMeshPtr = Record.StageMeshes.Find(static_cast<uint8>(Stage));
	if (!SoftMeshPtr || SoftMeshPtr->IsNull()) { return; }

	UStaticMesh* NewMesh = SoftMeshPtr->Get();
	if (!NewMesh)
	{
		// Async load then apply
		FStreamableManager& Streamable = UAssetManager::GetStreamableManager();
		Streamable.RequestAsyncLoad(SoftMeshPtr->ToSoftObjectPath(),
			FStreamableDelegate::CreateLambda([this, BuildingId = Record.Progress.BuildingId, Stage]()
			{
				if (FLoomBuildingRecord* R = Buildings.Find(BuildingId))
				{
					ApplyStage(*R, Stage);
				}
			}));
		return;
	}

	UStaticMeshComponent* MeshComp =
		Record.OwnerActor->FindComponentByClass<UStaticMeshComponent>();
	if (MeshComp)
	{
		MeshComp->SetStaticMesh(NewMesh);
	}
}

void UBridgeLoomBuildingStage::ApplyProgressMaterial(FLoomBuildingRecord& Record, float Fraction)
{
	if (!Record.OwnerActor.IsValid()) { return; }

	UStaticMeshComponent* MeshComp =
		Record.OwnerActor->FindComponentByClass<UStaticMeshComponent>();
	if (!MeshComp) { return; }

	const int32 NumMats = MeshComp->GetNumMaterials();
	for (int32 i = 0; i < NumMats; ++i)
	{
		UMaterialInterface* Mat = MeshComp->GetMaterial(i);
		if (!Mat) { continue; }

		UMaterialInstanceDynamic* MID = Cast<UMaterialInstanceDynamic>(Mat);
		if (!MID)
		{
			MID = UMaterialInstanceDynamic::Create(Mat, MeshComp);
			MeshComp->SetMaterial(i, MID);
		}
		MID->SetScalarParameterValue(TEXT("ConstructionProgress"),
			FMath::Clamp(Fraction, 0.0f, 1.0f));
	}
}

void UBridgeLoomBuildingStage::ApplyDamageMaterial(FLoomBuildingRecord& Record, float DamageFraction)
{
	if (!Record.OwnerActor.IsValid()) { return; }

	UStaticMeshComponent* MeshComp =
		Record.OwnerActor->FindComponentByClass<UStaticMeshComponent>();
	if (!MeshComp) { return; }

	const int32 NumMats = MeshComp->GetNumMaterials();
	for (int32 i = 0; i < NumMats; ++i)
	{
		UMaterialInterface* Mat = MeshComp->GetMaterial(i);
		if (!Mat) { continue; }

		UMaterialInstanceDynamic* MID = Cast<UMaterialInstanceDynamic>(Mat);
		if (!MID)
		{
			MID = UMaterialInstanceDynamic::Create(Mat, MeshComp);
			MeshComp->SetMaterial(i, MID);
		}
		MID->SetScalarParameterValue(TEXT("DamageFraction"),
			FMath::Clamp(DamageFraction, 0.0f, 1.0f));
	}
}

void UBridgeLoomBuildingStage::TickScaffoldAnimation(float DeltaTime)
{
	ScaffoldTime += DeltaTime;
	const float OscOffset = FMath::Sin(ScaffoldTime * ScaffoldOscillationFreq) * 2.0f; // 2 cm swing

	for (auto& Pair : Buildings)
	{
		FLoomBuildingRecord& Record = Pair.Value;
		if (!Record.OwnerActor.IsValid()) { continue; }

		// Only animate scaffold during active construction stages
		const ELoomBuildStage Stage = Record.Progress.Stage;
		if (Stage < ELoomBuildStage::Foundation || Stage > ELoomBuildStage::Roof) { continue; }
		if (Record.Progress.ProgressFraction >= 1.0f) { continue; }

		// If there is a HISMC tagged "Scaffold" on the building actor, push it
		TArray<UHierarchicalInstancedStaticMeshComponent*> HISMCs;
		Record.OwnerActor->GetComponents<UHierarchicalInstancedStaticMeshComponent>(HISMCs);

		for (UHierarchicalInstancedStaticMeshComponent* HISMC : HISMCs)
		{
			if (!HISMC->ComponentHasTag(TEXT("Scaffold"))) { continue; }

			const int32 NumInst = HISMC->GetInstanceCount();
			for (int32 i = 0; i < NumInst; ++i)
			{
				FTransform T;
				HISMC->GetInstanceTransform(i, T, true);
				T.SetLocation(T.GetLocation() + FVector(0.0f, 0.0f, OscOffset));
				HISMC->UpdateInstanceTransform(i, T, true, i == NumInst - 1);
			}
		}
	}
}
