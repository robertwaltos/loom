// Copyright Project Loom. All Rights Reserved.
// Thread: bridge/bridge-loom-ue5/metahuman-library
// Tier: 1
//
// MetaHuman preset library, dynamic blending, streaming, and GPU budget enforcement.
//
// Complements UBridgeLoomMetaHuman (per-character facial animation) by managing
// the *catalogue* of base characters and the lifecycle of loading them at runtime.
//
// Budget rules (enforced every tick at 0.5Hz):
//   Full     : max 5 on screen
//   Medium   : max 20
//   Low      : max 100
//   Characters beyond budget are demoted to the next lower LOD tier.

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomMetaHuman.h"
#include "Engine/StreamableManager.h"
#include "BridgeLoomMetaHumanLibrary.generated.h"

// ── Preset descriptor ────────────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomMetaHumanPreset
{
	GENERATED_BODY()

	/** Unique preset identifier (matches MetaHuman Creator name) */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Library")
	FString PresetId;

	/** Human-readable display name */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Library")
	FString DisplayName;

	/** Approximate age in years (drives blend weight) */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Library")
	float AgeBias = 30.0f;

	/** Ethnicity tag for diversity tooling */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Library")
	FName EthnicityTag;

	/** Body morph overrides applied on top of the base skeleton */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Library")
	TMap<FName, float> MorphOverrides;

	/** Soft reference to the skeletal mesh asset */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Library")
	TSoftObjectPtr<USkeletalMesh> SkeletalMesh;

	/** Soft reference to the Groom hair asset (nullptr = card hair) */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Library")
	TSoftObjectPtr<UObject> GroomAsset;

	/** Whether this preset has RigLogic DNA available */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Library")
	bool bHasRigLogic = true;
};

// ── GPU budget stats ─────────────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomMetaHumanBudgetStats
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Loom|Library")
	int32 ActiveFull   = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Loom|Library")
	int32 ActiveMedium = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Loom|Library")
	int32 ActiveLow    = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Loom|Library")
	int32 ActiveCrowd  = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Loom|Library")
	int32 StreamingInFlight = 0;
};

/**
 * UBridgeLoomMetaHumanLibrary
 *
 * World subsystem-level ActorComponent that owns the preset catalogue and
 * manages async streaming of MetaHuman assets.  Attach to the GameMode or
 * a persistent manager actor.
 *
 * Workflow:
 *   1. RegisterPreset() or LoadAllPresetsFromPath() populates PresetLibrary
 *   2. SpawnMetaHumanFromPreset() kicks off async streaming + spawns actor
 *   3. CreateDynamicBlend() lerps morph overrides between two presets
 *   4. TickBudgetEnforcement() demotes far-away characters when over budget
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent))
class BRIDGELOOM_API UBridgeLoomMetaHumanLibrary : public UActorComponent
{
	GENERATED_BODY()

public:
	UBridgeLoomMetaHumanLibrary();

	virtual void BeginPlay() override;
	virtual void TickComponent(float DeltaTime, ELevelTick TickType,
		FActorComponentTickFunction* ThisTickFunction) override;

	// ── Budget limits (configurable in Editor) ───────────────────

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Library")
	int32 MaxFullQuality = 5;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Library")
	int32 MaxMediumQuality = 20;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Library")
	int32 MaxLowQuality = 100;

	// ── Preset management ────────────────────────────────────────

	/** Register a single preset at runtime. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Library")
	void RegisterPreset(const FLoomMetaHumanPreset& Preset);

	/** Bulk-register presets (e.g. loaded from a DataTable). */
	UFUNCTION(BlueprintCallable, Category = "Loom|Library")
	void RegisterPresets(const TArray<FLoomMetaHumanPreset>& Presets);

	/** Return a preset by ID, or nullptr if not found. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Library")
	bool GetPreset(const FString& PresetId, FLoomMetaHumanPreset& OutPreset) const;

	/** Return all registered preset IDs. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Library")
	TArray<FString> GetAllPresetIds() const;

	// ── Dynamic blending ─────────────────────────────────────────

	/**
	 * Interpolate morph overrides between two presets at the given alpha.
	 * Returns a new ephemeral preset — does NOT add it to the library.
	 */
	UFUNCTION(BlueprintCallable, Category = "Loom|Library")
	FLoomMetaHumanPreset CreateDynamicBlend(const FString& PresetIdA,
	                                         const FString& PresetIdB,
	                                         float Alpha) const;

	// ── Async streaming ──────────────────────────────────────────

	/**
	 * Begin async loading of all soft-ref assets for a preset.
	 * Fires OnPresetStreamed when complete.
	 */
	UFUNCTION(BlueprintCallable, Category = "Loom|Library")
	void BeginStreamingPreset(const FString& PresetId);

	/** Cancel in-flight streaming for a preset. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Library")
	void CancelStreamingPreset(const FString& PresetId);

	/** Spawn an NPC actor at the given transform using a preset (begins streaming if needed). */
	UFUNCTION(BlueprintCallable, Category = "Loom|Library")
	AActor* SpawnMetaHumanFromPreset(const FString& PresetId,
	                                  const FTransform& SpawnTransform,
	                                  TSubclassOf<AActor> ActorClass);

	// ── Budget ───────────────────────────────────────────────────

	/** Return current live budget usage. */
	UFUNCTION(BlueprintPure, Category = "Loom|Library")
	FLoomMetaHumanBudgetStats GetBudgetStats() const;

	/** Force a budget pass right now (normally runs at 0.5Hz). */
	UFUNCTION(BlueprintCallable, Category = "Loom|Library")
	void EnforceGPUBudget();

	// ── Delegates ────────────────────────────────────────────────

	DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnPresetStreamed, const FString&, PresetId);
	UPROPERTY(BlueprintAssignable, Category = "Loom|Library")
	FOnPresetStreamed OnPresetStreamed;

private:
	TMap<FString, FLoomMetaHumanPreset> PresetLibrary;

	// Streaming handles keyed by PresetId
	TMap<FString, TSharedPtr<FStreamableHandle>> StreamHandles;

	// All tracked MetaHuman components in the world
	TArray<TWeakObjectPtr<UBridgeLoomMetaHuman>> TrackedComponents;

	float BudgetTickAccumulator = 0.0f;
	static constexpr float BudgetTickInterval = 0.5f;

	void TickBudgetEnforcement();
	void OnPresetStreamComplete(FString PresetId);
};
