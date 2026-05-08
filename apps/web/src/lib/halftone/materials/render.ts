import * as THREE from "three";

import {
  GLASS_TRANSMISSION_BACKGROUND,
  type HalftoneMaterialAssets,
} from "~/lib/halftone/materials/assets";
import {
  getHalftoneGlassState,
  setHalftoneGlassState,
  type HalftoneTransmissionMaterial,
} from "~/lib/halftone/materials/material";
import type { HalftoneMaterialSettings } from "~/lib/halftone/state";

const GLASS_THICKNESS_TO_WORLD_UNITS = 1 / 320;
const GLASS_ATTENUATION_DISTANCE_MIN = 0.12;
const GLASS_ENVIRONMENT_INTENSITY_BASE = 0.18;
const GLASS_ENVIRONMENT_INTENSITY_MULTIPLIER = 0.12;

function getGlassEnvironmentIntensity(power: number) {
  return (
    GLASS_ENVIRONMENT_INTENSITY_BASE +
    power * GLASS_ENVIRONMENT_INTENSITY_MULTIPLIER
  );
}

export function applyHalftoneMaterialSettings(
  material: HalftoneTransmissionMaterial,
  settings: HalftoneMaterialSettings,
  assets: HalftoneMaterialAssets,
) {
  const isGlass = settings.surface === "glass";
  const glassThickness = settings.thickness * GLASS_THICKNESS_TO_WORLD_UNITS;
  const glassEnvironmentIntensity = getGlassEnvironmentIntensity(
    settings.environmentPower,
  );
  const glassAttenuationDistance = Math.max(
    glassThickness * 4,
    GLASS_ATTENUATION_DISTANCE_MIN,
  );

  material.color.set(isGlass ? "#ffffff" : settings.color);
  material.roughness = settings.roughness;
  material.metalness = settings.metalness;
  material.envMap = isGlass
    ? assets.glassEnvironmentTexture
    : assets.solidEnvironmentTexture;
  material.envMapIntensity = isGlass ? glassEnvironmentIntensity : 0.25;
  material.clearcoat = isGlass ? 1 : 0;
  material.clearcoatRoughness = isGlass
    ? Math.max(settings.roughness * 0.25, 0.01)
    : 0.08;
  material.reflectivity = isGlass ? 0.98 : 0.5;
  material.setTransmissionEnabled(isGlass);
  material.setRefractionEnvironment(
    isGlass ? assets.glassBackgroundTexture : null,
  );
  material.setEnvironmentRefractionEnabled(isGlass);
  material.thickness = isGlass ? glassThickness : 0;
  material.ior = isGlass ? settings.refraction : 1.5;
  material.setTransmissionBuffer(null);
  material.bumpMap = null;
  material.bumpScale = 0;
  material.roughnessMap = null;
  material.side = THREE.FrontSide;
  material.transparent = false;
  material.opacity = 1;
  material.depthWrite = true;
  material.setAttenuation(
    new THREE.Color(isGlass ? settings.color : "white"),
    isGlass ? glassAttenuationDistance : Infinity,
  );
  material.setOpticalEffects({
    anisotropicBlur: isGlass
      ? THREE.MathUtils.lerp(0.03, 0.12, settings.roughness)
      : 0.1,
    chromaticAberration: isGlass ? 0 : 0.05,
    distortion: 0,
    distortionScale: 0.5,
    temporalDistortion: 0,
  });

  setHalftoneGlassState(material, {
    backsideEnvMapIntensity: isGlass ? glassEnvironmentIntensity * 2.8 : 0,
    backsideThickness: isGlass ? glassThickness * 2 : 0,
    isGlass,
    useEnvironmentRefraction: isGlass,
  });

  material.needsUpdate = true;
}

export function renderHalftoneMaterialScene(options: {
  camera: THREE.Camera;
  elapsedTime: number;
  material: HalftoneTransmissionMaterial;
  mesh: THREE.Mesh;
  outputTarget: THREE.WebGLRenderTarget | null;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  transmissionBackground?: THREE.Color | THREE.Texture | null;
  transmissionBackgroundIntensity?: number;
  transmissionScene?: THREE.Scene;
  transmissionBacksideTarget: THREE.WebGLRenderTarget;
  transmissionTarget: THREE.WebGLRenderTarget;
}) {
  const {
    camera,
    elapsedTime,
    material,
    mesh,
    outputTarget,
    renderer,
    scene,
    transmissionBackground,
    transmissionBackgroundIntensity,
    transmissionScene,
    transmissionBacksideTarget,
    transmissionTarget,
  } = options;
  const glassState = getHalftoneGlassState(material);

  material.setTime(elapsedTime);

  if (!glassState.isGlass) {
    renderer.setRenderTarget(outputTarget);
    renderer.clear();
    renderer.render(scene, camera);

    return;
  }

  if (glassState.useEnvironmentRefraction) {
    material.setTransmissionBuffer(null);
    renderer.setRenderTarget(outputTarget);
    renderer.clear();
    renderer.render(scene, camera);

    return;
  }

  const previousToneMapping = renderer.toneMapping;
  const previousVisibility = mesh.visible;
  const previousBackground = scene.background;
  const previousBackgroundIntensity = scene.backgroundIntensity;
  const previousSide = material.side;
  const previousThickness = material.thickness;
  const previousEnvMapIntensity = material.envMapIntensity;
  const backsideThickness = glassState.backsideThickness;
  const backsideEnvMapIntensity = glassState.backsideEnvMapIntensity;
  const backgroundIntensity =
    transmissionBackgroundIntensity ?? previousEnvMapIntensity;

  renderer.toneMapping = THREE.NoToneMapping;

  if (transmissionScene) {
    renderer.setRenderTarget(transmissionBacksideTarget);
    renderer.clear();
    renderer.render(transmissionScene, camera);
  } else {
    scene.background = transmissionBackground ?? GLASS_TRANSMISSION_BACKGROUND;
    scene.backgroundIntensity = transmissionBackground
      ? backgroundIntensity
      : 1;
    mesh.visible = false;
    renderer.setRenderTarget(transmissionBacksideTarget);
    renderer.clear();
    renderer.render(scene, camera);
    mesh.visible = previousVisibility;
  }

  material.setTransmissionBuffer(transmissionBacksideTarget.texture);
  material.thickness = backsideThickness;
  material.side = THREE.BackSide;
  material.envMapIntensity = backsideEnvMapIntensity;
  renderer.setRenderTarget(transmissionTarget);
  renderer.clear();
  renderer.render(scene, camera);

  material.setTransmissionBuffer(transmissionTarget.texture);
  material.thickness = previousThickness;
  material.side = previousSide;
  material.envMapIntensity = previousEnvMapIntensity;
  if (!transmissionScene) {
    scene.background = previousBackground;
    scene.backgroundIntensity = previousBackgroundIntensity;
  }
  renderer.setRenderTarget(outputTarget);
  renderer.clear();
  renderer.render(scene, camera);
  renderer.toneMapping = previousToneMapping;
}
