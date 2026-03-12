// Copyright Project Loom. All Rights Reserved.

#include "LoomDynastyComponent.h"

ULoomDynastyComponent::ULoomDynastyComponent(
	const FObjectInitializer& ObjectInitializer)
	: Super(ObjectInitializer)
{
	PrimaryComponentTick.bCanEverTick = false;
}

void ULoomDynastyComponent::BeginPlay()
{
	Super::BeginPlay();
	UE_LOG(LogTemp, Log, TEXT("LoomDynastyComponent active on %s"),
		*GetOwner()->GetName());
}

void ULoomDynastyComponent::UpdateDynastyInfo(const FLoomDynastyInfo& NewInfo)
{
	DynastyInfo = NewInfo;
	OnDynastyInfoUpdated.Broadcast(DynastyInfo);
}

void ULoomDynastyComponent::UpdateCharacterInfo(const FLoomCharacterInfo& NewInfo)
{
	CharacterInfo = NewInfo;
	OnCharacterInfoUpdated.Broadcast(CharacterInfo);
}

void ULoomDynastyComponent::UpdateKalonBalance(const FString& NewBalance)
{
	const FString OldBalance = DynastyInfo.KalonBalance;
	DynastyInfo.KalonBalance = NewBalance;
	OnKalonBalanceChanged.Broadcast(OldBalance, NewBalance);
}
