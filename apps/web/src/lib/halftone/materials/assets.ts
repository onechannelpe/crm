import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { asCanvasImageSource, getTextureImageSize, isMesh } from "./guards";

export type HalftoneMaterialAssets = {
  glassBackgroundTexture: THREE.Texture;
  glassEnvironmentTexture: THREE.Texture;
  glassTransmissionScene: THREE.Scene;
  solidEnvironmentTexture: THREE.Texture;
};

export const GLASS_TRANSMISSION_BACKGROUND = new THREE.Color(0x030303);

const GLASS_ENVIRONMENT_ZOOM = 1.55;
const GLASS_TEXTURE_URLS = {
  environment: "/halftone/materials/glass/environment.jpg",
} as const;
const MAX_TEXTURE_ANISOTROPY = 8;

function setTextureSampling(
  texture: THREE.Texture,
  renderer: THREE.WebGLRenderer,
) {
  texture.generateMipmaps = true;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = Math.min(
    renderer.capabilities.getMaxAnisotropy(),
    MAX_TEXTURE_ANISOTROPY,
  );
}

function disposeEnvironmentScene(scene: THREE.Scene) {
  scene.traverse((object) => {
    if (!isMesh(object)) {
      return;
    }

    if (object.geometry) {
      object.geometry.dispose();
    }

    if (Array.isArray(object.material)) {
      object.material.forEach((material) => material.dispose());
      return;
    }

    object.material?.dispose?.();
  });
}

function createSolidEnvironmentTexture(renderer: THREE.WebGLRenderer) {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const environmentTexture = pmremGenerator.fromScene(
    new RoomEnvironment(),
    0.04,
  ).texture;
  pmremGenerator.dispose();

  return environmentTexture;
}

function createZoomedGlassTexture(
  sourceTexture: THREE.Texture,
  renderer: THREE.WebGLRenderer,
  zoom: number,
) {
  if (zoom <= 1) {
    return sourceTexture;
  }

  const { width, height } = getTextureImageSize(sourceTexture.image);

  if (!width || !height) {
    return sourceTexture;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    return sourceTexture;
  }

  const cropWidth = width / zoom;
  const cropHeight = height / zoom;
  const sourceX = (width - cropWidth) / 2;
  const sourceY = (height - cropHeight) / 2;

  const imageSource = asCanvasImageSource(sourceTexture.image);
  if (!imageSource) {
    return sourceTexture;
  }

  context.drawImage(
    imageSource,
    sourceX,
    sourceY,
    cropWidth,
    cropHeight,
    0,
    0,
    width,
    height,
  );

  const zoomedTexture = new THREE.CanvasTexture(canvas);
  zoomedTexture.colorSpace = sourceTexture.colorSpace;
  zoomedTexture.wrapS = THREE.ClampToEdgeWrapping;
  zoomedTexture.wrapT = THREE.ClampToEdgeWrapping;
  setTextureSampling(zoomedTexture, renderer);
  zoomedTexture.needsUpdate = true;

  return zoomedTexture;
}

function createStudioGlassEnvironmentScene(backdropTexture?: THREE.Texture) {
  const studioScene = new THREE.Scene();
  studioScene.background = backdropTexture ?? GLASS_TRANSMISSION_BACKGROUND;
  studioScene.backgroundIntensity = backdropTexture ? 1 : 0.4;

  return studioScene;
}

function createStudioGlassEnvironmentTexture(
  renderer: THREE.WebGLRenderer,
  backdropTexture?: THREE.Texture,
) {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const environmentTexture = backdropTexture
    ? pmremGenerator.fromEquirectangular(backdropTexture).texture
    : pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  pmremGenerator.dispose();

  return environmentTexture;
}

function loadTexture(
  url: string,
  renderer: THREE.WebGLRenderer,
  colorSpace: THREE.ColorSpace,
) {
  const loader = new THREE.TextureLoader();

  return new Promise<THREE.Texture>((resolve, reject) => {
    loader.load(
      url,
      (texture) => {
        texture.colorSpace = colorSpace;
        setTextureSampling(texture, renderer);
        resolve(texture);
      },
      undefined,
      reject,
    );
  });
}

async function loadGlassEnvironmentAssets(renderer: THREE.WebGLRenderer) {
  const sourceBackgroundTexture = await loadTexture(
    GLASS_TEXTURE_URLS.environment,
    renderer,
    THREE.SRGBColorSpace,
  );
  const backgroundTexture = createZoomedGlassTexture(
    sourceBackgroundTexture,
    renderer,
    GLASS_ENVIRONMENT_ZOOM,
  );
  if (backgroundTexture !== sourceBackgroundTexture) {
    sourceBackgroundTexture.dispose();
  }
  backgroundTexture.mapping = THREE.EquirectangularReflectionMapping;
  backgroundTexture.wrapS = THREE.ClampToEdgeWrapping;
  backgroundTexture.wrapT = THREE.ClampToEdgeWrapping;
  backgroundTexture.needsUpdate = true;
  const transmissionScene =
    createStudioGlassEnvironmentScene(backgroundTexture);
  const environmentTexture = createStudioGlassEnvironmentTexture(
    renderer,
    backgroundTexture,
  );

  return {
    backgroundTexture,
    environmentTexture,
    glassTransmissionScene: transmissionScene,
  };
}

export async function createHalftoneMaterialAssets(
  renderer: THREE.WebGLRenderer,
): Promise<HalftoneMaterialAssets> {
  const solidEnvironmentTexture = createSolidEnvironmentTexture(renderer);
  const glassEnvironmentAssets = await loadGlassEnvironmentAssets(renderer);

  return {
    glassBackgroundTexture: glassEnvironmentAssets.backgroundTexture,
    glassEnvironmentTexture: glassEnvironmentAssets.environmentTexture,
    glassTransmissionScene: glassEnvironmentAssets.glassTransmissionScene,
    solidEnvironmentTexture,
  };
}

export function disposeHalftoneMaterialAssets(assets: HalftoneMaterialAssets) {
  assets.glassBackgroundTexture.dispose();

  if (assets.glassEnvironmentTexture !== assets.glassBackgroundTexture) {
    assets.glassEnvironmentTexture.dispose();
  }

  disposeEnvironmentScene(assets.glassTransmissionScene);
  assets.solidEnvironmentTexture.dispose();
}
