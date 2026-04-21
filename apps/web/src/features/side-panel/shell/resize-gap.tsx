import type { JSX } from "solid-js";

import { useResizeCoordination } from "~/components/ui/layout/resizable-panel/resize-coordination-provider";
import { useResizablePanel } from "~/components/ui/layout/resizable-panel/use-resizable-panel";
import { cn } from "~/lib/utils";

import { SIDE_PANEL_CLICK_OUTSIDE_ID } from "../constants/side-panel-click-outside-id";
import {
  SIDE_PANEL_WIDTH_CONSTRAINTS,
  SIDE_PANEL_WIDTH_VAR,
} from "../state/side-panel-width";
import { useSidePanel } from "../state/use-side-panel";

import styles from "./resize-gap.module.css";

type ResizeGapProps = {
  isInteractive?: boolean;
};

type ResizeGapFrameProps = {
  isOpen: boolean;
  onPointerDown?: JSX.EventHandlerUnion<HTMLDivElement, PointerEvent>;
};

export function ResizeGapFrame(props: ResizeGapFrameProps) {
  return (
    <div
      class={cn(styles.gap, !props.isOpen && styles.gapClosed)}
      onPointerDown={props.onPointerDown}
      data-click-outside-id={SIDE_PANEL_CLICK_OUTSIDE_ID}
      role="separator"
      aria-orientation="vertical"
    />
  );
}

export function ResizeGap(props: ResizeGapProps) {
  const { isOpen, panelWidth, setPanelWidth, closePanel } = useSidePanel();
  const { setResizeIsActive } = useResizeCoordination();

  const { onPointerDown } = useResizablePanel({
    side: "left",
    constraints: SIDE_PANEL_WIDTH_CONSTRAINTS,
    getCurrentWidth: panelWidth,
    onWidthChange: setPanelWidth,
    onCollapse: closePanel,
    onResizeStart: () => setResizeIsActive(false),
    onResizeEnd: () => setResizeIsActive(true),
    cssVariableName: SIDE_PANEL_WIDTH_VAR,
    dragThresholdPx: 4,
  });

  return (
    <ResizeGapFrame
      isOpen={isOpen()}
      onPointerDown={props.isInteractive === false ? undefined : onPointerDown}
    />
  );
}
