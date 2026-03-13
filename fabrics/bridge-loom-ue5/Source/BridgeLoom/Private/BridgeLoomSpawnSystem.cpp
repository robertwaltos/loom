// Copyright Koydo. All Rights Reserved.
// BridgeLoomSpawnSystem.cpp

#include "BridgeLoomSpawnSystem.h"

UBridgeLoomSpawnSystem::UBridgeLoomSpawnSystem()
{
    PrimaryComponentTick.bCanEverTick = false;
}

void UBridgeLoomSpawnSystem::RequestSpawnPlayer(const FLoomSpawnPlayerParams& Params)
{
    OnSpawnPlayerRequested.Broadcast(Params);
}

void UBridgeLoomSpawnSystem::RequestSpawnNpc(const FLoomSpawnNpcParams& Params)
{
    OnSpawnNpcRequested.Broadcast(Params);
}

void UBridgeLoomSpawnSystem::NotifySpawnResult(const FLoomSpawnResult& Result)
{
    RecentResults.Add(Result);
    while (RecentResults.Num() > MaxResultHistory)
    {
        RecentResults.RemoveAt(0);
    }

    if (Result.bOk)
    {
        OnSpawnCompleted.Broadcast(Result);
    }
    else
    {
        OnSpawnFailed.Broadcast(Result.Reason);
    }
}

void UBridgeLoomSpawnSystem::NotifySpawnFailed(const FString& Reason)
{
    FLoomSpawnResult Failed;
    Failed.bOk = false;
    Failed.Reason = Reason;
    NotifySpawnResult(Failed);
}

bool UBridgeLoomSpawnSystem::HasEntityBeenSpawned(const FString& EntityId) const
{
    for (const FLoomSpawnResult& R : RecentResults)
    {
        if (R.bOk && R.EntityId == EntityId) return true;
    }
    return false;
}
