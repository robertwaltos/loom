// Copyright Koydo. All Rights Reserved.
// BridgeLoomHaptics.h — Controller haptic feedback patterns for Loom game events.
//
// Manages force-feedback and haptic rumble on gamepads and VR controllers.
// Pattern data is authored as curve assets; UBridgeLoomHaptics looks them up by
// ELoomHapticEvent and delegates to IInputInterface / ForceFeedback channels.
//
// Actor tags used for player detection: LoomPlayerPawn

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "GameFramework/ForceFeedbackEffect.h"
#include "BridgeLoomHaptics.generated.h"

// ─── Enumerations ──────────────────────────────────────────────────

/**
 * Semantic haptic events.  Map each to an authored UForceFeedbackEffect or
 * a programmatic waveform so designers can override per platform.
 */
UENUM(BlueprintType)
enum class ELoomHapticEvent : uint8
{
    None            UMETA(DisplayName = "None"),
    WeaveActivated  UMETA(DisplayName = "Weave Activated"),
    ImpactLight     UMETA(DisplayName = "Impact Light"),
    ImpactHeavy     UMETA(DisplayName = "Impact Heavy"),
    SpellCast       UMETA(DisplayName = "Spell Cast"),
    DamageTaken     UMETA(DisplayName = "Damage Taken"),
    ItemPickup      UMETA(DisplayName = "Item Pickup"),
    BuildComplete   UMETA(DisplayName = "Build Complete"),
    Footstep        UMETA(DisplayName = "Footstep"),
    HeartbeatLow    UMETA(DisplayName = "Heartbeat Low Health"),
    TeleportLand    UMETA(DisplayName = "Teleport Land"),
    UIConfirm       UMETA(DisplayName = "UI Confirm"),
    UIError         UMETA(DisplayName = "UI Error"),
    KillConfirm     UMETA(DisplayName = "Kill Confirm"),
    LootChest       UMETA(DisplayName = "Loot Chest"),
};

/** Which controller(s) to rumble. */
UENUM(BlueprintType)
enum class ELoomHapticTarget : uint8
{
    Both        UMETA(DisplayName = "Both"),
    Left        UMETA(DisplayName = "Left Only"),
    Right       UMETA(DisplayName = "Right Only"),
};

// ─── Structs ───────────────────────────────────────────────────────

/** Authored waveform entry for a haptic event (fallback if no asset exists). */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomHapticWaveform
{
    GENERATED_BODY()

    /** Duration of the rumble in seconds. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta = (ClampMin = "0.01", ClampMax = "5.0"))
    float DurationSeconds = 0.2f;

    /** Large motor amplitude [0-1]. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta = (ClampMin = "0.0", ClampMax = "1.0"))
    float LargeAmplitude = 0.5f;

    /** Small motor amplitude [0-1]. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta = (ClampMin = "0.0", ClampMax = "1.0"))
    float SmallAmplitude = 0.3f;

    /** Scale applied at runtime (0 = off). */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta = (ClampMin = "0.0", ClampMax = "1.0"))
    float IntensityScale = 1.0f;

    /** If set, play this asset instead of the programmatic waveform. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    TSoftObjectPtr<UForceFeedbackEffect> ForceFeedbackAsset;
};

/** Live tracking of an active rumble job. */
USTRUCT()
struct FLoomActiveHaptic
{
    GENERATED_BODY()

    ELoomHapticEvent Event = ELoomHapticEvent::None;
    ELoomHapticTarget Target = ELoomHapticTarget::Both;
    float RemainingSeconds = 0.f;
    float LargeAmplitude   = 0.f;
    float SmallAmplitude   = 0.f;
};

// ─── Component ────────────────────────────────────────────────────

/**
 * UBridgeLoomHaptics — ActorComponent attached to the player pawn.
 *
 * Provides:
 *  - PlayEvent(ELoomHapticEvent, ELoomHapticTarget) — programmatic waveform
 *  - PlayWaveform(FLoomHapticWaveform, Target) — designer waveform
 *  - StopAll() — cancel all active rumble
 *  - SetGlobalScale(float) — master intensity (e.g. for accessibility)
 *  - TickRumble — frame-accurate decay via ClientSetForceFeedbackParameters
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent),
       DisplayName = "Loom Haptics")
class BRIDGELOOM_API UBridgeLoomHaptics : public UActorComponent
{
    GENERATED_BODY()

public:
    UBridgeLoomHaptics();

    // ── Configuration ─────────────────────────────────────────────

    /** Waveform definitions per event.  Populate in DefaultGame.ini or per-BP. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Haptics|Config")
    TMap<ELoomHapticEvent, FLoomHapticWaveform> EventWaveforms;

    /** Master scale applied to all events [0 = fully off, 1 = full strength]. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Haptics|Config",
              meta = (ClampMin = "0.0", ClampMax = "1.0"))
    float GlobalIntensityScale = 1.0f;

    /** Maximum simultaneous haptic layers. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Haptics|Config",
              meta = (ClampMin = "1", ClampMax = "8"))
    int32 MaxActiveHaptics = 4;

    // ── Playback ──────────────────────────────────────────────────

    /**
     * Play a semantic haptic event on the owning player's controller.
     * Looks up the waveform from EventWaveforms; falls back to defaults if not found.
     */
    UFUNCTION(BlueprintCallable, Category = "Haptics")
    void PlayEvent(ELoomHapticEvent Event,
                   ELoomHapticTarget Target = ELoomHapticTarget::Both,
                   float IntensityOverride = -1.f);

    /** Play a raw waveform without a predefined event type. */
    UFUNCTION(BlueprintCallable, Category = "Haptics")
    void PlayWaveform(const FLoomHapticWaveform& Waveform,
                      ELoomHapticTarget Target = ELoomHapticTarget::Both);

    /** Immediately cancel all active haptic feedback. */
    UFUNCTION(BlueprintCallable, Category = "Haptics")
    void StopAll();

    /** Set the master intensity scale (useful for accessibility settings). */
    UFUNCTION(BlueprintCallable, Category = "Haptics")
    void SetGlobalScale(float Scale);

    /** Returns true if any haptic is currently active. */
    UFUNCTION(BlueprintPure, Category = "Haptics")
    bool IsRumbling() const;

    // ── Delegates ─────────────────────────────────────────────────

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnHapticStarted,
        ELoomHapticEvent, Event, ELoomHapticTarget, Target);

    UPROPERTY(BlueprintAssignable, Category = "Haptics|Events")
    FOnHapticStarted OnHapticStarted;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnHapticStopped,
        ELoomHapticEvent, Event);

    UPROPERTY(BlueprintAssignable, Category = "Haptics|Events")
    FOnHapticStopped OnHapticStopped;

    // ── UActorComponent ───────────────────────────────────────────

    virtual void BeginPlay() override;
    virtual void TickComponent(float DeltaTime, ELevelTick TickType,
                               FActorComponentTickFunction* ThisTickFunction) override;

private:
    // Active haptic layers being ticked
    TArray<FLoomActiveHaptic> ActiveHaptics;

    // Cached player controller reference
    TWeakObjectPtr<APlayerController> CachedController;

    // Default waveforms for events not in EventWaveforms map
    static FLoomHapticWaveform GetDefaultWaveform(ELoomHapticEvent Event);

    // Apply summed amplitudes to the controller this frame
    void FlushToController();

    // Tick all active haptics, decay timers, remove expired ones
    void TickHaptics(float DeltaTime);
};
