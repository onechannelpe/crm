import * as THREE from "three";

import { observeElementSize } from "~/lib/dom/observe-element-size";
import {
  getImageFootprintScale,
  getImagePreviewZoom,
  getMeshFootprintScale,
  type HalftoneImageFit,
  VIRTUAL_RENDER_HEIGHT,
} from "~/lib/halftone/footprint";
import {
  applySpringStep,
  createHalftoneInteractionState,
  resetHalftoneInteractionState,
  type HalftoneInteractionState,
} from "~/lib/halftone/interaction-state";
import {
  applyHalftoneMaterialSettings,
  createHalftoneMaterial,
  createHalftoneMaterialAssets,
  disposeHalftoneMaterialAssets,
  renderHalftoneMaterialScene,
} from "~/lib/halftone/materials";
import {
  createRenderTarget,
  getCanvasCursor,
  resolveImageInteractionSettings,
  syncImageElementTexture,
  syncResources,
  type SceneResources,
} from "~/lib/halftone/runtime-core";
import { createRuntimeInteractionHandlers } from "~/lib/halftone/runtime-interaction";
import type {
  HalftonePointerSettings,
  HalftoneRenderStrategy,
  HalftoneRuntime,
  HalftoneRuntimeConfig,
  HalftoneSnapshotRequest,
  HalftoneViewport,
} from "~/lib/halftone/runtime-types";
import type { HalftoneStudioSettings } from "~/lib/halftone/state";
import type { HalftonePose } from "~/lib/halftone/state";
import { runCleanupTasks } from "~/lib/lifecycle/run-cleanup-tasks";
import {
  createSiteWebGlRenderer,
  createVisualRenderLoop,
  evaluateWebGlPolicy,
  type VisualRenderLoop,
} from "~/lib/visual-runtime";

type MutableRefObject<T> = { current: T };

const passThroughVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const blurFragmentShader = `
  precision highp float;

  uniform sampler2D tInput;
  uniform vec2 dir;
  uniform vec2 res;

  varying vec2 vUv;

  void main() {
    vec4 sum = vec4(0.0);
    vec2 px = dir / res;

    float w[5];
    w[0] = 0.227027;
    w[1] = 0.1945946;
    w[2] = 0.1216216;
    w[3] = 0.054054;
    w[4] = 0.016216;

    sum += texture2D(tInput, vUv) * w[0];

    for (int i = 1; i < 5; i++) {
      float fi = float(i) * 3.0;
      sum += texture2D(tInput, vUv + px * fi) * w[i];
      sum += texture2D(tInput, vUv - px * fi) * w[i];
    }

    gl_FragColor = sum;
  }
`;

const imagePassthroughFragmentShader = `
  precision highp float;

  uniform sampler2D tImage;
  uniform vec2 imageSize;
  uniform vec2 viewportSize;
  uniform float zoom;
  uniform float contrast;
  uniform float imageFit;

  varying vec2 vUv;

  void main() {
    float imageAspect = imageSize.x / imageSize.y;
    float viewAspect = viewportSize.x / viewportSize.y;

    vec2 uv = vUv;

    if (imageAspect > viewAspect) {
      float scale = viewAspect / imageAspect;
      if (imageFit > 0.5) {
        uv.x = (uv.x - 0.5) * scale + 0.5;
      } else {
        uv.y = (uv.y - 0.5) / scale + 0.5;
      }
    } else {
      float scale = imageAspect / viewAspect;
      if (imageFit > 0.5) {
        uv.y = (uv.y - 0.5) * scale + 0.5;
      } else {
        uv.x = (uv.x - 0.5) / scale + 0.5;
      }
    }

    uv = (uv - 0.5) / zoom + 0.5;

    float inBounds = step(0.0, uv.x) * step(uv.x, 1.0)
                   * step(0.0, uv.y) * step(uv.y, 1.0);

    vec4 color = texture2D(tImage, clamp(uv, 0.0, 1.0));
    vec3 contrastColor = clamp((color.rgb - 0.5) * contrast + 0.5, 0.0, 1.0);

    gl_FragColor = vec4(contrastColor, inBounds);
  }
`;

const halftoneFragmentShader = `
  precision highp float;

  uniform sampler2D tScene;
  uniform sampler2D tGlow;
  uniform vec2 effectResolution;
  uniform vec2 logicalResolution;
  uniform float tile;
  uniform float s_3;
  uniform float s_4;
  uniform float applyToDarkAreas;
  uniform vec3 dashColor;
  uniform vec3 hoverDashColor;
  uniform float time;
  uniform float waveAmount;
  uniform float waveSpeed;
  uniform float footprintScale;
  uniform vec2 interactionUv;
  uniform vec2 interactionVelocity;
  uniform vec2 dragOffset;
  uniform float hoverHalftoneActive;
  uniform float hoverHalftonePowerShift;
  uniform float hoverHalftoneRadius;
  uniform float hoverHalftoneWidthShift;
  uniform float hoverLightStrength;
  uniform float hoverLightRadius;
  uniform float hoverFlowStrength;
  uniform float hoverFlowRadius;
  uniform float dragFlowStrength;
  uniform float cropToBounds;

  varying vec2 vUv;

  float distSegment(in vec2 p, in vec2 a, in vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float denom = max(dot(ba, ba), 0.000001);
    float h = clamp(dot(pa, ba) / denom, 0.0, 1.0);
    return length(pa - ba * h);
  }

  float lineSimpleEt(in vec2 p, in float r, in float thickness) {
    vec2 a = vec2(0.5) + vec2(-r, 0.0);
    vec2 b = vec2(0.5) + vec2(r, 0.0);
    float distToSegment = distSegment(p, a, b);
    float halfThickness = thickness * r;
    return distToSegment - halfThickness;
  }

  void main() {
    if (cropToBounds > 0.5) {
      vec4 boundsCheck = texture2D(tScene, vUv);
      if (boundsCheck.a < 0.01) {
        gl_FragColor = vec4(0.0);
        return;
      }
    }

    vec2 fragCoord =
      (gl_FragCoord.xy / max(effectResolution, vec2(1.0))) * logicalResolution;
    float halftoneSize = max(tile * max(footprintScale, 0.001), 1.0);
    vec2 pointerPx = interactionUv * logicalResolution;
    vec2 fragDelta = fragCoord - pointerPx;
    float fragDist = length(fragDelta);
    vec2 radialDir = fragDist > 0.001 ? fragDelta / fragDist : vec2(0.0, 1.0);
    float velocityMagnitude = length(interactionVelocity);
    vec2 motionDir = velocityMagnitude > 0.001
      ? interactionVelocity / velocityMagnitude
      : vec2(0.0, 0.0);
    float motionBias = velocityMagnitude > 0.001
      ? dot(-radialDir, motionDir) * 0.5 + 0.5
      : 0.5;

    float hoverLightMask = 0.0;
    if (hoverLightStrength > 0.0) {
      float lightRadiusPx = hoverLightRadius * logicalResolution.y;
      hoverLightMask = smoothstep(lightRadiusPx, 0.0, fragDist);
    }

    float hoverHalftoneMask = 0.0;
    if (hoverHalftoneActive > 0.0) {
      float hoverHalftoneRadiusPx = hoverHalftoneRadius * logicalResolution.y;
      hoverHalftoneMask =
        smoothstep(hoverHalftoneRadiusPx, 0.0, fragDist) *
        clamp(hoverHalftoneActive, 0.0, 1.0);
    }

    float hoverFlowMask = 0.0;
    if (hoverFlowStrength > 0.0) {
      float hoverRadiusPx = hoverFlowRadius * logicalResolution.y;
      hoverFlowMask = smoothstep(hoverRadiusPx, 0.0, fragDist);
    }

    vec2 hoverDisplacement =
      radialDir * hoverFlowStrength * hoverFlowMask * halftoneSize * 0.55 +
      motionDir * hoverFlowStrength * hoverFlowMask * (0.4 + motionBias) * halftoneSize * 1.15;
    vec2 travelDisplacement = dragOffset * dragFlowStrength * 0.45;
    vec2 effectCoord = fragCoord + hoverDisplacement + travelDisplacement;

    float bandRow = floor(effectCoord.y / halftoneSize);
    float waveOffset =
      waveAmount * sin(time * waveSpeed + bandRow * 0.5) * halftoneSize;
    effectCoord.x += waveOffset;

    vec2 cellIndex = floor(effectCoord / halftoneSize);
    vec2 sampleUv = clamp(
      (cellIndex + 0.5) * halftoneSize / logicalResolution,
      vec2(0.0),
      vec2(1.0)
    );
    vec2 cellUv = fract(effectCoord / halftoneSize);

    vec4 sceneSample = texture2D(tScene, sampleUv);
    float mask = smoothstep(0.02, 0.08, sceneSample.a);
    float localPower = clamp(
      s_3 + hoverHalftonePowerShift * hoverHalftoneMask,
      -1.5,
      1.5
    );
    float localWidth = clamp(
      s_4 + hoverHalftoneWidthShift * hoverHalftoneMask,
      0.05,
      1.4
    );
    float lightLift =
      hoverLightStrength *
      hoverLightMask *
      mix(0.78, 1.18, motionBias) *
      0.22;
    float toneValue =
      (sceneSample.r + sceneSample.g + sceneSample.b) * (1.0 / 3.0);
    if (applyToDarkAreas > 0.5) {
      toneValue = 1.0 - toneValue;
    }
    // Preserve the pre-toneTarget light-mode response by keeping the power
    // bias inside the averaged tone calculation.
    float powerBias = localPower * length(vec2(0.5)) * (1.0 / 3.0);
    float bandRadius = clamp(
      toneValue + powerBias + lightLift,
      0.0,
      1.0
    ) * 1.86 * 0.5;

    float alpha = 0.0;
    if (bandRadius > 0.0001) {
      float signedDistance = lineSimpleEt(cellUv, bandRadius, localWidth);
      float edge = 0.02;
      alpha = (1.0 - smoothstep(0.0, edge, signedDistance)) * mask;
    }

    vec3 activeDashColor = mix(dashColor, hoverDashColor, hoverHalftoneMask);
    vec3 color = activeDashColor * alpha;
    gl_FragColor = vec4(color, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

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

  const resourcesReference: MutableRefObject<SceneResources | null> = {
    current: null,
  };
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
  const geometryReference: MutableRefObject<THREE.BufferGeometry | null> = {
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
    Math.max(config.virtualRenderHeight ?? VIRTUAL_RENDER_HEIGHT, getHeight());
  const getVirtualWidth = () =>
    Math.max(
      Math.round(getVirtualHeight() * (getWidth() / Math.max(getHeight(), 1))),
      1,
    );
  const getRenderScale = () =>
    Math.min(window.devicePixelRatio || 1, MAX_PREVIEW_PIXEL_RATIO);
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
  let stopObservingSize: (() => void) | null = null;
  let disposeRuntime = () => {};
  let renderCurrentFrame = () => {};

  const renderer = createSiteWebGlRenderer({
    antialias: false,
    alpha: true,
    onContextLost: () => {
      renderLoop?.stop();
    },
  });

  renderer.outputColorSpace = THREE.SRGBColorSpace;
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

  const materialAssets = await createHalftoneMaterialAssets(renderer);
  const scene3d = new THREE.Scene();
  scene3d.background = null;
  const camera = new THREE.PerspectiveCamera(
    45,
    getWidth() / getHeight(),
    0.1,
    100,
  );
  camera.position.z = previewDistanceReference.current;
  const primaryLight = new THREE.DirectionalLight(0xffffff, 1.5);
  scene3d.add(primaryLight);
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.15);
  fillLight.position.set(-3, -1, 1);
  scene3d.add(fillLight);
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.08);
  scene3d.add(ambientLight);
  const material = createHalftoneMaterial();
  applyHalftoneMaterialSettings(
    material,
    config.settings.material,
    materialAssets,
  );
  const currentGeometry = geometryReference.current;
  if (!currentGeometry) {
    throw new Error("Halftone runtime geometry missing during setup.");
  }
  const mesh = new THREE.Mesh(currentGeometry, material);
  scene3d.add(mesh);
  const sceneTarget = createRenderTarget(getRenderWidth(), getRenderHeight());
  const transmissionBacksideTarget = createRenderTarget(
    getRenderWidth(),
    getRenderHeight(),
  );
  const transmissionTarget = createRenderTarget(
    getRenderWidth(),
    getRenderHeight(),
  );
  const blurTargetA = createRenderTarget(getRenderWidth(), getRenderHeight());
  const blurTargetB = createRenderTarget(getRenderWidth(), getRenderHeight());
  const fullScreenGeometry = new THREE.PlaneGeometry(2, 2);
  const orthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const blurHorizontalMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tInput: { value: null },
      dir: { value: new THREE.Vector2(1, 0) },
      res: { value: new THREE.Vector2(getRenderWidth(), getRenderHeight()) },
    },
    vertexShader: passThroughVertexShader,
    fragmentShader: blurFragmentShader,
  });
  const blurVerticalMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tInput: { value: null },
      dir: { value: new THREE.Vector2(0, 1) },
      res: { value: new THREE.Vector2(getRenderWidth(), getRenderHeight()) },
    },
    vertexShader: passThroughVertexShader,
    fragmentShader: blurFragmentShader,
  });
  const halftoneMaterial = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      tScene: { value: sceneTarget.texture },
      tGlow: { value: blurTargetB.texture },
      effectResolution: {
        value: new THREE.Vector2(getRenderWidth(), getRenderHeight()),
      },
      logicalResolution: {
        value: new THREE.Vector2(getVirtualWidth(), getVirtualHeight()),
      },
      tile: { value: config.settings.halftone.scale },
      s_3: { value: config.settings.halftone.power },
      s_4: { value: config.settings.halftone.width },
      applyToDarkAreas: {
        value: config.settings.halftone.toneTarget === "dark" ? 1 : 0,
      },
      dashColor: { value: new THREE.Color(config.settings.halftone.dashColor) },
      hoverDashColor: {
        value: new THREE.Color(config.settings.halftone.hoverDashColor),
      },
      time: { value: 0 },
      waveAmount: { value: 0 },
      waveSpeed: { value: 1 },
      footprintScale: { value: 1.0 },
      interactionUv: { value: new THREE.Vector2(0.5, 0.5) },
      interactionVelocity: { value: new THREE.Vector2(0, 0) },
      dragOffset: { value: new THREE.Vector2(0, 0) },
      hoverHalftoneActive: { value: 0 },
      hoverHalftonePowerShift: { value: 0 },
      hoverHalftoneRadius: { value: 0.2 },
      hoverHalftoneWidthShift: { value: 0 },
      hoverLightStrength: { value: 0 },
      hoverLightRadius: { value: 0.2 },
      hoverFlowStrength: { value: 0 },
      hoverFlowRadius: { value: 0.18 },
      dragFlowStrength: { value: 0 },
      cropToBounds: { value: 0 },
    },
    vertexShader: passThroughVertexShader,
    fragmentShader: halftoneFragmentShader,
  });

  const blurHorizontalScene = new THREE.Scene();
  blurHorizontalScene.add(
    new THREE.Mesh(fullScreenGeometry, blurHorizontalMaterial),
  );
  const blurVerticalScene = new THREE.Scene();
  blurVerticalScene.add(
    new THREE.Mesh(fullScreenGeometry, blurVerticalMaterial),
  );
  const postScene = new THREE.Scene();
  postScene.add(new THREE.Mesh(fullScreenGeometry, halftoneMaterial));
  const imageMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tImage: { value: null },
      imageSize: { value: new THREE.Vector2(1, 1) },
      viewportSize: {
        value: new THREE.Vector2(getVirtualWidth(), getVirtualHeight()),
      },
      zoom: { value: getImagePreviewZoom(previewDistanceReference.current) },
      contrast: { value: config.settings.halftone.imageContrast },
      imageFit: { value: imageFitReference.current === "cover" ? 1 : 0 },
    },
    vertexShader: passThroughVertexShader,
    fragmentShader: imagePassthroughFragmentShader,
  });
  const imageScene = new THREE.Scene();
  imageScene.add(new THREE.Mesh(fullScreenGeometry, imageMaterial));

  const resources: SceneResources = {
    ambientLight,
    blurHorizontalMaterial,
    blurHorizontalScene,
    blurTargetA,
    blurTargetB,
    blurVerticalMaterial,
    blurVerticalScene,
    camera,
    canvas,
    fillLight,
    fullScreenGeometry,
    halftoneMaterial,
    imageMaterial,
    imageScene,
    imageTexture: null,
    materialAssets,
    material,
    mesh,
    orthographicCamera,
    postScene,
    primaryLight,
    renderer,
    scene3d,
    sceneTarget,
    transmissionBacksideTarget,
    transmissionTarget,
  };

  resourcesReference.current = resources;
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
    sceneTarget.setSize(renderWidth, renderHeight);
    transmissionBacksideTarget.setSize(renderWidth, renderHeight);
    transmissionTarget.setSize(renderWidth, renderHeight);
    blurTargetA.setSize(renderWidth, renderHeight);
    blurTargetB.setSize(renderWidth, renderHeight);
    blurHorizontalMaterial.uniforms.res.value.set(renderWidth, renderHeight);
    blurVerticalMaterial.uniforms.res.value.set(renderWidth, renderHeight);
    halftoneMaterial.uniforms.effectResolution.value.set(
      renderWidth,
      renderHeight,
    );
    halftoneMaterial.uniforms.logicalResolution.value.set(
      logicalWidth,
      logicalHeight,
    );
    imageMaterial.uniforms.viewportSize.value.set(logicalWidth, logicalHeight);
  };

  const { handlePointerDown, handlePointerLeave, handlePointerMove } =
    createRuntimeInteractionHandlers({
      canvas,
      didInteractReference,
      getSourceMode: () => config.settings.sourceMode,
      interactionReference,
      onFirstInteraction: () => onFirstInteraction(),
    });

  const clock = new THREE.Timer();
  clock.connect(document);
  const lookAtTarget = new THREE.Vector3();

  const renderFrame = (timestamp?: DOMHighResTimeStamp) => {
    if (cancelled || disposed) return;
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
    if (!activeSettings.halftone.enabled && !isImageMode) return;
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

  renderCurrentFrame = () => {
    renderFrame(
      typeof performance === "undefined" ? undefined : performance.now(),
    );
  };

  stopObservingSize = observeElementSize(container, () => {
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
      if (!ctx) return null;
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

  disposeRuntime = () => {
    cancelled = true;
    runCleanupTasks([
      () => stopObservingSize?.(),
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
        if (canvas.parentNode === container) {
          container.removeChild(canvas);
        }
      },
    ]);
  };

  return {
    dispose: () => {
      if (disposed) return;
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
      if (!renderLoop) return;
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
