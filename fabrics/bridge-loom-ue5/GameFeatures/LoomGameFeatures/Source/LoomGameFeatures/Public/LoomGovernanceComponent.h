// Copyright Project Loom. All Rights Reserved.
// Thread: bridge/bridge-loom-ue5/game-features/governance
// Tier: 1
//
// Governance Component — Drives Assembly voting, proposal review,
// and legislative UI from Loom server state.

#pragma once

#include "CoreMinimal.h"
#include "Components/GameFrameworkComponent.h"
#include "LoomGovernanceComponent.generated.h"

// ── Proposal Status ─────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomProposalStatus : uint8
{
	Draft       UMETA(DisplayName = "Draft"),
	Proposed    UMETA(DisplayName = "Proposed"),
	Debating    UMETA(DisplayName = "Debating"),
	Voting      UMETA(DisplayName = "Voting"),
	Enacted     UMETA(DisplayName = "Enacted"),
	Rejected    UMETA(DisplayName = "Rejected"),
	Vetoed      UMETA(DisplayName = "Vetoed"),
};

// ── Vote Type ───────────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomVoteType : uint8
{
	Ordinary        UMETA(DisplayName = "Ordinary (50%)"),
	Significant     UMETA(DisplayName = "Significant (65%)"),
	Constitutional  UMETA(DisplayName = "Constitutional (75%)"),
};

// ── Proposal Data ───────────────────────────────────────────────

USTRUCT(BlueprintType)
struct LOOMGAMEFEATURES_API FLoomProposal
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Governance")
	FString ProposalId;

	UPROPERTY(BlueprintReadOnly, Category = "Governance")
	FString Title;

	UPROPERTY(BlueprintReadOnly, Category = "Governance")
	FString Description;

	UPROPERTY(BlueprintReadOnly, Category = "Governance")
	FString ProposerId;

	UPROPERTY(BlueprintReadOnly, Category = "Governance")
	ELoomProposalStatus Status = ELoomProposalStatus::Draft;

	UPROPERTY(BlueprintReadOnly, Category = "Governance")
	ELoomVoteType VoteType = ELoomVoteType::Ordinary;

	UPROPERTY(BlueprintReadOnly, Category = "Governance")
	int32 VotesFor = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Governance")
	int32 VotesAgainst = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Governance")
	int32 VotesAbstain = 0;

	UPROPERTY(BlueprintReadOnly, Category = "Governance")
	float VoteDeadlineGameTime = 0.0f;
};

// ── Delegates ───────────────────────────────────────────────────

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
	FOnProposalUpdated, const FLoomProposal&, Proposal);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(
	FOnVoteRecorded, const FString&, ProposalId, bool, bVotedFor);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
	FOnElectionStarted, const FString&, PositionName);

// ── Component ───────────────────────────────────────────────────

UCLASS(ClassGroup = (LoomGameFeatures), meta = (BlueprintSpawnableComponent))
class LOOMGAMEFEATURES_API ULoomGovernanceComponent : public UGameFrameworkComponent
{
	GENERATED_BODY()

public:
	ULoomGovernanceComponent(const FObjectInitializer& ObjectInitializer);

	// ── Proposals ─────────────────────────────────────────────

	UFUNCTION(BlueprintPure, Category = "Governance")
	TArray<FLoomProposal> GetActiveProposals() const { return ActiveProposals; }

	UFUNCTION(BlueprintCallable, Category = "Governance")
	void UpdateProposal(const FLoomProposal& Proposal);

	UFUNCTION(BlueprintCallable, Category = "Governance")
	void RemoveProposal(const FString& ProposalId);

	// ── Voting Actions (sent to Loom server) ──────────────────

	UFUNCTION(BlueprintCallable, Category = "Governance")
	void CastVote(const FString& ProposalId, bool bVoteFor);

	UFUNCTION(BlueprintCallable, Category = "Governance")
	void AbstainVote(const FString& ProposalId);

	// ── World ID ──────────────────────────────────────────────

	UFUNCTION(BlueprintCallable, Category = "Governance")
	void SetWorldId(const FString& NewWorldId) { WorldId = NewWorldId; }

	// ── Events ────────────────────────────────────────────────

	UPROPERTY(BlueprintAssignable, Category = "Governance")
	FOnProposalUpdated OnProposalUpdated;

	UPROPERTY(BlueprintAssignable, Category = "Governance")
	FOnVoteRecorded OnVoteRecorded;

	UPROPERTY(BlueprintAssignable, Category = "Governance")
	FOnElectionStarted OnElectionStarted;

private:
	TArray<FLoomProposal> ActiveProposals;
	FString WorldId;
};
