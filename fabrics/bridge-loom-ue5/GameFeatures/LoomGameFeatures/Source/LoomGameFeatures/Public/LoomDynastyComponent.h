// Copyright Project Loom. All Rights Reserved.
// Thread: bridge/bridge-loom-ue5/game-features/dynasty
// Tier: 1
//
// Dynasty HUD Component — Displays dynasty status, KALON balance,
// succession line, and estate information. Added to Pawn via GameFeature.

#pragma once

#include "CoreMinimal.h"
#include "Components/GameFrameworkComponent.h"
#include "LoomDynastyComponent.generated.h"

// ── Dynasty Data (mirrored from Loom server) ────────────────────

USTRUCT(BlueprintType)
struct LOOMGAMEFEATURES_API FLoomDynastyInfo
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Dynasty")
	FString DynastyId;

	UPROPERTY(BlueprintReadOnly, Category = "Dynasty")
	FString DynastyName;

	UPROPERTY(BlueprintReadOnly, Category = "Dynasty")
	FString CurrentHeadName;

	UPROPERTY(BlueprintReadOnly, Category = "Dynasty")
	FString KalonBalance;

	UPROPERTY(BlueprintReadOnly, Category = "Dynasty")
	int32 GenerationNumber = 1;

	UPROPERTY(BlueprintReadOnly, Category = "Dynasty")
	int32 MemberCount = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Dynasty")
	int32 EstateCount = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Dynasty")
	float ReputationScore = 0.0f;

	UPROPERTY(BlueprintReadOnly, Category = "Dynasty")
	TArray<FString> Titles;

	UPROPERTY(BlueprintReadOnly, Category = "Dynasty")
	TArray<FString> AlliedDynasties;
};

// ── Character Info ──────────────────────────────────────────────

USTRUCT(BlueprintType)
struct LOOMGAMEFEATURES_API FLoomCharacterInfo
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Character")
	FString CharacterId;

	UPROPERTY(BlueprintReadOnly, Category = "Character")
	FString DisplayName;

	UPROPERTY(BlueprintReadOnly, Category = "Character")
	FString Archetype;

	UPROPERTY(BlueprintReadOnly, Category = "Character")
	int32 AgeInGameYears = 18;

	UPROPERTY(BlueprintReadOnly, Category = "Character")
	TMap<FString, float> Skills;

	UPROPERTY(BlueprintReadOnly, Category = "Character")
	TArray<FString> ActiveQuests;
};

// ── Delegates ───────────────────────────────────────────────────

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
	FOnDynastyInfoUpdated, const FLoomDynastyInfo&, DynastyInfo);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
	FOnCharacterInfoUpdated, const FLoomCharacterInfo&, CharacterInfo);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(
	FOnKalonBalanceChanged, const FString&, OldBalance, const FString&, NewBalance);

// ── Component ───────────────────────────────────────────────────

/**
 * ULoomDynastyComponent
 *
 * GameFeature component added to player Pawn.
 * Receives dynasty/character state from the Loom server and
 * drives HUD widgets. Lyra-compatible GameFrameworkComponent.
 */
UCLASS(ClassGroup = (LoomGameFeatures), meta = (BlueprintSpawnableComponent))
class LOOMGAMEFEATURES_API ULoomDynastyComponent : public UGameFrameworkComponent
{
	GENERATED_BODY()

public:
	ULoomDynastyComponent(const FObjectInitializer& ObjectInitializer);

	// ── State Access ──────────────────────────────────────────

	UFUNCTION(BlueprintPure, Category = "Dynasty")
	const FLoomDynastyInfo& GetDynastyInfo() const { return DynastyInfo; }

	UFUNCTION(BlueprintPure, Category = "Dynasty")
	const FLoomCharacterInfo& GetCharacterInfo() const { return CharacterInfo; }

	// ── Server State Updates ──────────────────────────────────

	UFUNCTION(BlueprintCallable, Category = "Dynasty")
	void UpdateDynastyInfo(const FLoomDynastyInfo& NewInfo);

	UFUNCTION(BlueprintCallable, Category = "Dynasty")
	void UpdateCharacterInfo(const FLoomCharacterInfo& NewInfo);

	UFUNCTION(BlueprintCallable, Category = "Dynasty")
	void UpdateKalonBalance(const FString& NewBalance);

	// ── Events ────────────────────────────────────────────────

	UPROPERTY(BlueprintAssignable, Category = "Dynasty")
	FOnDynastyInfoUpdated OnDynastyInfoUpdated;

	UPROPERTY(BlueprintAssignable, Category = "Dynasty")
	FOnCharacterInfoUpdated OnCharacterInfoUpdated;

	UPROPERTY(BlueprintAssignable, Category = "Dynasty")
	FOnKalonBalanceChanged OnKalonBalanceChanged;

protected:
	virtual void BeginPlay() override;

private:
	FLoomDynastyInfo DynastyInfo;
	FLoomCharacterInfo CharacterInfo;
};
