// Copyright Koydo. All Rights Reserved.
// BridgeLoomCrossReality.cpp — Shared-world sessions for VR + flat-screen players.

#include "BridgeLoomCrossReality.h"

// ─── Constructor ──────────────────────────────────────────────────

UBridgeLoomCrossReality::UBridgeLoomCrossReality()
{
    PrimaryComponentTick.bCanEverTick = false;
}

// ─── BeginPlay ────────────────────────────────────────────────────

void UBridgeLoomCrossReality::BeginPlay()
{
    Super::BeginPlay();
    RebuildSessionInfo();
}

// ─── RegisterPlayer ───────────────────────────────────────────────

bool UBridgeLoomCrossReality::RegisterPlayer(const FString& PlayerId,
                                              ELoomViewMode ViewMode)
{
    // Enforce session policy
    if (SessionPolicy == ELoomXRPolicy::VROnly  && ViewMode != ELoomViewMode::VRStereo)
    {
        UE_LOG(LogTemp, Warning,
            TEXT("BridgeLoomCrossReality: Player '%s' rejected — VROnly session, got ViewMode=%d"),
            *PlayerId, (int32)ViewMode);
        return false;
    }
    if (SessionPolicy == ELoomXRPolicy::FlatOnly && ViewMode == ELoomViewMode::VRStereo)
    {
        UE_LOG(LogTemp, Warning,
            TEXT("BridgeLoomCrossReality: Player '%s' rejected — FlatOnly session, VR not allowed"),
            *PlayerId);
        return false;
    }

    // Enforce VR cap
    if (ViewMode == ELoomViewMode::VRStereo && MaxVRPlayers > 0)
    {
        int32 CurrentVR = 0;
        for (const auto& Pair : PlayerInfoMap)
        {
            if (Pair.Value.ViewMode == ELoomViewMode::VRStereo) { ++CurrentVR; }
        }
        if (CurrentVR >= MaxVRPlayers)
        {
            UE_LOG(LogTemp, Warning,
                TEXT("BridgeLoomCrossReality: Player '%s' rejected — VR player cap (%d) reached"),
                *PlayerId, MaxVRPlayers);
            return false;
        }
    }

    FLoomXRPlayerInfo Info;
    Info.PlayerId       = PlayerId;
    Info.ViewMode       = ViewMode;
    Info.bSpatialVoice  = (ViewMode == ELoomViewMode::VRStereo);
    PlayerInfoMap.Add(PlayerId, Info);

    RebuildSessionInfo();
    OnXRSessionStateChanged.Broadcast(CachedSessionInfo);

    UE_LOG(LogTemp, Log,
        TEXT("BridgeLoomCrossReality: Player '%s' registered as ViewMode=%d"),
        *PlayerId, (int32)ViewMode);
    return true;
}

// ─── UnregisterPlayer ─────────────────────────────────────────────

void UBridgeLoomCrossReality::UnregisterPlayer(const FString& PlayerId)
{
    if (PlayerInfoMap.Remove(PlayerId) > 0)
    {
        RebuildSessionInfo();
        OnXRSessionStateChanged.Broadcast(CachedSessionInfo);
    }
}

// ─── SetPlayerViewMode ────────────────────────────────────────────

void UBridgeLoomCrossReality::SetPlayerViewMode(const FString& PlayerId,
                                                  ELoomViewMode NewMode)
{
    FLoomXRPlayerInfo* Info = PlayerInfoMap.Find(PlayerId);
    if (!Info) { return; }

    const ELoomViewMode OldMode = Info->ViewMode;
    if (OldMode == NewMode) { return; }

    Info->ViewMode      = NewMode;
    Info->bSpatialVoice = (NewMode == ELoomViewMode::VRStereo);

    RebuildSessionInfo();
    OnPlayerViewModeChanged.Broadcast(PlayerId, NewMode);
    OnXRSessionStateChanged.Broadcast(CachedSessionInfo);
}

// ─── ReportPointerRay ─────────────────────────────────────────────

void UBridgeLoomCrossReality::ReportPointerRay(const FString& PlayerId,
                                                const FVector& Origin,
                                                const FVector& Direction,
                                                bool bActive)
{
    FLoomXRPlayerInfo* Info = PlayerInfoMap.Find(PlayerId);
    if (!Info) { return; }

    Info->PointerOrigin    = Origin;
    Info->PointerDirection = Direction.GetSafeNormal();
    Info->bPointerActive   = bActive;
}

// ─── GetPointerRay ────────────────────────────────────────────────

bool UBridgeLoomCrossReality::GetPointerRay(const FString& PlayerId,
                                             FVector& OutOrigin,
                                             FVector& OutDirection) const
{
    const FLoomXRPlayerInfo* Info = PlayerInfoMap.Find(PlayerId);
    if (!Info || !Info->bPointerActive) { return false; }

    OutOrigin    = Info->PointerOrigin;
    OutDirection = Info->PointerDirection;
    return true;
}

// ─── GetPlayersOfMode ─────────────────────────────────────────────

TArray<FLoomXRPlayerInfo> UBridgeLoomCrossReality::GetPlayersOfMode(
    ELoomViewMode Mode) const
{
    TArray<FLoomXRPlayerInfo> Result;
    for (const auto& Pair : PlayerInfoMap)
    {
        if (Pair.Value.ViewMode == Mode)
        {
            Result.Add(Pair.Value);
        }
    }
    return Result;
}

// ─── GetSessionInfo ───────────────────────────────────────────────

FLoomXRSessionInfo UBridgeLoomCrossReality::GetSessionInfo() const
{
    return CachedSessionInfo;
}

// ─── IsCrossRealityActive ─────────────────────────────────────────

bool UBridgeLoomCrossReality::IsCrossRealityActive() const
{
    return CachedSessionInfo.bCrossRealityActive;
}

// ─── SetSessionPolicy ─────────────────────────────────────────────

void UBridgeLoomCrossReality::SetSessionPolicy(ELoomXRPolicy Policy)
{
    SessionPolicy = Policy;
    RebuildSessionInfo();
    OnXRSessionStateChanged.Broadcast(CachedSessionInfo);
}

// ─── RebuildSessionInfo ───────────────────────────────────────────

void UBridgeLoomCrossReality::RebuildSessionInfo()
{
    int32 FlatCount = 0;
    int32 VRCount   = 0;

    for (const auto& Pair : PlayerInfoMap)
    {
        if (Pair.Value.ViewMode == ELoomViewMode::VRStereo ||
            Pair.Value.ViewMode == ELoomViewMode::ARPassthrough)
        {
            ++VRCount;
        }
        else
        {
            ++FlatCount;
        }
    }

    CachedSessionInfo.Policy               = SessionPolicy;
    CachedSessionInfo.FlatPlayerCount      = FlatCount;
    CachedSessionInfo.VRPlayerCount        = VRCount;
    CachedSessionInfo.bCrossRealityActive  = (FlatCount > 0 && VRCount > 0);
}
