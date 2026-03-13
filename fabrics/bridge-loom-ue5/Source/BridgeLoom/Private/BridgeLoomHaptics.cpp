// Copyright Koydo. All Rights Reserved.
// BridgeLoomHaptics.cpp — Controller haptic feedback patterns for Loom game events.

#include "BridgeLoomHaptics.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/ForceFeedbackEffect.h"
#include "Engine/StreamableManager.h"
#include "Engine/AssetManager.h"

// ─── Default Waveform Table ────────────────────────────────────────

/* static */
FLoomHapticWaveform UBridgeLoomHaptics::GetDefaultWaveform(ELoomHapticEvent Event)
{
    FLoomHapticWaveform W;
    switch (Event)
    {
    case ELoomHapticEvent::WeaveActivated:
        W.DurationSeconds = 0.35f; W.LargeAmplitude = 0.4f; W.SmallAmplitude = 0.7f; break;
    case ELoomHapticEvent::ImpactLight:
        W.DurationSeconds = 0.08f; W.LargeAmplitude = 0.3f; W.SmallAmplitude = 0.5f; break;
    case ELoomHapticEvent::ImpactHeavy:
        W.DurationSeconds = 0.25f; W.LargeAmplitude = 0.9f; W.SmallAmplitude = 0.6f; break;
    case ELoomHapticEvent::SpellCast:
        W.DurationSeconds = 0.3f;  W.LargeAmplitude = 0.3f; W.SmallAmplitude = 0.6f; break;
    case ELoomHapticEvent::DamageTaken:
        W.DurationSeconds = 0.2f;  W.LargeAmplitude = 0.7f; W.SmallAmplitude = 0.4f; break;
    case ELoomHapticEvent::ItemPickup:
        W.DurationSeconds = 0.06f; W.LargeAmplitude = 0.1f; W.SmallAmplitude = 0.4f; break;
    case ELoomHapticEvent::BuildComplete:
        W.DurationSeconds = 0.5f;  W.LargeAmplitude = 0.5f; W.SmallAmplitude = 0.5f; break;
    case ELoomHapticEvent::Footstep:
        W.DurationSeconds = 0.04f; W.LargeAmplitude = 0.2f; W.SmallAmplitude = 0.1f; break;
    case ELoomHapticEvent::HeartbeatLow:
        W.DurationSeconds = 0.15f; W.LargeAmplitude = 0.6f; W.SmallAmplitude = 0.2f; break;
    case ELoomHapticEvent::TeleportLand:
        W.DurationSeconds = 0.12f; W.LargeAmplitude = 0.5f; W.SmallAmplitude = 0.8f; break;
    case ELoomHapticEvent::UIConfirm:
        W.DurationSeconds = 0.05f; W.LargeAmplitude = 0.0f; W.SmallAmplitude = 0.3f; break;
    case ELoomHapticEvent::UIError:
        W.DurationSeconds = 0.1f;  W.LargeAmplitude = 0.1f; W.SmallAmplitude = 0.5f; break;
    case ELoomHapticEvent::KillConfirm:
        W.DurationSeconds = 0.3f;  W.LargeAmplitude = 0.8f; W.SmallAmplitude = 0.6f; break;
    case ELoomHapticEvent::LootChest:
        W.DurationSeconds = 0.4f;  W.LargeAmplitude = 0.4f; W.SmallAmplitude = 0.7f; break;
    default:
        W.DurationSeconds = 0.1f;  W.LargeAmplitude = 0.2f; W.SmallAmplitude = 0.2f; break;
    }
    return W;
}

// ─── Constructor ──────────────────────────────────────────────────

UBridgeLoomHaptics::UBridgeLoomHaptics()
{
    PrimaryComponentTick.bCanEverTick = true;
    PrimaryComponentTick.TickGroup    = TG_PrePhysics;
}

// ─── BeginPlay ────────────────────────────────────────────────────

void UBridgeLoomHaptics::BeginPlay()
{
    Super::BeginPlay();

    if (APawn* Pawn = Cast<APawn>(GetOwner()))
    {
        CachedController = Cast<APlayerController>(Pawn->GetController());
    }

    // Seed any missing EventWaveforms entries with built-in defaults
    for (uint8 i = 1; i < (uint8)ELoomHapticEvent::LootChest + 1; ++i)
    {
        ELoomHapticEvent Evt = static_cast<ELoomHapticEvent>(i);
        if (!EventWaveforms.Contains(Evt))
        {
            EventWaveforms.Add(Evt, GetDefaultWaveform(Evt));
        }
    }
}

// ─── PlayEvent ────────────────────────────────────────────────────

void UBridgeLoomHaptics::PlayEvent(ELoomHapticEvent Event,
                                   ELoomHapticTarget Target,
                                   float IntensityOverride)
{
    if (Event == ELoomHapticEvent::None) { return; }

    FLoomHapticWaveform W;
    if (const FLoomHapticWaveform* Found = EventWaveforms.Find(Event))
    {
        W = *Found;
    }
    else
    {
        W = GetDefaultWaveform(Event);
    }

    if (IntensityOverride >= 0.f)
    {
        W.IntensityScale = FMath::Clamp(IntensityOverride, 0.f, 1.f);
    }

    PlayWaveform(W, Target);

    // If the waveform has an authored asset, prefer that via PlayerController
    if (!W.ForceFeedbackAsset.IsNull() && CachedController.IsValid())
    {
        const float EffectiveScale = GlobalIntensityScale * W.IntensityScale;
        // Async-load and play the UForceFeedbackEffect
        FStreamableManager& SM = UAssetManager::GetStreamableManager();
        SM.RequestAsyncLoad(W.ForceFeedbackAsset.ToSoftObjectPath(),
            [this, Target, EffectiveScale, AssetPtr = W.ForceFeedbackAsset]()
            {
                if (!CachedController.IsValid()) { return; }
                if (UForceFeedbackEffect* FFE = AssetPtr.Get())
                {
                    FForceFeedbackParameters Params;
                    Params.bLooping = false;
                    Params.bIgnoreTimeDilation = false;
                    Params.bPlayWhilePaused = false;
                    CachedController->ClientPlayForceFeedback(FFE, Params);
                }
            });
    }

    OnHapticStarted.Broadcast(Event, Target);
}

// ─── PlayWaveform ─────────────────────────────────────────────────

void UBridgeLoomHaptics::PlayWaveform(const FLoomHapticWaveform& Waveform,
                                      ELoomHapticTarget Target)
{
    if (ActiveHaptics.Num() >= MaxActiveHaptics) { return; }
    if (GlobalIntensityScale <= 0.f) { return; }

    const float Scale = GlobalIntensityScale * Waveform.IntensityScale;
    FLoomActiveHaptic H;
    H.Event            = ELoomHapticEvent::None; // raw waveform, no semantic event
    H.Target           = Target;
    H.RemainingSeconds = Waveform.DurationSeconds;
    H.LargeAmplitude   = Waveform.LargeAmplitude * Scale;
    H.SmallAmplitude   = Waveform.SmallAmplitude * Scale;

    H.LargeAmplitude = FMath::Clamp(H.LargeAmplitude, 0.f, 1.f);
    H.SmallAmplitude = FMath::Clamp(H.SmallAmplitude, 0.f, 1.f);

    ActiveHaptics.Add(H);
}

// ─── StopAll ──────────────────────────────────────────────────────

void UBridgeLoomHaptics::StopAll()
{
    for (const FLoomActiveHaptic& H : ActiveHaptics)
    {
        if (H.Event != ELoomHapticEvent::None)
        {
            OnHapticStopped.Broadcast(H.Event);
        }
    }
    ActiveHaptics.Empty();

    // Clear motor output immediately
    if (CachedController.IsValid())
    {
        CachedController->SetForceFeedbackParameters(
            TEXT("LoomHaptics"), EControllerHand::Right, 0.f, 0.f, 0.f, 0.f);
        CachedController->SetForceFeedbackParameters(
            TEXT("LoomHaptics"), EControllerHand::Left,  0.f, 0.f, 0.f, 0.f);
    }
}

// ─── SetGlobalScale ───────────────────────────────────────────────

void UBridgeLoomHaptics::SetGlobalScale(float Scale)
{
    GlobalIntensityScale = FMath::Clamp(Scale, 0.f, 1.f);
    if (GlobalIntensityScale <= 0.f)
    {
        StopAll();
    }
}

// ─── IsRumbling ───────────────────────────────────────────────────

bool UBridgeLoomHaptics::IsRumbling() const
{
    return (ActiveHaptics.Num() > 0);
}

// ─── TickComponent ────────────────────────────────────────────────

void UBridgeLoomHaptics::TickComponent(float DeltaTime, ELevelTick TickType,
                                       FActorComponentTickFunction* ThisTickFunction)
{
    Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

    if (ActiveHaptics.IsEmpty()) { return; }

    TickHaptics(DeltaTime);
    FlushToController();
}

// ─── TickHaptics ──────────────────────────────────────────────────

void UBridgeLoomHaptics::TickHaptics(float DeltaTime)
{
    for (int32 i = ActiveHaptics.Num() - 1; i >= 0; --i)
    {
        FLoomActiveHaptic& H = ActiveHaptics[i];
        H.RemainingSeconds -= DeltaTime;
        if (H.RemainingSeconds <= 0.f)
        {
            if (H.Event != ELoomHapticEvent::None)
            {
                OnHapticStopped.Broadcast(H.Event);
            }
            ActiveHaptics.RemoveAt(i);
        }
    }
}

// ─── FlushToController ────────────────────────────────────────────

void UBridgeLoomHaptics::FlushToController()
{
    if (!CachedController.IsValid()) { return; }

    // Sum amplitudes across all active layers (clamped to [0,1])
    float LeftLarge = 0.f, LeftSmall = 0.f, RightLarge = 0.f, RightSmall = 0.f;

    for (const FLoomActiveHaptic& H : ActiveHaptics)
    {
        const bool bAffectsLeft  = (H.Target != ELoomHapticTarget::Right);
        const bool bAffectsRight = (H.Target != ELoomHapticTarget::Left);

        if (bAffectsLeft)
        {
            LeftLarge  = FMath::Min(1.f, LeftLarge  + H.LargeAmplitude);
            LeftSmall  = FMath::Min(1.f, LeftSmall  + H.SmallAmplitude);
        }
        if (bAffectsRight)
        {
            RightLarge = FMath::Min(1.f, RightLarge + H.LargeAmplitude);
            RightSmall = FMath::Min(1.f, RightSmall + H.SmallAmplitude);
        }
    }

    // SetForceFeedbackParameters: (TagName, Hand, LeftLarge, LeftSmall, RightLarge, RightSmall)
    CachedController->SetForceFeedbackParameters(
        TEXT("LoomHaptics"), EControllerHand::Right,
        RightLarge, RightSmall, 0.f, 0.f);
    CachedController->SetForceFeedbackParameters(
        TEXT("LoomHaptics"), EControllerHand::Left,
        0.f, 0.f, LeftLarge, LeftSmall);
}
