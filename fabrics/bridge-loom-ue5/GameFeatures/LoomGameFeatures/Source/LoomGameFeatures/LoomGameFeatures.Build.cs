// Copyright Project Loom. All Rights Reserved.

using UnrealBuildTool;

public class LoomGameFeatures : ModuleRules
{
    public LoomGameFeatures(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(new string[]
        {
            "Core",
            "CoreUObject",
            "Engine",
            "InputCore",
            "EnhancedInput",
            "GameFeatures",
            "ModularGameplay",
            "GameplayAbilities",
            "GameplayTags",
            "GameplayTasks",
            "CommonUI",
            "UMG",
        });

        PrivateDependencyModuleNames.AddRange(new string[]
        {
            "BridgeLoom",
            "Slate",
            "SlateCore",
            "Niagara",
        });
    }
}
