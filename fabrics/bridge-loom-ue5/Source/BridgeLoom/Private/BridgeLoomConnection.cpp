// Copyright Project Loom. All Rights Reserved.

#include "BridgeLoomConnection.h"
#include "Engine/World.h"
#include "TimerManager.h"
#include "Async/Async.h"

#include "grpcpp/grpcpp.h"
#include "grpcpp/channel.h"
#include "grpcpp/create_channel.h"
#include "grpcpp/security/credentials.h"
#include "loom_bridge.grpc.pb.h"
#include "flatbuffers/flatbuffers.h"

DEFINE_LOG_CATEGORY(LogBridgeLoom);

// ── gRPC State (pimpl) ─────────────────────────────────────────

struct UBridgeLoomConnection::FGrpcState
{
	std::shared_ptr<grpc::Channel> Channel;
	std::unique_ptr<LoomBridge::BridgeLoom::Stub> Stub;
	grpc::ClientContext StreamContext;
	std::unique_ptr<grpc::ClientReaderWriter<
		LoomBridge::ClientMessage,
		LoomBridge::ServerMessage>> GameStream;
	std::atomic<bool> bStreamActive{false};
	FString AssignedClientId;
};

// ── Lifecycle ───────────────────────────────────────────────────

void UBridgeLoomConnection::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);
	GrpcState = MakeUnique<FGrpcState>();
	UE_LOG(LogBridgeLoom, Log,
		TEXT("BridgeLoomConnection initialized (GameInstance scope)"));
}

void UBridgeLoomConnection::Deinitialize()
{
	DisconnectFromLoom();
	GrpcState.Reset();
	Super::Deinitialize();
}

bool UBridgeLoomConnection::ShouldCreateSubsystem(UObject* Outer) const
{
	return true;
}

FString UBridgeLoomConnection::GetAssignedClientId() const
{
	if (GrpcState)
	{
		return GrpcState->AssignedClientId;
	}
	return FString();
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

	// Create gRPC channel with appropriate credentials
	std::shared_ptr<grpc::ChannelCredentials> ChannelCreds;
	if (Config.bUseTLS)
	{
		ChannelCreds = grpc::SslCredentials(grpc::SslCredentialsOptions());
	}
	else
	{
		ChannelCreds = grpc::InsecureChannelCredentials();
	}

	GrpcState->Channel = grpc::CreateChannel(
		TCHAR_TO_UTF8(*Target), ChannelCreds);
	GrpcState->Stub = LoomBridge::BridgeLoom::NewStub(GrpcState->Channel);

	// Negotiate capabilities
	SetConnectionState(ELoomConnectionState::Negotiating);

	grpc::ClientContext NegotiateCtx;
	NegotiateCtx.set_deadline(
		std::chrono::system_clock::now() + std::chrono::seconds(10));

	LoomBridge::NegotiateRequest NegReq;
	NegReq.set_fabric_id("ue5-client");
	NegReq.set_fabric_name("Unreal Engine 5.5");
	NegReq.set_current_tier("high");
	NegReq.mutable_max_resolution()->set_width(3840);
	NegReq.mutable_max_resolution()->set_height(2160);
	NegReq.set_max_refresh_rate(120);
	NegReq.set_max_visible_entities(10000);
	NegReq.set_supports_weave_zone_overlap(true);
	NegReq.set_supports_pixel_streaming(true);
	NegReq.set_preferred_state_update_rate(30);

	LoomBridge::NegotiateResponse NegResp;
	grpc::Status NegStatus = GrpcState->Stub->Negotiate(
		&NegotiateCtx, NegReq, &NegResp);

	if (!NegStatus.ok() || !NegResp.accepted())
	{
		UE_LOG(LogBridgeLoom, Error,
			TEXT("Negotiate failed: %s"),
			UTF8_TO_TCHAR(NegStatus.error_message().c_str()));
		SetConnectionState(ELoomConnectionState::Error);
		AttemptReconnect();
		return;
	}

	GrpcState->AssignedClientId = UTF8_TO_TCHAR(
		NegResp.assigned_client_id().c_str());
	UE_LOG(LogBridgeLoom, Log,
		TEXT("Negotiated with server v%s, assigned client ID: %s"),
		UTF8_TO_TCHAR(NegResp.server_version().c_str()),
		*GrpcState->AssignedClientId);

	// Open bidirectional GameStream
	GrpcState->StreamContext = grpc::ClientContext();
	GrpcState->GameStream = GrpcState->Stub->GameStream(
		&GrpcState->StreamContext);
	GrpcState->bStreamActive.store(true);

	SetConnectionState(ELoomConnectionState::Connected);

	// Start background reader thread for incoming server messages
	AsyncTask(ENamedThreads::AnyBackgroundThreadNormalTask,
		[this]()
		{
			LoomBridge::ServerMessage ServerMsg;
			while (GrpcState->bStreamActive.load() &&
			       GrpcState->GameStream->Read(&ServerMsg))
			{
				Telemetry.MessagesReceived++;
				Telemetry.BytesReceived += ServerMsg.ByteSizeLong();

				const FString MsgType = UTF8_TO_TCHAR(
					ServerMsg.type().c_str());

				// Dispatch to game thread
				AsyncTask(ENamedThreads::GameThread,
					[this, MsgType, ServerMsg]()
					{
						ProcessServerMessage(MsgType, ServerMsg);
					});
			}
		});

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

	UE_LOG(LogBridgeLoom, Log,
		TEXT("Connected to Loom server (bidirectional stream active)"));
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

	// Close gRPC stream and channel gracefully
	GrpcState->bStreamActive.store(false);
	if (GrpcState->GameStream)
	{
		GrpcState->GameStream->WritesDone();
		GrpcState->GameStream->Finish();
		GrpcState->GameStream.reset();
	}
	GrpcState->Stub.reset();
	GrpcState->Channel.reset();

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

// ── Server Message Processing ───────────────────────────────────

void UBridgeLoomConnection::ProcessServerMessage(
	const FString& MsgType,
	const LoomBridge::ServerMessage& Msg)
{
	if (MsgType == TEXT("entity-spawn"))
	{
		const FString EntityId = UTF8_TO_TCHAR(Msg.entity_id().c_str());
		const FString Archetype = UTF8_TO_TCHAR(Msg.archetype().c_str());
		OnEntitySpawned.Broadcast(EntityId, Archetype);
	}
	else if (MsgType == TEXT("entity-despawn"))
	{
		const FString EntityId = UTF8_TO_TCHAR(Msg.entity_id().c_str());
		OnEntityDespawned.Broadcast(EntityId);
	}
	else if (MsgType == TEXT("world-preload"))
	{
		const FString WorldId = UTF8_TO_TCHAR(Msg.world_id().c_str());
		OnWorldPreload.Broadcast(WorldId);
	}
	else if (MsgType == TEXT("entity-snapshot"))
	{
		// Entity snapshots are routed to BridgeLoomStreamProcessor
		// for batch processing on the game thread within frame budget.
	}
	else if (MsgType == TEXT("heartbeat-ack"))
	{
		const double NowSec = FPlatformTime::Seconds();
		Telemetry.RoundTripTimeMs =
			static_cast<float>((NowSec - LastHeartbeatSentSec) * 1000.0);
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
	if (!IsConnected() || !GrpcState->GameStream)
	{
		return;
	}

	++InputSequence;
	Telemetry.MessagesSent++;

	// Build protobuf PlayerInput and send via bidirectional stream
	LoomBridge::ClientMessage ClientMsg;
	ClientMsg.set_type("player-input");
	ClientMsg.set_sequence_number(InputSequence);
	ClientMsg.set_timestamp(FPlatformTime::Seconds() * 1000000.0);

	// Encode player input as JSON payload (MessagePack on hot path later)
	const FString PayloadJson = FString::Printf(
		TEXT("{\"entityId\":\"%s\",\"dx\":%.4f,\"dy\":%.4f,\"dz\":%.4f,"
		     "\"yaw\":%.4f,\"pitch\":%.4f,\"actionFlags\":%u,\"seq\":%u}"),
		*PlayerId,
		MoveDirection.X, MoveDirection.Y, MoveDirection.Z,
		Yaw, Pitch, ActionFlags, InputSequence);

	ClientMsg.set_payload(TCHAR_TO_UTF8(*PayloadJson));

	const int64 ByteSize = ClientMsg.ByteSizeLong();
	Telemetry.BytesSent += ByteSize;

	GrpcState->GameStream->Write(ClientMsg);
}

// ── Heartbeat & Reconnect ───────────────────────────────────────

void UBridgeLoomConnection::SendHeartbeat()
{
	if (!IsConnected() || !GrpcState->GameStream)
	{
		return;
	}

	LastHeartbeatSentSec = FPlatformTime::Seconds();

	LoomBridge::ClientMessage HeartbeatMsg;
	HeartbeatMsg.set_type("heartbeat");
	HeartbeatMsg.set_sequence_number(InputSequence);
	HeartbeatMsg.set_timestamp(LastHeartbeatSentSec * 1000000.0);

	Telemetry.MessagesSent++;
	GrpcState->GameStream->Write(HeartbeatMsg);

	UE_LOG(LogBridgeLoom, Verbose,
		TEXT("Heartbeat sent (seq=%d, RTT=%.1fms)"),
		InputSequence, Telemetry.RoundTripTimeMs);
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
