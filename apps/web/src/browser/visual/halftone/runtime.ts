import { SRGBColorSpace, Timer, Vector3 } from "three";

import { observeElementSize } from "~/browser/dom/observe-element-size";
import {
  createSiteWebGlRenderer,
  createVisualRenderLoop,
  evaluateWebGlPolicy,
  type VisualRenderLoop,
} from "~/browser/visual/runtime";
import { runCleanupTasks } from "~/shared/lifecycle/run-cleanup-tasks";

import {
  createHalftoneInteractionState,
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
} from "./runtime/types";
import type { HalftonePose } from "./state";

type MutableRefObject<T> = { current: T };

const MAX_PREVIEW_PIXEL_RATIO = 2;
const REFERENCE_PREVIEW_DISTANCE = 4;

function getImagePreviewZoom(previewDistance: number) {
  return REFERENCE_PREVIEW_DISTANCE / Math.max(previewDistance, 0.001);
}

export async function createHalftoneRuntime({
  host,
  getConfig,
  getImageElement,
}: {
  host: HTMLDivElement;
  getConfig: () => HalftoneRuntimeConfig;
  getImageElement: () => HTMLImageElement | null;
}): Promise<HalftoneRuntime> {
  const initialConfig = getConfig();

  if (!initialConfig.geometry) {
    throw new Error("Halftone runtime geometry missing.");
  }

  let disposed = false;
  let active = true;

  const interactionReference: MutableRefObject<HalftoneInteractionState> = {
    current: createHalftoneInteractionState(initialConfig.initialPose),
  };

  const didInteractReference: MutableRefObject<boolean> = {
    current: false,
  };

  const initialPoseReference: MutableRefObject<
    Partial<HalftonePose> | undefined
  > = {
    current: initialConfig.initialPose,
  };

  const imageInteractionReference: MutableRefObject<HalftonePointerSettings> = {
    current: resolveImageInteractionSettings(initialConfig.imageInteraction),
  };

  const getWidth = () => Math.max(host.clientWidth, 1);
  const getHeight = () => Math.max(host.clientHeight, 1);

  const getVirtualHeight = () =>
    Math.max(getConfig().virtualRenderHeight, getHeight());

  const getVirtualWidth = () =>
    Math.max(
      Math.round(getVirtualHeight() * (getWidth() / Math.max(getHeight(), 1))),
      1,
    );

  const getRenderScale = () =>
    Math.min(
      window.devicePixelRatio || 1,
      getConfig().maxRenderPixelRatio ?? MAX_PREVIEW_PIXEL_RATIO,
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
    initialConfig.renderStrategy === "static"
      ? "default"
      : getCanvasCursor(initialConfig.settings, false);
  canvas.style.display = "block";
  canvas.style.height = "100%";
  canvas.style.pointerEvents =
    initialConfig.renderStrategy === "static" ? "none" : "auto";
  canvas.style.touchAction =
    initialConfig.renderStrategy === "static" ? "auto" : "none";
  canvas.style.width = "100%";

  host.appendChild(canvas);

  const resources = await createRuntimePasses({
    geometry: initialConfig.geometry,
    imageFit: initialConfig.imageFit,
    logicalHeight: getVirtualHeight(),
    logicalWidth: getVirtualWidth(),
    previewDistance: initialConfig.previewDistance,
    renderHeight: getRenderHeight(),
    renderWidth: getRenderWidth(),
    renderer,
    settings: initialConfig.settings,
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

  syncResources(resources, initialConfig.settings);
  syncImageElementTexture(resources, getImageElement());

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
      getSourceMode: () => getConfig().settings.sourceMode,
      interactionReference,
      onFirstInteraction: () => getConfig().onFirstInteraction(),
    });

  const clock = new Timer();
  clock.connect(document);

  const lookAtTarget = new Vector3();

  const renderFrame = (timestamp?: DOMHighResTimeStamp) => {
    if (disposed) {
      return;
    }

    clock.update(timestamp);

    const config = getConfig();
    const activeSettings = config.settings;
    const delta = clock.getDelta();
    const elapsedTime =
      (initialPoseReference.current?.timeElapsed ?? 0) + clock.getElapsed();
    const baseDistance = config.previewDistance;
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

      config.onPoseChange({
        autoElapsed: 0,
        rotateElapsed: 0,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        targetRotationX: interaction.targetRotationX,
        targetRotationY: interaction.targetRotationY,
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

  const stopObservingSize = observeElementSize(host, () => {
    syncSize();

    if (getConfig().renderStrategy === "static") {
      renderCurrentFrame();
    }
  });

  if (initialConfig.renderStrategy === "static") {
    renderCurrentFrame();
  } else {
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointerleave", handlePointerLeave);

    renderLoop = createVisualRenderLoop({
      renderFrame,
      shouldRender: () => active && !disposed,
      target: host,
      targetVisibilityOptions: { rootMargin: "100px" },
    });

    renderLoop.start();
  }

  const captureSnapshot = async ({
    width,
    height,
    backgroundColor,
    includeBackground,
  }: HalftoneSnapshotRequest): Promise<Blob | null> => {
    const offscreen = document.createElement("canvas");
    offscreen.width = width;
    offscreen.height = height;

    const context = offscreen.getContext("2d");

    if (!context) {
      return null;
    }

    if (includeBackground) {
      context.fillStyle =
        backgroundColor ?? getConfig().settings.background.color;
      context.fillRect(0, 0, width, height);
    }

    context.drawImage(canvas, 0, 0, width, height);

    return new Promise((resolve) => {
      offscreen.toBlob(resolve, "image/png");
    });
  };

  const disposeRuntime = () => {
    runCleanupTasks([
      stopObservingSize,
      () => renderLoop?.dispose(),
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
        if (canvas.parentNode === host) {
          host.removeChild(canvas);
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

    renderNow: renderCurrentFrame,

    resize: () => {
      syncSize();

      if (getConfig().renderStrategy === "static") {
        renderCurrentFrame();
      }
    },

    setActive: (nextActive) => {
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

    snapshot: captureSnapshot,
  };
}
