// Copyright Project Loom. All Rights Reserved.

#include "LoomGameFeaturesModule.h"

#define LOCTEXT_NAMESPACE "FLoomGameFeaturesModule"

void FLoomGameFeaturesModule::StartupModule()
{
	UE_LOG(LogTemp, Log, TEXT("LoomGameFeatures module starting"));
}

void FLoomGameFeaturesModule::ShutdownModule()
{
	UE_LOG(LogTemp, Log, TEXT("LoomGameFeatures module shutting down"));
}

#undef LOCTEXT_NAMESPACE

IMPLEMENT_MODULE(FLoomGameFeaturesModule, LoomGameFeatures)
