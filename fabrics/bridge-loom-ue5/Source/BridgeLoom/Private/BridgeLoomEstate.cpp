// Copyright Koydo. All Rights Reserved.
// BridgeLoomEstate.cpp

#include "BridgeLoomEstate.h"

UBridgeLoomEstate::UBridgeLoomEstate()
{
    PrimaryComponentTick.bCanEverTick = false;
}

void UBridgeLoomEstate::ApplyEstateInfo(const FLoomEstateInfo& Info)
{
    for (FLoomEstateInfo& Existing : OwnedEstates)
    {
        if (Existing.EstateId == Info.EstateId)
        {
            Existing = Info;
            OnEstateInfoRefreshed.Broadcast(Info);
            return;
        }
    }
    OwnedEstates.Add(Info);
    OnEstateInfoRefreshed.Broadcast(Info);
}

void UBridgeLoomEstate::NotifyTierUpgrade(const FString& EstateId, ELoomEstateTier NewTier)
{
    for (FLoomEstateInfo& E : OwnedEstates)
    {
        if (E.EstateId == EstateId)
        {
            E.Tier = NewTier;
            break;
        }
    }
    OnEstateTierUpgraded.Broadcast(EstateId, NewTier);
}

void UBridgeLoomEstate::NotifyProductionComplete(const FLoomProductionCompleteEvent& Event)
{
    // Update production state to Idle on the matching estate
    for (FLoomEstateInfo& E : OwnedEstates)
    {
        if (E.EstateId == Event.EstateId)
        {
            E.ProductionState = ELoomEstateProductionState::Idle;
            break;
        }
    }
    OnProductionCompleted.Broadcast(Event);
}

void UBridgeLoomEstate::SetFocusedEstate(const FString& EstateId)
{
    for (const FLoomEstateInfo& E : OwnedEstates)
    {
        if (E.EstateId == EstateId)
        {
            FocusedEstate = E;
            return;
        }
    }
}

bool UBridgeLoomEstate::GetEstateById(const FString& EstateId, FLoomEstateInfo& OutEstate) const
{
    for (const FLoomEstateInfo& E : OwnedEstates)
    {
        if (E.EstateId == EstateId)
        {
            OutEstate = E;
            return true;
        }
    }
    return false;
}

int64 UBridgeLoomEstate::GetTotalWeeklyRevenue() const
{
    int64 Total = 0;
    for (const FLoomEstateInfo& E : OwnedEstates)
    {
        Total += E.WeeklyRevenue;
    }
    return Total;
}
