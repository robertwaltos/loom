// Copyright Koydo. All Rights Reserved.
// BridgeLoomAchievement.cpp

#include "BridgeLoomAchievement.h"
#include "Blueprint/UserWidget.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "NiagaraFunctionLibrary.h"
#include "NiagaraSystem.h"
#include "TimerManager.h"

UBridgeLoomAchievement::UBridgeLoomAchievement()
{
    PrimaryComponentTick.bCanEverTick = false;
}

void UBridgeLoomAchievement::BeginPlay()
{
    Super::BeginPlay();
}

// ─── IsUnlocked ───────────────────────────────────────────────────

bool UBridgeLoomAchievement::IsUnlocked(const FString& AchievementId) const
{
    for (const FLoomPlayerAchievement& PA : UnlockedAchievements)
    {
        if (PA.AchievementId == AchievementId) return true;
    }
    return false;
}

// ─── SpawnUnlockVFX ───────────────────────────────────────────────

void UBridgeLoomAchievement::SpawnUnlockVFX(ELoomAchievementRarity Rarity)
{
    TSoftObjectPtr<UNiagaraSystem>* TemplatePtr = UnlockVFXMap.Find(Rarity);
    if (!TemplatePtr || TemplatePtr->IsNull()) return;

    TWeakObjectPtr<UBridgeLoomAchievement> WeakThis(this);
    TSoftObjectPtr<UNiagaraSystem> TemplateCopy = *TemplatePtr;

    FStreamableManager& StreamMgr = UAssetManager::GetStreamableManager();
    StreamMgr.RequestAsyncLoad(TemplateCopy.ToSoftObjectPath(),
        [WeakThis, TemplateCopy]() mutable
        {
            if (WeakThis.IsValid())
            {
                UNiagaraSystem* NS = TemplateCopy.Get();
                if (NS && WeakThis->GetOwner())
                {
                    UNiagaraFunctionLibrary::SpawnSystemAtLocation(
                        WeakThis->GetWorld(), NS,
                        WeakThis->GetOwner()->GetActorLocation());
                }
            }
        });
}

// ─── ShowToast ────────────────────────────────────────────────────

void UBridgeLoomAchievement::ShowToast(const FLoomAchievementDef& Def)
{
    if (ToastWidgetClass.IsNull()) return;

    UClass* WidgetClass = ToastWidgetClass.LoadSynchronous();
    if (!WidgetClass) return;

    UWorld* World = GetWorld();
    if (!World) return;

    APlayerController* PC = World->GetFirstPlayerController();
    if (!PC) return;

    UUserWidget* Toast = CreateWidget<UUserWidget>(PC, WidgetClass);
    if (!Toast) return;

    Toast->AddToViewport(10);

    // Auto-remove after ToastDurationSeconds
    TWeakObjectPtr<UUserWidget> WeakToast(Toast);
    FTimerHandle Handle;
    World->GetTimerManager().SetTimer(Handle,
        [WeakToast]()
        {
            if (WeakToast.IsValid()) WeakToast->RemoveFromParent();
        },
        ToastDurationSeconds, false);
}

// ─── NotifyUnlock ─────────────────────────────────────────────────

void UBridgeLoomAchievement::NotifyUnlock(const FLoomPlayerAchievement& Unlock,
                                           const FLoomAchievementDef& Def)
{
    // Record in local cache
    UnlockedAchievements.Add(Unlock);

    SpawnUnlockVFX(Def.Rarity);
    ShowToast(Def);
    OnAchievementUnlocked.Broadcast(Unlock, Def);
}

// ─── UpdateProgress ───────────────────────────────────────────────

void UBridgeLoomAchievement::UpdateProgress(const FLoomAchievementProgress& Progress)
{
    // Upsert into ActiveProgress
    bool bFound = false;
    for (FLoomAchievementProgress& P : ActiveProgress)
    {
        if (P.AchievementId == Progress.AchievementId && P.PlayerId == Progress.PlayerId)
        {
            P = Progress;
            bFound = true;
            break;
        }
    }
    if (!bFound)
    {
        ActiveProgress.Add(Progress);
    }

    OnProgressUpdated.Broadcast(Progress);
}

// ─── ApplyPlayerStats ─────────────────────────────────────────────

void UBridgeLoomAchievement::ApplyPlayerStats(const FLoomPlayerAchievementStats& Stats)
{
    PlayerStats = Stats;
    OnStatsRefreshed.Broadcast(Stats);
}
