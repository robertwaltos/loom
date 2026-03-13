// Copyright Koydo. All Rights Reserved.

using UnrealBuildTool;

public class KoydoLoomEditorTarget : TargetRules
{
    public KoydoLoomEditorTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Editor;
        DefaultBuildSettings = BuildSettingsVersion.V5;
        IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5Latest;

        ExtraModuleNames.Add("KoydoLoom");
    }
}
