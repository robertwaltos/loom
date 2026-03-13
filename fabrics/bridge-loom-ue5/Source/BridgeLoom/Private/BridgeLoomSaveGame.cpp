// Copyright Koydo. All Rights Reserved.
// BridgeLoomSaveGame.cpp

#include "BridgeLoomSaveGame.h"

UBridgeLoomSaveGame::UBridgeLoomSaveGame()
{
    PrimaryComponentTick.bCanEverTick = false;
}

// ── Outbound request helpers ──────────────────────────────────────────────────

void UBridgeLoomSaveGame::RequestSave(const FString& SlotId)
{
    if (bSaveInProgress)
    {
        UE_LOG(LogTemp, Warning,
               TEXT("UBridgeLoomSaveGame: save already in progress, ignoring RequestSave for slot %s"),
               *SlotId);
        return;
    }

    bSaveInProgress = true;
    OnSaveRequested.Broadcast(SlotId);
}

void UBridgeLoomSaveGame::RequestLoad(const FString& SlotId)
{
    if (bLoadInProgress)
    {
        UE_LOG(LogTemp, Warning,
               TEXT("UBridgeLoomSaveGame: load already in progress, ignoring RequestLoad for slot %s"),
               *SlotId);
        return;
    }

    bLoadInProgress = true;
    OnLoadRequested.Broadcast(SlotId);
}

void UBridgeLoomSaveGame::RequestCreateSlot(const FString& SlotName)
{
    if (!CanCreateNewSlot())
    {
        UE_LOG(LogTemp, Warning,
               TEXT("UBridgeLoomSaveGame: max slots (%d) reached, cannot create '%s'"),
               MaxSlotsPerPlayer, *SlotName);
        return;
    }

    OnCreateSlotRequested.Broadcast(SlotName);
}

void UBridgeLoomSaveGame::RequestDeleteSlot(const FString& SlotId)
{
    OnDeleteSlotRequested.Broadcast(SlotId);
}

// ── Inbound callbacks ─────────────────────────────────────────────────────────

void UBridgeLoomSaveGame::NotifySaveCompleted(const FLoomSaveSlotInfo& UpdatedSlot,
                                               const FLoomSaveStateRecord& StateRecord)
{
    bSaveInProgress = false;

    // Upsert updated slot into the cache.
    bool bFound = false;
    for (FLoomSaveSlotInfo& Existing : CachedSlots)
    {
        if (Existing.SlotId == UpdatedSlot.SlotId)
        {
            Existing = UpdatedSlot;
            bFound   = true;
            break;
        }
    }
    if (!bFound)
    {
        CachedSlots.Add(UpdatedSlot);
    }

    OnSaveCompleted.Broadcast(UpdatedSlot, StateRecord);
}

void UBridgeLoomSaveGame::NotifyLoadCompleted(const FLoomSaveSlotInfo& Slot,
                                               const FLoomSaveStateRecord& StateRecord)
{
    bLoadInProgress = false;
    OnLoadCompleted.Broadcast(Slot, StateRecord);
}

void UBridgeLoomSaveGame::NotifySaveError(const FString& ErrorCode, const FString& SlotId)
{
    bSaveInProgress = false;
    bLoadInProgress = false;

    UE_LOG(LogTemp, Error,
           TEXT("UBridgeLoomSaveGame: save error [%s] for slot '%s'"),
           *ErrorCode, *SlotId);

    OnSaveError.Broadcast(ErrorCode, SlotId);
}

void UBridgeLoomSaveGame::ApplySlotList(const TArray<FLoomSaveSlotInfo>& Slots)
{
    CachedSlots = Slots;
    OnSlotListRefreshed.Broadcast(CachedSlots);
}

void UBridgeLoomSaveGame::ApplySummary(const FLoomSaveSummary& Summary)
{
    CachedSummary = Summary;
    OnSaveSummaryRefreshed.Broadcast(CachedSummary);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

bool UBridgeLoomSaveGame::CanCreateNewSlot() const
{
    return CachedSlots.Num() < MaxSlotsPerPlayer;
}

FLoomSaveSlotInfo UBridgeLoomSaveGame::GetSlot(const FString& SlotId) const
{
    for (const FLoomSaveSlotInfo& Slot : CachedSlots)
    {
        if (Slot.SlotId == SlotId)
        {
            return Slot;
        }
    }
    return FLoomSaveSlotInfo{};
}
