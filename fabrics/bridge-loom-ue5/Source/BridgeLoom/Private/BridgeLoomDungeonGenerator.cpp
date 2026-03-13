// Copyright Koydo. All Rights Reserved.
// BridgeLoomDungeonGenerator.cpp

#include "BridgeLoomDungeonGenerator.h"

UBridgeLoomDungeonGenerator::UBridgeLoomDungeonGenerator()
{
    PrimaryComponentTick.bCanEverTick = false;
}

FString UBridgeLoomDungeonGenerator::RequestGeneration(const FLoomGenerationParams& Params)
{
    FLoomGenerationParams Req = Params;
    if (Req.RequestId.IsEmpty())
    {
        Req.RequestId = FString::Printf(TEXT("dungeon_%d"), NextRequestCounter++);
    }
    OnGenerationRequested.Broadcast(Req);
    return Req.RequestId;
}

void UBridgeLoomDungeonGenerator::NotifyLayoutReady(const FLoomDungeonLayout& Layout)
{
    CurrentLayout = Layout;
    bHasLayout = true;
    OnLayoutReady.Broadcast(Layout);
}

void UBridgeLoomDungeonGenerator::NotifyGenerationFailed(const FString& Reason)
{
    OnGenerationFailed.Broadcast(Reason);
}

void UBridgeLoomDungeonGenerator::NotifyRoomEntered(const FString& EntityId, const FString& RoomId)
{
    if (!bHasLayout) return;

    const FLoomDungeonRoom* Found = CurrentLayout.Rooms.Find(RoomId);
    if (Found)
    {
        OnRoomEntered.Broadcast(EntityId, RoomId, Found->RoomType);
    }
}

bool UBridgeLoomDungeonGenerator::GetRoom(const FString& RoomId, FLoomDungeonRoom& OutRoom) const
{
    const FLoomDungeonRoom* Found = CurrentLayout.Rooms.Find(RoomId);
    if (Found)
    {
        OutRoom = *Found;
        return true;
    }
    return false;
}

TArray<FLoomDungeonRoom> UBridgeLoomDungeonGenerator::GetRoomsByType(ELoomRoomType RoomType) const
{
    TArray<FLoomDungeonRoom> Result;
    for (const TPair<FString, FLoomDungeonRoom>& Pair : CurrentLayout.Rooms)
    {
        if (Pair.Value.RoomType == RoomType)
        {
            Result.Add(Pair.Value);
        }
    }
    return Result;
}

int32 UBridgeLoomDungeonGenerator::GetRoomCount() const
{
    return CurrentLayout.Rooms.Num();
}
