import { onCleanup } from "solid-js";

import {
  SIDE_PANEL_WIDTH_MAX,
  SIDE_PANEL_WIDTH_MIN,
} from "../state/side-panel-store";

type UseResizablePanelProps = {
  currentWidth: number;
  onWidthChange: (width: number) => void;
  onCollapse: () => void;
  onResizeStart: () => void;
};

type UseResizablePanelReturn = {
  onPointerDown: (e: PointerEvent) => void;
};

export function useResizablePanel(
  props: UseResizablePanelProps,
): UseResizablePanelReturn {
  // Plain variables -- internal drag state does not need reactivity
  let startX = 0;
  let startWidth = 0;
  let isResizing = false;
  let resizeStarted = false;
  let currentComputedWidth = 0;

  function handlePointerMove(e: PointerEvent): void {
    if (!isResizing) return;

    // Panel is on the right: dragging left (negative delta) increases width
    const delta = startX - e.clientX;
    const raw = startWidth + delta;
    const clamped = Math.min(SIDE_PANEL_WIDTH_MAX, Math.max(0, raw));

    currentComputedWidth = clamped;

    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty(
        "--side-panel-width",
        `${Math.max(SIDE_PANEL_WIDTH_MIN, clamped)}px`,
      );
    }

    if (!resizeStarted && Math.abs(delta) > 4) {
      resizeStarted = true;
      props.onResizeStart();
    }
  }

  function handlePointerUp(): void {
    if (!isResizing) return;

    isResizing = false;
    resizeStarted = false;

    document.removeEventListener("pointermove", handlePointerMove);
    document.removeEventListener("pointerup", handlePointerUp);

    if (currentComputedWidth <= SIDE_PANEL_WIDTH_MIN) {
      props.onCollapse();
    } else {
      props.onWidthChange(currentComputedWidth);
    }
  }

  function onPointerDown(e: PointerEvent): void {
    e.preventDefault();
    startX = e.clientX;
    startWidth = props.currentWidth;
    currentComputedWidth = props.currentWidth;
    isResizing = true;
    resizeStarted = false;

    if (e.currentTarget instanceof Element) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
  }

  onCleanup(() => {
    document.removeEventListener("pointermove", handlePointerMove);
    document.removeEventListener("pointerup", handlePointerUp);
  });

  return { onPointerDown };
}
