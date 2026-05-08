import {
  Show,
  createEffect,
  createResource,
  onCleanup,
  on,
  type JSX,
} from "solid-js";
import * as THREE from "three";

import { loadVisualImage } from "~/lib/visual-runtime";

import type { HalftoneImageFit } from "./footprint";
import {
  HalftoneCanvas,
  type HalftonePointerSettings,
  type HalftoneSnapshotFn,
} from "./halftone-canvas";
import type { HalftonePose, HalftoneStudioSettings } from "./state";

type MutableRefObject<T> = { current: T };

type HalftoneImageCanvasProps = {
  crossOrigin?: HTMLImageElement["crossOrigin"];
  imageFit?: HalftoneImageFit;
  imageInteraction?: Partial<HalftonePointerSettings>;
  imageUrl: string;
  initialPose?: Partial<HalftonePose>;
  onFirstInteraction?: () => void;
  onImageLoadError?: (error: Error) => void;
  onPoseChange?: (pose: HalftonePose) => void;
  previewDistance: number;
  settings: HalftoneStudioSettings;
  snapshotRef?: MutableRefObject<HalftoneSnapshotFn | null>;
  virtualRenderHeight?: number;
};

const noopFirstInteraction = () => {};
const noopPoseChange = (_pose: HalftonePose) => {};

function createImageLoadError(imageUrl: string) {
  return new Error(`Halftone image failed to load: ${imageUrl}`);
}

export function HalftoneImageCanvas(
  props: HalftoneImageCanvasProps,
): JSX.Element {
  const [imageElement] = createResource(
    () => ({
      crossOrigin: props.crossOrigin,
      imageUrl: props.imageUrl,
    }),
    async ({ crossOrigin, imageUrl }) =>
      loadVisualImage(imageUrl, {
        crossOrigin,
        label: "halftone image",
      }),
  );

  const geometry = new THREE.PlaneGeometry(1, 1);

  createEffect(
    on(
      () => imageElement.error,
      (error) => {
        if (!error) {
          return;
        }

        const loadError = createImageLoadError(props.imageUrl);
        if (props.onImageLoadError) {
          props.onImageLoadError(loadError);
          return;
        }

        if (process.env.NODE_ENV !== "production") {
          console.error(loadError);
        }
      },
    ),
  );

  onCleanup(() => {
    geometry.dispose();
  });

  return (
    <Show when={imageElement()}>
      {(image) => (
        <HalftoneCanvas
          geometry={geometry}
          imageElement={image()}
          imageFit={props.imageFit}
          imageInteraction={props.imageInteraction}
          initialPose={props.initialPose}
          onFirstInteraction={props.onFirstInteraction ?? noopFirstInteraction}
          onPoseChange={props.onPoseChange ?? noopPoseChange}
          previewDistance={props.previewDistance}
          settings={props.settings}
          snapshotRef={props.snapshotRef}
          virtualRenderHeight={props.virtualRenderHeight}
        />
      )}
    </Show>
  );
}
