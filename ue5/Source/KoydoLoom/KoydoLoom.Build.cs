// Copyright Koydo. All Rights Reserved.

using UnrealBuildTool;

// Minimal game module. All gameplay code lives in the BridgeLoom plugin.
// This module exists solely so UE5 has a named game target to compile.
public class KoydoLoom : ModuleRules
{
    public KoydoLoom(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(new string[]
        {
            "Core",
            "CoreUObject",
            "Engine",
            "InputCore",
        });
    }
}
