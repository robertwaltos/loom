// Copyright Project Loom. All Rights Reserved.

#include "BridgeLoomCrowdSim.h"
#include "NavigationSystem.h"
#include "NavMesh/RecastNavMesh.h"

// ── Constructor ──────────────────────────────────────────────────

UBridgeLoomCrowdSim::UBridgeLoomCrowdSim()
{
	PrimaryComponentTick.bCanEverTick = true;
}

// ── Lifecycle ────────────────────────────────────────────────────

void UBridgeLoomCrowdSim::BeginPlay()
{
	Super::BeginPlay();
}

void UBridgeLoomCrowdSim::TickComponent(float DeltaTime,
                                         ELevelTick TickType,
                                         FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);
	TickPanics(DeltaTime);
}

// ── Zone management ──────────────────────────────────────────────

void UBridgeLoomCrowdSim::RegisterCrowdZone(const FLoomCrowdZone& Zone)
{
	CrowdZones.Add(Zone.ZoneId, Zone);
}

void UBridgeLoomCrowdSim::UpdateCrowdZone(const FString& ZoneId,
                                            ELoomCrowdFlowType FlowType,
                                            ELoomCrowdDensity Density)
{
	if (FLoomCrowdZone* Zone = CrowdZones.Find(ZoneId))
	{
		Zone->FlowType = FlowType;
		Zone->Density  = Density;
		OnZoneFlowChanged.Broadcast(ZoneId, FlowType);
	}
}

void UBridgeLoomCrowdSim::RemoveCrowdZone(const FString& ZoneId)
{
	CrowdZones.Remove(ZoneId);
}

// ── Panic events ─────────────────────────────────────────────────

void UBridgeLoomCrowdSim::TriggerPanicEvent(const FLoomPanicEvent& Event)
{
	ActivePanics.Add(TTuple<FLoomPanicEvent, float>(Event, Event.DurationSeconds));
	PropagateFlowType(Event.Origin, Event.PanicRadius, ELoomCrowdFlowType::Panic);
}

// ── Paths ────────────────────────────────────────────────────────

void UBridgeLoomCrowdSim::RegisterCrowdPath(const FLoomCrowdPath& Path)
{
	CrowdPaths.Add(Path.PathId, Path);
}

void UBridgeLoomCrowdSim::UnregisterCrowdPath(const FString& PathId)
{
	CrowdPaths.Remove(PathId);
}

// ── NavMesh helpers ───────────────────────────────────────────────

bool UBridgeLoomCrowdSim::SampleRandomPointInZone(const FString& ZoneId,
                                                    FVector& OutLocation) const
{
	const FLoomCrowdZone* Zone = CrowdZones.Find(ZoneId);
	if (!Zone) return false;

	UNavigationSystemV1* NavSys = FNavigationSystem::GetCurrent<UNavigationSystemV1>(GetWorld());
	if (!NavSys) return false;

	FNavLocation NavLoc;
	const bool bFound = NavSys->GetRandomPointInNavigableRadius(
		Zone->CentreLocation, Zone->Radius, NavLoc);

	if (bFound)
	{
		OutLocation = NavLoc.Location;
	}
	return bFound;
}

FVector UBridgeLoomCrowdSim::GetFleeDirection(const FVector& AgentLocation,
                                               const FVector& ThreatOrigin) const
{
	const FVector Away = AgentLocation - ThreatOrigin;
	if (Away.IsNearlyZero()) return FVector(1.0f, 0.0f, 0.0f);
	return Away.GetSafeNormal();
}

// ── Tick helpers ─────────────────────────────────────────────────

void UBridgeLoomCrowdSim::TickPanics(float DeltaTime)
{
	for (int32 i = ActivePanics.Num() - 1; i >= 0; --i)
	{
		ActivePanics[i].Value -= DeltaTime;
		if (ActivePanics[i].Value <= 0.0f)
		{
			// Restore zones near the expired panic back to Idle
			const FLoomPanicEvent& Event = ActivePanics[i].Key;
			PropagateFlowType(Event.Origin, Event.PanicRadius * PanicDecayRatePerSecond,
			                  ELoomCrowdFlowType::Idle);
			ActivePanics.RemoveAt(i);
		}
	}
}

void UBridgeLoomCrowdSim::PropagateFlowType(const FVector& Origin, float Radius,
                                              ELoomCrowdFlowType FlowType)
{
	for (auto& [ZoneId, Zone] : CrowdZones)
	{
		const float Dist = FVector::Dist(Zone.CentreLocation, Origin);
		if (Dist <= Radius)
		{
			Zone.FlowType = FlowType;
			OnZoneFlowChanged.Broadcast(ZoneId, FlowType);
		}
	}
}
