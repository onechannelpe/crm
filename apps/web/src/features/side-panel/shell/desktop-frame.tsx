import type { JSX } from "solid-js";

import { useSidePanel } from "../state/use-side-panel";
import { ResizeGapFrame } from "./resize-gap";
import { SidePanelShell } from "./side-panel-shell";
import { SidePanelWidthEffect } from "./side-panel-width-effect";

import styles from "./desktop-frame.module.css";

type DesktopSidePanelFrameProps = {
  gapPointerDown?: JSX.EventHandlerUnion<HTMLDivElement, PointerEvent>;
  isInteractive: boolean;
  isResizing: boolean;
  renderContent?: () => JSX.Element;
  shouldRenderChildren: boolean;
};

export function DesktopSidePanelFrame(props: DesktopSidePanelFrameProps) {
  const { isOpen } = useSidePanel();

  return (
    <div class={styles.root}>
      <SidePanelWidthEffect />
      <ResizeGapFrame isOpen={isOpen()} onPointerDown={props.gapPointerDown} />
      <SidePanelShell
        isInteractive={props.isInteractive}
        isResizing={props.isResizing}
        renderContent={props.renderContent}
        shouldRenderChildren={props.shouldRenderChildren}
      />
    </div>
  );
}
