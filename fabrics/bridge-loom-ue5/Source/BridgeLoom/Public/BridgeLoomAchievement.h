// Copyright Koydo. All Rights Reserved.
// BridgeLoomAchievement.h — UE5 bridge for the achievement-system.ts tracking layer.
//
// achievement-system.ts tracks:
//   - Global achievement catalogue (COMMON → LEGENDARY, hidden or visible)
//   - Per-player unlock history with timestamps
//   - Progress tracking (auto-unlock when currentProgress >= requiredProgress)
//   - Player stats (total points, by-rarity breakdown, completion %)
//
// UE5 side consumes unlock events and progress updates to:
//   - Show achievement unlock toast notifications
//   - Trigger celebratory VFX/sound (Niagara burst + audio cue)
//   - Drive the achievement gallery HUD screen
//   - Display progress bars for tracked achievements

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomAchievement.generated.h"

// ─── Enumerations ──────────────────────────────────────────────────

/** Mirrors AchievementRarity from achievement-system.ts. */
UENUM(BlueprintType)
enum class ELoomAchievementRarity : uint8
{
    Common      UMETA(DisplayName = "Common"),
    Uncommon    UMETA(DisplayName = "Uncommon"),
    Rare        UMETA(DisplayName = "Rare"),
    Epic        UMETA(DisplayName = "Epic"),
    Legendary   UMETA(DisplayName = "Legendary"),
};

// ─── Structs ───────────────────────────────────────────────────────

/** Achievement definition (from the global catalogue). */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomAchievementDef
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Achievement")
    FString AchievementId;

    UPROPERTY(BlueprintReadOnly, Category = "Achievement")
    FString Title;

    UPROPERTY(BlueprintReadOnly, Category = "Achievement")
    FString Description;

    UPROPERTY(BlueprintReadOnly, Category = "Achievement")
    ELoomAchievementRarity Rarity = ELoomAchievementRarity::Common;

    UPROPERTY(BlueprintReadOnly, Category = "Achievement")
    int32 PointValue = 0;

    /** Hidden achievements are not shown in the gallery until unlocked. */
    UPROPERTY(BlueprintReadOnly, Category = "Achievement")
    bool bHidden = false;
};

/** Record of a player unlock event. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomPlayerAchievement
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Achievement")
    FString AchievementId;

    UPROPERTY(BlueprintReadOnly, Category = "Achievement")
    FString PlayerId;

    /** Unix-microseconds unlock timestamp. */
    UPROPERTY(BlueprintReadOnly, Category = "Achievement")
    int64 UnlockedAtUs = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Achievement")
    int32 PointsEarned = 0;
};

/** Progress record for a tracked achievement. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomAchievementProgress
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Achievement")
    FString AchievementId;

    UPROPERTY(BlueprintReadOnly, Category = "Achievement")
    FString PlayerId;

    UPROPERTY(BlueprintReadOnly, Category = "Achievement")
    int32 CurrentProgress = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Achievement")
    int32 RequiredProgress = 1;

    UPROPERTY(BlueprintReadOnly, Category = "Achievement")
    bool bCompleted = false;

    /** Normalised 0–1 progress ratio — handy for Blueprint progress bars. */
    UFUNCTION(BlueprintPure, Category = "Achievement")
    float GetProgressRatio() const
    {
        if (RequiredProgress <= 0) return bCompleted ? 1.0f : 0.0f;
        return FMath::Clamp(static_cast<float>(CurrentProgress) / static_cast<float>(RequiredProgress), 0.0f, 1.0f);
    }
};

/** Per-player summary of accumulated points and completion. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomPlayerAchievementStats
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Achievement")
    FString PlayerId;

    UPROPERTY(BlueprintReadOnly, Category = "Achievement")
    int32 TotalPoints = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Achievement")
    float CompletionPercent = 0.0f;

    /** Unlocked counts per rarity. */
    UPROPERTY(BlueprintReadOnly, Category = "Achievement")
    TMap<ELoomAchievementRarity, int32> ByRarity;
};

// ─── Component ────────────────────────────────────────────────────

/**
 * UBridgeLoomAchievement — ActorComponent bridging achievement-system.ts
 * unlock events and progress updates to UE5 notifications, VFX, and HUD.
 *
 * Attach to the Player State or a session-scoped Achievement Manager actor.
 *
 * Workflow:
 *  1. Server transport calls NotifyUnlock() when achievement-system.ts fires
 *     an unlockAchievement success.
 *  2. Server transport calls UpdateProgress() when trackProgress increments.
 *  3. Bind OnAchievementUnlocked → show toast + play VFX.
 *  4. Bind OnProgressUpdated → update HUD progress bars.
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent),
       DisplayName = "Loom Achievement")
class BRIDGELOOM_API UBridgeLoomAchievement : public UActorComponent
{
    GENERATED_BODY()

public:
    UBridgeLoomAchievement();

    // ── Configuration ─────────────────────────────────────────────

    /** Per-rarity unlock Niagara burst. Spawned above the player on unlock. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Achievement|VFX")
    TMap<ELoomAchievementRarity, TSoftObjectPtr<class UNiagaraSystem>> UnlockVFXMap;

    /**
     * Achievement toast widget class.
     * Spawned temporarily when an achievement unlocks — auto-hidden after
     * ToastDurationSeconds.
     */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Achievement|Config")
    TSoftClassPtr<class UUserWidget> ToastWidgetClass;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Achievement|Config",
              meta = (ClampMin = "1.0", ClampMax = "10.0"))
    float ToastDurationSeconds = 3.0f;

    // ── State ─────────────────────────────────────────────────────

    UPROPERTY(BlueprintReadOnly, Category = "Achievement")
    FLoomPlayerAchievementStats PlayerStats;

    UPROPERTY(BlueprintReadOnly, Category = "Achievement")
    TArray<FLoomPlayerAchievement> UnlockedAchievements;

    UPROPERTY(BlueprintReadOnly, Category = "Achievement")
    TArray<FLoomAchievementProgress> ActiveProgress;

    // ── Methods ───────────────────────────────────────────────────

    /**
     * Called when achievement-system.ts fires an unlock event.
     * Fires delegate, spawns VFX, shows toast.
     */
    UFUNCTION(BlueprintCallable, Category = "Achievement")
    void NotifyUnlock(const FLoomPlayerAchievement& Unlock,
                      const FLoomAchievementDef& Def);

    /** Called when progress increments for a tracked achievement. */
    UFUNCTION(BlueprintCallable, Category = "Achievement")
    void UpdateProgress(const FLoomAchievementProgress& Progress);

    /** Full stats refresh (called on session load). */
    UFUNCTION(BlueprintCallable, Category = "Achievement")
    void ApplyPlayerStats(const FLoomPlayerAchievementStats& Stats);

    UFUNCTION(BlueprintPure, Category = "Achievement")
    bool IsUnlocked(const FString& AchievementId) const;

    // ── Delegates ─────────────────────────────────────────────────

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnAchievementUnlocked,
        FLoomPlayerAchievement, Unlock, FLoomAchievementDef, Def);

    UPROPERTY(BlueprintAssignable, Category = "Achievement|Events")
    FOnAchievementUnlocked OnAchievementUnlocked;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnProgressUpdated,
        FLoomAchievementProgress, Progress);

    UPROPERTY(BlueprintAssignable, Category = "Achievement|Events")
    FOnProgressUpdated OnProgressUpdated;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnStatsRefreshed,
        FLoomPlayerAchievementStats, Stats);

    UPROPERTY(BlueprintAssignable, Category = "Achievement|Events")
    FOnStatsRefreshed OnStatsRefreshed;

    // ── UActorComponent ───────────────────────────────────────────

    virtual void BeginPlay() override;

private:
    void SpawnUnlockVFX(ELoomAchievementRarity Rarity);
    void ShowToast(const FLoomAchievementDef& Def);
};
