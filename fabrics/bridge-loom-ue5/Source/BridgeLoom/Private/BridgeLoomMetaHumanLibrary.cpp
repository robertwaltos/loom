// Copyright Project Loom. All Rights Reserved.

#include "BridgeLoomMetaHumanLibrary.h"
#include "BridgeLoomMetaHuman.h"
#include "Engine/AssetManager.h"
#include "Engine/StreamableManager.h"
#include "GameFramework/Actor.h"
#include "Engine/World.h"
#include "Camera/CameraActor.h"
#include "Kismet/GameplayStatics.h"
#include "Math/UnrealMathUtility.h"

UBridgeLoomMetaHumanLibrary::UBridgeLoomMetaHumanLibrary()
{
	PrimaryComponentTick.bCanEverTick = true;
}

void UBridgeLoomMetaHumanLibrary::BeginPlay()
{
	Super::BeginPlay();
	BudgetTickAccumulator = 0.0f;
}

void UBridgeLoomMetaHumanLibrary::TickComponent(float DeltaTime, ELevelTick TickType,
	FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

	BudgetTickAccumulator += DeltaTime;
	if (BudgetTickAccumulator >= BudgetTickInterval)
	{
		BudgetTickAccumulator = 0.0f;
		TickBudgetEnforcement();
	}
}

void UBridgeLoomMetaHumanLibrary::RegisterPreset(const FLoomMetaHumanPreset& Preset)
{
	PresetLibrary.Add(Preset.PresetId, Preset);
}

void UBridgeLoomMetaHumanLibrary::RegisterPresets(const TArray<FLoomMetaHumanPreset>& Presets)
{
	for (const FLoomMetaHumanPreset& P : Presets)
	{
		PresetLibrary.Add(P.PresetId, P);
	}
}

bool UBridgeLoomMetaHumanLibrary::GetPreset(const FString& PresetId, FLoomMetaHumanPreset& OutPreset) const
{
	const FLoomMetaHumanPreset* Found = PresetLibrary.Find(PresetId);
	if (!Found) { return false; }
	OutPreset = *Found;
	return true;
}

TArray<FString> UBridgeLoomMetaHumanLibrary::GetAllPresetIds() const
{
	TArray<FString> Keys;
	PresetLibrary.GetKeys(Keys);
	return Keys;
}

FLoomMetaHumanPreset UBridgeLoomMetaHumanLibrary::CreateDynamicBlend(
	const FString& PresetIdA, const FString& PresetIdB, float Alpha)
{
	const FLoomMetaHumanPreset* A = PresetLibrary.Find(PresetIdA);
	const FLoomMetaHumanPreset* B = PresetLibrary.Find(PresetIdB);

	if (!A || !B)
	{
		UE_LOG(LogTemp, Warning, TEXT("BridgeLoomMetaHumanLibrary: CreateDynamicBlend preset not found"));
		if (A) { return *A; }
		if (B) { return *B; }
		return FLoomMetaHumanPreset{};
	}

	const float T = FMath::Clamp(Alpha, 0.0f, 1.0f);

	FLoomMetaHumanPreset Blended;
	Blended.PresetId     = FString::Printf(TEXT("blend_%s_%s_%.2f"), *PresetIdA, *PresetIdB, T);
	Blended.DisplayName  = FText::FromString(
		FString::Printf(TEXT("%s x %s (%.0f%%)"), *A->DisplayName.ToString(),
			*B->DisplayName.ToString(), T * 100.f));

	// Interpolate scalar attributes
	Blended.AgeBias = FMath::Lerp(A->AgeBias, B->AgeBias, T);

	// Merge morph overrides: all keys from A blended toward B
	TSet<FName> AllKeys;
	for (auto& Pair : A->MorphOverrides) { AllKeys.Add(Pair.Key); }
	for (auto& Pair : B->MorphOverrides) { AllKeys.Add(Pair.Key); }

	for (const FName& Key : AllKeys)
	{
		const float* ValA = A->MorphOverrides.Find(Key);
		const float* ValB = B->MorphOverrides.Find(Key);
		const float VA = ValA ? *ValA : 0.0f;
		const float VB = ValB ? *ValB : 0.0f;
		Blended.MorphOverrides.Add(Key, FMath::Lerp(VA, VB, T));
	}

	// Take skeletal mesh from whichever side is dominant
	Blended.SkeletalMesh = (T < 0.5f) ? A->SkeletalMesh : B->SkeletalMesh;
	Blended.GroomAsset   = (T < 0.5f) ? A->GroomAsset   : B->GroomAsset;
	Blended.EthnicityTag = (T < 0.5f) ? A->EthnicityTag  : B->EthnicityTag;
	Blended.bHasRigLogic = A->bHasRigLogic || B->bHasRigLogic;

	return Blended;
}

void UBridgeLoomMetaHumanLibrary::BeginStreamingPreset(const FString& PresetId)
{
	const FLoomMetaHumanPreset* Preset = PresetLibrary.Find(PresetId);
	if (!Preset)
	{
		UE_LOG(LogTemp, Warning, TEXT("BridgeLoomMetaHumanLibrary: BeginStreaming - preset not found: %s"), *PresetId);
		return;
	}

	if (StreamHandles.Contains(PresetId))
	{
		return; // Already streaming
	}

	TArray<FSoftObjectPath> AssetsToLoad;
	if (!Preset->SkeletalMesh.IsNull())
	{
		AssetsToLoad.Add(Preset->SkeletalMesh.ToSoftObjectPath());
	}
	if (!Preset->GroomAsset.IsNull())
	{
		AssetsToLoad.Add(Preset->GroomAsset.ToSoftObjectPath());
	}

	if (AssetsToLoad.IsEmpty()) { return; }

	FStreamableManager& Streamable = UAssetManager::GetStreamableManager();
	TSharedPtr<FStreamableHandle> Handle = Streamable.RequestAsyncLoad(
		AssetsToLoad,
		FStreamableDelegate::CreateUObject(this, &UBridgeLoomMetaHumanLibrary::OnPresetStreamComplete, PresetId),
		FStreamableManager::AsyncLoadHighPriority
	);

	if (Handle.IsValid())
	{
		StreamHandles.Add(PresetId, Handle);
	}
}

void UBridgeLoomMetaHumanLibrary::OnPresetStreamComplete(FString PresetId)
{
	OnPresetStreamed.Broadcast(PresetId);
}

void UBridgeLoomMetaHumanLibrary::CancelStreamingPreset(const FString& PresetId)
{
	TSharedPtr<FStreamableHandle>* Handle = StreamHandles.Find(PresetId);
	if (Handle && Handle->IsValid())
	{
		(*Handle)->CancelHandle();
	}
	StreamHandles.Remove(PresetId);
}

AActor* UBridgeLoomMetaHumanLibrary::SpawnMetaHumanFromPreset(
	const FString& PresetId,
	const FTransform& SpawnTransform,
	TSubclassOf<AActor> ActorClass)
{
	const FLoomMetaHumanPreset* Preset = PresetLibrary.Find(PresetId);
	if (!Preset)
	{
		UE_LOG(LogTemp, Warning, TEXT("BridgeLoomMetaHumanLibrary: SpawnMetaHuman - preset not found: %s"), *PresetId);
		return nullptr;
	}

	UWorld* World = GetWorld();
	if (!World) { return nullptr; }

	TSubclassOf<AActor> ClassToSpawn = ActorClass ? ActorClass : AActor::StaticClass();
	FActorSpawnParameters Params;
	Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AdjustIfPossibleButAlwaysSpawn;

	AActor* SpawnedActor = World->SpawnActor<AActor>(ClassToSpawn, SpawnTransform, Params);
	if (!SpawnedActor) { return nullptr; }

	// Apply preset to the MetaHuman component if present
	UBridgeLoomMetaHuman* MetaHumanComp =
		Cast<UBridgeLoomMetaHuman>(SpawnedActor->FindComponentByClass(UBridgeLoomMetaHuman::StaticClass()));
	if (MetaHumanComp)
	{
		FLoomMetaHumanConfig Config;
		Config.PresetName   = Preset->PresetId;
		Config.bUseGroomHair   = !Preset->GroomAsset.IsNull();
		Config.bEnableRigLogic    = Preset->bHasRigLogic;
		MetaHumanComp->Config = Config;

		// Track for budget enforcement
		TrackedComponents.Add(MetaHumanComp);
	}

	// Trigger asset streaming if not already loaded
	BeginStreamingPreset(PresetId);

	return SpawnedActor;
}

FLoomMetaHumanBudgetStats UBridgeLoomMetaHumanLibrary::GetBudgetStats() const
{
	FLoomMetaHumanBudgetStats Stats;
	Stats.StreamingInFlight = StreamHandles.Num();

	for (const auto& Weak : TrackedComponents)
	{
		if (!Weak.IsValid()) { continue; }
		switch (Weak->GetCurrentLOD())
		{
			case EMetaHumanLOD::Full:   ++Stats.ActiveFull;   break;
			case EMetaHumanLOD::Medium: ++Stats.ActiveMedium; break;
			case EMetaHumanLOD::Low:    ++Stats.ActiveLow;    break;
			case EMetaHumanLOD::Crowd:  ++Stats.ActiveCrowd;  break;
		}
	}
	return Stats;
}

void UBridgeLoomMetaHumanLibrary::EnforceGPUBudget()
{
	TickBudgetEnforcement();
}

void UBridgeLoomMetaHumanLibrary::TickBudgetEnforcement()
{
	// Remove stale weak pointers
	TrackedComponents.RemoveAll([](const TWeakObjectPtr<UBridgeLoomMetaHuman>& Weak)
	{
		return !Weak.IsValid();
	});

	// Find camera location for distance sort
	FVector CameraLocation = FVector::ZeroVector;
	if (UWorld* World = GetWorld())
	{
		if (APlayerController* PC = World->GetFirstPlayerController())
		{
			FVector CamLoc; FRotator CamRot;
			PC->GetPlayerViewPoint(CamLoc, CamRot);
			CameraLocation = CamLoc;
		}
	}

	// Sort by distance — closest first (high priority)
	TrackedComponents.Sort([&](const TWeakObjectPtr<UBridgeLoomMetaHuman>& A,
		const TWeakObjectPtr<UBridgeLoomMetaHuman>& B)
	{
		if (!A.IsValid() || !B.IsValid()) { return false; }
		const float DA = FVector::DistSquared(A->GetOwner()->GetActorLocation(), CameraLocation);
		const float DB = FVector::DistSquared(B->GetOwner()->GetActorLocation(), CameraLocation);
		return DA < DB;
	});

	int32 FullCount = 0, MediumCount = 0, LowCount = 0;
	for (auto& Weak : TrackedComponents)
	{
		if (!Weak.IsValid()) { continue; }
		UBridgeLoomMetaHuman* MH = Weak.Get();

		if (FullCount < MaxFull)
		{
			MH->SetLODLevel(EMetaHumanLOD::Full);
			++FullCount;
		}
		else if (MediumCount < MaxMedium)
		{
			MH->SetLODLevel(EMetaHumanLOD::Medium);
			++MediumCount;
		}
		else if (LowCount < MaxLow)
		{
			MH->SetLODLevel(EMetaHumanLOD::Low);
			++LowCount;
		}
		else
		{
			MH->SetLODLevel(EMetaHumanLOD::Crowd);
		}
	}
}
