// Copyright Koydo. All Rights Reserved.
// BridgeLoomDayNightCycle.h — UE5 bridge for day-night-cycle.ts world clock and lighting.
//
// day-night-cycle.ts defines:
//   - 8 DayPhases: DAWN / MORNING / MIDDAY / AFTERNOON / DUSK / EVENING / MIDNIGHT / DEEP_NIGHT
//   - LightingState: intensity (float), colorTemperature (float), shadowLength (float)
//   - TimeOfDay: hours / minutes / seconds / microsUs
//   - PhaseTransition: worldId, fromPhase, toPhase, transitionTimeMicros
//
// UE5 bridge strategy:
//   - Holds soft-object refs to the world's Directional Light and Sky Atmosphere actors.
//   - ApplyLightingState drives their components directly (no ticks needed — server pushes changes).
//   - NotifyPhaseTransition fires the delegate and optionally requests a Lumen GI hint.
//   - All actors are referenced as TSoftObjectPtr to avoid hard loading at component creation.

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomDayNightCycle.generated.h"

// ─── Enums ────────────────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomDayPhase : uint8
{
    Dawn      UMETA(DisplayName = "Dawn"),
    Morning   UMETA(DisplayName = "Morning"),
    Midday    UMETA(DisplayName = "Midday"),
    Afternoon UMETA(DisplayName = "Afternoon"),
    Dusk      UMETA(DisplayName = "Dusk"),
    Evening   UMETA(DisplayName = "Evening"),
    Midnight  UMETA(DisplayName = "Midnight"),
    DeepNight UMETA(DisplayName = "Deep Night"),
};

// ─── Structs ──────────────────────────────────────────────────────

/** Server-computed light intensity/colour/shadow values for the current phase. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomLightingState
{
    GENERATED_BODY()

    /** Directional light lux (0.0 – 150,000 range matches real sky). */
    UPROPERTY(BlueprintReadOnly, Category = "DayNight")
    float Intensity = 10000.0f;

    /** Colour temperature in Kelvin (1700 candlelight … 20000 blue sky). */
    UPROPERTY(BlueprintReadOnly, Category = "DayNight")
    float ColorTemperature = 6500.0f;

    /** Directional light forward-shadow length scale [0, 1]. */
    UPROPERTY(BlueprintReadOnly, Category = "DayNight")
    float ShadowLength = 0.5f;
};

/** Current world clock value. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomTimeOfDay
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "DayNight")
    int32 Hours = 0;

    UPROPERTY(BlueprintReadOnly, Category = "DayNight")
    int32 Minutes = 0;

    UPROPERTY(BlueprintReadOnly, Category = "DayNight")
    int32 Seconds = 0;

    UPROPERTY(BlueprintReadOnly, Category = "DayNight")
    int64 MicrosUs = 0;

    /** WorldId this clock belongs to. */
    UPROPERTY(BlueprintReadOnly, Category = "DayNight")
    FString WorldId;
};

/** A transition event emitted when the phase boundary is crossed. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomPhaseTransition
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "DayNight")
    FString WorldId;

    UPROPERTY(BlueprintReadOnly, Category = "DayNight")
    ELoomDayPhase FromPhase = ELoomDayPhase::Midnight;

    UPROPERTY(BlueprintReadOnly, Category = "DayNight")
    ELoomDayPhase ToPhase = ELoomDayPhase::Dawn;

    UPROPERTY(BlueprintReadOnly, Category = "DayNight")
    int64 TransitionTimeMicros = 0;
};

// ─── Component ────────────────────────────────────────────────────

/**
 * UBridgeLoomDayNightCycle — ActorComponent bridging day-night-cycle.ts
 * world clock events to UE5 directional-light and sky-atmosphere actors.
 *
 * Attach to the level's ambient-manager Actor or GameState.
 * Assign DirectionalLightActor / SkyAtmosphereActor in the Details panel.
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent),
       DisplayName = "Loom Day Night Cycle")
class BRIDGELOOM_API UBridgeLoomDayNightCycle : public UActorComponent
{
    GENERATED_BODY()

public:
    UBridgeLoomDayNightCycle();

    // ── Configuration ─────────────────────────────────────────────

    /** Soft reference to the level's main Directional Light actor. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DayNight|Lighting")
    TSoftObjectPtr<AActor> DirectionalLightActor;

    /** Soft reference to the level's Sky Atmosphere actor. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DayNight|Lighting")
    TSoftObjectPtr<AActor> SkyAtmosphereActor;

    /** When true, immediately resolve soft refs and apply lighting on BeginPlay. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DayNight")
    bool bApplyLightingOnBeginPlay = false;

    // ── State ─────────────────────────────────────────────────────

    UPROPERTY(BlueprintReadOnly, Category = "DayNight")
    FLoomLightingState CurrentLighting;

    UPROPERTY(BlueprintReadOnly, Category = "DayNight")
    FLoomTimeOfDay CurrentTime;

    UPROPERTY(BlueprintReadOnly, Category = "DayNight")
    ELoomDayPhase CurrentPhase = ELoomDayPhase::Midday;

    UPROPERTY(BlueprintReadOnly, Category = "DayNight")
    FLoomPhaseTransition LastTransition;

    // ── Inbound (transport → bridge) ─────────────────────────────

    UFUNCTION(BlueprintCallable, Category = "DayNight")
    void NotifyPhaseTransition(const FLoomPhaseTransition& Transition);

    /**
     * Apply a lighting snapshot from the server.
     * Updates the DirectionalLight intensity + colour temperature.
     */
    UFUNCTION(BlueprintCallable, Category = "DayNight")
    void ApplyLightingState(const FLoomLightingState& State);

    /** Mirror the current world clock for HUD display. */
    UFUNCTION(BlueprintCallable, Category = "DayNight")
    void ApplyTimeOfDay(const FLoomTimeOfDay& Time);

    // ── Queries ───────────────────────────────────────────────────

    UFUNCTION(BlueprintPure, Category = "DayNight")
    bool IsNighttime() const;

    UFUNCTION(BlueprintPure, Category = "DayNight")
    FText GetPhaseDisplayName() const;

    // ── Delegates ─────────────────────────────────────────────────

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnPhaseChanged,
        FLoomPhaseTransition, Transition);
    UPROPERTY(BlueprintAssignable, Category = "DayNight|Events")
    FOnPhaseChanged OnPhaseChanged;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnLightingStateApplied,
        FLoomLightingState, State);
    UPROPERTY(BlueprintAssignable, Category = "DayNight|Events")
    FOnLightingStateApplied OnLightingStateApplied;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnTimeOfDayUpdated,
        FLoomTimeOfDay, Time);
    UPROPERTY(BlueprintAssignable, Category = "DayNight|Events")
    FOnTimeOfDayUpdated OnTimeOfDayUpdated;

protected:
    virtual void BeginPlay() override;

private:
    void ApplyLightingToScene(const FLoomLightingState& State);
};
