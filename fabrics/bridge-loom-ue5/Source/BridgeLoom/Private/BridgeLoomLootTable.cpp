// Copyright Koydo. All Rights Reserved.
// BridgeLoomLootTable.cpp

#include "BridgeLoomLootTable.h"
#include "Engine/StreamableManager.h"
#include "Engine/AssetManager.h"
#include "NiagaraFunctionLibrary.h"

UBridgeLoomLootTable::UBridgeLoomLootTable()
{
    PrimaryComponentTick.bCanEverTick = false;
}

void UBridgeLoomLootTable::NotifyLootRoll(const FLoomLootRoll& Roll,
                                           const FVector& WorldDropLocation)
{
    LastRoll = Roll;

    for (const FLoomDroppedItem& Item : Roll.Items)
    {
        // Accumulate session totals.
        int32& Total = SessionItemTotals.FindOrAdd(Item.ItemId);
        Total += Item.Quantity;

        // Per-item VFX.
        SpawnItemVFX(Item.Rarity, WorldDropLocation);

        // Per-item delegate.
        OnItemDropped.Broadcast(Item, WorldDropLocation);

        // Rare+ shortcut delegate.
        if (Item.Rarity >= ELoomLootRarity::Rare)
        {
            OnRareItemDropped.Broadcast(Item, WorldDropLocation);
        }
    }

    OnLootRollReceived.Broadcast(Roll);
}

TArray<FLoomDroppedItem> UBridgeLoomLootTable::GetLastRollByRarity(
    ELoomLootRarity Rarity) const
{
    TArray<FLoomDroppedItem> Result;
    for (const FLoomDroppedItem& Item : LastRoll.Items)
    {
        if (Item.Rarity == Rarity)
        {
            Result.Add(Item);
        }
    }
    return Result;
}

int32 UBridgeLoomLootTable::GetSessionItemCount(const FString& ItemId) const
{
    const int32* Count = SessionItemTotals.Find(ItemId);
    return Count ? *Count : 0;
}

// ── Private ───────────────────────────────────────────────────────────────────

void UBridgeLoomLootTable::SpawnItemVFX(ELoomLootRarity Rarity,
                                         const FVector& Location)
{
    const TSoftObjectPtr<UNiagaraSystem>* TemplatePtr = RarityVFXMap.Find(Rarity);
    if (!TemplatePtr || TemplatePtr->IsNull())
    {
        return;
    }

    TWeakObjectPtr<UBridgeLoomLootTable> WeakSelf(this);
    const FVector CaptureLoc = Location;
    TSoftObjectPtr<UNiagaraSystem> CaptureTemplate = *TemplatePtr;

    FStreamableManager& Manager = UAssetManager::GetStreamableManager();
    Manager.RequestAsyncLoad(
        CaptureTemplate.ToSoftObjectPath(),
        [WeakSelf, CaptureLoc, CaptureTemplate]()
        {
            if (!WeakSelf.IsValid()) return;
            if (UNiagaraSystem* NS = CaptureTemplate.Get())
            {
                if (UWorld* World = WeakSelf->GetWorld())
                {
                    UNiagaraFunctionLibrary::SpawnSystemAtLocation(
                        World, NS, CaptureLoc);
                }
            }
        });
}
