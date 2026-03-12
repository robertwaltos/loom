// Copyright Project Loom. All Rights Reserved.
// Thread: bridge/bridge-loom-ue5/character
// Tier: 0

#include "LoomCharacter.h"
#include "BridgeLoomInputComponent.h"
#include "BridgeLoomSubsystem.h"
#include "Components/CapsuleComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "Camera/CameraComponent.h"
#include "Engine/World.h"

ALoomCharacter::ALoomCharacter()
{
	PrimaryActorTick.bCanEverTick = true;

	LoomInput = CreateDefaultSubobject<UBridgeLoomInputComponent>(
		TEXT("LoomInput"));

	// Third-person camera boom
	CameraBoom = CreateDefaultSubobject<USpringArmComponent>(
		TEXT("CameraBoom"));
	CameraBoom->SetupAttachment(RootComponent);
	CameraBoom->TargetArmLength = 350.0f;
	CameraBoom->bUsePawnControlRotation = true;
	CameraBoom->bDoCollisionTest = true;
	CameraBoom->ProbeSize = 12.0f;
	CameraBoom->SocketOffset = FVector(0.0f, 50.0f, 80.0f);

	// Follow camera
	FollowCamera = CreateDefaultSubobject<UCameraComponent>(
		TEXT("FollowCamera"));
	FollowCamera->SetupAttachment(CameraBoom,
		USpringArmComponent::SocketName);
	FollowCamera->bUsePawnControlRotation = false;

	// Do not rotate mesh with controller — camera drives view
	bUseControllerRotationPitch = false;
	bUseControllerRotationYaw = false;
	bUseControllerRotationRoll = false;

	// Orient character movement to movement direction
	if (GetCharacterMovement())
	{
		GetCharacterMovement()->bOrientRotationToMovement = true;
		GetCharacterMovement()->RotationRate =
			FRotator(0.0f, 540.0f, 0.0f);
	}
}

void ALoomCharacter::BeginPlay()
{
	Super::BeginPlay();

	// Bind LoomInput's PlayerId to this character's entity ID
	// so input messages are tagged correctly.
	if (LoomInput && !LoomEntityId.IsEmpty())
	{
		LoomInput->PlayerId = LoomEntityId;
	}

	// If connected, register the entity-spawn delegate so
	// we receive our authoritative entity ID from the server.
	UGameInstance* GI = GetGameInstance();
	if (GI)
	{
		UBridgeLoomConnection* Conn =
			GI->GetSubsystem<UBridgeLoomConnection>();
		if (Conn)
		{
			Conn->OnEntitySpawned.AddWeakLambda(
				this,
				[this](const FString& EntityId, const FVector& Pos,
					const FRotator& Rot)
				{
					// Accept the first entity-spawn as ours if we
					// don't have an ID yet.  In a real game this
					// would match on some session token.
					if (LoomEntityId.IsEmpty())
					{
						LoomEntityId = EntityId;
						if (LoomInput)
						{
							LoomInput->PlayerId = EntityId;
						}
						ApplyServerTransform(Pos, Rot, 0.f);
					}
				});
		}
	}
}

void ALoomCharacter::Tick(float DeltaTime)
{
	Super::Tick(DeltaTime);

	if (!bHasServerTarget)
	{
		return;
	}

	// Smoothly interpolate toward the last authoritative
	// position/rotation received from the Loom server.
	const FVector Current = GetActorLocation();
	const FRotator CurrentRot = GetActorRotation();

	const FVector NewPos = FMath::VInterpTo(
		Current, TargetPosition, DeltaTime, InterpSpeed);
	const FRotator NewRot = FMath::RInterpTo(
		CurrentRot, TargetRotation, DeltaTime, InterpSpeed);

	SetActorLocationAndRotation(NewPos, NewRot, false, nullptr,
		ETeleportType::None);
}

void ALoomCharacter::SetupPlayerInputComponent(
	UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);

	// Input bindings are managed by UBridgeLoomInputComponent,
	// which reads Enhanced Input actions and sends them to the
	// Loom server.  No additional bindings needed here.
}

void ALoomCharacter::ApplyServerTransform(
	const FVector& Position,
	const FRotator& Rotation,
	float ServerTimestamp)
{
	// Only accept newer timestamps to avoid jitter from
	// out-of-order packets.
	if (bHasServerTarget && ServerTimestamp < LastServerTimestamp)
	{
		return;
	}

	TargetPosition = Position;
	TargetRotation = Rotation;
	LastServerTimestamp = ServerTimestamp;
	bHasServerTarget = true;
}
