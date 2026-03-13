// Copyright Koydo. All Rights Reserved.
// BridgeLoomLattice.cpp

#include "BridgeLoomLattice.h"
#include "GameFramework/Actor.h"
#include "HAL/PlatformTime.h"
#include "Math/Color.h"
#include "NiagaraFunctionLibrary.h"
#include "NiagaraComponent.h"

UBridgeLoomLattice::UBridgeLoomLattice()
{
    PrimaryComponentTick.bCanEverTick          = false;
    PrimaryComponentTick.bStartWithTickEnabled = false;
}

void UBridgeLoomLattice::BeginPlay()
{
    Super::BeginPlay();
}

// ── Inbound ───────────────────────────────────────────────────────────────────

void UBridgeLoomLattice::NotifyTransitUpdate(const FLoomTransitEvent& Event)
{
    // Cache or remove the active transit record.
    if (Event.Status == ELoomLockStatus::Complete
     || Event.Status == ELoomLockStatus::Failed
     || Event.Status == ELoomLockStatus::PartialCollapse)
    {
        ActiveTransits.Remove(Event.EntityId);
    }
    else
    {
        ActiveTransits.Add(Event.EntityId, Event);
    }

    // Broadcast the general update first.
    OnTransitUpdate.Broadcast(Event);

    // Special-case handling.
    if (Event.Status == ELoomLockStatus::Complete)
    {
        OnTransitComplete.Broadcast(Event);
    }
    else if (Event.Status == ELoomLockStatus::PartialCollapse)
    {
        HandlePartialCollapse(Event);
    }
}

void UBridgeLoomLattice::NotifyNodeStateUpdate(const FLoomLatticeNodeState& NodeState)
{
    CachedNodes.Add(NodeState.NodeId, NodeState);
    OnNodeStateChanged.Broadcast(NodeState);
}

void UBridgeLoomLattice::NotifyBeaconCompromised(const FLoomBeaconCompromisedEvent& Event)
{
    // Reflect the new precision on the cached node if we have it.
    if (FLoomLatticeNodeState* Node = CachedNodes.Find(Event.NodeId))
    {
        Node->PrecisionRating = Event.PrecisionAfter;

        // Derive beacon status from precision rating to stay consistent with
        // beaconStatusFromPrecision() in lattice-node.ts.
        if (Event.PrecisionAfter <= 0.0f)
        {
            Node->BeaconStatus = ELoomBeaconStatus::Destroyed;
        }
        else if (Event.PrecisionAfter < CriticalPrecisionThreshold)
        {
            Node->BeaconStatus = ELoomBeaconStatus::Unstable;
        }
        else if (Event.PrecisionAfter < 0.85f)
        {
            Node->BeaconStatus = ELoomBeaconStatus::Degraded;
        }
        else
        {
            Node->BeaconStatus = ELoomBeaconStatus::Synchronised;
        }

        OnNodeStateChanged.Broadcast(*Node);
    }

    OnBeaconCompromised.Broadcast(Event);
}

// ── Outbound ──────────────────────────────────────────────────────────────────

void UBridgeLoomLattice::RequestTransit(const FString& OriginNodeId,
                                         const FString& TargetNodeId,
                                         const FString& EntityId)
{
    OnTransitRequested.Broadcast(OriginNodeId, TargetNodeId);
}

void UBridgeLoomLattice::RequestCancelTransit(const FString& RequestId)
{
    OnCancelRequested.Broadcast(RequestId);
}

// ── Queries ───────────────────────────────────────────────────────────────────

FLoomLatticeNodeState UBridgeLoomLattice::GetNodeState(const FString& NodeId) const
{
    if (const FLoomLatticeNodeState* State = CachedNodes.Find(NodeId))
    {
        return *State;
    }
    return FLoomLatticeNodeState{};
}

TArray<FLoomLatticeNodeState> UBridgeLoomLattice::GetAllNodeStates() const
{
    TArray<FLoomLatticeNodeState> Result;
    CachedNodes.GenerateValueArray(Result);
    return Result;
}

bool UBridgeLoomLattice::GetActiveTransit(const FString& EntityId,
                                            FLoomTransitEvent& OutEvent) const
{
    if (const FLoomTransitEvent* Event = ActiveTransits.Find(EntityId))
    {
        OutEvent = *Event;
        return true;
    }
    return false;
}

FLinearColor UBridgeLoomLattice::GetCoherenceColour(float CoherencePercent) const
{
    // Safe band: 100–73% → blend from bright green to amber.
    // Danger band: below 73% → blend from amber to red.
    const float CritPct = CriticalPrecisionThreshold * 100.0f; // 73.0

    if (CoherencePercent >= CritPct)
    {
        // Map [CritPct, 100] → [amber, green]
        const float T = (CoherencePercent - CritPct) / (100.0f - CritPct);
        const FLinearColor Amber{ 1.0f, 0.6f, 0.0f, 1.0f };
        const FLinearColor Green{ 0.2f, 1.0f, 0.3f, 1.0f };
        return FLinearColor::LerpUsingHSV(Amber, Green, T);
    }
    else
    {
        // Map [0, CritPct] → [red, amber]
        const float T = FMath::Clamp(CoherencePercent / CritPct, 0.0f, 1.0f);
        const FLinearColor Red  { 1.0f, 0.1f, 0.05f, 1.0f };
        const FLinearColor Amber{ 1.0f, 0.6f, 0.0f,  1.0f };
        return FLinearColor::LerpUsingHSV(Red, Amber, T);
    }
}

bool UBridgeLoomLattice::IsNodeAtRisk(float PrecisionRating) const
{
    return PrecisionRating < CriticalPrecisionThreshold;
}

int32 UBridgeLoomLattice::GetNodeCount() const
{
    return CachedNodes.Num();
}

// ── Private ───────────────────────────────────────────────────────────────────

void UBridgeLoomLattice::HandlePartialCollapse(const FLoomTransitEvent& Event)
{
    // Niagara full-screen distortion effect (if configured).
    if (PartialCollapseVFX && GetWorld())
    {
        if (AActor* Owner = GetOwner())
        {
            UNiagaraFunctionLibrary::SpawnSystemAtLocation(
                GetWorld(),
                PartialCollapseVFX,
                Owner->GetActorLocation(),
                FRotator::ZeroRotator,
                FVector::OneVector,
                /*bAutoDestroy=*/true,
                /*bAutoActivate=*/true,
                ENCPoolMethod::AutoRelease);
        }
    }

    // Fire the Blueprint-implemented cinematic event.
    // Designers implement camera shake + audio directly in Blueprint.
    OnPartialCollapse.Broadcast(Event);
}
