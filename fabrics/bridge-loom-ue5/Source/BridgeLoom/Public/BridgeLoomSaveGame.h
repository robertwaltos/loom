// Copyright Koydo. All Rights Reserved.
// BridgeLoomSaveGame.h — UE5 bridge for save-game.ts save/load slot management.
//
// save-game.ts (priority 186) manages a server-side save store:
//   - MAX_SLOTS_PER_PLAYER = 5 named save slots per player entity
//   - SaveSlot:  slotId, playerId, name, createdAt, lastSavedAt, saveCount, sizeBytes
//   - SaveState: saveId, slotId, playerId, data (Record<string, value>), savedAt, checksum
//   - Operations: createSlot, deleteSlot, saveState, loadState, loadLatest, listSlots
//
// UE5 side responsibility:
//   - Mirrors the slot list so the "Save Menu" UI can query it without a round-trip
//   - Fires Blueprint delegates when async save/load operations complete or error
//   - Enforces MaxSlotsPerPlayer client-side to grey out the "New Save" button
//
// Transport layer:
//   RPC requests originate from Blueprint via RequestSave / RequestLoad.
//   The JS transport calls NotifySaveCompleted / NotifyLoadCompleted / NotifySaveError
//   once the server responds.

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomSaveGame.generated.h"

// ─── Structs ───────────────────────────────────────────────────────

/** Mirror of save-game.ts SaveSlot — minimal info for UI rendering. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomSaveSlotInfo
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "SaveGame")
    FString SlotId;

    UPROPERTY(BlueprintReadOnly, Category = "SaveGame")
    FString PlayerId;

    UPROPERTY(BlueprintReadOnly, Category = "SaveGame")
    FString SlotName;

    UPROPERTY(BlueprintReadOnly, Category = "SaveGame")
    int32 SaveCount = 0;

    UPROPERTY(BlueprintReadOnly, Category = "SaveGame")
    int64 SizeBytes = 0;

    /** Unix-ms of most recent save. */
    UPROPERTY(BlueprintReadOnly, Category = "SaveGame")
    int64 LastSavedAtMs = 0;
};

/**
 * Metadata returned by the server after a save or load completes.
 * The actual data payload (Record<string, value>) is handled by the JS
 * transport; this struct just carries the tracking identifiers and checksum.
 */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomSaveStateRecord
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "SaveGame")
    FString SaveId;

    UPROPERTY(BlueprintReadOnly, Category = "SaveGame")
    FString SlotId;

    UPROPERTY(BlueprintReadOnly, Category = "SaveGame")
    FString PlayerId;

    UPROPERTY(BlueprintReadOnly, Category = "SaveGame")
    FString Checksum;

    /** Unix-ms when the state was persisted. */
    UPROPERTY(BlueprintReadOnly, Category = "SaveGame")
    int64 SavedAtMs = 0;
};

/** Aggregate stats for the save-menu header row. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomSaveSummary
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "SaveGame")
    FString PlayerId;

    UPROPERTY(BlueprintReadOnly, Category = "SaveGame")
    int32 TotalSlots = 0;

    UPROPERTY(BlueprintReadOnly, Category = "SaveGame")
    int32 TotalSaves = 0;

    UPROPERTY(BlueprintReadOnly, Category = "SaveGame")
    int64 TotalSizeBytes = 0;
};

// ─── Component ────────────────────────────────────────────────────

/**
 * UBridgeLoomSaveGame — ActorComponent mirroring save-game.ts slot state to
 * Blueprint-accessible data and firing delegates for async save/load callbacks.
 *
 * Typically attached to the Player State or Game Instance actor.
 *
 * Workflow (save):
 *   1. Player opens save menu — Blueprint calls GetSlotList() (local cache).
 *   2. Player chooses "Save to Slot X" — Blueprint calls RequestSave(SlotId).
 *      Transport layer sends the save RPC to the Loom server.
 *   3. Server persists and responds → transport calls NotifySaveCompleted().
 *   4. OnSaveCompleted fires → Blueprint updates UI.
 *
 * Workflow (load):
 *   1. Player chooses "Load Slot X" — Blueprint calls RequestLoad(SlotId).
 *   2. Server loads and responds → transport calls NotifyLoadCompleted().
 *   3. OnLoadCompleted fires → Blueprint applies state.
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent),
       DisplayName = "Loom Save Game")
class BRIDGELOOM_API UBridgeLoomSaveGame : public UActorComponent
{
    GENERATED_BODY()

public:
    UBridgeLoomSaveGame();

    // ── Configuration ─────────────────────────────────────────────

    /** Must match save-game.ts MAX_SLOTS_PER_PLAYER = 5. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "SaveGame|Config",
              meta = (ClampMin = "1", ClampMax = "20"))
    int32 MaxSlotsPerPlayer = 5;

    // ── State (populated by transport callbacks) ───────────────────

    UPROPERTY(BlueprintReadOnly, Category = "SaveGame")
    TArray<FLoomSaveSlotInfo> CachedSlots;

    UPROPERTY(BlueprintReadOnly, Category = "SaveGame")
    FLoomSaveSummary CachedSummary;

    UPROPERTY(BlueprintReadOnly, Category = "SaveGame")
    bool bSaveInProgress = false;

    UPROPERTY(BlueprintReadOnly, Category = "SaveGame")
    bool bLoadInProgress = false;

    // ── Methods (outbound requests) ───────────────────────────────

    /**
     * Initiates a save to an existing slot.
     * Sets bSaveInProgress = true.
     * Fires OnSaveRequested so the transport layer can send the RPC.
     */
    UFUNCTION(BlueprintCallable, Category = "SaveGame")
    void RequestSave(const FString& SlotId);

    /**
     * Initiates a load from an existing slot.
     * Sets bLoadInProgress = true.
     * Fires OnLoadRequested so the transport layer can send the RPC.
     */
    UFUNCTION(BlueprintCallable, Category = "SaveGame")
    void RequestLoad(const FString& SlotId);

    /**
     * Asks the server to create a new named slot.
     * Fires OnCreateSlotRequested.
     */
    UFUNCTION(BlueprintCallable, Category = "SaveGame")
    void RequestCreateSlot(const FString& SlotName);

    /**
     * Asks the server to delete a slot.
     * Fires OnDeleteSlotRequested.
     */
    UFUNCTION(BlueprintCallable, Category = "SaveGame")
    void RequestDeleteSlot(const FString& SlotId);

    // ── Methods (inbound callbacks from transport) ────────────────

    /** Called by transport when save-game.ts confirms the save completed. */
    UFUNCTION(BlueprintCallable, Category = "SaveGame")
    void NotifySaveCompleted(const FLoomSaveSlotInfo& UpdatedSlot,
                             const FLoomSaveStateRecord& StateRecord);

    /** Called by transport when a loaded save state has arrived. */
    UFUNCTION(BlueprintCallable, Category = "SaveGame")
    void NotifyLoadCompleted(const FLoomSaveSlotInfo& Slot,
                             const FLoomSaveStateRecord& StateRecord);

    /** Called by transport on any save/load/create/delete error. */
    UFUNCTION(BlueprintCallable, Category = "SaveGame")
    void NotifySaveError(const FString& ErrorCode, const FString& SlotId);

    /** Called by transport after listing slots (e.g., menu open). */
    UFUNCTION(BlueprintCallable, Category = "SaveGame")
    void ApplySlotList(const TArray<FLoomSaveSlotInfo>& Slots);

    /** Called by transport when save-game.ts emits an updated summary. */
    UFUNCTION(BlueprintCallable, Category = "SaveGame")
    void ApplySummary(const FLoomSaveSummary& Summary);

    // ── Helpers ───────────────────────────────────────────────────

    /** Returns true if another slot can be created (CachedSlots < MaxSlotsPerPlayer). */
    UFUNCTION(BlueprintPure, Category = "SaveGame")
    bool CanCreateNewSlot() const;

    /** Returns the cached slot for SlotId, or an empty struct if not found. */
    UFUNCTION(BlueprintPure, Category = "SaveGame")
    FLoomSaveSlotInfo GetSlot(const FString& SlotId) const;

    // ── Outbound request delegates (transport layer subscribes) ───

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnSaveRequested,
        FString, SlotId);
    UPROPERTY(BlueprintAssignable, Category = "SaveGame|Requests")
    FOnSaveRequested OnSaveRequested;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnLoadRequested,
        FString, SlotId);
    UPROPERTY(BlueprintAssignable, Category = "SaveGame|Requests")
    FOnLoadRequested OnLoadRequested;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnCreateSlotRequested,
        FString, SlotName);
    UPROPERTY(BlueprintAssignable, Category = "SaveGame|Requests")
    FOnCreateSlotRequested OnCreateSlotRequested;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnDeleteSlotRequested,
        FString, SlotId);
    UPROPERTY(BlueprintAssignable, Category = "SaveGame|Requests")
    FOnDeleteSlotRequested OnDeleteSlotRequested;

    // ── Inbound result delegates (Blueprint UI subscribes) ────────

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnSaveCompleted,
        FLoomSaveSlotInfo, SlotInfo, FLoomSaveStateRecord, StateRecord);
    UPROPERTY(BlueprintAssignable, Category = "SaveGame|Events")
    FOnSaveCompleted OnSaveCompleted;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnLoadCompleted,
        FLoomSaveSlotInfo, SlotInfo, FLoomSaveStateRecord, StateRecord);
    UPROPERTY(BlueprintAssignable, Category = "SaveGame|Events")
    FOnLoadCompleted OnLoadCompleted;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnSaveError,
        FString, ErrorCode, FString, SlotId);
    UPROPERTY(BlueprintAssignable, Category = "SaveGame|Events")
    FOnSaveError OnSaveError;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnSlotListRefreshed,
        TArray<FLoomSaveSlotInfo>, Slots);
    UPROPERTY(BlueprintAssignable, Category = "SaveGame|Events")
    FOnSlotListRefreshed OnSlotListRefreshed;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnSaveSummaryRefreshed,
        FLoomSaveSummary, Summary);
    UPROPERTY(BlueprintAssignable, Category = "SaveGame|Events")
    FOnSaveSummaryRefreshed OnSaveSummaryRefreshed;
};
