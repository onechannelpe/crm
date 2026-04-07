import type { JSX } from "solid-js";

import { useSidePanel } from "../state/use-side-panel";
import { ResizeGapFrame } from "./resize-gap";
import { PanelShell } from "./shell";
import { WidthEffect } from "./width-effect";

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
      <WidthEffect />
      <ResizeGapFrame isOpen={isOpen()} onPointerDown={props.gapPointerDown} />
      <PanelShell
        isInteractive={props.isInteractive}
        isResizing={props.isResizing}
        renderContent={props.renderContent}
        shouldRenderChildren={props.shouldRenderChildren}
      />
    </div>
  );
}
