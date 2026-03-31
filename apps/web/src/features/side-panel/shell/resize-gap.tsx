import type { JSX } from "solid-js";

import { cn } from "~/lib/utils";

import { useResizablePanel } from "../hooks/use-resizable-panel";
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
    get currentWidth() {
      return panelWidth();
    },
    onWidthChange: (w) => {
      props.onResizeEnd?.();
      setPanelWidth(w);
    },
    onCollapse: () => {
      props.onResizeEnd?.();
      closePanel();
    },
    onResizeStart: () => props.onResizeStart?.(),
  });

  return <ResizeGapFrame isOpen={isOpen()} onPointerDown={onPointerDown} />;
}
