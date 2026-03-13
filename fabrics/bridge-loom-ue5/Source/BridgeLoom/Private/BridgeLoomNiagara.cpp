// Copyright Project Loom. All Rights Reserved.

#include "BridgeLoomNiagara.h"
#include "NiagaraFunctionLibrary.h"
#include "Engine/World.h"

// ── Constructor ──────────────────────────────────────────────────

UBridgeLoomNiagara::UBridgeLoomNiagara()
{
	PrimaryComponentTick.bCanEverTick = true;
}

// ── Lifecycle ────────────────────────────────────────────────────

void UBridgeLoomNiagara::BeginPlay()
{
	Super::BeginPlay();

	// Pre-warm the pool with inactive UNiagaraComponents
	for (int32 i = 0; i < PoolSize; ++i)
	{
		UNiagaraComponent* NC = NewObject<UNiagaraComponent>(GetOwner());
		NC->bAutoActivate = false;
		NC->RegisterComponent();
		NC->Deactivate();
		EffectPool.Add(NC);
	}
}

void UBridgeLoomNiagara::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	for (auto& [Id, Comp] : ActiveEffects)
	{
		if (IsValid(Comp))
		{
			Comp->DeactivateImmediate();
		}
	}
	ActiveEffects.Empty();
	EffectPool.Empty();

	Super::EndPlay(EndPlayReason);
}

void UBridgeLoomNiagara::TickComponent(float DeltaTime,
                                       ELevelTick TickType,
                                       FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);
	TickActiveEffects(DeltaTime);
}

// ── Pool helpers ─────────────────────────────────────────────────

UNiagaraComponent* UBridgeLoomNiagara::AcquireFromPool()
{
	for (int32 i = EffectPool.Num() - 1; i >= 0; --i)
	{
		UNiagaraComponent* NC = EffectPool[i];
		if (IsValid(NC) && !NC->IsActive())
		{
			EffectPool.RemoveAt(i);
			return NC;
		}
	}

	// Pool exhausted — allocate a new component
	UNiagaraComponent* NC = NewObject<UNiagaraComponent>(GetOwner());
	NC->bAutoActivate = false;
	NC->RegisterComponent();
	return NC;
}

void UBridgeLoomNiagara::ReturnToPool(UNiagaraComponent* Component)
{
	if (!IsValid(Component)) return;
	Component->DeactivateImmediate();
	Component->SetWorldLocation(FVector::ZeroVector);
	EffectPool.Add(Component);
}

// ── Spawn API ────────────────────────────────────────────────────

UNiagaraComponent* UBridgeLoomNiagara::SpawnEffect(const FLoomNiagaraSpawnRequest& Request)
{
	// Resolve asset
	UNiagaraSystem* System = nullptr;
	if (UNiagaraSystem** Found = EffectAssets.Find(TEnumAsByte<ELoomNiagaraEffect>(Request.EffectType)))
	{
		System = *Found;
	}
	if (!System) return nullptr;

	UNiagaraComponent* NC = AcquireFromPool();
	NC->SetAsset(System);
	NC->SetWorldLocationAndRotation(Request.Location, Request.Rotation);
	NC->SetWorldScale3D(FVector(Request.Scale));

	if (Request.bUseOverrideColor)
	{
		NC->SetVariableLinearColor(TEXT("OverrideColor"), Request.OverrideColor);
	}

	NC->Activate(true);

	if (!Request.EffectId.IsEmpty())
	{
		ActiveEffects.Add(Request.EffectId, NC);
		EffectTTL.Add(Request.EffectId, Request.Duration);
	}

	return NC;
}

void UBridgeLoomNiagara::StopEffect(const FString& EffectId)
{
	if (UNiagaraComponent** Found = ActiveEffects.Find(EffectId))
	{
		ReturnToPool(*Found);
		ActiveEffects.Remove(EffectId);
		EffectTTL.Remove(EffectId);
	}
}

// ── Lattice & Weave ──────────────────────────────────────────────

void UBridgeLoomNiagara::UpdateLatticeFlow(const FLoomLatticeFlowParams& Params)
{
	static const FString LatticeEffectId = TEXT("__LatticeFlow__");

	FLoomNiagaraSpawnRequest Req;
	Req.EffectType       = ELoomNiagaraEffect::LatticeEnergyFlow;
	Req.Location         = Params.StartPoint;
	Req.Duration         = -1.0f;	// looping
	Req.EffectId         = LatticeEffectId;
	Req.OverrideColor    = Params.EnergyColor;
	Req.bUseOverrideColor = true;

	if (!ActiveEffects.Contains(LatticeEffectId))
	{
		SpawnEffect(Req);
	}

	if (UNiagaraComponent** NC = ActiveEffects.Find(LatticeEffectId))
	{
		(*NC)->SetVariableVec3(TEXT("BeamEnd"), Params.EndPoint);
		(*NC)->SetVariableFloat(TEXT("Intensity"), Params.EnergyIntensity);
		(*NC)->SetVariableFloat(TEXT("Speed"),     Params.FlowSpeed);
	}
}

void UBridgeLoomNiagara::TriggerWeaveBurst(const FVector& Location,
                                             const FString& DestinationWorldId)
{
	FLoomNiagaraSpawnRequest Req;
	Req.EffectType = ELoomNiagaraEffect::WeaveTransitBurst;
	Req.Location   = Location;
	Req.Duration   = 3.0f;
	Req.EffectId   = FString::Printf(TEXT("WeaveBurst_%s"), *DestinationWorldId);
	SpawnEffect(Req);
}

// ── Spells ───────────────────────────────────────────────────────

void UBridgeLoomNiagara::SpawnSpellTravel(const FVector& From, const FVector& To,
                                           ELoomSpellElement Element,
                                           float TravelTimeSeconds)
{
	UNiagaraSystem* System = nullptr;
	if (UNiagaraSystem** Found = SpellTravelAssets.Find(TEnumAsByte<ELoomSpellElement>(Element)))
	{
		System = *Found;
	}
	if (!System) return;

	UNiagaraComponent* NC = AcquireFromPool();
	NC->SetAsset(System);
	NC->SetWorldLocation(From);
	NC->SetVariableVec3(TEXT("TargetLocation"), To);
	NC->SetVariableFloat(TEXT("TravelTime"),    TravelTimeSeconds);
	NC->SetVariableLinearColor(TEXT("ElementColor"), ElementToColor(Element));
	NC->Activate(true);

	// Auto-return after travel completes (add a small grace margin)
	const FString TrailId = FString::Printf(TEXT("SpellTrail_%p"), NC);
	ActiveEffects.Add(TrailId, NC);
	EffectTTL.Add(TrailId, TravelTimeSeconds + 0.5f);
}

void UBridgeLoomNiagara::SpawnSpellImpact(const FVector& Location,
                                           ELoomSpellElement Element,
                                           float Radius)
{
	UNiagaraSystem* System = nullptr;
	if (UNiagaraSystem** Found = SpellImpactAssets.Find(TEnumAsByte<ELoomSpellElement>(Element)))
	{
		System = *Found;
	}
	if (!System) return;

	UNiagaraComponent* NC = AcquireFromPool();
	NC->SetAsset(System);
	NC->SetWorldLocation(Location);
	NC->SetVariableFloat(TEXT("ImpactRadius"),  Radius);
	NC->SetVariableLinearColor(TEXT("ElementColor"), ElementToColor(Element));
	NC->Activate(true);

	const FString ImpactId = FString::Printf(TEXT("SpellImpact_%p"), NC);
	ActiveEffects.Add(ImpactId, NC);
	EffectTTL.Add(ImpactId, 2.0f);
}

// ── Tick helpers ─────────────────────────────────────────────────

void UBridgeLoomNiagara::TickActiveEffects(float DeltaTime)
{
	TArray<FString> ToRemove;
	for (auto& [Id, NC] : ActiveEffects)
	{
		if (!IsValid(NC) || !NC->IsActive())
		{
			ToRemove.Add(Id);
			continue;
		}

		float& TTL = EffectTTL.FindOrAdd(Id, -1.0f);
		if (TTL < 0.0f) continue;		// looping

		TTL -= DeltaTime;
		if (TTL <= 0.0f)
		{
			ToRemove.Add(Id);
		}
	}

	for (const FString& Id : ToRemove)
	{
		if (UNiagaraComponent** NC = ActiveEffects.Find(Id))
		{
			ReturnToPool(*NC);
		}
		ActiveEffects.Remove(Id);
		EffectTTL.Remove(Id);
	}
}

// ── Utilities ────────────────────────────────────────────────────

FLinearColor UBridgeLoomNiagara::ElementToColor(ELoomSpellElement Element) const
{
	switch (Element)
	{
		case ELoomSpellElement::Fire:      return FLinearColor(1.0f, 0.3f, 0.0f);
		case ELoomSpellElement::Ice:       return FLinearColor(0.4f, 0.9f, 1.0f);
		case ELoomSpellElement::Lightning: return FLinearColor(1.0f, 1.0f, 0.2f);
		case ELoomSpellElement::Arcane:    return FLinearColor(0.7f, 0.3f, 1.0f);
		case ELoomSpellElement::Shadow:    return FLinearColor(0.2f, 0.0f, 0.3f);
		case ELoomSpellElement::Holy:      return FLinearColor(1.0f, 0.97f, 0.8f);
		case ELoomSpellElement::Nature:    return FLinearColor(0.2f, 0.8f, 0.2f);
		default:                           return FLinearColor::White;
	}
}
