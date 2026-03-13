// Copyright Project Loom. All Rights Reserved.

using UnrealBuildTool;

public class BridgeLoom : ModuleRules
{
    public BridgeLoom(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(new string[]
        {
            "Core",
            "CoreUObject",
            "Engine",
            "InputCore",
            "EnhancedInput",
            "GameplayAbilities",
            "GameplayTags",
            "GameplayTasks",
            "NetCore",
            "Niagara",
        });

        PrivateDependencyModuleNames.AddRange(new string[]
        {
            "gRPC",
            "FlatBuffers",
            "MetaHumanMeshTracker",
            "RigLogicModule",
            "AnimGraphRuntime",
            "LevelSequence",
            "MovieScene",
            "HairStrandsCore",
            "MassEntity",
        });

        if (Target.bBuildEditor)
        {
            PrivateDependencyModuleNames.Add("UnrealEd");
        }
    }
}
