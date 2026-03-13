// Copyright Koydo. All Rights Reserved.
// BridgeLoomDialogue.cpp

#include "BridgeLoomDialogue.h"
#include "Blueprint/UserWidget.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"

UBridgeLoomDialogue::UBridgeLoomDialogue()
{
    PrimaryComponentTick.bCanEverTick = false;
}

void UBridgeLoomDialogue::BeginPlay()
{
    Super::BeginPlay();
}

// ─── Widget Helpers ───────────────────────────────────────────────

void UBridgeLoomDialogue::ShowDialogueWidget()
{
    if (!bAutoManageWidget || DialogueWidgetClass.IsNull()) return;

    if (DialogueWidgetInstance) return; // already shown

    UClass* WidgetClass = DialogueWidgetClass.LoadSynchronous();
    if (!WidgetClass) return;

    APlayerController* PC = Cast<APlayerController>(GetOwner());
    if (!PC) PC = GetWorld() ? GetWorld()->GetFirstPlayerController() : nullptr;
    if (!PC) return;

    DialogueWidgetInstance = CreateWidget<UUserWidget>(PC, WidgetClass);
    if (DialogueWidgetInstance)
    {
        DialogueWidgetInstance->AddToViewport();
    }
}

void UBridgeLoomDialogue::HideDialogueWidget()
{
    if (!bAutoManageWidget) return;
    if (DialogueWidgetInstance)
    {
        DialogueWidgetInstance->RemoveFromParent();
        DialogueWidgetInstance = nullptr;
    }
}

// ─── BeginDialogue ────────────────────────────────────────────────

void UBridgeLoomDialogue::BeginDialogue(const FLoomDialogueSession& Session)
{
    ActiveSession = Session;
    bInDialogue   = true;

    ShowDialogueWidget();
    OnDialogueStarted.Broadcast(Session);
}

// ─── ReceiveLine ──────────────────────────────────────────────────

void UBridgeLoomDialogue::ReceiveLine(const FLoomDialogueLine& Line)
{
    CurrentLine = Line;
    OnDialogueLine.Broadcast(Line);
}

// ─── EndDialogue ──────────────────────────────────────────────────

void UBridgeLoomDialogue::EndDialogue(const FLoomDialogueCompletedEvent& CompletedEvent)
{
    bInDialogue   = false;
    ActiveSession = FLoomDialogueSession{};
    CurrentLine   = FLoomDialogueLine{};

    HideDialogueWidget();
    OnDialogueEnded.Broadcast(CompletedEvent);
}

// ─── SelectResponse ───────────────────────────────────────────────

void UBridgeLoomDialogue::SelectResponse(const FString& ResponseId)
{
    if (!bInDialogue) return;
    // Fire delegate — caller (transport layer / BP) must forward to Loom server
    OnResponseSelected.Broadcast(ActiveSession.ConversationId, ResponseId);
}

// ─── AbandonDialogue ──────────────────────────────────────────────

void UBridgeLoomDialogue::AbandonDialogue()
{
    if (!bInDialogue) return;

    FLoomDialogueCompletedEvent Abandoned;
    Abandoned.ConversationId  = ActiveSession.ConversationId;
    Abandoned.PlayerEntityId  = ActiveSession.PlayerEntityId;
    Abandoned.NpcEntityId     = ActiveSession.NpcEntityId;
    Abandoned.NpcDisplayName  = ActiveSession.NpcDisplayName;
    Abandoned.EndReason       = ELoomDialogueEndReason::Abandoned;
    Abandoned.NodesVisited    = ActiveSession.NodesVisited;

    EndDialogue(Abandoned);
}
