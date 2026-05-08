import { Show, createSignal, onCleanup, onMount, type JSX } from "solid-js";
import * as THREE from "three";

import { loadVisualImage } from "~/lib/visual-runtime";

import {
  HalftoneCanvas,
  type HalftoneImageInteractionSettings,
  type HalftoneSnapshotFn,
} from "./halftone-canvas";
import type { HalftoneImageFit } from "./footprint";
import type { HalftoneExportPose, HalftoneStudioSettings } from "./state";

type MutableRefObject<T> = { current: T };

type HalftoneImageCanvasProps = {
  crossOrigin?: HTMLImageElement["crossOrigin"];
  imageFit?: HalftoneImageFit;
  imageInteraction?: Partial<HalftoneImageInteractionSettings>;
  imageUrl: string;
  initialPose?: Partial<HalftoneExportPose>;
  onFirstInteraction?: () => void;
  onImageLoadError?: (error: Error) => void;
  onPoseChange?: (pose: HalftoneExportPose) => void;
  previewDistance: number;
  settings: HalftoneStudioSettings;
  snapshotRef?: MutableRefObject<HalftoneSnapshotFn | null>;
  virtualRenderHeight?: number;
};

const noopFirstInteraction = () => {};
const noopPoseChange = (_pose: HalftoneExportPose) => {};

function createImageLoadError(imageUrl: string) {
  return new Error(`Halftone image failed to load: ${imageUrl}`);
}

export function HalftoneImageCanvas(props: HalftoneImageCanvasProps): JSX.Element {
  const [imageElement, setImageElement] = createSignal<HTMLImageElement | null>(null);

  const geometry = new THREE.PlaneGeometry(1, 1);

  onMount(() => {
    let cancelled = false;

    void loadVisualImage(props.imageUrl, {
      crossOrigin: props.crossOrigin,
      label: "halftone image",
    })
      .then((image) => {
        if (!cancelled) {
          setImageElement(image);
        }
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        const error = createImageLoadError(props.imageUrl);

        if (props.onImageLoadError) {
          props.onImageLoadError(error);
          return;
        }

        if (process.env.NODE_ENV !== "production") {
          console.error(error);
        }
      });

    onCleanup(() => {
      cancelled = true;
      geometry.dispose();
    });
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
