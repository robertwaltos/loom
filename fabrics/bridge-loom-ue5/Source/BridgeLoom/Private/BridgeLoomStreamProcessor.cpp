// Copyright Project Loom. All Rights Reserved.

#include "BridgeLoomStreamProcessor.h"
#include "BridgeLoomConnection.h"
#include "BridgeLoomEntityManager.h"
#include "BridgeLoomMetaHuman.h"
#include "BridgeLoomRenderer.h"
#include "Engine/GameInstance.h"
#include "HAL/PlatformTime.h"
#include "loom_bridge_generated.h"

// ── Lifecycle ───────────────────────────────────────────────────

void UBridgeLoomStreamProcessor::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);
	UE_LOG(LogBridgeLoom, Log,
		TEXT("BridgeLoomStreamProcessor initialized"));
}

void UBridgeLoomStreamProcessor::Deinitialize()
{
	FScopeLock Lock(&QueueLock);
	MessageQueue.Empty();
	Super::Deinitialize();
}

// ── Message Ingestion (thread-safe) ─────────────────────────────

void UBridgeLoomStreamProcessor::EnqueueMessage(
	ELoomServerMessageType Type,
	TArray<uint8>&& Payload,
	uint32 SequenceNumber)
{
	FScopeLock Lock(&QueueLock);
	FPendingMessage Msg;
	Msg.Type = Type;
	Msg.Payload = MoveTemp(Payload);
	Msg.SequenceNumber = SequenceNumber;
	MessageQueue.Add(MoveTemp(Msg));
}

// ── Per-Frame Processing ────────────────────────────────────────

void UBridgeLoomStreamProcessor::ProcessPendingMessages(int32 MaxMessagesPerFrame)
{
	const double StartTime = FPlatformTime::Seconds();
	constexpr double BUDGET_SECONDS = 0.0005; // 0.5ms budget

	// Swap queue to avoid holding lock during processing
	TArray<FPendingMessage> LocalQueue;
	{
		FScopeLock Lock(&QueueLock);
		if (MessageQueue.Num() == 0) return;
		const int32 Count = FMath::Min(MessageQueue.Num(), MaxMessagesPerFrame);
		LocalQueue.Reserve(Count);
		for (int32 i = 0; i < Count; ++i)
		{
			LocalQueue.Add(MoveTemp(MessageQueue[i]));
		}
		MessageQueue.RemoveAt(0, Count, false);
		Stats.PendingMessages = MessageQueue.Num();
	}

	// Process in priority order: spawns → despawns → snapshots → poses → weather
	// Sort by type to ensure correct processing order
	LocalQueue.Sort([](const FPendingMessage& A, const FPendingMessage& B)
	{
		return static_cast<uint8>(A.Type) < static_cast<uint8>(B.Type);
	});

	for (const FPendingMessage& Msg : LocalQueue)
	{
		// Check budget
		if (FPlatformTime::Seconds() - StartTime > BUDGET_SECONDS)
		{
			// Put unprocessed messages back
			FScopeLock Lock(&QueueLock);
			// Remaining messages stay for next frame
			break;
		}

		switch (Msg.Type)
		{
		case ELoomServerMessageType::EntitySnapshot:
			ProcessEntitySnapshot(Msg.Payload, Msg.SequenceNumber);
			break;

		case ELoomServerMessageType::EntitySpawn:
			ProcessEntitySpawn(Msg.Payload);
			break;

		case ELoomServerMessageType::EntityDespawn:
			ProcessEntityDespawn(Msg.Payload);
			break;

		case ELoomServerMessageType::FacialPose:
			ProcessFacialPose(Msg.Payload);
			break;

		case ELoomServerMessageType::TimeWeather:
			ProcessTimeWeather(Msg.Payload);
			break;

		case ELoomServerMessageType::WorldPreload:
			// Handled by WorldStreamer subsystem directly
			break;

		case ELoomServerMessageType::WorldUnload:
			// Handled by WorldStreamer subsystem directly
			break;

		case ELoomServerMessageType::HeartbeatAck:
			// RTT measurement handled in Connection subsystem
			break;
		}
	}

	Stats.LastProcessingTimeMs =
		static_cast<float>((FPlatformTime::Seconds() - StartTime) * 1000.0);
}

// ── Decoders (FlatBuffers zero-copy) ────────────────────────────

void UBridgeLoomStreamProcessor::ProcessEntitySnapshot(
	const TArray<uint8>& Payload, uint32 Seq)
{
	auto* FB = LoomBridge::GetEntitySnapshot(Payload.GetData());
	if (!FB || !FB->entity_id())
	{
		return;
	}

	FLoomEntitySnapshot Snapshot;
	Snapshot.EntityId = UTF8_TO_TCHAR(FB->entity_id()->c_str());
	Snapshot.SequenceNumber = Seq;

	if (const auto* Tf = FB->transform())
	{
		const auto& Pos = Tf->position();
		Snapshot.Position = FVector(Pos.x(), Pos.y(), Pos.z());

		const auto& Rot = Tf->rotation();
		Snapshot.Rotation = FQuat(Rot.x(), Rot.y(), Rot.z(), Rot.w());

		const auto& Sc = Tf->scale();
		Snapshot.Scale = FVector(Sc.x(), Sc.y(), Sc.z());
	}

	if (FB->animation_clip())
	{
		Snapshot.AnimClipName = UTF8_TO_TCHAR(FB->animation_clip()->c_str());
	}
	Snapshot.AnimNormalizedTime = FB->animation_time();
	Snapshot.AnimBlendWeight = FB->animation_blend();

	Stats.SnapshotsProcessed++;
	OnEntitySnapshotReceived.Broadcast(Snapshot);
}

void UBridgeLoomStreamProcessor::ProcessEntitySpawn(const TArray<uint8>& Payload)
{
	auto* FB = LoomBridge::GetEntitySpawn(Payload.GetData());
	if (!FB || !FB->entity_id())
	{
		return;
	}

	FLoomSpawnRequest Request;
	Request.EntityId = UTF8_TO_TCHAR(FB->entity_id()->c_str());

	if (FB->archetype())
	{
		Request.Archetype = UTF8_TO_TCHAR(FB->archetype()->c_str());
	}
	if (FB->metahuman_preset())
	{
		Request.MetaHumanPreset = UTF8_TO_TCHAR(FB->metahuman_preset()->c_str());
	}

	// Extract spawn position from initial_state
	if (const auto* InitState = FB->initial_state())
	{
		if (InitState->mesh_hash())
		{
			Request.MeshAssetPath = UTF8_TO_TCHAR(InitState->mesh_hash()->c_str());
		}
		if (const auto* Tf = InitState->transform())
		{
			const auto& Pos = Tf->position();
			Request.SpawnPosition = FVector(Pos.x(), Pos.y(), Pos.z());

			const auto& Rot = Tf->rotation();
			Request.SpawnRotation = FQuat(Rot.x(), Rot.y(), Rot.z(), Rot.w());
		}
	}

	Stats.SpawnsProcessed++;
	OnSpawnRequestReceived.Broadcast(Request);
}

void UBridgeLoomStreamProcessor::ProcessEntityDespawn(const TArray<uint8>& Payload)
{
	auto* FB = LoomBridge::GetEntityDespawn(Payload.GetData());
	if (!FB || !FB->entity_id())
	{
		return;
	}

	const FString EntityId = UTF8_TO_TCHAR(FB->entity_id()->c_str());

	Stats.DespawnsProcessed++;
	OnDespawnReceived.Broadcast(EntityId);
}

void UBridgeLoomStreamProcessor::ProcessFacialPose(const TArray<uint8>& Payload)
{
	auto* FB = LoomBridge::GetFacialPose(Payload.GetData());
	if (!FB || !FB->entity_id())
	{
		return;
	}

	FLoomFacialPose Pose;
	Pose.EntityId = UTF8_TO_TCHAR(FB->entity_id()->c_str());

	if (FB->emotion_tag())
	{
		Pose.EmotionTag = UTF8_TO_TCHAR(FB->emotion_tag()->c_str());
	}
	if (FB->speech_viseme())
	{
		Pose.SpeechViseme = UTF8_TO_TCHAR(FB->speech_viseme()->c_str());
	}
	Pose.SpeechAmplitude = FB->speech_amplitude();

	// ARKit blend shapes
	if (const auto* Shapes = FB->blend_shapes())
	{
		for (flatbuffers::uoffset_t i = 0; i < Shapes->size(); ++i)
		{
			const auto* Shape = Shapes->Get(i);
			if (Shape && Shape->name())
			{
				Pose.BlendShapes.Add(
					FName(UTF8_TO_TCHAR(Shape->name()->c_str())),
					Shape->weight());
			}
		}
	}

	Stats.FacialPosesProcessed++;
	OnFacialPoseReceived.Broadcast(Pose);
}

void UBridgeLoomStreamProcessor::ProcessTimeWeather(const TArray<uint8>& Payload)
{
	// TimeWeather is dispatched for both time_of_day and weather payloads.
	// Detect type by attempting FlatBuffer verification.
	FLoomTimeOfDay TimeOfDay;
	FLoomWeather Weather;

	// Try TimeOfDayUpdate first
	if (auto* TimeFB = LoomBridge::GetTimeOfDayUpdate(Payload.GetData()))
	{
		TimeOfDay.SunAltitude = TimeFB->sun_altitude();
		TimeOfDay.SunAzimuth = TimeFB->sun_azimuth();
		TimeOfDay.SunIntensity = TimeFB->sun_intensity();
		TimeOfDay.SunColor = FLinearColor(
			TimeFB->sun_color_r(), TimeFB->sun_color_g(), TimeFB->sun_color_b());
		TimeOfDay.FogDensity = TimeFB->fog_density();
		TimeOfDay.CloudCoverage = TimeFB->cloud_coverage();
	}

	// Try WeatherUpdate
	if (auto* WeatherFB = LoomBridge::GetWeatherUpdate(Payload.GetData()))
	{
		Weather.RainIntensity = WeatherFB->rain_intensity();
		Weather.SnowIntensity = WeatherFB->snow_intensity();
		Weather.WindSpeed = WeatherFB->wind_speed();
		Weather.Temperature = WeatherFB->temperature();
		Weather.WindDirection = FVector(
			FMath::Cos(FMath::DegreesToRadians(WeatherFB->wind_direction())),
			FMath::Sin(FMath::DegreesToRadians(WeatherFB->wind_direction())),
			0.0f);
	}

	OnTimeWeatherReceived.Broadcast(TimeOfDay, Weather);
}
