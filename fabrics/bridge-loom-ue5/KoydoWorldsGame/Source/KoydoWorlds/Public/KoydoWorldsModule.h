// Copyright Project Loom. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleManager.h"

KOYDO_WORLDS_API DECLARE_LOG_CATEGORY_EXTERN(LogKoydoWorlds, Log, All);

/**
 * FKoydoWorldsModule
 *
 * Primary game module for Koydo Worlds. UE5 is the rendering fabric —
 * the Loom (TypeScript/Rust server) owns world state, entity lifecycle,
 * AI behaviour, identity, economy, and seamless world transitions.
 *
 * This module boots the BridgeLoomSubsystem via GameInstance and
 * registers game-side developer console commands.
 */
class KOYDO_WORLDS_API FKoydoWorldsModule : public IModuleInterface
{
public:
    //~ IModuleInterface
    virtual void StartupModule() override;
    virtual void ShutdownModule() override;
    //~ End IModuleInterface

    /** True once the module has fully initialised. */
    static bool IsReady();

private:
    void RegisterConsoleCommands();
    void UnregisterConsoleCommands();

    TArray<IConsoleObject*> ConsoleCommands;
    static bool bModuleReady;
};
