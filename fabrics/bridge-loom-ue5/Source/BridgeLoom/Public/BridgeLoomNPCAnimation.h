// Copyright Project Loom. All Rights Reserved.
// Thread: bridge/bridge-loom-ue5/npc-animation
// Tier: 1
//
// Full-body NPC animation: two-bone IK, gesture montages, idle personalities,
// and animation instancing toggle for crowd-level NPCs.

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomNPCAnimation.generated.h"

// ── Idle personality ────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomIdlePersonality : uint8
{
	Relaxed     UMETA(DisplayName = "Relaxed"),
	Alert       UMETA(DisplayName = "Alert"),
	Nervous     UMETA(DisplayName = "Nervous"),
	Aggressive  UMETA(DisplayName = "Aggressive"),
	Scholarly   UMETA(DisplayName = "Scholarly"),
	Merchant    UMETA(DisplayName = "Merchant"),
	Guard       UMETA(DisplayName = "Guard"),
	Grieving    UMETA(DisplayName = "Grieving"),
};

// ── Gesture type ─────────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomGestureType : uint8
{
	Wave        UMETA(DisplayName = "Wave"),
	Point       UMETA(DisplayName = "Point"),
	CrossArms   UMETA(DisplayName = "Cross Arms"),
	Bow         UMETA(DisplayName = "Bow"),
	Shrug       UMETA(DisplayName = "Shrug"),
	Nod         UMETA(DisplayName = "Nod"),
	ShakeHead   UMETA(DisplayName = "Shake Head"),
	Beckon      UMETA(DisplayName = "Beckon"),
	Dismiss     UMETA(DisplayName = "Dismiss"),
	Salute      UMETA(DisplayName = "Salute"),
};

// ── IK target pose ───────────────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomIKTargets
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Animation")
	bool bUseLeftHand = false;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Animation")
	FVector LeftHandTarget = FVector::ZeroVector;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Animation")
	bool bUseRightHand = false;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Animation")
	FVector RightHandTarget = FVector::ZeroVector;

	/** World-space look-at target for head IK */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Animation")
	bool bUseLookAt = false;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Animation")
	FVector LookAtTarget = FVector::ZeroVector;

	/** IK blend weight (0 = full procedural FK, 1 = full IK) */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Animation")
	float BlendWeight = 1.0f;
};

/**
 * UBridgeLoomNPCAnimation
 *
 * ActorComponent that drives full-body animation for Tier 3/4 NPCs:
 *   - Idle personality → selects idle AnimMontage set
 *   - Gesture system   → triggers named montages with completion callback
 *   - Two-bone IK      → hand reach + head look-at targets
 *   - Animation instancing toggle for crowd-range entities
 *
 * Depends on: parent actor must have a USkeletalMeshComponent with an
 * AnimInstance that exposes the standard Loom NPC animation graph.
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent))
class BRIDGELOOM_API UBridgeLoomNPCAnimation : public UActorComponent
{
	GENERATED_BODY()

public:
	UBridgeLoomNPCAnimation();

	virtual void BeginPlay() override;
	virtual void TickComponent(float DeltaTime, ELevelTick TickType,
		FActorComponentTickFunction* ThisTickFunction) override;

	// ── Configuration ────────────────────────────────────────────

	/** Gesture montage assets keyed by ELoomGestureType index */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Animation")
	TMap<uint8, TSoftObjectPtr<UAnimMontage>> GestureMontages;

	/** Idle montage per personality (loops) */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Animation")
	TMap<uint8, TSoftObjectPtr<UAnimMontage>> IdleMontages;

	/** Blend speed for IK weight transitions */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Animation")
	float IKBlendSpeed = 5.0f;

	// ── Idle personality ─────────────────────────────────────────

	/** Switch idle anim set for this NPC. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Animation")
	void SetIdlePersonality(ELoomIdlePersonality Personality);

	UFUNCTION(BlueprintPure, Category = "Loom|Animation")
	ELoomIdlePersonality GetIdlePersonality() const { return CurrentPersonality; }

	// ── Gesture system ───────────────────────────────────────────

	/** Trigger a gesture. Blends out current gesture if one is playing. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Animation")
	void PlayGesture(ELoomGestureType GestureType, float PlayRate = 1.0f);

	/** Stop any playing gesture immediately. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Animation")
	void StopGesture();

	UFUNCTION(BlueprintPure, Category = "Loom|Animation")
	bool IsPlayingGesture() const { return bGesturePlaying; }

	// ── IK targets ───────────────────────────────────────────────

	/** Update hand + head IK targets. Blend weight ramps in over IKBlendSpeed. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Animation")
	void SetIKTargets(const FLoomIKTargets& Targets);

	/** Blend IK back to zero and clear targets. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Animation")
	void ClearIKTargets();

	UFUNCTION(BlueprintPure, Category = "Loom|Animation")
	FLoomIKTargets GetCurrentIKTargets() const { return CurrentIK; }

	// ── Interaction helper ───────────────────────────────────────

	/**
	 * Orient the NPC toward TargetActor and trigger a contextual greeting
	 * gesture based on current personality.
	 */
	UFUNCTION(BlueprintCallable, Category = "Loom|Animation")
	void BeginInteractionWith(AActor* TargetActor);

	// ── Crowd animation instancing ───────────────────────────────

	/**
	 * Enable/disable shared animation blueprint mode for crowd use.
	 * When enabled, per-instance blend shapes are skipped for performance.
	 */
	UFUNCTION(BlueprintCallable, Category = "Loom|Animation")
	void SetAnimationInstancing(bool bEnabled);

	UFUNCTION(BlueprintPure, Category = "Loom|Animation")
	bool IsAnimationInstancingEnabled() const { return bAnimationInstancing; }

	// ── Delegates ────────────────────────────────────────────────

	DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnGestureComplete, ELoomGestureType, Gesture);
	UPROPERTY(BlueprintAssignable, Category = "Loom|Animation")
	FOnGestureComplete OnGestureComplete;

private:
	ELoomIdlePersonality CurrentPersonality   = ELoomIdlePersonality::Relaxed;
	ELoomGestureType     CurrentGesture       = ELoomGestureType::Wave;
	bool                 bGesturePlaying      = false;
	float                GestureTimeRemaining = 0.0f;
	FLoomIKTargets       CurrentIK;
	float                CurrentIKBlend       = 0.0f;
	bool                 bAnimationInstancing = false;

	void TickGesture(float DeltaTime);
	void TickIKBlend(float DeltaTime);
	void ApplyIKToAnimInstance();
};
