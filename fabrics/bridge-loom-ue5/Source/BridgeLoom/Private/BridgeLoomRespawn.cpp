// Copyright Koydo. All Rights Reserved.
// BridgeLoomRespawn.cpp

#include "BridgeLoomRespawn.h"
#include "GameFramework/Actor.h"
#include "HAL/PlatformTime.h"
#include "Engine/StreamableManager.h"
#include "Engine/AssetManager.h"
#include "NiagaraFunctionLibrary.h"

UBridgeLoomRespawn::UBridgeLoomRespawn()
{
    PrimaryComponentTick.bCanEverTick = true;
    PrimaryComponentTick.bStartWithTickEnabled = false;
}

void UBridgeLoomRespawn::BeginPlay()
{
    Super::BeginPlay();
}

void UBridgeLoomRespawn::TickComponent(float DeltaTime, ELevelTick TickType,
                                        FActorComponentTickFunction* ThisTickFunction)
{
    Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

    if (!bIsDead)
    {
        SetComponentTickEnabled(false);
        return;
    }

    const double NowMs = FPlatformTime::Seconds() * 1000.0;
    const float Remaining = FMath::Max(
        0.0f,
        static_cast<float>((PendingRespawn.RespawnAtMs - NowMs) / 1000.0));
    PendingRespawn.RemainingSeconds = Remaining;

    OnCountdownTick.Broadcast(PendingRespawn.EntityId, Remaining);
}

void UBridgeLoomRespawn::NotifyDeath(const FString& EntityId,
                                      const FVector& DeathPosition,
                                      int64 DiedAtMs)
{
    bIsDead = true;

    PendingRespawn.EntityId        = EntityId;
    PendingRespawn.DiedAtMs        = DiedAtMs;
    PendingRespawn.RespawnAtMs     = DiedAtMs +
        static_cast<int64>(RespawnDelaySeconds * 1000.0f);
    PendingRespawn.RemainingSeconds = RespawnDelaySeconds;

    // Start tick-driven countdown.
    SetComponentTickEnabled(true);

    // Death VFX.
    SpawnVFXAtLocation(DeathVFXTemplate, DeathPosition);

    OnEntityDied.Broadcast(EntityId, DeathPosition);
}

void UBridgeLoomRespawn::NotifyRespawn(const FLoomRespawnEvent& RespawnEvent)
{
    // Teleport owner actor to spawn position.
    if (AActor* Owner = GetOwner())
    {
        Owner->SetActorLocation(RespawnEvent.RespawnPosition,
                                /*bSweep=*/false,
                                /*OutSweepHitResult=*/nullptr,
                                ETeleportType::TeleportPhysics);
    }

    // Clear death state.
    bIsDead = false;
    PendingRespawn = FLoomRespawnTimer{};
    SetComponentTickEnabled(false);

    // Respawn VFX at the new position.
    SpawnVFXAtLocation(RespawnVFXTemplate, RespawnEvent.RespawnPosition);

    OnEntityRespawned.Broadcast(RespawnEvent);
}

float UBridgeLoomRespawn::GetRespawnCountdownSeconds() const
{
    return bIsDead ? PendingRespawn.RemainingSeconds : 0.0f;
}

// ── Private ──────────────────────────────────────────────────────────────────

void UBridgeLoomRespawn::SpawnVFXAtLocation(
    const TSoftObjectPtr<UNiagaraSystem>& Template,
    const FVector& Location)
{
    if (Template.IsNull())
    {
        return;
    }

    TWeakObjectPtr<UBridgeLoomRespawn> WeakSelf(this);
    const FVector CaptureLoc = Location;
    const TSoftObjectPtr<UNiagaraSystem> CaptureTemplate = Template;

    FStreamableManager& Manager = UAssetManager::GetStreamableManager();
    Manager.RequestAsyncLoad(
        CaptureTemplate.ToSoftObjectPath(),
        [WeakSelf, CaptureLoc, CaptureTemplate]()
        {
            if (!WeakSelf.IsValid()) return;
            if (UNiagaraSystem* NS = CaptureTemplate.Get())
            {
                if (UWorld* World = WeakSelf->GetWorld())
                {
                    UNiagaraFunctionLibrary::SpawnSystemAtLocation(
                        World, NS, CaptureLoc);
                }
            }
        });
}
