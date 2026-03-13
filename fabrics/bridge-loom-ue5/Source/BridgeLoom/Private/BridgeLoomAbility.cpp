// Copyright Koydo. All Rights Reserved.
// BridgeLoomAbility.cpp

#include "BridgeLoomAbility.h"
#include "GameFramework/Actor.h"
#include "HAL/PlatformTime.h"
#include "Engine/StreamableManager.h"
#include "Engine/AssetManager.h"
#include "NiagaraFunctionLibrary.h"

UBridgeLoomAbility::UBridgeLoomAbility()
{
    PrimaryComponentTick.bCanEverTick     = true;
    PrimaryComponentTick.bStartWithTickEnabled = false;
}

// ── Tick — update remaining seconds for all active cooldowns ─────────────────

void UBridgeLoomAbility::TickComponent(float DeltaTime, ELevelTick TickType,
                                        FActorComponentTickFunction* ThisTickFunction)
{
    Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

    const double NowMs = FPlatformTime::Seconds() * 1000.0;
    TArray<FString> Expired;

    for (auto& Pair : ActiveCooldowns)
    {
        FLoomCooldownState& CD = Pair.Value;
        CD.RemainingSeconds = FMath::Max(
            0.0f,
            static_cast<float>((CD.EndsAtMs - NowMs) / 1000.0));

        if (CD.RemainingSeconds <= 0.0f)
        {
            Expired.Add(Pair.Key);
        }
    }

    for (const FString& AbilityId : Expired)
    {
        FLoomCooldownState Cd = ActiveCooldowns[AbilityId];
        ActiveCooldowns.Remove(AbilityId);
        OnCooldownExpired.Broadcast(AbilityId, Cd.EntityId);
    }

    if (ActiveCooldowns.IsEmpty())
    {
        SetComponentTickEnabled(false);
    }
}

// ── Outbound ──────────────────────────────────────────────────────────────────

void UBridgeLoomAbility::RequestActivation(const FString& AbilityId,
                                            const FString& TargetEntityId)
{
    OnActivationRequested.Broadcast(AbilityId, TargetEntityId);
}

void UBridgeLoomAbility::RegisterAbility(const FLoomAbilityDef& Def)
{
    AbilityRegistry.Add(Def.AbilityId, Def);
}

// ── Inbound ───────────────────────────────────────────────────────────────────

void UBridgeLoomAbility::NotifyActivation(const FLoomActivationResult& Result,
                                           const FLoomAbilityDef& Def)
{
    // Start tracking cooldown if the server issued one.
    if (Result.CooldownEndsAtMs > 0)
    {
        FLoomCooldownState CD;
        CD.AbilityId        = Result.AbilityId;
        CD.EntityId         = Result.EntityId;
        CD.EndsAtMs         = Result.CooldownEndsAtMs;
        CD.RemainingSeconds = Def.CooldownSeconds;
        ActiveCooldowns.Add(Result.AbilityId, CD);

        SetComponentTickEnabled(true);
    }

    // Spawn activation VFX at the owner location.
    if (AActor* Owner = GetOwner())
    {
        SpawnActivationVFX(Def.EffectType, Owner->GetActorLocation());
    }

    OnAbilityActivated.Broadcast(Result, Def);
}

void UBridgeLoomAbility::NotifyActivationFailed(const FString& EntityId,
                                                 const FString& AbilityId,
                                                 const FString& ErrorCode)
{
    UE_LOG(LogTemp, Warning,
           TEXT("UBridgeLoomAbility: ability '%s' failed for entity '%s': %s"),
           *AbilityId, *EntityId, *ErrorCode);

    if (AActor* Owner = GetOwner())
    {
        SpawnFailVFX(Owner->GetActorLocation());
    }

    OnAbilityFailed.Broadcast(EntityId, AbilityId, ErrorCode);
}

void UBridgeLoomAbility::ApplyCooldownState(const FLoomCooldownState& CooldownState)
{
    const double NowMs = FPlatformTime::Seconds() * 1000.0;
    if (CooldownState.EndsAtMs <= static_cast<int64>(NowMs))
    {
        // Already expired; no need to track.
        return;
    }

    FLoomCooldownState CD = CooldownState;
    CD.RemainingSeconds = static_cast<float>(
        (CooldownState.EndsAtMs - NowMs) / 1000.0);
    ActiveCooldowns.Add(CooldownState.AbilityId, CD);

    SetComponentTickEnabled(true);
}

void UBridgeLoomAbility::NotifyCooldownExpired(const FString& AbilityId,
                                                const FString& EntityId)
{
    ActiveCooldowns.Remove(AbilityId);

    if (ActiveCooldowns.IsEmpty())
    {
        SetComponentTickEnabled(false);
    }

    OnCooldownExpired.Broadcast(AbilityId, EntityId);
}

// ── Cooldown queries ──────────────────────────────────────────────────────────

bool UBridgeLoomAbility::IsOnCooldown(const FString& AbilityId) const
{
    const FLoomCooldownState* CD = ActiveCooldowns.Find(AbilityId);
    return CD && CD->RemainingSeconds > 0.0f;
}

float UBridgeLoomAbility::GetCooldownRemaining(const FString& AbilityId) const
{
    const FLoomCooldownState* CD = ActiveCooldowns.Find(AbilityId);
    return CD ? CD->RemainingSeconds : 0.0f;
}

// ── Private VFX helpers ───────────────────────────────────────────────────────

void UBridgeLoomAbility::SpawnActivationVFX(ELoomAbilityEffectType EffectType,
                                             const FVector& Location)
{
    const TSoftObjectPtr<UNiagaraSystem>* TemplatePtr = ActivationVFXMap.Find(EffectType);
    if (!TemplatePtr || TemplatePtr->IsNull())
    {
        return;
    }

    TWeakObjectPtr<UBridgeLoomAbility> WeakSelf(this);
    const FVector CaptureLoc = Location;
    TSoftObjectPtr<UNiagaraSystem> CaptureTemplate = *TemplatePtr;

    FStreamableManager& Manager = UAssetManager::GetStreamableManager();
    Manager.RequestAsyncLoad(
        CaptureTemplate.ToSoftObjectPath(),
        [WeakSelf, CaptureLoc, CaptureTemplate]()
        {
            if (!WeakSelf.IsValid()) return;
            if (UNiagaraSystem* NS = CaptureTemplate.Get())
            {
                if (UWorld* World = WeakSelf->GetWorld())
                {
                    UNiagaraFunctionLibrary::SpawnSystemAtLocation(
                        World, NS, CaptureLoc);
                }
            }
        });
}

void UBridgeLoomAbility::SpawnFailVFX(const FVector& Location)
{
    if (FailVFXTemplate.IsNull())
    {
        return;
    }

    TWeakObjectPtr<UBridgeLoomAbility> WeakSelf(this);
    const FVector CaptureLoc = Location;
    TSoftObjectPtr<UNiagaraSystem> CaptureTemplate = FailVFXTemplate;

    FStreamableManager& Manager = UAssetManager::GetStreamableManager();
    Manager.RequestAsyncLoad(
        CaptureTemplate.ToSoftObjectPath(),
        [WeakSelf, CaptureLoc, CaptureTemplate]()
        {
            if (!WeakSelf.IsValid()) return;
            if (UNiagaraSystem* NS = CaptureTemplate.Get())
            {
                if (UWorld* World = WeakSelf->GetWorld())
                {
                    UNiagaraFunctionLibrary::SpawnSystemAtLocation(
                        World, NS, CaptureLoc);
                }
            }
        });
}
