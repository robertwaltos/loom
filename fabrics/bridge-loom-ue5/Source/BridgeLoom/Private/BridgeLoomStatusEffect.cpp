// Copyright Koydo. All Rights Reserved.
// BridgeLoomStatusEffect.cpp

#include "BridgeLoomStatusEffect.h"
#include "Engine/World.h"
#include "Materials/MaterialParameterCollection.h"
#include "Materials/MaterialParameterCollectionInstance.h"
#include "NiagaraFunctionLibrary.h"
#include "NiagaraSystem.h"

UBridgeLoomStatusEffect::UBridgeLoomStatusEffect()
{
    PrimaryComponentTick.bCanEverTick = false;
}

void UBridgeLoomStatusEffect::BeginPlay()
{
    Super::BeginPlay();
}

// ─── HasEffect / IsImmuneTo ───────────────────────────────────────

bool UBridgeLoomStatusEffect::HasEffect(ELoomStatusEffectType EffectType) const
{
    for (const FLoomActiveStatusEffect& E : CurrentStatus.ActiveEffects)
    {
        if (E.EffectType == EffectType) return true;
    }
    return false;
}

bool UBridgeLoomStatusEffect::IsImmuneTo(ELoomStatusEffectType EffectType) const
{
    for (const FLoomStatusImmunity& I : CurrentStatus.Immunities)
    {
        if (I.EffectType == EffectType && I.RemainingDurationSec > 0.0f) return true;
    }
    return false;
}

// ─── UpdatePostProcessParams ──────────────────────────────────────

void UBridgeLoomStatusEffect::UpdatePostProcessParams()
{
    if (StatusEffectMPC.IsNull()) return;
    UMaterialParameterCollection* MPC = StatusEffectMPC.LoadSynchronous();
    if (!MPC) return;
    UWorld* World = GetWorld();
    if (!World) return;
    UMaterialParameterCollectionInstance* MPCI = World->GetParameterCollectionInstance(MPC);
    if (!MPCI) return;

    // Map key effect types to MPC float parameters
    auto Intensity = [&](ELoomStatusEffectType Type) -> float
    {
        for (const FLoomActiveStatusEffect& E : CurrentStatus.ActiveEffects)
        {
            if (E.EffectType == Type) return FMath::Clamp(E.Magnitude / 100.0f, 0.0f, 1.0f);
        }
        return 0.0f;
    };

    MPCI->SetScalarParameterValue(FName("PoisonIntensity"),  Intensity(ELoomStatusEffectType::Poison));
    MPCI->SetScalarParameterValue(FName("FreezeIntensity"),  Intensity(ELoomStatusEffectType::Freeze));
    MPCI->SetScalarParameterValue(FName("BurnIntensity"),    Intensity(ELoomStatusEffectType::Burn));
    MPCI->SetScalarParameterValue(FName("StunIntensity"),    Intensity(ELoomStatusEffectType::Stun));
    MPCI->SetScalarParameterValue(FName("ShieldIntensity"),  Intensity(ELoomStatusEffectType::Shield));
}

// ─── SpawnEffectVFX ───────────────────────────────────────────────

void UBridgeLoomStatusEffect::SpawnEffectVFX(ELoomStatusEffectType EffectType)
{
    TSoftObjectPtr<UNiagaraSystem>* TemplatePtr = EffectVFXMap.Find(EffectType);
    if (!TemplatePtr || TemplatePtr->IsNull()) return;

    TWeakObjectPtr<UBridgeLoomStatusEffect> WeakThis(this);
    const TSoftObjectPtr<UNiagaraSystem> TemplateCopy = *TemplatePtr;

    FStreamableManager& StreamMgr = UAssetManager::GetStreamableManager();
    StreamMgr.RequestAsyncLoad(TemplateCopy.ToSoftObjectPath(),
        [WeakThis, TemplateCopy]() mutable
        {
            if (WeakThis.IsValid())
            {
                UNiagaraSystem* NS = TemplateCopy.Get();
                if (NS && WeakThis->GetOwner())
                {
                    UNiagaraFunctionLibrary::SpawnSystemAtLocation(
                        WeakThis->GetWorld(), NS,
                        WeakThis->GetOwner()->GetActorLocation());
                }
            }
        });
}

// ─── ApplyStatusReport ────────────────────────────────────────────

void UBridgeLoomStatusEffect::ApplyStatusReport(const FLoomStatusReport& Report)
{
    // Collect new effect types
    TSet<ELoomStatusEffectType> NewEffectTypes;
    for (const FLoomActiveStatusEffect& E : Report.ActiveEffects)
    {
        NewEffectTypes.Add(E.EffectType);
    }

    // Detect newly added effects → fire OnEffectApplied + spawn VFX
    for (const FLoomActiveStatusEffect& E : Report.ActiveEffects)
    {
        if (!PreviousEffectTypes.Contains(E.EffectType))
        {
            OnEffectApplied.Broadcast(Report.EntityId, E);
            SpawnEffectVFX(E.EffectType);
        }
    }

    // Detect removed effects
    for (ELoomStatusEffectType OldType : PreviousEffectTypes)
    {
        if (!NewEffectTypes.Contains(OldType))
        {
            OnEffectRemoved.Broadcast(Report.EntityId, OldType);
        }
    }

    PreviousEffectTypes = MoveTemp(NewEffectTypes);
    CurrentStatus       = Report;

    UpdatePostProcessParams();
    OnStatusChanged.Broadcast(Report.EntityId, Report);
}

// ─── NotifyEffectTick ─────────────────────────────────────────────

void UBridgeLoomStatusEffect::NotifyEffectTick(const FLoomEffectTickResult& TickResult)
{
    OnEffectTicked.Broadcast(TickResult.EntityId, TickResult);
}
