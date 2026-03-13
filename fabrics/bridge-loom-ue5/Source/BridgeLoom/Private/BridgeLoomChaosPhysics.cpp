// Copyright Project Loom. All Rights Reserved.

#include "BridgeLoomChaosPhysics.h"
#include "GeometryCollection/GeometryCollectionActor.h"
#include "Kismet/GameplayStatics.h"
#include "DrawDebugHelpers.h"

// ── Constructor ──────────────────────────────────────────────────

UBridgeLoomChaosPhysics::UBridgeLoomChaosPhysics()
{
	PrimaryComponentTick.bCanEverTick = true;
}

// ── Lifecycle ────────────────────────────────────────────────────

void UBridgeLoomChaosPhysics::BeginPlay()
{
	Super::BeginPlay();
	RegisterNearbyGeometryCollections();
}

void UBridgeLoomChaosPhysics::TickComponent(float DeltaTime,
                                             ELevelTick TickType,
                                             FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);
	TickRepairs(DeltaTime);
	TickDebrisCulling(DeltaTime);
}

// ── Geometry collection discovery ───────────────────────────────

void UBridgeLoomChaosPhysics::RegisterNearbyGeometryCollections()
{
	RegisteredCollections.Empty();

	TArray<AActor*> Found;
	UGameplayStatics::GetAllActorsOfClass(GetWorld(), AGeometryCollectionActor::StaticClass(), Found);
	for (AActor* Actor : Found)
	{
		if (UGeometryCollectionComponent* GCC = Actor->FindComponentByClass<UGeometryCollectionComponent>())
		{
			RegisteredCollections.Add(GCC);
		}
	}
}

// ── Destruction API ──────────────────────────────────────────────

void UBridgeLoomChaosPhysics::ApplyDestructionEvent(const FLoomDestructionEvent& Event)
{
	if (ActiveFieldCount >= MaxActiveFields) return;

	for (TWeakObjectPtr<UGeometryCollectionComponent>& WeakGCC : RegisteredCollections)
	{
		UGeometryCollectionComponent* GCC = WeakGCC.Get();
		if (!IsValid(GCC)) continue;

		const float Distance = FVector::Dist(GCC->GetComponentLocation(), Event.Origin);
		if (Distance > Event.Radius * 1.5f) continue;

		// Scale force by inverse square proximity
		const float DistanceFactor = FMath::Max(0.1f, 1.0f - (Distance / Event.Radius));
		const float ScaledForce = Event.Force * DistanceFactor;

		GCC->ApplyRadialDamage(ScaledForce, Event.Origin, Event.Radius,
		                       nullptr, GetOwner());
	}

	++ActiveFieldCount;

	// Notify listeners
	OnChunkDestroyed.Broadcast(Event.EntityId, Event.Origin);
}

void UBridgeLoomChaosPhysics::ApplySiegeImpact(const FLoomSiegeImpact& Impact)
{
	if (ActiveFieldCount >= MaxActiveFields) return;

	for (TWeakObjectPtr<UGeometryCollectionComponent>& WeakGCC : RegisteredCollections)
	{
		UGeometryCollectionComponent* GCC = WeakGCC.Get();
		if (!IsValid(GCC)) continue;

		const float Distance = FVector::Dist(GCC->GetComponentLocation(), Impact.ImpactLocation);
		if (Distance > Impact.ProjectileRadius * 3.0f) continue;

		GCC->ApplyRadialDamage(Impact.ImpactEnergy, Impact.ImpactLocation,
		                       Impact.ProjectileRadius * 2.0f,
		                       nullptr, GetOwner());
	}

	++ActiveFieldCount;
}

// ── Terrain integrity ────────────────────────────────────────────

void UBridgeLoomChaosPhysics::UpdateTerrainIntegrity(const FLoomTerrainDamageState& State)
{
	TerrainIntegrityMap.Add(State.ChunkId, State);

	if (State.IntegrityPercent <= 0.0f)
	{
		OnChunkDestroyed.Broadcast(State.ChunkId, FVector::ZeroVector);
	}
}

void UBridgeLoomChaosPhysics::BeginRepair(const FString& ChunkId, float RepairRatePerSecond)
{
	RepairRateMap.Add(ChunkId, RepairRatePerSecond);
}

// ── Tick helpers ─────────────────────────────────────────────────

void UBridgeLoomChaosPhysics::TickRepairs(float DeltaTime)
{
	for (auto& [ChunkId, Rate] : RepairRateMap)
	{
		if (FLoomTerrainDamageState* State = TerrainIntegrityMap.Find(ChunkId))
		{
			if (!State->bCanRepair) continue;

			State->RepairProgress += Rate * DeltaTime;
			State->IntegrityPercent = FMath::Clamp(State->RepairProgress, 0.0f, 1.0f);

			OnChunkRepaired.Broadcast(ChunkId, State->IntegrityPercent);
		}
	}

	// Decay active field count over time
	if (ActiveFieldCount > 0)
	{
		ActiveFieldCount = FMath::Max(0, ActiveFieldCount - 1);
	}
}

void UBridgeLoomChaosPhysics::TickDebrisCulling(float DeltaTime)
{
	TArray<TWeakObjectPtr<AActor>> ToDestroy;

	for (auto& [WeakActor, Age] : DebrisAgeMap)
	{
		Age += DeltaTime;
		if (Age >= DebrisLifetimeSeconds || !WeakActor.IsValid())
		{
			ToDestroy.Add(WeakActor);
		}
	}

	for (TWeakObjectPtr<AActor>& WeakActor : ToDestroy)
	{
		if (WeakActor.IsValid())
		{
			WeakActor->Destroy();
		}
		DebrisAgeMap.Remove(WeakActor);
	}
}
