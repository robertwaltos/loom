// Copyright Koydo. All Rights Reserved.
// BridgeLoomKindlerProgression.cpp

#include "BridgeLoomKindlerProgression.h"
#include "Engine/World.h"
#include "Materials/MaterialParameterCollection.h"
#include "Materials/MaterialParameterCollectionInstance.h"
#include "NiagaraFunctionLibrary.h"
#include "NiagaraSystem.h"
#include "StreamableManager.h"
#include "AssetRegistry/AssetRegistryModule.h"

// ms per day constant
static constexpr int64 LoomKindler_MsPerDay = 86'400'000LL;

// ── Default Level Definitions (from Bible v5) ─────────────────────
// Spark thresholds and canonical MPC values for 8 levels.
struct FLoomSparkLevelRow
{
    ELoomSparkLevel Level;
    int32 MinSpark;
    int32 MaxSpark;
    float MPCValue;
};

static const FLoomSparkLevelRow KDefaultLevels[] =
{
    { ELoomSparkLevel::NewKindler,    0,    99, 0.0f },
    { ELoomSparkLevel::Ember,       100,   249, 1.0f },
    { ELoomSparkLevel::Flame,       250,   499, 2.0f },
    { ELoomSparkLevel::Torch,       500,   999, 3.0f },
    { ELoomSparkLevel::Beacon,     1000,  1999, 4.0f },
    { ELoomSparkLevel::Star,       2000,  3999, 5.0f },
    { ELoomSparkLevel::Aurora,     4000,  7499, 6.0f },
    { ELoomSparkLevel::Constellation, 7500, INT_MAX, 7.0f },
};

UBridgeLoomKindlerProgression::UBridgeLoomKindlerProgression()
{
    PrimaryComponentTick.bCanEverTick = false;
}

void UBridgeLoomKindlerProgression::BeginPlay()
{
    Super::BeginPlay();
    if (LevelDefinitions.IsEmpty())
    {
        InitDefaultLevelDefs();
    }
}

void UBridgeLoomKindlerProgression::InitDefaultLevelDefs()
{
    LevelDefinitions.Empty();
    for (const FLoomSparkLevelRow& Row : KDefaultLevels)
    {
        FLoomSparkLevelDef Def;
        Def.Level        = Row.Level;
        Def.MinSpark     = Row.MinSpark;
        Def.MaxSpark     = Row.MaxSpark;
        Def.AuraMPCValue = Row.MPCValue;
        LevelDefinitions.Add(Def);
    }
}

// ─── Session Initialization ───────────────────────────────────────

void UBridgeLoomKindlerProgression::InitiateSession(
    FLoomKindlerProgressionState& InOutState,
    int64 NowMs)
{
    ApplyLuminanceDecay(InOutState, NowMs);
    ApplyWelcomeBack(InOutState, NowMs);
    InOutState.LastVisitMs = NowMs;

    // Sync aura material on session load
    UpdateAuraMaterial(GetLevelForSpark(InOutState.TotalSpark));
}

// ─── Spark ────────────────────────────────────────────────────────

FLoomSparkGainResult UBridgeLoomKindlerProgression::AddSpark(
    FLoomKindlerProgressionState& InOutState,
    int32 Amount,
    ELoomSparkAction Reason)
{
    const int32 PrevSpark  = InOutState.TotalSpark;
    const ELoomSparkLevel PrevLevel = GetLevelForSpark(PrevSpark);

    const int32 Gained = FMath::Max(0, Amount);
    InOutState.TotalSpark += Gained;

    const ELoomSparkLevel NewLevel = GetLevelForSpark(InOutState.TotalSpark);
    InOutState.CurrentLevel = NewLevel;

    FLoomSparkGainResult Result;
    Result.PreviousSpark  = PrevSpark;
    Result.NewSpark       = InOutState.TotalSpark;
    Result.SparkGained    = Gained;
    Result.PreviousLevel  = PrevLevel;
    Result.NewLevel       = NewLevel;
    Result.bLeveledUp     = (NewLevel != PrevLevel);

    OnSparkGained.Broadcast(InOutState.KindlerId, Result);

    if (Result.bLeveledUp)
    {
        UpdateAuraMaterial(NewLevel);

        // Async-load and fire level-up VFX
        if (!LevelUpVFXTemplate.IsNull())
        {
            TWeakObjectPtr<UBridgeLoomKindlerProgression> WeakThis(this);
            FStreamableManager& StreamMgr = UAssetManager::GetStreamableManager();
            StreamMgr.RequestAsyncLoad(LevelUpVFXTemplate.ToSoftObjectPath(),
                [WeakThis, NewLevel]()
                {
                    if (WeakThis.IsValid())
                    {
                        UNiagaraSystem* NS = WeakThis->LevelUpVFXTemplate.Get();
                        WeakThis->SpawnVFXAtOwner(NS);
                    }
                });
        }

        OnLevelUp.Broadcast(InOutState.KindlerId, NewLevel);
    }

    return Result;
}

ELoomSparkLevel UBridgeLoomKindlerProgression::GetLevelForSpark(int32 TotalSpark) const
{
    // Walk definitions in reverse to find the highest matching band
    for (int32 i = LevelDefinitions.Num() - 1; i >= 0; --i)
    {
        if (TotalSpark >= LevelDefinitions[i].MinSpark)
        {
            return LevelDefinitions[i].Level;
        }
    }
    return ELoomSparkLevel::NewKindler;
}

// ─── Luminance ────────────────────────────────────────────────────

void UBridgeLoomKindlerProgression::ApplyLuminanceDecay(
    FLoomKindlerProgressionState& InOutState,
    int64 NowMs)
{
    if (InOutState.LastVisitMs <= 0) return;

    const int64 ElapsedMs   = NowMs - InOutState.LastVisitMs;
    const int32 ElapsedDays = (int32)(ElapsedMs / LoomKindler_MsPerDay);
    if (ElapsedDays <= 0) return;

    for (auto& Pair : InOutState.WorldLuminance)
    {
        FLoomWorldLuminance& WL = Pair.Value;
        const int32 MaxDecay = FMath::Min(ElapsedDays * LuminanceDecayPerDay,
                                          LuminanceDecayCap);
        const int32 Floor    = FMath::Max(0, WL.BaseLuminance - MaxDecay);
        const int32 NewLum   = FMath::Max(Floor, WL.Luminance - MaxDecay);

        if (NewLum != WL.Luminance)
        {
            WL.Luminance = NewLum;
            OnLuminanceChanged.Broadcast(WL.WorldId, NewLum);
        }
    }
}

void UBridgeLoomKindlerProgression::BoostWorldLuminance(
    FLoomKindlerProgressionState& InOutState,
    const FString& WorldId,
    int32 BoostAmount)
{
    FLoomWorldLuminance& WL = InOutState.WorldLuminance.FindOrAdd(WorldId);
    WL.WorldId = WorldId;

    const int32 NewLum = FMath::Clamp(WL.Luminance + BoostAmount, 0, 100);
    if (NewLum != WL.Luminance)
    {
        WL.Luminance = NewLum;
        OnLuminanceChanged.Broadcast(WorldId, NewLum);
    }
}

// ─── Welcome Back ─────────────────────────────────────────────────

bool UBridgeLoomKindlerProgression::ApplyWelcomeBack(
    FLoomKindlerProgressionState& InOutState,
    int64 NowMs)
{
    if (InOutState.LastVisitMs <= 0) return false;

    const int64 ElapsedMs   = NowMs - InOutState.LastVisitMs;
    const int32 ElapsedDays = (int32)(ElapsedMs / LoomKindler_MsPerDay);

    if (ElapsedDays < AbsenceThresholdDays) return false;

    // Award spark
    ELoomSparkAction Action = ELoomSparkAction::ReturnAfterAbsence;
    AddSpark(InOutState, WelcomeBackSpark, Action);

    // Spawn petal shower VFX
    if (!WelcomeBackVFXTemplate.IsNull())
    {
        TWeakObjectPtr<UBridgeLoomKindlerProgression> WeakThis(this);
        FStreamableManager& StreamMgr = UAssetManager::GetStreamableManager();
        StreamMgr.RequestAsyncLoad(WelcomeBackVFXTemplate.ToSoftObjectPath(),
            [WeakThis]()
            {
                if (WeakThis.IsValid())
                {
                    UNiagaraSystem* NS = WeakThis->WelcomeBackVFXTemplate.Get();
                    WeakThis->SpawnVFXAtOwner(NS);
                }
            });
    }

    OnWelcomeBack.Broadcast(InOutState.KindlerId);
    return true;
}

// ─── Aura Material ────────────────────────────────────────────────

void UBridgeLoomKindlerProgression::UpdateAuraMaterial(ELoomSparkLevel Level)
{
    if (AuraMPC.IsNull()) return;

    UMaterialParameterCollection* MPC = AuraMPC.LoadSynchronous();
    if (!MPC) return;

    UWorld* World = GetWorld();
    if (!World) return;

    UMaterialParameterCollectionInstance* MPCI = World->GetParameterCollectionInstance(MPC);
    if (!MPCI) return;

    // Find the matching definition for the level
    for (const FLoomSparkLevelDef& Def : LevelDefinitions)
    {
        if (Def.Level == Level)
        {
            MPCI->SetScalarParameterValue(FName("SparkLevel"), Def.AuraMPCValue);
            break;
        }
    }
}

// ─── Helpers ──────────────────────────────────────────────────────

void UBridgeLoomKindlerProgression::SpawnVFXAtOwner(UNiagaraSystem* System)
{
    if (!System) return;
    AActor* Owner = GetOwner();
    if (!Owner) return;

    UNiagaraFunctionLibrary::SpawnSystemAtLocation(
        GetWorld(),
        System,
        Owner->GetActorLocation(),
        Owner->GetActorRotation());
}
