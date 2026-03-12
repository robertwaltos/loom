// Copyright Project Loom. All Rights Reserved.

#include "LoomGovernanceComponent.h"

ULoomGovernanceComponent::ULoomGovernanceComponent(
	const FObjectInitializer& ObjectInitializer)
	: Super(ObjectInitializer)
{
}

void ULoomGovernanceComponent::UpdateProposal(const FLoomProposal& Proposal)
{
	for (int32 i = 0; i < ActiveProposals.Num(); ++i)
	{
		if (ActiveProposals[i].ProposalId == Proposal.ProposalId)
		{
			ActiveProposals[i] = Proposal;
			OnProposalUpdated.Broadcast(Proposal);
			return;
		}
	}

	ActiveProposals.Add(Proposal);
	OnProposalUpdated.Broadcast(Proposal);
}

void ULoomGovernanceComponent::RemoveProposal(const FString& ProposalId)
{
	ActiveProposals.RemoveAll([&ProposalId](const FLoomProposal& P)
	{
		return P.ProposalId == ProposalId;
	});
}

void ULoomGovernanceComponent::CastVote(
	const FString& ProposalId, bool bVoteFor)
{
	// Relay vote intent to Loom server via BridgeLoomSubsystem.
	// The server will validate eligibility, record the vote, and
	// push an updated FLoomProposal back via the stream processor.
	OnVoteRecorded.Broadcast(ProposalId, bVoteFor);
}

void ULoomGovernanceComponent::AbstainVote(const FString& ProposalId)
{
	OnVoteRecorded.Broadcast(ProposalId, false);
}
