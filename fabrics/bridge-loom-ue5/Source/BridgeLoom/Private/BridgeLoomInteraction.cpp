// Copyright Koydo. All Rights Reserved.
// BridgeLoomInteraction.cpp

#include "BridgeLoomInteraction.h"
#include "Blueprint/UserWidget.h"
#include "GameFramework/PlayerController.h"

UBridgeLoomInteraction::UBridgeLoomInteraction()
{
    PrimaryComponentTick.bCanEverTick = false;
}

void UBridgeLoomInteraction::NotifyInteractionEvent(
    const FLoomInteractionEvent& Event)
{
    switch (Event.EventType)
    {
    case ELoomInteractionEventType::Available:
        EntitiesInRange.Add(Event.TargetEntityId);
        if (bAutoManagePromptWidget && EntitiesInRange.Num() == 1)
        {
            ShowPromptWidget();
        }
        OnInteractionAvailable.Broadcast(Event);
        break;

    case ELoomInteractionEventType::Unavailable:
        EntitiesInRange.Remove(Event.TargetEntityId);
        if (bAutoManagePromptWidget && EntitiesInRange.IsEmpty())
        {
            HidePromptWidget();
        }
        if (ActiveInteractionTargetId == Event.TargetEntityId)
        {
            ActiveInteractionTargetId.Empty();
            bIsInteracting = false;
        }
        OnInteractionUnavailable.Broadcast(Event);
        break;

    case ELoomInteractionEventType::Started:
        ActiveInteractionTargetId = Event.TargetEntityId;
        bIsInteracting = true;
        OnInteractionStarted.Broadcast(Event);
        break;

    case ELoomInteractionEventType::Completed:
        if (ActiveInteractionTargetId == Event.TargetEntityId)
        {
            ActiveInteractionTargetId.Empty();
            bIsInteracting = false;
        }
        OnInteractionCompleted.Broadcast(Event);
        break;
    }
}

void UBridgeLoomInteraction::RequestInteraction(ELoomInteractionKind Kind,
                                                 const FString& TargetEntityId)
{
    OnInteractionRequested.Broadcast(Kind, TargetEntityId);
}

bool UBridgeLoomInteraction::IsEntityInRange(const FString& TargetEntityId) const
{
    return EntitiesInRange.Contains(TargetEntityId);
}

int32 UBridgeLoomInteraction::GetEntitiesInRangeCount() const
{
    return EntitiesInRange.Num();
}

// ── Private widget helpers ────────────────────────────────────────────────────

void UBridgeLoomInteraction::ShowPromptWidget()
{
    if (InteractionPromptWidgetClass.IsNull()) return;

    TSubclassOf<UUserWidget> WidgetClass =
        InteractionPromptWidgetClass.LoadSynchronous();
    if (!WidgetClass) return;

    APlayerController* PC = nullptr;
    if (APawn* OwnerPawn = Cast<APawn>(GetOwner()))
    {
        PC = Cast<APlayerController>(OwnerPawn->GetController());
    }
    if (!PC) return;

    UUserWidget* Widget = CreateWidget<UUserWidget>(PC, WidgetClass);
    if (Widget)
    {
        Widget->AddToViewport();
        PromptWidget = Widget;
    }
}

void UBridgeLoomInteraction::HidePromptWidget()
{
    if (PromptWidget.IsValid())
    {
        PromptWidget->RemoveFromParent();
        PromptWidget.Reset();
    }
}
