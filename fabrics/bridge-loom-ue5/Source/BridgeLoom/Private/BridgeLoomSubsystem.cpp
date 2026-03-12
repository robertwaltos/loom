// Copyright Project Loom. All Rights Reserved.

#include "BridgeLoomSubsystem.h"

void UBridgeLoomSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
    CachedConnection = GetGameInstance()->GetSubsystem<UBridgeLoomConnection>();
    UE_LOG(LogTemp, Log, TEXT("BridgeLoom: Subsystem initialized (delegates to Connection)"));
}

void UBridgeLoomSubsystem::Deinitialize()
{
    CachedConnection = nullptr;
    Super::Deinitialize();
}

bool UBridgeLoomSubsystem::ConnectToLoom(const FString& Address, int32 Port)
{
    if (!CachedConnection)
    {
        return false;
    }

    FLoomConnectionConfig Config;
    Config.Address = Address;
    Config.Port = Port;
    CachedConnection->ConnectToLoom(Config);
    return CachedConnection->IsConnected();
}

void UBridgeLoomSubsystem::DisconnectFromLoom()
{
    if (CachedConnection)
    {
        CachedConnection->DisconnectFromLoom();
    }
}

bool UBridgeLoomSubsystem::IsConnected() const
{
    return CachedConnection && CachedConnection->IsConnected();
}

void UBridgeLoomSubsystem::SendPlayerInput(const FString& PlayerId, const FVector& MoveDirection, float DeltaTime)
{
    if (!CachedConnection || !CachedConnection->IsConnected())
    {
        return;
    }
    CachedConnection->SendPlayerInput(PlayerId, MoveDirection, 0.0f, 0.0f, 0);
}
