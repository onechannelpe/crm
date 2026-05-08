import * as THREE from "three";

import type { HalftoneImageFit } from "~/lib/halftone/footprint";
import {
  applyHalftoneMaterialSettings,
  type HalftoneMaterialAssets,
  type HalftoneTransmissionMaterial,
} from "~/lib/halftone/materials";
import type { HalftonePointerSettings } from "~/lib/halftone/runtime-types";
import type { HalftoneStudioSettings } from "~/lib/halftone/state";

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
  ambientLight: THREE.AmbientLight;
  blurHorizontalMaterial: THREE.ShaderMaterial;
  blurHorizontalScene: THREE.Scene;
  blurTargetA: THREE.WebGLRenderTarget;
  blurTargetB: THREE.WebGLRenderTarget;
  blurVerticalMaterial: THREE.ShaderMaterial;
  blurVerticalScene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
  fillLight: THREE.DirectionalLight;
  fullScreenGeometry: THREE.PlaneGeometry;
  halftoneMaterial: THREE.ShaderMaterial;
  imageMaterial: THREE.ShaderMaterial;
  imageScene: THREE.Scene;
  imageTexture: THREE.Texture | null;
  materialAssets: HalftoneMaterialAssets;
  material: HalftoneTransmissionMaterial;
  mesh: THREE.Mesh;
  orthographicCamera: THREE.OrthographicCamera;
  postScene: THREE.Scene;
  primaryLight: THREE.DirectionalLight;
  renderer: THREE.WebGLRenderer;
  scene3d: THREE.Scene;
  sceneTarget: THREE.WebGLRenderTarget;
  transmissionBacksideTarget: THREE.WebGLRenderTarget;
  transmissionTarget: THREE.WebGLRenderTarget;
};

export function createRenderTarget(width: number, height: number) {
  return new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
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

  const texture = new THREE.Texture(imageElement);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;

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
  light: THREE.DirectionalLight,
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
  resources.halftoneMaterial.uniforms.tile.value = settings.halftone.scale;
  resources.halftoneMaterial.uniforms.s_3.value = settings.halftone.power;
  resources.halftoneMaterial.uniforms.s_4.value = settings.halftone.width;
  resources.halftoneMaterial.uniforms.applyToDarkAreas.value =
    settings.halftone.toneTarget === "dark" ? 1 : 0;
  (resources.halftoneMaterial.uniforms.dashColor.value as THREE.Color).set(
    settings.halftone.dashColor,
  );
  (resources.halftoneMaterial.uniforms.hoverDashColor.value as THREE.Color).set(
    settings.halftone.hoverDashColor,
  );
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

export type RuntimeRefs = {
  imageFitReference: { current: HalftoneImageFit };
};
