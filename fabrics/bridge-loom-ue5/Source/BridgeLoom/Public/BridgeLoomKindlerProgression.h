// Copyright Koydo. All Rights Reserved.
// BridgeLoomKindlerProgression.h — UE5 bridge for the Spark/Kindler progression system.
//
// The Spark is the child's cumulative learning energy (not a score — a glow).
// Eight levels from New Kindler (tiny flicker) to Constellation (orbiting light).
// Spark never decays; world luminance gently fades for unvisited worlds (max -10).
//
// UE5 side manages:
//  - Player aura material (MPC parameter "SparkLevel" 0.0–7.0)
//  - Level-up Niagara burst
//  - Welcome-back petal shower VFX
//  - Per-world luminance tracked in a TMap (drives post-process weight)

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomKindlerProgression.generated.h"

// ─── Enumerations ──────────────────────────────────────────────────

/**
 * Eight spark levels from Bible v5 — each maps to a distinct visual identity
 * on the player aura material (MPC float param "SparkLevel").
 */
UENUM(BlueprintType)
enum class ELoomSparkLevel : uint8
{
    NewKindler      UMETA(DisplayName = "New Kindler — Tiny Flicker"),
    Ember           UMETA(DisplayName = "Ember — Warm Flicker"),
    Flame           UMETA(DisplayName = "Flame — Steady Warm Light"),
    Torch           UMETA(DisplayName = "Torch — Bright Steady Glow"),
    Beacon          UMETA(DisplayName = "Beacon — Radiating Light"),
    Star            UMETA(DisplayName = "Star — Brilliant Glow with Rays"),
    Aurora          UMETA(DisplayName = "Aurora — Shifting Colors Wide Radiance"),
    Constellation   UMETA(DisplayName = "Constellation — Multiple Orbiting Points"),
};

/** Actions that award Spark. */
UENUM(BlueprintType)
enum class ELoomSparkAction : uint8
{
    CompleteEntry           UMETA(DisplayName = "Complete Entry"),
    CompleteMiniGame        UMETA(DisplayName = "Complete Mini-Game"),
    DiscoverThreadway       UMETA(DisplayName = "Discover Threadway"),
    FindHiddenZone          UMETA(DisplayName = "Find Hidden Zone"),
    CompleteCrossWorldQuest UMETA(DisplayName = "Complete Cross-World Quest"),
    ReturnAfterAbsence      UMETA(DisplayName = "Return After Absence"),
    FirstWorldVisit         UMETA(DisplayName = "First World Visit"),
};

// ─── Structs ───────────────────────────────────────────────────────

/** Immutable thresholds and visual config for one spark level. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomSparkLevelDef
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Progression")
    ELoomSparkLevel Level = ELoomSparkLevel::NewKindler;

    /** Minimum total spark needed to reach this level. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Progression",
              meta = (ClampMin = "0"))
    int32 MinSpark = 0;

    /** Maximum spark in this level band (next level starts at MaxSpark + 1). */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Progression",
              meta = (ClampMin = "0"))
    int32 MaxSpark = 99;

    /** Value written to the aura MPC "SparkLevel" float parameter [0–7]. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Progression",
              meta = (ClampMin = "0.0", ClampMax = "7.0"))
    float AuraMPCValue = 0.0f;

    /** Unlocked features or zones at this level (display in HUD tooltip). */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Progression")
    TArray<FString> UnlockedFeatures;
};

/** Per-world luminance. Stored in a TMap indexed by WorldId string. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomWorldLuminance
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, Category = "Progression")
    FString WorldId;

    /** Current luminance [0–100]. Decays at 1/day up to cap of -10 from base. */
    UPROPERTY(BlueprintReadWrite, Category = "Progression",
              meta = (ClampMin = "0", ClampMax = "100"))
    int32 Luminance = 80;

    /** Base luminance established on first world completion. */
    UPROPERTY(BlueprintReadWrite, Category = "Progression")
    int32 BaseLuminance = 80;
};

/** Mutable state for an active kindler session. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomKindlerProgressionState
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, Category = "Progression")
    FString KindlerId;

    UPROPERTY(BlueprintReadWrite, Category = "Progression",
              meta = (ClampMin = "0"))
    int32 TotalSpark = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    ELoomSparkLevel CurrentLevel = ELoomSparkLevel::NewKindler;

    /** Per-world luminance map (WorldId → state). */
    UPROPERTY(BlueprintReadWrite, Category = "Progression")
    TMap<FString, FLoomWorldLuminance> WorldLuminance;

    /** Unix-ms timestamp of last session (used for absence detection). */
    UPROPERTY(BlueprintReadWrite, Category = "Progression")
    int64 LastVisitMs = 0;
};

/** Result of a spark award operation. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomSparkGainResult
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    int32 PreviousSpark = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    int32 NewSpark = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    int32 SparkGained = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    ELoomSparkLevel PreviousLevel = ELoomSparkLevel::NewKindler;

    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    ELoomSparkLevel NewLevel = ELoomSparkLevel::NewKindler;

    UPROPERTY(BlueprintReadOnly, Category = "Progression")
    bool bLeveledUp = false;
};

// ─── Component ────────────────────────────────────────────────────

/**
 * UBridgeLoomKindlerProgression — ActorComponent bridging TS kindler-progression
 * to Unreal material, VFX, and HUD systems.
 *
 * Features:
 *  - AddSpark: awards spark, recomputes level, updates aura MPC, fires delegates
 *  - ApplyLuminanceDecay: called on session start — decays unvisited worlds
 *  - ApplyWelcomeBack: detects >7-day absence and awards +5 spark with petal VFX
 *  - UpdateAuraMaterial: writes SparkLevel to the AuraMPC material param
 *  - GetCurrentLevel: stateless level lookup from total spark
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent),
       DisplayName = "Loom Kindler Progression")
class BRIDGELOOM_API UBridgeLoomKindlerProgression : public UActorComponent
{
    GENERATED_BODY()

public:
    UBridgeLoomKindlerProgression();

    // ── Configuration ─────────────────────────────────────────────

    /** Level definitions — defaults match Bible v5 (8 levels). Override in BP. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Progression|Config")
    TArray<FLoomSparkLevelDef> LevelDefinitions;

    /** Material Parameter Collection used for the player aura "SparkLevel". */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Progression|Config")
    TSoftObjectPtr<class UMaterialParameterCollection> AuraMPC;

    /** Niagara system spawned on level-up at the player's location. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Progression|Config")
    TSoftObjectPtr<class UNiagaraSystem> LevelUpVFXTemplate;

    /** Niagara system used for the petal shower on welcome-back. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Progression|Config")
    TSoftObjectPtr<class UNiagaraSystem> WelcomeBackVFXTemplate;

    /** Days without login before absence bonus triggers. Default: 7. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Progression|Config",
              meta = (ClampMin = "1", ClampMax = "30"))
    int32 AbsenceThresholdDays = 7;

    /** Spark bonus granted on return after absence. Default: 5. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Progression|Config",
              meta = (ClampMin = "1", ClampMax = "50"))
    int32 WelcomeBackSpark = 5;

    /** Max luminance decay per unvisited world per day. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Progression|Config",
              meta = (ClampMin = "1", ClampMax = "10"))
    int32 LuminanceDecayPerDay = 1;

    /** Maximum total luminance decay cap per world (never decays below base - cap). */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Progression|Config",
              meta = (ClampMin = "1", ClampMax = "50"))
    int32 LuminanceDecayCap = 10;

    // ── Session Initialization ────────────────────────────────────

    /**
     * Load a kindler's state at session start.
     * Runs ApplyLuminanceDecay and ApplyWelcomeBack automatically.
     */
    UFUNCTION(BlueprintCallable, Category = "Progression")
    void InitiateSession(UPARAM(ref) FLoomKindlerProgressionState& InOutState,
                         int64 NowMs);

    // ── Spark ─────────────────────────────────────────────────────

    /**
     * Award spark for a completed action.
     * Updates level, fires OnSparkGained / OnLevelUp, updates aura MPC.
     */
    UFUNCTION(BlueprintCallable, Category = "Progression")
    FLoomSparkGainResult AddSpark(
        UPARAM(ref) FLoomKindlerProgressionState& InOutState,
        int32 Amount,
        ELoomSparkAction Reason);

    /** Compute the level enum from a raw spark total. */
    UFUNCTION(BlueprintPure, Category = "Progression")
    ELoomSparkLevel GetLevelForSpark(int32 TotalSpark) const;

    // ── Luminance ─────────────────────────────────────────────────

    /**
     * Decay luminance for worlds not visited since LastVisitMs.
     * Should be called at session start only.
     */
    UFUNCTION(BlueprintCallable, Category = "Progression")
    void ApplyLuminanceDecay(
        UPARAM(ref) FLoomKindlerProgressionState& InOutState,
        int64 NowMs);

    /**
     * Boost luminance for a world (e.g., after world completion or threadway
     * discovery). Clamped to [0, 100].
     */
    UFUNCTION(BlueprintCallable, Category = "Progression")
    void BoostWorldLuminance(
        UPARAM(ref) FLoomKindlerProgressionState& InOutState,
        const FString& WorldId,
        int32 BoostAmount);

    // ── Welcome Back ─────────────────────────────────────────────

    /**
     * Check if the kindler has been absent > AbsenceThresholdDays and award the
     * welcome-back spark bonus + spawn petal VFX.
     */
    UFUNCTION(BlueprintCallable, Category = "Progression")
    bool ApplyWelcomeBack(
        UPARAM(ref) FLoomKindlerProgressionState& InOutState,
        int64 NowMs);

    // ── Aura Material ─────────────────────────────────────────────

    /**
     * Write the current level's AuraMPCValue to the global AuraMPC collection.
     * Called automatically by AddSpark; call manually after loading a session.
     */
    UFUNCTION(BlueprintCallable, Category = "Progression")
    void UpdateAuraMaterial(ELoomSparkLevel Level);

    // ── Delegates ─────────────────────────────────────────────────

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnSparkGained,
        FString, KindlerId, FLoomSparkGainResult, Result);

    UPROPERTY(BlueprintAssignable, Category = "Progression|Events")
    FOnSparkGained OnSparkGained;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnLevelUp,
        FString, KindlerId, ELoomSparkLevel, NewLevel);

    UPROPERTY(BlueprintAssignable, Category = "Progression|Events")
    FOnLevelUp OnLevelUp;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnWelcomeBack,
        FString, KindlerId);

    UPROPERTY(BlueprintAssignable, Category = "Progression|Events")
    FOnWelcomeBack OnWelcomeBack;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnLuminanceChanged,
        FString, WorldId, int32, NewLuminance);

    UPROPERTY(BlueprintAssignable, Category = "Progression|Events")
    FOnLuminanceChanged OnLuminanceChanged;

    // ── UActorComponent ───────────────────────────────────────────

    virtual void BeginPlay() override;

private:
    // Seed LevelDefinitions with canonical Bible v5 values if empty
    void InitDefaultLevelDefs();

    // Spawn a loaded Niagara system at the owning actor's location
    void SpawnVFXAtOwner(class UNiagaraSystem* System);
};
