// Copyright Project Loom. All Rights Reserved.
// Thread: bridge/bridge-loom-ue5/entity-manager
// Tier: 1

#include "BridgeLoomEntityManager.h"
#include "BridgeLoomMetaHuman.h"
#include "Engine/World.h"
#include "Engine/GameInstance.h"
#include "GameFramework/Actor.h"
#include "Components/SkeletalMeshComponent.h"
#include "Kismet/GameplayStatics.h"

// ── Ticker helper (frame tick without UObject tick) ─────────────

class FBridgeLoomEntityManagerTicker : public FTickableGameObject
{
public:
	explicit FBridgeLoomEntityManagerTicker(UBridgeLoomEntityManager* InOwner)
		: Owner(InOwner) {}

	virtual void Tick(float DeltaTime) override
	{
		if (Owner) Owner->TickInterpolation(DeltaTime);
	}

	virtual bool IsTickable() const override { return Owner != nullptr; }
	virtual TStatId GetStatId() const override
	{
		RETURN_QUICK_DECLARE_CYCLE_STAT(FBridgeLoomEntityManagerTicker,
			STATGROUP_Tickables);
	}

	void Invalidate() { Owner = nullptr; }

private:
	UBridgeLoomEntityManager* Owner;
};

static TUniquePtr<FBridgeLoomEntityManagerTicker> GEntityTicker;

// ── Lifecycle ───────────────────────────────────────────────────

void UBridgeLoomEntityManager::Initialize(
	FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);
	GEntityTicker = MakeUnique<FBridgeLoomEntityManagerTicker>(this);
}

void UBridgeLoomEntityManager::Deinitialize()
{
	// Clean up all tracked entities
	TArray<FString> EntityIds;
	TrackedEntities.GetKeys(EntityIds);
	for (const FString& Id : EntityIds)
	{
		DespawnEntity(Id);
	}

	if (GEntityTicker)
	{
		GEntityTicker->Invalidate();
		GEntityTicker.Reset();
	}

	Super::Deinitialize();
}

// ── Entity spawn ────────────────────────────────────────────────

AActor* UBridgeLoomEntityManager::SpawnEntity(
	const FString& EntityId,
	ELoomEntityTier Tier,
	const FTransform& InitialTransform,
	const FString& MeshAssetPath,
	const FString& MetaHumanPreset,
	const FGameplayTagContainer& Tags)
{
	if (TrackedEntities.Contains(EntityId))
	{
		return TrackedEntities[EntityId].SpawnedActor.Get();
	}

	// Crowd tier uses Mass Entity — no individual actor
	if (Tier == ELoomEntityTier::Crowd)
	{
		FLoomTrackedEntity& Entity = TrackedEntities.Add(EntityId);
		Entity.EntityId = EntityId;
		Entity.Tier = Tier;
		Entity.Tags = Tags;
		Entity.TargetSnapshot.Location = InitialTransform.GetLocation();
		Entity.TargetSnapshot.Rotation = InitialTransform.GetRotation();
		// Mass Entity registration would go here (Phase 10)
		return nullptr;
	}

	AActor* Actor = AcquireFromPool(MeshAssetPath, InitialTransform);
	if (!Actor) return nullptr;

	FLoomTrackedEntity& Entity = TrackedEntities.Add(EntityId);
	Entity.EntityId = EntityId;
	Entity.Tier = Tier;
	Entity.Tags = Tags;
	Entity.SpawnedActor = Actor;
	Entity.TargetSnapshot.Location = InitialTransform.GetLocation();
	Entity.TargetSnapshot.Rotation = InitialTransform.GetRotation();
	Entity.PreviousSnapshot = Entity.TargetSnapshot;

	// Attach MetaHuman for NPC/Hero tiers
	if ((Tier == ELoomEntityTier::NPC || Tier == ELoomEntityTier::Hero)
		&& !MetaHumanPreset.IsEmpty()
		&& ActiveMetaHumanCount < MaxMetaHumanInstances)
	{
		Entity.MetaHumanComponent = AttachMetaHuman(
			Actor, MetaHumanPreset, Tier, Tags);
	}

	OnEntitySpawned.Broadcast(EntityId, Actor);
	return Actor;
}

// ── Entity despawn ──────────────────────────────────────────────

void UBridgeLoomEntityManager::DespawnEntity(const FString& EntityId)
{
	FLoomTrackedEntity* Entity = TrackedEntities.Find(EntityId);
	if (!Entity) return;

	if (Entity->MetaHumanComponent.IsValid())
	{
		ActiveMetaHumanCount = FMath::Max(0, ActiveMetaHumanCount - 1);
	}

	if (AActor* Actor = Entity->SpawnedActor.Get())
	{
		ReturnToPool(TEXT(""), Actor);
	}

	TrackedEntities.Remove(EntityId);
	OnEntityDespawned.Broadcast(EntityId);
}

// ── Snapshot application ────────────────────────────────────────

void UBridgeLoomEntityManager::ApplySnapshot(
	const FString& EntityId,
	const FLoomEntitySnapshot& Snapshot)
{
	FLoomTrackedEntity* Entity = TrackedEntities.Find(EntityId);
	if (!Entity) return;

	// Shift target → previous
	Entity->PreviousSnapshot = Entity->TargetSnapshot;
	Entity->TargetSnapshot = Snapshot;

	// Calculate interpolation duration from timestamp delta
	const int64 DeltaUs = Snapshot.TimestampUs -
		Entity->PreviousSnapshot.TimestampUs;
	if (DeltaUs > 0)
	{
		Entity->InterpolationDuration =
			static_cast<float>(DeltaUs) / 1'000'000.0f;
	}

	Entity->InterpolationAlpha = 0.0f;
}

// ── Tier changes ────────────────────────────────────────────────

void UBridgeLoomEntityManager::ChangeTier(
	const FString& EntityId, ELoomEntityTier NewTier)
{
	FLoomTrackedEntity* Entity = TrackedEntities.Find(EntityId);
	if (!Entity || Entity->Tier == NewTier) return;

	const ELoomEntityTier OldTier = Entity->Tier;
	Entity->Tier = NewTier;

	// Remove MetaHuman if downgrading below NPC
	if ((OldTier == ELoomEntityTier::NPC || OldTier == ELoomEntityTier::Hero)
		&& NewTier != ELoomEntityTier::NPC
		&& NewTier != ELoomEntityTier::Hero)
	{
		if (Entity->MetaHumanComponent.IsValid())
		{
			Entity->MetaHumanComponent->DestroyComponent();
			Entity->MetaHumanComponent = nullptr;
			ActiveMetaHumanCount = FMath::Max(0, ActiveMetaHumanCount - 1);
		}
	}

	// Add MetaHuman if upgrading to NPC/Hero
	if ((NewTier == ELoomEntityTier::NPC || NewTier == ELoomEntityTier::Hero)
		&& !Entity->MetaHumanComponent.IsValid()
		&& ActiveMetaHumanCount < MaxMetaHumanInstances)
	{
		if (AActor* Actor = Entity->SpawnedActor.Get())
		{
			Entity->MetaHumanComponent = AttachMetaHuman(
				Actor, TEXT(""), NewTier, Entity->Tags);
		}
	}

	OnEntityTierChanged.Broadcast(EntityId, NewTier);
}

// ── Queries ─────────────────────────────────────────────────────

bool UBridgeLoomEntityManager::IsEntityTracked(
	const FString& EntityId) const
{
	return TrackedEntities.Contains(EntityId);
}

int32 UBridgeLoomEntityManager::GetTrackedEntityCount() const
{
	return TrackedEntities.Num();
}

int32 UBridgeLoomEntityManager::GetActiveMetaHumanCount() const
{
	return ActiveMetaHumanCount;
}

AActor* UBridgeLoomEntityManager::GetEntityActor(
	const FString& EntityId) const
{
	const FLoomTrackedEntity* Entity = TrackedEntities.Find(EntityId);
	return Entity ? Entity->SpawnedActor.Get() : nullptr;
}

// ── Interpolation tick ──────────────────────────────────────────

void UBridgeLoomEntityManager::TickInterpolation(float DeltaTime)
{
	for (auto& Pair : TrackedEntities)
	{
		FLoomTrackedEntity& Entity = Pair.Value;

		if (Entity.Tier == ELoomEntityTier::Crowd) continue;
		if (!Entity.SpawnedActor.IsValid()) continue;

		// Advance interpolation alpha
		if (Entity.InterpolationDuration > 0.0f)
		{
			Entity.InterpolationAlpha = FMath::Min(
				Entity.InterpolationAlpha +
					DeltaTime / Entity.InterpolationDuration,
				1.0f);
		}

		ApplyInterpolatedTransform(Entity, Entity.InterpolationAlpha);
	}
}

void UBridgeLoomEntityManager::ApplyInterpolatedTransform(
	FLoomTrackedEntity& Entity, float Alpha)
{
	AActor* Actor = Entity.SpawnedActor.Get();
	if (!Actor) return;

	const FVector Loc = FMath::Lerp(
		Entity.PreviousSnapshot.Location,
		Entity.TargetSnapshot.Location,
		Alpha);

	const FQuat Rot = FQuat::Slerp(
		Entity.PreviousSnapshot.Rotation,
		Entity.TargetSnapshot.Rotation,
		Alpha);

	Actor->SetActorLocationAndRotation(Loc, Rot, false, nullptr,
		ETeleportType::None);
}

// ── Actor pool ──────────────────────────────────────────────────

AActor* UBridgeLoomEntityManager::AcquireFromPool(
	const FString& MeshAssetPath, const FTransform& Transform)
{
	// Check pool first
	if (TArray<TWeakObjectPtr<AActor>>* Pool =
		ActorPool.Find(MeshAssetPath))
	{
		while (Pool->Num() > 0)
		{
			TWeakObjectPtr<AActor> Pooled = Pool->Pop();
			if (AActor* Actor = Pooled.Get())
			{
				Actor->SetActorTransform(Transform);
				Actor->SetActorHiddenInGame(false);
				Actor->SetActorEnableCollision(true);
				Actor->SetActorTickEnabled(true);
				return Actor;
			}
		}
	}

	// Pool empty — spawn new actor
	UWorld* World = GetGameInstance()->GetWorld();
	if (!World) return nullptr;

	FActorSpawnParameters Params;
	Params.SpawnCollisionHandlingOverride =
		ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

	AActor* NewActor = World->SpawnActor<AActor>(
		AActor::StaticClass(), Transform, Params);

	return NewActor;
}

void UBridgeLoomEntityManager::ReturnToPool(
	const FString& MeshAssetPath, AActor* Actor)
{
	if (!Actor) return;

	Actor->SetActorHiddenInGame(true);
	Actor->SetActorEnableCollision(false);
	Actor->SetActorTickEnabled(false);

	TArray<TWeakObjectPtr<AActor>>& Pool =
		ActorPool.FindOrAdd(MeshAssetPath);

	if (Pool.Num() < MaxPoolSizePerType)
	{
		Pool.Add(Actor);
	}
	else
	{
		Actor->Destroy();
	}
}

// ── MetaHuman attachment ────────────────────────────────────────

UBridgeLoomMetaHuman* UBridgeLoomEntityManager::AttachMetaHuman(
	AActor* Actor, const FString& PresetName,
	ELoomEntityTier Tier, const FGameplayTagContainer& Tags)
{
	if (!Actor) return nullptr;

	UBridgeLoomMetaHuman* MH = NewObject<UBridgeLoomMetaHuman>(Actor);
	if (!MH) return nullptr;

	MH->Config.PresetName = FName(*PresetName);
	MH->Config.bUseGroomHair = (Tier == ELoomEntityTier::Hero);
	MH->Config.bEnableRigLogic = (Tier == ELoomEntityTier::Hero);
	MH->Config.NPCTier = (Tier == ELoomEntityTier::Hero) ? 4 : 3;
	MH->Config.ArchetypeTags = Tags;

	MH->RegisterComponent();
	ActiveMetaHumanCount++;

	return MH;
}
