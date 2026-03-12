// Copyright Project Loom. All Rights Reserved.
// Thread: bridge/bridge-loom-ue5/game-mode
// Tier: 0
//
// LoomGameMode — Server-authoritative GameMode that manages
// player join/leave lifecycle through the Loom bridge.

#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "BridgeLoomConnection.h"
#include "LoomGameMode.generated.h"

/**
 * ALoomGameMode
 *
 * Controls the player lifecycle on the UE5 side:
 *   - Login: validates gRPC session, creates Pawn
 *   - Spawn: selects spawn transform from Loom world state
 *   - Logout: notifies Loom to despawn player entity
 *
 * The Loom server is authoritative. This GameMode simply
 * orchestrates the UE5 side of the handshake.
 */
UCLASS()
class BRIDGELOOM_API ALoomGameMode : public AGameModeBase
{
	GENERATED_BODY()

public:
	ALoomGameMode();

	virtual void InitGame(const FString& MapName, const FString& Options,
		FString& ErrorMessage) override;

	virtual void HandleStartingNewPlayer_Implementation(APlayerController* NewPlayer) override;

	virtual void Logout(AController* Exiting) override;

	virtual UClass* GetDefaultPawnClassForController_Implementation(
		AController* InController) override;

	virtual AActor* FindPlayerStart_Implementation(
		AController* Player, const FString& IncomingName) override;

	/** Address of the Loom server. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom")
	FString LoomServerAddress = TEXT("localhost");

	/** Port of the Loom gRPC server. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom")
	int32 LoomServerPort = 50051;

protected:
	UPROPERTY()
	UBridgeLoomConnection* BridgeConnection = nullptr;
};
