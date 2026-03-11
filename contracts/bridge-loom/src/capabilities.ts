/**
 * Capability Negotiation
 *
 * When a Rendering Fabric connects, it declares what it can do.
 * The Loom adjusts what it sends accordingly.
 * This is how we design for the ceiling without requiring it.
 */

export type RenderingTier = 'cinematic' | 'high' | 'performance' | 'streaming';

export interface CapabilityManifest {
  /** Unique identifier for this rendering fabric instance */
  readonly fabricId: string;

  /** Human-readable name (e.g., "UE5.5", "UE6-Preview") */
  readonly fabricName: string;

  /** Maximum resolution this fabric can handle */
  readonly maxResolution: Resolution;

  /** Maximum refresh rate in Hz */
  readonly maxRefreshRate: number;

  /** Current rendering tier based on hardware detection */
  readonly currentTier: RenderingTier;

  /** What visual features are supported */
  readonly features: RenderingFeatures;

  /** MetaHuman rendering capabilities */
  readonly metaHuman?: MetaHumanCapabilities;

  /** Maximum entities this fabric can render per frame */
  readonly maxVisibleEntities: number;

  /** Whether this fabric supports Weave Zone dual-rendering */
  readonly supportsWeaveZoneOverlap: boolean;

  /** Pixel Streaming capability */
  readonly supportsPixelStreaming: boolean;

  /** Update rate this fabric prefers for state snapshots (Hz) */
  readonly preferredStateUpdateRate: number;
}

export interface Resolution {
  readonly width: number;
  readonly height: number;
}

export interface RenderingFeatures {
  readonly naniteGeometry: boolean;
  readonly hardwareRayTracing: boolean;
  readonly softwareRayTracing: boolean;
  readonly globalIllumination: boolean;
  readonly virtualShadowMaps: boolean;
  readonly volumetricClouds: boolean;
  readonly hairSimulation: boolean;
  readonly clothSimulation: boolean;
  readonly facialAnimation: boolean;
  readonly proceduralGeneration: boolean;
  readonly metaHumanSupport: boolean;
  readonly massEntityFramework: boolean;
  readonly chaosPhysics: boolean;
  readonly metaSoundAudio: boolean;
}

/**
 * MetaHuman-specific capability declaration.
 * Sent during negotiation so the Loom knows how many
 * facial-animation NPCs the client can handle.
 */
export interface MetaHumanCapabilities {
  /** Whether this fabric supports MetaHuman rendering */
  readonly supported: boolean;
  /** Max simultaneous MetaHuman instances (GPU budget) */
  readonly maxInstances: number;
  /** Whether RigLogic (muscle sim) is available */
  readonly rigLogicEnabled: boolean;
  /** Whether Groom (strand-based hair) is available */
  readonly groomEnabled: boolean;
  /** ARKit blend shape count this fabric can drive per frame */
  readonly maxBlendShapesPerFrame: number;
}
