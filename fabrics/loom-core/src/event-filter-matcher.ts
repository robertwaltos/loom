/**
 * Pure function: does an event match a filter?
 *
 * No side effects, no dependencies. Easy to test.
 */

import type { LoomEvent, EventFilter } from '@loom/events-contracts';

export function matchesFilter(event: LoomEvent, filter: EventFilter): boolean {
  if (!matchesTypes(event, filter)) return false;
  if (!matchesSourceWorlds(event, filter)) return false;
  if (!matchesSourceFabrics(event, filter)) return false;
  if (!matchesSequence(event, filter)) return false;
  return true;
}

function matchesTypes(event: LoomEvent, filter: EventFilter): boolean {
  if (filter.types === undefined || filter.types.length === 0) return true;
  return filter.types.includes(event.type);
}

function matchesSourceWorlds(event: LoomEvent, filter: EventFilter): boolean {
  if (filter.sourceWorldIds === undefined || filter.sourceWorldIds.length === 0) return true;
  return filter.sourceWorldIds.includes(event.metadata.sourceWorldId);
}

function matchesSourceFabrics(event: LoomEvent, filter: EventFilter): boolean {
  if (filter.sourceFabricIds === undefined || filter.sourceFabricIds.length === 0) return true;
  return filter.sourceFabricIds.includes(event.metadata.sourceFabricId);
}

function matchesSequence(event: LoomEvent, filter: EventFilter): boolean {
  if (filter.afterSequence === undefined) return true;
  return event.metadata.sequenceNumber > filter.afterSequence;
}
