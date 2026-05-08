import {
  AmbientLight,
  ClampToEdgeWrapping,
  Color,
  DirectionalLight,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  WebGLRenderTarget,
  WebGLRenderer,
} from "three";

import { type HalftoneMaterialAssets } from "../materials/assets";
import { type HalftoneTransmissionMaterial } from "../materials/material";
import { applyHalftoneMaterialSettings } from "../materials/render";
import type { HalftoneStudioSettings } from "../state";
import type { HalftonePointerSettings } from "./types";

const IMAGE_POINTER_FOLLOW = 0.38;
const IMAGE_POINTER_VELOCITY_DAMPING = 0.82;
const IMAGE_HOVER_FADE_IN = 18;
const IMAGE_HOVER_FADE_OUT = 7;

export const DEFAULT_IMAGE_INTERACTION_SETTINGS: HalftonePointerSettings = {
  hoverFadeIn: IMAGE_HOVER_FADE_IN,
  hoverFadeOut: IMAGE_HOVER_FADE_OUT,
  pointerFollow: IMAGE_POINTER_FOLLOW,
  pointerVelocityDamping: IMAGE_POINTER_VELOCITY_DAMPING,
};

export type SceneResources = {
  ambientLight: AmbientLight;
  blurHorizontalMaterial: ShaderMaterial;
  blurHorizontalScene: Scene;
  blurTargetA: WebGLRenderTarget;
  blurTargetB: WebGLRenderTarget;
  blurVerticalMaterial: ShaderMaterial;
  blurVerticalScene: Scene;
  camera: PerspectiveCamera;
  canvas: HTMLCanvasElement;
  fillLight: DirectionalLight;
  fullScreenGeometry: PlaneGeometry;
  halftoneMaterial: ShaderMaterial;
  imageMaterial: ShaderMaterial;
  imageScene: Scene;
  imageTexture: Texture | null;
  materialAssets: HalftoneMaterialAssets;
  material: HalftoneTransmissionMaterial;
  mesh: Mesh;
  orthographicCamera: OrthographicCamera;
  postScene: Scene;
  primaryLight: DirectionalLight;
  renderer: WebGLRenderer;
  scene3d: Scene;
  sceneTarget: WebGLRenderTarget;
  transmissionBacksideTarget: WebGLRenderTarget;
  transmissionTarget: WebGLRenderTarget;
};

export function createRenderTarget(width: number, height: number) {
  return new WebGLRenderTarget(width, height, {
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    format: RGBAFormat,
  });
}

export function resolveImageInteractionSettings(
  settings?: Partial<HalftonePointerSettings>,
): HalftonePointerSettings {
  return {
    ...DEFAULT_IMAGE_INTERACTION_SETTINGS,
    ...settings,
  };
}

export function syncImageElementTexture(
  resources: SceneResources,
  imageElement: HTMLImageElement | null,
) {
  if (resources.imageTexture) {
    resources.imageTexture.dispose();
    resources.imageTexture = null;
  }

  if (!imageElement) {
    resources.imageMaterial.uniforms.tImage.value = null;
    resources.imageMaterial.uniforms.imageSize.value.set(1, 1);
    return;
  }

  const texture = new Texture(imageElement);
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  texture.colorSpace = SRGBColorSpace;

  resources.imageTexture = texture;
  resources.imageMaterial.uniforms.tImage.value = texture;
  resources.imageMaterial.uniforms.imageSize.value.set(
    imageElement.naturalWidth,
    imageElement.naturalHeight,
  );
}

export function getCanvasCursor(
  settings: HalftoneStudioSettings,
  isDragging: boolean,
) {
  if (settings.sourceMode === "image") {
    return "default";
  }

  if (settings.animation.followDragEnabled) {
    return isDragging ? "grabbing" : "grab";
  }

  return "default";
}

function setPrimaryLightPosition(
  light: DirectionalLight,
  angleDegrees: number,
  height: number,
) {
  const lightAngle = (angleDegrees * Math.PI) / 180;
  light.position.set(
    Math.cos(lightAngle) * 5,
    height,
    Math.sin(lightAngle) * 5,
  );
}

function updateLighting(
  resources: SceneResources,
  settings: HalftoneStudioSettings,
) {
  resources.primaryLight.intensity = settings.lighting.intensity;
  setPrimaryLightPosition(
    resources.primaryLight,
    settings.lighting.angleDegrees,
    settings.lighting.height,
  );
  resources.fillLight.intensity = settings.lighting.fillIntensity;
  resources.ambientLight.intensity = settings.lighting.ambientIntensity;
}

function updateMaterial(
  resources: SceneResources,
  settings: HalftoneStudioSettings,
) {
  applyHalftoneMaterialSettings(
    resources.material,
    settings.material,
    resources.materialAssets,
  );
}

function updateHalftone(
  resources: SceneResources,
  settings: HalftoneStudioSettings,
) {
  const dashColorUniform = resources.halftoneMaterial.uniforms.dashColor;
  const hoverDashColorUniform =
    resources.halftoneMaterial.uniforms.hoverDashColor;

  if (
    !dashColorUniform ||
    !(dashColorUniform.value instanceof Color) ||
    !hoverDashColorUniform ||
    !(hoverDashColorUniform.value instanceof Color)
  ) {
    return;
  }

  resources.halftoneMaterial.uniforms.tile.value = settings.halftone.scale;
  resources.halftoneMaterial.uniforms.s_3.value = settings.halftone.power;
  resources.halftoneMaterial.uniforms.s_4.value = settings.halftone.width;
  resources.halftoneMaterial.uniforms.applyToDarkAreas.value =
    settings.halftone.toneTarget === "dark" ? 1 : 0;
  dashColorUniform.value.set(settings.halftone.dashColor);
  hoverDashColorUniform.value.set(settings.halftone.hoverDashColor);
  resources.halftoneMaterial.uniforms.waveAmount.value =
    settings.animation.waveEnabled && settings.sourceMode !== "image"
      ? settings.animation.waveAmount
      : 0;
  resources.halftoneMaterial.uniforms.waveSpeed.value =
    settings.animation.waveSpeed;
  resources.imageMaterial.uniforms.contrast.value =
    settings.halftone.imageContrast;
}

export function syncResources(
  resources: SceneResources,
  settings: HalftoneStudioSettings,
) {
  updateLighting(resources, settings);
  updateMaterial(resources, settings);
  updateHalftone(resources, settings);
}
