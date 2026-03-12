// Copyright Project Loom. All Rights Reserved.
// Thread: bridge/bridge-loom-ue5/game-mode
// Tier: 0

#include "LoomGameMode.h"
#include "LoomCharacter.h"
#include "LoomPlayerController.h"
#include "BridgeLoomSubsystem.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/PlayerStart.h"
#include "Kismet/GameplayStatics.h"
#include "EngineUtils.h"

ALoomGameMode::ALoomGameMode()
{
	DefaultPawnClass = ALoomCharacter::StaticClass();
	PlayerControllerClass = ALoomPlayerController::StaticClass();
}

void ALoomGameMode::InitGame(
	const FString& MapName,
	const FString& Options,
	FString& ErrorMessage)
{
	Super::InitGame(MapName, Options, ErrorMessage);

	UGameInstance* GI = GetGameInstance();
	if (!GI)
	{
		ErrorMessage = TEXT("No GameInstance — cannot reach BridgeLoom");
		return;
	}

	BridgeConnection = GI->GetSubsystem<UBridgeLoomConnection>();
	if (!BridgeConnection)
	{
		ErrorMessage = TEXT("BridgeLoomConnection subsystem not found");
		return;
	}

	if (!BridgeConnection->IsConnected())
	{
		FLoomConnectionConfig Cfg;
		Cfg.ServerAddress = LoomServerAddress;
		Cfg.ServerPort = LoomServerPort;
		BridgeConnection->ConnectToLoom(Cfg);
	}
}

void ALoomGameMode::HandleStartingNewPlayer_Implementation(
	APlayerController* NewPlayer)
{
	Super::HandleStartingNewPlayer_Implementation(NewPlayer);

	if (!NewPlayer)
	{
		return;
	}

	// The Loom server handles entity creation via the
	// NegotiateRequest/player-connect flow on the gRPC stream.
	// On the UE5 side we simply spawn the pawn — the bridge
	// reader thread will deliver entity-spawn messages that
	// the EntityManager processes.
}

void ALoomGameMode::Logout(AController* Exiting)
{
	if (BridgeConnection && BridgeConnection->IsConnected())
	{
		// Disconnect will trigger server-side entity cleanup.
		// We do NOT disconnect here — that's handled per-client
		// on the client side.  This callback is for local
		// bookkeeping only (e.g., releasing cached resources).
	}

	Super::Logout(Exiting);
}

UClass* ALoomGameMode::GetDefaultPawnClassForController_Implementation(
	AController* InController)
{
	return ALoomCharacter::StaticClass();
}

AActor* ALoomGameMode::FindPlayerStart_Implementation(
	AController* Player,
	const FString& IncomingName)
{
	// Prefer any PlayerStart tagged "Loom" for deterministic
	// spawn positioning aligned with the Loom server's
	// spawn-point selection.
	for (TActorIterator<APlayerStart> It(GetWorld()); It; ++It)
	{
		APlayerStart* Start = *It;
		if (Start && Start->PlayerStartTag == FName(TEXT("Loom")))
		{
			return Start;
		}
	}

	// Fall back to engine default.
	return Super::FindPlayerStart_Implementation(Player, IncomingName);
}
