// Copyright Project Loom. All Rights Reserved.

#include "BridgeLoomWater.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Components/PrimitiveComponent.h"
#include "Kismet/GameplayStatics.h"
#include "Math/UnrealMathUtility.h"

// ── Constructor ──────────────────────────────────────────────────

UBridgeLoomWater::UBridgeLoomWater()
{
	PrimaryComponentTick.bCanEverTick = true;
}

// ── Lifecycle ────────────────────────────────────────────────────

void UBridgeLoomWater::BeginPlay()
{
	Super::BeginPlay();
	// Set sane defaults into ocean state
	CurrentOceanState = FLoomOceanState{};
}

void UBridgeLoomWater::TickComponent(float DeltaTime,
                                      ELevelTick TickType,
                                      FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);
	TickWaterPhysics(DeltaTime);
	TickFloodEvents(DeltaTime);
}

// ── Ocean ────────────────────────────────────────────────────────

void UBridgeLoomWater::SetOceanState(const FLoomOceanState& State)
{
	CurrentOceanState = State;
	UpdateOceanMaterial();
}

float UBridgeLoomWater::GetOceanHeightAtLocation(const FVector& WorldLocation) const
{
	// Simple Gerstner sine approximation based on current state
	const float Time = GetWorld() ? GetWorld()->GetTimeSeconds() : 0.0f;
	const float X    = WorldLocation.X;
	const float Y    = WorldLocation.Y;

	const FVector2D& SwellDir = CurrentOceanState.SwellDirection;
	const float ProjDistance  = X * SwellDir.X + Y * SwellDir.Y;
	const float Angular       = CurrentOceanState.WaveFrequency * 2.0f * PI;
	const float Phase         = Angular * ProjDistance / 100.0f + Time;

	return CurrentOceanState.WaveAmplitude * 100.0f * FMath::Sin(Phase);
}

void UBridgeLoomWater::UpdateOceanMaterial()
{
	// Drive material parameters on any WaterBodyOcean actor found in the level.
	// If the WaterBody plugin material interface is available, this would call
	// SetScalarParameterValue / SetVectorParameterValue on the water material.
	// We use a tagged actor search as an integration-safe fallback.
	TArray<AActor*> WaterActors;
	UGameplayStatics::GetAllActorsWithTag(GetWorld(), TEXT("LoomOcean"), WaterActors);

	for (AActor* Actor : WaterActors)
	{
		TArray<UPrimitiveComponent*> Prims;
		Actor->GetComponents<UPrimitiveComponent>(Prims);
		for (UPrimitiveComponent* Prim : Prims)
		{
			UMaterialInstanceDynamic* MID = Cast<UMaterialInstanceDynamic>(
				Prim->GetMaterial(0));
			if (!MID) continue;

			MID->SetScalarParameterValue(TEXT("WaveAmplitude"),  CurrentOceanState.WaveAmplitude);
			MID->SetScalarParameterValue(TEXT("WaveFrequency"),  CurrentOceanState.WaveFrequency);
			MID->SetScalarParameterValue(TEXT("Choppiness"),     CurrentOceanState.Choppiness);
			MID->SetScalarParameterValue(TEXT("FoamIntensity"),  CurrentOceanState.FoamIntensity);
			MID->SetVectorParameterValue(TEXT("WaterColor"), CurrentOceanState.WaterColor);
		}
	}
}

// ── River ────────────────────────────────────────────────────────

void UBridgeLoomWater::UpdateRiverState(const FLoomRiverState& State)
{
	RiverStates.Add(State.RiverId, State);
	UpdateRiverActors();
}

void UBridgeLoomWater::TriggerFloodEvent(const FString& RiverId,
                                          float PeakFloodLevel,
                                          float DurationSeconds)
{
	if (FLoomRiverState* State = RiverStates.Find(RiverId))
	{
		State->bInFlood    = true;
		State->FloodLevelOverride = PeakFloodLevel;
	}
	FloodTimers.Add(RiverId, DurationSeconds);
	OnFloodStarted.Broadcast(RiverId, PeakFloodLevel);
}

void UBridgeLoomWater::UpdateRiverActors()
{
	// Drive river flow parameter on tagged actors (same pattern as ocean)
	for (auto& [RiverId, State] : RiverStates)
	{
		TArray<AActor*> Actors;
		UGameplayStatics::GetAllActorsWithTag(GetWorld(),
		    *FString::Printf(TEXT("LoomRiver_%s"), *RiverId), Actors);

		for (AActor* Actor : Actors)
		{
			TArray<UPrimitiveComponent*> Prims;
			Actor->GetComponents<UPrimitiveComponent>(Prims);
			for (UPrimitiveComponent* Prim : Prims)
			{
				UMaterialInstanceDynamic* MID = Cast<UMaterialInstanceDynamic>(
					Prim->GetMaterial(0));
				if (!MID) continue;

				MID->SetScalarParameterValue(TEXT("FlowSpeed"),  State.FlowSpeed);
				MID->SetScalarParameterValue(TEXT("Turbulence"), State.Turbulence);
				MID->SetScalarParameterValue(TEXT("WaterLevel"),
				    State.bInFlood ? State.FloodLevelOverride : State.WaterLevel);
			}
		}
	}
}

// ── Waterfall ────────────────────────────────────────────────────

void UBridgeLoomWater::UpdateWaterfallState(const FLoomWaterfallState& State)
{
	const bool bWasNotFrozen = !WaterfallStates.FindRef(State.WaterfallId).bFrozen;
	WaterfallStates.Add(State.WaterfallId, State);

	if (State.bFrozen && bWasNotFrozen)
	{
		OnWaterfallFrozen.Broadcast(State.WaterfallId);
	}
}

// ── Buoyancy ─────────────────────────────────────────────────────

void UBridgeLoomWater::ApplyBuoyancyForce(UPrimitiveComponent* Target,
                                           float SubmersionDepthCm)
{
	if (!IsValid(Target) || SubmersionDepthCm <= 0.0f) return;

	// Archimedes: F = ρ·g·V  — approximate volume from submersion cylinder
	constexpr float WaterDensity = 0.001f;	// g/cm³ scaled for UU
	const float BuoyancyForce = WaterDensity * 980.0f * SubmersionDepthCm * BuoyancyStrength;

	Target->AddForce(FVector(0.0f, 0.0f, BuoyancyForce), NAME_None, true);
}

// ── Tick helpers ─────────────────────────────────────────────────

void UBridgeLoomWater::TickWaterPhysics(float DeltaTime)
{
	PhysicsAccumulator += DeltaTime;
	const float Interval = 1.0f / FMath::Max(1.0f, WaterPhysicsUpdateRateHz);
	if (PhysicsAccumulator < Interval) return;
	PhysicsAccumulator -= Interval;

	UpdateOceanMaterial();
	UpdateRiverActors();
}

void UBridgeLoomWater::TickFloodEvents(float DeltaTime)
{
	TArray<FString> Expired;
	for (auto& [RiverId, TimeLeft] : FloodTimers)
	{
		TimeLeft -= DeltaTime;
		if (TimeLeft <= 0.0f)
		{
			Expired.Add(RiverId);
			if (FLoomRiverState* State = RiverStates.Find(RiverId))
			{
				State->bInFlood = false;
				State->FloodLevelOverride = 0.0f;
			}
		}
	}
	for (const FString& Id : Expired) FloodTimers.Remove(Id);
}
