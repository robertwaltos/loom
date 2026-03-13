// Copyright Koydo. All Rights Reserved.
// BridgeLoomInteraction.h — UE5 bridge for interaction-system.ts proximity detection.
//
// interaction-system.ts (priority 180) scans every 2 ticks:
//   1. Finds entities with InteractionComponent
//   2. Measures distance to all players → fires 'available' / 'unavailable'
//   3. Listens for PlayerInput actions (talk, trade, inspect, use, pickup)
//   4. Fires 'started' → 'completed' (inspect/pickup auto-complete immediately)
//
// UE5 side:
//   - Shows/hides the interaction prompt widget when range changes
//   - Plays entry/exit audio cues
//   - Drives the contextual interaction radial menu
//   - Interactable objects within range are highlighted by the Post-Process outline

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomInteraction.generated.h"

// ─── Enums ─────────────────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomInteractionKind : uint8
{
    Talk    UMETA(DisplayName = "Talk"),
    Trade   UMETA(DisplayName = "Trade"),
    Inspect UMETA(DisplayName = "Inspect"),
    Use     UMETA(DisplayName = "Use"),
    Pickup  UMETA(DisplayName = "Pickup"),
};

UENUM(BlueprintType)
enum class ELoomInteractionEventType : uint8
{
    Available   UMETA(DisplayName = "Available"),
    Unavailable UMETA(DisplayName = "Unavailable"),
    Started     UMETA(DisplayName = "Started"),
    Completed   UMETA(DisplayName = "Completed"),
};

// ─── Structs ───────────────────────────────────────────────────────

/** Mirrors interaction-system.ts InteractionEvent. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomInteractionEvent
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Interaction")
    ELoomInteractionEventType EventType = ELoomInteractionEventType::Available;

    UPROPERTY(BlueprintReadOnly, Category = "Interaction")
    FString PlayerEntityId;

    UPROPERTY(BlueprintReadOnly, Category = "Interaction")
    FString TargetEntityId;

    UPROPERTY(BlueprintReadOnly, Category = "Interaction")
    FString TargetDisplayName;

    UPROPERTY(BlueprintReadOnly, Category = "Interaction")
    TArray<ELoomInteractionKind> AvailableInteractions;

    /** Null/default when EventType is Available or Unavailable. */
    UPROPERTY(BlueprintReadOnly, Category = "Interaction")
    ELoomInteractionKind InteractionKind = ELoomInteractionKind::Talk;

    UPROPERTY(BlueprintReadOnly, Category = "Interaction")
    bool bHasInteractionKind = false;

    UPROPERTY(BlueprintReadOnly, Category = "Interaction")
    FString WorldId;

    UPROPERTY(BlueprintReadOnly, Category = "Interaction")
    int64 TimestampUs = 0;
};

// ─── Component ────────────────────────────────────────────────────

/**
 * UBridgeLoomInteraction — ActorComponent bridging the interaction-system.ts
 * proximity-scan events to UE5 prompt widgets, audio triggers, and outline
 * post-process effects.
 *
 * Attach to the owning player Pawn or Player Controller.
 *
 * Inbound workflow:
 *   Transport receives interaction event → calls NotifyInteractionEvent(Event)
 *   → Bridge manages prompt widget visibility, fires Blueprint delegates.
 *
 * Outbound workflow:
 *   Player presses interaction key → Blueprint calls RequestInteraction(Kind, TargetId)
 *   → OnInteractionRequested fires → transport forwards to server.
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent),
       DisplayName = "Loom Interaction")
class BRIDGELOOM_API UBridgeLoomInteraction : public UActorComponent
{
    GENERATED_BODY()

public:
    UBridgeLoomInteraction();

    // ── Configuration ─────────────────────────────────────────────

    /** Widget shown above interactable objects. Loaded on-demand. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Interaction|UI")
    TSoftClassPtr<class UUserWidget> InteractionPromptWidgetClass;

    /** Whether the bridge manages the widget lifecycle automatically. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Interaction|UI")
    bool bAutoManagePromptWidget = true;

    // ── State ─────────────────────────────────────────────────────

    /** Entities currently in interaction range (TargetEntityId strings). */
    UPROPERTY(BlueprintReadOnly, Category = "Interaction")
    TSet<FString> EntitiesInRange;

    /** The entity the player most recently started an interaction with. */
    UPROPERTY(BlueprintReadOnly, Category = "Interaction")
    FString ActiveInteractionTargetId;

    UPROPERTY(BlueprintReadOnly, Category = "Interaction")
    bool bIsInteracting = false;

    // ── Inbound (from transport) ──────────────────────────────────

    /**
     * Main callback — called by transport for all interaction event types.
     * Dispatches to per-event handlers and fires Blueprint delegates.
     */
    UFUNCTION(BlueprintCallable, Category = "Interaction")
    void NotifyInteractionEvent(const FLoomInteractionEvent& Event);

    // ── Outbound (player intent → transport) ─────────────────────

    /**
     * Call when the player presses the interaction key.
     * Fires OnInteractionRequested for the transport to forward.
     */
    UFUNCTION(BlueprintCallable, Category = "Interaction")
    void RequestInteraction(ELoomInteractionKind Kind, const FString& TargetEntityId);

    // ── Queries ───────────────────────────────────────────────────

    UFUNCTION(BlueprintPure, Category = "Interaction")
    bool IsEntityInRange(const FString& TargetEntityId) const;

    UFUNCTION(BlueprintPure, Category = "Interaction")
    int32 GetEntitiesInRangeCount() const;

    // ── Delegates (inbound) ───────────────────────────────────────

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnInteractionAvailable,
        FLoomInteractionEvent, Event);
    /** Fired when a new interactable enters proximity. */
    UPROPERTY(BlueprintAssignable, Category = "Interaction|Events")
    FOnInteractionAvailable OnInteractionAvailable;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnInteractionUnavailable,
        FLoomInteractionEvent, Event);
    /** Fired when an interactable leaves proximity. */
    UPROPERTY(BlueprintAssignable, Category = "Interaction|Events")
    FOnInteractionUnavailable OnInteractionUnavailable;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnInteractionStarted,
        FLoomInteractionEvent, Event);
    UPROPERTY(BlueprintAssignable, Category = "Interaction|Events")
    FOnInteractionStarted OnInteractionStarted;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnInteractionCompleted,
        FLoomInteractionEvent, Event);
    UPROPERTY(BlueprintAssignable, Category = "Interaction|Events")
    FOnInteractionCompleted OnInteractionCompleted;

    // ── Delegates (outbound) ──────────────────────────────────────

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnInteractionRequested,
        ELoomInteractionKind, Kind, FString, TargetEntityId);
    /** Transport layer subscribes to send the RPC. */
    UPROPERTY(BlueprintAssignable, Category = "Interaction|Requests")
    FOnInteractionRequested OnInteractionRequested;

private:
    TWeakObjectPtr<UUserWidget> PromptWidget;

    void ShowPromptWidget();
    void HidePromptWidget();
};
