// Copyright Project Loom. All Rights Reserved.

#include "KoydoWorldsModule.h"
#include "BridgeLoomSubsystem.h"
#include "Engine/Engine.h"
#include "HAL/IConsoleManager.h"
#include "Logging/LogMacros.h"

DEFINE_LOG_CATEGORY(LogKoydoWorlds);

bool FKoydoWorldsModule::bModuleReady = false;

// ------------------------------------------------------------------ lifecycle

void FKoydoWorldsModule::StartupModule()
{
    UE_LOG(LogKoydoWorlds, Log,
        TEXT("Koydo Worlds module starting — UE5 fabric ready, waiting for Loom connection"));

    RegisterConsoleCommands();
    bModuleReady = true;

    UE_LOG(LogKoydoWorlds, Log,
        TEXT("Koydo Worlds module started. BridgeLoomSubsystem will connect on GameInstance init."));
}

void FKoydoWorldsModule::ShutdownModule()
{
    bModuleReady = false;
    UnregisterConsoleCommands();
    UE_LOG(LogKoydoWorlds, Log, TEXT("Koydo Worlds module shut down"));
}

// ---------------------------------------------------------- console commands

void FKoydoWorldsModule::RegisterConsoleCommands()
{
    ConsoleCommands.Add(IConsoleManager::Get().RegisterConsoleCommand(
        TEXT("Loom.Status"),
        TEXT("Print current BridgeLoom gRPC connection status"),
        FConsoleCommandDelegate::CreateLambda([]()
        {
            if (GEngine)
            {
                GEngine->AddOnScreenDebugMessage(-1, 5.f, FColor::Cyan,
                    TEXT("[Loom] Use Loom.Status — check BridgeLoomSubsystem for live state"));
            }
        }),
        ECVF_Default
    ));

    ConsoleCommands.Add(IConsoleManager::Get().RegisterConsoleCommand(
        TEXT("Loom.Reconnect"),
        TEXT("Force-reconnect to the Loom gRPC server"),
        FConsoleCommandDelegate::CreateLambda([]()
        {
            UE_LOG(LogKoydoWorlds, Warning,
                TEXT("Loom.Reconnect triggered — BridgeLoomSubsystem will handle via DisconnectFromLoom/ConnectToLoom"));
        }),
        ECVF_Default
    ));
}

void FKoydoWorldsModule::UnregisterConsoleCommands()
{
    for (IConsoleObject* Cmd : ConsoleCommands)
    {
        IConsoleManager::Get().UnregisterConsoleObject(Cmd);
    }
    ConsoleCommands.Empty();
}

// ------------------------------------------------------------------- helpers

bool FKoydoWorldsModule::IsReady()
{
    return bModuleReady;
}

IMPLEMENT_PRIMARY_GAME_MODULE(FKoydoWorldsModule, KoydoWorlds, "KoydoWorlds");
