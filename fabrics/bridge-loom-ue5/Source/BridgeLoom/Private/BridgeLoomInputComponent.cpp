// Copyright Project Loom. All Rights Reserved.
// Thread: bridge/bridge-loom-ue5/enhanced-input
// Tier: 1

#include "BridgeLoomInputComponent.h"
#include "BridgeLoomConnection.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "InputAction.h"
#include "InputMappingContext.h"
#include "GameFramework/Pawn.h"
#include "GameFramework/PlayerController.h"

UBridgeLoomInputComponent::UBridgeLoomInputComponent()
{
	PrimaryComponentTick.bCanEverTick = true;
	PrimaryComponentTick.TickGroup = TG_PrePhysics;
}

void UBridgeLoomInputComponent::BeginPlay()
{
	Super::BeginPlay();

	// Cache connection subsystem
	if (const UGameInstance* GI = GetWorld()->GetGameInstance())
	{
		CachedConnection = GI->GetSubsystem<UBridgeLoomConnection>();
	}

	// Register default mapping context with Enhanced Input subsystem
	if (const APawn* Pawn = Cast<APawn>(GetOwner()))
	{
		if (const APlayerController* PC = Cast<APlayerController>(Pawn->GetController()))
		{
			if (UEnhancedInputLocalPlayerSubsystem* EIS =
				ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(PC->GetLocalPlayer()))
			{
				if (DefaultMappingContext)
				{
					EIS->AddMappingContext(DefaultMappingContext, MappingPriority);
				}
			}

			SetupInputBindings();
		}
	}
}

void UBridgeLoomInputComponent::SetupInputBindings()
{
	const APawn* Pawn = Cast<APawn>(GetOwner());
	if (!Pawn) return;

	const APlayerController* PC = Cast<APlayerController>(Pawn->GetController());
	if (!PC) return;

	UEnhancedInputComponent* EIC = Cast<UEnhancedInputComponent>(Pawn->InputComponent);
	if (!EIC) return;

	// 2D axes — continuous
	if (IA_Move)
	{
		EIC->BindAction(IA_Move, ETriggerEvent::Triggered, this,
			&UBridgeLoomInputComponent::OnMove);
	}
	if (IA_Look)
	{
		EIC->BindAction(IA_Look, ETriggerEvent::Triggered, this,
			&UBridgeLoomInputComponent::OnLook);
	}

	// Digital — started/completed pairs for hold detection
	if (IA_Jump)
	{
		EIC->BindAction(IA_Jump, ETriggerEvent::Started, this,
			&UBridgeLoomInputComponent::OnJumpStarted);
		EIC->BindAction(IA_Jump, ETriggerEvent::Completed, this,
			&UBridgeLoomInputComponent::OnJumpCompleted);
	}
	if (IA_Sprint)
	{
		EIC->BindAction(IA_Sprint, ETriggerEvent::Started, this,
			&UBridgeLoomInputComponent::OnSprintStarted);
		EIC->BindAction(IA_Sprint, ETriggerEvent::Completed, this,
			&UBridgeLoomInputComponent::OnSprintCompleted);
	}
	if (IA_Interact)
	{
		EIC->BindAction(IA_Interact, ETriggerEvent::Started, this,
			&UBridgeLoomInputComponent::OnInteract);
	}
	if (IA_Attack)
	{
		EIC->BindAction(IA_Attack, ETriggerEvent::Started, this,
			&UBridgeLoomInputComponent::OnAttackStarted);
		EIC->BindAction(IA_Attack, ETriggerEvent::Completed, this,
			&UBridgeLoomInputComponent::OnAttackCompleted);
	}
	if (IA_Defend)
	{
		EIC->BindAction(IA_Defend, ETriggerEvent::Started, this,
			&UBridgeLoomInputComponent::OnDefendStarted);
		EIC->BindAction(IA_Defend, ETriggerEvent::Completed, this,
			&UBridgeLoomInputComponent::OnDefendCompleted);
	}
	if (IA_Dodge)
	{
		EIC->BindAction(IA_Dodge, ETriggerEvent::Started, this,
			&UBridgeLoomInputComponent::OnDodge);
	}
}

void UBridgeLoomInputComponent::TickComponent(float DeltaTime,
	ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

	if (InputSendRateHz <= 0.0f) return;

	SendTimer += DeltaTime;
	const float Interval = 1.0f / InputSendRateHz;

	if (SendTimer >= Interval)
	{
		SendAccumulatedInput();
		SendTimer -= Interval;
	}
}

void UBridgeLoomInputComponent::SendAccumulatedInput()
{
	if (!CachedConnection) return;

	// Only send if there is meaningful input
	const bool bHasMovement = !AccumulatedMove.IsNearlyZero(0.01f);
	const bool bHasLook = FMath::Abs(AccumulatedYaw) > 0.01f ||
		FMath::Abs(AccumulatedPitch) > 0.01f;
	const bool bHasActions = ActiveActionFlags != LoomActions::None;

	if (!bHasMovement && !bHasLook && !bHasActions) return;

	CachedConnection->SendPlayerInput(
		AccumulatedMove,
		AccumulatedYaw,
		AccumulatedPitch,
		ActiveActionFlags
	);

	// Reset accumulated look deltas (move is continuous, look is delta)
	AccumulatedYaw = 0.0f;
	AccumulatedPitch = 0.0f;
}

// ── Enhanced Input callbacks ────────────────────────────────────

void UBridgeLoomInputComponent::OnMove(const FInputActionValue& Value)
{
	const FVector2D Axis = Value.Get<FVector2D>();
	AccumulatedMove.X = Axis.X; // Right
	AccumulatedMove.Y = Axis.Y; // Forward
}

void UBridgeLoomInputComponent::OnLook(const FInputActionValue& Value)
{
	const FVector2D Axis = Value.Get<FVector2D>();
	AccumulatedYaw += Axis.X;
	AccumulatedPitch += Axis.Y;
}

void UBridgeLoomInputComponent::OnJumpStarted(const FInputActionValue& Value)
{
	ActiveActionFlags |= LoomActions::Jump;
}

void UBridgeLoomInputComponent::OnJumpCompleted(const FInputActionValue& Value)
{
	ActiveActionFlags &= ~LoomActions::Jump;
}

void UBridgeLoomInputComponent::OnSprintStarted(const FInputActionValue& Value)
{
	ActiveActionFlags |= LoomActions::Sprint;
}

void UBridgeLoomInputComponent::OnSprintCompleted(const FInputActionValue& Value)
{
	ActiveActionFlags &= ~LoomActions::Sprint;
}

void UBridgeLoomInputComponent::OnInteract(const FInputActionValue& Value)
{
	ActiveActionFlags |= LoomActions::Interact;
}

void UBridgeLoomInputComponent::OnAttackStarted(const FInputActionValue& Value)
{
	ActiveActionFlags |= LoomActions::Attack;
}

void UBridgeLoomInputComponent::OnAttackCompleted(const FInputActionValue& Value)
{
	ActiveActionFlags &= ~LoomActions::Attack;
}

void UBridgeLoomInputComponent::OnDefendStarted(const FInputActionValue& Value)
{
	ActiveActionFlags |= LoomActions::Defend;
}

void UBridgeLoomInputComponent::OnDefendCompleted(const FInputActionValue& Value)
{
	ActiveActionFlags &= ~LoomActions::Defend;
}

void UBridgeLoomInputComponent::OnDodge(const FInputActionValue& Value)
{
	// Dodge is a one-shot action — flag is cleared after one send cycle
	ActiveActionFlags |= LoomActions::Dodge;
}
