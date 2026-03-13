// Copyright Project Loom. All Rights Reserved.
// Thread: bridge/bridge-loom-ue5/building-stage
// Tier: 1
//
// Building construction visualization: progressive build stages, scaffolding
// animation, worker VFX, and damage/ruin states.

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomBuildingStage.generated.h"

// ── Build stage enum ─────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomBuildStage : uint8
{
	Foundation  UMETA(DisplayName = "Foundation"),
	Walls       UMETA(DisplayName = "Walls"),
	Roof        UMETA(DisplayName = "Roof"),
	Interior    UMETA(DisplayName = "Interior"),
	Furnished   UMETA(DisplayName = "Furnished"),
	Abandoned   UMETA(DisplayName = "Abandoned"),
	Damaged     UMETA(DisplayName = "Damaged"),
	Ruined      UMETA(DisplayName = "Ruined"),
};

// ── Building progress data ───────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomBuildingProgress
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Building")
	FString BuildingId;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Building")
	ELoomBuildStage Stage = ELoomBuildStage::Foundation;

	/** 0.0 = start of stage, 1.0 = stage complete */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Building")
	float ProgressFraction = 0.0f;

	/** Active worker count (drives particle density) */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Building")
	int32 WorkerCount = 0;

	/** Damage fraction 0-1 applied on Damaged/Ruined states */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Building")
	float DamageFraction = 0.0f;
};

// ── Per-building runtime state ───────────────────────────────────

USTRUCT()
struct FLoomBuildingRecord
{
	GENERATED_BODY()

	FLoomBuildingProgress Progress;

	// Stage meshes indexed by ELoomBuildStage uint8
	TMap<uint8, TSoftObjectPtr<UStaticMesh>> StageMeshes;

	// Spawned worker Niagara systems (weak refs)
	TArray<TWeakObjectPtr<UObject>> WorkerVFX;

	// Owner actor weak ref
	TWeakObjectPtr<AActor> OwnerActor;
};

/**
 * UBridgeLoomBuildingStage
 *
 * Manages visual construction state for all registered buildings in a world.
 * Attach to the GameMode or a persistent estate manager actor.
 *
 * Features:
 *   - Static mesh swap per ELoomBuildStage
 *   - Within-stage progress → MPC / material scalar "ConstructionProgress"
 *   - Scaffold HISM animation (oscillating up/down on busy stages)
 *   - Worker Niagara VFX density driven by WorkerCount
 *   - Damage/ruin states with dedicated mesh overrides
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent))
class BRIDGELOOM_API UBridgeLoomBuildingStage : public UActorComponent
{
	GENERATED_BODY()

public:
	UBridgeLoomBuildingStage();

	virtual void BeginPlay() override;
	virtual void TickComponent(float DeltaTime, ELevelTick TickType,
		FActorComponentTickFunction* ThisTickFunction) override;

	// ── Worker VFX asset ─────────────────────────────────────────

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Building")
	TSoftObjectPtr<UObject> WorkerNiagaraSystem;

	/** Scaffold oscillation frequency (radians per second) */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Building")
	float ScaffoldOscillationFreq = 0.8f;

	// ── Building registry ────────────────────────────────────────

	/**
	 * Register a building actor with its per-stage mesh catalogue.
	 * StageMeshes keys are ELoomBuildStage cast to uint8.
	 */
	UFUNCTION(BlueprintCallable, Category = "Loom|Building")
	void RegisterBuilding(const FString& BuildingId,
	                      AActor* OwnerActor,
	                      const TMap<uint8, TSoftObjectPtr<UStaticMesh>>& StageMeshes);

	/** Remove a building record (e.g. on actor destroy). */
	UFUNCTION(BlueprintCallable, Category = "Loom|Building")
	void UnregisterBuilding(const FString& BuildingId);

	// ── Progress updates ─────────────────────────────────────────

	/**
	 * Push a progress update from the Loom server.
	 * Triggers mesh swap if stage changed, updates material scalar.
	 */
	UFUNCTION(BlueprintCallable, Category = "Loom|Building")
	void SetBuildingProgress(const FLoomBuildingProgress& Progress);

	/** Convenience wrapper: set damage fraction directly. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Building")
	void SetDamage(const FString& BuildingId, float DamageFraction);

	// ── Worker VFX ───────────────────────────────────────────────

	/** Spawn a worker VFX emitter at WorldLocation for the given building. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Building")
	void AddWorkerEffect(const FString& BuildingId, const FVector& WorldLocation);

	/** Remove all worker VFX for a building (e.g. work paused). */
	UFUNCTION(BlueprintCallable, Category = "Loom|Building")
	void ClearWorkerEffects(const FString& BuildingId);

	// ── Delegates ────────────────────────────────────────────────

	DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnStageComplete,
	                                              const FString&, BuildingId,
	                                              ELoomBuildStage, CompletedStage);
	UPROPERTY(BlueprintAssignable, Category = "Loom|Building")
	FOnStageComplete OnStageComplete;

private:
	TMap<FString, FLoomBuildingRecord> Buildings;
	float ScaffoldTime = 0.0f;

	void ApplyStage(FLoomBuildingRecord& Record, ELoomBuildStage NewStage);
	void ApplyProgressMaterial(FLoomBuildingRecord& Record, float Fraction);
	void TickScaffoldAnimation(float DeltaTime);
};
