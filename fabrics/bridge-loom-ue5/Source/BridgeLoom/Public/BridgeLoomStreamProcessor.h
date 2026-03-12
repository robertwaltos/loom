// Copyright Project Loom. All Rights Reserved.
// Thread: bridge/bridge-loom-ue5/grpc-stream-processor
// Tier: 0
//
// gRPC Stream Processor — Processes bidirectional stream messages
// between the Loom server and UE5 game thread.
// Decodes FlatBuffer/MessagePack payloads and dispatches to subsystems.

#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "BridgeLoomStreamProcessor.generated.h"

// Forward declarations
class UBridgeLoomConnection;
class UBridgeLoomEntityManager;
class UBridgeLoomRenderer;

// ── Server Message Types ────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomServerMessageType : uint8
{
	EntitySnapshot    UMETA(DisplayName = "Entity Snapshot"),
	EntitySpawn       UMETA(DisplayName = "Entity Spawn"),
	EntityDespawn     UMETA(DisplayName = "Entity Despawn"),
	TimeWeather       UMETA(DisplayName = "Time & Weather"),
	FacialPose        UMETA(DisplayName = "Facial Pose"),
	WorldPreload      UMETA(DisplayName = "World Preload"),
	WorldUnload       UMETA(DisplayName = "World Unload"),
	HeartbeatAck      UMETA(DisplayName = "Heartbeat Ack"),
};

// ── Decoded Entity Snapshot ─────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomEntitySnapshot
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	FString EntityId;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	FVector Position = FVector::ZeroVector;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	FQuat Rotation = FQuat::Identity;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	FVector Scale = FVector::OneVector;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	FString AnimClipName;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	float AnimNormalizedTime = 0.0f;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	float AnimBlendWeight = 1.0f;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	uint32 SequenceNumber = 0;
};

// ── Decoded Spawn Request ───────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomSpawnRequest
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	FString EntityId;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	FString Archetype;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	FString MeshAssetPath;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	FString MetaHumanPreset;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	FVector SpawnPosition = FVector::ZeroVector;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	FQuat SpawnRotation = FQuat::Identity;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	TArray<FString> Tags;
};

// ── Decoded Facial Pose ─────────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomFacialPose
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	FString EntityId;

	/** ARKit-compatible blend shape weights (52 values). */
	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	TMap<FName, float> BlendShapes;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	FString EmotionTag;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	FString SpeechViseme;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	float SpeechAmplitude = 0.0f;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	FVector GazeTarget = FVector::ZeroVector;
};

// ── Time & Weather Payload ──────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomTimeOfDay
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	float SunAltitude = 45.0f;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	float SunAzimuth = 180.0f;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	FLinearColor SunColor = FLinearColor(1.0f, 0.95f, 0.9f);

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	float SunIntensity = 6.0f;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	float FogDensity = 0.02f;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	float CloudCoverage = 0.3f;
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomWeather
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	float RainIntensity = 0.0f;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	float SnowIntensity = 0.0f;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	float WindSpeed = 0.0f;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	FVector WindDirection = FVector(1.0f, 0.0f, 0.0f);

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	float Temperature = 20.0f;
};

// ── Stream Processing Stats ─────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FStreamProcessorStats
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	int64 SnapshotsProcessed = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	int64 SpawnsProcessed = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	int64 DespawnsProcessed = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	int64 FacialPosesProcessed = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	float LastProcessingTimeMs = 0.0f;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	int32 PendingMessages = 0;
};

// ── Delegates ───────────────────────────────────────────────────

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
	FOnEntitySnapshotReceived, const FLoomEntitySnapshot&, Snapshot);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
	FOnSpawnRequestReceived, const FLoomSpawnRequest&, Request);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
	FOnDespawnReceived, const FString&, EntityId);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
	FOnFacialPoseReceived, const FLoomFacialPose&, Pose);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(
	FOnTimeWeatherReceived, const FLoomTimeOfDay&, TimeOfDay,
	const FLoomWeather&, Weather);

// ── Component ───────────────────────────────────────────────────

/**
 * UBridgeLoomStreamProcessor
 *
 * Processes incoming gRPC stream messages on the game thread.
 * Receives raw buffers from BridgeLoomConnection's background
 * thread, decodes them, and dispatches to the appropriate subsystem.
 *
 * Processing order per tick:
 *   1. Spawns (so entities exist before snapshots reference them)
 *   2. Despawns (remove stale entities)
 *   3. Snapshots (update positions/animations)
 *   4. Facial poses (update MetaHuman expressions)
 *   5. Time/weather (environmental state)
 */
UCLASS()
class BRIDGELOOM_API UBridgeLoomStreamProcessor : public UGameInstanceSubsystem
{
	GENERATED_BODY()

public:
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;
	virtual void Deinitialize() override;

	// ── Message Ingestion (called from background thread) ─────

	/** Enqueue a raw server message for game-thread processing. */
	void EnqueueMessage(ELoomServerMessageType Type, TArray<uint8>&& Payload,
		uint32 SequenceNumber);

	// ── Per-Frame Processing (called from game thread tick) ───

	/**
	 * Process all pending messages this frame.
	 * Budget: < 0.5ms. If exceeded, remaining messages carry over.
	 */
	UFUNCTION(BlueprintCallable, Category = "Loom|Stream")
	void ProcessPendingMessages(int32 MaxMessagesPerFrame = 256);

	// ── Stats ────────────────────────────────────────────────

	UFUNCTION(BlueprintPure, Category = "Loom|Stream")
	FStreamProcessorStats GetProcessorStats() const { return Stats; }

	// ── Events ───────────────────────────────────────────────

	UPROPERTY(BlueprintAssignable, Category = "Loom|Stream")
	FOnEntitySnapshotReceived OnEntitySnapshotReceived;

	UPROPERTY(BlueprintAssignable, Category = "Loom|Stream")
	FOnSpawnRequestReceived OnSpawnRequestReceived;

	UPROPERTY(BlueprintAssignable, Category = "Loom|Stream")
	FOnDespawnReceived OnDespawnReceived;

	UPROPERTY(BlueprintAssignable, Category = "Loom|Stream")
	FOnFacialPoseReceived OnFacialPoseReceived;

	UPROPERTY(BlueprintAssignable, Category = "Loom|Stream")
	FOnTimeWeatherReceived OnTimeWeatherReceived;

protected:
	/** Decode and dispatch a single entity snapshot. */
	void ProcessEntitySnapshot(const TArray<uint8>& Payload, uint32 Seq);

	/** Decode and dispatch a spawn request. */
	void ProcessEntitySpawn(const TArray<uint8>& Payload);

	/** Decode and dispatch a despawn notification. */
	void ProcessEntityDespawn(const TArray<uint8>& Payload);

	/** Decode and dispatch a facial pose update. */
	void ProcessFacialPose(const TArray<uint8>& Payload);

	/** Decode and dispatch time/weather. */
	void ProcessTimeWeather(const TArray<uint8>& Payload);

private:
	// Thread-safe message queue (background → game thread)
	struct FPendingMessage
	{
		ELoomServerMessageType Type;
		TArray<uint8> Payload;
		uint32 SequenceNumber;
	};

	FCriticalSection QueueLock;
	TArray<FPendingMessage> MessageQueue;
	FStreamProcessorStats Stats;
};
