import { createEffect, createMemo, on, onCleanup, onMount } from "solid-js";
import * as THREE from "three";

import {
  VIRTUAL_RENDER_HEIGHT,
  type HalftoneImageFit,
} from "~/lib/halftone/footprint";
import { createHalftoneRuntime } from "~/lib/halftone/runtime";
import type {
  HalftonePointerSettings,
  HalftoneRenderStrategy,
  HalftoneRuntime,
  HalftoneRuntimeConfig,
  HalftoneSnapshotFn,
} from "~/lib/halftone/runtime/types";
import type {
  HalftonePose,
  HalftoneStudioSettings,
} from "~/lib/halftone/state";

type MutableRefObject<T> = { current: T };

export type {
  HalftonePointerSettings,
  HalftoneSnapshotFn,
  HalftoneRenderStrategy,
};

type HalftoneCanvasProps = {
  geometry: THREE.BufferGeometry | null;
  initialPose?: Partial<HalftonePose>;
  imageElement: HTMLImageElement | null;
  imageFit?: HalftoneImageFit;
  imageInteraction?: Partial<HalftonePointerSettings>;
  onFirstInteraction: () => void;
  onPoseChange: (pose: HalftonePose) => void;
  previewDistance: number;
  renderStrategy?: HalftoneRenderStrategy;
  settings: HalftoneStudioSettings;
  snapshotRef?: MutableRefObject<HalftoneSnapshotFn | null>;
  virtualRenderHeight?: number;
};

export function HalftoneCanvas(props: HalftoneCanvasProps) {
  let mountReference: HTMLDivElement | undefined;
  let runtime: HalftoneRuntime | null = null;

  const runtimeConfig = createMemo<HalftoneRuntimeConfig>(() => ({
    geometry: props.geometry,
    imageFit: props.imageFit ?? "contain",
    imageInteraction: props.imageInteraction,
    initialPose: props.initialPose,
    onFirstInteraction: props.onFirstInteraction,
    onPoseChange: props.onPoseChange,
    previewDistance: props.previewDistance,
    renderStrategy: props.renderStrategy ?? "continuous",
    settings: props.settings,
    virtualRenderHeight: props.virtualRenderHeight ?? VIRTUAL_RENDER_HEIGHT,
  }));

  onMount(() => {
    const mountElement = mountReference;

    if (!mountElement || !runtimeConfig().geometry) {
      return;
    }

    let cancelled = false;

    const mountRuntime = async () => {
      const nextRuntime = await createHalftoneRuntime({
        config: runtimeConfig(),
        host: mountElement,
        imageElement: props.imageElement,
      });

      if (cancelled) {
        nextRuntime.dispose();
        return;
      }

      runtime = nextRuntime;

      if (props.snapshotRef) {
        props.snapshotRef.current = (width, height, options) =>
          nextRuntime.snapshot({
            backgroundColor: options?.backgroundColor,
            height,
            includeBackground: options?.includeBackground,
            width,
          });
      }
    };

    void mountRuntime();

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
    on(runtimeConfig, (nextConfig) => {
      runtime?.updateConfig(nextConfig);
    }),
  );

  createEffect(
    on(
      () => props.imageElement,
      (nextImageElement) => {
        runtime?.setImage(nextImageElement);
      },
    ),
  );

  return (
    <div
      aria-hidden
      ref={(element) => {
        mountReference = element;
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
