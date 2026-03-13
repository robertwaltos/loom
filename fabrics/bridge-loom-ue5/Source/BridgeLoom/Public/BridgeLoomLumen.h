// Copyright Project Loom. All Rights Reserved.
// Thread: bridge/bridge-loom-ue5/lumen
// Tier: 1
//
// Lumen GI + Reflections control, time-compressed day/night cycle,
// and Volumetric Cloud parameters — all driven by loom-core weather state.
//
// Time compression: 1 real-world second at default TimeScale=1 advances
// 1 simulated minute (so 1 IRL hour = 1 in-game day).

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomLumen.generated.h"

// ── Time of day ───────────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomTimeOfDay : uint8
{
	Midnight    UMETA(DisplayName = "Midnight"),        // 00:00
	PreDawn     UMETA(DisplayName = "Pre-Dawn"),        // 04:00
	Dawn        UMETA(DisplayName = "Dawn"),            // 06:00
	Morning     UMETA(DisplayName = "Morning"),         // 08:00
	Noon        UMETA(DisplayName = "Noon"),            // 12:00
	Afternoon   UMETA(DisplayName = "Afternoon"),       // 15:00
	Dusk        UMETA(DisplayName = "Dusk"),            // 18:00
	Evening     UMETA(DisplayName = "Evening"),         // 20:00
	Night       UMETA(DisplayName = "Night"),           // 22:00
};

// ── Sky state snapshot ────────────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomSkyState
{
	GENERATED_BODY()

	/** Current game-world hour (0.0–24.0) */
	UPROPERTY(BlueprintReadOnly, Category = "Loom|Sky")
	float GameHour = 12.0f;

	/** Sun/moon pitch angle driving the DirectionalLight rotation */
	UPROPERTY(BlueprintReadOnly, Category = "Loom|Sky")
	FRotator SunRotation = FRotator(-45.0f, 0.0f, 0.0f);

	/** Sun lux intensity (0 at night, ~100000 at noon) */
	UPROPERTY(BlueprintReadOnly, Category = "Loom|Sky")
	float SunIntensityLux = 75000.0f;

	/** Current time-of-day band */
	UPROPERTY(BlueprintReadOnly, Category = "Loom|Sky")
	ELoomTimeOfDay TimeOfDay = ELoomTimeOfDay::Noon;

	/** Volumetric cloud coverage 0-1 */
	UPROPERTY(BlueprintReadOnly, Category = "Loom|Sky")
	float CloudCoverage = 0.3f;

	/** Volumetric cloud density 0-1 */
	UPROPERTY(BlueprintReadOnly, Category = "Loom|Sky")
	float CloudDensity = 0.5f;

	/** Star map opacity (blends in when sun is below horizon) */
	UPROPERTY(BlueprintReadOnly, Category = "Loom|Sky")
	float StarMapAlpha = 0.0f;
};

/**
 * UBridgeLoomLumen
 *
 * Drives Lumen GI/Reflections and the full sky system from Loom server state.
 * Attach to a persistent actor (GameMode / LevelBlueprint actor).
 *
 * Actor tag conventions (set on actors in the level):
 *   LoomSun         — DirectionalLightComponent actor (key light)
 *   LoomSkyLight    — SkyLightComponent actor
 *   LoomAtmosphere  — SkyAtmosphereComponent actor
 *   LoomClouds      — VolumetricCloudComponent actor
 *
 * The component finds tagged actors at BeginPlay and caches them.
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent))
class BRIDGELOOM_API UBridgeLoomLumen : public UActorComponent
{
	GENERATED_BODY()

public:
	UBridgeLoomLumen();

	virtual void BeginPlay() override;
	virtual void TickComponent(float DeltaTime, ELevelTick TickType,
		FActorComponentTickFunction* ThisTickFunction) override;

	// ── Time scale ────────────────────────────────────────────────

	/**
	 * Minutes of game time per second of real time.
	 * Default 1.0 → 1 IRL minute = 1 game minute (1:1).
	 * Set to 24.0 → 1 IRL hour = 1 full game day.
	 */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Sky",
		meta = (ClampMin = "0.001", ClampMax = "3600"))
	float TimeScaleMinutesPerSecond = 24.0f;

	/** Starting hour (0-24) */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Sky",
		meta = (ClampMin = "0.0", ClampMax = "24.0"))
	float StartGameHour = 6.0f;

	// ── Sky control ───────────────────────────────────────────────

	/** Jump to a specific game-hour and update sky immediately. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Sky")
	void SetTimeOfDay(float GameHour);

	/** One-shot override of cloud parameters (e.g. from weather state). */
	UFUNCTION(BlueprintCallable, Category = "Loom|Sky")
	void SetWeatherClouds(float Coverage, float Density);

	/** Return current sky snapshot. */
	UFUNCTION(BlueprintPure, Category = "Loom|Sky")
	FLoomSkyState GetCurrentSkyState() const { return CurrentSkyState; }

	// ── Lumen toggles ─────────────────────────────────────────────

	/** Enable or disable Lumen diffuse GI (r.Lumen.DiffuseIndirect.Allow). */
	UFUNCTION(BlueprintCallable, Category = "Loom|Lumen")
	void EnableLumenGI(bool bEnable);

	/** Enable or disable Lumen reflections (r.Lumen.Reflections.Allow). */
	UFUNCTION(BlueprintCallable, Category = "Loom|Lumen")
	void EnableLumenReflections(bool bEnable);

	/** Enable or disable hardware ray-tracing (r.RayTracing.Enable). */
	UFUNCTION(BlueprintCallable, Category = "Loom|Lumen")
	void EnableRayTracing(bool bEnable);

	// ── Delegate ──────────────────────────────────────────────────

	DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnDayNightTransition,
	                                              ELoomTimeOfDay, NewPeriod,
	                                              float, GameHour);
	UPROPERTY(BlueprintAssignable, Category = "Loom|Sky")
	FOnDayNightTransition OnDayNightTransition;

private:
	FLoomSkyState CurrentSkyState;
	ELoomTimeOfDay LastBroadcastPeriod = ELoomTimeOfDay::Noon;

	// Cached scene actors (found at BeginPlay by tag)
	TWeakObjectPtr<AActor> SunActor;
	TWeakObjectPtr<AActor> SkyLightActor;
	TWeakObjectPtr<AActor> CloudActor;

	void FindSceneActors();
	void ApplySkyState(const FLoomSkyState& State);
	void UpdateSunRotation(float GameHour);
	void UpdateCloudParameters(float Coverage, float Density);
	ELoomTimeOfDay GameHourToTimeOfDay(float Hour) const;
};
