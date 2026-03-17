/**
 * Dynasty Inheritance Link ΓÇö Chronicle-tracked multigenerational continuity.
 *
 * From the Multigenerational Design Bible:
 * "A parent's dynasty and a child's dynasty can designate an 'Inheritance Link'
 * that is not mechanical but Chronicle-tracked."
 *
 * When an ancestor dynasty reaches COMPLETED status, the Chronicle entry
 * specifically acknowledges the successor. The link becomes permanent in both
 * dynasties' records. The successor earns a visible "Dynasty Heritage" badge.
 */

// ΓöÇΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type LinkType =
  | 'PARENT_CHILD' // Biological family
  | 'MENTOR_STUDENT' // Formal mentorship (in-game relationship)
  | 'PATRON_HEIR' // Economic inheritance
  | 'SPIRITUAL'; // Ideological succession (same cause/faction)

export interface DynastyInheritanceLink {
  readonly linkId: string;
  readonly ancestorDynastyId: string;
  readonly successorDynastyId: string;
  readonly linkType: LinkType;
  readonly establishedAt: string;
  readonly witnessedBy: string[];
  readonly chronicleEntryId: string; // Filed when link is established
  readonly isActive: boolean;
  readonly completionNote?: string; // Filed when ancestor dynasty completes
}

export interface DynastyLinkBundle {
  readonly asAncestor: DynastyInheritanceLink[];
  readonly asSuccessor: DynastyInheritanceLink[];
}

export type InheritanceLinkResult =
  | 'success'
  | 'link-not-found'
  | 'already-witnessed'
  | 'link-already-completed'
  | 'link-already-inactive';

// ΓöÇΓöÇΓöÇ Internal State ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

interface MutableLink {
  linkId: string;
  ancestorDynastyId: string;
  successorDynastyId: string;
  linkType: LinkType;
  establishedAt: string;
  witnessedBy: string[];
  chronicleEntryId: string;
  isActive: boolean;
  completionNote?: string;
}

interface LinkState {
  readonly links: Map<string, MutableLink>;
  readonly clock: { nowIso(): string };
  readonly idGen: { next(): string };
}

// ΓöÇΓöÇΓöÇ Factory ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface DynastyInheritanceLinkEngine {
  createLink(ancestorId: string, successorId: string, linkType: LinkType): DynastyInheritanceLink;

  witnessLink(linkId: string, witnessId: string): DynastyInheritanceLink | InheritanceLinkResult;

  acknowledgeCompletion(
    linkId: string,
    completionNote: string,
  ): DynastyInheritanceLink | InheritanceLinkResult;

  getLinksForDynasty(dynastyId: string): DynastyLinkBundle;

  getInheritanceChain(dynastyId: string): DynastyInheritanceLink[];
}

export function createDynastyInheritanceLinkEngine(deps: {
  readonly clock: { nowIso(): string };
  readonly idGen: { next(): string };
}): DynastyInheritanceLinkEngine {
  const state: LinkState = {
    links: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
  };

  return {
    createLink: (ancestorId, successorId, linkType) =>
      createLinkImpl(state, ancestorId, successorId, linkType),
    witnessLink: (linkId, witnessId) => witnessLinkImpl(state, linkId, witnessId),
    acknowledgeCompletion: (linkId, note) => acknowledgeCompletionImpl(state, linkId, note),
    getLinksForDynasty: (dynastyId) => getLinksForDynastyImpl(state, dynastyId),
    getInheritanceChain: (dynastyId) => getInheritanceChainImpl(state, dynastyId),
  };
}

// ΓöÇΓöÇΓöÇ Implementations ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function createLinkImpl(
  state: LinkState,
  ancestorDynastyId: string,
  successorDynastyId: string,
  linkType: LinkType,
): DynastyInheritanceLink {
  const linkId = state.idGen.next();
  const chronicleEntryId = `chronicle-inheritance-link-${linkId}`;
  const link: MutableLink = {
    linkId,
    ancestorDynastyId,
    successorDynastyId,
    linkType,
    establishedAt: state.clock.nowIso(),
    witnessedBy: [],
    chronicleEntryId,
    isActive: true,
  };
  state.links.set(linkId, link);
  return toReadonlyLink(link);
}

function witnessLinkImpl(
  state: LinkState,
  linkId: string,
  witnessId: string,
): DynastyInheritanceLink | InheritanceLinkResult {
  const link = state.links.get(linkId);
  if (link === undefined) return 'link-not-found';
  if (!link.isActive) return 'link-already-inactive';
  if (link.witnessedBy.includes(witnessId)) return 'already-witnessed';
  link.witnessedBy.push(witnessId);
  return toReadonlyLink(link);
}

function acknowledgeCompletionImpl(
  state: LinkState,
  linkId: string,
  completionNote: string,
): DynastyInheritanceLink | InheritanceLinkResult {
  const link = state.links.get(linkId);
  if (link === undefined) return 'link-not-found';
  if (!link.isActive) return 'link-already-inactive';
  if (link.completionNote !== undefined) return 'link-already-completed';
  link.completionNote = completionNote;
  return toReadonlyLink(link);
}

function getLinksForDynastyImpl(state: LinkState, dynastyId: string): DynastyLinkBundle {
  const asAncestor: DynastyInheritanceLink[] = [];
  const asSuccessor: DynastyInheritanceLink[] = [];
  for (const link of state.links.values()) {
    if (link.ancestorDynastyId === dynastyId) asAncestor.push(toReadonlyLink(link));
    if (link.successorDynastyId === dynastyId) asSuccessor.push(toReadonlyLink(link));
  }
  return { asAncestor, asSuccessor };
}

function getInheritanceChainImpl(state: LinkState, dynastyId: string): DynastyInheritanceLink[] {
  const chain: DynastyInheritanceLink[] = [];
  const visited = new Set<string>();
  collectAncestors(state, dynastyId, chain, visited);
  return chain;
}

function collectAncestors(
  state: LinkState,
  dynastyId: string,
  chain: DynastyInheritanceLink[],
  visited: Set<string>,
): void {
  if (visited.has(dynastyId)) return;
  visited.add(dynastyId);
  for (const link of state.links.values()) {
    if (link.successorDynastyId === dynastyId && link.isActive) {
      chain.push(toReadonlyLink(link));
      collectAncestors(state, link.ancestorDynastyId, chain, visited);
    }
  }
}

// ΓöÇΓöÇΓöÇ Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function toReadonlyLink(link: MutableLink): DynastyInheritanceLink {
  return {
    linkId: link.linkId,
    ancestorDynastyId: link.ancestorDynastyId,
    successorDynastyId: link.successorDynastyId,
    linkType: link.linkType,
    establishedAt: link.establishedAt,
    witnessedBy: [...link.witnessedBy],
    chronicleEntryId: link.chronicleEntryId,
    isActive: link.isActive,
    completionNote: link.completionNote,
  };
}
