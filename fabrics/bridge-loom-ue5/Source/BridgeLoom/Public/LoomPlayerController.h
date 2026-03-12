// Copyright Project Loom. All Rights Reserved.
// Thread: bridge/bridge-loom-ue5/player-controller
// Tier: 0
//
// LoomPlayerController — Binds the UE5 player session to
// the Loom gRPC client identity (clientId → entityId).
// Routes entity lifecycle events from the bridge to the
// correct ALoomCharacter.

#pragma once

#include "CoreMinimal.h"
#include "GameFramework/PlayerController.h"
#include "LoomPlayerController.generated.h"

class UBridgeLoomConnection;

/**
 * ALoomPlayerController
 *
 * Responsibilities:
 *   1. On BeginPlay, negotiates with the Loom server via gRPC
 *      to obtain a clientId and trigger server-side entity spawn.
 *   2. Stores the assigned clientId and entityId for this session.
 *   3. When the possessed ALoomCharacter spawns, writes the
 *      LoomEntityId so snapshot interpolation targets the
 *      correct entity.
 *   4. On EndPlay, notifies the bridge to disconnect.
 */
UCLASS()
class BRIDGELOOM_API ALoomPlayerController : public APlayerController
{
	GENERATED_BODY()

public:
	ALoomPlayerController();

	virtual void BeginPlay() override;
	virtual void OnPossess(APawn* InPawn) override;
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

	/** The Loom-assigned client ID from negotiate. */
	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	FString LoomClientId;

	/** The Loom entity ID bound to this player. */
	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	FString LoomEntityId;

	/** Whether the negotiate handshake completed. */
	UPROPERTY(BlueprintReadOnly, Category = "Loom")
	bool bNegotiateComplete = false;

private:
	UPROPERTY()
	UBridgeLoomConnection* BridgeConnection = nullptr;

	void NegotiateWithLoom();

	UFUNCTION()
	void OnEntitySpawnedHandler(const FString& EntityId,
		const FString& Archetype);
};
