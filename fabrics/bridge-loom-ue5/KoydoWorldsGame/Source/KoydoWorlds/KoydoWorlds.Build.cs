// Copyright Project Loom. All Rights Reserved.

using UnrealBuildTool;

public class KoydoWorlds : ModuleRules
{
    public KoydoWorlds(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
        CppStandard = CppStandardVersion.Cpp20;

        PublicDependencyModuleNames.AddRange(new string[]
        {
            "Core",
            "CoreUObject",
            "Engine",
            "InputCore",
            "EnhancedInput",
            "GameplayAbilities",
            "GameplayTags",
            "NetCore",
            "MassEntity",
            "MassSpawner",
        });

        PrivateDependencyModuleNames.AddRange(new string[]
        {
            "BridgeLoom",
            "Slate",
            "SlateCore",
            "DeveloperSettings",
        });

        if (Target.bBuildEditor)
        {
            PrivateDependencyModuleNames.Add("UnrealEd");
        }
    }
}
