// Copyright Koydo. All Rights Reserved.
// BridgeLoomPixelStreaming.h — Pixel Streaming configuration and control for
//   standalone VR headsets (Meta Quest) and cloud gaming fallback.
//
// Wraps UE5 Pixel Streaming plugin settings so they can be driven at runtime
// by player device capability detection. Also exposes quality-tier presets for
// GeForce NOW / Xbox Cloud Gaming scenarios.
//
// Actor tags: none — component is attached to the GameMode or a manager actor.

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomPixelStreaming.generated.h"

// ─── Enumerations ──────────────────────────────────────────────────

/** Target delivery platform for Pixel Streaming. */
UENUM(BlueprintType)
enum class ELoomStreamTarget : uint8
{
    Disabled    UMETA(DisplayName = "Disabled"),
    Browser     UMETA(DisplayName = "Web Browser"),
    Quest       UMETA(DisplayName = "Meta Quest (WebXR)"),
    CloudGaming UMETA(DisplayName = "Cloud Gaming (GeForce NOW / xCloud)"),
    MobileApp   UMETA(DisplayName = "Mobile App"),
};

/** Encode quality preset. */
UENUM(BlueprintType)
enum class ELoomStreamQuality : uint8
{
    Low       UMETA(DisplayName = "Low  (720p 30fps)"),
    Medium    UMETA(DisplayName = "Medium (1080p 60fps)"),
    High      UMETA(DisplayName = "High (1440p 90fps)"),
    Quest     UMETA(DisplayName = "Quest (1920x1832 per-eye 72fps)"),
    UltraLow  UMETA(DisplayName = "UltraLow (480p 30fps fallback)"),
};

// ─── Structs ───────────────────────────────────────────────────────

/** Encoder and bitrate settings for a quality preset. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomStreamSettings
{
    GENERATED_BODY()

    /** Nominal render resolution width before any upscaling. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 ResolutionWidth = 1920;

    /** Nominal render resolution height. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 ResolutionHeight = 1080;

    /** Target frame rate. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta = (ClampMin = "15", ClampMax = "120"))
    int32 TargetFPS = 60;

    /** Encoder target bitrate in kbps. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta = (ClampMin = "500", ClampMax = "50000"))
    int32 BitrateKbps = 8000;

    /** RTCP-based adaptive bitrate enabled. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    bool bAdaptiveBitrate = true;

    /** TSF / TSR upscale quality [0=off, 1=native]. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta = (ClampMin = "0.0", ClampMax = "1.0"))
    float TemporalUpscaleQuality = 0.75f;
};

/** Live stream session state. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomStreamSessionState
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    ELoomStreamTarget Target = ELoomStreamTarget::Disabled;

    UPROPERTY(BlueprintReadOnly)
    ELoomStreamQuality Quality = ELoomStreamQuality::Medium;

    UPROPERTY(BlueprintReadOnly)
    bool bStreaming = false;

    UPROPERTY(BlueprintReadOnly)
    float CurrentBitrateKbps = 0.f;

    UPROPERTY(BlueprintReadOnly)
    float LatencyMs = 0.f;

    UPROPERTY(BlueprintReadOnly)
    int32 ConnectedPlayers = 0;
};

// ─── Component ────────────────────────────────────────────────────

/**
 * UBridgeLoomPixelStreaming — GameMode or manager ActorComponent that:
 *
 *  - Enables/disables the UE5 Pixel Streaming plugin at runtime via CVars
 *  - Applies encoding quality presets (resolution, bitrate, fps) per target
 *  - Handles Quest-specific per-eye resolution and 72 Hz constraints
 *  - Reports session state via OnStreamingStateChanged delegate
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent),
       DisplayName = "Loom Pixel Streaming")
class BRIDGELOOM_API UBridgeLoomPixelStreaming : public UActorComponent
{
    GENERATED_BODY()

public:
    UBridgeLoomPixelStreaming();

    // ── Configuration ─────────────────────────────────────────────

    /** Quality preset definitions — override in DefaultGame.ini or per-BP. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PixelStreaming|Config")
    TMap<ELoomStreamQuality, FLoomStreamSettings> QualityPresets;

    /** Signalling server WebSocket URL (e.g. ws://0.0.0.0:8888). */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PixelStreaming|Config")
    FString SignallingServerUrl = TEXT("ws://0.0.0.0:8888");

    // ── Control ───────────────────────────────────────────────────

    /**
     * Enable Pixel Streaming for the specified target platform.
     * Applies the given quality preset and sets all related CVars.
     */
    UFUNCTION(BlueprintCallable, Category = "PixelStreaming")
    void EnableStreaming(ELoomStreamTarget Target, ELoomStreamQuality Quality);

    /** Disable streaming and restore normal rendering settings. */
    UFUNCTION(BlueprintCallable, Category = "PixelStreaming")
    void DisableStreaming();

    /** Switch quality tier at runtime (e.g. on network condition change). */
    UFUNCTION(BlueprintCallable, Category = "PixelStreaming")
    void SetQuality(ELoomStreamQuality Quality);

    /** Apply Quest-specific stereo rendering CVars (per-eye 1920×1832 @ 72 Hz). */
    UFUNCTION(BlueprintCallable, Category = "PixelStreaming")
    void ApplyQuestStereoSettings();

    /** Returns a copy of the current session state. */
    UFUNCTION(BlueprintPure, Category = "PixelStreaming")
    FLoomStreamSessionState GetSessionState() const { return SessionState; }

    // ── Delegates ─────────────────────────────────────────────────

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnStreamingStateChanged,
        const FLoomStreamSessionState&, State);

    UPROPERTY(BlueprintAssignable, Category = "PixelStreaming|Events")
    FOnStreamingStateChanged OnStreamingStateChanged;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnPlayerConnected, int32, PlayerCount);
    UPROPERTY(BlueprintAssignable, Category = "PixelStreaming|Events")
    FOnPlayerConnected OnPlayerConnected;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnPlayerDisconnected, int32, PlayerCount);
    UPROPERTY(BlueprintAssignable, Category = "PixelStreaming|Events")
    FOnPlayerDisconnected OnPlayerDisconnected;

    // ── UActorComponent ───────────────────────────────────────────

    virtual void BeginPlay() override;
    virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
    FLoomStreamSessionState SessionState;

    // Populate default quality preset entries
    void InitDefaultPresets();

    // Apply encoder CVars for the given settings
    void ApplyEncoderCVars(const FLoomStreamSettings& Settings);

    // Set a CVar by name; logs warning if not found
    static void SetCVar(const TCHAR* Name, float Value);
    static void SetCVar(const TCHAR* Name, int32 Value);
};
