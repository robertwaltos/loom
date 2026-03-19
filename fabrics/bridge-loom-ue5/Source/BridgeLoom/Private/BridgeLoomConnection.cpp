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
#include "loom_bridge_generated.h"
#include "flatbuffers/flatbuffers.h"
#include "BridgeLoomStreamProcessor.h"

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
	NegReq.set_fabric_name("Unreal Engine 5.7");
	NegReq.set_rendering_tier("high");
	NegReq.set_max_resolution_width(3840);
	NegReq.set_max_resolution_height(2160);
	NegReq.set_max_refresh_rate(120);
	NegReq.set_max_visible_entities(10000);
	NegReq.set_supports_weave_zone(true);
	NegReq.set_supports_pixel_streaming(true);
	NegReq.set_preferred_update_rate_hz(30);
	NegReq.set_supports_metahuman(true);
	NegReq.set_max_metahuman_instances(5);

	// Populate rendering features
	auto* Features = NegReq.mutable_features();
	Features->set_nanite_geometry(true);
	Features->set_hardware_ray_tracing(true);
	Features->set_global_illumination(true);
	Features->set_virtual_shadow_maps(true);
	Features->set_volumetric_clouds(true);
	Features->set_hair_simulation(true);
	Features->set_cloth_simulation(true);
	Features->set_facial_animation(true);
	Features->set_metasound_audio(true);
	Features->set_mass_entity(true);
	Features->set_chaos_physics(true);

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
		NegResp.session_id().c_str());
	UE_LOG(LogBridgeLoom, Log,
		TEXT("Negotiated: session=%s, update_rate=%dHz, entity_budget=%d"),
		*GrpcState->AssignedClientId,
		NegResp.assigned_update_rate_hz(),
		NegResp.max_entities_budget());

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

				// Dispatch to game thread via payload_case routing
				AsyncTask(ENamedThreads::GameThread,
					[this, ServerMsg]()
					{
						ProcessServerMessage(ServerMsg);
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
	const LoomBridge::ServerMessage& Msg)
{
	auto* StreamProc = GetGameInstance()->GetSubsystem<UBridgeLoomStreamProcessor>();

	// Helper: extract FlatBuffer bytes from proto oneof payload → TArray<uint8>
	auto ExtractPayload = [](const std::string& PayloadBytes) -> TArray<uint8>
	{
		TArray<uint8> Arr;
		Arr.Append(reinterpret_cast<const uint8*>(PayloadBytes.data()),
			PayloadBytes.size());
		return Arr;
	};

	switch (Msg.payload_case())
	{
	case LoomBridge::ServerMessage::kEntitySnapshot:
		if (StreamProc)
		{
			StreamProc->EnqueueMessage(ELoomServerMessageType::EntitySnapshot,
				ExtractPayload(Msg.entity_snapshot()), Msg.sequence());
		}
		break;

	case LoomBridge::ServerMessage::kEntitySpawn:
		if (StreamProc)
		{
			StreamProc->EnqueueMessage(ELoomServerMessageType::EntitySpawn,
				ExtractPayload(Msg.entity_spawn()), Msg.sequence());
		}
		// Fire Connection-level delegate for backward compat
		{
			auto* SpawnFB = LoomBridge::GetEntitySpawn(
				Msg.entity_spawn().data());
			if (SpawnFB && SpawnFB->entity_id() && SpawnFB->archetype())
			{
				OnEntitySpawned.Broadcast(
					UTF8_TO_TCHAR(SpawnFB->entity_id()->c_str()),
					UTF8_TO_TCHAR(SpawnFB->archetype()->c_str()));
			}
		}
		break;

	case LoomBridge::ServerMessage::kEntityDespawn:
		if (StreamProc)
		{
			StreamProc->EnqueueMessage(ELoomServerMessageType::EntityDespawn,
				ExtractPayload(Msg.entity_despawn()), Msg.sequence());
		}
		{
			auto* DespawnFB = LoomBridge::GetEntityDespawn(
				Msg.entity_despawn().data());
			if (DespawnFB && DespawnFB->entity_id())
			{
				OnEntityDespawned.Broadcast(
					UTF8_TO_TCHAR(DespawnFB->entity_id()->c_str()));
			}
		}
		break;

	case LoomBridge::ServerMessage::kTimeOfDay:
		if (StreamProc)
		{
			StreamProc->EnqueueMessage(ELoomServerMessageType::TimeWeather,
				ExtractPayload(Msg.time_of_day()), Msg.sequence());
		}
		break;

	case LoomBridge::ServerMessage::kWeather:
		if (StreamProc)
		{
			StreamProc->EnqueueMessage(ELoomServerMessageType::TimeWeather,
				ExtractPayload(Msg.weather()), Msg.sequence());
		}
		break;

	case LoomBridge::ServerMessage::kChunkLoad:
		if (StreamProc)
		{
			StreamProc->EnqueueMessage(ELoomServerMessageType::WorldPreload,
				ExtractPayload(Msg.chunk_load()), Msg.sequence());
		}
		break;

	case LoomBridge::ServerMessage::kChunkUnload:
		if (StreamProc)
		{
			StreamProc->EnqueueMessage(ELoomServerMessageType::WorldUnload,
				ExtractPayload(Msg.chunk_unload()), Msg.sequence());
		}
		break;

	case LoomBridge::ServerMessage::kFacialPose:
		if (StreamProc)
		{
			StreamProc->EnqueueMessage(ELoomServerMessageType::FacialPose,
				ExtractPayload(Msg.facial_pose()), Msg.sequence());
		}
		break;

	case LoomBridge::ServerMessage::PAYLOAD_NOT_SET:
		// Heartbeat ack (empty payload)
		{
			const double NowSec = FPlatformTime::Seconds();
			Telemetry.RoundTripTimeMs =
				static_cast<float>((NowSec - LastHeartbeatSentSec) * 1000.0);
		}
		break;
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

	// Build FlatBuffer PlayerInput
	flatbuffers::FlatBufferBuilder FBBuilder(256);
	auto EntityIdOff = FBBuilder.CreateString(TCHAR_TO_UTF8(*PlayerId));
	auto InputOff = LoomBridge::CreatePlayerInput(
		FBBuilder, EntityIdOff,
		MoveDirection.X, MoveDirection.Y, MoveDirection.Z,
		Yaw, Pitch, ActionFlags, InputSequence);
	FBBuilder.Finish(InputOff);

	// Wrap in proto ClientMessage
	LoomBridge::ClientMessage ClientMsg;
	ClientMsg.set_player_input(
		FBBuilder.GetBufferPointer(), FBBuilder.GetSize());
	ClientMsg.set_sequence(InputSequence);
	ClientMsg.set_timestamp_us(
		static_cast<int64_t>(FPlatformTime::Seconds() * 1000000.0));

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
	HeartbeatMsg.set_sequence(InputSequence);
	HeartbeatMsg.set_timestamp_us(
		static_cast<int64_t>(LastHeartbeatSentSec * 1000000.0));

	Telemetry.MessagesSent++;
	GrpcState->GameStream->Write(HeartbeatMsg);

	UE_LOG(LogBridgeLoom, Verbose,
		TEXT("Heartbeat sent (seq=%d, RTT=%.1fms)"),
		InputSequence, Telemetry.RoundTripTimeMs);
}

// ── HealthCheck & WorldCommand RPCs ─────────────────────────────

bool UBridgeLoomConnection::SendHealthCheck()
{
	if (!GrpcState || !GrpcState->Stub)
	{
		return false;
	}

	grpc::ClientContext Ctx;
	Ctx.set_deadline(
		std::chrono::system_clock::now() + std::chrono::seconds(5));

	LoomBridge::HealthCheckRequest Req;
	Req.set_request_id(TCHAR_TO_UTF8(
		*FGuid::NewGuid().ToString()));

	LoomBridge::HealthCheckResponse Resp;
	grpc::Status Status = GrpcState->Stub->HealthCheck(&Ctx, Req, &Resp);

	if (!Status.ok())
	{
		UE_LOG(LogBridgeLoom, Warning,
			TEXT("HealthCheck RPC failed: %s"),
			UTF8_TO_TCHAR(Status.error_message().c_str()));
		return false;
	}

	UE_LOG(LogBridgeLoom, Verbose,
		TEXT("HealthCheck: healthy=%s fps=%.1f frame=%.1fms entities=%d mem=%.0fMB gpu=%.0f%% chunks=%d metahumans=%d"),
		Resp.healthy() ? TEXT("yes") : TEXT("no"),
		Resp.current_fps(),
		Resp.frame_time_ms(),
		Resp.visible_entities(),
		Resp.memory_usage_mb(),
		Resp.gpu_usage_percent(),
		Resp.loaded_chunks(),
		Resp.active_metahumans());

	return Resp.healthy();
}

bool UBridgeLoomConnection::SendWorldCommand(
	const FString& CommandType, const FString& WorldId, float Priority)
{
	if (!GrpcState || !GrpcState->Stub)
	{
		return false;
	}

	grpc::ClientContext Ctx;
	Ctx.set_deadline(
		std::chrono::system_clock::now() + std::chrono::seconds(30));

	LoomBridge::WorldCommandRequest Req;
	Req.set_command_type(TCHAR_TO_UTF8(*CommandType));
	Req.set_world_id(TCHAR_TO_UTF8(*WorldId));
	Req.set_priority(Priority);

	LoomBridge::WorldCommandResponse Resp;
	grpc::Status Status = GrpcState->Stub->WorldCommand(&Ctx, Req, &Resp);

	if (!Status.ok())
	{
		UE_LOG(LogBridgeLoom, Error,
			TEXT("WorldCommand RPC failed: %s"),
			UTF8_TO_TCHAR(Status.error_message().c_str()));
		return false;
	}

	if (!Resp.success())
	{
		UE_LOG(LogBridgeLoom, Warning,
			TEXT("WorldCommand '%s' for world '%s' rejected: %s"),
			*CommandType, *WorldId,
			UTF8_TO_TCHAR(Resp.error_message().c_str()));
		return false;
	}

	UE_LOG(LogBridgeLoom, Log,
		TEXT("WorldCommand '%s' for world '%s' accepted (est. load: %.1fs)"),
		*CommandType, *WorldId, Resp.estimated_load_time_sec());

	// Fire world preload delegate if this is a preload command
	if (CommandType.Equals(TEXT("preload"), ESearchCase::IgnoreCase))
	{
		OnWorldPreload.Broadcast(WorldId);
	}

	return true;
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
