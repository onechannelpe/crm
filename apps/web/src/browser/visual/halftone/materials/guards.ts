import { Mesh, Object3D } from "three";

import { isPlainRecord } from "~/shared/type-guards";

export function isMesh(object: Object3D): object is Mesh {
  return object instanceof Mesh;
}

export function getTextureImageSize(image: unknown): {
  height: number | undefined;
  width: number | undefined;
} {
  if (!isPlainRecord(image)) {
    return { height: undefined, width: undefined };
  }

  const widthCandidate =
    image.naturalWidth ?? image.videoWidth ?? image.width ?? undefined;
  const heightCandidate =
    image.naturalHeight ?? image.videoHeight ?? image.height ?? undefined;

  return {
    height: typeof heightCandidate === "number" ? heightCandidate : undefined,
    width: typeof widthCandidate === "number" ? widthCandidate : undefined,
  };
}

export function asCanvasImageSource(image: unknown): CanvasImageSource | null {
  if (
    typeof HTMLImageElement !== "undefined" &&
    image instanceof HTMLImageElement
  ) {
    return image;
  }
  if (
    typeof HTMLCanvasElement !== "undefined" &&
    image instanceof HTMLCanvasElement
  ) {
    return image;
  }
  if (
    typeof HTMLVideoElement !== "undefined" &&
    image instanceof HTMLVideoElement
  ) {
    return image;
  }
  if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) {
    return image;
  }
  if (
    typeof OffscreenCanvas !== "undefined" &&
    image instanceof OffscreenCanvas
  ) {
    return image;
  }
  if (
    typeof SVGImageElement !== "undefined" &&
    image instanceof SVGImageElement
  ) {
    return image;
  }

  return null;
}
