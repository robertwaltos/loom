// Copyright Project Loom. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleManager.h"

/**
 * FBridgeLoomModule — UE5 module entry point for the Bridge Loom plugin.
 *
 * This module bridges the Loom server (TypeScript/Rust) to UE5 via gRPC.
 * It receives entity state snapshots, spawns/despawns visual actors,
 * and sends player input + physics events back upstream.
 *
 * Architecture:
 *   Loom Server  ── gRPC ──>  BridgeLoom Plugin  ──>  UE5 World
 *                <── gRPC ──                      <──
 */
class FBridgeLoomModule : public IModuleInterface
{
public:
    virtual void StartupModule() override;
    virtual void ShutdownModule() override;

    static inline FBridgeLoomModule& Get()
    {
        return FModuleManager::LoadModuleChecked<FBridgeLoomModule>("BridgeLoom");
    }

    static inline bool IsAvailable()
    {
        return FModuleManager::Get().IsModuleLoaded("BridgeLoom");
    }
};
