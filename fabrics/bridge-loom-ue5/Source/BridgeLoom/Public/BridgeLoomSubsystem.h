// Copyright Project Loom. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "BridgeLoomSubsystem.generated.h"

/**
 * UBridgeLoomSubsystem — GameInstance-level subsystem that manages
 * the gRPC connection to the Loom server.
 *
 * Receives:
 *   - Entity state snapshots (position, rotation, animation, LOD)
 *   - Spawn/despawn commands
 *   - World preload/unload directives from The Silfen Weave
 *
 * Sends:
 *   - Player input events (movement, interaction, combat)
 *   - Physics collision/overlap events
 *   - Client performance telemetry
 */
UCLASS()
class BRIDGELOOM_API UBridgeLoomSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    virtual void Deinitialize() override;

    /** Connect to the Loom server at the given address. */
    UFUNCTION(BlueprintCallable, Category = "BridgeLoom")
    bool ConnectToLoom(const FString& Address, int32 Port);

    /** Disconnect from the Loom server. */
    UFUNCTION(BlueprintCallable, Category = "BridgeLoom")
    void DisconnectFromLoom();

    /** Returns true if currently connected to a Loom server. */
    UFUNCTION(BlueprintPure, Category = "BridgeLoom")
    bool IsConnected() const;

    /** Send player input to the Loom server. */
    UFUNCTION(BlueprintCallable, Category = "BridgeLoom")
    void SendPlayerInput(const FString& PlayerId, const FVector& MoveDirection, float DeltaTime);

private:
    bool bConnected = false;

    // Future: gRPC channel, stub, completion queue
    // TSharedPtr<grpc::Channel> GrpcChannel;
};
