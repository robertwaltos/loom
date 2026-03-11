// Copyright Project Loom. All Rights Reserved.

#include "BridgeLoomConnection.h"
#include "Engine/World.h"
#include "TimerManager.h"

DEFINE_LOG_CATEGORY(LogBridgeLoom);

// ── Lifecycle ───────────────────────────────────────────────────

void UBridgeLoomConnection::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);
	UE_LOG(LogBridgeLoom, Log,
		TEXT("BridgeLoomConnection initialized (GameInstance scope)"));
}

void UBridgeLoomConnection::Deinitialize()
{
	DisconnectFromLoom();
	Super::Deinitialize();
}

bool UBridgeLoomConnection::ShouldCreateSubsystem(UObject* Outer) const
{
	// Always create — the Loom bridge is mandatory
	return true;
}

// ── Connection ──────────────────────────────────────────────────

void UBridgeLoomConnection::ConnectToLoom(const FLoomConnectionConfig& Config)
{
	if (ConnectionState == ELoomConnectionState::Connected ||
	    ConnectionState == ELoomConnectionState::Connecting)
	{
		UE_LOG(LogBridgeLoom, Warning,
			TEXT("Already connected or connecting to Loom"));
		return;
	}

	CurrentConfig = Config;
	ReconnectAttempts = 0;
	ConnectTimestamp = FPlatformTime::Seconds();
	SetConnectionState(ELoomConnectionState::Connecting);

	const FString Target = FString::Printf(
		TEXT("%s:%d"), *Config.Address, Config.Port);
	UE_LOG(LogBridgeLoom, Log,
		TEXT("Connecting to Loom server at %s (TLS=%s)"),
		*Target, Config.bUseTLS ? TEXT("yes") : TEXT("no"));

	// TODO(Phase 8): Create grpc::Channel with credentials
	// auto ChannelCreds = Config.bUseTLS
	//     ? grpc::SslCredentials(grpc::SslCredentialsOptions())
	//     : grpc::InsecureChannelCredentials();
	// GrpcState->Channel = grpc::CreateChannel(
	//     TCHAR_TO_UTF8(*Target), ChannelCreds);
	// GrpcState->Stub = LoomBridge::BridgeLoom::NewStub(GrpcState->Channel);

	// Negotiate capabilities
	SetConnectionState(ELoomConnectionState::Negotiating);

	// TODO(Phase 8): Send NegotiateRequest with CapabilityManifest
	// For now, simulate successful negotiation
	SetConnectionState(ELoomConnectionState::Connected);

	// Start heartbeat timer
	if (UWorld* World = GetGameInstance()->GetWorld())
	{
		World->GetTimerManager().SetTimer(
			HeartbeatTimerHandle,
			this,
			&UBridgeLoomConnection::SendHeartbeat,
			Config.HeartbeatIntervalSec,
			true);
	}

	UE_LOG(LogBridgeLoom, Log, TEXT("Connected to Loom server (session active)"));
}

void UBridgeLoomConnection::DisconnectFromLoom()
{
	if (ConnectionState == ELoomConnectionState::Disconnected)
	{
		return;
	}

	UE_LOG(LogBridgeLoom, Log, TEXT("Disconnecting from Loom server"));

	// Cancel timers
	if (UWorld* World = GetGameInstance() ? GetGameInstance()->GetWorld() : nullptr)
	{
		World->GetTimerManager().ClearTimer(HeartbeatTimerHandle);
		World->GetTimerManager().ClearTimer(ReconnectTimerHandle);
	}

	// TODO(Phase 8): Close gRPC stream and channel gracefully
	// GrpcState->GameStream->WritesDone();
	// GrpcState->Channel.reset();

	SetConnectionState(ELoomConnectionState::Disconnected);
}

void UBridgeLoomConnection::SetConnectionState(ELoomConnectionState NewState)
{
	if (ConnectionState != NewState)
	{
		const ELoomConnectionState OldState = ConnectionState;
		ConnectionState = NewState;

		UE_LOG(LogBridgeLoom, Log,
			TEXT("Connection state: %d -> %d"),
			static_cast<int32>(OldState),
			static_cast<int32>(NewState));

		OnConnectionStateChanged.Broadcast(NewState);
	}
}

// ── Player Input ────────────────────────────────────────────────

void UBridgeLoomConnection::SendPlayerInput(
	const FString& PlayerId,
	FVector MoveDirection,
	float Yaw,
	float Pitch,
	uint32 ActionFlags)
{
	if (!IsConnected())
	{
		return;
	}

	++InputSequence;
	Telemetry.MessagesSent++;

	// TODO(Phase 8): Build FlatBuffer PlayerInput and send via gRPC stream
	// flatbuffers::FlatBufferBuilder Builder(256);
	// auto EntityIdOffset = Builder.CreateString(TCHAR_TO_UTF8(*PlayerId));
	// auto Input = LoomBridge::CreatePlayerInput(Builder,
	//     EntityIdOffset,
	//     MoveDirection.X, MoveDirection.Y, MoveDirection.Z,
	//     Yaw, Pitch, ActionFlags, InputSequence);
	// Builder.Finish(Input);
	// GrpcState->GameStream->Write(BuildClientMessage(Builder));
}

// ── Heartbeat & Reconnect ───────────────────────────────────────

void UBridgeLoomConnection::SendHeartbeat()
{
	if (!IsConnected())
	{
		return;
	}

	// TODO(Phase 8): Send health check via gRPC
	// Measure RTT from response
	UE_LOG(LogBridgeLoom, Verbose, TEXT("Heartbeat sent (seq=%d)"), InputSequence);
}

void UBridgeLoomConnection::AttemptReconnect()
{
	if (ReconnectAttempts >= CurrentConfig.MaxReconnectAttempts)
	{
		UE_LOG(LogBridgeLoom, Error,
			TEXT("Max reconnect attempts (%d) exhausted"),
			CurrentConfig.MaxReconnectAttempts);
		SetConnectionState(ELoomConnectionState::Error);
		return;
	}

	++ReconnectAttempts;
	Telemetry.ReconnectCount++;
	SetConnectionState(ELoomConnectionState::Reconnecting);

	UE_LOG(LogBridgeLoom, Warning,
		TEXT("Reconnecting to Loom (attempt %d/%d)"),
		ReconnectAttempts, CurrentConfig.MaxReconnectAttempts);

	// Exponential backoff with jitter
	const float BackoffSec = CurrentConfig.ReconnectDelaySec *
		FMath::Pow(1.5f, static_cast<float>(ReconnectAttempts - 1));
	const float Jitter = FMath::FRandRange(0.0f, BackoffSec * 0.2f);

	if (UWorld* World = GetGameInstance()->GetWorld())
	{
		World->GetTimerManager().SetTimer(
			ReconnectTimerHandle,
			[this]() { ConnectToLoom(CurrentConfig); },
			BackoffSec + Jitter,
			false);
	}
}
