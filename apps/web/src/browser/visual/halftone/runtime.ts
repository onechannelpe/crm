import { BufferGeometry, SRGBColorSpace, Timer, Vector3 } from "three";

import { observeElementSize } from "~/browser/dom/observe-element-size";
import {
  createSiteWebGlRenderer,
  createVisualRenderLoop,
  evaluateWebGlPolicy,
  type VisualRenderLoop,
} from "~/browser/visual/runtime";
import { runCleanupTasks } from "~/shared/lifecycle/run-cleanup-tasks";

import { getImagePreviewZoom, type HalftoneImageFit } from "./footprint";
import {
  createHalftoneInteractionState,
  resetHalftoneInteractionState,
  type HalftoneInteractionState,
} from "./interaction-state";
import { disposeHalftoneMaterialAssets } from "./materials/assets";
import { renderHalftoneMaterialScene } from "./materials/render";
import {
  getCanvasCursor,
  resolveImageInteractionSettings,
  syncImageElementTexture,
  syncResources,
} from "./runtime/core";
import { createRuntimeInteractionHandlers } from "./runtime/interaction";
import { createRuntimePasses, resizeRuntimePasses } from "./runtime/passes";
import type {
  HalftonePointerSettings,
  HalftoneRuntime,
  HalftoneRuntimeConfig,
  HalftoneSnapshotRequest,
  HalftoneViewport,
} from "./runtime/types";
import type { HalftonePose, HalftoneStudioSettings } from "./state";

type MutableRefObject<T> = { current: T };

const MAX_PREVIEW_PIXEL_RATIO = 2;

export async function createHalftoneRuntime({
  config: initialConfig,
  host,
  imageElement: initialImageElement,
}: {
  config: HalftoneRuntimeConfig;
  host: HTMLDivElement;
  imageElement: HTMLImageElement | null;
}): Promise<HalftoneRuntime> {
  let disposed = false;
  let active = true;
  let config = initialConfig;
  let imageElement = initialImageElement;
  let poseChange = initialConfig.onPoseChange;
  let onFirstInteraction = initialConfig.onFirstInteraction;

  const interactionReference: MutableRefObject<HalftoneInteractionState> = {
    current: createHalftoneInteractionState(initialConfig.initialPose),
  };
  const animationReference: MutableRefObject<
    HalftoneStudioSettings["animation"]
  > = {
    current: initialConfig.settings.animation,
  };
  const didInteractReference: MutableRefObject<boolean> = { current: false };
  const initialPoseReference: MutableRefObject<
    Partial<HalftonePose> | undefined
  > = { current: initialConfig.initialPose };
  const previewDistanceReference: MutableRefObject<number> = {
    current: initialConfig.previewDistance,
  };
  const geometryReference: MutableRefObject<BufferGeometry | null> = {
    current: initialConfig.geometry,
  };
  const imageFitReference: MutableRefObject<HalftoneImageFit> = {
    current: initialConfig.imageFit,
  };
  const imageInteractionReference: MutableRefObject<HalftonePointerSettings> = {
    current: resolveImageInteractionSettings(initialConfig.imageInteraction),
  };
  let captureSnapshot:
    | ((request: HalftoneSnapshotRequest) => Promise<Blob | null>)
    | null = null;

  const container = host;

  if (!container || !geometryReference.current) {
    throw new Error("Halftone runtime host or geometry missing.");
  }

  const getWidth = () => Math.max(container.clientWidth, 1);
  const getHeight = () => Math.max(container.clientHeight, 1);
  const getVirtualHeight = () =>
    Math.max(config.virtualRenderHeight, getHeight());
  const getVirtualWidth = () =>
    Math.max(
      Math.round(getVirtualHeight() * (getWidth() / Math.max(getHeight(), 1))),
      1,
    );
  const getRenderScale = () =>
    Math.min(
      window.devicePixelRatio || 1,
      config.maxRenderPixelRatio ?? MAX_PREVIEW_PIXEL_RATIO,
    );
  const getRenderHeight = () =>
    Math.max(Math.round(getVirtualHeight() * getRenderScale()), 1);
  const getRenderWidth = () =>
    Math.max(Math.round(getVirtualWidth() * getRenderScale()), 1);

  const webGlPolicy = evaluateWebGlPolicy();
  if (!webGlPolicy.allowed) {
    throw new Error("WebGL policy denied runtime startup.");
  }

  let renderLoop: VisualRenderLoop | null = null;
  let cancelled = false;

  const renderer = createSiteWebGlRenderer({
    antialias: false,
    alpha: true,
    onContextLost: () => {
      renderLoop?.stop();
    },
  });

  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(getRenderWidth(), getRenderHeight(), false);

  const canvas = renderer.domElement;
  canvas.style.cursor =
    config.renderStrategy === "static"
      ? "default"
      : getCanvasCursor(config.settings, false);
  canvas.style.display = "block";
  canvas.style.height = "100%";
  canvas.style.pointerEvents =
    config.renderStrategy === "static" ? "none" : "auto";
  canvas.style.touchAction =
    config.renderStrategy === "static" ? "auto" : "none";
  canvas.style.width = "100%";
  container.appendChild(canvas);

  const currentGeometry = geometryReference.current;
  if (!currentGeometry) {
    throw new Error("Halftone runtime geometry missing during setup.");
  }
  const resources = await createRuntimePasses({
    geometry: currentGeometry,
    imageFit: imageFitReference.current,
    logicalHeight: getVirtualHeight(),
    logicalWidth: getVirtualWidth(),
    previewDistance: previewDistanceReference.current,
    renderHeight: getRenderHeight(),
    renderWidth: getRenderWidth(),
    renderer,
    settings: config.settings,
  });
  const {
    blurHorizontalMaterial,
    blurHorizontalScene,
    blurTargetA,
    blurTargetB,
    blurVerticalMaterial,
    blurVerticalScene,
    camera,
    fullScreenGeometry,
    halftoneMaterial,
    imageMaterial,
    imageScene,
    material,
    materialAssets,
    mesh,
    orthographicCamera,
    postScene,
    scene3d,
    sceneTarget,
    transmissionBacksideTarget,
    transmissionTarget,
  } = resources;

  syncResources(resources, config.settings);
  syncImageElementTexture(resources, imageElement);

  const syncSize = () => {
    const width = getWidth();
    const height = getHeight();
    const logicalWidth = getVirtualWidth();
    const logicalHeight = getVirtualHeight();
    const renderWidth = getRenderWidth();
    const renderHeight = getRenderHeight();
    renderer.setSize(renderWidth, renderHeight, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    resizeRuntimePasses({
      logicalHeight,
      logicalWidth,
      renderHeight,
      renderWidth,
      resources,
    });
  };

  const { handlePointerDown, handlePointerLeave, handlePointerMove } =
    createRuntimeInteractionHandlers({
      canvas,
      didInteractReference,
      getSourceMode: () => config.settings.sourceMode,
      interactionReference,
      onFirstInteraction: () => onFirstInteraction(),
    });

  const clock = new Timer();
  clock.connect(document);
  const lookAtTarget = new Vector3();

  const renderFrame = (timestamp?: DOMHighResTimeStamp) => {
    if (cancelled || disposed) {
      return;
    }
    clock.update(timestamp);
    const activeSettings = config.settings;
    const delta = clock.getDelta();
    const elapsedTime =
      (initialPoseReference.current?.timeElapsed ?? 0) + clock.getElapsed();
    const baseDistance = previewDistanceReference.current;
    const logicalWidth = getVirtualWidth();
    const logicalHeight = getVirtualHeight();
    const isImageMode = activeSettings.sourceMode === "image";
    const hasImageTexture = resources.imageTexture !== null;
    halftoneMaterial.uniforms.time.value = elapsedTime;
    halftoneMaterial.uniforms.waveAmount.value =
      activeSettings.animation.waveEnabled && !isImageMode
        ? activeSettings.animation.waveAmount
        : 0;
    halftoneMaterial.uniforms.waveSpeed.value =
      activeSettings.animation.waveSpeed;
    if (isImageMode && !hasImageTexture) {
      renderer.setRenderTarget(null);
      renderer.clear();
      return;
    }
    halftoneMaterial.uniforms.cropToBounds.value = isImageMode ? 1 : 0;

    if (isImageMode) {
      const imageInteractionSettings = imageInteractionReference.current;
      const interaction = interactionReference.current;
      const hoverEasing =
        1 -
        Math.exp(
          -delta *
            (interaction.pointerInside
              ? imageInteractionSettings.hoverFadeIn
              : imageInteractionSettings.hoverFadeOut),
        );
      interaction.hoverStrength +=
        ((interaction.pointerInside ? 1 : 0) - interaction.hoverStrength) *
        hoverEasing;
      interaction.smoothedMouseX +=
        (interaction.mouseX - interaction.smoothedMouseX) *
        imageInteractionSettings.pointerFollow;
      interaction.smoothedMouseY +=
        (interaction.mouseY - interaction.smoothedMouseY) *
        imageInteractionSettings.pointerFollow;
      interaction.pointerVelocityX *=
        imageInteractionSettings.pointerVelocityDamping;
      interaction.pointerVelocityY *=
        imageInteractionSettings.pointerVelocityDamping;

      halftoneMaterial.uniforms.interactionUv.value.set(
        interaction.smoothedMouseX,
        1 - interaction.smoothedMouseY,
      );
      halftoneMaterial.uniforms.interactionVelocity.value.set(
        interaction.pointerVelocityX * logicalWidth,
        -interaction.pointerVelocityY * logicalHeight,
      );
      halftoneMaterial.uniforms.dragOffset.value.set(0, 0);
      halftoneMaterial.uniforms.hoverHalftoneActive.value = activeSettings
        .animation.hoverHalftoneEnabled
        ? interaction.hoverStrength
        : 0;
      halftoneMaterial.uniforms.hoverHalftonePowerShift.value = activeSettings
        .animation.hoverHalftoneEnabled
        ? activeSettings.animation.hoverHalftonePowerShift
        : 0;
      halftoneMaterial.uniforms.hoverHalftoneRadius.value =
        activeSettings.animation.hoverHalftoneRadius;
      halftoneMaterial.uniforms.hoverHalftoneWidthShift.value = activeSettings
        .animation.hoverHalftoneEnabled
        ? activeSettings.animation.hoverHalftoneWidthShift
        : 0;
      halftoneMaterial.uniforms.hoverLightStrength.value = activeSettings
        .animation.hoverLightEnabled
        ? activeSettings.animation.hoverLightIntensity *
          interaction.hoverStrength
        : 0;
      halftoneMaterial.uniforms.hoverLightRadius.value =
        activeSettings.animation.hoverLightRadius;
      halftoneMaterial.uniforms.hoverFlowStrength.value = 0;
      halftoneMaterial.uniforms.hoverFlowRadius.value = 0.18;
      halftoneMaterial.uniforms.dragFlowStrength.value = 0;

      imageMaterial.uniforms.zoom.value = getImagePreviewZoom(baseDistance);
      renderer.setRenderTarget(sceneTarget);
      renderer.render(imageScene, orthographicCamera);
      poseChange({
        autoElapsed: 0,
        rotateElapsed: 0,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        targetRotationX: interactionReference.current.targetRotationX,
        targetRotationY: interactionReference.current.targetRotationY,
        timeElapsed: elapsedTime,
      });
    } else {
      camera.position.z = baseDistance;
      lookAtTarget.set(0, mesh.position.y * 0.2, 0);
      camera.lookAt(lookAtTarget);
      renderHalftoneMaterialScene({
        camera,
        elapsedTime,
        material,
        mesh,
        outputTarget: activeSettings.halftone.enabled ? sceneTarget : null,
        renderer,
        scene: scene3d,
        transmissionBackground: materialAssets.glassBackgroundTexture,
        transmissionScene: materialAssets.glassTransmissionScene,
        transmissionBacksideTarget,
        transmissionTarget,
      });
    }
    if (!activeSettings.halftone.enabled && !isImageMode) {
      return;
    }
    blurHorizontalMaterial.uniforms.tInput.value = sceneTarget.texture;
    renderer.setRenderTarget(blurTargetA);
    renderer.render(blurHorizontalScene, orthographicCamera);
    blurVerticalMaterial.uniforms.tInput.value = blurTargetA.texture;
    renderer.setRenderTarget(blurTargetB);
    renderer.render(blurVerticalScene, orthographicCamera);
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(postScene, orthographicCamera);
  };

  const renderCurrentFrame = () => {
    renderFrame(
      typeof performance === "undefined" ? undefined : performance.now(),
    );
  };

  const stopObservingSize = observeElementSize(container, () => {
    syncSize();
    if (config.renderStrategy === "static") {
      renderCurrentFrame();
    }
  });

  if (config.renderStrategy !== "static") {
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointerleave", handlePointerLeave);
    renderLoop = createVisualRenderLoop({
      renderFrame,
      shouldRender: () => active && !cancelled && !disposed,
      target: container,
      targetVisibilityOptions: { rootMargin: "100px" },
    });
    renderLoop.start();
  } else {
    renderCurrentFrame();
  }

  captureSnapshot = async ({
    width,
    height,
    backgroundColor,
    includeBackground,
  }) => {
    const blob = await (async () => {
      const offscreen = document.createElement("canvas");
      offscreen.width = width;
      offscreen.height = height;
      const ctx = offscreen.getContext("2d");
      if (!ctx) {
        return null;
      }
      if (includeBackground) {
        ctx.fillStyle = backgroundColor ?? config.settings.background.color;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.drawImage(canvas, 0, 0, width, height);
      return new Promise<Blob | null>((resolve) => {
        offscreen.toBlob((nextBlob) => resolve(nextBlob), "image/png");
      });
    })();
    return blob;
  };

  const disposeRuntime = () => {
    cancelled = true;
    runCleanupTasks([
      () => stopObservingSize(),
      () => {
        if (renderLoop) {
          renderLoop.dispose();
        }
      },
      () => canvas.removeEventListener("pointermove", handlePointerMove),
      () => canvas.removeEventListener("pointerdown", handlePointerDown),
      () => canvas.removeEventListener("pointerleave", handlePointerLeave),
      () => clock.dispose(),
      () => blurHorizontalMaterial.dispose(),
      () => blurVerticalMaterial.dispose(),
      () => halftoneMaterial.dispose(),
      () => imageMaterial.dispose(),
      () => resources.imageTexture?.dispose(),
      () => fullScreenGeometry.dispose(),
      () => material.dispose(),
      () => sceneTarget.dispose(),
      () => transmissionBacksideTarget.dispose(),
      () => transmissionTarget.dispose(),
      () => blurTargetA.dispose(),
      () => blurTargetB.dispose(),
      () => disposeHalftoneMaterialAssets(materialAssets),
      () => renderer.dispose(),
      () => {
        if (canvas.parentNode === container) {
          container.removeChild(canvas);
        }
      },
    ]);
  };

  return {
    dispose: () => {
      if (disposed) {
        return;
      }
      disposed = true;
      disposeRuntime();
    },
    renderNow: () => {
      renderCurrentFrame();
    },
    resize: (viewport?: HalftoneViewport) => {
      void viewport;
      syncSize();
      if (config.renderStrategy === "static") {
        renderCurrentFrame();
      }
    },
    setActive: (nextActive: boolean) => {
      active = nextActive;
      if (!renderLoop) {
        return;
      }
      if (active) {
        renderLoop.start();
      } else {
        renderLoop.stop();
      }
    },
    setImage: (nextImageElement: HTMLImageElement | null) => {
      imageElement = nextImageElement;
      syncImageElementTexture(resources, imageElement);
      if (config.renderStrategy === "static") {
        renderCurrentFrame();
      }
    },
    snapshot: async (request) => captureSnapshot?.(request) ?? null,
    updateConfig: (nextConfig) => {
      const prevAnimation = animationReference.current;
      config = nextConfig;
      poseChange = nextConfig.onPoseChange;
      onFirstInteraction = nextConfig.onFirstInteraction;
      previewDistanceReference.current = nextConfig.previewDistance;
      if (nextConfig.initialPose !== initialPoseReference.current) {
        initialPoseReference.current = nextConfig.initialPose;
        interactionReference.current = createHalftoneInteractionState(
          nextConfig.initialPose,
        );
      }
      geometryReference.current = nextConfig.geometry;
      imageFitReference.current = nextConfig.imageFit;
      imageInteractionReference.current = resolveImageInteractionSettings(
        nextConfig.imageInteraction,
      );
      const nextAnimation = nextConfig.settings.animation;
      if (
        prevAnimation.autoRotateEnabled !== nextAnimation.autoRotateEnabled ||
        prevAnimation.followHoverEnabled !== nextAnimation.followHoverEnabled ||
        prevAnimation.followDragEnabled !== nextAnimation.followDragEnabled ||
        prevAnimation.hoverHalftoneEnabled !==
          nextAnimation.hoverHalftoneEnabled ||
        prevAnimation.hoverLightEnabled !== nextAnimation.hoverLightEnabled ||
        prevAnimation.dragFlowEnabled !== nextAnimation.dragFlowEnabled
      ) {
        resetHalftoneInteractionState(
          interactionReference.current,
          nextAnimation,
        );
      }
      if (
        (!prevAnimation.rotateEnabled && nextAnimation.rotateEnabled) ||
        prevAnimation.rotatePreset !== nextAnimation.rotatePreset
      ) {
        interactionReference.current.rotateElapsed = 0;
      }
      animationReference.current = nextAnimation;
      if (
        geometryReference.current &&
        resources.mesh.geometry !== geometryReference.current
      ) {
        resources.mesh.geometry = geometryReference.current;
      }
      syncResources(resources, nextConfig.settings);
      resources.imageMaterial.uniforms.imageFit.value =
        nextConfig.imageFit === "cover" ? 1 : 0;
      resources.canvas.style.cursor = getCanvasCursor(
        nextConfig.settings,
        interactionReference.current.dragging,
      );
      syncSize();
      if (nextConfig.renderStrategy === "static") {
        renderCurrentFrame();
      }
      void onFirstInteraction;
      void didInteractReference;
    },
  };
}
