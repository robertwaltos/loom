// Copyright Koydo. All Rights Reserved.
// BridgeLoomDialogue.h — UE5 bridge for the dialogue-bridge.ts conversation system.
//
// dialogue-bridge.ts orchestrates the full conversation pipeline:
//   PlayerInput('talk')
//     → interaction.started(talk)
//       → DialogueBridge.onTalkStarted()
//         → DialoguePort.startConversation()
//           → dialogue.started event       ← UE5 bridge renders UI
//             → dialogue.line.spoken       ← UE5 plays voice, animates NPC
//               → player selects response
//                 → dialogue.completed     ← UE5 closes dialogue UI
//                   → Chronicle entry
//
// This bridge exposes:
//   - FLoomDialogueLine  : one NPC/player text node with response options
//   - FLoomDialogueSession : active conversation metadata
//   - Delegates the UE5 dialogue widget listens to (opened, line, closed)

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomDialogue.generated.h"

// ─── Enumerations ──────────────────────────────────────────────────

/** Who is speaking — mirrors DialogueSpeaker from events-contracts. */
UENUM(BlueprintType)
enum class ELoomDialogueSpeaker : uint8
{
    Npc     UMETA(DisplayName = "NPC"),
    Player  UMETA(DisplayName = "Player"),
};

/** Reason the conversation ended — mirrors DialogueEndReason. */
UENUM(BlueprintType)
enum class ELoomDialogueEndReason : uint8
{
    Natural     UMETA(DisplayName = "Natural — all nodes visited"),
    Abandoned   UMETA(DisplayName = "Abandoned — player quit"),
    Timeout     UMETA(DisplayName = "Timeout — idle too long"),
};

// ─── Structs ───────────────────────────────────────────────────────

/** One player-selectable response option. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomDialogueResponse
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Dialogue")
    FString ResponseId;

    UPROPERTY(BlueprintReadOnly, Category = "Dialogue")
    FString Text;

    /** False if conditions prevent this response (shown but greyed out in UI). */
    UPROPERTY(BlueprintReadOnly, Category = "Dialogue")
    bool bEnabled = true;
};

/** One dialogue node — a line of speech plus optional responses. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomDialogueLine
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Dialogue")
    FString ConversationId;

    UPROPERTY(BlueprintReadOnly, Category = "Dialogue")
    FString NodeId;

    UPROPERTY(BlueprintReadOnly, Category = "Dialogue")
    ELoomDialogueSpeaker Speaker = ELoomDialogueSpeaker::Npc;

    UPROPERTY(BlueprintReadOnly, Category = "Dialogue")
    FString Text;

    UPROPERTY(BlueprintReadOnly, Category = "Dialogue")
    TArray<FLoomDialogueResponse> AvailableResponses;

    /** Microsecond timestamp. */
    UPROPERTY(BlueprintReadOnly, Category = "Dialogue")
    int64 TimestampUs = 0;
};

/** Metadata for the whole active conversation session. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomDialogueSession
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Dialogue")
    FString ConversationId;

    UPROPERTY(BlueprintReadOnly, Category = "Dialogue")
    FString PlayerEntityId;

    UPROPERTY(BlueprintReadOnly, Category = "Dialogue")
    FString NpcEntityId;

    UPROPERTY(BlueprintReadOnly, Category = "Dialogue")
    FString NpcDisplayName;

    UPROPERTY(BlueprintReadOnly, Category = "Dialogue")
    FString TreeId;

    UPROPERTY(BlueprintReadOnly, Category = "Dialogue")
    int32 NodesVisited = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Dialogue")
    int64 StartedAtUs = 0;
};

/** Result fired when a conversation ends. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomDialogueCompletedEvent
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Dialogue")
    FString ConversationId;

    UPROPERTY(BlueprintReadOnly, Category = "Dialogue")
    FString PlayerEntityId;

    UPROPERTY(BlueprintReadOnly, Category = "Dialogue")
    FString NpcEntityId;

    UPROPERTY(BlueprintReadOnly, Category = "Dialogue")
    FString NpcDisplayName;

    UPROPERTY(BlueprintReadOnly, Category = "Dialogue")
    ELoomDialogueEndReason EndReason = ELoomDialogueEndReason::Natural;

    UPROPERTY(BlueprintReadOnly, Category = "Dialogue")
    int32 NodesVisited = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Dialogue")
    int64 TimestampUs = 0;
};

// ─── Component ────────────────────────────────────────────────────

/**
 * UBridgeLoomDialogue — ActorComponent bridging dialogue-bridge.ts events
 * to the UE5 dialogue UI widget, lipsync, and subtitle system.
 *
 * Attach to the Player Controller or a dedicated Dialogue Manager actor.
 *
 * Workflow:
 *  1. Server transport receives dialogue.started event → call BeginDialogue().
 *  2. Server transport receives dialogue.line.spoken   → call ReceiveLine().
 *  3. Player picks a response in the UI widget → UI calls SelectResponse().
 *  4. Server transport receives dialogue.completed     → call EndDialogue().
 *
 * All UE5-side rendering is driven through the Blueprint-assignable delegates.
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent),
       DisplayName = "Loom Dialogue")
class BRIDGELOOM_API UBridgeLoomDialogue : public UActorComponent
{
    GENERATED_BODY()

public:
    UBridgeLoomDialogue();

    // ── Configuration ─────────────────────────────────────────────

    /**
     * Widget class used for the dialogue UI.
     * Spawned on BeginDialogue, hidden on EndDialogue.
     */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Dialogue|Config")
    TSoftClassPtr<class UUserWidget> DialogueWidgetClass;

    /**
     * When true, the bridge auto-shows/hides the dialogue widget.
     * Set false if the owning BP manages widget lifecycle itself.
     */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Dialogue|Config")
    bool bAutoManageWidget = true;

    // ── State ─────────────────────────────────────────────────────

    UPROPERTY(BlueprintReadOnly, Category = "Dialogue")
    FLoomDialogueSession ActiveSession;

    UPROPERTY(BlueprintReadOnly, Category = "Dialogue")
    FLoomDialogueLine CurrentLine;

    UPROPERTY(BlueprintReadOnly, Category = "Dialogue")
    bool bInDialogue = false;

    // ── Methods (called by game transport) ────────────────────────

    /** Called when dialogue.started arrives from the Loom. */
    UFUNCTION(BlueprintCallable, Category = "Dialogue")
    void BeginDialogue(const FLoomDialogueSession& Session);

    /** Called when dialogue.line.spoken arrives from the Loom. */
    UFUNCTION(BlueprintCallable, Category = "Dialogue")
    void ReceiveLine(const FLoomDialogueLine& Line);

    /** Called when dialogue.completed arrives from the Loom. */
    UFUNCTION(BlueprintCallable, Category = "Dialogue")
    void EndDialogue(const FLoomDialogueCompletedEvent& CompletedEvent);

    /**
     * Player selects a response from the dialogue widget.
     * This should be forwarded to the Loom session (via transport) as
     * a selectResponse request — the bridge itself does not advance state.
     */
    UFUNCTION(BlueprintCallable, Category = "Dialogue")
    void SelectResponse(const FString& ResponseId);

    /** Abandon the active dialogue. Sent to Loom as abandonDialogue. */
    UFUNCTION(BlueprintCallable, Category = "Dialogue")
    void AbandonDialogue();

    // ── Delegates ─────────────────────────────────────────────────

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnDialogueStarted,
        FLoomDialogueSession, Session);

    UPROPERTY(BlueprintAssignable, Category = "Dialogue|Events")
    FOnDialogueStarted OnDialogueStarted;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnDialogueLine,
        FLoomDialogueLine, Line);

    UPROPERTY(BlueprintAssignable, Category = "Dialogue|Events")
    FOnDialogueLine OnDialogueLine;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnDialogueEnded,
        FLoomDialogueCompletedEvent, CompletedEvent);

    UPROPERTY(BlueprintAssignable, Category = "Dialogue|Events")
    FOnDialogueEnded OnDialogueEnded;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnResponseSelected,
        FString, ConversationId, FString, ResponseId);

    /** Fired when player selects a response — forward to Loom transport. */
    UPROPERTY(BlueprintAssignable, Category = "Dialogue|Events")
    FOnResponseSelected OnResponseSelected;

    // ── UActorComponent ───────────────────────────────────────────

    virtual void BeginPlay() override;

private:
    UPROPERTY()
    class UUserWidget* DialogueWidgetInstance = nullptr;

    void ShowDialogueWidget();
    void HideDialogueWidget();
};
