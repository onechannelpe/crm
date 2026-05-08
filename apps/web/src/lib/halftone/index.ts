export {
  getContainedImageRect,
  getImageFootprintScale,
  getImagePreviewZoom,
  getMeshFootprintScale,
  HALFTONE_FOOTPRINT_RUNTIME_SOURCE,
  REFERENCE_PREVIEW_DISTANCE,
  type HalftoneImageFit,
  VIRTUAL_RENDER_HEIGHT,
} from "./footprint";
export { HalftoneImageCanvas } from "./halftone-image-canvas";
export { createHalftoneRuntime } from "./runtime";
export type {
  HalftonePointerSettings,
  HalftoneRenderStrategy,
  HalftoneRuntime,
  HalftoneRuntimeConfig,
  HalftoneSnapshotFn,
  HalftoneSnapshotRequest,
  HalftoneViewport,
} from "./runtime-types";

export {
  applySpringStep,
  createHalftoneInteractionState,
  resetHalftoneInteractionState,
  type HalftoneInteractionState,
} from "./interaction-state";

export {
  applyHalftoneMaterialSettings,
  createHalftoneMaterial,
  createHalftoneMaterialAssets,
  disposeHalftoneMaterialAssets,
  renderHalftoneMaterialScene,
  type HalftoneMaterialAssets,
  HalftoneTransmissionMaterial,
} from "./materials";

export {
  DEFAULT_GEOMETRY_SPECS,
  DEFAULT_GLASS_ANIMATION_SETTINGS,
  DEFAULT_GLASS_BACKGROUND_SETTINGS,
  DEFAULT_GLASS_LIGHTING_SETTINGS,
  DEFAULT_GLASS_MATERIAL_SETTINGS,
  DEFAULT_HALFTONE_SETTINGS,
  DEFAULT_IMAGE_HALFTONE_SETTINGS,
  DEFAULT_SHAPE_HALFTONE_SETTINGS,
  DEFAULT_SOLID_ANIMATION_SETTINGS,
  DEFAULT_SOLID_BACKGROUND_SETTINGS,
  DEFAULT_SOLID_LIGHTING_SETTINGS,
  DEFAULT_SOLID_MATERIAL_SETTINGS,
  normalizeHalftoneStudioSettings,
  type HalftoneAnimationSettings,
  type HalftoneBackgroundSettings,
  type HalftonePatternSettings,
  type HalftonePose,
  type HalftoneGeometrySpec,
  type HalftoneLightingSettings,
  type HalftoneMaterialSettings,
  type HalftoneMaterialSurface,
  type HalftoneModelLoader,
  type HalftoneRotateAxis,
  type HalftoneRotatePreset,
  type HalftoneSourceMode,
  type HalftoneStudioSettings,
  type HalftoneStudioSettingsOverrides,
  type HalftoneTabId,
  type HalftoneToneTarget,
} from "./state";
