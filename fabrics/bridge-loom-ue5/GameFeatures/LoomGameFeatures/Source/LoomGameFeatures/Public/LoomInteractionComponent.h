// Copyright Project Loom. All Rights Reserved.
// Thread: bridge/bridge-loom-ue5/game-features/interaction
// Tier: 1
//
// Interaction Component — NPC dialogue state, quest tracker,
// combat/war status, and world-event presence managed by the Loom.

#pragma once

#include "CoreMinimal.h"
#include "Components/GameFrameworkComponent.h"
#include "LoomInteractionComponent.generated.h"

// ── Dialogue State ──────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomDialoguePhase : uint8
{
	None      UMETA(DisplayName = "None"),
	Greeting  UMETA(DisplayName = "Greeting"),
	Topic     UMETA(DisplayName = "Topic"),
	Response  UMETA(DisplayName = "Response"),
	Farewell  UMETA(DisplayName = "Farewell"),
};

USTRUCT(BlueprintType)
struct LOOMGAMEFEATURES_API FLoomDialogueLine
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Interaction")
	FString SpeakerId;

	UPROPERTY(BlueprintReadOnly, Category = "Interaction")
	FString Text;

	UPROPERTY(BlueprintReadOnly, Category = "Interaction")
	float EmotionIntensity = 0.5f;

	UPROPERTY(BlueprintReadOnly, Category = "Interaction")
	FString EmotionTag;
};

USTRUCT(BlueprintType)
struct LOOMGAMEFEATURES_API FLoomDialogueState
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Interaction")
	FString NpcId;

	UPROPERTY(BlueprintReadOnly, Category = "Interaction")
	ELoomDialoguePhase Phase = ELoomDialoguePhase::None;

	UPROPERTY(BlueprintReadOnly, Category = "Interaction")
	TArray<FLoomDialogueLine> Lines;

	UPROPERTY(BlueprintReadOnly, Category = "Interaction")
	TArray<FString> AvailableResponses;
};

// ── Quest Tracker ───────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomQuestStatus : uint8
{
	Available  UMETA(DisplayName = "Available"),
	Active     UMETA(DisplayName = "Active"),
	Completed  UMETA(DisplayName = "Completed"),
	Failed     UMETA(DisplayName = "Failed"),
};

USTRUCT(BlueprintType)
struct LOOMGAMEFEATURES_API FLoomQuestObjective
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Interaction")
	FString Description;

	UPROPERTY(BlueprintReadOnly, Category = "Interaction")
	int32 CurrentCount = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Interaction")
	int32 RequiredCount = 1;

	UPROPERTY(BlueprintReadOnly, Category = "Interaction")
	bool bComplete = false;
};

USTRUCT(BlueprintType)
struct LOOMGAMEFEATURES_API FLoomQuestEntry
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Interaction")
	FString QuestId;

	UPROPERTY(BlueprintReadOnly, Category = "Interaction")
	FString Title;

	UPROPERTY(BlueprintReadOnly, Category = "Interaction")
	ELoomQuestStatus Status = ELoomQuestStatus::Available;

	UPROPERTY(BlueprintReadOnly, Category = "Interaction")
	TArray<FLoomQuestObjective> Objectives;

	UPROPERTY(BlueprintReadOnly, Category = "Interaction")
	int64 KalonReward = 0;
};

// ── War / Conflict Status ───────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomConflictPhase : uint8
{
	Peace      UMETA(DisplayName = "Peace"),
	Tension    UMETA(DisplayName = "Tension"),
	Skirmish   UMETA(DisplayName = "Skirmish"),
	War        UMETA(DisplayName = "War"),
	Ceasefire  UMETA(DisplayName = "Ceasefire"),
};

USTRUCT(BlueprintType)
struct LOOMGAMEFEATURES_API FLoomConflictInfo
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Interaction")
	FString ConflictId;

	UPROPERTY(BlueprintReadOnly, Category = "Interaction")
	ELoomConflictPhase Phase = ELoomConflictPhase::Peace;

	UPROPERTY(BlueprintReadOnly, Category = "Interaction")
	TArray<FString> BelligerentDynastyIds;

	UPROPERTY(BlueprintReadOnly, Category = "Interaction")
	float IntensityNormalized = 0.0f;
};

// ── Delegates ───────────────────────────────────────────────────

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
	FOnDialogueUpdated, const FLoomDialogueState&, Dialogue);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
	FOnQuestUpdated, const FLoomQuestEntry&, Quest);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
	FOnConflictUpdated, const FLoomConflictInfo&, Conflict);

// ── Component ───────────────────────────────────────────────────

UCLASS(ClassGroup = (LoomGameFeatures), meta = (BlueprintSpawnableComponent))
class LOOMGAMEFEATURES_API ULoomInteractionComponent : public UGameFrameworkComponent
{
	GENERATED_BODY()

public:
	ULoomInteractionComponent(const FObjectInitializer& ObjectInitializer);

	// ── Dialogue ──────────────────────────────────────────────

	UFUNCTION(BlueprintPure, Category = "Interaction")
	FLoomDialogueState GetDialogueState() const { return CurrentDialogue; }

	UFUNCTION(BlueprintCallable, Category = "Interaction")
	void UpdateDialogue(const FLoomDialogueState& State);

	UFUNCTION(BlueprintCallable, Category = "Interaction")
	void ClearDialogue();

	UFUNCTION(BlueprintCallable, Category = "Interaction")
	void SelectResponse(int32 ResponseIndex);

	// ── Quests ────────────────────────────────────────────────

	UFUNCTION(BlueprintPure, Category = "Interaction")
	TArray<FLoomQuestEntry> GetActiveQuests() const { return ActiveQuests; }

	UFUNCTION(BlueprintCallable, Category = "Interaction")
	void UpdateQuest(const FLoomQuestEntry& Quest);

	UFUNCTION(BlueprintCallable, Category = "Interaction")
	void RemoveQuest(const FString& QuestId);

	// ── Conflict ──────────────────────────────────────────────

	UFUNCTION(BlueprintPure, Category = "Interaction")
	TArray<FLoomConflictInfo> GetActiveConflicts() const { return ActiveConflicts; }

	UFUNCTION(BlueprintCallable, Category = "Interaction")
	void UpdateConflict(const FLoomConflictInfo& Conflict);

	// ── Events ────────────────────────────────────────────────

	UPROPERTY(BlueprintAssignable, Category = "Interaction")
	FOnDialogueUpdated OnDialogueUpdated;

	UPROPERTY(BlueprintAssignable, Category = "Interaction")
	FOnQuestUpdated OnQuestUpdated;

	UPROPERTY(BlueprintAssignable, Category = "Interaction")
	FOnConflictUpdated OnConflictUpdated;

private:
	FLoomDialogueState CurrentDialogue;
	TArray<FLoomQuestEntry> ActiveQuests;
	TArray<FLoomConflictInfo> ActiveConflicts;
};
