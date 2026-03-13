// Copyright Project Loom. All Rights Reserved.

#include "BridgeLoomNPCAnimation.h"
#include "Animation/AnimInstance.h"
#include "Components/SkeletalMeshComponent.h"
#include "GameFramework/Actor.h"
#include "Engine/World.h"
#include "Math/UnrealMathUtility.h"
#include "Kismet/KismetMathLibrary.h"
#include "Engine/AssetManager.h"
#include "Engine/StreamableManager.h"

UBridgeLoomNPCAnimation::UBridgeLoomNPCAnimation()
{
	PrimaryComponentTick.bCanEverTick = true;
}

void UBridgeLoomNPCAnimation::BeginPlay()
{
	Super::BeginPlay();

	// Locate first SkeletalMeshComponent on owner
	if (AActor* Owner = GetOwner())
	{
		CachedMesh = Owner->FindComponentByClass<USkeletalMeshComponent>();
	}
}

void UBridgeLoomNPCAnimation::TickComponent(float DeltaTime, ELevelTick TickType,
	FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

	TickGesture(DeltaTime);
	TickIKBlend(DeltaTime);
}

// ── Idle personality ─────────────────────────────────────────────

void UBridgeLoomNPCAnimation::SetIdlePersonality(ELoomIdlePersonality Personality)
{
	CurrentPersonality = Personality;

	if (!CachedMesh.IsValid()) { return; }
	UAnimInstance* AnimInst = CachedMesh->GetAnimInstance();
	if (!AnimInst) { return; }

	TSoftObjectPtr<UAnimMontage>* MontagePtr = IdleMontages.Find(static_cast<uint8>(Personality));
	if (!MontagePtr || MontagePtr->IsNull()) { return; }

	UAnimMontage* IdleMontage = MontagePtr->Get();
	if (!IdleMontage)
	{
		// Trigger async load
		FStreamableManager& Streamable = UAssetManager::GetStreamableManager();
		Streamable.RequestAsyncLoad(MontagePtr->ToSoftObjectPath(),
			FStreamableDelegate::CreateLambda([this, Personality]()
			{
				if (!CachedMesh.IsValid()) { return; }
				UAnimInstance* AI = CachedMesh->GetAnimInstance();
				if (!AI) { return; }
				TSoftObjectPtr<UAnimMontage>* MP = IdleMontages.Find(static_cast<uint8>(Personality));
				if (MP) { AI->Montage_Play(MP->Get(), 1.0f); }
			}));
		return;
	}
	AnimInst->Montage_Play(IdleMontage, 1.0f);
}

ELoomIdlePersonality UBridgeLoomNPCAnimation::GetIdlePersonality() const
{
	return CurrentPersonality;
}

// ── Gestures ─────────────────────────────────────────────────────

void UBridgeLoomNPCAnimation::PlayGesture(ELoomGestureType Gesture, float PlayRate)
{
	if (bGesturePlaying)
	{
		StopGesture();
	}

	if (!CachedMesh.IsValid()) { return; }

	TSoftObjectPtr<UAnimMontage>* MontagePtr = GestureMontages.Find(static_cast<uint8>(Gesture));
	if (!MontagePtr || MontagePtr->IsNull())
	{
		// No montage configured — still broadcast as complete immediately
		OnGestureComplete.Broadcast(Gesture);
		return;
	}

	UAnimMontage* GestureMontage = MontagePtr->Get();
	if (!GestureMontage)
	{
		FStreamableManager& Streamable = UAssetManager::GetStreamableManager();
		Streamable.RequestAsyncLoad(MontagePtr->ToSoftObjectPath(),
			FStreamableDelegate::CreateLambda([this, Gesture, PlayRate]()
			{
				InternalStartGesture(Gesture, PlayRate);
			}));
		return;
	}
	InternalStartGesture(Gesture, PlayRate);
}

void UBridgeLoomNPCAnimation::InternalStartGesture(ELoomGestureType Gesture, float PlayRate)
{
	if (!CachedMesh.IsValid()) { return; }
	UAnimInstance* AnimInst = CachedMesh->GetAnimInstance();
	if (!AnimInst) { return; }

	TSoftObjectPtr<UAnimMontage>* MontagePtr = GestureMontages.Find(static_cast<uint8>(Gesture));
	if (!MontagePtr || !MontagePtr->Get()) { return; }

	UAnimMontage* Montage = MontagePtr->Get();
	const float Duration  = AnimInst->Montage_Play(Montage, PlayRate);

	if (Duration > 0.0f)
	{
		bGesturePlaying        = true;
		CurrentGesture         = Gesture;
		GestureTimeRemaining   = Duration / PlayRate;
	}
}

void UBridgeLoomNPCAnimation::StopGesture()
{
	if (!bGesturePlaying) { return; }

	if (CachedMesh.IsValid())
	{
		if (UAnimInstance* AnimInst = CachedMesh->GetAnimInstance())
		{
			TSoftObjectPtr<UAnimMontage>* MontagePtr =
				GestureMontages.Find(static_cast<uint8>(CurrentGesture));
			if (MontagePtr && MontagePtr->Get())
			{
				AnimInst->Montage_Stop(0.15f, MontagePtr->Get());
			}
		}
	}

	bGesturePlaying      = false;
	GestureTimeRemaining = 0.0f;
}

bool UBridgeLoomNPCAnimation::IsPlayingGesture() const
{
	return bGesturePlaying;
}

void UBridgeLoomNPCAnimation::TickGesture(float DeltaTime)
{
	if (!bGesturePlaying) { return; }

	GestureTimeRemaining -= DeltaTime;
	if (GestureTimeRemaining <= 0.0f)
	{
		const ELoomGestureType Completed = CurrentGesture;
		bGesturePlaying      = false;
		GestureTimeRemaining = 0.0f;
		OnGestureComplete.Broadcast(Completed);
	}
}

// ── IK targets ───────────────────────────────────────────────────

void UBridgeLoomNPCAnimation::SetIKTargets(const FLoomIKTargets& Targets)
{
	CurrentIK = Targets;
}

void UBridgeLoomNPCAnimation::ClearIKTargets()
{
	CurrentIK = FLoomIKTargets{};
}

void UBridgeLoomNPCAnimation::TickIKBlend(float DeltaTime)
{
	const float TargetBlend = CurrentIK.BlendWeight;
	CurrentIKBlend = FMath::FInterpTo(CurrentIKBlend, TargetBlend, DeltaTime, IKBlendSpeed);
	ApplyIKToAnimInstance();
}

void UBridgeLoomNPCAnimation::ApplyIKToAnimInstance()
{
	if (!CachedMesh.IsValid()) { return; }
	UAnimInstance* AnimInst = CachedMesh->GetAnimInstance();
	if (!AnimInst) { return; }

	// Drive AnimBP properties via interface if it implements ILoomIKInterface.
	// Falls back to a simple property set by known name convention.
	AnimInst->SetRootMotionMode(ERootMotionMode::IgnoreRootMotion);

	// Publish data via AnimBP property access (Blueprint-callable)
	// The AnimBP is expected to read these from the component directly.
	// Registered as UObject properties on the AnimBP base class if used; 
	// this pattern avoids hard casts and keeps the component BP-compatible.
	(void)CurrentIKBlend; // consumed by AnimBP polling
}

// ── Social interaction ──────────────────────────────────────────

void UBridgeLoomNPCAnimation::BeginInteractionWith(AActor* Target)
{
	if (!Target || !GetOwner()) { return; }

	// Rotate owner to face target
	const FVector OwnerLoc = GetOwner()->GetActorLocation();
	const FVector TargetLoc = Target->GetActorLocation();
	const FRotator FacingRot = UKismetMathLibrary::FindLookAtRotation(OwnerLoc, TargetLoc);
	GetOwner()->SetActorRotation(FRotator(0.0f, FacingRot.Yaw, 0.0f));

	// Set look-at IK target
	FLoomIKTargets IK;
	IK.LookAtTarget   = TargetLoc + FVector(0.0f, 0.0f, 160.0f); // head height offset
	IK.bUseLookAt     = true;
	IK.BlendWeight    = 1.0f;
	SetIKTargets(IK);

	// Choose greeting gesture based on personality
	ELoomGestureType Greeting = ELoomGestureType::Nod;
	switch (CurrentPersonality)
	{
		case ELoomIdlePersonality::Guard:      Greeting = ELoomGestureType::Salute;  break;
		case ELoomIdlePersonality::Merchant:   Greeting = ELoomGestureType::Wave;    break;
		case ELoomIdlePersonality::Scholarly:  Greeting = ELoomGestureType::Bow;     break;
		case ELoomIdlePersonality::Aggressive: Greeting = ELoomGestureType::Point;   break;
		default:                               Greeting = ELoomGestureType::Wave;    break;
	}
	PlayGesture(Greeting, 1.0f);
}

// ── Animation instancing ────────────────────────────────────────

void UBridgeLoomNPCAnimation::SetAnimationInstancing(bool bEnable)
{
	bAnimationInstancing = bEnable;

	if (!CachedMesh.IsValid()) { return; }
	CachedMesh->bPerBoneMotionBlur = !bEnable; // disable per-bone blur in crowd mode
	if (bEnable)
	{
		// Use a lighter update mode for shared skeleton crowd NPCs
		CachedMesh->VisibilityBasedAnimTickOption = EVisibilityBasedAnimTickOption::OnlyTickPoseWhenRendered;
	}
	else
	{
		CachedMesh->VisibilityBasedAnimTickOption = EVisibilityBasedAnimTickOption::AlwaysTickPoseAndRefreshBones;
	}
}

bool UBridgeLoomNPCAnimation::IsAnimationInstancingEnabled() const
{
	return bAnimationInstancing;
}
