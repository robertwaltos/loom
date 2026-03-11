// BridgeLoomWorldStreamer.h — UE5 level streaming driven by Loom
// Loads/unloads UE5 levels based on WorldStreamingManager commands
// Thread: bridge/bridge-loom-ue5/world-streaming
// Tier: 2

#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "Engine/LevelStreamingDynamic.h"
#include "BridgeLoomWorldStreamer.generated.h"

USTRUCT(BlueprintType)
struct FLoomChunkCoord
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString WorldId;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 ChunkX = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 ChunkY = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 ChunkZ = 0;

    FString GetKey() const
    {
        return FString::Printf(TEXT("%s:%d,%d,%d"), *WorldId, ChunkX, ChunkY, ChunkZ);
    }
};

USTRUCT()
struct FLoadedChunkInfo
{
    GENERATED_BODY()

    UPROPERTY()
    FLoomChunkCoord Coord;

    UPROPERTY()
    TWeakObjectPtr<ULevelStreamingDynamic> StreamingLevel;

    UPROPERTY()
    float LoadPriority = 0.0f;

    UPROPERTY()
    double LoadStartTime = 0.0;
};

/**
 * UBridgeLoomWorldStreamer — World subsystem that processes
 * streaming commands from the Loom WorldStreamingManager.
 * Maps chunk coordinates to UE5 World Partition or Level Streaming.
 */
UCLASS()
class BRIDGELOOM_API UBridgeLoomWorldStreamer : public UWorldSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    virtual void Deinitialize() override;

    // Queue a chunk for loading
    UFUNCTION(BlueprintCallable, Category = "BridgeLoom|Streaming")
    void RequestChunkLoad(const FLoomChunkCoord& Coord, float Priority);

    // Queue a chunk for unloading
    UFUNCTION(BlueprintCallable, Category = "BridgeLoom|Streaming")
    void RequestChunkUnload(const FLoomChunkCoord& Coord);

    // Process pending load/unload queue (call from tick)
    UFUNCTION(BlueprintCallable, Category = "BridgeLoom|Streaming")
    void ProcessStreamingQueue(int32 MaxLoadsPerFrame = 2);

    // Check if a chunk is currently loaded
    UFUNCTION(BlueprintPure, Category = "BridgeLoom|Streaming")
    bool IsChunkLoaded(const FLoomChunkCoord& Coord) const;

    // Get number of chunks currently loaded
    UFUNCTION(BlueprintPure, Category = "BridgeLoom|Streaming")
    int32 GetLoadedChunkCount() const { return LoadedChunks.Num(); }

    // Get number of chunks pending load
    UFUNCTION(BlueprintPure, Category = "BridgeLoom|Streaming")
    int32 GetPendingLoadCount() const { return PendingLoads.Num(); }

    // Map chunk coordinate to a level asset path
    // Override this in Blueprint or C++ subclass for custom mapping
    UFUNCTION(BlueprintNativeEvent, Category = "BridgeLoom|Streaming")
    FString GetLevelPathForChunk(const FLoomChunkCoord& Coord) const;
    virtual FString GetLevelPathForChunk_Implementation(const FLoomChunkCoord& Coord) const;

    // Transform for chunk origin in world space
    UFUNCTION(BlueprintPure, Category = "BridgeLoom|Streaming")
    FTransform GetChunkWorldTransform(const FLoomChunkCoord& Coord, float ChunkSize = 25600.0f) const;

private:
    // Loaded chunks keyed by chunk key string
    UPROPERTY()
    TMap<FString, FLoadedChunkInfo> LoadedChunks;

    // Priority queue for pending loads: sorted highest priority first
    TArray<TPair<float, FLoomChunkCoord>> PendingLoads;

    // Pending unloads
    TArray<FLoomChunkCoord> PendingUnloads;

    void ExecuteLoad(const FLoomChunkCoord& Coord, float Priority);
    void ExecuteUnload(const FLoomChunkCoord& Coord);
};
