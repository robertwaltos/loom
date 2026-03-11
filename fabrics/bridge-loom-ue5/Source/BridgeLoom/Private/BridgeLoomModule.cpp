// Copyright Project Loom. All Rights Reserved.

#include "BridgeLoomModule.h"

#define LOCTEXT_NAMESPACE "FBridgeLoomModule"

void FBridgeLoomModule::StartupModule()
{
    // Register gRPC client subsystem, connect to Loom server
    UE_LOG(LogTemp, Log, TEXT("BridgeLoom: Module starting up"));
}

void FBridgeLoomModule::ShutdownModule()
{
    // Disconnect gRPC, cleanup pending state
    UE_LOG(LogTemp, Log, TEXT("BridgeLoom: Module shutting down"));
}

#undef LOCTEXT_NAMESPACE

IMPLEMENT_MODULE(FBridgeLoomModule, BridgeLoom)
