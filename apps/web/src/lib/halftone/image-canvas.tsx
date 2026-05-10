import {
  Show,
  createEffect,
  createSignal,
  onCleanup,
  on,
  type JSX,
} from "solid-js";
import { PlaneGeometry } from "three";

import { loadVisualImage } from "~/lib/visual-runtime";

import {
  HalftoneCanvas,
  type HalftonePointerSettings,
  type HalftoneSnapshotFn,
} from "./canvas";
import type { HalftoneImageFit } from "./footprint";
import type { HalftonePose, HalftoneStudioSettings } from "./state";

type MutableRefObject<T> = { current: T };

type HalftoneImageCanvasProps = {
  crossOrigin?: HTMLImageElement["crossOrigin"];
  imageFit?: HalftoneImageFit;
  imageInteraction?: Partial<HalftonePointerSettings>;
  imageUrl: string;
  initialPose?: Partial<HalftonePose>;
  maxRenderPixelRatio?: number;
  onFirstInteraction?: () => void;
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
  const [imageElement, setImageElement] = createSignal<HTMLImageElement | null>(
    null,
  );

  const geometry = new PlaneGeometry(1, 1);

  createEffect(
    on(
      () => ({
        crossOrigin: props.crossOrigin,
        imageUrl: props.imageUrl,
      }),
      ({ crossOrigin, imageUrl }) => {
        let cancelled = false;
        setImageElement(null);

        void loadVisualImage(imageUrl, {
          crossOrigin,
          label: "halftone image",
        })
          .then((image) => {
            if (cancelled) {
              return;
            }
            setImageElement(image);
          })
          .catch((error: unknown) => {
            if (cancelled) {
              return;
            }
            const loadError =
              error instanceof Error ? error : createImageLoadError(imageUrl);
            if (import.meta.env.DEV) {
              console.error(loadError);
            }
          });

        onCleanup(() => {
          cancelled = true;
        });
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
          maxRenderPixelRatio={props.maxRenderPixelRatio}
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
