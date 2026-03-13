// Copyright Koydo. All Rights Reserved.
// BridgeLoomAbility.h — UE5 bridge for ability-system.ts skill activation and cooldowns.
//
// ability-system.ts (priority 190) manages the complete ability pipeline:
//   - Ability registry: each ability has costs (ResourceType × amount), cooldownUs,
//     effectType, effectMagnitude, effectDurationUs, range
//   - activateAbility(entityId, abilityId, targetEntityId?) → ActivationResult
//     validates: entity exists, ability registered, resources sufficient, cooldown clear
//   - Cooldown tracking: stores {abilityId, entityId, startedAt, durationUs, endsAt}
//   - Resource types: STAMINA, MANA, HEALTH, ENERGY
//   - Effect types:   DAMAGE, HEAL, BUFF, DEBUFF, TELEPORT, SUMMON, SHIELD
//
// UE5 side responsibility:
//   - Caches cooldown states for Blueprint queries (progress bars, greyed-out buttons)
//   - Fires VFX/audio on activation or failure
//   - Notifies UI when a cooldown expires

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomAbility.generated.h"

// ─── Enums ─────────────────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomAbilityEffectType : uint8
{
    Damage   UMETA(DisplayName = "Damage"),
    Heal     UMETA(DisplayName = "Heal"),
    Buff     UMETA(DisplayName = "Buff"),
    Debuff   UMETA(DisplayName = "Debuff"),
    Teleport UMETA(DisplayName = "Teleport"),
    Summon   UMETA(DisplayName = "Summon"),
    Shield   UMETA(DisplayName = "Shield"),
};

UENUM(BlueprintType)
enum class ELoomAbilityResource : uint8
{
    Stamina UMETA(DisplayName = "Stamina"),
    Mana    UMETA(DisplayName = "Mana"),
    Health  UMETA(DisplayName = "Health"),
    Energy  UMETA(DisplayName = "Energy"),
};

// ─── Structs ───────────────────────────────────────────────────────

/** A single resource spend required to activate an ability. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomResourceCost
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Ability")
    ELoomAbilityResource ResourceType = ELoomAbilityResource::Mana;

    UPROPERTY(BlueprintReadOnly, Category = "Ability")
    float Amount = 0.0f;
};

/** Ability definition — mirrors ability-system.ts Ability interface. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomAbilityDef
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Ability")
    FString AbilityId;

    UPROPERTY(BlueprintReadOnly, Category = "Ability")
    FString Name;

    UPROPERTY(BlueprintReadOnly, Category = "Ability")
    TArray<FLoomResourceCost> Costs;

    /** Cooldown duration in seconds (derived from cooldownUs / 1e6). */
    UPROPERTY(BlueprintReadOnly, Category = "Ability")
    float CooldownSeconds = 0.0f;

    UPROPERTY(BlueprintReadOnly, Category = "Ability")
    ELoomAbilityEffectType EffectType = ELoomAbilityEffectType::Damage;

    UPROPERTY(BlueprintReadOnly, Category = "Ability")
    float EffectMagnitude = 0.0f;

    UPROPERTY(BlueprintReadOnly, Category = "Ability")
    float EffectDurationSeconds = 0.0f;

    /** Max range in game units (0 = unlimited). */
    UPROPERTY(BlueprintReadOnly, Category = "Ability")
    float Range = 0.0f;
};

/** Live cooldown state for one (entity, ability) pair. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomCooldownState
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Ability")
    FString AbilityId;

    UPROPERTY(BlueprintReadOnly, Category = "Ability")
    FString EntityId;

    /** Unix-ms timestamp when the cooldown ends. */
    UPROPERTY(BlueprintReadOnly, Category = "Ability")
    int64 EndsAtMs = 0;

    /** Cached remaining seconds (updated each bridgeTick). */
    UPROPERTY(BlueprintReadOnly, Category = "Ability")
    float RemainingSeconds = 0.0f;
};

/** Result of an ability activation attempt. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomActivationResult
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Ability")
    bool bSuccess = false;

    UPROPERTY(BlueprintReadOnly, Category = "Ability")
    FString AbilityId;

    UPROPERTY(BlueprintReadOnly, Category = "Ability")
    FString EntityId;

    /** Optional target. Empty string if the ability has no target. */
    UPROPERTY(BlueprintReadOnly, Category = "Ability")
    FString TargetEntityId;

    UPROPERTY(BlueprintReadOnly, Category = "Ability")
    float EffectMagnitude = 0.0f;

    /** Unix-ms when the newly started cooldown expires (0 if no cooldown). */
    UPROPERTY(BlueprintReadOnly, Category = "Ability")
    int64 CooldownEndsAtMs = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Ability")
    int64 ActivatedAtMs = 0;
};

// ─── Component ────────────────────────────────────────────────────

/**
 * UBridgeLoomAbility — ActorComponent bridging ability-system.ts activations
 * and cooldown tracking to Blueprint-driven UE5 gameplay.
 *
 * Attach to the Pawn or Character that owns the ability bar.
 *
 * Workflow (activate):
 *   1. Player presses ability hotkey → Blueprint calls RequestActivation(AbilityId, TargetId).
 *   2. Transport sends the RPC to the Loom server.
 *   3. Server validates and responds:
 *      - Success → transport calls NotifyActivation(Result, Def)
 *      - Failure → transport calls NotifyActivationFailed(EntityId, AbilityId, Error)
 *   4. Bridge fires delegates; Blueprint plays VFX / updates UI.
 *
 * Cooldown querying:
 *   Blueprint uses IsOnCooldown(AbilityId) and GetCooldownRemaining(AbilityId)
 *   to drive progress bars without a JS round-trip.
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent),
       DisplayName = "Loom Ability")
class BRIDGELOOM_API UBridgeLoomAbility : public UActorComponent
{
    GENERATED_BODY()

public:
    UBridgeLoomAbility();

    // ── Configuration ─────────────────────────────────────────────

    /** Niagara system played at the caster location on success. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Ability|VFX")
    TMap<ELoomAbilityEffectType, TSoftObjectPtr<class UNiagaraSystem>> ActivationVFXMap;

    /** Niagara system played to indicate a failed activation. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Ability|VFX")
    TSoftObjectPtr<class UNiagaraSystem> FailVFXTemplate;

    // ── State ─────────────────────────────────────────────────────

    /** All known ability definitions (populated by the transport layer). */
    UPROPERTY(BlueprintReadOnly, Category = "Ability")
    TMap<FString, FLoomAbilityDef> AbilityRegistry;

    // ── Methods (outbound) ────────────────────────────────────────

    /**
     * Sends an activation request.
     * Fires OnActivationRequested so the transport layer can forward it.
     */
    UFUNCTION(BlueprintCallable, Category = "Ability")
    void RequestActivation(const FString& AbilityId, const FString& TargetEntityId);

    /**
     * Registers or updates an ability definition received from the server.
     */
    UFUNCTION(BlueprintCallable, Category = "Ability")
    void RegisterAbility(const FLoomAbilityDef& Def);

    // ── Methods (inbound from transport) ─────────────────────────

    /**
     * Called on successful activation.
     * Updates cooldown cache, fires VFX, fires OnAbilityActivated.
     */
    UFUNCTION(BlueprintCallable, Category = "Ability")
    void NotifyActivation(const FLoomActivationResult& Result,
                          const FLoomAbilityDef& Def);

    /**
     * Called when the server rejects the activation attempt.
     * Fires fail VFX and OnAbilityFailed.
     */
    UFUNCTION(BlueprintCallable, Category = "Ability")
    void NotifyActivationFailed(const FString& EntityId,
                                const FString& AbilityId,
                                const FString& ErrorCode);

    /**
     * Pushes an updated cooldown state from the server.
     * Use to initialise cooldowns on session resume.
     */
    UFUNCTION(BlueprintCallable, Category = "Ability")
    void ApplyCooldownState(const FLoomCooldownState& CooldownState);

    /**
     * Server-authoritative cooldown clear.
     * Fires OnCooldownExpired.
     */
    UFUNCTION(BlueprintCallable, Category = "Ability")
    void NotifyCooldownExpired(const FString& AbilityId, const FString& EntityId);

    // ── Cooldown queries ──────────────────────────────────────────

    UFUNCTION(BlueprintPure, Category = "Ability")
    bool IsOnCooldown(const FString& AbilityId) const;

    /** Remaining cooldown in seconds. Returns 0 if not on cooldown. */
    UFUNCTION(BlueprintPure, Category = "Ability")
    float GetCooldownRemaining(const FString& AbilityId) const;

    // ── Delegates ─────────────────────────────────────────────────

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnActivationRequested,
        FString, AbilityId, FString, TargetEntityId);
    /** Transport layer subscribes to send the RPC. */
    UPROPERTY(BlueprintAssignable, Category = "Ability|Requests")
    FOnActivationRequested OnActivationRequested;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnAbilityActivated,
        FLoomActivationResult, Result, FLoomAbilityDef, Def);
    UPROPERTY(BlueprintAssignable, Category = "Ability|Events")
    FOnAbilityActivated OnAbilityActivated;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(FOnAbilityFailed,
        FString, EntityId, FString, AbilityId, FString, ErrorCode);
    UPROPERTY(BlueprintAssignable, Category = "Ability|Events")
    FOnAbilityFailed OnAbilityFailed;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnCooldownExpired,
        FString, AbilityId, FString, EntityId);
    UPROPERTY(BlueprintAssignable, Category = "Ability|Events")
    FOnCooldownExpired OnCooldownExpired;

    // ── UActorComponent ───────────────────────────────────────────

    virtual void TickComponent(float DeltaTime, ELevelTick TickType,
                               FActorComponentTickFunction* ThisTickFunction) override;

private:
    /** In-flight cooldowns keyed by AbilityId. */
    TMap<FString, FLoomCooldownState> ActiveCooldowns;

    void SpawnActivationVFX(ELoomAbilityEffectType EffectType, const FVector& Location);
    void SpawnFailVFX(const FVector& Location);
};
