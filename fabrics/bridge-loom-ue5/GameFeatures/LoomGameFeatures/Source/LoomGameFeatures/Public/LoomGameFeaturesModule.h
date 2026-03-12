// Copyright Project Loom. All Rights Reserved.
// Thread: bridge/bridge-loom-ue5/game-features
// Tier: 1
//
// Loom Game Features module — Registers GameFeature components for
// Dynasty management, Governance, Economy, Combat, and World interaction.

#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleManager.h"

class FLoomGameFeaturesModule : public IModuleInterface
{
public:
	virtual void StartupModule() override;
	virtual void ShutdownModule() override;
};
