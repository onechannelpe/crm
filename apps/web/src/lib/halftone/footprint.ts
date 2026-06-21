import { Box3, Matrix4, PerspectiveCamera, Vector3 } from "three";

export interface HalftoneRect {
  height: number;
  width: number;
  x: number;
  y: number;
}

export type HalftoneImageFit = "contain" | "cover";

export interface ImageFootprintScaleArgs {
  imageFit?: HalftoneImageFit;
  imageHeight: number;
  imageWidth: number;
  previewDistance: number;
  viewportHeight: number;
  viewportWidth: number;
}

export interface ProjectedBoundsArgs {
  camera: PerspectiveCamera;
  localBounds: Box3;
  meshMatrixWorld: Matrix4;
  viewportHeight: number;
  viewportWidth: number;
}

export interface MeshFootprintScaleArgs extends ProjectedBoundsArgs {
  lookAtTarget: Vector3;
}

export const VIRTUAL_RENDER_HEIGHT = 768;
const REFERENCE_PREVIEW_DISTANCE = 4;

export function getImagePreviewZoom(previewDistance: number) {
  return REFERENCE_PREVIEW_DISTANCE / Math.max(previewDistance, 0.001);
}
