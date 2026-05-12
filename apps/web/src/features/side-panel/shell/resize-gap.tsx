import type { JSX } from "solid-js";

import { cn } from "~/lib/utils";

import { SIDE_PANEL_CLICK_OUTSIDE_ID } from "../constants/side-panel-click-outside-id";

import styles from "./resize-gap.module.css";

type ResizeGapFrameProps = {
  isOpen: boolean;
  onPointerDown?: JSX.EventHandlerUnion<HTMLDivElement, PointerEvent>;
};

export function ResizeGapFrame(props: ResizeGapFrameProps) {
  return (
    <hr
      class={cn(styles.gap, !props.isOpen && styles.gapClosed)}
      onPointerDown={props.onPointerDown}
      data-click-outside-id={SIDE_PANEL_CLICK_OUTSIDE_ID}
      aria-orientation="vertical"
    />
  );
}
