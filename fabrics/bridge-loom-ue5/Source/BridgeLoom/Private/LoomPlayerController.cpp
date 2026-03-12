// Copyright Project Loom. All Rights Reserved.
// Thread: bridge/bridge-loom-ue5/player-controller
// Tier: 0

#include "LoomPlayerController.h"
#include "LoomCharacter.h"
#include "BridgeLoomConnection.h"
#include "Engine/World.h"

ALoomPlayerController::ALoomPlayerController()
{
}

void ALoomPlayerController::BeginPlay()
{
	Super::BeginPlay();

	UGameInstance* GI = GetGameInstance();
	if (GI)
	{
		BridgeConnection = GI->GetSubsystem<UBridgeLoomConnection>();
	}

	if (BridgeConnection && BridgeConnection->IsConnected())
	{
		NegotiateWithLoom();
	}
}

void ALoomPlayerController::NegotiateWithLoom()
{
	if (!BridgeConnection)
	{
		return;
	}

	// The negotiate RPC was already completed during InitGame in LoomGameMode,
	// so we only need to grab the assigned client ID from the connection.
	LoomClientId = BridgeConnection->GetAssignedClientId();

	if (LoomClientId.IsEmpty())
	{
		UE_LOG(LogTemp, Warning,
			TEXT("LoomPlayerController: No assigned client ID from bridge"));
		return;
	}

	bNegotiateComplete = true;

	// Listen for entity-spawn events to capture our entity ID
	BridgeConnection->OnEntitySpawned.AddDynamic(
		this, &ALoomPlayerController::OnEntitySpawnedHandler);

	UE_LOG(LogTemp, Log,
		TEXT("LoomPlayerController: Bound to client %s"),
		*LoomClientId);
}

void ALoomPlayerController::OnPossess(APawn* InPawn)
{
	Super::OnPossess(InPawn);

	ALoomCharacter* LoomChar = Cast<ALoomCharacter>(InPawn);
	if (LoomChar && !LoomEntityId.IsEmpty())
	{
		LoomChar->LoomEntityId = LoomEntityId;
	}
}

void ALoomPlayerController::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (BridgeConnection && bNegotiateComplete)
	{
		// The disconnect handler on the TypeScript side will
		// despawn the entity and clean up the connection.
		BridgeConnection->OnEntitySpawned.RemoveDynamic(
			this, &ALoomPlayerController::OnEntitySpawnedHandler);
	}

	Super::EndPlay(EndPlayReason);
}

void ALoomPlayerController::OnEntitySpawnedHandler(
	const FString& EntityId, const FString& Archetype)
{
	// The first entity-spawn received after negotiate is ours
	if (LoomEntityId.IsEmpty())
	{
		LoomEntityId = EntityId;
		UE_LOG(LogTemp, Log,
			TEXT("LoomPlayerController: Assigned entity %s"),
			*LoomEntityId);

		// Write entity ID into the possessed character
		ALoomCharacter* LoomChar = Cast<ALoomCharacter>(GetPawn());
		if (LoomChar)
		{
			LoomChar->LoomEntityId = LoomEntityId;
		}
	}
}
