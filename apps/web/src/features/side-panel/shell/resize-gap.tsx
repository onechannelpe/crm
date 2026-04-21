import type { JSX } from "solid-js";

import { useResizablePanel } from "~/components/ui/layout/resizable-panel/use-resizable-panel";
import { cn } from "~/lib/utils";

import {
  SIDE_PANEL_WIDTH_CONSTRAINTS,
  SIDE_PANEL_WIDTH_VAR,
} from "../state/side-panel-width";
import { useSidePanel } from "../state/use-side-panel";

import styles from "./resize-gap.module.css";

type ResizeGapProps = {
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
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
      role="separator"
      aria-orientation="vertical"
    />
  );
}

export function ResizeGap(props: ResizeGapProps) {
  const { isOpen, panelWidth, setPanelWidth, closePanel } = useSidePanel();

  const { onPointerDown } = useResizablePanel({
    side: "left",
    constraints: SIDE_PANEL_WIDTH_CONSTRAINTS,
    getCurrentWidth: panelWidth,
    onWidthChange: (w) => {
      props.onResizeEnd?.();
      setPanelWidth(w);
    },
    onCollapse: () => {
      props.onResizeEnd?.();
      closePanel();
    },
    onResizeStart: () => props.onResizeStart?.(),
    cssVariableName: SIDE_PANEL_WIDTH_VAR,
    dragThresholdPx: 4,
  });

  return <ResizeGapFrame isOpen={isOpen()} onPointerDown={onPointerDown} />;
}
