// Copyright Project Loom. All Rights Reserved.
// Thread: bridge/bridge-loom-ue5/game-features/economy
// Tier: 1
//
// Economy Component — KALON balance display, marketplace browsing,
// crafting queue, and trade UI data from Loom server state.

#pragma once

#include "CoreMinimal.h"
#include "Components/GameFrameworkComponent.h"
#include "LoomEconomyComponent.generated.h"

// ── Marketplace Listing ─────────────────────────────────────────

USTRUCT(BlueprintType)
struct LOOMGAMEFEATURES_API FLoomMarketListing
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Economy")
	FString ListingId;

	UPROPERTY(BlueprintReadOnly, Category = "Economy")
	FString ItemId;

	UPROPERTY(BlueprintReadOnly, Category = "Economy")
	FString ItemName;

	UPROPERTY(BlueprintReadOnly, Category = "Economy")
	FString SellerDynastyId;

	/** Price in KALON (integer, never fractional). */
	UPROPERTY(BlueprintReadOnly, Category = "Economy")
	int64 PriceKalon = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Economy")
	int32 Quantity = 1;

	UPROPERTY(BlueprintReadOnly, Category = "Economy")
	float ListedAtGameTime = 0.0f;
};

// ── Crafting Queue Item ─────────────────────────────────────────

USTRUCT(BlueprintType)
struct LOOMGAMEFEATURES_API FLoomCraftJob
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Economy")
	FString CraftJobId;

	UPROPERTY(BlueprintReadOnly, Category = "Economy")
	FString RecipeId;

	UPROPERTY(BlueprintReadOnly, Category = "Economy")
	float ProgressPercent = 0.0f;

	/** Remaining game-time seconds. */
	UPROPERTY(BlueprintReadOnly, Category = "Economy")
	float RemainingSeconds = 0.0f;
};

// ── Inventory Slot ──────────────────────────────────────────────

USTRUCT(BlueprintType)
struct LOOMGAMEFEATURES_API FLoomInventorySlot
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Economy")
	FString ItemId;

	UPROPERTY(BlueprintReadOnly, Category = "Economy")
	FString DisplayName;

	UPROPERTY(BlueprintReadOnly, Category = "Economy")
	int32 Quantity = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Economy")
	int32 SlotIndex = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Economy")
	bool bBound = false;
};

// ── Delegates ───────────────────────────────────────────────────

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
	FOnKalonChanged, int64, NewBalance);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
	FOnInventoryUpdated, const TArray<FLoomInventorySlot>&, Inventory);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
	FOnCraftJobUpdated, const FLoomCraftJob&, Job);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
	FOnMarketListingsUpdated, const TArray<FLoomMarketListing>&, Listings);

// ── Component ───────────────────────────────────────────────────

UCLASS(ClassGroup = (LoomGameFeatures), meta = (BlueprintSpawnableComponent))
class LOOMGAMEFEATURES_API ULoomEconomyComponent : public UGameFrameworkComponent
{
	GENERATED_BODY()

public:
	ULoomEconomyComponent(const FObjectInitializer& ObjectInitializer);

	// ── KALON ─────────────────────────────────────────────────

	UFUNCTION(BlueprintPure, Category = "Economy")
	int64 GetKalonBalance() const { return KalonBalance; }

	UFUNCTION(BlueprintCallable, Category = "Economy")
	void SetKalonBalance(int64 NewBalance);

	// ── Inventory ─────────────────────────────────────────────

	UFUNCTION(BlueprintPure, Category = "Economy")
	TArray<FLoomInventorySlot> GetInventory() const { return Inventory; }

	UFUNCTION(BlueprintCallable, Category = "Economy")
	void SetInventory(const TArray<FLoomInventorySlot>& NewInventory);

	// ── Marketplace ───────────────────────────────────────────

	UFUNCTION(BlueprintPure, Category = "Economy")
	TArray<FLoomMarketListing> GetListings() const { return MarketListings; }

	UFUNCTION(BlueprintCallable, Category = "Economy")
	void SetMarketListings(const TArray<FLoomMarketListing>& Listings);

	// ── Crafting Queue ────────────────────────────────────────

	UFUNCTION(BlueprintPure, Category = "Economy")
	TArray<FLoomCraftJob> GetCraftQueue() const { return CraftQueue; }

	UFUNCTION(BlueprintCallable, Category = "Economy")
	void UpdateCraftJob(const FLoomCraftJob& Job);

	UFUNCTION(BlueprintCallable, Category = "Economy")
	void RemoveCraftJob(const FString& CraftJobId);

	// ── Events ────────────────────────────────────────────────

	UPROPERTY(BlueprintAssignable, Category = "Economy")
	FOnKalonChanged OnKalonChanged;

	UPROPERTY(BlueprintAssignable, Category = "Economy")
	FOnInventoryUpdated OnInventoryUpdated;

	UPROPERTY(BlueprintAssignable, Category = "Economy")
	FOnCraftJobUpdated OnCraftJobUpdated;

	UPROPERTY(BlueprintAssignable, Category = "Economy")
	FOnMarketListingsUpdated OnMarketListingsUpdated;

private:
	int64 KalonBalance = 0;
	TArray<FLoomInventorySlot> Inventory;
	TArray<FLoomMarketListing> MarketListings;
	TArray<FLoomCraftJob> CraftQueue;
};
