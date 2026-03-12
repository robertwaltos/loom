// Copyright Project Loom. All Rights Reserved.

#include "BridgeLoomWeaveZone.h"
#include "Engine/World.h"
#include "Engine/PostProcessVolume.h"
#include "Components/ExponentialHeightFogComponent.h"
#include "Atmosphere/AtmosphericFogComponent.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "GameFramework/PlayerController.h"
#include "Engine/Engine.h"

DEFINE_LOG_CATEGORY(LogBridgeLoomWeave);

// ── Constructor ─────────────────────────────────────────────────

UBridgeLoomWeaveZone::UBridgeLoomWeaveZone()
{
	PrimaryComponentTick.bCanEverTick = true;
	PrimaryComponentTick.TickGroup = TG_PostPhysics;
	// < 0.5ms budget per tick — light work only
	PrimaryComponentTick.bStartWithTickEnabled = false;
}

// ── Transition Control ──────────────────────────────────────────

void UBridgeLoomWeaveZone::BeginTransition(const FWeaveTransitionParams& Params)
{
	if (bIsTransitioning)
	{
		UE_LOG(LogBridgeLoomWeave, Warning,
			TEXT("Already transitioning — abort first before starting new transition"));
		return;
	}

	CurrentParams = Params;
	CurrentBlendFactor = 0.0f;
	TransitionElapsed = 0.0f;
	bIsTransitioning = true;
	bFallbackActive = false;

	PrimaryComponentTick.SetTickFunctionEnable(true);

	UE_LOG(LogBridgeLoomWeave, Log,
		TEXT("Weave transition started: %s → %s (%.1fs, curve=%d)"),
		*Params.SourceWorldId,
		*Params.DestinationWorldId,
		Params.DurationSeconds,
		static_cast<int32>(Params.BlendCurve));

	OnTransitionStarted.Broadcast(Params);
}

void UBridgeLoomWeaveZone::SetBlendFactor(float Factor)
{
	CurrentBlendFactor = FMath::Clamp(Factor, 0.0f, 1.0f);
	ApplyBlendToMaterials(CurrentBlendFactor);
	Stats.LastBlendFactor = CurrentBlendFactor;
	OnBlendFactorChanged.Broadcast(CurrentBlendFactor);
}

void UBridgeLoomWeaveZone::CompleteTransition()
{
	if (!bIsTransitioning)
	{
		return;
	}

	CurrentBlendFactor = 1.0f;
	ApplyBlendToMaterials(1.0f);
	bIsTransitioning = false;
	PrimaryComponentTick.SetTickFunctionEnable(false);

	Stats.TotalTransitions++;
	AccumulatedDuration += TransitionElapsed;
	Stats.AverageTransitionDuration =
		AccumulatedDuration / static_cast<float>(Stats.TotalTransitions);

	UE_LOG(LogBridgeLoomWeave, Log,
		TEXT("Weave transition completed → %s (%.2fs)"),
		*CurrentParams.DestinationWorldId,
		TransitionElapsed);

	OnTransitionCompleted.Broadcast(CurrentParams.DestinationWorldId);
}

void UBridgeLoomWeaveZone::AbortTransition()
{
	if (!bIsTransitioning)
	{
		return;
	}

	CurrentBlendFactor = 0.0f;
	ApplyBlendToMaterials(0.0f);
	bIsTransitioning = false;
	bFallbackActive = false;
	PrimaryComponentTick.SetTickFunctionEnable(false);

	UE_LOG(LogBridgeLoomWeave, Log,
		TEXT("Weave transition aborted (was blending to %s)"),
		*CurrentParams.DestinationWorldId);
}

// ── Tick ─────────────────────────────────────────────────────────

void UBridgeLoomWeaveZone::TickComponent(
	float DeltaTime,
	ELevelTick TickType,
	FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

	if (!bIsTransitioning)
	{
		return;
	}

	TransitionElapsed += DeltaTime;

	// Auto-advance blend factor based on elapsed / duration
	if (CurrentParams.DurationSeconds > 0.0f)
	{
		const float T = FMath::Clamp(
			TransitionElapsed / CurrentParams.DurationSeconds, 0.0f, 1.0f);
		const float BlendValue = EvaluateBlendCurve(T);
		SetBlendFactor(BlendValue);
	}

	// Check FPS — if below floor, trigger fallback
	CheckPerformanceFallback();

	// Auto-complete when blend reaches 1.0
	if (CurrentBlendFactor >= 1.0f)
	{
		CompleteTransition();
	}
}

// ── Blend Curve ─────────────────────────────────────────────────

float UBridgeLoomWeaveZone::EvaluateBlendCurve(float T) const
{
	switch (CurrentParams.BlendCurve)
	{
	case EWeaveBlendCurve::Linear:
		return T;

	case EWeaveBlendCurve::EaseIn:
		return T * T;

	case EWeaveBlendCurve::EaseOut:
		return 1.0f - (1.0f - T) * (1.0f - T);

	case EWeaveBlendCurve::EaseInOut:
		return T < 0.5f
			? 2.0f * T * T
			: 1.0f - FMath::Pow(-2.0f * T + 2.0f, 2.0f) / 2.0f;

	case EWeaveBlendCurve::Perceptual:
		// S-curve with steeper mid-section for more noticeable transition
		return FMath::InterpEaseInOut(0.0f, 1.0f, T, 3.0f);

	default:
		return T;
	}
}

// ── Material Application ────────────────────────────────────────

void UBridgeLoomWeaveZone::ApplyBlendToMaterials(float Factor)
{
	// Set post-process material parameter for dual-world blend
	if (BlendMaterial)
	{
		BlendMaterial->SetScalarParameterValue(
			FName(TEXT("WeaveBlendFactor")), Factor);
	}

	// Also drive fog opacity for volumetric fog transition
	if (FallbackFogActor && bFallbackActive)
	{
		if (UExponentialHeightFogComponent* FogComp =
			FallbackFogActor->FindComponentByClass<UExponentialHeightFogComponent>())
		{
			// Fade fog density in during mid-transition, out at edges
			const float FogFactor = FMath::Sin(Factor * PI);
			FogComp->SetFogDensity(0.05f * FogFactor);
			FogComp->SetFogInscatteringColor(
				FLinearColor::LerpUsingHSV(
					FLinearColor(0.6f, 0.7f, 0.9f),
					FLinearColor(0.3f, 0.9f, 0.5f),
					Factor));
		}
	}
}

// ── Performance Fallback ────────────────────────────────────────

void UBridgeLoomWeaveZone::CheckPerformanceFallback()
{
	if (bFallbackActive)
	{
		return; // Already in fallback mode
	}

	// Sample current FPS from engine stats
	const float CurrentFPS = GAverageFPS;

	if (CurrentFPS < CurrentParams.FpsFloorThreshold)
	{
		UE_LOG(LogBridgeLoomWeave, Warning,
			TEXT("FPS %.1f below floor %.1f — activating fallback: %d"),
			CurrentFPS,
			CurrentParams.FpsFloorThreshold,
			static_cast<int32>(CurrentParams.FallbackStrategy));

		ActivateFallback();
	}
}

void UBridgeLoomWeaveZone::ActivateFallback()
{
	bFallbackActive = true;
	Stats.FallbackTriggers++;

	switch (CurrentParams.FallbackStrategy)
	{
	case EWeaveFallbackStrategy::VolumetricFog:
		// Ramp up fog to obscure the transition seam
		if (FallbackFogActor)
		{
			if (UExponentialHeightFogComponent* FogComp =
				FallbackFogActor->FindComponentByClass<UExponentialHeightFogComponent>())
			{
				FogComp->SetFogDensity(0.15f);
				FogComp->SetVolumetricFog(true);
			}
		}
		break;

	case EWeaveFallbackStrategy::Portal:
		// Activate portal mesh overlay (Blueprint handles visual)
		UE_LOG(LogBridgeLoomWeave, Log,
			TEXT("Portal fallback activated — Blueprint visual handles portal ring"));
		break;

	case EWeaveFallbackStrategy::FadeToBlack:
		// Fast fade to black then swap worlds
		if (APlayerController* PC = GetWorld()->GetFirstPlayerController())
		{
			PC->PlayerCameraManager->StartCameraFade(
				0.0f, 1.0f, 1.0f, FLinearColor::Black, true, true);
		}
		break;

	case EWeaveFallbackStrategy::NarrativeBeat:
		// Trigger narrative UI overlay (handled by gameplay code)
		UE_LOG(LogBridgeLoomWeave, Log,
			TEXT("Narrative beat fallback — waiting for UI overlay"));
		break;
	}

	OnFallbackActivated.Broadcast(CurrentParams.FallbackStrategy);
}
