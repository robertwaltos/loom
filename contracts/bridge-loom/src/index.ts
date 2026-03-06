/**
 * Bridge Loom Contract
 *
 * Defines the interface any rendering engine must implement
 * to serve as a Rendering Fabric for The Loom.
 *
 * UE5 is the first implementation. Others may follow.
 * The Loom NEVER imports rendering engine code directly —
 * it only talks through this interface.
 */

export type { RenderingFabric } from './rendering-fabric.js';
export type { CapabilityManifest, RenderingTier } from './capabilities.js';
export type { EntityVisualState, VisualUpdate } from './visual-state.js';
export type { WeaveZoneRenderer } from './weave-zone-renderer.js';
