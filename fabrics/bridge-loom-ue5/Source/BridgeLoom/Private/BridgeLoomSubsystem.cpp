// Copyright Project Loom. All Rights Reserved.

#include "BridgeLoomSubsystem.h"

void UBridgeLoomSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
    UE_LOG(LogTemp, Log, TEXT("BridgeLoom: Subsystem initialized"));
}

void UBridgeLoomSubsystem::Deinitialize()
{
    DisconnectFromLoom();
    Super::Deinitialize();
}

bool UBridgeLoomSubsystem::ConnectToLoom(const FString& Address, int32 Port)
{
    // TODO: Create gRPC channel to Address:Port
    // GrpcChannel = grpc::CreateChannel(TCHAR_TO_UTF8(*FString::Printf(TEXT("%s:%d"), *Address, Port)), grpc::InsecureChannelCredentials());
    bConnected = true;
    UE_LOG(LogTemp, Log, TEXT("BridgeLoom: Connected to %s:%d"), *Address, Port);
    return true;
}

void UBridgeLoomSubsystem::DisconnectFromLoom()
{
    if (bConnected)
    {
        // TODO: Close gRPC channel
        bConnected = false;
        UE_LOG(LogTemp, Log, TEXT("BridgeLoom: Disconnected"));
    }
}

bool UBridgeLoomSubsystem::IsConnected() const
{
    return bConnected;
}

void UBridgeLoomSubsystem::SendPlayerInput(const FString& PlayerId, const FVector& MoveDirection, float DeltaTime)
{
    if (!bConnected)
    {
        return;
    }
    // TODO: Serialize to FlatBuffers, send via gRPC stream
    UE_LOG(LogTemp, Verbose, TEXT("BridgeLoom: Input from %s dir=(%f,%f,%f) dt=%f"),
        *PlayerId, MoveDirection.X, MoveDirection.Y, MoveDirection.Z, DeltaTime);
}
