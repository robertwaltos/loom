// Copyright Project Loom. All Rights Reserved.

#include "LoomInteractionComponent.h"

ULoomInteractionComponent::ULoomInteractionComponent(
	const FObjectInitializer& ObjectInitializer)
	: Super(ObjectInitializer)
{
}

// ── Dialogue ────────────────────────────────────────────────────

void ULoomInteractionComponent::UpdateDialogue(
	const FLoomDialogueState& State)
{
	CurrentDialogue = State;
	OnDialogueUpdated.Broadcast(CurrentDialogue);
}

void ULoomInteractionComponent::ClearDialogue()
{
	CurrentDialogue = FLoomDialogueState();
	OnDialogueUpdated.Broadcast(CurrentDialogue);
}

void ULoomInteractionComponent::SelectResponse(int32 ResponseIndex)
{
	if (ResponseIndex >= 0
		&& ResponseIndex < CurrentDialogue.AvailableResponses.Num())
	{
		// Intent is relayed to the Loom server via BridgeLoomSubsystem.
		// Server evaluates NPC relationship, advances dialogue, and
		// pushes new FLoomDialogueState back through the stream.
	}
}

// ── Quests ──────────────────────────────────────────────────────

void ULoomInteractionComponent::UpdateQuest(const FLoomQuestEntry& Quest)
{
	for (int32 i = 0; i < ActiveQuests.Num(); ++i)
	{
		if (ActiveQuests[i].QuestId == Quest.QuestId)
		{
			ActiveQuests[i] = Quest;
			OnQuestUpdated.Broadcast(Quest);
			return;
		}
	}

	ActiveQuests.Add(Quest);
	OnQuestUpdated.Broadcast(Quest);
}

void ULoomInteractionComponent::RemoveQuest(const FString& QuestId)
{
	ActiveQuests.RemoveAll([&QuestId](const FLoomQuestEntry& Q)
	{
		return Q.QuestId == QuestId;
	});
}

// ── Conflict ────────────────────────────────────────────────────

void ULoomInteractionComponent::UpdateConflict(
	const FLoomConflictInfo& Conflict)
{
	for (int32 i = 0; i < ActiveConflicts.Num(); ++i)
	{
		if (ActiveConflicts[i].ConflictId == Conflict.ConflictId)
		{
			ActiveConflicts[i] = Conflict;
			OnConflictUpdated.Broadcast(Conflict);
			return;
		}
	}

	ActiveConflicts.Add(Conflict);
	OnConflictUpdated.Broadcast(Conflict);
}
