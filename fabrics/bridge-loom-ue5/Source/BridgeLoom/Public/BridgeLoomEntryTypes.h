// Copyright Koydo. All Rights Reserved.
// BridgeLoomEntryTypes.h — New Entry Types bridge from Bible v5 Part 11.
//
// Three new entry formats exposable to Blueprint/UMG:
//   - Unsolved Mysteries (genuinely open questions)
//   - Living Experiments (phenomena currently unfolding)
//   - Thought Experiments (problems requiring only a mind)
//
// Constants (match entry-types.ts exactly):
//   TOTAL_ENTRY_TYPE_DEFINITIONS = 3
//   SPARK_GAIN_ENTRY_MIN = 5
//   SPARK_GAIN_ENTRY_MAX = 15

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomEntryTypes.generated.h"

// ─── Enums ────────────────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomEntryTypeName : uint8
{
    UnsolvedMystery     UMETA(DisplayName = "Unsolved Mystery"),
    LivingExperiment    UMETA(DisplayName = "Living Experiment"),
    ThoughtExperiment   UMETA(DisplayName = "Thought Experiment"),
};

UENUM(BlueprintType)
enum class ELoomMysteryStatus : uint8
{
    Open            UMETA(DisplayName = "Open"),
    PartiallySolved UMETA(DisplayName = "Partially Solved"),
    Contested       UMETA(DisplayName = "Contested"),
};

UENUM(BlueprintType)
enum class ELoomExperimentStatus : uint8
{
    Ongoing     UMETA(DisplayName = "Ongoing"),
    Concluded   UMETA(DisplayName = "Concluded"),
    Paused      UMETA(DisplayName = "Paused"),
};

// ─── Structs ──────────────────────────────────────────────────────

// Age-split content used in all three entry types
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomAgeContent
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString Ages5to7;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString Ages8to10;
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomUnsolvedMysteryEntry
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString EntryId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString Title;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    ELoomMysteryStatus Status = ELoomMysteryStatus::Open;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FLoomAgeContent Content;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString KnownTerritory;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString UnknownTerritory;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString ExplorerPrompt;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TArray<FString> WorldIds;
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomLivingExperimentEntry
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString EntryId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString Title;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    ELoomExperimentStatus Status = ELoomExperimentStatus::Ongoing;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FLoomAgeContent Content;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString TheQuestion;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString CurrentData;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString WhatChangesThis;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString WorldConnection;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TArray<FString> WorldIds;
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomThoughtExperimentEntry
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString EntryId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString Title;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString Origin;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString TheSetup;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString TheQuestion;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FLoomAgeContent Content;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString WhatItTests;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString NoAnswer;

    // Suggested Compass guide moment / NPC cue
    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString GuideMoment;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TArray<FString> WorldIds;
};

// Result returned when a Kindler completes an expanded entry
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomExpandedEntryResult
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    FString EntryId;

    UPROPERTY(BlueprintReadOnly)
    ELoomEntryTypeName EntryType = ELoomEntryTypeName::UnsolvedMystery;

    UPROPERTY(BlueprintReadOnly)
    int32 SparkGained = 0;
};

// ─── Component ────────────────────────────────────────────────────

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnExpandedEntryCompleted,
    const FLoomExpandedEntryResult&, Result);

UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent),
       DisplayName = "Entry Types Bridge")
class BRIDGELOOM_API UBridgeLoomEntryTypes : public UActorComponent
{
    GENERATED_BODY()

public:

    UBridgeLoomEntryTypes();

    virtual void BeginPlay() override;

    // ── Configuration ─────────────────────────────────────────────

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "EntryTypes")
    TArray<FLoomUnsolvedMysteryEntry> UnsolvedMysteries;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "EntryTypes")
    TArray<FLoomLivingExperimentEntry> LivingExperiments;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "EntryTypes")
    TArray<FLoomThoughtExperimentEntry> ThoughtExperiments;

    // Spark gain range (matches SPARK_GAIN_ENTRY_MIN/MAX in entry-types.ts)
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "EntryTypes")
    int32 SparkGainMin = 5;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "EntryTypes")
    int32 SparkGainMax = 15;

    // ── Delegates ─────────────────────────────────────────────────

    UPROPERTY(BlueprintAssignable, Category = "EntryTypes|Events")
    FOnExpandedEntryCompleted OnExpandedEntryCompleted;

    // ── Methods ───────────────────────────────────────────────────

    // Call when a Kindler finishes reading/engaging with an expanded entry
    UFUNCTION(BlueprintCallable, Category = "EntryTypes")
    FLoomExpandedEntryResult CompleteEntry(const FString& EntryId);

    // Queries
    UFUNCTION(BlueprintCallable, Category = "EntryTypes")
    bool GetMysteryById(const FString& EntryId, FLoomUnsolvedMysteryEntry& OutEntry) const;

    UFUNCTION(BlueprintCallable, Category = "EntryTypes")
    bool GetExperimentById(const FString& EntryId, FLoomLivingExperimentEntry& OutEntry) const;

    UFUNCTION(BlueprintCallable, Category = "EntryTypes")
    bool GetThoughtExperimentById(const FString& EntryId, FLoomThoughtExperimentEntry& OutEntry) const;

    UFUNCTION(BlueprintCallable, Category = "EntryTypes")
    TArray<FString> GetEntryIdsForWorld(const FString& WorldId) const;

    UFUNCTION(BlueprintCallable, Category = "EntryTypes")
    ELoomEntryTypeName GetEntryType(const FString& EntryId) const;

private:

    void InitDefaultEntries();

    // Compute spark gain — linear interpolation of min/max (entry-types.ts)
    int32 ComputeSparkGain() const;
};
