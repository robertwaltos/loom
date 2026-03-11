// Copyright Project Loom. All Rights Reserved.
// Thread: bridge/bridge-loom-ue5/enhanced-input
// Tier: 1
//
// Enhanced Input integration for UE5.5.
//
// UE5.5 direction: Enhanced Input replaces the legacy input system.
// All input actions are defined as UInputAction data assets,
// bound via UInputMappingContext, and processed through
// UEnhancedInputComponent.
//
// The Bridge Loom input component captures Enhanced Input events
// and serialises them into the Loom binary protocol for
// server-authoritative validation.

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "InputActionValue.h"
#include "BridgeLoomInputComponent.generated.h"

class UInputAction;
class UInputMappingContext;
class UBridgeLoomConnection;

// ── Action Flags (bitfield sent to Loom) ────────────────────────

namespace LoomActions
{
	constexpr uint32 None        = 0;
	constexpr uint32 Jump        = 1 << 0;
	constexpr uint32 Sprint      = 1 << 1;
	constexpr uint32 Interact    = 1 << 2;
	constexpr uint32 Attack      = 1 << 3;
	constexpr uint32 Defend      = 1 << 4;
	constexpr uint32 Dodge       = 1 << 5;
	constexpr uint32 UseItem     = 1 << 6;
	constexpr uint32 ToggleMap   = 1 << 7;
	constexpr uint32 OpenMenu    = 1 << 8;
	constexpr uint32 Chat        = 1 << 9;
	constexpr uint32 Trade       = 1 << 10;
	constexpr uint32 Build       = 1 << 11;
	constexpr uint32 Mount       = 1 << 12;
	constexpr uint32 Survey      = 1 << 13;
	constexpr uint32 Vote        = 1 << 14;
	constexpr uint32 Emote       = 1 << 15;
};

/**
 * UBridgeLoomInputComponent
 *
 * Captures Enhanced Input actions and forwards them to the Loom server
 * via UBridgeLoomConnection. Attach to the player Pawn/Character.
 *
 * UE5.5 Enhanced Input patterns:
 *   - UInputAction assets define what actions exist
 *   - UInputMappingContext maps device inputs → actions
 *   - This component binds to actions and converts to Loom protocol
 *   - Server-authoritative: local input is prediction only
 *
 * CommonUI integration:
 *   - Input routing respects CommonUI activation stack
 *   - Menu/UI actions go through CommonUI, not to Loom
 *   - Gameplay actions bypass CommonUI and go directly to Loom
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent))
class BRIDGELOOM_API UBridgeLoomInputComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	UBridgeLoomInputComponent();

	virtual void BeginPlay() override;
	virtual void TickComponent(float DeltaTime, ELevelTick TickType,
		FActorComponentTickFunction* ThisTickFunction) override;

	// ── Input Actions (assign in Blueprint or C++) ──────────────

	/** Move action (2D axis: WASD/stick) */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Loom|Input")
	TObjectPtr<UInputAction> IA_Move;

	/** Look action (2D axis: mouse/right stick) */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Loom|Input")
	TObjectPtr<UInputAction> IA_Look;

	/** Jump action (digital) */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Loom|Input")
	TObjectPtr<UInputAction> IA_Jump;

	/** Sprint action (digital, hold) */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Loom|Input")
	TObjectPtr<UInputAction> IA_Sprint;

	/** Interact action (digital) */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Loom|Input")
	TObjectPtr<UInputAction> IA_Interact;

	/** Primary attack/ability */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Loom|Input")
	TObjectPtr<UInputAction> IA_Attack;

	/** Defend/block */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Loom|Input")
	TObjectPtr<UInputAction> IA_Defend;

	/** Dodge/roll */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Loom|Input")
	TObjectPtr<UInputAction> IA_Dodge;

	/** The mapping context to add on BeginPlay */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Loom|Input")
	TObjectPtr<UInputMappingContext> DefaultMappingContext;

	/** Priority for the default mapping context */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Loom|Input")
	int32 MappingPriority = 0;

	// ── Configuration ───────────────────────────────────────────

	/** Player/entity ID sent with input messages */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Input")
	FString PlayerId;

	/** Input send rate in Hz (default 30 — matches Loom tick rate) */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Input")
	float InputSendRateHz = 30.0f;

protected:
	void SetupInputBindings();
	void SendAccumulatedInput();

	// Enhanced Input callbacks
	void OnMove(const FInputActionValue& Value);
	void OnLook(const FInputActionValue& Value);
	void OnJumpStarted(const FInputActionValue& Value);
	void OnJumpCompleted(const FInputActionValue& Value);
	void OnSprintStarted(const FInputActionValue& Value);
	void OnSprintCompleted(const FInputActionValue& Value);
	void OnInteract(const FInputActionValue& Value);
	void OnAttackStarted(const FInputActionValue& Value);
	void OnAttackCompleted(const FInputActionValue& Value);
	void OnDefendStarted(const FInputActionValue& Value);
	void OnDefendCompleted(const FInputActionValue& Value);
	void OnDodge(const FInputActionValue& Value);

private:
	// Accumulated input state (sent at InputSendRateHz)
	FVector AccumulatedMove = FVector::ZeroVector;
	float AccumulatedYaw = 0.0f;
	float AccumulatedPitch = 0.0f;
	uint32 ActiveActionFlags = LoomActions::None;

	float SendTimer = 0.0f;

	UPROPERTY()
	TObjectPtr<UBridgeLoomConnection> CachedConnection;
};
