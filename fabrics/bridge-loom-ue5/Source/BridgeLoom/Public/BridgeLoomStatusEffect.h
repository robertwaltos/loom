// Copyright Koydo. All Rights Reserved.
// BridgeLoomStatusEffect.h — UE5 bridge for the status-effect.ts buff/debuff system.
//
// status-effect.ts manages all buffs, debuffs, immunity grants, and tick effects:
//   EffectTypes  : POISON, BURN, FREEZE, STUN, SLOW, HASTE, REGEN, SHIELD, WEAKNESS, STRENGTH
//   StackBehavior: REPLACE, EXTEND, STACK, REFRESH
//
// UE5 side:
//   - Drives the post-process material overlays (frozen = blue tinted vignette,
//     burning = heat shimmer, stunned = screen shake, etc.)
//   - Spawns Niagara particle effects as status icons above the character
//   - Feeds active effects to the HUD status icon strip
//   - Drives UI icon tray (sorted by remaining duration)

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomStatusEffect.generated.h"

// ─── Enumerations ──────────────────────────────────────────────────

/** Mirrors EffectType from status-effect.ts. */
UENUM(BlueprintType)
enum class ELoomStatusEffectType : uint8
{
    Poison      UMETA(DisplayName = "Poison — DoT over time"),
    Burn        UMETA(DisplayName = "Burn — fire DoT"),
    Freeze      UMETA(DisplayName = "Freeze — immobilise"),
    Stun        UMETA(DisplayName = "Stun — action interrupt"),
    Slow        UMETA(DisplayName = "Slow — reduced speed"),
    Haste       UMETA(DisplayName = "Haste — increased speed"),
    Regen       UMETA(DisplayName = "Regen — health recovery"),
    Shield      UMETA(DisplayName = "Shield — absorb damage"),
    Weakness    UMETA(DisplayName = "Weakness — reduced damage"),
    Strength    UMETA(DisplayName = "Strength — increased damage"),
};

/** Mirrors StackBehavior — how a new application interacts with an existing one. */
UENUM(BlueprintType)
enum class ELoomStackBehavior : uint8
{
    Replace UMETA(DisplayName = "Replace — overwrite existing"),
    Extend  UMETA(DisplayName = "Extend — add duration onto existing"),
    Stack   UMETA(DisplayName = "Stack — add as separate instance"),
    Refresh UMETA(DisplayName = "Refresh — reset duration, update magnitude"),
};

// ─── Structs ───────────────────────────────────────────────────────

/**
 * A single active status effect — mirrors ActiveEffect from status-effect.ts.
 * Delivered to UE5 as the authoritative list for rendering.
 */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomActiveStatusEffect
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "StatusEffect")
    FString EffectId;

    UPROPERTY(BlueprintReadOnly, Category = "StatusEffect")
    ELoomStatusEffectType EffectType = ELoomStatusEffectType::Poison;

    /** Magnitude scaled to float for UE5 material parameters. */
    UPROPERTY(BlueprintReadOnly, Category = "StatusEffect")
    float Magnitude = 0.0f;

    /** Remaining duration in seconds (converted from microseconds). */
    UPROPERTY(BlueprintReadOnly, Category = "StatusEffect")
    float RemainingDurationSec = 0.0f;

    /** Stack count — how many simultaneous instances of this type. */
    UPROPERTY(BlueprintReadOnly, Category = "StatusEffect")
    int32 StackCount = 1;
};

/** One immunity grant record. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomStatusImmunity
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "StatusEffect")
    FString EntityId;

    UPROPERTY(BlueprintReadOnly, Category = "StatusEffect")
    ELoomStatusEffectType EffectType = ELoomStatusEffectType::Poison;

    /** Remaining immunity duration in seconds. */
    UPROPERTY(BlueprintReadOnly, Category = "StatusEffect")
    float RemainingDurationSec = 0.0f;
};

/** Full status report for an entity — mirrors StatusReport. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomStatusReport
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "StatusEffect")
    FString EntityId;

    UPROPERTY(BlueprintReadOnly, Category = "StatusEffect")
    TArray<FLoomActiveStatusEffect> ActiveEffects;

    UPROPERTY(BlueprintReadOnly, Category = "StatusEffect")
    TArray<FLoomStatusImmunity> Immunities;

    UPROPERTY(BlueprintReadOnly, Category = "StatusEffect")
    int32 TotalEffects = 0;
};

/** Payload broadcast when the Loom ticks an effect (periodic damage/heal). */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomEffectTickResult
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "StatusEffect")
    FString EntityId;

    UPROPERTY(BlueprintReadOnly, Category = "StatusEffect")
    FString EffectId;

    UPROPERTY(BlueprintReadOnly, Category = "StatusEffect")
    ELoomStatusEffectType EffectType = ELoomStatusEffectType::Poison;

    UPROPERTY(BlueprintReadOnly, Category = "StatusEffect")
    float Magnitude = 0.0f;
};

// ─── Component ────────────────────────────────────────────────────

/**
 * UBridgeLoomStatusEffect — ActorComponent bridging status-effect.ts state
 * to UE5 post-process overlays, Niagara icons, and HUD tray.
 *
 * The bridge is purely a renderer of status state — combat logic stays on
 * the Loom server.  UE5 receives FLoomStatusReport snapshots and renders them.
 *
 * Usage:
 *   1. Server transport pushes status updates → call ApplyStatusReport().
 *   2. When the Loom fires a TickResult → call NotifyEffectTick().
 *   3. Bind OnStatusChanged / OnEffectTicked for HUD and VFX responses.
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent),
       DisplayName = "Loom Status Effect")
class BRIDGELOOM_API UBridgeLoomStatusEffect : public UActorComponent
{
    GENERATED_BODY()

public:
    UBridgeLoomStatusEffect();

    // ── Configuration ─────────────────────────────────────────────

    /** Per-effect-type Niagara particle — spawned above entity when active. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "StatusEffect|VFX")
    TMap<ELoomStatusEffectType, TSoftObjectPtr<class UNiagaraSystem>> EffectVFXMap;

    /**
     * Post-process material for negative status overlay.
     * MPC float params expected: "PoisonIntensity", "FreezeIntensity", "BurnIntensity".
     */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "StatusEffect|PostProcess")
    TSoftObjectPtr<class UMaterialParameterCollection> StatusEffectMPC;

    // ── State ─────────────────────────────────────────────────────

    UPROPERTY(BlueprintReadOnly, Category = "StatusEffect")
    FLoomStatusReport CurrentStatus;

    // ── Methods ───────────────────────────────────────────────────

    /**
     * Apply an authoritative status report snapshot from the Loom.
     * Diffs against the previous report to fire targeted add/remove events.
     */
    UFUNCTION(BlueprintCallable, Category = "StatusEffect")
    void ApplyStatusReport(const FLoomStatusReport& Report);

    /**
     * Notify UE5 that the Loom ticked a periodic effect.
     * Fires OnEffectTicked — Blueprint typically shows a floating combat text.
     */
    UFUNCTION(BlueprintCallable, Category = "StatusEffect")
    void NotifyEffectTick(const FLoomEffectTickResult& TickResult);

    /** Returns true if the entity currently has the given effect type active. */
    UFUNCTION(BlueprintPure, Category = "StatusEffect")
    bool HasEffect(ELoomStatusEffectType EffectType) const;

    /** Returns true if the entity is immune to the given effect type. */
    UFUNCTION(BlueprintPure, Category = "StatusEffect")
    bool IsImmuneTo(ELoomStatusEffectType EffectType) const;

    // ── Delegates ─────────────────────────────────────────────────

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnStatusChanged,
        FString, EntityId, FLoomStatusReport, NewStatus);

    UPROPERTY(BlueprintAssignable, Category = "StatusEffect|Events")
    FOnStatusChanged OnStatusChanged;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnEffectApplied,
        FString, EntityId, FLoomActiveStatusEffect, Effect);

    /** Fired when a previously-absent effect appears in the status report. */
    UPROPERTY(BlueprintAssignable, Category = "StatusEffect|Events")
    FOnEffectApplied OnEffectApplied;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnEffectRemoved,
        FString, EntityId, ELoomStatusEffectType, EffectType);

    UPROPERTY(BlueprintAssignable, Category = "StatusEffect|Events")
    FOnEffectRemoved OnEffectRemoved;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnEffectTicked,
        FString, EntityId, FLoomEffectTickResult, TickResult);

    UPROPERTY(BlueprintAssignable, Category = "StatusEffect|Events")
    FOnEffectTicked OnEffectTicked;

    // ── UActorComponent ───────────────────────────────────────────

    virtual void BeginPlay() override;

private:
    /** Effect types present in the previous report (for diff). */
    TSet<ELoomStatusEffectType> PreviousEffectTypes;

    void UpdatePostProcessParams();
    void SpawnEffectVFX(ELoomStatusEffectType EffectType);
};
