// Copyright Project Loom. All Rights Reserved.

using UnrealBuildTool;

public class KoydoWorldsEditorTarget : TargetRules
{
    public KoydoWorldsEditorTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Editor;
        DefaultBuildSettings = BuildSettingsVersion.V4;
        IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_4;

        ExtraModuleNames.Add("KoydoWorlds");
    }
}
