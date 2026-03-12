// Copyright Project Loom. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "BridgeLoomConnection.h"
#include "BridgeLoomSubsystem.generated.h"

/**
 * UBridgeLoomSubsystem — Facade over UBridgeLoomConnection.
 *
 * Provides a simplified API for gameplay code that does not need
 * the full connection configuration. Delegates all real work to
 * UBridgeLoomConnection (the canonical gRPC connection manager).
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

    /** Access the underlying connection subsystem. */
    UFUNCTION(BlueprintPure, Category = "BridgeLoom")
    UBridgeLoomConnection* GetConnection() const { return CachedConnection; }

private:
    UPROPERTY()
    UBridgeLoomConnection* CachedConnection = nullptr;
};
