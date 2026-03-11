// Copyright Project Loom. All Rights Reserved.
// Thread: bridge/bridge-loom-ue5/grpc-connection
// Tier: 0
//
// gRPC connection management for the Loom ↔ UE5 bridge.
// Uses bidirectional streaming for the game loop hot path.

#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "BridgeLoomConnection.generated.h"

DECLARE_LOG_CATEGORY_EXTERN(LogBridgeLoom, Log, All);

// ── Connection State ────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomConnectionState : uint8
{
	Disconnected    UMETA(DisplayName = "Disconnected"),
	Connecting      UMETA(DisplayName = "Connecting"),
	Negotiating     UMETA(DisplayName = "Negotiating"),
	Connected       UMETA(DisplayName = "Connected"),
	Reconnecting    UMETA(DisplayName = "Reconnecting"),
	Error           UMETA(DisplayName = "Error"),
};

// ── Connection Config ───────────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomConnectionConfig
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom")
	FString Address = TEXT("localhost");

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom")
	int32 Port = 50051;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom")
	float ReconnectDelaySec = 2.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom")
	int32 MaxReconnectAttempts = 10;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom")
	float HeartbeatIntervalSec = 5.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom")
	bool bUseTLS = false;
};

// ── Telemetry ───────────────────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomTelemetry
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	float RoundTripTimeMs = 0.0f;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	int64 MessagesSent = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	int64 MessagesReceived = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	int64 BytesSent = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	int64 BytesReceived = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	int32 ReconnectCount = 0;
};

// ── Delegates ───────────────────────────────────────────────────

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnLoomConnectionStateChanged,
	ELoomConnectionState, NewState);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnLoomEntitySpawned,
	const FString&, EntityId, const FString&, Archetype);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnLoomEntityDespawned,
	const FString&, EntityId);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnLoomWorldPreload,
	const FString&, WorldId);

/**
 * UBridgeLoomConnection
 *
 * GameInstance subsystem owning the gRPC bidirectional stream
 * between this UE5 client and the Loom orchestration server.
 *
 * UE5.5 patterns:
 *   - GameInstanceSubsystem (survives seamless travel)
 *   - Async completion queue on background thread
 *   - FlatBuffer zero-copy deserialization on game thread
 */
UCLASS()
class BRIDGELOOM_API UBridgeLoomConnection : public UGameInstanceSubsystem
{
	GENERATED_BODY()

public:
	// ─── Lifecycle ──────────────────────────────────────────────

	virtual void Initialize(FSubsystemCollectionBase& Collection) override;
	virtual void Deinitialize() override;
	virtual bool ShouldCreateSubsystem(UObject* Outer) const override;

	// ─── Connection ─────────────────────────────────────────────

	/** Connect to the Loom server. Begins capability negotiation. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Connection")
	void ConnectToLoom(const FLoomConnectionConfig& Config);

	/** Gracefully disconnect from the Loom server. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Connection")
	void DisconnectFromLoom();

	/** Current connection state. */
	UFUNCTION(BlueprintPure, Category = "Loom|Connection")
	ELoomConnectionState GetConnectionState() const { return ConnectionState; }

	/** Whether we have an active game stream. */
	UFUNCTION(BlueprintPure, Category = "Loom|Connection")
	bool IsConnected() const
	{
		return ConnectionState == ELoomConnectionState::Connected;
	}

	// ─── Player Input ───────────────────────────────────────────

	/**
	 * Send player input to the Loom server.
	 * Called every Enhanced Input tick via the input component.
	 */
	UFUNCTION(BlueprintCallable, Category = "Loom|Input")
	void SendPlayerInput(const FString& PlayerId, FVector MoveDirection,
		float Yaw, float Pitch, uint32 ActionFlags);

	// ─── Telemetry ──────────────────────────────────────────────

	UFUNCTION(BlueprintPure, Category = "Loom|Telemetry")
	FLoomTelemetry GetTelemetry() const { return Telemetry; }

	// ─── Events ─────────────────────────────────────────────────

	UPROPERTY(BlueprintAssignable, Category = "Loom|Events")
	FOnLoomConnectionStateChanged OnConnectionStateChanged;

	UPROPERTY(BlueprintAssignable, Category = "Loom|Events")
	FOnLoomEntitySpawned OnEntitySpawned;

	UPROPERTY(BlueprintAssignable, Category = "Loom|Events")
	FOnLoomEntityDespawned OnEntityDespawned;

	UPROPERTY(BlueprintAssignable, Category = "Loom|Events")
	FOnLoomWorldPreload OnWorldPreload;

protected:
	void SetConnectionState(ELoomConnectionState NewState);
	void AttemptReconnect();
	void SendHeartbeat();

private:
	ELoomConnectionState ConnectionState = ELoomConnectionState::Disconnected;
	FLoomConnectionConfig CurrentConfig;
	FLoomTelemetry Telemetry;

	uint32 InputSequence = 0;
	int32 ReconnectAttempts = 0;
	FTimerHandle ReconnectTimerHandle;
	FTimerHandle HeartbeatTimerHandle;
	double ConnectTimestamp = 0.0;

	// gRPC handles — opaque pointers to avoid header pollution
	// Actual gRPC types live in the .cpp via pimpl
	struct FGrpcState;
	TUniquePtr<FGrpcState> GrpcState;
};
