// BridgeLoomNiagara.h — Niagara VFX integration for Loom world effects
// Manages Lattice energy flows, Weave transit particles, and spell effects.
// Thread: bridge/bridge-loom-ue5/niagara
// Tier: 2

// Copyright Project Loom. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "NiagaraComponent.h"
#include "NiagaraSystem.h"
#include "BridgeLoomNiagara.generated.h"

// ── Effect Enums ─────────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomNiagaraEffect : uint8
{
	LatticeEnergyFlow   UMETA(DisplayName = "Lattice Energy Flow"),
	WeaveTransitBurst   UMETA(DisplayName = "Weave Transit Burst"),
	SpellCharge         UMETA(DisplayName = "Spell Charge"),
	SpellImpact         UMETA(DisplayName = "Spell Impact"),
	WorldBorder         UMETA(DisplayName = "World Border"),
	PortalOpenClose     UMETA(DisplayName = "Portal Open/Close"),
	AuraGlow            UMETA(DisplayName = "Aura Glow"),
	ResurrectionBeam    UMETA(DisplayName = "Resurrection Beam"),
};

UENUM(BlueprintType)
enum class ELoomSpellElement : uint8
{
	Fire        UMETA(DisplayName = "Fire"),
	Ice         UMETA(DisplayName = "Ice"),
	Lightning   UMETA(DisplayName = "Lightning"),
	Arcane      UMETA(DisplayName = "Arcane"),
	Shadow      UMETA(DisplayName = "Shadow"),
	Holy        UMETA(DisplayName = "Holy"),
	Nature      UMETA(DisplayName = "Nature"),
};

// ── Structs ───────────────────────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomNiagaraSpawnRequest
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Niagara")
	ELoomNiagaraEffect EffectType = ELoomNiagaraEffect::LatticeEnergyFlow;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Niagara")
	FVector Location = FVector::ZeroVector;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Niagara")
	FRotator Rotation = FRotator::ZeroRotator;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Niagara")
	float Scale = 1.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Niagara")
	ELoomSpellElement Element = ELoomSpellElement::Arcane;

	// Duration in seconds; -1 = loop until StopEffect is called
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Niagara")
	float Duration = 2.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Niagara")
	FLinearColor OverrideColor = FLinearColor::White;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Niagara")
	bool bUseOverrideColor = false;

	// Stable id used to attach or stop this specific effect later
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Niagara")
	FString EffectId;
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomLatticeFlowParams
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Lattice")
	FVector StartPoint = FVector::ZeroVector;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Lattice")
	FVector EndPoint = FVector(0.0f, 0.0f, 500.0f);

	// 0–1 Lattice activity level
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Lattice")
	float EnergyIntensity = 1.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Lattice")
	float FlowSpeed = 500.0f;   // cm/s

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Lattice")
	FLinearColor EnergyColor = FLinearColor(0.3f, 0.7f, 1.0f);	// default cyan
};

// ── Component ─────────────────────────────────────────────────────

/**
 * UBridgeLoomNiagara — Actor component that spawns and manages Niagara
 * particle systems driven by Loom world events.
 *
 * Features:
 *   - Per-effect object pool to avoid runtime allocations during combat
 *   - Element-to-colour mapping for spell travel and impact FX
 *   - Lattice energy flow streaming between two world-space points
 *   - Weave transit burst at WorldGate locations
 *   - Spell travel + impact spawn with automatic cleanup on completion
 *
 * Assign Niagara system assets in EffectAssets / SpellTravelAssets /
 * SpellImpactAssets via the actor Details panel or a DataTable at startup.
 */
UCLASS(ClassGroup=(Loom), meta=(BlueprintSpawnableComponent))
class BRIDGELOOM_API UBridgeLoomNiagara : public UActorComponent
{
	GENERATED_BODY()

public:
	UBridgeLoomNiagara();

	virtual void BeginPlay() override;
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;
	virtual void TickComponent(float DeltaTime, ELevelTick TickType,
	                           FActorComponentTickFunction* ThisTickFunction) override;

	// -- Spawn API ------------------------------------------------------------------

	/** Spawn (or reuse from pool) a Niagara effect at the requested location. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Niagara")
	UNiagaraComponent* SpawnEffect(const FLoomNiagaraSpawnRequest& Request);

	/** Stop a looping effect by id and return its component to the pool. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Niagara")
	void StopEffect(const FString& EffectId);

	// -- Lattice & Weave -----------------------------------------------------------

	/** Update streaming Lattice energy flow between two world points. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Lattice")
	void UpdateLatticeFlow(const FLoomLatticeFlowParams& Params);

	/** Trigger Weave transit warp burst at a gate location. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Weave")
	void TriggerWeaveBurst(const FVector& Location, const FString& DestinationWorldId);

	// -- Spells --------------------------------------------------------------------

	/** Spawn a travelling spell projectile trail between two world points. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Spells")
	void SpawnSpellTravel(
		const FVector& From, const FVector& To,
		ELoomSpellElement Element,
		float TravelTimeSeconds);

	/** Spawn a spell impact burst at a world hit point. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Spells")
	void SpawnSpellImpact(const FVector& Location, ELoomSpellElement Element, float Radius);

	// -- Configuration -------------------------------------------------------------

	/** Pre-warmed pool size; governs how many UNiagaraComponents are created at BeginPlay. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Niagara|Pool")
	int32 PoolSize = 32;

	/** Niagara system assets keyed by effect type (assign in editor). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Niagara|Assets")
	TMap<TEnumAsByte<ELoomNiagaraEffect>, UNiagaraSystem*> EffectAssets;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Niagara|Assets")
	TMap<TEnumAsByte<ELoomSpellElement>, UNiagaraSystem*> SpellTravelAssets;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Niagara|Assets")
	TMap<TEnumAsByte<ELoomSpellElement>, UNiagaraSystem*> SpellImpactAssets;

private:
	// Active looping effects indexed by stable EffectId
	TMap<FString, UNiagaraComponent*> ActiveEffects;

	// Pre-warmed idle components
	TArray<UNiagaraComponent*> EffectPool;

	// Per-active-effect time-to-live tracking (seconds remaining; -1 = looping)
	TMap<FString, float> EffectTTL;

	UNiagaraComponent* AcquireFromPool();
	void ReturnToPool(UNiagaraComponent* Component);
	void TickActiveEffects(float DeltaTime);

	FLinearColor ElementToColor(ELoomSpellElement Element) const;
};
