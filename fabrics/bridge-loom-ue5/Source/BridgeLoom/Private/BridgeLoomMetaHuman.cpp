// Copyright Project Loom. All Rights Reserved.

#include "BridgeLoomMetaHuman.h"
#include "Components/SkeletalMeshComponent.h"
#include "GroomComponent.h"
#include "MassEntitySubsystem.h"
#include "Camera/PlayerCameraManager.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"

// ── ARKit Blend Shape Names (Apple ARKit 52) ────────────────────

static const TArray<FName> ARKitBlendShapeNames = {
	TEXT("EyeBlinkLeft"), TEXT("EyeLookDownLeft"), TEXT("EyeLookInLeft"),
	TEXT("EyeLookOutLeft"), TEXT("EyeLookUpLeft"), TEXT("EyeSquintLeft"),
	TEXT("EyeWideLeft"),
	TEXT("EyeBlinkRight"), TEXT("EyeLookDownRight"), TEXT("EyeLookInRight"),
	TEXT("EyeLookOutRight"), TEXT("EyeLookUpRight"), TEXT("EyeSquintRight"),
	TEXT("EyeWideRight"),
	TEXT("JawForward"), TEXT("JawLeft"), TEXT("JawRight"), TEXT("JawOpen"),
	TEXT("MouthClose"), TEXT("MouthFunnel"), TEXT("MouthPucker"),
	TEXT("MouthLeft"), TEXT("MouthRight"),
	TEXT("MouthSmileLeft"), TEXT("MouthSmileRight"),
	TEXT("MouthFrownLeft"), TEXT("MouthFrownRight"),
	TEXT("MouthDimpleLeft"), TEXT("MouthDimpleRight"),
	TEXT("MouthStretchLeft"), TEXT("MouthStretchRight"),
	TEXT("MouthRollLower"), TEXT("MouthRollUpper"),
	TEXT("MouthShrugLower"), TEXT("MouthShrugUpper"),
	TEXT("MouthPressLeft"), TEXT("MouthPressRight"),
	TEXT("MouthLowerDownLeft"), TEXT("MouthLowerDownRight"),
	TEXT("MouthUpperUpLeft"), TEXT("MouthUpperUpRight"),
	TEXT("BrowDownLeft"), TEXT("BrowDownRight"),
	TEXT("BrowInnerUp"), TEXT("BrowOuterUpLeft"), TEXT("BrowOuterUpRight"),
	TEXT("CheekPuff"), TEXT("CheekSquintLeft"), TEXT("CheekSquintRight"),
	TEXT("NoseSneerLeft"), TEXT("NoseSneerRight"),
	TEXT("TongueOut"),
};

// ── Emotion Presets ─────────────────────────────────────────────

static TMap<FName, float> MakeHappyPreset()
{
	TMap<FName, float> P;
	P.Add(TEXT("MouthSmileLeft"), 0.7f);
	P.Add(TEXT("MouthSmileRight"), 0.7f);
	P.Add(TEXT("CheekSquintLeft"), 0.3f);
	P.Add(TEXT("CheekSquintRight"), 0.3f);
	P.Add(TEXT("EyeSquintLeft"), 0.2f);
	P.Add(TEXT("EyeSquintRight"), 0.2f);
	return P;
}

static TMap<FName, float> MakeSadPreset()
{
	TMap<FName, float> P;
	P.Add(TEXT("MouthFrownLeft"), 0.6f);
	P.Add(TEXT("MouthFrownRight"), 0.6f);
	P.Add(TEXT("BrowInnerUp"), 0.5f);
	P.Add(TEXT("EyeSquintLeft"), 0.15f);
	P.Add(TEXT("EyeSquintRight"), 0.15f);
	return P;
}

static TMap<FName, float> MakeAngryPreset()
{
	TMap<FName, float> P;
	P.Add(TEXT("BrowDownLeft"), 0.7f);
	P.Add(TEXT("BrowDownRight"), 0.7f);
	P.Add(TEXT("NoseSneerLeft"), 0.4f);
	P.Add(TEXT("NoseSneerRight"), 0.4f);
	P.Add(TEXT("MouthPressLeft"), 0.3f);
	P.Add(TEXT("MouthPressRight"), 0.3f);
	P.Add(TEXT("JawForward"), 0.2f);
	return P;
}

static TMap<FName, float> MakeSurprisedPreset()
{
	TMap<FName, float> P;
	P.Add(TEXT("EyeWideLeft"), 0.8f);
	P.Add(TEXT("EyeWideRight"), 0.8f);
	P.Add(TEXT("BrowOuterUpLeft"), 0.6f);
	P.Add(TEXT("BrowOuterUpRight"), 0.6f);
	P.Add(TEXT("BrowInnerUp"), 0.6f);
	P.Add(TEXT("JawOpen"), 0.4f);
	P.Add(TEXT("MouthFunnel"), 0.3f);
	return P;
}

static TMap<FName, float> MakeCuriousPreset()
{
	TMap<FName, float> P;
	P.Add(TEXT("BrowOuterUpLeft"), 0.4f);
	P.Add(TEXT("BrowInnerUp"), 0.3f);
	P.Add(TEXT("EyeSquintRight"), 0.15f);
	P.Add(TEXT("MouthSmileLeft"), 0.2f);
	return P;
}

static TMap<FName, float> MakeSternPreset()
{
	TMap<FName, float> P;
	P.Add(TEXT("BrowDownLeft"), 0.4f);
	P.Add(TEXT("BrowDownRight"), 0.4f);
	P.Add(TEXT("MouthPressLeft"), 0.5f);
	P.Add(TEXT("MouthPressRight"), 0.5f);
	P.Add(TEXT("JawForward"), 0.15f);
	return P;
}

static TMap<FName, float> MakeNeutralPreset()
{
	// All zeros — no overrides
	return TMap<FName, float>();
}

// ── Constructor ─────────────────────────────────────────────────

UBridgeLoomMetaHuman::UBridgeLoomMetaHuman()
{
	PrimaryComponentTick.bCanEverTick = true;
	PrimaryComponentTick.TickGroup = TG_PrePhysics;
	// Tick at 30Hz — facial animation doesn't need 60fps updates
	PrimaryComponentTick.TickInterval = 1.0f / 30.0f;
}

void UBridgeLoomMetaHuman::BeginPlay()
{
	Super::BeginPlay();

	// Cache the skeletal mesh component (MetaHuman face mesh)
	if (AActor* Owner = GetOwner())
	{
		// MetaHuman characters have a Face component
		FaceMesh = Owner->FindComponentByClass<USkeletalMeshComponent>();
	}

	if (!FaceMesh)
	{
		UE_LOG(LogTemp, Warning,
			TEXT("BridgeLoomMetaHuman: No SkeletalMeshComponent found on %s"),
			*GetOwner()->GetName());
	}
}

// ── Tick ─────────────────────────────────────────────────────────

void UBridgeLoomMetaHuman::TickComponent(
	float DeltaTime,
	ELevelTick TickType,
	FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

	if (!FaceMesh || !GetOwner())
	{
		return;
	}

	// LOD based on distance to camera
	if (!bForcedLOD)
	{
		if (const APlayerController* PC =
			UGameplayStatics::GetPlayerController(this, 0))
		{
			if (const APlayerCameraManager* Cam = PC->PlayerCameraManager)
			{
				const float Dist = FVector::Dist(
					GetOwner()->GetActorLocation(),
					Cam->GetCameraLocation());
				UpdateLOD(Dist);
			}
		}
	}

	// Blend emotion towards target
	if (CurrentEmotion != TargetEmotion || EmotionBlendAlpha < 1.0f)
	{
		EmotionBlendAlpha = FMath::Clamp(EmotionBlendAlpha + DeltaTime * 3.0f,
			0.0f, 1.0f);
		if (EmotionBlendAlpha >= 1.0f)
		{
			CurrentEmotion = TargetEmotion;
		}
		ApplyEmotionPreset(TargetEmotion, EmotionBlendAlpha);
	}

	// Gaze
	if (bHasGazeTarget)
	{
		UpdateGaze(DeltaTime);
	}
}

// ── Facial Animation ────────────────────────────────────────────

void UBridgeLoomMetaHuman::ApplyFacialPose(const FLoomFacialPose& Pose)
{
	if (CurrentLOD == EMetaHumanLOD::Low ||
	    CurrentLOD == EMetaHumanLOD::Crowd)
	{
		return; // No facial animation at low LOD
	}

	ApplyBlendShapes(Pose.BlendShapes);

	if (Pose.Emotion != CurrentEmotion)
	{
		SetEmotion(Pose.Emotion);
	}

	if (Pose.CurrentViseme != NAME_None)
	{
		SetViseme(Pose.CurrentViseme, Pose.SpeechAmplitude);
	}

	if (Pose.bHasGazeTarget)
	{
		SetGazeTarget(Pose.GazeTarget);
	}
}

void UBridgeLoomMetaHuman::SetEmotion(ELoomEmotion NewEmotion)
{
	if (NewEmotion != TargetEmotion)
	{
		TargetEmotion = NewEmotion;
		EmotionBlendAlpha = 0.0f;
	}
}

void UBridgeLoomMetaHuman::SetViseme(FName VisemeName, float Amplitude)
{
	if (!FaceMesh)
	{
		return;
	}

	bIsSpeaking = Amplitude > 0.01f;

	// Map viseme to morph targets
	// Standard viseme set: sil, PP, FF, TH, DD, kk, CH, SS, nn, RR, aa, E, ih, oh, ou
	FaceMesh->SetMorphTarget(VisemeName, FMath::Clamp(Amplitude, 0.0f, 1.0f));

	// Drive jaw from amplitude
	FaceMesh->SetMorphTarget(TEXT("JawOpen"), Amplitude * 0.5f);
}

void UBridgeLoomMetaHuman::SetGazeTarget(FVector WorldTarget)
{
	CurrentGazeTarget = WorldTarget;
	bHasGazeTarget = true;
}

void UBridgeLoomMetaHuman::ClearGazeTarget()
{
	bHasGazeTarget = false;
}

// ── Blend Shape Application ─────────────────────────────────────

void UBridgeLoomMetaHuman::ApplyBlendShapes(const TMap<FName, float>& Shapes)
{
	if (!FaceMesh)
	{
		return;
	}

	for (const auto& Pair : Shapes)
	{
		// MetaHuman morph targets use the same names as ARKit blend shapes
		FaceMesh->SetMorphTarget(Pair.Key,
			FMath::Clamp(Pair.Value, 0.0f, 1.0f));
	}
}

void UBridgeLoomMetaHuman::ApplyEmotionPreset(
	ELoomEmotion Emotion,
	float BlendAlpha)
{
	const TMap<FName, float>& Preset = GetEmotionPreset(Emotion);

	for (const auto& Pair : Preset)
	{
		if (FaceMesh)
		{
			const float Current = FaceMesh->GetMorphTarget(Pair.Key);
			const float Target = Pair.Value;
			const float Blended = FMath::Lerp(Current, Target, BlendAlpha);
			FaceMesh->SetMorphTarget(Pair.Key,
				FMath::Clamp(Blended, 0.0f, 1.0f));
		}
	}
}

// ── Gaze ────────────────────────────────────────────────────────

void UBridgeLoomMetaHuman::UpdateGaze(float DeltaTime)
{
	if (!FaceMesh || !GetOwner())
	{
		return;
	}

	const FVector HeadLocation = GetOwner()->GetActorLocation() +
		FVector(0.0f, 0.0f, 170.0f); // approximate head height
	const FVector ToTarget = (CurrentGazeTarget - HeadLocation).GetSafeNormal();
	const FVector Forward = GetOwner()->GetActorForwardVector();

	// Horizontal eye offset
	const float Dot = FVector::DotProduct(Forward, ToTarget);
	const float Cross = FVector::CrossProduct(Forward, ToTarget).Z;

	// Map to eye look blend shapes (simplified)
	const float LookHorizontal = FMath::Clamp(Cross, -1.0f, 1.0f);
	const float LookVertical = FMath::Clamp(ToTarget.Z - Forward.Z,
		-0.5f, 0.5f);

	if (LookHorizontal > 0.0f)
	{
		FaceMesh->SetMorphTarget(TEXT("EyeLookOutLeft"),
			FMath::Abs(LookHorizontal) * 0.5f);
		FaceMesh->SetMorphTarget(TEXT("EyeLookInRight"),
			FMath::Abs(LookHorizontal) * 0.5f);
		FaceMesh->SetMorphTarget(TEXT("EyeLookOutRight"), 0.0f);
		FaceMesh->SetMorphTarget(TEXT("EyeLookInLeft"), 0.0f);
	}
	else
	{
		FaceMesh->SetMorphTarget(TEXT("EyeLookInLeft"),
			FMath::Abs(LookHorizontal) * 0.5f);
		FaceMesh->SetMorphTarget(TEXT("EyeLookOutRight"),
			FMath::Abs(LookHorizontal) * 0.5f);
		FaceMesh->SetMorphTarget(TEXT("EyeLookOutLeft"), 0.0f);
		FaceMesh->SetMorphTarget(TEXT("EyeLookInRight"), 0.0f);
	}

	if (LookVertical > 0.0f)
	{
		FaceMesh->SetMorphTarget(TEXT("EyeLookUpLeft"), LookVertical);
		FaceMesh->SetMorphTarget(TEXT("EyeLookUpRight"), LookVertical);
		FaceMesh->SetMorphTarget(TEXT("EyeLookDownLeft"), 0.0f);
		FaceMesh->SetMorphTarget(TEXT("EyeLookDownRight"), 0.0f);
	}
	else
	{
		FaceMesh->SetMorphTarget(TEXT("EyeLookDownLeft"),
			FMath::Abs(LookVertical));
		FaceMesh->SetMorphTarget(TEXT("EyeLookDownRight"),
			FMath::Abs(LookVertical));
		FaceMesh->SetMorphTarget(TEXT("EyeLookUpLeft"), 0.0f);
		FaceMesh->SetMorphTarget(TEXT("EyeLookUpRight"), 0.0f);
	}
}

// ── LOD Management ──────────────────────────────────────────────

void UBridgeLoomMetaHuman::UpdateLOD(float DistanceToCamera)
{
	EMetaHumanLOD NewLOD;
	const float SwapDist = Config.LODSwapDistance;

	if (DistanceToCamera < SwapDist * 0.3f)
	{
		NewLOD = EMetaHumanLOD::Full;        // < 6m: full MetaHuman
	}
	else if (DistanceToCamera < SwapDist * 0.7f)
	{
		NewLOD = EMetaHumanLOD::Medium;      // 6-14m: reduced quality
	}
	else if (DistanceToCamera < SwapDist)
	{
		NewLOD = EMetaHumanLOD::Low;         // 14-20m: basic mesh
	}
	else
	{
		NewLOD = EMetaHumanLOD::Crowd;       // 20m+: Mass Entity
	}

	if (NewLOD != CurrentLOD)
	{
		TransitionLOD(NewLOD);
	}
}

void UBridgeLoomMetaHuman::TransitionLOD(EMetaHumanLOD NewLOD)
{
	const EMetaHumanLOD OldLOD = CurrentLOD;
	CurrentLOD = NewLOD;

	if (!FaceMesh)
	{
		return;
	}

	switch (NewLOD)
	{
	case EMetaHumanLOD::Full:
		// Enable RigLogic, Groom, full morph targets
		FaceMesh->SetForcedLOD(0);
		if (UGroomComponent* Groom = GetOwner()->FindComponentByClass<UGroomComponent>())
		{
			Groom->SetVisibility(true);
			Groom->SetComponentTickEnabled(true);
		}
		// Re-enable cloth on all skeletal meshes
		TInlineComponentArray<USkeletalMeshComponent*> SkelMeshes;
		GetOwner()->GetComponents(SkelMeshes);
		for (USkeletalMeshComponent* SkelMesh : SkelMeshes)
		{
			SkelMesh->SetEnableClothSimulation(true);
		}
		break;

	case EMetaHumanLOD::Medium:
		// Baked hair cards, reduced morph targets, no cloth
		FaceMesh->SetForcedLOD(1);
		// Swap strand-based Groom to baked hair cards mesh
		if (UGroomComponent* Groom = GetOwner()->FindComponentByClass<UGroomComponent>())
		{
			Groom->SetVisibility(false);
			Groom->SetComponentTickEnabled(false);
		}
		break;

	case EMetaHumanLOD::Low:
		// Static mesh, basic animation only
		FaceMesh->SetForcedLOD(2);
		// Disable Groom entirely at low LOD
		if (UGroomComponent* Groom = GetOwner()->FindComponentByClass<UGroomComponent>())
		{
			Groom->SetVisibility(false);
			Groom->SetComponentTickEnabled(false);
		}
		// Clear all morph targets — no facial animation at this LOD
		FaceMesh->ClearAllMorphTargetCurves();
		break;

	case EMetaHumanLOD::Crowd:
		// Hide individual mesh, Mass Entity takes over
		FaceMesh->SetVisibility(false);
		if (UGroomComponent* Groom = GetOwner()->FindComponentByClass<UGroomComponent>())
		{
			Groom->SetVisibility(false);
			Groom->SetComponentTickEnabled(false);
		}
		// Register with Mass Entity Framework for crowd representation
		if (UWorld* World = GetWorld())
		{
			if (UMassEntitySubsystem* MassEntity = World->GetSubsystem<UMassEntitySubsystem>())
			{
				FMassEntityConfig EntityConfig;
				MassEntity->CreateEntity(EntityConfig);
			}
		}
		break;
	}

	if (OldLOD == EMetaHumanLOD::Crowd && NewLOD != EMetaHumanLOD::Crowd)
	{
		FaceMesh->SetVisibility(true);
	}

	UE_LOG(LogTemp, Verbose,
		TEXT("MetaHuman %s LOD: %d -> %d"),
		*EntityId, static_cast<int32>(OldLOD), static_cast<int32>(NewLOD));
}

void UBridgeLoomMetaHuman::ForceLOD(EMetaHumanLOD LODLevel)
{
	bForcedLOD = true;
	TransitionLOD(LODLevel);
}

void UBridgeLoomMetaHuman::ClearForcedLOD()
{
	bForcedLOD = false;
}

// ── Static Preset Maps ──────────────────────────────────────────

const TMap<FName, float>& UBridgeLoomMetaHuman::GetEmotionPreset(
	ELoomEmotion Emotion)
{
	static const TMap<ELoomEmotion, TMap<FName, float>> Presets = {
		{ ELoomEmotion::Neutral,    MakeNeutralPreset() },
		{ ELoomEmotion::Happy,      MakeHappyPreset() },
		{ ELoomEmotion::Sad,        MakeSadPreset() },
		{ ELoomEmotion::Angry,      MakeAngryPreset() },
		{ ELoomEmotion::Surprised,  MakeSurprisedPreset() },
		{ ELoomEmotion::Curious,    MakeCuriousPreset() },
		{ ELoomEmotion::Stern,      MakeSternPreset() },
	};

	if (const TMap<FName, float>* Found = Presets.Find(Emotion))
	{
		return *Found;
	}
	static const TMap<FName, float> Empty;
	return Empty;
}

const TMap<FName, FName>& UBridgeLoomMetaHuman::GetARKitToMorphTargetMap()
{
	// MetaHuman uses ARKit blend shape names directly as morph targets
	// This map is for any future remapping if Epic changes the convention
	static TMap<FName, FName> Map;
	if (Map.Num() == 0)
	{
		for (const FName& Name : ARKitBlendShapeNames)
		{
			Map.Add(Name, Name);
		}
	}
	return Map;
}
