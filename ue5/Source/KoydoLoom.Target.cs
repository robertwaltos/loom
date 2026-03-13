// Copyright Koydo. All Rights Reserved.

using UnrealBuildTool;

public class KoydoLoomTarget : TargetRules
{
    public KoydoLoomTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Game;
        DefaultBuildSettings = BuildSettingsVersion.V5;
        IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5Latest;

        ExtraModuleNames.Add("KoydoLoom");
    }
}
