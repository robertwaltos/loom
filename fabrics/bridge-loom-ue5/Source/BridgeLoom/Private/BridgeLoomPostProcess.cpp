// Copyright Project Loom. All Rights Reserved.

#include "BridgeLoomPostProcess.h"
#include "Engine/World.h"

// ── Constructor ──────────────────────────────────────────────────

UBridgeLoomPostProcess::UBridgeLoomPostProcess()
{
	PrimaryComponentTick.bCanEverTick = true;
	BlendProgress = 1.0f;
	BlendDuration = 1.0f;
}

// ── Lifecycle ────────────────────────────────────────────────────

void UBridgeLoomPostProcess::BeginPlay()
{
	Super::BeginPlay();
}

void UBridgeLoomPostProcess::TickComponent(float DeltaTime,
                                            ELevelTick TickType,
                                            FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);
	TickPresetBlend(DeltaTime);
	TickScreenEffects(DeltaTime);
}

// ── Biome grading ────────────────────────────────────────────────

void UBridgeLoomPostProcess::SetBiome(ELoomWorldBiome Biome, float BlendSeconds)
{
	if (const FLoomPostProcessPreset* Preset = BiomePresets.Find(TEnumAsByte<ELoomWorldBiome>(Biome)))
	{
		ApplyPreset(*Preset, BlendSeconds);
	}
}

void UBridgeLoomPostProcess::ApplyPreset(const FLoomPostProcessPreset& Preset,
                                          float BlendSeconds)
{
	CurrentPreset  = TargetPreset;	// snapshot where we are right now
	TargetPreset   = Preset;
	BlendDuration  = FMath::Max(0.01f, BlendSeconds);
	BlendProgress  = 0.0f;
}

// ── Screen effects ────────────────────────────────────────────────

void UBridgeLoomPostProcess::AddScreenEffect(const FLoomScreenEffect& Effect)
{
	FActiveScreenEffect Active;
	Active.Config      = Effect;
	Active.Age         = 0.0f;
	Active.CurStrength = 0.0f;
	ActiveScreenEffects.Add(Effect.EffectId, Active);
}

void UBridgeLoomPostProcess::RemoveScreenEffect(const FString& EffectId)
{
	if (FActiveScreenEffect* Active = ActiveScreenEffects.Find(EffectId))
	{
		// Force fade-out by setting duration so it will expire naturally,
		// or remove immediately if no fade defined
		if (Active->Config.FadeOutSeconds <= 0.0f)
		{
			ActiveScreenEffects.Remove(EffectId);
		}
		else
		{
			// Set remaining duration to fade-out time
			Active->Config.Duration = Active->Config.FadeOutSeconds;
			Active->Age = 0.0f;
		}
	}
}

void UBridgeLoomPostProcess::FlashDamage(const FLinearColor& Color, float ShockSeconds)
{
	FLoomScreenEffect Flash;
	Flash.EffectId        = TEXT("__DamageFlash__");
	Flash.TintColor       = Color;
	Flash.TintStrength    = 0.3f;
	Flash.Duration        = ShockSeconds;
	Flash.FadeInSeconds   = 0.0f;
	Flash.FadeOutSeconds  = ShockSeconds;
	AddScreenEffect(Flash);
}

void UBridgeLoomPostProcess::SetCinematicDoF(float FocalDistance, float Fstop,
                                              float BlendSeconds)
{
	FLoomPostProcessPreset DoFPreset = CurrentPreset;
	DoFPreset.DepthOfFieldFocalDistance = FocalDistance;
	DoFPreset.DepthOfFieldFstop        = Fstop;
	ApplyPreset(DoFPreset, BlendSeconds);
}

void UBridgeLoomPostProcess::DisableCinematicDoF(float BlendSeconds)
{
	FLoomPostProcessPreset NoDoF = TargetPreset;
	NoDoF.DepthOfFieldFstop = 0.0f;
	ApplyPreset(NoDoF, BlendSeconds);
}

// ── Tick helpers ─────────────────────────────────────────────────

void UBridgeLoomPostProcess::TickPresetBlend(float DeltaTime)
{
	if (BlendProgress >= 1.0f) return;

	BlendProgress += DeltaTime / BlendDuration;
	BlendProgress  = FMath::Clamp(BlendProgress, 0.0f, 1.0f);

	const FLoomPostProcessPreset Blended = LerpPresets(CurrentPreset, TargetPreset, BlendProgress);
	ApplyToVolume(Blended);
}

void UBridgeLoomPostProcess::TickScreenEffects(float DeltaTime)
{
	TArray<FString> ToRemove;

	for (auto& [Id, Active] : ActiveScreenEffects)
	{
		Active.Age += DeltaTime;
		const FLoomScreenEffect& Cfg = Active.Config;

		// Fade in
		float Strength = 1.0f;
		if (Cfg.FadeInSeconds > 0.0f && Active.Age < Cfg.FadeInSeconds)
		{
			Strength = Active.Age / Cfg.FadeInSeconds;
		}

		// Duration expiry
		if (Cfg.Duration >= 0.0f)
		{
			const float TimeLeft = Cfg.Duration - Active.Age;
			if (TimeLeft <= 0.0f)
			{
				ToRemove.Add(Id);
				continue;
			}
			// Fade out
			if (Cfg.FadeOutSeconds > 0.0f && TimeLeft < Cfg.FadeOutSeconds)
			{
				Strength = FMath::Min(Strength, TimeLeft / Cfg.FadeOutSeconds);
			}
		}

		Active.CurStrength = Strength;
	}

	for (const FString& Id : ToRemove) ActiveScreenEffects.Remove(Id);
}

void UBridgeLoomPostProcess::ApplyToVolume(const FLoomPostProcessPreset& P)
{
	APostProcessVolume* Vol = TargetVolume.Get();
	if (!IsValid(Vol)) return;

	FPostProcessSettings& Settings = Vol->Settings;

	Settings.ColorSaturation  = P.ColorSaturation;
	Settings.ColorContrast    = P.ColorContrast;
	Settings.ColorGamma       = P.ColorGamma;
	Settings.ColorGain        = P.ColorGain;
	Settings.BloomIntensity   = P.BloomIntensity;
	Settings.VignetteIntensity = P.VignetteIntensity;
	Settings.LensFlareIntensity = P.LensFlareIntensity;
	Settings.AutoExposureBias = P.ExposureCompensation;

	if (P.DepthOfFieldFstop > 0.0f)
	{
		Settings.DepthOfFieldFocalDistance = P.DepthOfFieldFocalDistance;
		Settings.DepthOfFieldFstop         = P.DepthOfFieldFstop;
	}
	else
	{
		Settings.DepthOfFieldFstop = 0.0f;
	}
}

FLoomPostProcessPreset UBridgeLoomPostProcess::LerpPresets(
	const FLoomPostProcessPreset& A,
	const FLoomPostProcessPreset& B,
	float Alpha) const
{
	FLoomPostProcessPreset Out;
	Out.ColorSaturation         = FMath::Lerp(A.ColorSaturation, B.ColorSaturation, Alpha);
	Out.ColorContrast           = FMath::Lerp(A.ColorContrast,   B.ColorContrast,   Alpha);
	Out.ColorGamma              = FMath::Lerp(A.ColorGamma,       B.ColorGamma,       Alpha);
	Out.ColorGain               = FMath::Lerp(A.ColorGain,        B.ColorGain,        Alpha);
	Out.BloomIntensity          = FMath::Lerp(A.BloomIntensity,   B.BloomIntensity,   Alpha);
	Out.DepthOfFieldFocalDistance = FMath::Lerp(A.DepthOfFieldFocalDistance, B.DepthOfFieldFocalDistance, Alpha);
	Out.DepthOfFieldFstop       = FMath::Lerp(A.DepthOfFieldFstop, B.DepthOfFieldFstop, Alpha);
	Out.VignetteIntensity       = FMath::Lerp(A.VignetteIntensity, B.VignetteIntensity, Alpha);
	Out.LensFlareIntensity      = FMath::Lerp(A.LensFlareIntensity, B.LensFlareIntensity, Alpha);
	Out.ExposureCompensation    = FMath::Lerp(A.ExposureCompensation, B.ExposureCompensation, Alpha);
	Out.LumenGIIntensity        = FMath::Lerp(A.LumenGIIntensity, B.LumenGIIntensity, Alpha);
	return Out;
}
