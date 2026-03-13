// Copyright Koydo. All Rights Reserved.
// BridgeLoomPlayerProgression.h — UE5 bridge for player-progression.ts XP/level/skill system.
//
// player-progression.ts tracks:
//   - MAX_LEVEL = 100
//   - XP formula: xpToNextLevel = currentLevel^2 * 100
//   - Skills: skillId, name, maxRank, xpCost, optional prerequisiteSkillId
//   - PlayerSkill: currentRank (1-maxRank), costs xpCost per learn/upgrade
//   - ProgressionStats: level, skillsLearned, totalSkillRanks
//
// UE5 side:
//   - Mirrors PlayerLevel + skill list for instant HUD queries
//   - Fires level-up VFX and delegates
//   - Drives XP progress bar and skill tree widget via BlueprintReadOnly state

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomPlayerProgression.generated.h"

// ─── Structs ───────────────────────────────────────────────────────

/** Current level and XP state for one player. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomPlayerLevel
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    FString PlayerId;

    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    int32 CurrentLevel = 1;

    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    int64 CurrentXp = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    int64 XpToNextLevel = 100;

    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    int64 TotalXpEarned = 0;

    /** Normalised progress toward next level [0, 1]. */
    UFUNCTION(BlueprintPure, Category = "Progression")
    float GetXpFraction() const
    {
        return (XpToNextLevel > 0)
            ? FMath::Clamp(static_cast<float>(CurrentXp) /
                           static_cast<float>(XpToNextLevel), 0.0f, 1.0f)
            : 1.0f;
    }
};

/** Definition of a learnable skill (shared across all players). */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomSkillDef
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    FString SkillId;

    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    FString Name;

    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    FString Description;

    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    int32 MaxRank = 1;

    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    int64 XpCost = 0;

    /** Empty string if no prerequisite. */
    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    FString PrerequisiteSkillId;
};

/** A player's learned instance of a skill. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomPlayerSkill
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    FString SkillId;

    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    FString PlayerId;

    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    int32 CurrentRank = 1;

    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    int64 LearnedAtUs = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    int64 LastUpgradedAtUs = 0;
};

/** Aggregate progression stats for a player. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomProgressionStats
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    FString PlayerId;

    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    int32 Level = 1;

    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    int32 SkillsLearned = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    int32 TotalSkillRanks = 0;
};

// ─── Component ────────────────────────────────────────────────────

/**
 * UBridgeLoomPlayerProgression — ActorComponent bridging player-progression.ts
 * server state to Blueprint-readable UE5 data.
 *
 * Attach to Player State.
 *
 * Max level: 100 (matches TS constant).
 * XP formula: xpToNextLevel = currentLevel² × 100.
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent),
       DisplayName = "Loom Player Progression")
class BRIDGELOOM_API UBridgeLoomPlayerProgression : public UActorComponent
{
    GENERATED_BODY()

public:
    UBridgeLoomPlayerProgression();

    // ── Configuration ─────────────────────────────────────────────

    static constexpr int32 MaxLevel = 100;

    /** Niagara burst played at the player's location on level-up. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Progression|VFX")
    TSoftObjectPtr<class UNiagaraSystem> LevelUpVFXTemplate;

    // ── State ─────────────────────────────────────────────────────

    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    FLoomPlayerLevel PlayerLevel;

    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    TArray<FLoomPlayerSkill> LearnedSkills;

    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    TMap<FString, FLoomSkillDef> SkillCatalog;

    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    FLoomProgressionStats Stats;

    // ── Inbound (transport → bridge) ─────────────────────────────

    /**
     * Apply a full PlayerLevel update from the server.
     * Fires OnLevelGained for each level crossed and OnXpChanged always.
     */
    UFUNCTION(BlueprintCallable, Category = "Progression")
    void ApplyLevelState(const FLoomPlayerLevel& NewLevel);

    /** Register or update a skill definition in the local catalog. */
    UFUNCTION(BlueprintCallable, Category = "Progression")
    void RegisterSkillDef(const FLoomSkillDef& Def);

    /**
     * Upserts a learned/upgraded player skill.
     * Fires OnSkillLearned (rank 1) or OnSkillUpgraded (rank > 1).
     */
    UFUNCTION(BlueprintCallable, Category = "Progression")
    void ApplyPlayerSkill(const FLoomPlayerSkill& Skill);

    /** Apply aggregate stats snapshot. */
    UFUNCTION(BlueprintCallable, Category = "Progression")
    void ApplyProgressionStats(const FLoomProgressionStats& NewStats);

    // ── Outbound (player intent → transport) ─────────────────────

    UFUNCTION(BlueprintCallable, Category = "Progression")
    void RequestLearnSkill(const FString& SkillId);

    UFUNCTION(BlueprintCallable, Category = "Progression")
    void RequestUpgradeSkill(const FString& SkillId);

    // ── Queries ───────────────────────────────────────────────────

    UFUNCTION(BlueprintPure, Category = "Progression")
    bool HasLearnedSkill(const FString& SkillId) const;

    UFUNCTION(BlueprintPure, Category = "Progression")
    int32 GetSkillRank(const FString& SkillId) const;

    UFUNCTION(BlueprintPure, Category = "Progression")
    bool IsMaxLevel() const;

    // ── Delegates ─────────────────────────────────────────────────

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnLevelGained,
        FString, PlayerId, int32, NewLevel);
    UPROPERTY(BlueprintAssignable, Category = "Progression|Events")
    FOnLevelGained OnLevelGained;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnXpChanged,
        FString, PlayerId, FLoomPlayerLevel, NewLevelState);
    UPROPERTY(BlueprintAssignable, Category = "Progression|Events")
    FOnXpChanged OnXpChanged;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnSkillLearned,
        FLoomPlayerSkill, Skill);
    UPROPERTY(BlueprintAssignable, Category = "Progression|Events")
    FOnSkillLearned OnSkillLearned;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnSkillUpgraded,
        FLoomPlayerSkill, Skill);
    UPROPERTY(BlueprintAssignable, Category = "Progression|Events")
    FOnSkillUpgraded OnSkillUpgraded;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnLearnSkillRequested,
        FString, SkillId);
    UPROPERTY(BlueprintAssignable, Category = "Progression|Requests")
    FOnLearnSkillRequested OnLearnSkillRequested;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnUpgradeSkillRequested,
        FString, SkillId);
    UPROPERTY(BlueprintAssignable, Category = "Progression|Requests")
    FOnUpgradeSkillRequested OnUpgradeSkillRequested;

private:
    void SpawnLevelUpVFX();
};
