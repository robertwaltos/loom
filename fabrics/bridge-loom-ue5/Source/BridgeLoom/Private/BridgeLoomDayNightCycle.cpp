// Copyright Koydo. All Rights Reserved.
// BridgeLoomDayNightCycle.cpp

#include "BridgeLoomDayNightCycle.h"
#include "Components/DirectionalLightComponent.h"
#include "GameFramework/Actor.h"

UBridgeLoomDayNightCycle::UBridgeLoomDayNightCycle()
{
    PrimaryComponentTick.bCanEverTick = false;
}

void UBridgeLoomDayNightCycle::BeginPlay()
{
    Super::BeginPlay();
    if (bApplyLightingOnBeginPlay)
    {
        ApplyLightingToScene(CurrentLighting);
    }
}

// ─── Inbound ─────────────────────────────────────────────────────

void UBridgeLoomDayNightCycle::NotifyPhaseTransition(const FLoomPhaseTransition& Transition)
{
    CurrentPhase = Transition.ToPhase;
    LastTransition = Transition;
    OnPhaseChanged.Broadcast(Transition);
}

void UBridgeLoomDayNightCycle::ApplyLightingState(const FLoomLightingState& State)
{
    CurrentLighting = State;
    ApplyLightingToScene(State);
    OnLightingStateApplied.Broadcast(State);
}

void UBridgeLoomDayNightCycle::ApplyTimeOfDay(const FLoomTimeOfDay& Time)
{
    CurrentTime = Time;
    OnTimeOfDayUpdated.Broadcast(Time);
}

// ─── Queries ─────────────────────────────────────────────────────

bool UBridgeLoomDayNightCycle::IsNighttime() const
{
    return CurrentPhase == ELoomDayPhase::Evening
        || CurrentPhase == ELoomDayPhase::Midnight
        || CurrentPhase == ELoomDayPhase::DeepNight;
}

FText UBridgeLoomDayNightCycle::GetPhaseDisplayName() const
{
    switch (CurrentPhase)
    {
    case ELoomDayPhase::Dawn:      return FText::FromString(TEXT("Dawn"));
    case ELoomDayPhase::Morning:   return FText::FromString(TEXT("Morning"));
    case ELoomDayPhase::Midday:    return FText::FromString(TEXT("Midday"));
    case ELoomDayPhase::Afternoon: return FText::FromString(TEXT("Afternoon"));
    case ELoomDayPhase::Dusk:      return FText::FromString(TEXT("Dusk"));
    case ELoomDayPhase::Evening:   return FText::FromString(TEXT("Evening"));
    case ELoomDayPhase::Midnight:  return FText::FromString(TEXT("Midnight"));
    case ELoomDayPhase::DeepNight: return FText::FromString(TEXT("Deep Night"));
    default:                       return FText::FromString(TEXT("Unknown"));
    }
}

// ─── Private ─────────────────────────────────────────────────────

void UBridgeLoomDayNightCycle::ApplyLightingToScene(const FLoomLightingState& State)
{
    // Resolve soft ref without async-loading — light actor must already be loaded.
    AActor* LightActor = DirectionalLightActor.Get();
    if (!LightActor) return;

    UDirectionalLightComponent* DirLight =
        LightActor->FindComponentByClass<UDirectionalLightComponent>();
    if (!DirLight) return;

    DirLight->SetIntensity(State.Intensity);
    DirLight->SetColorTemperature(State.ColorTemperature);
    // ShadowLength does not have a direct API; store it on the struct
    // for callers that drive it via a Blueprint tick or material param.
}
