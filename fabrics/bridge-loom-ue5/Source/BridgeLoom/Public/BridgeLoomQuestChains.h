// Copyright Koydo. All Rights Reserved.
// BridgeLoomQuestChains.h — Cross-World Quest Chains bridge from Bible v5 Part 9.
//
// 20 multi-world quest chains spanning 2-4 worlds each.
// Unlocked when the Kindler has completed at least one entry in each
// participating world. Completing a chain grants 25–50 Spark.
//
// Constants (match quest-chains.ts exactly):
//   SPARK_GAIN_QUEST_MIN = 25
//   SPARK_GAIN_QUEST_MAX = 50
//   TOTAL_QUEST_CHAINS   = 20

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomQuestChains.generated.h"

// ─── Enums ────────────────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomQuestCategory : uint8
{
    STEM                UMETA(DisplayName = "STEM"),
    LanguageArts        UMETA(DisplayName = "Language Arts"),
    FinancialLiteracy   UMETA(DisplayName = "Financial Literacy"),
    CrossRealm          UMETA(DisplayName = "Cross-Realm"),
};

UENUM(BlueprintType)
enum class ELoomQuestChainStatus : uint8
{
    Locked      UMETA(DisplayName = "Locked"),
    Available   UMETA(DisplayName = "Available"),
    InProgress  UMETA(DisplayName = "In Progress"),
    Completed   UMETA(DisplayName = "Completed"),
};

// ─── Structs ──────────────────────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomQuestStep
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    int32 StepIndex = 0;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString WorldId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString Description;
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomQuestChainDefinition
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString QuestId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString Name;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    ELoomQuestCategory Category = ELoomQuestCategory::CrossRealm;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString Description;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TArray<FString> WorldIds;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TArray<FLoomQuestStep> Steps;

    // Spark reward on completion (25–50, matches SPARK_GAIN_QUEST_MIN/MAX)
    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    int32 SparkReward = 25;
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomKindlerQuestState
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    FString KindlerId;

    // QuestId → active status
    UPROPERTY(BlueprintReadOnly)
    TMap<FString, ELoomQuestChainStatus> QuestStatuses;

    // QuestId → set of completed step indices
    UPROPERTY(BlueprintReadOnly)
    TMap<FString, TSet<int32>> CompletedSteps;

    // World IDs in which the Kindler has completed at least one entry
    UPROPERTY(BlueprintReadOnly)
    TSet<FString> CompletedEntryWorldIds;
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomQuestAvailabilityResult
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    FString QuestId;

    UPROPERTY(BlueprintReadOnly)
    ELoomQuestChainStatus Status = ELoomQuestChainStatus::Locked;

    // World IDs the Kindler still needs to unlock this quest
    UPROPERTY(BlueprintReadOnly)
    TArray<FString> MissingWorldIds;
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomQuestCompletionResult
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    FString QuestId;

    UPROPERTY(BlueprintReadOnly)
    int32 SparkGained = 0;

    UPROPERTY(BlueprintReadOnly)
    bool bAllStepsComplete = false;

    UPROPERTY(BlueprintReadOnly)
    int32 StepsRemaining = 0;
};

// ─── Delegates ────────────────────────────────────────────────────

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnQuestUnlocked,
    const FString&, KindlerId, const FLoomQuestChainDefinition&, Quest);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnQuestStepCompleted,
    const FString&, KindlerId, const FLoomQuestStep&, Step);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnQuestChainCompleted,
    const FString&, KindlerId, const FLoomQuestCompletionResult&, Result);

// ─── Component ────────────────────────────────────────────────────

UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent),
       DisplayName = "Quest Chains Bridge")
class BRIDGELOOM_API UBridgeLoomQuestChains : public UActorComponent
{
    GENERATED_BODY()

public:

    UBridgeLoomQuestChains();

    virtual void BeginPlay() override;

    // ── Configuration ─────────────────────────────────────────────

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "QuestChains")
    TArray<FLoomQuestChainDefinition> QuestDefinitions;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "QuestChains")
    int32 SparkGainQuestMin = 25;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "QuestChains")
    int32 SparkGainQuestMax = 50;

    // ── Delegates ─────────────────────────────────────────────────

    UPROPERTY(BlueprintAssignable, Category = "QuestChains|Events")
    FOnQuestUnlocked OnQuestUnlocked;

    UPROPERTY(BlueprintAssignable, Category = "QuestChains|Events")
    FOnQuestStepCompleted OnQuestStepCompleted;

    UPROPERTY(BlueprintAssignable, Category = "QuestChains|Events")
    FOnQuestChainCompleted OnQuestChainCompleted;

    // ── World Entry Progress ──────────────────────────────────────

    // Call when a Kindler completes an entry in a world; evaluates unlock
    UFUNCTION(BlueprintCallable, Category = "QuestChains")
    void RecordWorldEntryCompletion(const FString& KindlerId, const FString& WorldId);

    // ── Quest Lifecycle ────────────────────────────────────────────

    // Attempt to mark a quest step as completed
    UFUNCTION(BlueprintCallable, Category = "QuestChains")
    FLoomQuestCompletionResult CompleteQuestStep(const FString& KindlerId,
                                                  const FString& QuestId,
                                                  int32 StepIndex);

    // ── Queries ───────────────────────────────────────────────────

    UFUNCTION(BlueprintCallable, Category = "QuestChains")
    TArray<FLoomQuestAvailabilityResult> GetAllQuestAvailability(
        const FString& KindlerId) const;

    UFUNCTION(BlueprintCallable, Category = "QuestChains")
    ELoomQuestChainStatus GetQuestStatus(const FString& KindlerId,
                                          const FString& QuestId) const;

    UFUNCTION(BlueprintCallable, Category = "QuestChains")
    TArray<FLoomQuestChainDefinition> GetQuestsByCategory(ELoomQuestCategory Category) const;

    UFUNCTION(BlueprintCallable, Category = "QuestChains")
    bool GetQuestById(const FString& QuestId, FLoomQuestChainDefinition& OutDef) const;

    UFUNCTION(BlueprintCallable, Category = "QuestChains")
    int32 GetCompletedStepCount(const FString& KindlerId, const FString& QuestId) const;

private:

    // KindlerId → quest state
    TMap<FString, FLoomKindlerQuestState> KindlerStates;

    void InitDefaultQuestDefs();

    FLoomKindlerQuestState& GetOrCreateState(const FString& KindlerId);

    void EvaluateQuestUnlock(FLoomKindlerQuestState& State,
                              const FLoomQuestChainDefinition& Quest);

    bool IsQuestUnlocked(const FLoomKindlerQuestState& State,
                          const FLoomQuestChainDefinition& Quest) const;
};
