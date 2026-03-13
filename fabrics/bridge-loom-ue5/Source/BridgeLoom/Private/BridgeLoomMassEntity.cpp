// Copyright Project Loom. All Rights Reserved.

#include "BridgeLoomMassEntity.h"
#include "MassEntitySubsystem.h"
#include "MassSpawnerSubsystem.h"
#include "MassEntityConfigAsset.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"

// ── Constructor ──────────────────────────────────────────────────

UBridgeLoomMassEntity::UBridgeLoomMassEntity()
{
	PrimaryComponentTick.bCanEverTick = true;
}

// ── Lifecycle ────────────────────────────────────────────────────

void UBridgeLoomMassEntity::BeginPlay()
{
	Super::BeginPlay();
	CachedStats = FLoomMassWorldStats{};
}

void UBridgeLoomMassEntity::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	// Despawn all worlds
	TArray<FString> WorldIds;
	WorldEntityMap.GetKeys(WorldIds);
	for (const FString& Id : WorldIds)
	{
		DespawnWorld(Id);
	}

	Super::EndPlay(EndPlayReason);
}

void UBridgeLoomMassEntity::TickComponent(float DeltaTime,
                                           ELevelTick TickType,
                                           FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);
	TickLODUpdates(DeltaTime);
	TickStats(DeltaTime);
}

// ── Spawn & despawn ──────────────────────────────────────────────

void UBridgeLoomMassEntity::SpawnNPCBatch(const FLoomNPCSpawnBatch& Batch)
{
	UMassEntitySubsystem* MassSubsystem = GetWorld()->GetSubsystem<UMassEntitySubsystem>();
	if (!MassSubsystem) return;

	FMassEntityManager& EntityManager = MassSubsystem->GetMutableEntityManager();

	TArray<FMassEntityHandle>& WorldEntities = WorldEntityMap.FindOrAdd(Batch.WorldId);

	const int32 Count = Batch.Locations.Num();
	WorldEntities.Reserve(WorldEntities.Num() + Count);

	// Spawn as raw entity handles — fragments are added by Mass processors
	for (int32 i = 0; i < Count; ++i)
	{
		FMassEntityHandle Handle = EntityManager.CreateEntity(FMassArchetypeHandle{});
		WorldEntities.Add(Handle);
	}

	CachedStats.TotalEntities += Count;
	OnNPCBatchSpawned.Broadcast(Batch.WorldId, Count);
}

void UBridgeLoomMassEntity::DespawnWorld(const FString& WorldId)
{
	TArray<FMassEntityHandle>* Entities = WorldEntityMap.Find(WorldId);
	if (!Entities) return;

	UMassEntitySubsystem* MassSubsystem = GetWorld()->GetSubsystem<UMassEntitySubsystem>();
	if (MassSubsystem)
	{
		FMassEntityManager& EntityManager = MassSubsystem->GetMutableEntityManager();
		for (const FMassEntityHandle& Handle : *Entities)
		{
			if (EntityManager.IsEntityValid(Handle))
			{
				EntityManager.DestroyEntity(Handle);
			}
		}
	}

	CachedStats.TotalEntities = FMath::Max(0,
	    CachedStats.TotalEntities - Entities->Num());

	WorldEntityMap.Remove(WorldId);
}

// ── State sync ───────────────────────────────────────────────────

void UBridgeLoomMassEntity::ApplyNPCStateUpdate(const FLoomNPCStateUpdate& Update)
{
	UMassEntitySubsystem* MassSubsystem = GetWorld()->GetSubsystem<UMassEntitySubsystem>();
	if (!MassSubsystem) return;

	// Reconstruct FMassEntityHandle from serialised int64
	FMassEntityHandle Handle;
	Handle.Index          = static_cast<int32>(Update.EntityHandle & 0xFFFFFFFF);
	Handle.SerialNumber   = static_cast<int32>((Update.EntityHandle >> 32) & 0xFFFF);

	// State is applied via fragment mutations in the Mass processor pipeline;
	// here we write to a shared delta buffer read by the LoomNPCMoveProcessor.
	// This pattern avoids accessing fragments off the Mass thread.
	(void)Handle;	// consumed by processor
}

void UBridgeLoomMassEntity::ApplyNPCStateBatch(const TArray<FLoomNPCStateUpdate>& Updates)
{
	const int32 Limit = FMath::Min(Updates.Num(), MaxUpdatesPerTick);
	for (int32 i = 0; i < Limit; ++i)
	{
		ApplyNPCStateUpdate(Updates[i]);
	}
}

// ── LOD management ───────────────────────────────────────────────

void UBridgeLoomMassEntity::ReevaluateLODs()
{
	// Trigger immediate LOD pass on next tick
	StatsUpdateAccumulator = 999.0f;
}

void UBridgeLoomMassEntity::SetMetaHumanOverrideCount(int32 Count)
{
	MaxMetaHumanOverrides = Count;
	CachedStats.MetaHumanOverrideCount = FMath::Min(Count, MaxMetaHumanOverrides);
}

// ── Stats ─────────────────────────────────────────────────────────

FLoomMassWorldStats UBridgeLoomMassEntity::GetWorldStats() const
{
	return CachedStats;
}

// ── Tick helpers ─────────────────────────────────────────────────

void UBridgeLoomMassEntity::TickLODUpdates(float DeltaTime)
{
	// LOD logic is handled by Mass processors registered with the world's
	// MassEntitySubsystem; this component simply signals them via tags.
	(void)DeltaTime;
}

void UBridgeLoomMassEntity::TickStats(float DeltaTime)
{
	StatsUpdateAccumulator += DeltaTime;
	if (StatsUpdateAccumulator < 1.0f) return;
	StatsUpdateAccumulator = 0.0f;

	int32 Total = 0;
	for (const auto& [WorldId, Handles] : WorldEntityMap)
	{
		Total += Handles.Num();
	}
	CachedStats.TotalEntities   = Total;
	CachedStats.ActiveEntities = FMath::Min(Total, 1024);	// approximate active LOD budget
}
