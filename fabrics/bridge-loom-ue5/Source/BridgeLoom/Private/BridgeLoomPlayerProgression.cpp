// Copyright Koydo. All Rights Reserved.
// BridgeLoomPlayerProgression.cpp

#include "BridgeLoomPlayerProgression.h"
#include "NiagaraFunctionLibrary.h"
#include "NiagaraSystem.h"
#include "GameFramework/Actor.h"
#include "StreamableManager.h"
#include "AssetManager.h"

UBridgeLoomPlayerProgression::UBridgeLoomPlayerProgression()
{
    PrimaryComponentTick.bCanEverTick = false;
}

// ─── Inbound ─────────────────────────────────────────────────────

void UBridgeLoomPlayerProgression::ApplyLevelState(const FLoomPlayerLevel& NewLevel)
{
    const int32 OldLevel = PlayerLevel.CurrentLevel;
    PlayerLevel = NewLevel;

    OnXpChanged.Broadcast(NewLevel.PlayerId, NewLevel);

    if (NewLevel.CurrentLevel > OldLevel)
    {
        for (int32 L = OldLevel + 1; L <= NewLevel.CurrentLevel; ++L)
        {
            OnLevelGained.Broadcast(NewLevel.PlayerId, L);
        }
        SpawnLevelUpVFX();
    }
}

void UBridgeLoomPlayerProgression::RegisterSkillDef(const FLoomSkillDef& Def)
{
    SkillCatalog.Add(Def.SkillId, Def);
}

void UBridgeLoomPlayerProgression::ApplyPlayerSkill(const FLoomPlayerSkill& Skill)
{
    int32* ExistingIdx = nullptr;
    for (int32 I = 0; I < LearnedSkills.Num(); ++I)
    {
        if (LearnedSkills[I].SkillId == Skill.SkillId)
        {
            const bool bUpgraded = Skill.CurrentRank > LearnedSkills[I].CurrentRank;
            LearnedSkills[I] = Skill;
            if (bUpgraded)
            {
                OnSkillUpgraded.Broadcast(Skill);
            }
            return;
        }
    }

    // New skill — first time learned
    LearnedSkills.Add(Skill);
    OnSkillLearned.Broadcast(Skill);
}

void UBridgeLoomPlayerProgression::ApplyProgressionStats(const FLoomProgressionStats& NewStats)
{
    Stats = NewStats;
}

// ─── Outbound ────────────────────────────────────────────────────

void UBridgeLoomPlayerProgression::RequestLearnSkill(const FString& SkillId)
{
    OnLearnSkillRequested.Broadcast(SkillId);
}

void UBridgeLoomPlayerProgression::RequestUpgradeSkill(const FString& SkillId)
{
    OnUpgradeSkillRequested.Broadcast(SkillId);
}

// ─── Queries ─────────────────────────────────────────────────────

bool UBridgeLoomPlayerProgression::HasLearnedSkill(const FString& SkillId) const
{
    for (const FLoomPlayerSkill& S : LearnedSkills)
    {
        if (S.SkillId == SkillId) return true;
    }
    return false;
}

int32 UBridgeLoomPlayerProgression::GetSkillRank(const FString& SkillId) const
{
    for (const FLoomPlayerSkill& S : LearnedSkills)
    {
        if (S.SkillId == SkillId) return S.CurrentRank;
    }
    return 0;
}

bool UBridgeLoomPlayerProgression::IsMaxLevel() const
{
    return PlayerLevel.CurrentLevel >= MaxLevel;
}

// ─── Private ─────────────────────────────────────────────────────

void UBridgeLoomPlayerProgression::SpawnLevelUpVFX()
{
    if (LevelUpVFXTemplate.IsNull()) return;

    AActor* Owner = GetOwner();
    if (!Owner) return;

    const FVector SpawnLoc = Owner->GetActorLocation();

    TWeakObjectPtr<UBridgeLoomPlayerProgression> WeakSelf(this);
    FStreamableDelegate OnLoaded = FStreamableDelegate::CreateLambda([WeakSelf, SpawnLoc]()
    {
        if (!WeakSelf.IsValid()) return;
        UNiagaraSystem* VFX = WeakSelf->LevelUpVFXTemplate.Get();
        if (!VFX) return;
        AActor* Owner = WeakSelf->GetOwner();
        if (!Owner) return;
        UNiagaraFunctionLibrary::SpawnSystemAtLocation(
            Owner->GetWorld(), VFX, SpawnLoc);
    });

    UAssetManager::GetStreamableManager().RequestAsyncLoad(
        LevelUpVFXTemplate.ToSoftObjectPath(), OnLoaded);
}
