// BridgeLoomPostProcess.h — Per-world post-processing driven by Loom world state
// Handles biome colour grading, player buff/debuff screen FX, cinematic DoF.
// Thread: bridge/bridge-loom-ue5/postprocess
// Tier: 2

// Copyright Project Loom. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Engine/PostProcessVolume.h"
#include "BridgeLoomPostProcess.generated.h"

// ── Enums ─────────────────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomWorldBiome : uint8
{
	Verdant     UMETA(DisplayName = "Verdant Plains"),
	Scorched    UMETA(DisplayName = "Scorched Wastes"),
	Frozen      UMETA(DisplayName = "Frozen Tundra"),
	Arcane      UMETA(DisplayName = "Arcane Nexus"),
	Abyssal     UMETA(DisplayName = "Abyssal Depths"),
	Twilight    UMETA(DisplayName = "Twilight Realm"),
	Corrupted   UMETA(DisplayName = "Corrupted Zone"),
	Heavenly    UMETA(DisplayName = "Celestial Reach"),
};

// ── Structs ───────────────────────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomPostProcessPreset
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|PostProcess")
	FLinearColor ColorSaturation = FLinearColor(1, 1, 1, 1);

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|PostProcess")
	FLinearColor ColorContrast = FLinearColor(1, 1, 1, 1);

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|PostProcess")
	FLinearColor ColorGamma = FLinearColor(1, 1, 1, 1);

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|PostProcess")
	FLinearColor ColorGain = FLinearColor(1, 1, 1, 1);

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|PostProcess")
	float BloomIntensity = 1.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|PostProcess")
	float DepthOfFieldFocalDistance = 10000.0f;

	// 0 = disabled
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|PostProcess")
	float DepthOfFieldFstop = 0.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|PostProcess")
	float VignetteIntensity = 0.3f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|PostProcess")
	float LensFlareIntensity = 0.1f;

	// RGB channel offsets for chromatic aberration
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|PostProcess")
	FLinearColor ChromaticAberration = FLinearColor(0, 0, 0, 0);

	// EV compensation for day-night cycle
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|PostProcess")
	float ExposureCompensation = 0.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|PostProcess")
	float LumenGIIntensity = 1.0f;
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomScreenEffect
{
	GENERATED_BODY()

	// Unique id for later removal
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|ScreenFX")
	FString EffectId;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|ScreenFX")
	FLinearColor TintColor = FLinearColor::Transparent;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|ScreenFX")
	float TintStrength = 0.0f;

	// Extra vignette darkening (0–1)
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|ScreenFX")
	float VignetteBoost = 0.0f;

	// Radial blur for stun / concussion; 0 = none
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|ScreenFX")
	float BlurRadius = 0.0f;

	// Duration in seconds; -1 = permanent until RemoveScreenEffect
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|ScreenFX")
	float Duration = 3.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|ScreenFX")
	float FadeInSeconds = 0.3f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|ScreenFX")
	float FadeOutSeconds = 0.5f;
};

// ── Component ─────────────────────────────────────────────────────

/**
 * UBridgeLoomPostProcess — Actor component controlling UE5 post-process volumes
 * based on Loom world and player state.
 *
 * Features:
 *   - Smooth biome colour-grading transitions (saturation, contrast, gamma, gain)
 *   - Player buff/debuff screen tints (curse tint, damage flash, shield glow)
 *   - Day-night exposure compensation from BridgeLoomRenderer time-of-day
 *   - Cinematic DoF enable/disable for cutscene sequences
 *   - Lumen GI intensity control per world zone
 *
 * Attach to the world-manager actor alongside BridgeLoomRenderer. Assign
 * TargetVolume to a global unbounded PostProcessVolume in the level.
 */
UCLASS(ClassGroup=(Loom), meta=(BlueprintSpawnableComponent))
class BRIDGELOOM_API UBridgeLoomPostProcess : public UActorComponent
{
	GENERATED_BODY()

public:
	UBridgeLoomPostProcess();

	virtual void BeginPlay() override;
	virtual void TickComponent(float DeltaTime, ELevelTick TickType,
	                           FActorComponentTickFunction* ThisTickFunction) override;

	// -- Biome grading -------------------------------------------------------------

	/** Smoothly transition post-process settings to a new biome. */
	UFUNCTION(BlueprintCallable, Category = "Loom|PostProcess")
	void SetBiome(ELoomWorldBiome Biome, float BlendSeconds = 2.0f);

	/** Apply an arbitrary preset (e.g. from a data-driven server event). */
	UFUNCTION(BlueprintCallable, Category = "Loom|PostProcess")
	void ApplyPreset(const FLoomPostProcessPreset& Preset, float BlendSeconds = 1.0f);

	// -- Screen status effects -----------------------------------------------------

	UFUNCTION(BlueprintCallable, Category = "Loom|ScreenFX")
	void AddScreenEffect(const FLoomScreenEffect& Effect);

	UFUNCTION(BlueprintCallable, Category = "Loom|ScreenFX")
	void RemoveScreenEffect(const FString& EffectId);

	/** One-shot damage flash in the given colour. */
	UFUNCTION(BlueprintCallable, Category = "Loom|ScreenFX")
	void FlashDamage(
		const FLinearColor& Color   = FLinearColor(0.5f, 0.0f, 0.0f),
		float ShockSeconds          = 0.15f);

	// -- Cinematic DoF -------------------------------------------------------------

	UFUNCTION(BlueprintCallable, Category = "Loom|PostProcess")
	void SetCinematicDoF(float FocalDistance, float Fstop, float BlendSeconds = 0.5f);

	UFUNCTION(BlueprintCallable, Category = "Loom|PostProcess")
	void DisableCinematicDoF(float BlendSeconds = 0.5f);

	// -- Configuration -------------------------------------------------------------

	/** Biome preset library; populate in editor or via a DataTable at startup. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|PostProcess")
	TMap<TEnumAsByte<ELoomWorldBiome>, FLoomPostProcessPreset> BiomePresets;

	/** The unbounded PostProcessVolume that this component drives. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|PostProcess")
	TWeakObjectPtr<APostProcessVolume> TargetVolume;

private:
	FLoomPostProcessPreset CurrentPreset;
	FLoomPostProcessPreset TargetPreset;
	float BlendProgress = 1.0f;
	float BlendDuration = 1.0f;

	struct FActiveScreenEffect
	{
		FLoomScreenEffect Config;
		float Age          = 0.0f;
		float CurStrength  = 0.0f;
	};

	TMap<FString, FActiveScreenEffect> ActiveScreenEffects;

	void TickPresetBlend(float DeltaTime);
	void TickScreenEffects(float DeltaTime);
	void ApplyToVolume(const FLoomPostProcessPreset& P);
	FLoomPostProcessPreset LerpPresets(
		const FLoomPostProcessPreset& A,
		const FLoomPostProcessPreset& B,
		float Alpha) const;
};
