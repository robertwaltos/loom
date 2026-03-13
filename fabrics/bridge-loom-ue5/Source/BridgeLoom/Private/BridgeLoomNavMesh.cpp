// Copyright Koydo. All Rights Reserved.
// BridgeLoomNavMesh.cpp

#include "BridgeLoomNavMesh.h"

UBridgeLoomNavMesh::UBridgeLoomNavMesh()
{
    PrimaryComponentTick.bCanEverTick = false;
}

FString UBridgeLoomNavMesh::RequestPath(const FLoomNavPathRequest& Request)
{
    FLoomNavPathRequest Req = Request;
    if (Req.RequestId.IsEmpty())
    {
        Req.RequestId = FString::Printf(TEXT("navreq_%d"), NextRequestCounter++);
    }
    OnPathRequested.Broadcast(Req);
    return Req.RequestId;
}

void UBridgeLoomNavMesh::NotifyPathResult(const FLoomNavPath& Path, const FString& RequestId)
{
    LastPath = Path;
    OnPathFound.Broadcast(Path, RequestId);
}

void UBridgeLoomNavMesh::NotifyPathNotFound(const FLoomNavPathRequest& OriginalRequest)
{
    OnPathNotFound.Broadcast(OriginalRequest);
}

void UBridgeLoomNavMesh::NotifyObstacleAdded(const FLoomNavObstacle& Obstacle)
{
    // Upsert
    for (FLoomNavObstacle& Existing : ActiveObstacles)
    {
        if (Existing.ObstacleId == Obstacle.ObstacleId)
        {
            Existing = Obstacle;
            OnObstacleAdded.Broadcast(Obstacle);
            return;
        }
    }
    ActiveObstacles.Add(Obstacle);
    OnObstacleAdded.Broadcast(Obstacle);
}

void UBridgeLoomNavMesh::NotifyObstacleRemoved(const FString& ObstacleId)
{
    ActiveObstacles.RemoveAll([&ObstacleId](const FLoomNavObstacle& O)
    {
        return O.ObstacleId == ObstacleId;
    });
    OnObstacleRemoved.Broadcast(ObstacleId);
}

void UBridgeLoomNavMesh::ApplyNavStats(const FLoomNavMeshStats& Stats)
{
    MeshStats = Stats;
}

bool UBridgeLoomNavMesh::HasObstacleAt(int32 X, int32 Y, ELoomNavLayer Layer) const
{
    for (const FLoomNavObstacle& O : ActiveObstacles)
    {
        if (O.X == X && O.Y == Y && O.Layer == Layer) return true;
    }
    return false;
}
