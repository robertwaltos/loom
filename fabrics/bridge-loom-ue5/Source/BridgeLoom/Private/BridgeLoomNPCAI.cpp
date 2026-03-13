// Copyright Koydo. All Rights Reserved.
// BridgeLoomNPCAI.cpp

#include "BridgeLoomNPCAI.h"
#include "NiagaraFunctionLibrary.h"
#include "NiagaraSystem.h"

UBridgeLoomNPCAI::UBridgeLoomNPCAI()
{
    PrimaryComponentTick.bCanEverTick = false;
}

void UBridgeLoomNPCAI::BeginPlay()
{
    Super::BeginPlay();
}

// ─── IsInCombat ───────────────────────────────────────────────────

bool UBridgeLoomNPCAI::IsInCombat() const
{
    const ELoomNpcGoal G = CurrentState.CurrentGoal;
    return G == ELoomNpcGoal::Chase || G == ELoomNpcGoal::Attack;
}

// ─── ApplyStateSnapshot ───────────────────────────────────────────

void UBridgeLoomNPCAI::ApplyStateSnapshot(const FLoomNpcAiState& State)
{
    CurrentState  = State;
    PreviousGoal  = State.CurrentGoal;
}

// ─── ApplyDecision ────────────────────────────────────────────────

void UBridgeLoomNPCAI::ApplyDecision(const FLoomNpcDecision& Decision)
{
    const ELoomNpcGoal NewGoal = Decision.Goal;

    CurrentState.EntityId     = Decision.EntityId;
    CurrentState.CurrentGoal  = NewGoal;
    LastDecision              = Decision;

    // Goal-changed delegate
    if (NewGoal != PreviousGoal)
    {
        OnGoalChanged.Broadcast(Decision.EntityId, PreviousGoal, NewGoal);

        // Attack entry → VFX + specific delegate
        if (NewGoal == ELoomNpcGoal::Chase || NewGoal == ELoomNpcGoal::Attack)
        {
            SpawnAlertVFX();
        }

        if (NewGoal == ELoomNpcGoal::Attack)
        {
            OnAttackTriggered.Broadcast(Decision.EntityId, Decision.TargetEntityId);
        }

        PreviousGoal = NewGoal;
    }

    OnDecisionReceived.Broadcast(Decision);
}

// ─── SpawnAlertVFX ────────────────────────────────────────────────

void UBridgeLoomNPCAI::SpawnAlertVFX()
{
    if (AlertVFXTemplate.IsNull()) return;

    TWeakObjectPtr<UBridgeLoomNPCAI> WeakThis(this);
    FStreamableManager& StreamMgr = UAssetManager::GetStreamableManager();
    StreamMgr.RequestAsyncLoad(AlertVFXTemplate.ToSoftObjectPath(),
        [WeakThis]()
        {
            if (WeakThis.IsValid())
            {
                UNiagaraSystem* NS = WeakThis->AlertVFXTemplate.Get();
                if (NS && WeakThis->GetOwner())
                {
                    UNiagaraFunctionLibrary::SpawnSystemAtLocation(
                        WeakThis->GetWorld(), NS,
                        WeakThis->GetOwner()->GetActorLocation());
                }
            }
        });
}
