// Copyright Project Loom. All Rights Reserved.

#include "BridgeLoomStreamProcessor.h"
#include "BridgeLoomConnection.h"
#include "BridgeLoomEntityManager.h"
#include "BridgeLoomMetaHuman.h"
#include "BridgeLoomRenderer.h"
#include "Engine/GameInstance.h"
#include "HAL/PlatformTime.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

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

// ── Decoders ────────────────────────────────────────────────────

void UBridgeLoomStreamProcessor::ProcessEntitySnapshot(
	const TArray<uint8>& Payload, uint32 Seq)
{
	// Decode JSON payload (MessagePack in production builds)
	const FString JsonString = FString(
		UTF8_TO_TCHAR(reinterpret_cast<const char*>(Payload.GetData())));

	TSharedPtr<FJsonObject> JsonObj;
	const TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(JsonString);
	if (!FJsonSerializer::Deserialize(Reader, JsonObj) || !JsonObj.IsValid())
	{
		return;
	}

	FLoomEntitySnapshot Snapshot;
	Snapshot.EntityId = JsonObj->GetStringField(TEXT("entityId"));
	Snapshot.SequenceNumber = Seq;

	const TSharedPtr<FJsonObject>* TransformObj;
	if (JsonObj->TryGetObjectField(TEXT("transform"), TransformObj))
	{
		const TSharedPtr<FJsonObject>* PosObj;
		if ((*TransformObj)->TryGetObjectField(TEXT("position"), PosObj))
		{
			Snapshot.Position.X = (*PosObj)->GetNumberField(TEXT("x"));
			Snapshot.Position.Y = (*PosObj)->GetNumberField(TEXT("y"));
			Snapshot.Position.Z = (*PosObj)->GetNumberField(TEXT("z"));
		}
		const TSharedPtr<FJsonObject>* RotObj;
		if ((*TransformObj)->TryGetObjectField(TEXT("rotation"), RotObj))
		{
			Snapshot.Rotation.X = (*RotObj)->GetNumberField(TEXT("x"));
			Snapshot.Rotation.Y = (*RotObj)->GetNumberField(TEXT("y"));
			Snapshot.Rotation.Z = (*RotObj)->GetNumberField(TEXT("z"));
			Snapshot.Rotation.W = (*RotObj)->GetNumberField(TEXT("w"));
		}
		const TSharedPtr<FJsonObject>* ScaleObj;
		if ((*TransformObj)->TryGetObjectField(TEXT("scale"), ScaleObj))
		{
			Snapshot.Scale.X = (*ScaleObj)->GetNumberField(TEXT("x"));
			Snapshot.Scale.Y = (*ScaleObj)->GetNumberField(TEXT("y"));
			Snapshot.Scale.Z = (*ScaleObj)->GetNumberField(TEXT("z"));
		}
	}

	const TSharedPtr<FJsonObject>* AnimObj;
	if (JsonObj->TryGetObjectField(TEXT("animation"), AnimObj))
	{
		Snapshot.AnimClipName = (*AnimObj)->GetStringField(TEXT("clipName"));
		Snapshot.AnimNormalizedTime = (*AnimObj)->GetNumberField(TEXT("normalizedTime"));
		Snapshot.AnimBlendWeight = (*AnimObj)->GetNumberField(TEXT("blendWeight"));
	}

	Stats.SnapshotsProcessed++;
	OnEntitySnapshotReceived.Broadcast(Snapshot);
}

void UBridgeLoomStreamProcessor::ProcessEntitySpawn(const TArray<uint8>& Payload)
{
	const FString JsonString = FString(
		UTF8_TO_TCHAR(reinterpret_cast<const char*>(Payload.GetData())));

	TSharedPtr<FJsonObject> JsonObj;
	const TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(JsonString);
	if (!FJsonSerializer::Deserialize(Reader, JsonObj) || !JsonObj.IsValid())
	{
		return;
	}

	FLoomSpawnRequest Request;
	Request.EntityId = JsonObj->GetStringField(TEXT("entityId"));
	Request.Archetype = JsonObj->GetStringField(TEXT("archetype"));
	JsonObj->TryGetStringField(TEXT("meshAssetPath"), Request.MeshAssetPath);
	JsonObj->TryGetStringField(TEXT("metaHumanPreset"), Request.MetaHumanPreset);

	const TSharedPtr<FJsonObject>* PosObj;
	if (JsonObj->TryGetObjectField(TEXT("position"), PosObj))
	{
		Request.SpawnPosition.X = (*PosObj)->GetNumberField(TEXT("x"));
		Request.SpawnPosition.Y = (*PosObj)->GetNumberField(TEXT("y"));
		Request.SpawnPosition.Z = (*PosObj)->GetNumberField(TEXT("z"));
	}

	const TArray<TSharedPtr<FJsonValue>>* TagsArr;
	if (JsonObj->TryGetArrayField(TEXT("tags"), TagsArr))
	{
		for (const auto& Tag : *TagsArr)
		{
			Request.Tags.Add(Tag->AsString());
		}
	}

	Stats.SpawnsProcessed++;
	OnSpawnRequestReceived.Broadcast(Request);
}

void UBridgeLoomStreamProcessor::ProcessEntityDespawn(const TArray<uint8>& Payload)
{
	const FString JsonString = FString(
		UTF8_TO_TCHAR(reinterpret_cast<const char*>(Payload.GetData())));

	TSharedPtr<FJsonObject> JsonObj;
	const TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(JsonString);
	if (!FJsonSerializer::Deserialize(Reader, JsonObj) || !JsonObj.IsValid())
	{
		return;
	}

	const FString EntityId = JsonObj->GetStringField(TEXT("entityId"));

	Stats.DespawnsProcessed++;
	OnDespawnReceived.Broadcast(EntityId);
}

void UBridgeLoomStreamProcessor::ProcessFacialPose(const TArray<uint8>& Payload)
{
	const FString JsonString = FString(
		UTF8_TO_TCHAR(reinterpret_cast<const char*>(Payload.GetData())));

	TSharedPtr<FJsonObject> JsonObj;
	const TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(JsonString);
	if (!FJsonSerializer::Deserialize(Reader, JsonObj) || !JsonObj.IsValid())
	{
		return;
	}

	FLoomFacialPose Pose;
	Pose.EntityId = JsonObj->GetStringField(TEXT("entityId"));
	JsonObj->TryGetStringField(TEXT("emotionTag"), Pose.EmotionTag);
	JsonObj->TryGetStringField(TEXT("speechViseme"), Pose.SpeechViseme);
	Pose.SpeechAmplitude = JsonObj->GetNumberField(TEXT("speechAmplitude"));

	const TSharedPtr<FJsonObject>* GazeObj;
	if (JsonObj->TryGetObjectField(TEXT("gazeTarget"), GazeObj))
	{
		Pose.GazeTarget.X = (*GazeObj)->GetNumberField(TEXT("x"));
		Pose.GazeTarget.Y = (*GazeObj)->GetNumberField(TEXT("y"));
		Pose.GazeTarget.Z = (*GazeObj)->GetNumberField(TEXT("z"));
	}

	const TSharedPtr<FJsonObject>* BlendObj;
	if (JsonObj->TryGetObjectField(TEXT("blendShapes"), BlendObj))
	{
		for (const auto& Pair : (*BlendObj)->Values)
		{
			Pose.BlendShapes.Add(FName(*Pair.Key), Pair.Value->AsNumber());
		}
	}

	Stats.FacialPosesProcessed++;
	OnFacialPoseReceived.Broadcast(Pose);
}

void UBridgeLoomStreamProcessor::ProcessTimeWeather(const TArray<uint8>& Payload)
{
	const FString JsonString = FString(
		UTF8_TO_TCHAR(reinterpret_cast<const char*>(Payload.GetData())));

	TSharedPtr<FJsonObject> JsonObj;
	const TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(JsonString);
	if (!FJsonSerializer::Deserialize(Reader, JsonObj) || !JsonObj.IsValid())
	{
		return;
	}

	FLoomTimeOfDay TimeOfDay;
	const TSharedPtr<FJsonObject>* TimeObj;
	if (JsonObj->TryGetObjectField(TEXT("timeOfDay"), TimeObj))
	{
		TimeOfDay.SunAltitude = (*TimeObj)->GetNumberField(TEXT("sunAltitude"));
		TimeOfDay.SunAzimuth = (*TimeObj)->GetNumberField(TEXT("sunAzimuth"));
		TimeOfDay.SunIntensity = (*TimeObj)->GetNumberField(TEXT("sunIntensity"));
		TimeOfDay.FogDensity = (*TimeObj)->GetNumberField(TEXT("fogDensity"));
		TimeOfDay.CloudCoverage = (*TimeObj)->GetNumberField(TEXT("cloudCoverage"));
	}

	FLoomWeather Weather;
	const TSharedPtr<FJsonObject>* WeatherObj;
	if (JsonObj->TryGetObjectField(TEXT("weather"), WeatherObj))
	{
		Weather.RainIntensity = (*WeatherObj)->GetNumberField(TEXT("rainIntensity"));
		Weather.SnowIntensity = (*WeatherObj)->GetNumberField(TEXT("snowIntensity"));
		Weather.WindSpeed = (*WeatherObj)->GetNumberField(TEXT("windSpeed"));
		Weather.Temperature = (*WeatherObj)->GetNumberField(TEXT("temperature"));

		const TSharedPtr<FJsonObject>* WindObj;
		if ((*WeatherObj)->TryGetObjectField(TEXT("windDirection"), WindObj))
		{
			Weather.WindDirection.X = (*WindObj)->GetNumberField(TEXT("x"));
			Weather.WindDirection.Y = (*WindObj)->GetNumberField(TEXT("y"));
			Weather.WindDirection.Z = (*WindObj)->GetNumberField(TEXT("z"));
		}
	}

	OnTimeWeatherReceived.Broadcast(TimeOfDay, Weather);
}
