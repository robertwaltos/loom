// Copyright Project Loom. All Rights Reserved.

#include "LoomEconomyComponent.h"

ULoomEconomyComponent::ULoomEconomyComponent(
	const FObjectInitializer& ObjectInitializer)
	: Super(ObjectInitializer)
{
}

void ULoomEconomyComponent::SetKalonBalance(int64 NewBalance)
{
	if (KalonBalance != NewBalance)
	{
		KalonBalance = NewBalance;
		OnKalonChanged.Broadcast(NewBalance);
	}
}

void ULoomEconomyComponent::SetInventory(
	const TArray<FLoomInventorySlot>& NewInventory)
{
	Inventory = NewInventory;
	OnInventoryUpdated.Broadcast(Inventory);
}

void ULoomEconomyComponent::SetMarketListings(
	const TArray<FLoomMarketListing>& Listings)
{
	MarketListings = Listings;
	OnMarketListingsUpdated.Broadcast(MarketListings);
}

void ULoomEconomyComponent::UpdateCraftJob(const FLoomCraftJob& Job)
{
	for (int32 i = 0; i < CraftQueue.Num(); ++i)
	{
		if (CraftQueue[i].CraftJobId == Job.CraftJobId)
		{
			CraftQueue[i] = Job;
			OnCraftJobUpdated.Broadcast(Job);
			return;
		}
	}

	CraftQueue.Add(Job);
	OnCraftJobUpdated.Broadcast(Job);
}

void ULoomEconomyComponent::RemoveCraftJob(const FString& CraftJobId)
{
	CraftQueue.RemoveAll([&CraftJobId](const FLoomCraftJob& J)
	{
		return J.CraftJobId == CraftJobId;
	});
}
