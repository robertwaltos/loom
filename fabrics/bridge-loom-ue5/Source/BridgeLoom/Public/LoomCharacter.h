// Copyright Project Loom. All Rights Reserved.
// Thread: bridge/bridge-loom-ue5/character
// Tier: 0
//
// LoomCharacter — The player's physical representation in UE5.
// Hosts the BridgeLoom input component, receives authoritative
// position/rotation updates from the Loom EntityManager, and
// drives the local mesh + animation.

#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "LoomCharacter.generated.h"

class UBridgeLoomInputComponent;
class USpringArmComponent;
class UCameraComponent;

/**
 * ALoomCharacter
 *
 * Thin UE5 shell around the Loom entity. All gameplay state
 * lives server-side — this class:
 *   1. Captures local input via UBridgeLoomInputComponent
 *      and sends it to the Loom server over the gRPC stream.
 *   2. Receives authoritative transforms from the entity
 *      snapshot pipeline and applies them locally (with
 *      optional smoothing for visual quality).
 *   3. Owns the skeletal mesh / MetaHuman so animations
 *      can run purely client-side.
 */
UCLASS()
class BRIDGELOOM_API ALoomCharacter : public ACharacter
{
	GENERATED_BODY()

public:
	ALoomCharacter();

	virtual void BeginPlay() override;
	virtual void Tick(float DeltaTime) override;
	virtual void SetupPlayerInputComponent(
		UInputComponent* PlayerInputComponent) override;

	/**
	 * Called by the entity snapshot pipeline when a new
	 * authoritative transform arrives from the Loom server.
	 */
	UFUNCTION(BlueprintCallable, Category = "Loom")
	void ApplyServerTransform(
		const FVector& Position,
		const FRotator& Rotation,
		float ServerTimestamp);

	/** The Loom entity ID bound to this character. */
	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	FString LoomEntityId;

protected:
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Loom")
	UBridgeLoomInputComponent* LoomInput = nullptr;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Loom|Camera")
	USpringArmComponent* CameraBoom = nullptr;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Loom|Camera")
	UCameraComponent* FollowCamera = nullptr;

private:
	/** Server-authoritative state for interpolation. */
	FVector TargetPosition = FVector::ZeroVector;
	FRotator TargetRotation = FRotator::ZeroRotator;
	float LastServerTimestamp = 0.f;
	bool bHasServerTarget = false;

	/** Interpolation speed (units/sec approach rate). */
	static constexpr float InterpSpeed = 15.f;
};
