// Copyright Project Loom. All Rights Reserved.

using UnrealBuildTool;

public class KoydoWorldsTarget : TargetRules
{
    public KoydoWorldsTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Game;
        DefaultBuildSettings = BuildSettingsVersion.V4;
        IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_4;

        ExtraModuleNames.Add("KoydoWorlds");
    }
}
