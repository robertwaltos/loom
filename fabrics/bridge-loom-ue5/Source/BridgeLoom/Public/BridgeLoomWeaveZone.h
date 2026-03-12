// Copyright Project Loom. All Rights Reserved.
// Thread: bridge/bridge-loom-ue5/weave-zone
// Tier: 1
//
// Weave Zone Component — Dual-world rendering for Silfen Weave transitions.
// Implements the WeaveZoneRenderer contract from contracts/bridge-loom.
// Renders two worlds simultaneously with a blend factor, transitioning
// between them using material effects (fog, portal, or fade).

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomWeaveZone.generated.h"

DECLARE_LOG_CATEGORY_EXTERN(LogBridgeLoomWeave, Log, All);

// ── Blend Curve ─────────────────────────────────────────────────

UENUM(BlueprintType)
enum class EWeaveBlendCurve : uint8
{
	Linear       UMETA(DisplayName = "Linear"),
	EaseIn       UMETA(DisplayName = "Ease In"),
	EaseOut      UMETA(DisplayName = "Ease Out"),
	EaseInOut    UMETA(DisplayName = "Ease In-Out"),
	Perceptual   UMETA(DisplayName = "Perceptual"),
};

// ── Fallback Strategy ───────────────────────────────────────────

UENUM(BlueprintType)
enum class EWeaveFallbackStrategy : uint8
{
	VolumetricFog    UMETA(DisplayName = "Volumetric Fog"),
	Portal           UMETA(DisplayName = "Portal"),
	FadeToBlack      UMETA(DisplayName = "Fade to Black"),
	NarrativeBeat    UMETA(DisplayName = "Narrative Beat"),
};

// ── Transition Params ───────────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FWeaveTransitionParams
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Weave")
	FString SourceWorldId;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Weave")
	FString DestinationWorldId;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Weave")
	float DurationSeconds = 3.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Weave")
	EWeaveBlendCurve BlendCurve = EWeaveBlendCurve::EaseInOut;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Weave")
	EWeaveFallbackStrategy FallbackStrategy = EWeaveFallbackStrategy::VolumetricFog;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Weave")
	float FpsFloorThreshold = 24.0f;
};

// ── Weave Zone Stats ────────────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FWeaveZoneStats
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Weave")
	int32 TotalTransitions = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Weave")
	int32 FallbackTriggers = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Weave")
	float AverageTransitionDuration = 0.0f;

	UPROPERTY(BlueprintReadOnly, Category = "Weave")
	float LastBlendFactor = 0.0f;
};

// ── Delegates ───────────────────────────────────────────────────

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
	FOnWeaveTransitionStarted, const FWeaveTransitionParams&, Params);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
	FOnWeaveBlendFactorChanged, float, BlendFactor);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
	FOnWeaveTransitionCompleted, const FString&, DestinationWorldId);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
	FOnWeaveFallbackActivated, EWeaveFallbackStrategy, Strategy);

// ── Component ───────────────────────────────────────────────────

UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent))
class BRIDGELOOM_API UBridgeLoomWeaveZone : public UActorComponent
{
	GENERATED_BODY()

public:
	UBridgeLoomWeaveZone();

	// ── Lifecycle ─────────────────────────────────────────────
	virtual void TickComponent(
		float DeltaTime,
		ELevelTick TickType,
		FActorComponentTickFunction* ThisTickFunction) override;

	// ── Transition Control ────────────────────────────────────

	/** Begin a dual-world transition. Source world stays; destination loads. */
	UFUNCTION(BlueprintCallable, Category = "Weave")
	void BeginTransition(const FWeaveTransitionParams& Params);

	/** Force blend factor (0.0 = source, 1.0 = destination). */
	UFUNCTION(BlueprintCallable, Category = "Weave")
	void SetBlendFactor(float Factor);

	/** Complete transition — source world unloads. */
	UFUNCTION(BlueprintCallable, Category = "Weave")
	void CompleteTransition();

	/** Abort transition — snap back to source world. */
	UFUNCTION(BlueprintCallable, Category = "Weave")
	void AbortTransition();

	// ── Query ─────────────────────────────────────────────────

	UFUNCTION(BlueprintPure, Category = "Weave")
	bool IsTransitioning() const { return bIsTransitioning; }

	UFUNCTION(BlueprintPure, Category = "Weave")
	float GetCurrentBlendFactor() const { return CurrentBlendFactor; }

	UFUNCTION(BlueprintPure, Category = "Weave")
	FWeaveZoneStats GetStats() const { return Stats; }

	UFUNCTION(BlueprintPure, Category = "Weave")
	FString GetSourceWorldId() const { return CurrentParams.SourceWorldId; }

	UFUNCTION(BlueprintPure, Category = "Weave")
	FString GetDestinationWorldId() const { return CurrentParams.DestinationWorldId; }

	// ── Delegates ─────────────────────────────────────────────

	UPROPERTY(BlueprintAssignable, Category = "Weave")
	FOnWeaveTransitionStarted OnTransitionStarted;

	UPROPERTY(BlueprintAssignable, Category = "Weave")
	FOnWeaveBlendFactorChanged OnBlendFactorChanged;

	UPROPERTY(BlueprintAssignable, Category = "Weave")
	FOnWeaveTransitionCompleted OnTransitionCompleted;

	UPROPERTY(BlueprintAssignable, Category = "Weave")
	FOnWeaveFallbackActivated OnFallbackActivated;

protected:
	/** Apply blend via post-process material parameters. */
	void ApplyBlendToMaterials(float Factor);

	/** Check FPS and trigger fallback if below threshold. */
	void CheckPerformanceFallback();

	/** Evaluate curve to get effective blend at time t (0-1). */
	float EvaluateBlendCurve(float T) const;

	/** Activate fallback strategy (fog/portal/fade). */
	void ActivateFallback();

private:
	bool bIsTransitioning = false;
	float CurrentBlendFactor = 0.0f;
	float TransitionElapsed = 0.0f;
	bool bFallbackActive = false;
	FWeaveTransitionParams CurrentParams;
	FWeaveZoneStats Stats;
	float AccumulatedDuration = 0.0f;

	/** Dynamic material instance for blend shader. */
	UPROPERTY()
	TObjectPtr<UMaterialInstanceDynamic> BlendMaterial;

	/** Post-process volume reference (set by level designer). */
	UPROPERTY(EditAnywhere, Category = "Weave")
	TObjectPtr<class APostProcessVolume> PostProcessVolume;

	/** Fog actor for volumetric fog fallback. */
	UPROPERTY(EditAnywhere, Category = "Weave")
	TObjectPtr<class AExponentialHeightFog> FallbackFogActor;
};
