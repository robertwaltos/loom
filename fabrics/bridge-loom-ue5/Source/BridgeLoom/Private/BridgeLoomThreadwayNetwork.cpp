// Copyright Koydo. All Rights Reserved.
// BridgeLoomThreadwayNetwork.cpp

#include "BridgeLoomThreadwayNetwork.h"
#include "EngineUtils.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/Pawn.h"
#include "TimerManager.h"
#include "Engine/World.h"

// Luminance boost per discovery (mirrors LUMINANCE_BOOST_ON_DISCOVERY in TS)
static constexpr int32 LoomThreadway_LuminanceBoostDefault = 5;
static constexpr int32 LoomThreadway_SparkOnDiscoveryDefault = 10;

UBridgeLoomThreadwayNetwork::UBridgeLoomThreadwayNetwork()
{
    PrimaryComponentTick.bCanEverTick = false;
}

void UBridgeLoomThreadwayNetwork::BeginPlay()
{
    Super::BeginPlay();
    RegisterPortalActors();
}

// ─── Portal Registry ──────────────────────────────────────────────

void UBridgeLoomThreadwayNetwork::RegisterPortalActors()
{
    UWorld* World = GetWorld();
    if (!World) return;

    PortalSpawnMap.Empty();

    for (TActorIterator<AActor> It(World); It; ++It)
    {
        AActor* Actor = *It;
        if (!Actor || !Actor->ActorHasTag(FName("LoomThreadwaySpawn"))) continue;

        // Expect an additional tag of the form "World_<WorldId>"
        for (const FName& Tag : Actor->Tags)
        {
            FString TagStr = Tag.ToString();
            if (TagStr.StartsWith(TEXT("World_")))
            {
                FString WorldId = TagStr.Mid(6); // strip "World_"
                PortalSpawnMap.Add(WorldId, Actor);
                break;
            }
        }
    }
}

void UBridgeLoomThreadwayNetwork::RegisterPortalActor(const FString& WorldId,
                                                       AActor* PortalActor)
{
    if (PortalActor && !WorldId.IsEmpty())
    {
        PortalSpawnMap.Add(WorldId, PortalActor);
    }
}

// ─── Transit ──────────────────────────────────────────────────────

void UBridgeLoomThreadwayNetwork::TriggerTransit(const FString& ThreadwayId,
                                                   APlayerController* Player,
                                                   FLoomKindlerThreadwayState& InOutState)
{
    if (!Player || PlayersInTransit.Contains(Player)) return;

    FLoomThreadwayDefinition Def;
    if (!GetThreadwayById(ThreadwayId, Def)) return;

    PlayersInTransit.Add(Player);

    // Status upgrade: Traversed > Discovered > Visible
    const bool bFirstTraversal = !InOutState.TraversedThreadwayIds.Contains(ThreadwayId);
    InOutState.TraversedThreadwayIds.Add(ThreadwayId);

    if (bFirstTraversal)
    {
        OnThreadwayTraversed.Broadcast(ThreadwayId, InOutState.KindlerId);
    }

    // The transit VFX and teleport are deferred by TransitDurationSeconds
    const FString TargetWorld = Def.ToWorldId;
    FTimerHandle& Handle = TransitTimers.FindOrAdd(Player);

    FTimerDelegate Delegate;
    Delegate.BindLambda([this, Player, TargetWorld, ThreadwayId]()
    {
        TeleportPlayerToWorld(Player, TargetWorld);
        PlayersInTransit.Remove(Player);
        TransitTimers.Remove(Player);
    });

    GetWorld()->GetTimerManager().SetTimer(Handle, Delegate,
                                           TransitDurationSeconds, false);
}

void UBridgeLoomThreadwayNetwork::CancelTransit(APlayerController* Player)
{
    if (!Player) return;
    if (FTimerHandle* Handle = TransitTimers.Find(Player))
    {
        GetWorld()->GetTimerManager().ClearTimer(*Handle);
        TransitTimers.Remove(Player);
    }
    PlayersInTransit.Remove(Player);
}

void UBridgeLoomThreadwayNetwork::TeleportPlayerToWorld(APlayerController* PC,
                                                         const FString& WorldId)
{
    if (!PC) return;
    TWeakObjectPtr<AActor>* SpawnActorPtr = PortalSpawnMap.Find(WorldId);
    if (!SpawnActorPtr || !SpawnActorPtr->IsValid()) return;

    AActor* SpawnPoint = SpawnActorPtr->Get();
    APawn* Pawn = PC->GetPawn();
    if (Pawn)
    {
        Pawn->SetActorLocation(SpawnPoint->GetActorLocation(), false,
                               nullptr, ETeleportType::TeleportPhysics);
        Pawn->SetActorRotation(SpawnPoint->GetActorRotation());
    }
}

// ─── Discovery Logic ──────────────────────────────────────────────

TArray<FLoomThreadwayDiscoveryResult> UBridgeLoomThreadwayNetwork::EvaluateDiscovery(
    FLoomKindlerThreadwayState& InOutState)
{
    TArray<FLoomThreadwayDiscoveryResult> Results;

    for (const FLoomThreadwayDefinition& Def : ThreadwayDefinitions)
    {
        const ELoomThreadwayStatus NewStatus = ComputeThreadwayStatus(Def, InOutState);
        const bool bAlreadyKnown = InOutState.DiscoveredThreadwayIds.Contains(Def.ThreadwayId)
                                || InOutState.TraversedThreadwayIds.Contains(Def.ThreadwayId);

        const bool bIsNewDiscovery = !bAlreadyKnown
                                  && (NewStatus == ELoomThreadwayStatus::Visible
                                   || NewStatus == ELoomThreadwayStatus::Discovered);

        FLoomThreadwayDiscoveryResult Result;
        Result.ThreadwayId    = Def.ThreadwayId;
        Result.Status         = NewStatus;
        Result.SparkGained    = bIsNewDiscovery ? SparkOnDiscovery : 0;
        Result.LuminanceBoost = bIsNewDiscovery ? LuminanceOnDiscovery : 0;

        if (bIsNewDiscovery)
        {
            InOutState.DiscoveredThreadwayIds.Add(Def.ThreadwayId);
            OnThreadwayDiscovered.Broadcast(Def.ThreadwayId, Result);
        }

        Results.Add(Result);
    }

    return Results;
}

ELoomThreadwayStatus UBridgeLoomThreadwayNetwork::ComputeThreadwayStatus(
    const FLoomThreadwayDefinition& Def,
    const FLoomKindlerThreadwayState& State) const
{
    if (State.TraversedThreadwayIds.Contains(Def.ThreadwayId))
        return ELoomThreadwayStatus::Traversed;
    if (State.DiscoveredThreadwayIds.Contains(Def.ThreadwayId))
        return ELoomThreadwayStatus::Discovered;

    switch (Def.Tier)
    {
        case ELoomThreadwayTier::Tier1_AlwaysVisible:
            return ELoomThreadwayStatus::Visible;

        case ELoomThreadwayTier::Tier2_BothComplete:
        {
            const bool bFrom = State.CompletedWorldIds.Contains(Def.FromWorldId);
            const bool bTo   = State.CompletedWorldIds.Contains(Def.ToWorldId);
            return (bFrom && bTo) ? ELoomThreadwayStatus::Visible
                                  : ELoomThreadwayStatus::Hidden;
        }

        case ELoomThreadwayTier::Tier3_CrossTopic:
        {
            if (Def.DiscoveryTriggerEntryIds.IsEmpty())
                return ELoomThreadwayStatus::Hidden;

            for (const FString& EntryId : Def.DiscoveryTriggerEntryIds)
            {
                if (!State.CompletedEntryIds.Contains(EntryId))
                    return ELoomThreadwayStatus::Hidden;
            }
            return ELoomThreadwayStatus::Visible;
        }
    }

    return ELoomThreadwayStatus::Hidden;
}

TArray<FString> UBridgeLoomThreadwayNetwork::GetConnectedWorlds(
    const FString& WorldId) const
{
    TSet<FString> Connected;
    for (const FLoomThreadwayDefinition& Def : ThreadwayDefinitions)
    {
        if (Def.FromWorldId == WorldId) Connected.Add(Def.ToWorldId);
        if (Def.ToWorldId   == WorldId) Connected.Add(Def.FromWorldId);
    }
    return Connected.Array();
}

bool UBridgeLoomThreadwayNetwork::GetThreadwayById(const FString& ThreadwayId,
                                                     FLoomThreadwayDefinition& OutDef) const
{
    for (const FLoomThreadwayDefinition& Def : ThreadwayDefinitions)
    {
        if (Def.ThreadwayId == ThreadwayId)
        {
            OutDef = Def;
            return true;
        }
    }
    return false;
}

TArray<FLoomThreadwayDefinition> UBridgeLoomThreadwayNetwork::GetThreadwaysByRealm(
    ELoomThreadwayRealm Realm) const
{
    TArray<FLoomThreadwayDefinition> Result;
    for (const FLoomThreadwayDefinition& Def : ThreadwayDefinitions)
    {
        if (Def.Realm == Realm) Result.Add(Def);
    }
    return Result;
}
