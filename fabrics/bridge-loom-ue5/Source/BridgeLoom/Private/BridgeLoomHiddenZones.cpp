// Copyright Koydo. All Rights Reserved.
// BridgeLoomHiddenZones.cpp

#include "BridgeLoomHiddenZones.h"
#include "EngineUtils.h"
#include "Engine/World.h"
#include "NiagaraFunctionLibrary.h"
#include "NiagaraSystem.h"
#include "Components/StaticMeshComponent.h"
#include "StreamableManager.h"

UBridgeLoomHiddenZones::UBridgeLoomHiddenZones()
{
    PrimaryComponentTick.bCanEverTick = false;
}

void UBridgeLoomHiddenZones::BeginPlay()
{
    Super::BeginPlay();
    if (ZoneDefinitions.IsEmpty())
    {
        InitDefaultZoneDefs();
    }
    RegisterZoneVolumes();
}

// ─── Zone Defaults ────────────────────────────────────────────────

void UBridgeLoomHiddenZones::InitDefaultZoneDefs()
{
    ZoneDefinitions.Empty();

    // 1. The In-Between — linger 10 s in any threadway corridor
    {
        FLoomHiddenZoneDefinition Def;
        Def.ZoneId            = ELoomHiddenZoneId::TheInBetween;
        Def.ZoneName          = TEXT("The In-Between");
        Def.Location          = TEXT("Accessible from any Threadway by stopping in the middle");
        Def.NarrativePurpose  = TEXT("Compass tells stories about connections between subjects");
        Def.AccessWorldId     = TEXT("any-threadway");
        Def.SparkReward       = 15;
        Def.VolumeActorTag    = FName("LoomHiddenZone_InBetween");

        FLoomDiscoveryTrigger Trig;
        Trig.Type              = ELoomDiscoveryTriggerType::LingerInThreadway;
        Trig.Description       = TEXT("Stand still in a Threadway for 10 seconds");
        Trig.LingerDurationMs  = 10000;
        Trig.RequiredEntryCount = 0;
        Trig.bRequiresNightCycle = false;
        Def.DiscoveryTrigger   = Trig;

        ZoneDefinitions.Add(Def);
    }

    // 2. The Inverse Garden — complete all entries in Number Garden
    {
        FLoomHiddenZoneDefinition Def;
        Def.ZoneId            = ELoomHiddenZoneId::InverseGarden;
        Def.ZoneName          = TEXT("The Inverse Garden");
        Def.Location          = TEXT("Under the Number Garden, accessible through the Zero Pool");
        Def.NarrativePurpose  = TEXT("Dottie says this is where subtraction lives");
        Def.AccessWorldId     = TEXT("number-garden");
        Def.SparkReward       = 15;
        Def.VolumeActorTag    = FName("LoomHiddenZone_InverseGarden");

        FLoomDiscoveryTrigger Trig;
        Trig.Type              = ELoomDiscoveryTriggerType::CompleteAllEntries;
        Trig.Description       = TEXT("Complete all entries in Number Garden");
        Trig.RequiredWorldId   = TEXT("number-garden");
        Trig.RequiredEntryCount = 0;
        Trig.bRequiresNightCycle = false;
        Def.DiscoveryTrigger   = Trig;

        ZoneDefinitions.Add(Def);
    }

    // 3. The Whale's Library — follow Compass to the ocean floor
    {
        FLoomHiddenZoneDefinition Def;
        Def.ZoneId            = ELoomHiddenZoneId::WhalesLibrary;
        Def.ZoneName          = TEXT("The Whale's Library");
        Def.Location          = TEXT("Ocean floor of Tideline Bay, accessible by following Compass");
        Def.NarrativePurpose  = TEXT("Ancient knowledge preserved in whale song — cross-subject archive");
        Def.AccessWorldId     = TEXT("tideline-bay");
        Def.SparkReward       = 15;
        Def.VolumeActorTag    = FName("LoomHiddenZone_WhalesLibrary");

        FLoomDiscoveryTrigger Trig;
        Trig.Type            = ELoomDiscoveryTriggerType::FollowNPC;
        Trig.Description     = TEXT("Follow Compass to the ocean floor");
        Trig.RequiredNpcTag  = FName("LoomNPC_Compass");
        Trig.RequiredWorldId = TEXT("tideline-bay");
        Trig.bRequiresNightCycle = false;
        Def.DiscoveryTrigger = Trig;

        ZoneDefinitions.Add(Def);
    }

    // 4. The Unfinished Room — complete all entries, then ask Compass
    {
        FLoomHiddenZoneDefinition Def;
        Def.ZoneId            = ELoomHiddenZoneId::UnfinishedRoom;
        Def.ZoneName          = TEXT("The Unfinished Room");
        Def.Location          = TEXT("Behind the Hub's back wall");
        Def.NarrativePurpose  = TEXT("Future worlds in progress — Compass shows you what comes next");
        Def.AccessWorldId     = TEXT("hub");
        Def.SparkReward       = 15;
        Def.VolumeActorTag    = FName("LoomHiddenZone_UnfinishedRoom");

        FLoomDiscoveryTrigger Trig;
        Trig.Type              = ELoomDiscoveryTriggerType::CompleteEntriesAndAsk;
        Trig.Description       = TEXT("Complete all available entries and ask Compass about the future");
        Trig.RequiredWorldId   = TEXT("hub");
        Trig.RequiredEntryCount = 50;
        Trig.RequiredNpcTag    = FName("LoomNPC_Compass");
        Trig.bRequiresNightCycle = false;
        Def.DiscoveryTrigger   = Trig;

        ZoneDefinitions.Add(Def);
    }

    // 5. The Dream Archive — night cycle + 10 completed entries
    {
        FLoomHiddenZoneDefinition Def;
        Def.ZoneId            = ELoomHiddenZoneId::DreamArchive;
        Def.ZoneName          = TEXT("The Dream Archive");
        Def.Location          = TEXT("A pocket dimension accessible from the Hub at night");
        Def.NarrativePurpose  = TEXT("All completed entries dreamform — personal museum of learning");
        Def.AccessWorldId     = TEXT("hub");
        Def.SparkReward       = 15;
        Def.VolumeActorTag    = FName("LoomHiddenZone_DreamArchive");

        FLoomDiscoveryTrigger Trig;
        Trig.Type               = ELoomDiscoveryTriggerType::TimeAndEntryCount;
        Trig.Description        = TEXT("Visit the Hub at night after completing 10+ entries");
        Trig.RequiredWorldId    = TEXT("hub");
        Trig.RequiredEntryCount = 10;
        Trig.bRequiresNightCycle = true;
        Def.DiscoveryTrigger    = Trig;

        ZoneDefinitions.Add(Def);
    }
}

// ─── Volume Registry ──────────────────────────────────────────────

void UBridgeLoomHiddenZones::RegisterZoneVolumes()
{
    UWorld* World = GetWorld();
    if (!World) return;

    ZoneVolumeMap.Empty();

    for (TActorIterator<AActor> It(World); It; ++It)
    {
        AActor* Actor = *It;
        if (!Actor || !Actor->ActorHasTag(FName("LoomHiddenZoneVolume"))) continue;

        for (const FLoomHiddenZoneDefinition& Def : ZoneDefinitions)
        {
            if (Actor->ActorHasTag(Def.VolumeActorTag))
            {
                ZoneVolumeMap.Add(Def.ZoneId, Actor);
                break;
            }
        }
    }
}

void UBridgeLoomHiddenZones::RegisterZoneVolume(ELoomHiddenZoneId ZoneId,
                                                  AActor* VolumeActor)
{
    if (VolumeActor)
    {
        ZoneVolumeMap.Add(ZoneId, VolumeActor);
    }
}

// ─── Linger Tracking ──────────────────────────────────────────────

void UBridgeLoomHiddenZones::OnThreadwayEntered(FLoomKindlerZoneState& InOutState,
                                                  int64 NowMs)
{
    InOutState.ThreadwayLingerStartMs = NowMs;
}

bool UBridgeLoomHiddenZones::EvaluateLinger(FLoomKindlerZoneState& InOutState,
                                              int64 NowMs)
{
    if (InOutState.ThreadwayLingerStartMs <= 0) return false;
    if (InOutState.DiscoveredZoneIds.Contains(ELoomHiddenZoneId::TheInBetween))
        return false;

    // Locate the In-Between definition
    for (const FLoomHiddenZoneDefinition& Def : ZoneDefinitions)
    {
        if (Def.ZoneId != ELoomHiddenZoneId::TheInBetween) continue;
        const int64 Elapsed = NowMs - InOutState.ThreadwayLingerStartMs;
        if (Elapsed >= Def.DiscoveryTrigger.LingerDurationMs)
        {
            MarkDiscovered(InOutState, ELoomHiddenZoneId::TheInBetween);
            return true;
        }
    }
    return false;
}

// ─── Discovery Evaluation ────────────────────────────────────────

TArray<FLoomZoneDiscoveryResult> UBridgeLoomHiddenZones::EvaluateDiscovery(
    FLoomKindlerZoneState& InOutState,
    int32 CurrentHour,
    int64 NowMs)
{
    TArray<FLoomZoneDiscoveryResult> Results;

    for (const FLoomHiddenZoneDefinition& Def : ZoneDefinitions)
    {
        if (InOutState.DiscoveredZoneIds.Contains(Def.ZoneId)) continue;

        bool bMet = false;

        switch (Def.DiscoveryTrigger.Type)
        {
            case ELoomDiscoveryTriggerType::LingerInThreadway:
                // Handled by EvaluateLinger — skip here
                break;

            case ELoomDiscoveryTriggerType::CompleteAllEntries:
                bMet = !Def.DiscoveryTrigger.RequiredWorldId.IsEmpty()
                    && InOutState.CompletedWorldIds.Contains(Def.DiscoveryTrigger.RequiredWorldId);
                break;

            case ELoomDiscoveryTriggerType::FollowNPC:
                // NPC follow completion must be signalled externally via MarkDiscovered
                break;

            case ELoomDiscoveryTriggerType::CompleteEntriesAndAsk:
                // Entry + NPC interaction signalled externally; entry count check
                bMet = InOutState.CompletedEntryCount >= Def.DiscoveryTrigger.RequiredEntryCount;
                break;

            case ELoomDiscoveryTriggerType::TimeAndEntryCount:
                bMet = InOutState.CompletedEntryCount >= Def.DiscoveryTrigger.RequiredEntryCount
                    && (!Def.DiscoveryTrigger.bRequiresNightCycle || IsNightCycle(CurrentHour));
                break;
        }

        if (bMet)
        {
            Results.Add(MarkDiscovered(InOutState, Def.ZoneId));
        }
    }

    return Results;
}

FLoomZoneDiscoveryResult UBridgeLoomHiddenZones::MarkDiscovered(
    FLoomKindlerZoneState& InOutState,
    ELoomHiddenZoneId ZoneId)
{
    FLoomZoneDiscoveryResult Result;
    Result.ZoneId = ZoneId;

    if (InOutState.DiscoveredZoneIds.Contains(ZoneId))
    {
        Result.bDiscovered  = false;
        Result.SparkGained  = 0;
        Result.Message      = TEXT("Already discovered");
        return Result;
    }

    // Find spark reward
    int32 Reward = 15;
    for (const FLoomHiddenZoneDefinition& Def : ZoneDefinitions)
    {
        if (Def.ZoneId == ZoneId) { Reward = Def.SparkReward; break; }
    }

    InOutState.DiscoveredZoneIds.Add(ZoneId);

    Result.bDiscovered = true;
    Result.SparkGained = Reward;
    Result.Message     = TEXT("Zone discovered!");

    TriggerZoneReveal(ZoneId);
    OnZoneDiscovered.Broadcast(ZoneId, Reward);

    return Result;
}

bool UBridgeLoomHiddenZones::IsZoneDiscovered(const FLoomKindlerZoneState& State,
                                               ELoomHiddenZoneId ZoneId) const
{
    return State.DiscoveredZoneIds.Contains(ZoneId);
}

// ─── Internal Helpers ────────────────────────────────────────────

void UBridgeLoomHiddenZones::TriggerZoneReveal(ELoomHiddenZoneId ZoneId)
{
    // Spawn discovery burst at the registered volume location
    if (TWeakObjectPtr<AActor>* ActorPtr = ZoneVolumeMap.Find(ZoneId))
    {
        if (ActorPtr->IsValid() && !DiscoveryVFXTemplate.IsNull())
        {
            TWeakObjectPtr<UBridgeLoomHiddenZones> WeakThis(this);
            const FVector Location = (*ActorPtr)->GetActorLocation();

            FStreamableManager& StreamMgr = UAssetManager::GetStreamableManager();
            StreamMgr.RequestAsyncLoad(DiscoveryVFXTemplate.ToSoftObjectPath(),
                [WeakThis, Location]()
                {
                    if (WeakThis.IsValid())
                    {
                        UNiagaraSystem* NS = WeakThis->DiscoveryVFXTemplate.Get();
                        if (NS)
                        {
                            UNiagaraFunctionLibrary::SpawnSystemAtLocation(
                                WeakThis->GetWorld(), NS, Location);
                        }
                    }
                });
        }
    }
}

bool UBridgeLoomHiddenZones::IsNightCycle(int32 CurrentHour) const
{
    // Night: 21:00–05:00 (matches seasonal-content.ts NIGHT_START / NIGHT_END)
    return CurrentHour >= NightStartHour || CurrentHour < 5;
}
