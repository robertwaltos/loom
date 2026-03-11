// BridgeLoomWorldStreamer.cpp — Level streaming implementation
// Thread: bridge/bridge-loom-ue5/world-streaming
// Tier: 2

#include "BridgeLoomWorldStreamer.h"
#include "Engine/LevelStreamingDynamic.h"

void UBridgeLoomWorldStreamer::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
}

void UBridgeLoomWorldStreamer::Deinitialize()
{
    // Unload all chunks on shutdown
    for (auto& Pair : LoadedChunks)
    {
        if (Pair.Value.StreamingLevel.IsValid())
        {
            Pair.Value.StreamingLevel->SetShouldBeLoaded(false);
            Pair.Value.StreamingLevel->SetShouldBeVisible(false);
        }
    }
    LoadedChunks.Empty();
    PendingLoads.Empty();
    PendingUnloads.Empty();

    Super::Deinitialize();
}

void UBridgeLoomWorldStreamer::RequestChunkLoad(const FLoomChunkCoord& Coord, float Priority)
{
    const FString Key = Coord.GetKey();
    if (LoadedChunks.Contains(Key)) return; // Already loaded

    // Check if already pending
    for (const auto& Pending : PendingLoads)
    {
        if (Pending.Value.GetKey() == Key) return;
    }

    PendingLoads.Add(TPair<float, FLoomChunkCoord>(Priority, Coord));

    // Sort by priority descending
    PendingLoads.Sort([](const auto& A, const auto& B)
    {
        return A.Key > B.Key;
    });
}

void UBridgeLoomWorldStreamer::RequestChunkUnload(const FLoomChunkCoord& Coord)
{
    PendingUnloads.Add(Coord);
}

void UBridgeLoomWorldStreamer::ProcessStreamingQueue(int32 MaxLoadsPerFrame)
{
    // Process unloads first (free memory for loads)
    for (const FLoomChunkCoord& Coord : PendingUnloads)
    {
        ExecuteUnload(Coord);
    }
    PendingUnloads.Empty();

    // Process loads up to budget
    int32 LoadsThisFrame = 0;
    while (PendingLoads.Num() > 0 && LoadsThisFrame < MaxLoadsPerFrame)
    {
        auto Top = PendingLoads[0];
        PendingLoads.RemoveAt(0);
        ExecuteLoad(Top.Value, Top.Key);
        LoadsThisFrame++;
    }
}

bool UBridgeLoomWorldStreamer::IsChunkLoaded(const FLoomChunkCoord& Coord) const
{
    return LoadedChunks.Contains(Coord.GetKey());
}

FString UBridgeLoomWorldStreamer::GetLevelPathForChunk_Implementation(
    const FLoomChunkCoord& Coord) const
{
    // Default mapping: /Game/Worlds/{WorldId}/Chunk_{X}_{Y}_{Z}
    return FString::Printf(TEXT("/Game/Worlds/%s/Chunk_%d_%d_%d"),
        *Coord.WorldId, Coord.ChunkX, Coord.ChunkY, Coord.ChunkZ);
}

FTransform UBridgeLoomWorldStreamer::GetChunkWorldTransform(
    const FLoomChunkCoord& Coord, float ChunkSize) const
{
    const FVector Location(
        Coord.ChunkX * ChunkSize,
        Coord.ChunkY * ChunkSize,
        Coord.ChunkZ * ChunkSize
    );
    return FTransform(FRotator::ZeroRotator, Location, FVector::OneVector);
}

void UBridgeLoomWorldStreamer::ExecuteLoad(const FLoomChunkCoord& Coord, float Priority)
{
    const FString Key = Coord.GetKey();
    if (LoadedChunks.Contains(Key)) return;

    const FString LevelPath = GetLevelPathForChunk(Coord);
    const FTransform Transform = GetChunkWorldTransform(Coord);

    bool bSuccess = false;
    ULevelStreamingDynamic* StreamingLevel = ULevelStreamingDynamic::LoadLevelInstance(
        GetWorld(),
        LevelPath,
        Transform.GetLocation(),
        Transform.Rotator(),
        bSuccess
    );

    if (bSuccess && StreamingLevel)
    {
        StreamingLevel->SetShouldBeLoaded(true);
        StreamingLevel->SetShouldBeVisible(true);

        FLoadedChunkInfo Info;
        Info.Coord = Coord;
        Info.StreamingLevel = StreamingLevel;
        Info.LoadPriority = Priority;
        Info.LoadStartTime = FPlatformTime::Seconds();

        LoadedChunks.Add(Key, Info);
    }
}

void UBridgeLoomWorldStreamer::ExecuteUnload(const FLoomChunkCoord& Coord)
{
    const FString Key = Coord.GetKey();
    FLoadedChunkInfo* Info = LoadedChunks.Find(Key);
    if (!Info) return;

    if (Info->StreamingLevel.IsValid())
    {
        Info->StreamingLevel->SetShouldBeLoaded(false);
        Info->StreamingLevel->SetShouldBeVisible(false);
    }

    LoadedChunks.Remove(Key);
}
