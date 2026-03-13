// Copyright Koydo. All Rights Reserved.
// BridgeLoomPixelStreaming.cpp — Pixel Streaming config for Quest and cloud gaming.

#include "BridgeLoomPixelStreaming.h"
#include "HAL/IConsoleManager.h"
#include "Engine/Engine.h"

// ─── CVar helpers ─────────────────────────────────────────────────

/* static */
void UBridgeLoomPixelStreaming::SetCVar(const TCHAR* Name, float Value)
{
    if (IConsoleVariable* CVar = IConsoleManager::Get().FindConsoleVariable(Name))
    {
        CVar->Set(Value, ECVF_SetByCode);
    }
    else
    {
        UE_LOG(LogTemp, Warning, TEXT("BridgeLoomPixelStreaming: CVar '%s' not found"), Name);
    }
}

/* static */
void UBridgeLoomPixelStreaming::SetCVar(const TCHAR* Name, int32 Value)
{
    if (IConsoleVariable* CVar = IConsoleManager::Get().FindConsoleVariable(Name))
    {
        CVar->Set(Value, ECVF_SetByCode);
    }
    else
    {
        UE_LOG(LogTemp, Warning, TEXT("BridgeLoomPixelStreaming: CVar '%s' not found"), Name);
    }
}

// ─── Default Quality Presets ──────────────────────────────────────

void UBridgeLoomPixelStreaming::InitDefaultPresets()
{
    // UltraLow — 480p 30fps, minimal bitrate for very slow connections
    FLoomStreamSettings UltraLow;
    UltraLow.ResolutionWidth  = 854;
    UltraLow.ResolutionHeight = 480;
    UltraLow.TargetFPS        = 30;
    UltraLow.BitrateKbps      = 1500;
    UltraLow.bAdaptiveBitrate = true;
    UltraLow.TemporalUpscaleQuality = 0.5f;
    QualityPresets.Add(ELoomStreamQuality::UltraLow, UltraLow);

    // Low — 720p 30fps
    FLoomStreamSettings Low;
    Low.ResolutionWidth  = 1280;
    Low.ResolutionHeight = 720;
    Low.TargetFPS        = 30;
    Low.BitrateKbps      = 4000;
    Low.bAdaptiveBitrate = true;
    Low.TemporalUpscaleQuality = 0.6f;
    QualityPresets.Add(ELoomStreamQuality::Low, Low);

    // Medium — 1080p 60fps (default cloud gaming)
    FLoomStreamSettings Medium;
    Medium.ResolutionWidth  = 1920;
    Medium.ResolutionHeight = 1080;
    Medium.TargetFPS        = 60;
    Medium.BitrateKbps      = 8000;
    Medium.bAdaptiveBitrate = true;
    Medium.TemporalUpscaleQuality = 0.75f;
    QualityPresets.Add(ELoomStreamQuality::Medium, Medium);

    // High — 1440p 90fps
    FLoomStreamSettings High;
    High.ResolutionWidth  = 2560;
    High.ResolutionHeight = 1440;
    High.TargetFPS        = 90;
    High.BitrateKbps      = 20000;
    High.bAdaptiveBitrate = false;
    High.TemporalUpscaleQuality = 0.9f;
    QualityPresets.Add(ELoomStreamQuality::High, High);

    // Quest — Per-eye 1920×1832 (total 3840×1832 side-by-side) @ 72 Hz
    // Stream resolution is for the host; Quest headset WebXR decodes it.
    FLoomStreamSettings Quest;
    Quest.ResolutionWidth  = 3840;   // side-by-side stereo
    Quest.ResolutionHeight = 1832;
    Quest.TargetFPS        = 72;
    Quest.BitrateKbps      = 30000;
    Quest.bAdaptiveBitrate = true;
    Quest.TemporalUpscaleQuality = 0.85f;
    QualityPresets.Add(ELoomStreamQuality::Quest, Quest);
}

// ─── Constructor ──────────────────────────────────────────────────

UBridgeLoomPixelStreaming::UBridgeLoomPixelStreaming()
{
    PrimaryComponentTick.bCanEverTick = false;
}

// ─── BeginPlay ────────────────────────────────────────────────────

void UBridgeLoomPixelStreaming::BeginPlay()
{
    Super::BeginPlay();
    // Seed defaults for missing entries
    InitDefaultPresets();
}

// ─── EndPlay ──────────────────────────────────────────────────────

void UBridgeLoomPixelStreaming::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
    if (SessionState.bStreaming)
    {
        DisableStreaming();
    }
    Super::EndPlay(EndPlayReason);
}

// ─── EnableStreaming ──────────────────────────────────────────────

void UBridgeLoomPixelStreaming::EnableStreaming(ELoomStreamTarget Target,
                                                ELoomStreamQuality Quality)
{
    if (Target == ELoomStreamTarget::Disabled)
    {
        DisableStreaming();
        return;
    }

    // Enable the Pixel Streaming plugin CVar
    // r.PixelStreaming.Enabled must be set before the plugin activates its sinks.
    SetCVar(TEXT("PixelStreaming.Enabled"), 1);

    // Apply the request quality preset
    const FLoomStreamSettings* Settings = QualityPresets.Find(Quality);
    if (!Settings)
    {
        // Fall back to Medium if preset is missing
        Settings = QualityPresets.Find(ELoomStreamQuality::Medium);
    }

    if (Settings)
    {
        ApplyEncoderCVars(*Settings);
    }

    // Quest-specific stereo config
    if (Target == ELoomStreamTarget::Quest)
    {
        ApplyQuestStereoSettings();
    }

    // Update state and broadcast
    SessionState.Target    = Target;
    SessionState.Quality   = Quality;
    SessionState.bStreaming = true;

    OnStreamingStateChanged.Broadcast(SessionState);

    UE_LOG(LogTemp, Log,
        TEXT("BridgeLoomPixelStreaming: Streaming enabled — target=%d quality=%d"),
        (int32)Target, (int32)Quality);
}

// ─── DisableStreaming ─────────────────────────────────────────────

void UBridgeLoomPixelStreaming::DisableStreaming()
{
    SetCVar(TEXT("PixelStreaming.Enabled"), 0);

    // Restore desktop rendering defaults
    SetCVar(TEXT("r.SetRes"), 0);              // release resolution override
    SetCVar(TEXT("t.MaxFPS"), 0);              // remove fps cap

    SessionState.bStreaming = false;
    SessionState.Target     = ELoomStreamTarget::Disabled;

    OnStreamingStateChanged.Broadcast(SessionState);

    UE_LOG(LogTemp, Log, TEXT("BridgeLoomPixelStreaming: Streaming disabled"));
}

// ─── SetQuality ───────────────────────────────────────────────────

void UBridgeLoomPixelStreaming::SetQuality(ELoomStreamQuality Quality)
{
    if (!SessionState.bStreaming) { return; }

    const FLoomStreamSettings* Settings = QualityPresets.Find(Quality);
    if (!Settings) { return; }

    ApplyEncoderCVars(*Settings);
    SessionState.Quality = Quality;
    OnStreamingStateChanged.Broadcast(SessionState);
}

// ─── ApplyQuestStereoSettings ─────────────────────────────────────

void UBridgeLoomPixelStreaming::ApplyQuestStereoSettings()
{
    // Quest 3 per-eye resolution: 2064×2208 native, stream at 1920×1832 per-eye
    // Side-by-side stereo: 3840×1832 total stream width
    SetCVar(TEXT("r.PixelStreaming.EncoderTargetSize.X"), 3840);
    SetCVar(TEXT("r.PixelStreaming.EncoderTargetSize.Y"), 1832);

    // WebXR presents at 72 Hz on Quest; cap host frame rate to match
    SetCVar(TEXT("t.MaxFPS"), 72);

    // Disable eye adaptation — per-eye tone mapping causes flicker in stereo
    SetCVar(TEXT("r.EyeAdaptation.MethodOverride"), 0);

    // Reduce latency: minimum encode buffering for interactive VR
    SetCVar(TEXT("PixelStreaming.Encoder.MinQP"),  -1);   // auto
    SetCVar(TEXT("PixelStreaming.Encoder.MaxQP"),  -1);

    // Use temporal upscale to hit resolution target at lower render cost
    SetCVar(TEXT("r.TemporalAA.Upscale"), 1);

    UE_LOG(LogTemp, Log, TEXT("BridgeLoomPixelStreaming: Quest stereo settings applied"));
}

// ─── ApplyEncoderCVars ────────────────────────────────────────────

void UBridgeLoomPixelStreaming::ApplyEncoderCVars(const FLoomStreamSettings& S)
{
    // Resolution
    if (GEngine)
    {
        GEngine->GameUserSettings->SetScreenResolution(FIntPoint(S.ResolutionWidth, S.ResolutionHeight));
        GEngine->GameUserSettings->ApplySettings(false);
    }

    // Frame rate cap
    SetCVar(TEXT("t.MaxFPS"), S.TargetFPS);

    // Pixel Streaming encoder bitrate
    SetCVar(TEXT("PixelStreaming.Encoder.TargetBitrate"),
            static_cast<int32>(S.BitrateKbps * 1000));   // API wants bps

    // Adaptive bitrate
    SetCVar(TEXT("PixelStreaming.WebRTC.DisableReceiveAudio"), 0);
    SetCVar(TEXT("PixelStreaming.Encoder.UseBackBufferCaptureSize"), 1);

    // Temporal upscale quality
    SetCVar(TEXT("r.TemporalAA.Upscale"),     (S.TemporalUpscaleQuality > 0.f) ? 1 : 0);
    SetCVar(TEXT("r.TemporalAA.UpscaleFactor"), S.TemporalUpscaleQuality);

    UE_LOG(LogTemp, Verbose,
        TEXT("BridgeLoomPixelStreaming: Encoder CVars set — %dx%d@%dfps %dkbps"),
        S.ResolutionWidth, S.ResolutionHeight, S.TargetFPS, S.BitrateKbps);
}
