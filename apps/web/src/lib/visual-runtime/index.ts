export {
  getActiveWebGlContextCount,
  getMaxActiveWebGlContexts,
  subscribeToActiveWebGlContextCount,
  tryReserveWebGlContextSlot,
} from "./active-webgl-context-budget";
export {
  createSiteWebGlRenderer,
  reportSiteWebGlRendererCreationFailure,
  SITE_WEBGL_CONTEXT_LOST_EVENT,
  tryCreateSiteWebGlRenderer,
  type SiteWebGlRendererCreationFailureHandler,
  type SiteWebGlRendererParameters,
} from "./create-site-webgl-renderer";
export { loadVisualImage } from "./load-visual-image";
export {
  createVisualRenderLoop,
  reportVisualRenderLoopErrorInDevelopment,
  type CreateVisualRenderLoopOptions,
  type VisualRenderLoop,
  type VisualRenderLoopCanceller,
  type VisualRenderLoopDocument,
  type VisualRenderLoopErrorHandler,
  type VisualRenderLoopFrame,
  type VisualRenderLoopFrameRenderer,
  type VisualRenderLoopScheduler,
} from "./visual-render-loop";
export {
  createVisualMountScheduler,
  scheduleVisualMount,
  visualMountScheduler,
  type ScheduleVisualMountOptions,
  type VisualMountPriority,
  type VisualMountScheduler,
} from "./visual-mount-scheduler";
export {
  detectPrefersReducedMotion,
  detectWebGlSupport,
  evaluateWebGlPolicy,
  isHeavyVisualsKillSwitchEnabled,
  WebGlUnavailableError,
  type WebGlPolicyDecision,
  type WebGlPolicyDenialReason,
} from "./visual-runtime-policy";
export { WebGlMount } from "./webgl-mount";
