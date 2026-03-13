// Copyright Koydo. All Rights Reserved.
// BridgeLoomMovement.cpp

#include "BridgeLoomMovement.h"
#include "GameFramework/Character.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "NiagaraFunctionLibrary.h"
#include "NiagaraSystem.h"

UBridgeLoomMovement::UBridgeLoomMovement()
{
    PrimaryComponentTick.bCanEverTick = false;
}

void UBridgeLoomMovement::BeginPlay()
{
    Super::BeginPlay();
}

// ─── Mode → MaxSpeed ─────────────────────────────────────────────

float UBridgeLoomMovement::ModeToMaxSpeed(ELoomMovementMode Mode) const
{
    switch (Mode)
    {
        case ELoomMovementMode::Walking:   return WalkingMaxSpeed;
        case ELoomMovementMode::Running:   return RunningMaxSpeed;
        case ELoomMovementMode::Sprinting: return SprintingMaxSpeed;
        case ELoomMovementMode::Swimming:  return SwimmingMaxSpeed;
        case ELoomMovementMode::Flying:    return FlyingMaxSpeed;
        case ELoomMovementMode::Falling:   // fall through — use running cap
        default:                           return RunningMaxSpeed;
    }
}

float UBridgeLoomMovement::GetMaxSpeedForMode(ELoomMovementMode Mode,
                                               const UBridgeLoomMovement* Bridge)
{
    if (!Bridge) return 3.5f;
    return Bridge->ModeToMaxSpeed(Mode);
}

// ─── SyncCharacterMovement ────────────────────────────────────────

void UBridgeLoomMovement::SyncCharacterMovement(const FLoomMovementSnapshot& Snapshot)
{
    ACharacter* OwnerChar = Cast<ACharacter>(GetOwner());
    if (!OwnerChar) return;

    UCharacterMovementComponent* CMC = OwnerChar->GetCharacterMovement();
    if (!CMC) return;

    const ELoomMovementMode Mode = Snapshot.MovementState.MovementMode;

    // Update max walk speed so the CMC blending matches Loom authority
    CMC->MaxWalkSpeed = ModeToMaxSpeed(Mode);

    // Map Loom mode to UE movement mode
    switch (Mode)
    {
        case ELoomMovementMode::Falling:
            CMC->SetMovementMode(MOVE_Falling);
            break;
        case ELoomMovementMode::Swimming:
            CMC->SetMovementMode(MOVE_Swimming);
            break;
        case ELoomMovementMode::Flying:
            CMC->SetMovementMode(MOVE_Flying);
            break;
        default:
            CMC->SetMovementMode(MOVE_Walking);
            break;
    }

    // Warp to authoritative position
    OwnerChar->SetActorLocation(Snapshot.Position, false, nullptr, ETeleportType::TeleportPhysics);
}

// ─── ApplySnapshot ────────────────────────────────────────────────

void UBridgeLoomMovement::ApplySnapshot(const FLoomMovementSnapshot& Snapshot)
{
    const ELoomMovementMode NewMode      = Snapshot.MovementState.MovementMode;
    const bool              bNewGrounded = Snapshot.MovementState.bIsGrounded;

    SyncCharacterMovement(Snapshot);

    // Fire mode-changed delegate
    if (NewMode != PreviousMode)
    {
        OnMovementModeChanged.Broadcast(Snapshot.EntityId, NewMode);
        PreviousMode = NewMode;
    }

    // Fire grounded-changed delegate
    if (bNewGrounded != bPreviousGrounded)
    {
        OnGroundedChanged.Broadcast(Snapshot.EntityId, bNewGrounded);
        bPreviousGrounded = bNewGrounded;
    }

    LastSnapshot = Snapshot;
    OnEntityMoved.Broadcast(Snapshot.EntityId, Snapshot);

    // Footstep VFX for walking/running (Blueprint can gate on animation events too)
    if ((NewMode == ELoomMovementMode::Walking || NewMode == ELoomMovementMode::Running)
        && !FootstepVFXTemplate.IsNull())
    {
        TWeakObjectPtr<UBridgeLoomMovement> WeakThis(this);
        FStreamableManager& StreamMgr = UAssetManager::GetStreamableManager();
        StreamMgr.RequestAsyncLoad(FootstepVFXTemplate.ToSoftObjectPath(),
            [WeakThis]()
            {
                if (WeakThis.IsValid())
                {
                    UNiagaraSystem* NS = WeakThis->FootstepVFXTemplate.Get();
                    if (NS && WeakThis->GetOwner())
                    {
                        UNiagaraFunctionLibrary::SpawnSystemAtLocation(
                            WeakThis->GetWorld(), NS,
                            WeakThis->GetOwner()->GetActorLocation());
                    }
                }
            });
    }
}

// ─── GetCurrentMode ───────────────────────────────────────────────

ELoomMovementMode UBridgeLoomMovement::GetCurrentMode() const
{
    return LastSnapshot.MovementState.MovementMode;
}
