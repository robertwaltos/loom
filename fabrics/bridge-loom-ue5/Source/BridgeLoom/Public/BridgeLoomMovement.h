// Copyright Koydo. All Rights Reserved.
// BridgeLoomMovement.h — UE5 bridge for the movement-system.ts locomotion layer.
//
// movement-system.ts is the single source of truth for entity locomotion:
//   - Reads PlayerInputComponent.moveDirection each tick
//   - Resolves MovementMode (walking/running/sprinting/falling/swimming/flying)
//   - Integrates velocity into TransformComponent.position
//   - Writes PhysicsBodyComponent.velocity for ChaosPhysics
//
// UE5 side consumes authoritative movement snapshots from the Loom server and:
//   - Interpolates between snapshots for smooth visual playback (CharacterMovementComponent)
//   - Drives animation state machine via ELoomMovementMode
//   - Triggers footstep audio/VFX per step from the Niagara bridge
//   - Exposes speed/mode to Blueprint for HUD stamina bars etc.

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomMovement.generated.h"

// ─── Enumerations ──────────────────────────────────────────────────

/**
 * Locomotion modes mirroring movement-system.ts MovementMode.
 * Drives the animation state machine and sound cue selection.
 */
UENUM(BlueprintType)
enum class ELoomMovementMode : uint8
{
    Walking     UMETA(DisplayName = "Walking  (1.4 m/s)"),
    Running     UMETA(DisplayName = "Running  (3.5 m/s)"),
    Sprinting   UMETA(DisplayName = "Sprinting (6.0 m/s)"),
    Falling     UMETA(DisplayName = "Falling  (airborne)"),
    Swimming    UMETA(DisplayName = "Swimming (1.0 m/s)"),
    Flying      UMETA(DisplayName = "Flying   (5.0 m/s)"),
};

// ─── Structs ───────────────────────────────────────────────────────

/** Current locomotion state for one entity, mirroring MovementComponent. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomMovementState
{
    GENERATED_BODY()

    /** Current scalar speed (world units per second). */
    UPROPERTY(BlueprintReadOnly, Category = "Movement")
    float Speed = 0.0f;

    /** Theoretical maximum speed for the resolved mode. */
    UPROPERTY(BlueprintReadOnly, Category = "Movement")
    float MaxSpeed = 1.4f;

    /** Whether the entity is touching solid ground. */
    UPROPERTY(BlueprintReadOnly, Category = "Movement")
    bool bIsGrounded = true;

    UPROPERTY(BlueprintReadOnly, Category = "Movement")
    ELoomMovementMode MovementMode = ELoomMovementMode::Walking;
};

/**
 * Authoritative movement snapshot sent by the Loom each simulation tick.
 * UE5 receives these and interpolates between them for smooth rendering.
 */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomMovementSnapshot
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Movement")
    FString EntityId;

    /** World-space position from TransformComponent.position. */
    UPROPERTY(BlueprintReadOnly, Category = "Movement")
    FVector Position = FVector::ZeroVector;

    /** Physics velocity from PhysicsBodyComponent.velocity. */
    UPROPERTY(BlueprintReadOnly, Category = "Movement")
    FVector Velocity = FVector::ZeroVector;

    UPROPERTY(BlueprintReadOnly, Category = "Movement")
    FLoomMovementState MovementState;

    /** Microseconds-since-epoch timestamp from the Loom clock. */
    UPROPERTY(BlueprintReadOnly, Category = "Movement")
    int64 TimestampUs = 0;
};

// ─── Component ────────────────────────────────────────────────────

/**
 * UBridgeLoomMovement — ActorComponent bridging movement-system.ts snapshots
 * to Unreal's CharacterMovementComponent and animation state machine.
 *
 * Workflow:
 *  1. Game session receives a FLoomMovementSnapshot from the server transport.
 *  2. Caller invokes ApplySnapshot() on the character's bridge component.
 *  3. Bridge updates UCharacterMovementComponent max speed, calls SetMovementMode,
 *     and fires the OnMovementModeChanged delegate for the anim BP.
 *  4. Visual interpolation is deferred to UE5's built-in prediction system.
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent),
       DisplayName = "Loom Movement")
class BRIDGELOOM_API UBridgeLoomMovement : public UActorComponent
{
    GENERATED_BODY()

public:
    UBridgeLoomMovement();

    // ── Configuration ─────────────────────────────────────────────

    /** Speed caps (m/s) for each mode. Defaults match movement-system.ts. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Movement|Config",
              meta = (ClampMin = "0.0"))
    float WalkingMaxSpeed   = 1.4f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Movement|Config",
              meta = (ClampMin = "0.0"))
    float RunningMaxSpeed   = 3.5f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Movement|Config",
              meta = (ClampMin = "0.0"))
    float SprintingMaxSpeed = 6.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Movement|Config",
              meta = (ClampMin = "0.0"))
    float SwimmingMaxSpeed  = 1.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Movement|Config",
              meta = (ClampMin = "0.0"))
    float FlyingMaxSpeed    = 5.0f;

    /**
     * Niagara footstep VFX system (spawned per footstep event when walking/running).
     * Optional — leave unset to disable procedural footsteps.
     */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Movement|VFX")
    TSoftObjectPtr<class UNiagaraSystem> FootstepVFXTemplate;

    // ── State ─────────────────────────────────────────────────────

    /** Most recently applied snapshot. Read-only from Blueprint. */
    UPROPERTY(BlueprintReadOnly, Category = "Movement")
    FLoomMovementSnapshot LastSnapshot;

    // ── Methods ───────────────────────────────────────────────────

    /**
     * Consume an authoritative snapshot from the Loom, update the
     * owning character's CharacterMovementComponent, and fire delegates.
     */
    UFUNCTION(BlueprintCallable, Category = "Movement")
    void ApplySnapshot(const FLoomMovementSnapshot& Snapshot);

    /** Get the current locomotion mode. */
    UFUNCTION(BlueprintPure, Category = "Movement")
    ELoomMovementMode GetCurrentMode() const;

    /** Convert an ELoomMovementMode to the UE5 EMovementMode equivalent. */
    UFUNCTION(BlueprintPure, Category = "Movement")
    static float GetMaxSpeedForMode(ELoomMovementMode Mode,
                                    const UBridgeLoomMovement* Bridge);

    // ── Delegates ─────────────────────────────────────────────────

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnMovementModeChanged,
        FString, EntityId, ELoomMovementMode, NewMode);

    /** Fired when movement mode transitions (e.g. Walking → Sprinting). */
    UPROPERTY(BlueprintAssignable, Category = "Movement|Events")
    FOnMovementModeChanged OnMovementModeChanged;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnEntityMoved,
        FString, EntityId, FLoomMovementSnapshot, Snapshot);

    /** Fired every time ApplySnapshot is called with a new position. */
    UPROPERTY(BlueprintAssignable, Category = "Movement|Events")
    FOnEntityMoved OnEntityMoved;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnGroundedChanged,
        FString, EntityId, bool, bIsGrounded);

    /** Fired when grounded state switches (landed / left ground). */
    UPROPERTY(BlueprintAssignable, Category = "Movement|Events")
    FOnGroundedChanged OnGroundedChanged;

    // ── UActorComponent ───────────────────────────────────────────

    virtual void BeginPlay() override;

private:
    ELoomMovementMode PreviousMode      = ELoomMovementMode::Walking;
    bool              bPreviousGrounded = true;

    void SyncCharacterMovement(const FLoomMovementSnapshot& Snapshot);
    float ModeToMaxSpeed(ELoomMovementMode Mode) const;
};
