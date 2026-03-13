// Copyright Koydo. All Rights Reserved.
// BridgeLoomNavMesh.h — UE5 bridge for navigation-mesh.ts A* path results and obstacles.
//
// navigation-mesh.ts provides:
//   - NodeType: PASSABLE / BLOCKED / SLOW / WATER / HAZARD
//   - NavigationLayer: SURFACE / UNDERGROUND / UNDERWATER
//   - A* with diagonal cost 1.414, weatherCostModifier
//   - MAX_CACHE_SIZE = 256 cached paths
//   - NavObstacle: added/removed dynamically
//
// UE5 bridge strategy:
//   - RequestPath fires OnPathRequested delegate (transport owns the A* execution)
//   - NotifyPathResult delivers result back to Blueprints
//   - Path nodes are FVector2D (tile coords) for easy tile→world translation by caller
//   - Transport subscribes to OnPathRequested and calls NotifyPathResult when done

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomNavMesh.generated.h"

// ─── Enums ────────────────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomNavNodeType : uint8
{
    Passable   UMETA(DisplayName = "Passable"),
    Blocked    UMETA(DisplayName = "Blocked"),
    Slow       UMETA(DisplayName = "Slow"),
    Water      UMETA(DisplayName = "Water"),
    Hazard     UMETA(DisplayName = "Hazard"),
};

UENUM(BlueprintType)
enum class ELoomNavLayer : uint8
{
    Surface      UMETA(DisplayName = "Surface"),
    Underground  UMETA(DisplayName = "Underground"),
    Underwater   UMETA(DisplayName = "Underwater"),
};

// ─── Structs ──────────────────────────────────────────────────────

/** A single navigable grid tile. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomNavNode
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Navigation")
    int32 X = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Navigation")
    int32 Y = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Navigation")
    ELoomNavNodeType NodeType = ELoomNavNodeType::Passable;

    UPROPERTY(BlueprintReadOnly, Category = "Navigation")
    ELoomNavLayer Layer = ELoomNavLayer::Surface;

    /** Base movement cost for this tile (overrides default 1.0 for Slow/Water/Hazard). */
    UPROPERTY(BlueprintReadOnly, Category = "Navigation")
    float BaseCost = 1.0f;
};

/** An A*-computed path between two tiles. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomNavPath
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Navigation")
    TArray<FLoomNavNode> Nodes;

    UPROPERTY(BlueprintReadOnly, Category = "Navigation")
    float TotalCost = 0.0f;

    /** Number of nodes including start and goal. */
    UPROPERTY(BlueprintReadOnly, Category = "Navigation")
    int32 Length = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Navigation")
    ELoomNavLayer Layer = ELoomNavLayer::Surface;
};

/** Dynamic obstacle occupying a tile. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomNavObstacle
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Navigation")
    FString ObstacleId;

    UPROPERTY(BlueprintReadOnly, Category = "Navigation")
    int32 X = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Navigation")
    int32 Y = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Navigation")
    ELoomNavLayer Layer = ELoomNavLayer::Surface;
};

/** Parameters for a path request. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomNavPathRequest
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, Category = "Navigation")
    int32 StartX = 0;

    UPROPERTY(BlueprintReadWrite, Category = "Navigation")
    int32 StartY = 0;

    UPROPERTY(BlueprintReadWrite, Category = "Navigation")
    int32 EndX = 0;

    UPROPERTY(BlueprintReadWrite, Category = "Navigation")
    int32 EndY = 0;

    UPROPERTY(BlueprintReadWrite, Category = "Navigation")
    ELoomNavLayer Layer = ELoomNavLayer::Surface;

    /** Multiplied against tile cost under weather effects (default 1.0 = no change). */
    UPROPERTY(BlueprintReadWrite, Category = "Navigation")
    float WeatherCostMod = 1.0f;

    /** Caller-assigned ID so results can be correlated to requests. */
    UPROPERTY(BlueprintReadWrite, Category = "Navigation")
    FString RequestId;
};

/** Aggregate mesh statistics for HUD/debug display. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomNavMeshStats
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Navigation")
    int32 Width = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Navigation")
    int32 Height = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Navigation")
    int32 TotalNodes = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Navigation")
    int32 BlockedNodes = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Navigation")
    int32 ObstacleCount = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Navigation")
    int32 CachedPaths = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Navigation")
    int32 PathsComputed = 0;
};

// ─── Component ────────────────────────────────────────────────────

/**
 * UBridgeLoomNavMesh — ActorComponent bridging navigation-mesh.ts path results
 * and obstacle state to Blueprint-accessible UE5 data.
 *
 * The A* computation runs server-side (TS).  This bridge:
 *   - Fires OnPathRequested so the transport layer can forward the request.
 *   - Delivers results via NotifyPathResult / NotifyPathNotFound delegates.
 *   - Mirrors active obstacles for local debug visualisation.
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent),
       DisplayName = "Loom Nav Mesh")
class BRIDGELOOM_API UBridgeLoomNavMesh : public UActorComponent
{
    GENERATED_BODY()

public:
    UBridgeLoomNavMesh();

    // ── State ─────────────────────────────────────────────────────

    UPROPERTY(BlueprintReadOnly, Category = "Navigation")
    FLoomNavMeshStats MeshStats;

    UPROPERTY(BlueprintReadOnly, Category = "Navigation")
    TArray<FLoomNavObstacle> ActiveObstacles;

    UPROPERTY(BlueprintReadOnly, Category = "Navigation")
    FLoomNavPath LastPath;

    // ── Outbound (UE5 → transport) ────────────────────────────────

    /** Submit a new path request. Returns the RequestId for correlation. */
    UFUNCTION(BlueprintCallable, Category = "Navigation")
    FString RequestPath(const FLoomNavPathRequest& Request);

    // ── Inbound (transport → UE5) ─────────────────────────────────

    UFUNCTION(BlueprintCallable, Category = "Navigation")
    void NotifyPathResult(const FLoomNavPath& Path, const FString& RequestId);

    UFUNCTION(BlueprintCallable, Category = "Navigation")
    void NotifyPathNotFound(const FLoomNavPathRequest& OriginalRequest);

    UFUNCTION(BlueprintCallable, Category = "Navigation")
    void NotifyObstacleAdded(const FLoomNavObstacle& Obstacle);

    UFUNCTION(BlueprintCallable, Category = "Navigation")
    void NotifyObstacleRemoved(const FString& ObstacleId);

    UFUNCTION(BlueprintCallable, Category = "Navigation")
    void ApplyNavStats(const FLoomNavMeshStats& Stats);

    // ── Queries ───────────────────────────────────────────────────

    UFUNCTION(BlueprintPure, Category = "Navigation")
    bool HasObstacleAt(int32 X, int32 Y, ELoomNavLayer Layer) const;

    // ── Delegates ─────────────────────────────────────────────────

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnPathRequested,
        FLoomNavPathRequest, Request);
    UPROPERTY(BlueprintAssignable, Category = "Navigation|Requests")
    FOnPathRequested OnPathRequested;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnPathFound,
        FLoomNavPath, Path, FString, RequestId);
    UPROPERTY(BlueprintAssignable, Category = "Navigation|Events")
    FOnPathFound OnPathFound;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnPathNotFound,
        FLoomNavPathRequest, OriginalRequest);
    UPROPERTY(BlueprintAssignable, Category = "Navigation|Events")
    FOnPathNotFound OnPathNotFound;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnObstacleAdded,
        FLoomNavObstacle, Obstacle);
    UPROPERTY(BlueprintAssignable, Category = "Navigation|Events")
    FOnObstacleAdded OnObstacleAdded;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnObstacleRemoved,
        FString, ObstacleId);
    UPROPERTY(BlueprintAssignable, Category = "Navigation|Events")
    FOnObstacleRemoved OnObstacleRemoved;

private:
    int32 NextRequestCounter = 0;
};
