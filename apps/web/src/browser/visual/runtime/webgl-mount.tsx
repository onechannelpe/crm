import {
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  type JSX,
} from "solid-js";

import { observeElementVisibility } from "~/browser/dom/observe-element-visibility";

import {
  subscribeToActiveWebGlContextCount,
  tryReserveWebGlContextSlot,
} from "./active-webgl-context-budget";
import { SITE_WEBGL_CONTEXT_LOST_EVENT } from "./create-site-webgl-renderer";
import { useWebGlPolicy } from "./use-webgl-policy";
import {
  scheduleVisualMount,
  type VisualMountPriority,
} from "./visual-mount-scheduler";

const NON_PRIORITY_ROOT_MARGIN = "50% 0px 50% 0px";
const PRIORITY_ROOT_MARGIN = "125% 0px 125% 0px";
const EAGER_ROOT_MARGIN = "600% 0px 600% 0px";

const OUT_OF_VIEW_DISPOSE_MS = 4_000;
const PRIORITY_OUT_OF_VIEW_DISPOSE_MS = 1_500;

type WebGlMountLoading = "lazy" | "eager";

type WebGlMountProps = {
  children: JSX.Element;
  fallback?: JSX.Element;
  detachFromLayout?: boolean;
  loading?: WebGlMountLoading;
  priority?: boolean;
};

export function WebGlMount(props: WebGlMountProps) {
  const policy = useWebGlPolicy();

  let rootReference: HTMLDivElement | undefined;

  const [isInViewport, setIsInViewport] = createSignal(props.priority ?? false);
  const [isMountReady, setIsMountReady] = createSignal(false);
  const [hasContextSlot, setHasContextSlot] = createSignal(false);
  const [contextEpoch, setContextEpoch] = createSignal(0);

  onMount(() => {
    const element = rootReference;
    if (!element) {
      return;
    }

    const loading = props.loading ?? "lazy";
    const priority = props.priority ?? false;
    const isEager = loading === "eager";

    const effectiveDisposeDelayMs =
      priority || isEager
        ? PRIORITY_OUT_OF_VIEW_DISPOSE_MS
        : OUT_OF_VIEW_DISPOSE_MS;

    const effectiveRootMargin = isEager
      ? EAGER_ROOT_MARGIN
      : priority
        ? PRIORITY_ROOT_MARGIN
        : NON_PRIORITY_ROOT_MARGIN;

    let disposeTimer: ReturnType<typeof setTimeout> | null = null;
    const clearDisposeTimer = () => {
      if (disposeTimer !== null) {
        clearTimeout(disposeTimer);
        disposeTimer = null;
      }
    };

    const stopObservingVisibility = observeElementVisibility(
      element,
      (isIntersecting) => {
        if (isIntersecting) {
          clearDisposeTimer();
          setIsInViewport(true);
          return;
        }

        clearDisposeTimer();
        disposeTimer = setTimeout(() => {
          setIsInViewport(false);
          disposeTimer = null;
        }, effectiveDisposeDelayMs);
      },
      {
        root: null,
        rootMargin: effectiveRootMargin,
        threshold: 0,
      },
    );

    const handleContextLost = () => {
      setHasContextSlot(false);
      setIsMountReady(false);
      setContextEpoch((epoch) => epoch + 1);
    };

    element.addEventListener(SITE_WEBGL_CONTEXT_LOST_EVENT, handleContextLost);

    onCleanup(() => {
      clearDisposeTimer();
      stopObservingVisibility();
      element.removeEventListener(
        SITE_WEBGL_CONTEXT_LOST_EVENT,
        handleContextLost,
      );
    });
  });

  const effectiveMountPriority = createMemo<VisualMountPriority>(() => {
    const priority = props.priority ?? false;
    const loading = props.loading ?? "lazy";
    return priority || loading === "eager" ? "priority" : "normal";
  });

  const wantsScene = createMemo(() => policy().allowed && isInViewport());
  const wantsContextSlot = createMemo(() => wantsScene() && isMountReady());

  createEffect(() => {
    contextEpoch();
    effectiveMountPriority();

    setIsMountReady(false);

    if (!wantsScene()) {
      return;
    }

    const cancelScheduledMount = scheduleVisualMount(
      () => setIsMountReady(true),
      {
        priority: effectiveMountPriority(),
      },
    );

    onCleanup(() => {
      cancelScheduledMount();
    });
  });

  createEffect(() => {
    if (!wantsContextSlot()) {
      return;
    }

    let release: (() => void) | null = null;
    let unsubscribe: (() => void) | null = null;

    const tryAcquire = () => {
      if (release !== null) {
        return;
      }

      const reservation = tryReserveWebGlContextSlot();
      if (reservation === null) {
        return;
      }

      release = reservation;
      if (unsubscribe !== null) {
        unsubscribe();
        unsubscribe = null;
      }

      setHasContextSlot(true);
    };

    tryAcquire();

    if (release === null) {
      unsubscribe = subscribeToActiveWebGlContextCount(tryAcquire);
    }

    onCleanup(() => {
      if (unsubscribe !== null) {
        unsubscribe();
        unsubscribe = null;
      }
      if (release !== null) {
        release();
        release = null;
      }
      setHasContextSlot(false);
    });
  });

  return (
    <div
      ref={(element) => {
        rootReference = element;
      }}
      style={{
        height: "100%",
        "min-height": "1px",
        "pointer-events": "none",
        position: props.detachFromLayout ? "absolute" : "relative",
        width: "100%",
        ...(props.detachFromLayout ? { inset: "0" } : {}),
      }}
    >
      <Show
        when={wantsContextSlot() && hasContextSlot()}
        fallback={props.fallback ?? null}
      >
        <div
          style={{ "pointer-events": "auto", height: "100%", width: "100%" }}
        >
          {props.children}
        </div>
      </Show>
    </div>
  );
}
