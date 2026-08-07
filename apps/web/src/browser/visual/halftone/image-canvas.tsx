import {
  createEffect,
  createMemo,
  createResource,
  on,
  onCleanup,
  onMount,
  type JSX,
} from "solid-js";
import { PlaneGeometry } from "three";

import { VIRTUAL_RENDER_HEIGHT } from "~/browser/visual/halftone/footprint";
import { createHalftoneRuntime } from "~/browser/visual/halftone/runtime";
import type {
  HalftonePointerSettings,
  HalftoneRuntime,
  HalftoneRuntimeConfig,
  HalftoneSnapshotFn,
} from "~/browser/visual/halftone/runtime/types";
import { loadVisualImage } from "~/browser/visual/runtime";

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

export function HalftoneImageCanvas(
  props: HalftoneImageCanvasProps,
): JSX.Element {
  const [imageElement] = createResource(
    () => ({ crossOrigin: props.crossOrigin, imageUrl: props.imageUrl }),
    ({ crossOrigin, imageUrl }) =>
      loadVisualImage(imageUrl, { crossOrigin, label: "halftone image" }),
  );

  if (import.meta.env.DEV) {
    createEffect(() => {
      if (imageElement.error) {
        console.error(imageElement.error);
      }
    });
  }

  const geometry = new PlaneGeometry(1, 1);
  onCleanup(() => geometry.dispose());

  const runtimeConfig = createMemo<HalftoneRuntimeConfig>(() => ({
    geometry,
    imageFit: props.imageFit ?? "contain",
    imageInteraction: props.imageInteraction,
    initialPose: props.initialPose,
    maxRenderPixelRatio: props.maxRenderPixelRatio,
    onFirstInteraction: props.onFirstInteraction ?? noopFirstInteraction,
    onPoseChange: props.onPoseChange ?? noopPoseChange,
    previewDistance: props.previewDistance,
    renderStrategy: "continuous",
    settings: props.settings,
    virtualRenderHeight: props.virtualRenderHeight ?? VIRTUAL_RENDER_HEIGHT,
  }));

  let mountRef: HTMLDivElement | undefined;
  let runtime: HalftoneRuntime | null = null;

  onMount(() => {
    const host = mountRef;
    if (!host) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const nextRuntime = await createHalftoneRuntime({
        config: runtimeConfig(),
        host,
        imageElement: imageElement.latest ?? null,
      });

      if (cancelled) {
        nextRuntime.dispose();
        return;
      }

      runtime = nextRuntime;

      // Sync any config or image changes that arrived during async init.
      runtime.updateConfig(runtimeConfig());
      runtime.setImage(imageElement.latest ?? null);

      if (props.snapshotRef) {
        props.snapshotRef.current = (width, height, options) =>
          nextRuntime.snapshot({
            backgroundColor: options?.backgroundColor,
            height,
            includeBackground: options?.includeBackground,
            width,
          });
      }
    })();

    onCleanup(() => {
      cancelled = true;
      if (props.snapshotRef) {
        props.snapshotRef.current = null;
      }
      runtime?.dispose();
      runtime = null;
    });
  });

  createEffect(
    on(runtimeConfig, (config) => runtime?.updateConfig(config), {
      defer: true,
    }),
  );

  createEffect(
    on(
      () => imageElement.latest ?? null,
      (image) => runtime?.setImage(image),
      { defer: true },
    ),
  );

  return (
    <div
      aria-hidden
      ref={(el) => {
        mountRef = el;
      }}
      style={{
        background: props.settings.background.transparent
          ? "transparent"
          : props.settings.background.color,
        display: "block",
        height: "100%",
        "min-width": 0,
        width: "100%",
      }}
    />
  );
}
